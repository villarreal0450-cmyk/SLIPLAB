"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, FileImage, FlaskConical, ImageUp, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { useParlayDraft } from "@/lib/parlay/store";
import type { ScanResult } from "@/lib/scan/types";
import { initialReview, LegReviewCard, resolveReview, type ReviewState } from "./LegReviewCard";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

type Phase =
  | { kind: "idle"; error?: string }
  | { kind: "scanning"; previewUrl: string | null }
  | { kind: "review"; result: Extract<ScanResult, { ok: true }>; previewUrl: string | null; states: Record<string, ReviewState> }
  | { kind: "failed"; message: string; previewUrl: string | null };

async function readAsBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Upload a betslip screenshot, review what was read, then add it to the slip.
 * Every detected leg is editable before analysis.
 */
export function ScanView({ visionEnabled }: { visionEnabled: boolean }) {
  const router = useRouter();
  const { upsertPick } = useParlayDraft();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  async function submit(body: object, previewUrl: string | null) {
    setPhase({ kind: "scanning", previewUrl });
    try {
      const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = (await res.json()) as ScanResult;
      if (!result.ok) return setPhase({ kind: "failed", message: result.error, previewUrl });
      setPhase({ kind: "review", result, previewUrl, states: Object.fromEntries(result.legs.map((l) => [l.id, initialReview(l)])) });
    } catch {
      setPhase({ kind: "failed", message: "Couldn't reach the scanner. Check your connection and try again.", previewUrl });
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setPhase({ kind: "idle", error: "Upload a PNG, JPG, WEBP or GIF screenshot." });
    if (file.size > MAX_BYTES) return setPhase({ kind: "idle", error: "That image is too large. Keep it under 5 MB." });
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewRef.current = previewUrl;
    await submit({ data: await readAsBase64(file), mediaType: file.type }, previewUrl);
  }

  if (phase.kind === "scanning") {
    return (
      <div className="flex flex-col items-center gap-5 py-6" aria-busy="true" aria-live="polite">
        <div className="relative h-72 w-52 overflow-hidden rounded-3xl border border-border-strong bg-surface">
          {phase.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={phase.previewUrl} alt="Your betslip" className="h-full w-full object-cover opacity-80" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <FileImage className="size-10" aria-hidden="true" />
            </div>
          )}
          <span aria-hidden="true" className="absolute inset-x-0 h-12 -translate-y-1/2 animate-scan bg-gradient-to-b from-transparent via-brand/35 to-transparent" />
        </div>
        <p className="text-sm text-muted-foreground">Reading your slip…</p>
      </div>
    );
  }

  if (phase.kind === "failed") {
    return (
      <ErrorState
        title="Couldn't read that slip"
        description={phase.message}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => setPhase({ kind: "idle" })}>
              <RotateCcw data-icon="inline-start" />
              Try another
            </Button>
            <Button variant="ghost" onClick={() => submit({ sample: true }, null)}>
              Use the sample slip
            </Button>
          </div>
        }
      />
    );
  }

  if (phase.kind === "review") {
    const { result, states } = phase;
    const players = result.catalog.flatMap((g) => g.players);
    const resolved = result.legs.map((leg) => ({ leg, state: states[leg.id], out: resolveReview(states[leg.id], players, leg.id) }));
    const included = resolved.filter((r) => r.state.include);
    const blocked = included.filter((r) => "problem" in r.out).length;
    const ready = included.filter((r) => "pick" in r.out);

    return (
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="flex flex-col gap-3 lg:sticky lg:top-10">
          {result.source === "sample" && (
            <p className="flex gap-2 rounded-2xl border border-caution/30 bg-caution/[0.06] p-3 text-sm text-foreground/85">
              <FlaskConical className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
              This is a sample slip, not a reading of your screenshot.
            </p>
          )}
          {phase.previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={phase.previewUrl} alt="Your betslip" className="hidden max-h-96 w-full rounded-2xl border border-border object-contain lg:block" />
          )}
          <div className="surface p-4 text-sm">
            <p className="font-semibold tracking-tight">{result.slip.event ?? "Detected slip"}</p>
            <p className="text-muted-foreground">
              {result.legs.length} {result.legs.length === 1 ? "leg" : "legs"}
              {result.slip.sportsbook && ` · ${result.slip.sportsbook}`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Check every leg. Nothing is analyzed until you confirm it.</p>
          </div>
        </aside>

        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-3">
            {resolved.map(({ leg, state }) => (
              <LegReviewCard
                key={leg.id}
                leg={leg}
                state={state}
                catalog={result.catalog}
                onChange={(next) => setPhase({ ...phase, states: { ...states, [leg.id]: next } })}
              />
            ))}
          </ul>
          <div className="sticky bottom-[calc(max(env(safe-area-inset-bottom),0px)+4.5rem)] flex flex-col gap-2 bg-gradient-to-t from-background via-background to-background/0 pt-4 md:bottom-6">
            <Button
              className="h-12 rounded-2xl text-base font-semibold"
              disabled={ready.length === 0 || blocked > 0}
              onClick={() => {
                for (const r of ready) if ("pick" in r.out) upsertPick(r.out.pick);
                router.push("/analyze");
              }}
            >
              {blocked > 0 ? `Fix ${blocked} ${blocked === 1 ? "leg" : "legs"} first` : `Add ${ready.length} ${ready.length === 1 ? "pick" : "picks"} and analyze`}
            </Button>
            <Button variant="ghost" className="rounded-2xl text-muted-foreground" onClick={() => setPhase({ kind: "idle" })}>
              Start over
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-brand bg-brand/8" : "border-border-strong bg-surface hover:bg-surface-elevated",
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/12 text-brand">
          {dragging ? <ImageUp className="size-7" aria-hidden="true" /> : <Camera className="size-7" aria-hidden="true" />}
        </span>
        <span className="text-lg font-semibold tracking-tight">Upload a betslip screenshot</span>
        <span className="max-w-xs text-sm text-muted-foreground">PNG, JPG or WEBP up to 5 MB. You&apos;ll review every leg before it&apos;s analyzed.</span>
      </button>
      <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="sr-only" onChange={(e) => void handleFile(e.target.files?.[0])} />

      {phase.error && (
        <p role="alert" className="text-sm text-negative">
          {phase.error}
        </p>
      )}

      {!visionEnabled && (
        <p className="flex gap-2 rounded-2xl border border-border p-3 text-sm text-muted-foreground">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Screenshot reading isn&apos;t connected in this build yet, so uploads can&apos;t be scanned. The sample slip shows how the review step works.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="rounded-xl" onClick={() => submit({ sample: true }, null)}>
          <FlaskConical data-icon="inline-start" />
          Try the sample slip
        </Button>
        <Button asChild variant="ghost" className="rounded-xl text-muted-foreground">
          <Link href="/build">Add picks manually</Link>
        </Button>
      </div>
    </div>
  );
}

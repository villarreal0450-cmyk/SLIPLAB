"use client";

import { useRef, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResearchResult } from "@/lib/analyst/research";
import type { Pick } from "@/lib/types";

const HEADINGS = ["Status & role", "Recent games", "What analysts expect", "Bottom line"];

type State = { kind: "idle" } | { kind: "loading" } | { kind: "done"; result: ResearchResult };

/**
 * On-demand web research for one pick: news, why recent games went the way
 * they did, and what professional analysts expect. Every claim links to its
 * source; the engine's numbers don't change.
 */
export function ResearchCard({ pick }: { pick: Pick }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  const run = async () => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/analysis/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pick }),
        signal: ac.signal,
      });
      const result = (await res.json()) as ResearchResult;
      if (!ac.signal.aborted) setState({ kind: "done", result });
    } catch {
      if (!ac.signal.aborted) setState({ kind: "done", result: { ok: false, reason: "failed", error: "Couldn't reach the research desk. Check your connection and try again." } });
    }
  };

  if (state.kind === "idle") {
    return (
      <section className="surface-brand flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <Search className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold tracking-tight">Research this pick</h2>
          <p className="text-sm text-muted-foreground">The AI analyst searches the latest news, explains recent games and finds what experts project.</p>
        </div>
        <Button onClick={run} className="h-10 shrink-0 rounded-xl px-4 font-semibold">
          Research
        </Button>
      </section>
    );
  }

  if (state.kind === "loading") {
    return (
      <section className="surface flex flex-col gap-3 p-4" aria-busy="true" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="size-4 animate-pulse text-brand" aria-hidden="true" />
          Searching the latest news and projections. This takes about half a minute.
        </p>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-2xl bg-surface-sunken" />
        ))}
      </section>
    );
  }

  const { result } = state;
  if (!result.ok) {
    return (
      <section className="surface flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">{result.error}</p>
        {result.reason !== "not_configured" && (
          <Button variant="secondary" onClick={run} className="self-start rounded-xl">
            Try again
          </Button>
        )}
      </section>
    );
  }

  const paragraphs = result.report.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <section aria-labelledby="research-title" className="surface flex flex-col gap-4 p-4 sm:p-5">
      <h2 id="research-title" className="flex items-center gap-2 font-semibold tracking-tight">
        <Search className="size-4 text-brand" aria-hidden="true" />
        Research brief
      </h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/85">
        {paragraphs.map((p, i) => {
          const heading = HEADINGS.find((h) => p.toLowerCase().startsWith(h.toLowerCase()));
          if (heading && p.length <= heading.length + 2) {
            return (
              <h3 key={i} className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground first:mt-0">
                {heading}
              </h3>
            );
          }
          return <p key={i}>{p}</p>;
        })}
      </div>
      {result.sources.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sources</h3>
          <ul className="flex flex-col gap-1.5">
            {result.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 text-sm text-brand hover:underline">
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span className="line-clamp-1">{s.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Written by AI from web sources on {new Date(result.researchedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Check the sources before you bet. It explains context; it doesn&apos;t change the score.
      </p>
    </section>
  );
}

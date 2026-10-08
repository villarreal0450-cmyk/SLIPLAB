"use client";

import Link from "next/link";
import { ArrowUp, Bot, Info, Square, Ticket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Logo } from "@/components/brand/Logo";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnalystError, askAnalyst } from "@/lib/analyst/client";
import { SUGGESTED_PROMPTS, type AnalystMode, type ChatMessage } from "@/lib/analyst/types";
import { lastName } from "@/lib/format/names";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { selectionKey } from "@/lib/parlay/format";
import { useParlayDraft } from "@/lib/parlay/store";
import type { Pick } from "@/lib/types";
import { MessageText } from "./MessageText";

const MAX_INPUT = 2000;
const slipKey = (picks: Pick[]) => `sliplab.analyst.${picks.map((p) => `${selectionKey(p)}:${p.direction}:${p.line}`).join("|")}`;

function loadThread(key: string): ChatMessage[] {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveThread(key: string, messages: ChatMessage[]) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(messages.slice(-30)));
  } catch {
    // Conversation still works without persistence.
  }
}

/**
 * Chat about the current slip. The conversation is tied to the slip: change
 * the picks and a new conversation starts (kept per tab in sessionStorage).
 */
export function AnalystView({ mode: serverMode }: { mode: AnalystMode }) {
  const hydrated = useHydrated();
  const { picks } = useParlayDraft();
  const key = slipKey(picks);
  const [thread, setThread] = useState<{ key: string; messages: ChatMessage[] } | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalystMode>(serverMode);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Load the conversation for this exact slip (render-time sync, no effect needed).
  if (hydrated && thread?.key !== key) {
    setThread({ key, messages: loadThread(key) });
  }
  const messages = thread?.key === key ? thread.messages : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!hydrated) return <div className="h-64" aria-busy="true" />;

  if (picks.length === 0) {
    return (
      <EmptyState
        icon={<Ticket />}
        title="Give the analyst something to look at"
        description="The analyst talks about the slip you're building. Add a few picks first, then ask anything about them."
        action={
          <Button asChild>
            <Link href="/build">Build a parlay</Link>
          </Button>
        }
      />
    );
  }

  async function send(text: string) {
    const content = text.trim().slice(0, MAX_INPUT);
    if (!content || pending !== null) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setThread({ key, messages: next });
    saveThread(key, next);
    setDraft("");
    setError(null);
    setPending("");

    const controller = new AbortController();
    abortRef.current = controller;
    let streamed = "";
    try {
      const { text: reply, mode: answeredBy } = await askAnalyst(picks, next, (chunk) => {
        streamed += chunk;
        setPending(streamed);
      }, controller.signal);
      setMode(answeredBy);
      const done: ChatMessage[] = [...next, { role: "analyst", content: reply.trim() || "I don't have anything useful to add on that." }];
      setThread({ key, messages: done });
      saveThread(key, done);
    } catch (e) {
      if (controller.signal.aborted) {
        if (streamed.trim()) {
          const partial: ChatMessage[] = [...next, { role: "analyst", content: `${streamed.trim()} …` }];
          setThread({ key, messages: partial });
          saveThread(key, partial);
        }
      } else {
        setError(e instanceof AnalystError ? e.message : "The analyst didn't answer. Try again.");
      }
    } finally {
      setPending(null);
      abortRef.current = null;
    }
  }

  const names = picks.map((p) => lastName(p.playerName));
  const busy = pending !== null;

  return (
    <div className="flex min-h-[60dvh] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border px-3.5 py-2.5 text-sm">
        <p className="min-w-0 truncate text-muted-foreground">
          Talking about your <span className="font-medium text-foreground">{picks.length}-leg slip</span> · {names.slice(0, 4).join(", ")}
          {names.length > 4 && ` +${names.length - 4}`}
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="size-3.5" aria-hidden="true" />
              {mode === "ai" ? "AI analyst" : "Quick analyst"}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            {mode === "ai"
              ? "Answers come from Claude, grounded in your slip's analysis. It won't invent stats."
              : "Claude isn't connected in this build, so answers come straight from the scoring engine. It handles the common questions about your slip."}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-1 flex-col gap-5 pb-6" aria-live="polite">
        {messages.length === 0 && !busy && (
          <div className="flex flex-col items-start gap-4 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand/12">
                <Logo />
              </span>
              <p className="text-lg font-semibold tracking-tight">What do you want to know about this slip?</p>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">I&apos;ll tell you what I like, what worries me, and when I think you shouldn&apos;t bet it.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {busy && (
          <Message message={{ role: "analyst", content: pending ?? "" }} streaming />
        )}
        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-negative/10 p-3 text-sm text-negative">
            {error}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const lastUser = [...messages].reverse().find((m) => m.role === "user");
                if (!lastUser) return;
                // Retry the last question without duplicating it.
                setThread({ key, messages: messages.slice(0, messages.lastIndexOf(lastUser)) });
                void send(lastUser.content);
              }}
            >
              Retry
            </Button>
          </div>
        )}
        <div ref={endRef} className="scroll-mb-56 md:scroll-mb-36" />
      </div>

      <div className="sticky bottom-[calc(max(env(safe-area-inset-bottom),0px)+4.5rem)] -mx-1 bg-gradient-to-t from-background via-background to-background/0 px-1 pt-3 md:bottom-6">
        <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Suggested questions">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => send(p)}
              className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="surface-elevated flex items-end gap-2 p-2"
        >
          <label htmlFor="analyst-input" className="sr-only">
            Ask the analyst
          </label>
          <textarea
            id="analyst-input"
            rows={1}
            value={draft}
            maxLength={MAX_INPUT}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            placeholder="Ask about your slip…"
            className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground/60 field-sizing-content"
          />
          {busy ? (
            <Button type="button" size="icon-lg" variant="secondary" className="size-10 rounded-xl" onClick={() => abortRef.current?.abort()} aria-label="Stop answer">
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button type="submit" size="icon-lg" className="size-10 rounded-xl" disabled={!draft.trim()} aria-label="Send">
              <ArrowUp />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

function Message({ message, streaming = false }: { message: ChatMessage; streaming?: boolean }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-surface-elevated px-4 py-2.5 text-[15px]">{message.content}</p>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand" aria-hidden="true">
        <Bot className="size-4" />
      </span>
      <div className={cn("min-w-0 flex-1 text-[15px] leading-relaxed text-foreground/90", streaming && !message.content && "pt-1")}>
        {message.content ? <MessageText text={message.content} /> : <TypingDots />}
        {streaming && message.content && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand/70 align-middle" aria-hidden="true" />}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1" aria-label="Analyst is thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

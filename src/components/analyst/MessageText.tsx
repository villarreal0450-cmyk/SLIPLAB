import type { ReactNode } from "react";

/** Tiny, safe renderer for analyst replies: paragraphs, "- " lists and **bold**. No HTML is interpreted. */
export function MessageText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

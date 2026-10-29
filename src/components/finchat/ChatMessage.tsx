import { Landmark } from "lucide-react";
import type { ReactNode } from "react";

export interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function renderInline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2)
      return (
        <em key={i} className="text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    return part;
  });
}

function RichText({ text }: { text: string }) {
  const blocks = text.split("\n\n");
  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((l, j) => (
                <li key={j} className="rounded-lg bg-muted px-3 py-2 text-sm">
                  {renderInline(l.slice(2))}
                </li>
              ))}
            </ul>
          );
        return <p key={i}>{renderInline(b)}</p>;
      })}
    </div>
  );
}

export function ChatMessage({ msg }: { msg: Msg }) {
  if (msg.role === "user")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
          {msg.text}
        </div>
      </div>
    );
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Landmark className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 text-foreground">
        <RichText text={msg.text} />
      </div>
    </div>
  );
}

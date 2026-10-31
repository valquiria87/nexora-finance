import { Landmark } from "lucide-react";
import type { ReactNode } from "react";

export interface ChatMeta {
  periodo: { inicio: string; fim: string } | null;
  registros: number;
  fonte: string;
}

export interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  mode?: "claude" | "regras" | "demo";
  meta?: ChatMeta;
  errorMessage?: string;
  retryUserMessageId?: string;
}

const headingTags = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

function renderInline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`"))
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5">
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2)
      return (
        <em key={i} className="text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    return part;
  });
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index++;
      continue;
    }

    if (line.includes("|") && isTableSeparator(lines[index + 1] ?? "")) {
      const headers = tableCells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index]?.includes("|") && lines[index]?.trim()) {
        rows.push(tableCells(lines[index] ?? ""));
        index++;
      }
      blocks.push(
        <div
          key={blocks.length}
          className="my-3 max-w-full overflow-x-auto rounded-lg border border-border"
          role="region"
          aria-label="Tabela de dados"
          tabIndex={0}
        >
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead className="bg-muted">
              <tr>
                {headers.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold"
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-b-0">
                  {headers.map((_, cellIndex) => (
                    <td key={cellIndex} className="max-w-[280px] px-3 py-2 align-top">
                      {renderInline(row[cellIndex] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const Heading = headingTags[level - 1] ?? "h2";
      blocks.push(
        <Heading key={blocks.length} className="font-semibold">
          {renderInline(heading[2] ?? "")}
        </Heading>,
      );
      index++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*[-*]\s+/, ""));
        index++;
      }
      blocks.push(
        <ul key={blocks.length} className="list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*\d+[.)]\s+/, ""));
        index++;
      }
      blocks.push(
        <ol key={blocks.length} className="list-decimal space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph = [line];
    index++;
    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !/^(#{1,6})\s+/.test(lines[index] ?? "") &&
      !/^\s*[-*]\s+/.test(lines[index] ?? "") &&
      !/^\s*\d+[.)]\s+/.test(lines[index] ?? "") &&
      !((lines[index] ?? "").includes("|") && isTableSeparator(lines[index + 1] ?? ""))
    ) {
      paragraph.push(lines[index] ?? "");
      index++;
    }
    blocks.push(
      <p key={blocks.length}>
        {paragraph.map((part, partIndex) => (
          <span key={partIndex}>
            {partIndex > 0 && <br />}
            {renderInline(part)}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="space-y-3 leading-relaxed">{blocks}</div>;
}

function formatPeriodDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(date);
}

export function ChatMessage({ msg, onRetry }: { msg: Msg; onRetry?: (message: Msg) => void }) {
  if (msg.role === "user")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
          {msg.text}
        </div>
      </div>
    );
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Landmark className="h-4 w-4" aria-label="Assistente Dio" />
      </div>
      <div className="min-w-0 flex-1 text-foreground">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">
          Dio · Assistente Nexora Finance
        </p>
        <RichText text={msg.text} />
        {msg.errorMessage && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p role="alert">{msg.errorMessage}</p>
            <p className="mt-1 text-xs font-medium">Modo demonstração (dados locais)</p>
            {msg.retryUserMessageId && (
              <button
                type="button"
                className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                onClick={() => onRetry?.(msg)}
                disabled={!onRetry}
              >
                Tentar de novo
              </button>
            )}
          </div>
        )}
        {msg.mode && msg.mode !== "demo" && msg.meta && (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-medium text-primary">
              Integração ativa · Plaid Sandbox · dados fictícios
            </p>
            <p className="inline-flex rounded-full bg-muted px-2.5 py-1">
              {msg.mode === "claude" ? "Respostas com IA" : "Respostas por regras"}
            </p>
            <p>
              Período:{" "}
              {msg.meta.periodo
                ? `${formatPeriodDate(msg.meta.periodo.inicio)} a ${formatPeriodDate(msg.meta.periodo.fim)}`
                : "não informado"}{" "}
              · {msg.meta.registros} registros · Fonte: {msg.meta.fonte}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

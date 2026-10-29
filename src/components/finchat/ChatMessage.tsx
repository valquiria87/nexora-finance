import { Landmark } from "lucide-react";
import type { ReactNode } from "react";
import type { DioChatMeta } from "@/lib/dio-chat.service";

export interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  responseStatus?: "success" | "demo";
  mode?: "claude" | "regras";
  meta?: DioChatMeta;
  errorMessage?: string;
  retryUserMessageId?: string;
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_|\x60[^\x60]+\x60)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2)
      return <em key={i} className="text-muted-foreground">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">{part.slice(1, -1)}</code>;
    return part;
  });
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = tableCells(line);
  return line.includes("|") && cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = tableCells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={blocks.length} className="my-3 max-w-full overflow-x-auto rounded-lg border border-border" role="region" aria-label="Tabela de dados" tabIndex={0}>
          <table className="min-w-[560px] w-full border-collapse text-left text-xs">
            <thead className="bg-muted/80">
              <tr>{headers.map((header, i) => <th key={i} className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold">{renderInline(header)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-b-0">
                  {headers.map((_, cellIndex) => <td key={cellIndex} className="max-w-[280px] px-3 py-2 align-top">{renderInline(row[cellIndex] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      blocks.push(level === 1
        ? <h2 key={blocks.length} className="text-base font-semibold">{content}</h2>
        : level === 2
          ? <h3 key={blocks.length} className="text-sm font-semibold">{content}</h3>
          : <h4 key={blocks.length} className="text-sm font-medium">{content}</h4>);
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(<ul key={blocks.length} className="list-disc space-y-1 pl-5">{items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(<ol key={blocks.length} className="list-decimal space-y-1 pl-5">{items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ol>);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+[.)]\s+/.test(lines[index]) &&
      !(lines[index].includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]))
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={blocks.length}>{paragraph.map((part, i) => <span key={i}>{i > 0 && <br />}{renderInline(part)}</span>)}</p>);
  }

  return <div className="space-y-3 leading-relaxed">{blocks}</div>;
}

function formatPeriodDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(parsed);
}

export function ChatMessage({ msg, onRetry }: { msg: Msg; onRetry?: (userMessageId: string) => void }) {
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
        <Landmark className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 text-foreground">
        {msg.responseStatus === "success" && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-medium text-primary">
              Integração ativa · Plaid Sandbox · dados fictícios
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {msg.mode === "claude" ? "Respostas com IA" : "Respostas por regras"}
            </span>
          </div>
        )}
        {msg.responseStatus === "demo" && (
          <div className="mb-3 rounded-lg border border-border bg-muted/50 p-3 text-xs" role="alert">
            <p className="font-semibold">Modo demonstração (dados locais)</p>
            <p className="mt-1 text-muted-foreground">{msg.errorMessage ?? "O assistente conectado está indisponível."}</p>
            {msg.retryUserMessageId && onRetry && (
              <button type="button" className="mt-2 rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted" onClick={() => onRetry(msg.retryUserMessageId!)}>
                Tentar de novo
              </button>
            )}
          </div>
        )}
        <RichText text={msg.text} />
        {msg.responseStatus === "success" && msg.meta && (
          <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
            Período: {msg.meta.periodo ? `${formatPeriodDate(msg.meta.periodo.inicio)} – ${formatPeriodDate(msg.meta.periodo.fim)}` : "não informado"}
            {" · "}Registros: {msg.meta.registros}
            {" · "}Fonte: {msg.meta.fonte}
          </p>
        )}
      </div>
    </div>
  );
}

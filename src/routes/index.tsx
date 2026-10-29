import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Landmark,
  LayoutDashboard,
  Menu,
  Plus,
  SendHorizontal,
  Trash2,
  X,
  LoaderCircle,
  AlertCircle,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { ChatMessage, type Msg } from "@/components/finchat/ChatMessage";
import { Dashboard } from "@/components/finchat/Dashboard";
import { Button } from "@/components/ui/button";
import {
  SUGGESTIONS,
  answer,
  demoProvider,
  type DemoAccount,
  type DemoTransaction,
  type FinanceDataProvider,
} from "@/lib/finance";
import type { PluggyAccount, PluggyTransaction } from "@/lib/pluggy.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora Finance | Open Finance" },
      {
        name: "description",
        content: "Open Finance e inteligência financeira em uma experiência segura e conectada.",
      },
      { property: "og:title", content: "Nexora Finance | Open Finance" },
      {
        property: "og:description",
        content: "Acompanhe contas e movimentações em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Msg[];
}
const KEY = "finchat-conversations";
const uid = () => Math.random().toString(36).slice(2, 10);

function Index() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [section, setSection] = useState<"overview" | "accounts" | "transactions" | "chat">(
    "overview",
  );
  const [pluggyToken, setPluggyToken] = useState<string | null>(null);
  const [pluggyAccounts, setPluggyAccounts] = useState<PluggyAccount[]>([]);
  const [pluggyTransactions, setPluggyTransactions] = useState<PluggyTransaction[]>([]);
  const [pluggyConnected, setPluggyConnected] = useState(false);
  const [pluggyStatus, setPluggyStatus] = useState<string | null>(null);
  const [pluggyInstitution, setPluggyInstitution] = useState<string | null>(null);
  const [pluggyLoading, setPluggyLoading] = useState(true);
  const [pluggyLoadError, setPluggyLoadError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const loadPluggy = async () => {
    setPluggyLoading(true);
    setPluggyLoadError(null);
    try {
      const response = await fetch("/api/pluggy-data");
      const data = (await response.json()) as {
        connected?: boolean;
        item?: { status?: string; connector?: { name?: string } };
        accounts?: PluggyAccount[];
        transactions?: PluggyTransaction[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os dados Pluggy.");
      setPluggyConnected(Boolean(data.connected));
      setPluggyAccounts(data.accounts ?? []);
      setPluggyTransactions(data.transactions ?? []);
      const connectorName = data.item?.connector?.name;
      setPluggyInstitution(connectorName ?? null);
      const isSandbox = Boolean(connectorName && /sandbox|pluggy bank/i.test(connectorName));
      setPluggyStatus(
        data.connected
          ? isSandbox
            ? "Pluggy Sandbox · dados sintéticos"
            : connectorName
              ? "Conectado · " + connectorName
              : "Pluggy conectada · origem não identificada"
          : null,
      );
    } catch (cause) {
      setPluggyConnected(false);
      setPluggyAccounts([]);
      setPluggyTransactions([]);
      setPluggyStatus(null);
      setPluggyInstitution(null);
      setPluggyLoadError(
        cause instanceof Error ? cause.message : "Falha ao consultar conexão Pluggy.",
      );
      throw cause;
    } finally {
      setPluggyLoading(false);
    }
  };

  useEffect(() => {
    void loadPluggy().catch(() => undefined);
  }, []);
  const [PluggyConnectComponent, setPluggyConnectComponent] = useState<ComponentType<{
    connectToken: string;
    includeSandbox: boolean;
    onSuccess: (event: { item: { id: string } }) => void;
    onError: (error?: unknown) => void;
    onClose: () => void;
  }> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (
        Array.isArray(saved) &&
        saved.every(
          (c) =>
            c &&
            typeof c.id === "string" &&
            typeof c.title === "string" &&
            typeof c.updatedAt === "number" &&
            Array.isArray(c.messages) &&
            c.messages.every(
              (m: Msg) =>
                m &&
                typeof m.id === "string" &&
                typeof m.text === "string" &&
                (m.role === "user" || m.role === "assistant"),
            ),
        )
      )
        setConvs(saved);
      else
        setError(
          "NÃ£o foi possÃ­vel recuperar o histÃ³rico. VocÃª pode iniciar uma nova conversa.",
        );
    } catch {
      setError("NÃ£o foi possÃ­vel recuperar o histÃ³rico. VocÃª pode iniciar uma nova conversa.");
    }
    inputRef.current?.focus();
  }, []);

  const save = (next: Conversation[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      setError(
        "O histÃ³rico nÃ£o pÃ´de ser salvo neste navegador. A conversa continua disponÃ­vel nesta sessÃ£o.",
      );
    }
  };
  const persist = (next: Conversation[]) => {
    setConvs(next);
    save(next);
  };
  const active = convs.find((c) => c.id === activeId);
  const messages = active?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);
  const connectBank = async () => {
    try {
      setError("");
      setConnecting(true);
      const response = await fetch("/api/pluggy-token", {
        method: "POST",
      });

      const data = (await response.json()) as {
        accessToken?: string;
        error?: string;
      };

      if (!response.ok || !data.accessToken) {
        throw new Error(data.error ?? "NÃ£o foi possÃ­vel iniciar a conexÃ£o bancÃ¡ria.");
      }

      const { PluggyConnect } = await import("react-pluggy-connect");
      setPluggyConnectComponent(
        () =>
          PluggyConnect as ComponentType<{
            connectToken: string;
            includeSandbox: boolean;
            onSuccess: (event: { item: { id: string } }) => void;
            onError: (error?: unknown) => void;
            onClose: () => void;
          }>,
      );
      setPluggyToken(data.accessToken);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Erro inesperado ao iniciar conexÃ£o Pluggy.",
      );
    } finally {
      setConnecting(false);
    }
  };
  const send = (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    const userMsg: Msg = { id: uid(), role: "user", text: t };
    let id = activeId;
    let list = convs;
    if (!id) {
      id = uid();
      list = [{ id, title: t.slice(0, 48), updatedAt: Date.now(), messages: [] }, ...convs];
      setActiveId(id);
    }
    const cid = id;
    const withUser = list.map((c) =>
      c.id === cid ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() } : c,
    );
    persist(withUser);
    setInput("");
    setTyping(true);
    // Ponto de integraÃ§Ã£o futura: substituir answer() por chamada ao backend.
    setTimeout(() => {
      const reply: Msg = { id: uid(), role: "assistant", text: answer(t) };
      setConvs((prev) => {
        const next = prev.map((c) =>
          c.id === cid ? { ...c, messages: [...c.messages, reply], updatedAt: Date.now() } : c,
        );
        save(next);
        return next;
      });
      setTyping(false);
      inputRef.current?.focus();
    }, 600);
  };

  const newChat = () => {
    setActiveId(null);
    setShowHistory(false);
    setError("");
    setSection("chat");
    inputRef.current?.focus();
  };

  const provider: FinanceDataProvider = pluggyConnected
    ? {
        mode: "pluggy",
        getAccounts: () =>
          pluggyAccounts.map((account): DemoAccount => ({
            id: account.id,
            name: account.name ?? "Nome não informado",
            type:
              account.type === "CREDIT"
                ? "credit"
                : account.subtype === "SAVINGS_ACCOUNT"
                  ? "savings"
                  : "checking",
            currency: account.currencyCode ?? null,
            ...(account.balance != null ? { balance: account.balance } : {}),
            ...(account.type === "BANK" && account.balance != null
              ? { available: account.balance }
              : {}),
            ...(account.type === "CREDIT" && account.balance != null
              ? { debt: account.balance }
              : {}),
            ...(account.creditData?.availableCreditLimit != null
              ? { availableCredit: account.creditData.availableCreditLimit }
              : {}),
          })),
        getTransactions: () => {
          const accountTypes = new Map(pluggyAccounts.map((account) => [account.id, account.type]));
          return pluggyTransactions.map((transaction): DemoTransaction => ({
            id: transaction.id,
            accountId: transaction.accountId,
            date: transaction.date.slice(0, 10),
            description: transaction.description ?? "Movimentação",
            amount:
              accountTypes.get(transaction.accountId) === "CREDIT"
                ? transaction.amount
                : -transaction.amount,
            category: transaction.category ?? "",
            ...(transaction.currencyCode ? { currency: transaction.currencyCode } : {}),
          }));
        },
      }
    : demoProvider;

  const disconnectBank = async () => {
    if (
      !window.confirm(
        "Desconectar esta instituição? O consentimento e o item vinculado serão removidos.",
      )
    )
      return;
    try {
      const response = await fetch("/api/pluggy-session", { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível desconectar.");
      setError("Instituição desconectada.");
      await loadPluggy();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível desconectar.");
    }
  };

  return (
    <div className="nexora-shell">
      <button
        className={"nexora-mobile-scrim" + (showHistory ? " is-open" : "")}
        aria-label="Fechar navegação"
        onClick={() => setShowHistory(false)}
        tabIndex={showHistory ? 0 : -1}
      />
      <aside
        className={"nexora-sidebar" + (showHistory ? " is-open" : "")}
        aria-label="Navegação principal"
      >
        <div className="nexora-brand">
          <span className="nexora-brand-mark">
            <ChartNoAxesCombined aria-hidden="true" />
          </span>
          <div>
            <div className="nexora-brand-name">Nexora</div>
          </div>
          <Button
            className="ml-auto md:hidden"
            variant="ghost"
            size="icon"
            aria-label="Fechar menu"
            onClick={() => setShowHistory(false)}
          >
            <X />
          </Button>
        </div>

        <nav className="nexora-nav">
          <button
            className="nexora-nav-item"
            aria-current={section === "overview" ? "page" : undefined}
            onClick={() => {
              setSection("overview");
              setShowHistory(false);
            }}
          >
            <LayoutDashboard /> Visão geral
          </button>
          <button
            className="nexora-nav-item"
            aria-current={section === "accounts" ? "page" : undefined}
            onClick={() => {
              setSection("accounts");
              setShowHistory(false);
            }}
          >
            <Landmark /> Contas
          </button>
          <button
            className="nexora-nav-item"
            aria-current={section === "transactions" ? "page" : undefined}
            onClick={() => {
              setSection("transactions");
              setShowHistory(false);
            }}
          >
            <ArrowLeftRight /> Transações
          </button>
          <button
            className="nexora-nav-item"
            aria-current={section === "chat" ? "page" : undefined}
            onClick={() => {
              setSection("chat");
              setShowHistory(false);
            }}
          >
            <MessageCircle /> Assistente
          </button>
        </nav>

        {section === "chat" && (
          <div className="mt-7 min-h-0 flex-1">
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="nexora-nav-label !p-0">Conversas</div>
              <button
                className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                aria-label="Nova conversa"
                onClick={newChat}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <nav className="grid max-h-[34vh] gap-1 overflow-y-auto">
              {convs.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  Seu histórico aparecerá aqui.
                </p>
              )}
              {[...convs]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((conversation) => (
                  <div key={conversation.id} className="group flex min-w-0 items-center">
                    <button
                      className="min-w-0 flex-1 truncate rounded-lg px-2.5 py-2 text-left text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      aria-current={conversation.id === activeId ? "page" : undefined}
                      onClick={() => {
                        setActiveId(conversation.id);
                        setShowHistory(false);
                      }}
                    >
                      {conversation.title}
                    </button>
                    <button
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-sidebar-accent hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                      aria-label="Excluir conversa"
                      onClick={() => {
                        persist(convs.filter((entry) => entry.id !== conversation.id));
                        if (conversation.id === activeId) setActiveId(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
            </nav>
          </div>
        )}

        <div className="nexora-sidebar-bottom">
          <div className="nexora-connection-card">
            <div className="nexora-connection-title">
              <Landmark /> {pluggyConnected ? "Conexão ativa" : "Conecte suas contas"}
            </div>
            <p className="nexora-connection-copy">
              {pluggyConnected
                ? /sandbox|dados sintéticos/i.test(pluggyStatus ?? "")
                  ? "Sandbox conectado"
                  : "Conectado"
                : "Conecte sua conta para visualizar suas informações financeiras."}{" "}
            </p>
            {!pluggyConnected && (
              <Button
                className="nexora-connect-button"
                onClick={() => void connectBank()}
                disabled={connecting || pluggyLoading}
              >
                {connecting ? (
                  <>
                    <LoaderCircle className="animate-spin" /> Preparando…
                  </>
                ) : (
                  "Conectar instituição"
                )}
              </Button>
            )}
          </div>
          <button
            className="nexora-nav-item"
            onClick={() => void loadPluggy().catch(() => undefined)}
            disabled={pluggyLoading}
          >
            <RefreshCw className={pluggyLoading ? "animate-spin" : ""} /> Atualizar conexão
          </button>
        </div>
      </aside>

      <main className="nexora-main">
        <header className="nexora-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              className="nexora-menu-button"
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
              onClick={() => setShowHistory(true)}
            >
              <Menu />
            </Button>
          </div>
          <div className="nexora-topbar-actions">
            <span className="nexora-status" role="status" aria-live="polite">
              <span className="nexora-status-dot" />
              {pluggyLoading
                ? "Carregando suas informações…"
                : pluggyConnected
                  ? /sandbox|dados sintéticos/i.test(pluggyStatus ?? "")
                    ? "Sandbox conectado"
                    : "Conectado"
                  : pluggyLoadError
                    ? "Conexão indisponível"
                    : "Ambiente de demonstração"}
            </span>
            {!pluggyConnected && pluggyLoadError && (
              <span className="nexora-demo-inline">Ambiente de demonstração</span>
            )}
            {pluggyConnected && (
              <Button variant="outline" size="sm" onClick={() => void disconnectBank()}>
                Desconectar
              </Button>
            )}
          </div>
        </header>

        {error && (
          <div
            className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
            role="status"
          >
            <AlertCircle className="h-4 w-4 text-primary" />
            <span className="flex-1">{error}</span>
            <button aria-label="Fechar aviso" onClick={() => setError("")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {pluggyLoadError && (
          <div className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-6xl nexora-alert" role="alert">
            Não foi possível carregar os dados. Tente novamente.
          </div>
        )}

        <div className="nexora-content">
          {section !== "chat" ? (
            <Dashboard
              section={section}
              provider={provider}
              institution={pluggyInstitution}
              loading={pluggyLoading}
              error={null}
              onRefresh={() => void loadPluggy().catch(() => undefined)}
              onConnect={!pluggyConnected ? () => void connectBank() : undefined}
            />
          ) : (
            <div className="nexora-chat-area">
              <div className="nexora-chat-intro">
                <p className="nexora-eyebrow">NEXORA INTELLIGENCE</p>
                <h1>Seu dinheiro, em contexto.</h1>
                <p className="nexora-subtitle">
                  Faça perguntas e explore os temas financeiros disponíveis nesta experiência.
                </p>
              </div>
              <div className="nexora-demo-banner">
                <span className="nexora-demo-tag">CHAT DEMO</span>
                <span>
                  As respostas do assistente usam somente dados sintéticos de demonstração; seus
                  dados Pluggy não são usados neste chat.
                </span>
              </div>
              <div className="nexora-chat-thread">
                {messages.length === 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        className="h-auto min-h-12 justify-start whitespace-normal rounded-xl px-4 py-3 text-left text-xs leading-relaxed"
                        onClick={() => send(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
                {messages.map((message) => (
                  <ChatMessage key={message.id} msg={message} />
                ))}
                {typing && (
                  <div
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                    role="status"
                  >
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Preparando resposta…
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <form
                className="nexora-chat-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send(input);
                }}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    aria-label="Mensagem"
                    ref={inputRef}
                    rows={2}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder="Pergunte sobre o exemplo financeiro…"
                  />
                  <Button
                    type="submit"
                    aria-label="Enviar mensagem"
                    disabled={!input.trim() || typing}
                  >
                    <SendHorizontal />
                  </Button>
                </div>
                <p className="mb-0 mt-1 px-3 text-[10px] text-muted-foreground">
                  Enter envia · Shift + Enter quebra a linha
                </p>
              </form>
            </div>
          )}
        </div>
      </main>

      {pluggyToken && PluggyConnectComponent && (
        <div className="fixed inset-0 z-[70] bg-background">
          <PluggyConnectComponent
            connectToken={pluggyToken}
            includeSandbox={true}
            onSuccess={({ item }: { item: { id: string } }) => {
              setPluggyToken(null);
              void fetch("/api/pluggy-session", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ itemId: item.id }),
              })
                .then(async (response) => {
                  const data = (await response.json()) as { error?: string };
                  if (!response.ok)
                    throw new Error(data.error ?? "Não foi possível salvar a conexão.");
                  await loadPluggy();
                  setSection("overview");
                  setError("Conexão bancária salva com sucesso.");
                })
                .catch((cause: unknown) =>
                  setError(
                    cause instanceof Error ? cause.message : "Não foi possível salvar a conexão.",
                  ),
                );
            }}
            onError={() => {
              setPluggyToken(null);
              setError("A Pluggy não conseguiu concluir a conexão. Tente novamente.");
            }}
            onClose={() => setPluggyToken(null)}
          />
        </div>
      )}
    </div>
  );
}

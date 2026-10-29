export interface DioChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DioChatMeta {
  periodo: { inicio: string; fim: string } | null;
  registros: number;
  fonte: string;
}

export interface DioChatSuccess {
  resposta: string;
  modo: "claude" | "regras";
  meta: DioChatMeta;
}

export interface DioChatFailure {
  erro: string;
}

export type DioChatResult = DioChatSuccess | DioChatFailure;

export async function askDioChat(
  mensagem: string,
  historico: DioChatHistoryMessage[],
): Promise<DioChatSuccess> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch("/api/dio-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mensagem, historico }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as DioChatResult | null;
    if (!response.ok || !payload || "erro" in payload) {
      throw new Error(
        payload && "erro" in payload && payload.erro
          ? payload.erro
          : "Não foi possível consultar o assistente conectado.",
      );
    }

    if (
      typeof payload.resposta !== "string" ||
      (payload.modo !== "claude" && payload.modo !== "regras") ||
      !payload.meta ||
      typeof payload.meta.registros !== "number" ||
      typeof payload.meta.fonte !== "string" ||
      !(
        payload.meta.periodo === null ||
        (typeof payload.meta.periodo?.inicio === "string" &&
          typeof payload.meta.periodo?.fim === "string")
      )
    ) {
      throw new Error("O assistente retornou uma resposta em formato inesperado.");
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A consulta demorou mais de 60 segundos. Você pode tentar novamente.");
    }
    if (error instanceof TypeError) {
      throw new Error("Não foi possível alcançar o servidor. Verifique a conexão e tente novamente.");
    }
    throw error instanceof Error
      ? error
      : new Error("O assistente conectado não respondeu. Tente novamente.");
  } finally {
    clearTimeout(timeoutId);
  }
}

import { DEEPINFRA_MODEL, DEEPINFRA_TIMEOUT_MS, DEEPINFRA_URL } from "../constants";
import type { AiClient, ChatTurn } from "../types";

type DeepInfraMessage = {
  content?: string | null;
  reasoning_content?: string | null;
};

type DeepInfraResponse = {
  choices?: Array<{ message?: DeepInfraMessage }>;
};

export function createDeepInfraClient(options: {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  model?: string;
}): AiClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEEPINFRA_TIMEOUT_MS;
  const model = options.model ?? DEEPINFRA_MODEL;

  return {
    async complete(messages: ChatTurn[]): Promise<string> {
      if (options.apiKey.trim() === "") {
        throw new Error("Thiếu DEEPINFRA_API_KEY");
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(DEEPINFRA_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({ model, messages, stream: false }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`DeepInfra HTTP ${response.status}`);
        const payload = (await response.json()) as DeepInfraResponse;
        const content = payload.choices?.[0]?.message?.content;
        if (typeof content !== "string" || content.trim() === "") {
          throw new Error("Empty model response");
        }
        return content.trim();
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

import { describe, expect, it } from "vitest";
import { DEEPINFRA_MODEL, DEEPINFRA_URL } from "../constants";
import { createDeepInfraClient } from "./deepinfra";

describe("DeepInfra client", () => {
  it("returns visible content and drops reasoning", async () => {
    let requestUrl = "";
    let requestBody = "";
    const client = createDeepInfraClient({
      apiKey: "test-key",
      fetchImpl: async (input, init) => {
        requestUrl = String(input);
        requestBody = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "  chào bạn  ",
                  reasoning_content: "chain of thought",
                },
              },
            ],
          }),
          { status: 200 },
        );
      },
    });
    const text = await client.complete([{ role: "user", content: "hi" }]);
    expect(text).toBe("chào bạn");
    expect(text).not.toContain("chain of thought");
    expect(requestUrl).toBe(DEEPINFRA_URL);
    expect(JSON.parse(requestBody)).toMatchObject({ model: DEEPINFRA_MODEL, stream: false });
  });

  it("throws when the network fails or the key is missing", async () => {
    const missing = createDeepInfraClient({ apiKey: "  " });
    await expect(missing.complete([{ role: "user", content: "hi" }])).rejects.toThrow(
      "DEEPINFRA_API_KEY",
    );
    const failing = createDeepInfraClient({
      apiKey: "test-key",
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });
    await expect(failing.complete([{ role: "user", content: "hi" }])).rejects.toThrow("network down");
    const httpError = createDeepInfraClient({
      apiKey: "test-key",
      fetchImpl: async () => new Response("no", { status: 503 }),
    });
    await expect(httpError.complete([{ role: "user", content: "hi" }])).rejects.toThrow("503");
  });
});

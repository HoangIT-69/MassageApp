import { createDeepInfraClient, DEEPINFRA_MODEL } from "@zalo/core";
import { getEnv } from "@/config/env";

export function modelName(): string {
  return DEEPINFRA_MODEL;
}

export function getAiClient() {
  return createDeepInfraClient({ apiKey: getEnv().deepinfraApiKey });
}

import { loadWorkerEnv } from "./config";
import { startWorker } from "./session";

startWorker(loadWorkerEnv()).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "worker failed";
  console.error(message);
  process.exitCode = 1;
});

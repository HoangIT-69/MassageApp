import { routeOutbox, takeOutbox, type AppDatabase, type ChannelName, type ChannelSender } from "@zalo/core";
import type { WorkerEnv } from "./config";

const OUTBOX_POLL_MS = 1000;

export type SenderRegistry = {
  add(sender: ChannelSender): void;
  remove(channel: ChannelName): void;
};

// Vòng lặp này sống suốt đời worker, không gắn vào phiên Zalo: Zalo chưa quét QR
// thì reply Facebook vẫn phải đi được.
export function startOutboxLoop(
  db: AppDatabase,
  env: WorkerEnv,
): SenderRegistry & { stop(): void } {
  const senders = new Map<ChannelName, ChannelSender>();
  let flushing = false;
  const timer = setInterval(() => {
    if (flushing || senders.size === 0) return;
    flushing = true;
    void flush(db, env, senders).finally(() => {
      flushing = false;
    });
  }, OUTBOX_POLL_MS);
  timer.unref?.();
  return {
    add(sender) {
      senders.set(sender.channel, sender);
    },
    remove(channel) {
      senders.delete(channel);
    },
    stop() {
      clearInterval(timer);
    },
  };
}

async function flush(
  db: AppDatabase,
  env: WorkerEnv,
  senders: Map<ChannelName, ChannelSender>,
): Promise<void> {
  const batch = await takeOutbox(db, env.vendorId);
  for (const item of batch) {
    try {
      await routeOutbox(db, env.vendorId, senders, item);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "send failed");
    }
  }
}

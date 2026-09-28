import { ThreadType, type API } from "zca-js";
import {
  attachmentPayload,
  createObjectStore,
  loadPhotoBytes,
  type ChannelSender,
} from "@zalo/core";
import type { WorkerEnv } from "../config";

export function createZaloSender(api: API, env: WorkerEnv): ChannelSender {
  return {
    channel: "zalo",
    async send(item) {
      const type = item.threadType === "group" ? ThreadType.Group : ThreadType.User;
      if (item.attachmentPath) {
        const body = await loadPhotoBytes(
          createObjectStore(env.objectStore),
          env.dataDir,
          item.attachmentPath,
        );
        const file = attachmentPayload(item.attachmentPath, body);
        await api.sendMessage({ msg: item.content, attachments: [file] }, item.threadId, type);
        return;
      }
      await api.sendMessage({ msg: item.content }, item.threadId, type);
    },
  };
}

import { ThreadType, type Message } from "zca-js";
import { ATTACHMENT_PLACEHOLDER, type InboundInput } from "@zalo/core";

function titleFor(message: Message): string {
  const name = message.data.dName.trim();
  if (message.type === ThreadType.User) return name || "Người dùng";
  return "Nhóm";
}

export function toInbound(message: Message): InboundInput {
  const raw = message.data.content;
  const isText = typeof raw === "string";
  const timestamp = Number(message.data.ts);
  const zaloMsgId = message.data.msgId || message.data.realMsgId;
  return {
    threadId: message.threadId,
    threadType: message.type === ThreadType.Group ? "group" : "user",
    title: titleFor(message),
    avatarUrl: null,
    overwriteTitle: message.type === ThreadType.User,
    content: isText ? raw : ATTACHMENT_PLACEHOLDER,
    isText,
    isSelf: message.isSelf,
    zaloMsgId: zaloMsgId ? String(zaloMsgId) : null,
    timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now(),
  };
}

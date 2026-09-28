import { ThreadType, type Message } from "zca-js";
import { ATTACHMENT_PLACEHOLDER, type InboundInput } from "@zalo/core";

function titleFor(message: Message): string {
  if (message.type !== ThreadType.User) return "Nhóm";
  if (message.isSelf) return "";
  return message.data.dName.trim() || "Người dùng";
}

export function toInbound(message: Message): InboundInput {
  const raw = message.data.content;
  const isText = typeof raw === "string";
  const timestamp = Number(message.data.ts);
  const zaloMsgId = message.data.msgId || message.data.realMsgId;
  return {
    channel: "zalo",
    threadId: message.threadId,
    threadType: message.type === ThreadType.Group ? "group" : "user",
    title: titleFor(message),
    avatarUrl: null,
    overwriteTitle: !message.isSelf && message.type === ThreadType.User,
    content: isText ? raw : ATTACHMENT_PLACEHOLDER,
    isText,
    isSelf: message.isSelf,
    externalMsgId: zaloMsgId ? String(zaloMsgId) : null,
    timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now(),
  };
}

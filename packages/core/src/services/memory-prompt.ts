import { FACTS_PER_TURN } from "../constants";
import type { MessageRecord } from "../types";

export function memoryExtractPrompt(
  history: MessageRecord[],
  needSummary: boolean,
  hints: { staffNames: string[]; zaloName: string },
): string {
  const lines = history.map((message) => {
    const who = message.direction === "in" ? "Khách" : "Quán";
    return `${who}: ${message.content}`;
  });
  const staff = hints.staffNames.filter((name) => name.trim() !== "").join(", ") || "không có";
  return [
    "Đọc đoạn chat và trả về JSON duy nhất, không markdown.",
    `Tối đa ${FACTS_PER_TURN} facts. kind chỉ được là name, phone, preference, intent.`,
    "confidence là số từ 0 đến 1. Chỉ ghi fact khách vừa nói rõ.",
    `kind=name chỉ khi khách tự xưng hoặc đồng ý tên Zalo gợi ý "${hints.zaloName || "chưa rõ"}".`,
    `Không ghi kind=name bằng tên nhân viên: ${staff}.`,
    needSummary
      ? "summary là một đoạn tiếng Việt tóm tắt cả đoạn chat."
      : "summary phải là chuỗi rỗng.",
    'anchor mô tả lịch đang dở: {"serviceName":"","staffName":"","whenText":"","missing":""}. Nếu không có ý đặt lịch, anchor là null.',
    '{"facts":[{"kind":"name","content":"","confidence":0.9}],"summary":"","anchor":null}',
    "",
    ...lines,
  ].join("\n");
}

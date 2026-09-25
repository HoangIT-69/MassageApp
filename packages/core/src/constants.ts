export const LOCAL_VENDOR_ID = "local";

export const ATTACHMENT_PLACEHOLDER = "[Tệp đính kèm]";

export const AI_FAILURE_TEXT = "Không trả lời được";

export const HISTORY_LIMIT = 20;

export const MESSAGE_PAGE_SIZE = 200;

export const MAX_MESSAGE_LENGTH = 4000;

export const SELF_ECHO_WINDOW_MS = 120_000;

export const OUTBOX_BATCH_SIZE = 5;

export const SUMMARY_EVERY_N = 10;

export const FACT_CONFIDENCE_FLOOR = 50;

export const FACT_INJECT_CAP = 24;

export const SUMMARY_INJECT_CAP = 5;

export const FACTS_PER_TURN = 5;

export const MAX_PHOTO_BYTES = 5_000_000;

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const WEEKDAY_LABELS = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

export const DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions";

export const DEEPINFRA_MODEL = "deepseek-ai/DeepSeek-V4.1-Flash";

export const DEEPINFRA_TIMEOUT_MS = 30_000;

export const CHAT_SYSTEM_PROMPT =
  "Bạn là trợ lý trả lời tin nhắn Zalo. Trả lời ngắn bằng tiếng Việt, giọng chat thân thiện. Không giải thích dài dòng và không nói rằng bạn là mô hình ngôn ngữ.";

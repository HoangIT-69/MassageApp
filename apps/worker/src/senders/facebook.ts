import { sendFacebookText, type ChannelSender } from "@zalo/core";

export function createFacebookSender(pageAccessToken: string): ChannelSender {
  return {
    channel: "facebook",
    async send(item) {
      // Ảnh chưa gửi được qua kênh này: chỉ phần chữ đi, attachmentPath bị bỏ.
      await sendFacebookText({
        pageAccessToken,
        psid: item.threadId,
        text: item.content,
      });
    },
  };
}

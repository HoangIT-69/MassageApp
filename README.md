# Chatbot Zalo

Ứng dụng chat Zalo cá nhân: giữ phiên đăng nhập, xem hội thoại trên điện thoại, và trả lời bằng AI khi công tắc của cuộc chat đang bật.

Ba process trong một pnpm workspace:

- `apps/web` — Next.js. SQLite, đăng nhập operator, API hội thoại.
- `apps/worker` — `zca-js`. Đăng nhập QR một lần, nghe tin, gửi tin đang chờ.
- `apps/mobile` — Expo. Danh sách chat, màn hình chat, công tắc AI.
- `packages/core` — database, hội thoại, client DeepInfra.

Công tắc AI theo từng cuộc chat, mặc định tắt. Tin gửi tay vẫn đi khi AI tắt. Chỉ tin văn bản được đưa cho model.

## Chuẩn bị

- Node.js và pnpm
- Khóa [DeepInfra](https://deepinfra.com/) cho model `deepseek-ai/DeepSeek-V4.1-Flash`
- Máy ảo Android hoặc điện thoại, nếu chạy app Expo

```bash
pnpm install
copy .env.example .env.local
```

Điền trong `.env.local`:

| Biến | Việc |
|---|---|
| `APP_PASSWORD` | Mật khẩu đăng nhập app |
| `DEEPINFRA_API_KEY` | Khóa gọi model |
| `DATABASE_PATH` | File SQLite |
| `ZALO_CREDENTIALS_PATH` | Cookie, imei, userAgent của phiên Zalo |
| `EXPO_PUBLIC_API_URL` | Máy ảo Android dùng `http://10.0.2.2:3000` |

Không commit `.env.local`, `data/`, hay file credentials.

## Chạy

Ba lệnh, mỗi lệnh một terminal, trong thư mục dự án:

```bash
pnpm dev:web
pnpm dev:worker
pnpm dev:mobile
```

Web lắng nghe `0.0.0.0:3000`. Worker in mã QR lần đầu. App hiện mã đó; quét bằng Zalo trên điện thoại thật. Lần sau worker dùng file credentials, không quét lại.

Đăng xuất trên màn danh sách đóng phiên và tạo mã QR mới.

Chỉ một listener web cho mỗi tài khoản. Mở Zalo Web hoặc Zalo PC cùng tài khoản thì listener bị ngắt.

Nếu `pnpm install` hoặc kết nối HTTPS lỗi chứng chỉ trên máy này, chạy với `NODE_OPTIONS=--use-system-ca`.

## Kiểm tra

```bash
pnpm test
pnpm typecheck
pnpm --filter @zalo/web lint
pnpm build
```

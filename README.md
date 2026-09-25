# Chatbot Zalo

Ứng dụng chat Zalo cá nhân: giữ phiên đăng nhập, xem hội thoại trên điện thoại, và trả lời bằng AI khi công tắc của cuộc chat đang bật.

Ba process trong một pnpm workspace:

- `apps/web` — Next.js. MySQL, đăng nhập operator, API hội thoại, admin quán.
- `apps/worker` — `zca-js`. Đăng nhập QR một lần, nghe tin, gửi tin đang chờ.
- `apps/mobile` — Expo. Danh sách chat, màn hình chat, công tắc AI.
- `packages/core` — database, hội thoại, client DeepInfra.

Công tắc AI theo từng cuộc chat, mặc định tắt. Trên danh sách có thêm công tắc AI tất cả. Tin gửi tay vẫn đi khi AI tắt. Chỉ tin văn bản được đưa cho model.

## Trong app

- Danh sách: kéo một dòng sang trái, hoặc nhấn giữ, rồi xóa cuộc trò chuyện. Tin nhắn và ngữ cảnh của phiên đó bị xóa. Đơn đã chốt và hồ sơ khách sửa tay được giữ.
- Chat: nút Phiên gồm những gì bot đã ghi, tóm tắt, xóa ngữ cảnh, bật tắt AI, và năm mốc chỉ đi tới — chào hỏi, tư vấn, lên đơn, đợi nhân viên xác nhận, chốt.
- Quản lý: hồ sơ quán, nhân viên, khách, phiên chat. Màn khách chỉ có tên, số điện thoại và lịch sử đơn.
- Tên khách không lấy từ tên nhân viên. Tên trên Zalo chỉ là gợi ý cho đến khi khách xác nhận.
- Ảnh nhân viên nằm trên MinIO. Ảnh đại diện Zalo được lấy thêm khi hồ sơ không trả avatar; nếu ảnh lỗi, app hiện chữ cái đầu.

## Chuẩn bị

- Node.js, pnpm và Docker (MySQL, MinIO)
- Khóa [DeepInfra](https://deepinfra.com/) cho model `deepseek-ai/DeepSeek-V4.1-Flash`
- Máy ảo Android hoặc điện thoại, nếu chạy app Expo

```bash
pnpm install
docker compose up -d
copy .env.example .env.local
```

Điền trong `.env.local`:

| Biến | Việc |
|---|---|
| `APP_PASSWORD` | Mật khẩu đăng nhập app |
| `DEEPINFRA_API_KEY` | Khóa gọi model |
| `DATABASE_URL` | Chuỗi kết nối MySQL |
| `ZALO_CREDENTIALS_PATH` | Cookie, imei, userAgent của phiên Zalo |
| `EXPO_PUBLIC_API_URL` | Máy ảo Android dùng `http://10.0.2.2:3000` |
| `MINIO_ENDPOINT` | Địa chỉ MinIO, dev `127.0.0.1:9000` |
| `MINIO_ACCESS_KEY` | Khóa truy cập bucket ảnh |
| `MINIO_SECRET_KEY` | Bí mật bucket ảnh |
| `MINIO_BUCKET` | Tên bucket, dev `zalo-photos` |
| `MINIO_USE_SSL` | `false` khi MinIO chạy local |

Không commit `.env.local`, `data/`, hay file credentials.

`docker compose up -d` chạy MySQL và MinIO. Image MinIO là `zalo-minio:local`, build từ `docker/minio`, vì image trên Docker Hub không còn tải được. Console MinIO ở `127.0.0.1:9001`. Tài khoản dev nằm trong `.env.example`.

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

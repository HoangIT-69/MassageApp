export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Zalo chatbot</h1>
      <p className="text-zinc-600">
        Ứng dụng chat chạy trên điện thoại. Máy chủ này cung cấp API cho danh sách hội thoại, mã QR
        và công tắc AI.
      </p>
      <a
        className="text-sm font-medium text-zinc-900 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        href="/admin/quan"
      >
        Mở admin quán
      </a>
    </main>
  );
}

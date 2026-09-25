"use client";

import { useEffect, useState } from "react";
import { adminFetch, buttonClass, inputClass, quietButtonClass } from "./client";

type Booking = {
  id: string;
  conversationId: string;
  serviceName: string;
  staffId: string | null;
  staffName: string;
  whenText: string;
  customerName: string;
  phone: string;
  status: string;
};

type StaffOption = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  cho_xac_nhan: "Chờ xác nhận",
  da_chot: "Đã chốt",
  tu_choi: "Từ chối",
  hoan_thanh: "Hoàn thành",
  huy: "Hủy",
};

export function BookingBoard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([
      adminFetch<{ bookings: Booking[] }>("/api/admin/bookings"),
      adminFetch<{ staff: StaffOption[] }>("/api/admin/staff"),
    ])
      .then(([bookingData, staffData]) => {
        setBookings(bookingData.bookings);
        setStaff(staffData.staff);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không tải được"));
  }, []);

  async function act(id: string, body: Record<string, unknown>) {
    setError("");
    try {
      const saved = await adminFetch<Booking>(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setBookings((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setMessage("Đã cập nhật đơn.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không cập nhật được");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Đơn đặt lịch</h2>
      {bookings.length === 0 ? <p className="text-sm text-zinc-600">Chưa có đơn. Bot tạo đơn khi khách đã nói đủ gói, giờ và tên hoặc số điện thoại.</p> : null}
      {bookings.map((booking) => (
        <article key={booking.id} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm font-medium">{STATUS_LABEL[booking.status] ?? booking.status}</p>
          <p className="text-sm">{booking.serviceName}</p>
          <p className="text-sm text-zinc-600">
            {booking.customerName || "Chưa có tên"} · {booking.phone || "Chưa có số"}
          </p>
          {booking.status === "cho_xac_nhan" ? (
            <>
              <label className="text-sm">
                Giờ
                <input
                  className={inputClass}
                  value={booking.whenText}
                  onChange={(event) =>
                    setBookings((current) =>
                      current.map((item) => (item.id === booking.id ? { ...item, whenText: event.target.value } : item)),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                Nhân viên
                <select
                  className={inputClass}
                  value={booking.staffId ?? ""}
                  onChange={(event) => {
                    const staffId = event.target.value || null;
                    const staffName = staff.find((person) => person.id === staffId)?.name ?? "";
                    setBookings((current) =>
                      current.map((item) => (item.id === booking.id ? { ...item, staffId, staffName } : item)),
                    );
                  }}
                >
                  <option value="">Chưa chọn</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button className={quietButtonClass} type="button" onClick={() => void act(booking.id, { whenText: booking.whenText, staffId: booking.staffId })}>
                  Lưu giờ
                </button>
                <button className={buttonClass} type="button" onClick={() => void act(booking.id, { action: "confirm" })}>
                  Chốt
                </button>
                <button className={quietButtonClass} type="button" onClick={() => void act(booking.id, { action: "reject" })}>
                  Từ chối
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm">
              {booking.whenText}
              {booking.staffName ? ` · ${booking.staffName}` : ""}
            </p>
          )}
          {booking.status === "da_chot" ? (
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} type="button" onClick={() => void act(booking.id, { action: "complete" })}>
                Hoàn thành
              </button>
              <button className={quietButtonClass} type="button" onClick={() => void act(booking.id, { action: "cancel" })}>
                Hủy
              </button>
            </div>
          ) : null}
        </article>
      ))}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { adminFetch, buttonClass, inputClass } from "./client";

type CustomerOrder = {
  id: string;
  serviceName: string;
  staffName: string;
  whenText: string;
  status: string;
};

type Customer = {
  conversationId: string;
  zaloName: string;
  displayName: string;
  phone: string;
  orders: CustomerOrder[];
};

const STATUS_LABEL: Record<string, string> = {
  cho_xac_nhan: "Chờ xác nhận",
  da_chot: "Đã chốt",
  tu_choi: "Từ chối",
  hoan_thanh: "Hoàn thành",
  huy: "Hủy",
};

export function CustomerBoard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void adminFetch<{ customers: Customer[] }>("/api/admin/customers")
      .then((data) => setCustomers(data.customers))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không tải được"));
  }, []);

  function patch(id: string, next: Partial<Customer>) {
    setCustomers((current) => current.map((item) => (item.conversationId === id ? { ...item, ...next } : item)));
  }

  async function save(customer: Customer) {
    setError("");
    try {
      await adminFetch(`/api/admin/customers/${customer.conversationId}`, {
        method: "PUT",
        body: JSON.stringify({
          displayName: customer.displayName,
          phone: customer.phone,
        }),
      });
      setMessage("Đã lưu tên và số điện thoại.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Khách</h2>
      {customers.length === 0 ? <p className="text-sm text-zinc-600">Chưa có cuộc chat với khách.</p> : null}
      {customers.map((customer) => (
        <form
          key={customer.conversationId}
          className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save(customer);
          }}
        >
          <p className="text-sm text-zinc-500">Tên Zalo: {customer.zaloName}</p>
          <label className="text-sm">
            Tên khách
            <input className={inputClass} value={customer.displayName} onChange={(event) => patch(customer.conversationId, { displayName: event.target.value })} />
          </label>
          <label className="text-sm">
            Số điện thoại
            <input className={inputClass} value={customer.phone} onChange={(event) => patch(customer.conversationId, { phone: event.target.value })} />
          </label>
          <div className="text-sm text-zinc-700">
            <p className="font-medium">Lịch sử đơn</p>
            {customer.orders.length === 0 ? <p>Chưa có đơn.</p> : null}
            <ul className="list-disc pl-5">
              {customer.orders.map((order) => (
                <li key={order.id}>
                  {order.serviceName} · {order.staffName || "—"} · {order.whenText} · {STATUS_LABEL[order.status] ?? order.status}
                </li>
              ))}
            </ul>
          </div>
          <button className={buttonClass} type="submit">Lưu khách</button>
        </form>
      ))}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

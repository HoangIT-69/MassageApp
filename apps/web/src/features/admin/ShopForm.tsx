"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { adminFetch, buttonClass, inputClass, quietButtonClass } from "./client";

const DAYS = [
  ["mon", "Thứ 2"],
  ["tue", "Thứ 3"],
  ["wed", "Thứ 4"],
  ["thu", "Thứ 5"],
  ["fri", "Thứ 6"],
  ["sat", "Thứ 7"],
  ["sun", "Chủ nhật"],
] as const;

type Hours = Record<(typeof DAYS)[number][0], string>;

type Profile = {
  name: string;
  tagline: string;
  address: string;
  directions: string;
  hotline: string;
  hours: Hours;
  intro: string;
  amenities: string;
  policyBooking: string;
  policyCancel: string;
  policyLate: string;
  policyNewGuest: string;
  voice: string;
  forbidden: string;
};

type ServiceRow = {
  id: string;
  name: string;
  durationMinutes: number;
  priceVnd: number;
  description: string;
  sortOrder: number;
  active: boolean;
};

const emptyHours = (): Hours => ({ mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" });

function emptyProfile(): Profile {
  return {
    name: "",
    tagline: "",
    address: "",
    directions: "",
    hotline: "",
    hours: emptyHours(),
    intro: "",
    amenities: "",
    policyBooking: "",
    policyCancel: "",
    policyLate: "",
    policyNewGuest: "",
    voice: "",
    forbidden: "",
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700">
      {label}
      {children}
    </label>
  );
}

export function ShopForm() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [draft, setDraft] = useState({ name: "", durationMinutes: 60, priceVnd: 0, description: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminFetch<{ profile: Profile | null; services: ServiceRow[] }>("/api/admin/shop")
      .then((data) => {
        if (data.profile) setProfile({ ...data.profile, hours: { ...emptyHours(), ...data.profile.hours } });
        setServices(data.services);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không tải được"));
  }, []);

  function setText<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await adminFetch("/api/admin/shop", { method: "PUT", body: JSON.stringify(profile) });
      setMessage("Đã lưu hồ sơ quán.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được");
    }
  }

  async function addService(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const created = await adminFetch<ServiceRow>("/api/admin/services", {
        method: "POST",
        body: JSON.stringify({ ...draft, sortOrder: services.length, active: true }),
      });
      setServices((current) => [...current, created]);
      setDraft({ name: "", durationMinutes: 60, priceVnd: 0, description: "" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thêm được dịch vụ");
    }
  }

  async function saveService(row: ServiceRow) {
    setError("");
    try {
      const saved = await adminFetch<ServiceRow>(`/api/admin/services/${row.id}`, {
        method: "PUT",
        body: JSON.stringify(row),
      });
      setServices((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setMessage("Đã lưu dịch vụ.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được dịch vụ");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form className="grid gap-4" onSubmit={saveProfile}>
        <h2 className="text-xl font-semibold">Hồ sơ quán</h2>
        <Field label="Tên quán">
          <input className={inputClass} value={profile.name} onChange={(event) => setText("name", event.target.value)} required />
        </Field>
        <Field label="Câu giới thiệu một dòng">
          <input className={inputClass} value={profile.tagline} onChange={(event) => setText("tagline", event.target.value)} />
        </Field>
        <Field label="Địa chỉ">
          <input className={inputClass} value={profile.address} onChange={(event) => setText("address", event.target.value)} />
        </Field>
        <Field label="Cách đi">
          <textarea className={inputClass} rows={2} value={profile.directions} onChange={(event) => setText("directions", event.target.value)} />
        </Field>
        <Field label="Hotline">
          <input className={inputClass} value={profile.hotline} onChange={(event) => setText("hotline", event.target.value)} />
        </Field>
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm text-zinc-700">Giờ mở cửa theo thứ</legend>
          {DAYS.map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className={inputClass}
                placeholder="09:00-21:00"
                value={profile.hours[key]}
                onChange={(event) => setProfile((current) => ({ ...current, hours: { ...current.hours, [key]: event.target.value } }))}
              />
            </Field>
          ))}
        </fieldset>
        <Field label="Giới thiệu quán">
          <textarea className={inputClass} rows={3} value={profile.intro} onChange={(event) => setText("intro", event.target.value)} />
        </Field>
        <Field label="Tiện nghi">
          <textarea className={inputClass} rows={2} value={profile.amenities} onChange={(event) => setText("amenities", event.target.value)} />
        </Field>
        <Field label="Đặt trước">
          <textarea className={inputClass} rows={2} value={profile.policyBooking} onChange={(event) => setText("policyBooking", event.target.value)} />
        </Field>
        <Field label="Hủy lịch">
          <textarea className={inputClass} rows={2} value={profile.policyCancel} onChange={(event) => setText("policyCancel", event.target.value)} />
        </Field>
        <Field label="Đến trễ">
          <textarea className={inputClass} rows={2} value={profile.policyLate} onChange={(event) => setText("policyLate", event.target.value)} />
        </Field>
        <Field label="Khách mới">
          <textarea className={inputClass} rows={2} value={profile.policyNewGuest} onChange={(event) => setText("policyNewGuest", event.target.value)} />
        </Field>
        <Field label="Xưng hô của bot">
          <textarea className={inputClass} rows={2} value={profile.voice} onChange={(event) => setText("voice", event.target.value)} />
        </Field>
        <Field label="Điều bot không được hứa">
          <textarea className={inputClass} rows={2} value={profile.forbidden} onChange={(event) => setText("forbidden", event.target.value)} />
        </Field>
        <button className={buttonClass} type="submit">Lưu hồ sơ</button>
      </form>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Dịch vụ</h2>
        {services.map((row) => (
          <form
            key={row.id}
            className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void saveService(row);
            }}
          >
            <Field label="Tên">
              <input className={inputClass} value={row.name} onChange={(event) => setServices((current) => current.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item))} />
            </Field>
            <Field label="Phút">
              <input className={inputClass} type="number" value={row.durationMinutes} onChange={(event) => setServices((current) => current.map((item) => item.id === row.id ? { ...item, durationMinutes: Number(event.target.value) } : item))} />
            </Field>
            <Field label="Giá (đồng)">
              <input className={inputClass} type="number" value={row.priceVnd} onChange={(event) => setServices((current) => current.map((item) => item.id === row.id ? { ...item, priceVnd: Number(event.target.value) } : item))} />
            </Field>
            <Field label="Mô tả">
              <input className={inputClass} value={row.description} onChange={(event) => setServices((current) => current.map((item) => item.id === row.id ? { ...item, description: event.target.value } : item))} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={row.active} onChange={(event) => setServices((current) => current.map((item) => item.id === row.id ? { ...item, active: event.target.checked } : item))} />
              Đang bán
            </label>
            <button className={quietButtonClass} type="submit">Lưu dịch vụ</button>
          </form>
        ))}
        <form className="grid gap-3 rounded-lg border border-dashed border-zinc-300 p-4 sm:grid-cols-2" onSubmit={addService}>
          <h3 className="sm:col-span-2 text-sm font-medium">Thêm dịch vụ</h3>
          <Field label="Tên">
            <input className={inputClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
          </Field>
          <Field label="Phút">
            <input className={inputClass} type="number" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: Number(event.target.value) })} />
          </Field>
          <Field label="Giá (đồng)">
            <input className={inputClass} type="number" value={draft.priceVnd} onChange={(event) => setDraft({ ...draft, priceVnd: Number(event.target.value) })} />
          </Field>
          <Field label="Mô tả">
            <input className={inputClass} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </Field>
          <button className={buttonClass} type="submit">Thêm</button>
        </form>
      </section>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

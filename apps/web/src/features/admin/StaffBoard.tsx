"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminFetch, buttonClass, inputClass, quietButtonClass, readToken } from "./client";

type Shift = { weekday: number; startTime: string; endTime: string };

type StaffRow = {
  id: string;
  name: string;
  gender: "nam" | "nu" | "khac";
  specialties: string;
  yearsExperience: number;
  bio: string;
  active: boolean;
  sortOrder: number;
  photoPath: string | null;
  shifts: Shift[];
};

const DAY_LABELS = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

function blankShifts(): Shift[] {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startTime: "", endTime: "" }));
}

function withShifts(row: StaffRow): StaffRow {
  const filled = blankShifts().map((shift) => row.shifts.find((item) => item.weekday === shift.weekday) ?? shift);
  return { ...row, shifts: filled };
}

function payload(row: StaffRow) {
  return {
    ...row,
    shifts: row.shifts.filter((shift) => shift.startTime && shift.endTime),
  };
}

export function StaffBoard() {
  const [people, setPeople] = useState<StaffRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void adminFetch<{ staff: StaffRow[] }>("/api/admin/staff")
      .then((data) => setPeople(data.staff.map(withShifts)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không tải được"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    for (const person of people) {
      if (!person.photoPath || photos[person.id]) continue;
      void fetch(`/api/admin/staff/${person.id}/photo`, { headers: { Authorization: `Bearer ${readToken()}` } })
        .then(async (response) => {
          if (!response.ok) return;
          const url = URL.createObjectURL(await response.blob());
          if (!cancelled) setPhotos((current) => ({ ...current, [person.id]: url }));
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [people, photos]);

  function patch(id: string, next: Partial<StaffRow>) {
    setPeople((current) => current.map((person) => (person.id === id ? { ...person, ...next } : person)));
  }

  async function save(person: StaffRow) {
    setError("");
    try {
      await adminFetch(`/api/admin/staff/${person.id}`, { method: "PUT", body: JSON.stringify(payload(person)) });
      setMessage(`Đã lưu ${person.name}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được");
    }
  }

  async function upload(person: StaffRow, file: File) {
    const body = new FormData();
    body.set("file", file);
    setError("");
    try {
      await adminFetch(`/api/admin/staff/${person.id}/photo`, { method: "POST", body });
      const preview = URL.createObjectURL(file);
      setPhotos((current) => ({ ...current, [person.id]: preview }));
      patch(person.id, { photoPath: "uploaded" });
      setMessage(`Đã tải ảnh ${person.name}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải ảnh được");
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const created = await adminFetch<StaffRow>("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          gender: String(form.get("gender") ?? "nu"),
          specialties: String(form.get("specialties") ?? ""),
          yearsExperience: Number(form.get("years") ?? 0),
          bio: String(form.get("bio") ?? ""),
          active: true,
          sortOrder: people.length,
          shifts: [],
        }),
      });
      setPeople((current) => [...current, withShifts({ ...created, shifts: [] })]);
      event.currentTarget.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thêm được");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Nhân viên</h2>
      {people.map((person) => (
        <form
          key={person.id}
          className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save(person);
          }}
        >
          <div className="flex items-center gap-3">
            {photos[person.id] ? (
              // Blob URL from the authenticated photo route. next/image cannot attach the bearer token.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[person.id]} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-sm text-zinc-500">Ảnh</div>
            )}
            <label className="text-sm text-zinc-700">
              Ảnh đại diện
              <input
                className="mt-1 block text-sm"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={`Ảnh ${person.name}`}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(person, file);
                }}
              />
            </label>
          </div>
          <label className="text-sm">
            Tên
            <input className={inputClass} value={person.name} onChange={(event) => patch(person.id, { name: event.target.value })} />
          </label>
          <label className="text-sm">
            Giới tính
            <select className={inputClass} value={person.gender} onChange={(event) => patch(person.id, { gender: event.target.value as StaffRow["gender"] })}>
              <option value="nu">Nữ</option>
              <option value="nam">Nam</option>
              <option value="khac">Khác</option>
            </select>
          </label>
          <label className="text-sm">
            Chuyên môn
            <input className={inputClass} value={person.specialties} onChange={(event) => patch(person.id, { specialties: event.target.value })} />
          </label>
          <label className="text-sm">
            Số năm kinh nghiệm
            <input className={inputClass} type="number" value={person.yearsExperience} onChange={(event) => patch(person.id, { yearsExperience: Number(event.target.value) })} />
          </label>
          <label className="text-sm">
            Giới thiệu
            <textarea className={inputClass} rows={2} value={person.bio} onChange={(event) => patch(person.id, { bio: event.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={person.active} onChange={(event) => patch(person.id, { active: event.target.checked })} />
            Đang nhận khách
          </label>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="text-sm">Ca trong tuần</legend>
            {person.shifts.map((shift) => (
              <div key={shift.weekday} className="grid grid-cols-[5rem_1fr_1fr] items-center gap-2 text-sm">
                <span>{DAY_LABELS[shift.weekday]}</span>
                <input className={inputClass} aria-label={`${DAY_LABELS[shift.weekday]} bắt đầu`} placeholder="09:00" value={shift.startTime} onChange={(event) => patch(person.id, { shifts: person.shifts.map((item) => item.weekday === shift.weekday ? { ...item, startTime: event.target.value } : item) })} />
                <input className={inputClass} aria-label={`${DAY_LABELS[shift.weekday]} kết thúc`} placeholder="15:00" value={shift.endTime} onChange={(event) => patch(person.id, { shifts: person.shifts.map((item) => item.weekday === shift.weekday ? { ...item, endTime: event.target.value } : item) })} />
              </div>
            ))}
          </fieldset>
          <button className={buttonClass} type="submit">Lưu nhân viên</button>
        </form>
      ))}
      <form className="grid gap-3 rounded-lg border border-dashed border-zinc-300 p-4" onSubmit={create}>
        <h3 className="font-medium">Thêm nhân viên</h3>
        <label className="text-sm">Tên<input className={inputClass} name="name" required /></label>
        <label className="text-sm">
          Giới tính
          <select className={inputClass} name="gender" defaultValue="nu">
            <option value="nu">Nữ</option>
            <option value="nam">Nam</option>
            <option value="khac">Khác</option>
          </select>
        </label>
        <label className="text-sm">Chuyên môn<input className={inputClass} name="specialties" /></label>
        <label className="text-sm">Số năm<input className={inputClass} name="years" type="number" defaultValue={0} /></label>
        <label className="text-sm">Giới thiệu<textarea className={inputClass} name="bio" rows={2} /></label>
        <button className={quietButtonClass} type="submit">Thêm</button>
      </form>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

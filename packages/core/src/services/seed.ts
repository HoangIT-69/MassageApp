import type { AppDatabase } from "../db/client";
import { getShopProfile, insertService, insertStaff, saveShopProfile } from "../repositories/catalog";
import type { ShiftInput, ShopHours } from "../shop-types";

const OPEN_HOURS: ShopHours = {
  mon: "09:00-21:00",
  tue: "09:00-21:00",
  wed: "09:00-21:00",
  thu: "09:00-21:00",
  fri: "09:00-21:00",
  sat: "09:00-21:00",
  sun: "09:00-21:00",
};

function days(weekdays: number[], startTime: string, endTime: string): ShiftInput[] {
  return weekdays.map((weekday) => ({ weekday, startTime, endTime }));
}

export async function ensureShopSeed(db: AppDatabase, vendorId: string): Promise<void> {
  const existing = await getShopProfile(db, vendorId);
  if (existing) return;
  await saveShopProfile(db, vendorId, {
    name: "Sen Vàng Massage",
    tagline: "Phòng riêng, dầu ấm, đặt lịch nhanh.",
    address: "12 ngõ 5 Trần Duy Hưng, Cầu Giấy, Hà Nội",
    directions: "Đi bộ 3 phút từ ngã tư Trần Duy Hưng. Có chỗ để xe máy trong ngõ.",
    hotline: "0901000000",
    hours: OPEN_HOURS,
    intro: "Quán massage body và chân, phòng riêng, khăn và dầu thơm. Phù hợp khách thư giãn sau giờ làm.",
    amenities: "Phòng riêng, tắm nước nóng, gửi xe, khăn sạch, dầu thơm, trà.",
    policyBooking: "Nên nhắn trước 30 phút. Cuối tuần nên đặt trước vài giờ.",
    policyCancel: "Báo hủy trước 1 giờ thì giữ chỗ cho lần sau. Hủy sát giờ có thể mất suất.",
    policyLate: "Đến trễ quá 15 phút, ca có thể được rút ngắn để kịp khách sau.",
    policyNewGuest: "Khách mới nói rõ lực mạnh hay nhẹ, và muốn kỹ thuật viên nam hay nữ.",
    voice: "Xưng mình, gọi khách là bạn. Câu ngắn, thân thiện, không văn bản dài.",
    forbidden: "Không báo giá ngoài menu. Không chẩn đoán bệnh. Không hứa kỹ thuật viên nếu ca đã kín. Không nói lịch đã chốt khi chưa có người xác nhận.",
  });
  const menu = [
    ["Massage body 60 phút", 60, 350000, "Xoa bóp toàn thân, dầu ấm."],
    ["Massage body 90 phút", 90, 480000, "Body dài hơn, tập trung vai gáy."],
    ["Massage chân 45 phút", 45, 250000, "Bấm huyệt lòng bàn chân và bắp chân."],
    ["Đá nóng 75 phút", 75, 520000, "Đá bazan trên lưng và chân."],
    ["Massage Thái 60 phút", 60, 400000, "Kéo giãn và ấn đường."],
    ["Massage cặp đôi 60 phút", 60, 700000, "Hai người, một phòng."],
  ] as const;
  for (const [index, item] of menu.entries()) {
    await insertService(db, vendorId, {
      name: item[0],
      durationMinutes: item[1],
      priceVnd: item[2],
      description: item[3],
      sortOrder: index,
      active: true,
    });
  }
  const people = [
    ["Lan", "nu", "Body oil, thư giãn", 6, "Nhẹ tay, hợp khách mới.", days([1, 2, 3, 4, 5], "09:00", "15:00")],
    ["Minh", "nam", "Chân, shiatsu", 8, "Lực vừa, bấm huyệt rõ.", days([1, 2, 3, 4, 5, 6], "13:00", "21:00")],
    ["Hà", "nu", "Massage Thái", 5, "Kéo giãn chậm, nói chuyện ít.", days([2, 3, 4, 5, 6, 7], "15:00", "22:00")],
    ["Khoa", "nam", "Đá nóng, thể thao", 7, "Hợp khách đau mỏi sau tập.", days([6, 7], "09:00", "21:00")],
    ["Trang", "nu", "Cặp đôi, hương liệu", 4, "Phòng đôi và tinh dầu dịu.", days([1, 3, 5], "10:00", "18:00")],
  ] as const;
  for (const [index, person] of people.entries()) {
    await insertStaff(db, vendorId, {
      name: person[0],
      gender: person[1],
      specialties: person[2],
      yearsExperience: person[3],
      bio: person[4],
      active: true,
      sortOrder: index,
      shifts: [...person[5]],
    });
  }
}

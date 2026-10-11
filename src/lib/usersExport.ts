import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { UserWithStats, isVip, isOnline } from "./usersApi";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("uz-UZ") : "—";

function rows(users: UserWithStats[]) {
  return users.map((u, i) => ({
    "#": i + 1,
    Ism: u.display_name || "Noma'lum",
    Telefon: u.phone || "—",
    ID: u.user_id,
    "Ro'yxatdan": fmtDate(u.created_at),
    "Oxirgi kirish": fmtDate(u.last_login_at),
    "Kirishlar": u.logins_count,
    "Buyurtmalar": u.orders_count,
    "Xarid summasi": u.total_spent,
    Holat: u.is_blocked ? "Bloklangan" : isOnline(u) ? "Online" : "Aktiv",
    VIP: isVip(u) ? "Ha" : "Yo'q",
    Shubhali: u.is_suspicious ? "Ha" : "Yo'q",
  }));
}

export function exportUsersExcel(users: UserWithStats[]) {
  const ws = XLSX.utils.json_to_sheet(rows(users));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Foydalanuvchilar");
  XLSX.writeFile(wb, `foydalanuvchilar-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportUsersPDF(users: UserWithStats[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text("Avto Comfort Buxara — Foydalanuvchilar", 14, 14);
  doc.setFontSize(9);
  doc.text(`Sana: ${new Date().toLocaleString("uz-UZ")}  |  Jami: ${users.length}`, 14, 20);

  const headers = ["#", "Ism", "Telefon", "Ro'yxatdan", "Oxirgi kirish", "Buyurtma", "Xarid", "Holat"];
  const cols = [14, 24, 74, 110, 145, 190, 215, 250];
  let y = 30;
  doc.setFontSize(8);
  headers.forEach((h, i) => doc.text(h, cols[i], y));
  y += 4;
  doc.line(14, y, 283, y);
  y += 5;

  users.forEach((u, i) => {
    if (y > 195) { doc.addPage(); y = 20; }
    const vals = [
      String(i + 1),
      (u.display_name || "Noma'lum").slice(0, 22),
      u.phone || "—",
      fmtDate(u.created_at).slice(0, 16),
      fmtDate(u.last_login_at).slice(0, 16),
      String(u.orders_count),
      new Intl.NumberFormat("uz-UZ").format(u.total_spent),
      u.is_blocked ? "Blok" : isOnline(u) ? "Online" : "Aktiv",
    ];
    vals.forEach((v, c) => doc.text(v, cols[c], y));
    y += 6;
  });

  doc.save(`foydalanuvchilar-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Lightweight user-agent parsing + login history logging helpers.

export function parseUA(ua: string) {
  const s = ua || "";
  let os = "Noma'lum";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Mac OS X/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s)) os = "Linux";

  let browser = "Noma'lum";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = "Chrome";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/Safari\//i.test(s)) browser = "Safari";
  else if (/Telegram/i.test(s)) browser = "Telegram";

  let device = "Kompyuter";
  if (/iPad|Tablet/i.test(s)) device = "Planshet";
  else if (/Mobi|Android|iPhone/i.test(s)) device = "Telefon";

  return { os, browser, device };
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip");
}

// deno-lint-ignore no-explicit-any
export async function logLogin(admin: any, req: Request, params: {
  user_id?: string | null;
  phone?: string | null;
  method: string;
  success: boolean;
}) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    const { os, browser, device } = parseUA(ua);
    await admin.from("login_history").insert({
      user_id: params.user_id ?? null,
      phone: params.phone ?? null,
      ip_address: clientIp(req),
      user_agent: ua.slice(0, 500),
      device,
      browser,
      os,
      method: params.method,
      success: params.success,
    });
  } catch (e) {
    console.warn("login_history insert failed", e);
  }
}

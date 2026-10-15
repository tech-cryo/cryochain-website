// Time zone helpers: turn "2026-11-20 09:00" in a chosen time zone into an exact moment.
export const DEFAULT_TZ = "Africa/Accra";

export function validZone(tz, fallback = DEFAULT_TZ) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch { return fallback; }
}

// how far ahead of UTC the zone is at a given moment, in milliseconds (handles daylight saving)
function offsetMs(utcMs, tz) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}

// value: "YYYY-MM-DD HH:mm" clock time in tz, or an older full ISO time with Z or an offset, or a Date
export function toMoment(value, tz) {
  if (value instanceof Date) return value;
  const s = String(value || "").trim();
  if (/T.*(Z|[+-]\d{2}:?\d{2})$/i.test(s)) return new Date(s);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return new Date(s);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  let utc = wall - offsetMs(wall, tz);
  utc = wall - offsetMs(utc, tz);   // second pass settles the hour around daylight saving changes
  return new Date(utc);
}

export function showDate(d, tz) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: tz });
}

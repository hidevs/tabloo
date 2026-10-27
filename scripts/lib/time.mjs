import assert from 'node:assert/strict';

const TEHRAN_OFFSET_MIN = 210; // Iran has had no DST since 2022
const pad = (n) => String(n).padStart(2, '0');

const jalaliFmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
});

const tehranParts = (date) => {
  const d = new Date(date.getTime() + TEHRAN_OFFSET_MIN * 60000);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds() };
};

export function jalaliDate(date) {
  const p = Object.fromEntries(jalaliFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}/${p.month}/${p.day}`;
}

export function tehranDate(date) {
  const t = tehranParts(date);
  return `${t.y}-${pad(t.mo)}-${pad(t.d)}`;
}

export function tehranIso(date) {
  const t = tehranParts(date);
  return `${tehranDate(date)}T${pad(t.h)}:${pad(t.mi)}:${pad(t.s)}+03:30`;
}

export function jalaliDateTime(date) {
  const t = tehranParts(date);
  return `${jalaliDate(date)} ${pad(t.h)}:${pad(t.mi)}:${pad(t.s)}`;
}

// Midnight of the Tehran calendar day, as UTC Date (matches history `t`).
export function tehranDayStart(date) {
  const t = tehranParts(date);
  return new Date(Date.UTC(t.y, t.mo - 1, t.d) - TEHRAN_OFFSET_MIN * 60000);
}

// "HH:MM:SS" (Tehran wall clock, Persian or Latin digits) -> UTC Date on the most recent such time not after `now`.
export function timeOfDayToUtc(text, now = new Date()) {
  const latin = text.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
  const m = latin.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const day = tehranDayStart(now).getTime();
  let ms = day + ((+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0))) * 1000 - 0;
  if (ms > now.getTime() + 60000) ms -= 86400000;
  return new Date(ms);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const d = new Date('2026-10-27T09:00:02.333Z');
  assert.equal(jalaliDate(d), '1405/08/05');
  assert.equal(jalaliDateTime(d), '1405/08/05 12:30:02');
  assert.equal(tehranIso(d), '2026-10-27T12:30:02+03:30');
  assert.equal(tehranDayStart(d).toISOString(), '2026-10-26T20:30:00.000Z');
  assert.equal(timeOfDayToUtc('۱۲:۱۰:۰۰', d).toISOString(), '2026-10-27T08:40:00.000Z');
  assert.equal(timeOfDayToUtc('23:00:00', d).toISOString(), '2026-10-26T19:30:00.000Z');
  console.log('time.mjs ok');
}

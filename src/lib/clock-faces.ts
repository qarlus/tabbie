import type { ClockFaceId } from "./types";

const HOUR_WORDS = [
  "twelve",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

/** Compact binary HH:MM groups (6 bits each). */
export function formatBinaryClock(date: Date, clock24: boolean): string {
  let h = date.getHours();
  const m = date.getMinutes();
  if (!clock24) {
    h = h % 12;
    if (h === 0) h = 12;
  }
  const pad = (n: number, bits: number) => n.toString(2).padStart(bits, "0");
  const hBits = clock24 ? pad(h, 5) : pad(h, 4);
  const mBits = pad(m, 6);
  return `${hBits}:${mBits}`;
}

/** English literary time phrase. */
export function formatLiteraryClock(date: Date, clock24: boolean): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const isPm = h >= 12;
  if (!clock24) {
    h = h % 12;
    if (h === 0) h = 12;
  }
  const hourWord = HOUR_WORDS[h % 12] ?? String(h);

  if (m === 0) return `${hourWord} o'clock`;
  if (m === 15) return `quarter past ${hourWord}`;
  if (m === 30) return `half past ${hourWord}`;
  if (m === 45) {
    const next = HOUR_WORDS[(h + 1) % 12] ?? hourWord;
    return `quarter to ${next}`;
  }
  if (m < 30) return `${m} past ${hourWord}`;
  const next = HOUR_WORDS[(h + 1) % 12] ?? hourWord;
  return `${60 - m} to ${next}${!clock24 && isPm ? " pm" : !clock24 ? " am" : ""}`;
}

export function clockHandAngles(date: Date): { hour: number; minute: number } {
  const h = date.getHours() % 12;
  const m = date.getMinutes();
  const s = date.getSeconds();
  const minute = (m + s / 60) * 6;
  const hour = (h + m / 60 + s / 3600) * 30;
  return { hour, minute };
}

export function clockFaceLabel(face: ClockFaceId): string {
  switch (face) {
    case "analog":
      return "Analog";
    case "binary":
      return "Binary";
    case "literary":
      return "Literary";
    default:
      return "Digital";
  }
}

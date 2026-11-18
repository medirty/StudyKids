// Time maths and English phrasing, ported from the tick-tock-clock prototype.
// "total" is minutes on a 12-hour cycle: 0 = 12:00, 195 = 3:15.

export type Zone = 'oclock' | 'past' | 'to';

export function hourMinute(total: number): { hour12: number; minute: number; nextHour12: number; normalized: number } {
  const normalized = ((Math.round(total) % 720) + 720) % 720;
  const rawHour = Math.floor(normalized / 60);
  const hour12 = rawHour === 0 ? 12 : rawHour;
  const minute = normalized % 60;
  const nextHour12 = (hour12 % 12) + 1;
  return { hour12, minute, nextHour12, normalized };
}

export function spokenTime(total: number, useQuarter = false): { phrase: string; hint: string; zone: Zone } {
  const { hour12, minute, nextHour12 } = hourMinute(total);
  if (minute === 0) {
    return {
      phrase: `${hour12} o'clock`,
      hint: 'Right on the hour! Big blue hand points straight up to 12.',
      zone: 'oclock',
    };
  }
  if (minute === 15) {
    return {
      phrase: useQuarter ? `quarter past ${hour12}` : `15 past ${hour12}`,
      hint: `15 minutes AFTER ${hour12} o'clock (right side of the clock).`,
      zone: 'past',
    };
  }
  if (minute === 30) {
    return {
      phrase: `half past ${hour12}`,
      hint: `Halfway around the clock after ${hour12} o'clock!`,
      zone: 'past',
    };
  }
  if (minute === 45) {
    return {
      phrase: useQuarter ? `quarter to ${nextHour12}` : `15 to ${nextHour12}`,
      hint: `15 minutes BEFORE ${nextHour12} o'clock (left side of the clock).`,
      zone: 'to',
    };
  }
  if (minute < 30) {
    const minWord = minute === 1 ? '1 minute' : `${minute}`;
    return {
      phrase: `${minWord} past ${hour12}`,
      hint: `${minute} minute${minute === 1 ? '' : 's'} AFTER ${hour12} o'clock.`,
      zone: 'past',
    };
  }
  const toNext = 60 - minute;
  const minWord = toNext === 1 ? '1 minute' : `${toNext}`;
  return {
    phrase: `${minWord} to ${nextHour12}`,
    hint: `${toNext} minute${toNext === 1 ? '' : 's'} BEFORE ${nextHour12} o'clock.`,
    zone: 'to',
  };
}

export function digitalTime(total: number): string {
  const { hour12, minute } = hourMinute(total);
  return `${hour12}:${minute.toString().padStart(2, '0')}`;
}

/** Degrees clockwise from 12 o'clock, 0..360. dx/dy are screen offsets from the centre. */
export function angleFromPointer(dx: number, dy: number): number {
  let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (deg < 0) deg += 360;
  return deg;
}

/** Minute (0..59) under an angle; snap in minutes (1 = none). */
export function minuteFromAngle(angle: number, snap: number): number {
  let minute = Math.round(angle / 6) % 60;
  if (snap > 1) minute = (Math.round(minute / snap) * snap) % 60;
  return minute;
}

/** New total after the minute hand moves to newMinute; crossing 12 advances or rewinds the hour. */
export function totalFromMinuteDrag(prevTotal: number, newMinute: number): number {
  const prevMinute = ((Math.round(prevTotal) % 60) + 60) % 60;
  let hourBlock = Math.floor(hourMinute(prevTotal).normalized / 60);
  const diff = newMinute - prevMinute;
  if (diff < -30) hourBlock = (hourBlock + 1) % 12;
  else if (diff > 30) hourBlock = (hourBlock - 1 + 12) % 12;
  return hourBlock * 60 + newMinute;
}

/** Total minutes (0..719) for the hour hand at an angle (0.5 degrees per minute). */
export function totalFromHourDrag(angle: number, snap: number): number {
  let raw = Math.round(angle * 2) % 720;
  if (snap > 1) raw = (Math.round(raw / snap) * snap) % 720;
  return raw;
}

/** True when two totals are within toleranceMin of each other on the 12-hour cycle. */
export function sameTime(a: number, b: number, toleranceMin = 1): boolean {
  const d = Math.abs(hourMinute(a).normalized - hourMinute(b).normalized);
  return Math.min(d, 720 - d) <= toleranceMin;
}

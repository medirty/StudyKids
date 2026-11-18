import { describe, it, expect } from 'vitest';
import {
  hourMinute, spokenTime, digitalTime, angleFromPointer, minuteFromAngle,
  totalFromMinuteDrag, totalFromHourDrag, sameTime,
} from '../../../src/toys/math/clock/time';

describe('spokenTime', () => {
  it('phrases quarters', () => {
    expect(spokenTime(195)).toMatchObject({ phrase: '15 past 3', zone: 'past' });
    expect(spokenTime(195, true).phrase).toBe('quarter past 3');
    expect(spokenTime(225)).toMatchObject({ phrase: '15 to 4', zone: 'to' });
    expect(spokenTime(225, true).phrase).toBe('quarter to 4');
  });
  it('phrases other times', () => {
    expect(spokenTime(0)).toMatchObject({ phrase: "12 o'clock", zone: 'oclock' });
    expect(spokenTime(210).phrase).toBe('half past 3');
    expect(spokenTime(181).phrase).toBe('1 minute past 3');
    expect(spokenTime(239).phrase).toBe('1 minute to 4');
    expect(spokenTime(200).phrase).toBe('20 past 3');
    expect(spokenTime(700).phrase).toBe('20 to 12');
  });
  it('keeps prototype hints', () => {
    expect(spokenTime(0).hint).toBe('Right on the hour! Big blue hand points straight up to 12.');
    expect(spokenTime(195).hint).toBe("15 minutes AFTER 3 o'clock (right side of the clock).");
    expect(spokenTime(181).hint).toBe("1 minute AFTER 3 o'clock.");
    expect(spokenTime(200).hint).toBe("20 minutes AFTER 3 o'clock.");
    expect(spokenTime(239).hint).toBe("1 minute BEFORE 4 o'clock.");
  });
});

describe('digital / hourMinute', () => {
  it('formats', () => {
    expect(digitalTime(65)).toBe('1:05');
    expect(digitalTime(0)).toBe('12:00');
    expect(hourMinute(-5).normalized).toBe(715);
    expect(hourMinute(719)).toMatchObject({ hour12: 11, minute: 59, nextHour12: 12 });
  });
});

describe('angles', () => {
  it('angleFromPointer', () => {
    expect(angleFromPointer(0, -1)).toBe(0);
    expect(angleFromPointer(1, 0)).toBe(90);
    expect(angleFromPointer(0, 1)).toBe(180);
    expect(angleFromPointer(-1, 0)).toBe(270);
  });
  it('minuteFromAngle', () => {
    expect(minuteFromAngle(93, 5)).toBe(15);
    expect(minuteFromAngle(357, 1)).toBe(0);
    expect(minuteFromAngle(100, 30)).toBe(30);
  });
  it('totalFromMinuteDrag crosses 12', () => {
    expect(totalFromMinuteDrag(3 * 60 + 58, 2)).toBe(4 * 60 + 2);
    expect(totalFromMinuteDrag(4 * 60 + 2, 58)).toBe(3 * 60 + 58);
    expect(totalFromMinuteDrag(11 * 60 + 58, 1)).toBe(1);
  });
  it('totalFromHourDrag', () => {
    expect(totalFromHourDrag(90, 1)).toBe(180);
    expect(totalFromHourDrag(359.9, 1)).toBe(0);
    expect(totalFromHourDrag(92, 5)).toBe(185);
  });
});

describe('sameTime', () => {
  it('tolerates and wraps', () => {
    expect(sameTime(225, 226)).toBe(true);
    expect(sameTime(0, 719)).toBe(true);
    expect(sameTime(225, 240)).toBe(false);
    expect(sameTime(225, 228, 5)).toBe(true);
  });
});

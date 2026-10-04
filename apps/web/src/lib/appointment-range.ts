import { parseDateOnly, toLocalDateKey } from './dates';

/** Convert the displayed local date/time to explicit instants before sending. */
export function appointmentRange(date: string, time: string, minutes: number) {
  const start = parseDateOnly(date);
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!start || toLocalDateKey(start) !== date || !match || !Number.isInteger(minutes) || minutes < 1) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  start.setHours(hour, minute, 0, 0);
  if (start.getHours() !== hour || start.getMinutes() !== minute) return null;
  const end = new Date(start.getTime() + minutes * 60_000);
  return {
    startDatetime: start.toISOString(), endDatetime: end.toISOString(),
    endDate: toLocalDateKey(end),
    endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
  };
}

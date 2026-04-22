import { db, followUpsTable, type Cadence } from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayDateString(): string {
  return toDateString(new Date());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function generateScheduledDates(
  cadence: Cadence,
  startFrom: Date,
  oneTimeDate: string | null,
): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (cadence === "one_time") {
    return oneTimeDate ? [oneTimeDate] : [];
  }

  const dates: string[] = [];
  let current = new Date(startFrom);
  current.setHours(0, 0, 0, 0);

  if (cadence === "weekly") {
    let next = addDays(current, 7);
    if (next < today) next = addDays(today, 7);
    for (let i = 0; i < 12; i++) {
      dates.push(toDateString(next));
      next = addDays(next, 7);
    }
  } else if (cadence === "monthly") {
    let next = addMonths(current, 1);
    if (next < today) next = addMonths(today, 1);
    for (let i = 0; i < 12; i++) {
      dates.push(toDateString(next));
      next = addMonths(next, 1);
    }
  } else if (cadence === "quarterly") {
    let next = addMonths(current, 3);
    if (next < today) next = addMonths(today, 3);
    for (let i = 0; i < 8; i++) {
      dates.push(toDateString(next));
      next = addMonths(next, 3);
    }
  }
  return dates;
}

export function nextOccurrence(
  cadence: Cadence,
  fromDateString: string,
): string | null {
  if (cadence === "one_time") return null;
  const [y, m, d] = fromDateString.split("-").map(Number);
  const base = new Date(y!, (m ?? 1) - 1, d ?? 1);
  if (cadence === "weekly") return toDateString(addDays(base, 7));
  if (cadence === "monthly") return toDateString(addMonths(base, 1));
  if (cadence === "quarterly") return toDateString(addMonths(base, 3));
  return null;
}

export async function deleteFutureUncompleted(clientId: string): Promise<void> {
  const today = todayDateString();
  await db
    .delete(followUpsTable)
    .where(
      and(
        eq(followUpsTable.clientId, clientId),
        eq(followUpsTable.completed, false),
        gte(followUpsTable.scheduledDate, today),
      ),
    );
}

export async function generateForClient(
  clientId: string,
  cadence: Cadence,
  notes: string | null,
  oneTimeDate: string | null,
): Promise<void> {
  const dates = generateScheduledDates(cadence, new Date(), oneTimeDate);
  if (dates.length === 0) return;
  await db.insert(followUpsTable).values(
    dates.map((scheduledDate) => ({
      clientId,
      scheduledDate,
      notesSnapshot: notes,
    })),
  );
}

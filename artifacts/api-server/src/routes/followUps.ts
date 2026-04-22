import { Router, type IRouter } from "express";
import { db, clientsTable, followUpsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import {
  generateForClient,
  nextOccurrence,
  todayDateString,
} from "../lib/followUps";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/follow-ups/today", async (req, res) => {
  const userId = getUserId(req);
  const today = todayDateString();

  const rows = await db
    .select({
      id: followUpsTable.id,
      clientId: followUpsTable.clientId,
      clientName: clientsTable.name,
      notesSnapshot: followUpsTable.notesSnapshot,
      cadence: clientsTable.cadence,
      scheduledDate: followUpsTable.scheduledDate,
      completed: followUpsTable.completed,
    })
    .from(followUpsTable)
    .innerJoin(clientsTable, eq(followUpsTable.clientId, clientsTable.id))
    .where(
      and(
        eq(clientsTable.userId, userId),
        eq(followUpsTable.scheduledDate, today),
        eq(followUpsTable.completed, false),
      ),
    );

  res.json(
    rows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      clientName: r.clientName,
      notesSnapshot: r.notesSnapshot ?? null,
      cadence: r.cadence,
      scheduledDate: r.scheduledDate,
      completed: r.completed,
    })),
  );
});

router.patch("/follow-ups/:id/complete", async (req, res) => {
  const userId = getUserId(req);
  const id = req.params["id"]!;

  const [row] = await db
    .select({
      followUp: followUpsTable,
      client: clientsTable,
    })
    .from(followUpsTable)
    .innerJoin(clientsTable, eq(followUpsTable.clientId, clientsTable.id))
    .where(and(eq(followUpsTable.id, id), eq(clientsTable.userId, userId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ message: "Follow-up not found" });
    return;
  }

  const { followUp, client } = row;
  const next = nextOccurrence(client.cadence, followUp.scheduledDate);

  await db
    .update(followUpsTable)
    .set({
      completed: true,
      completedAt: new Date(),
      nextFollowUpDate: next,
    })
    .where(eq(followUpsTable.id, id));

  // Keep the rolling window fresh: ensure there is at least one upcoming
  // follow-up beyond the window we already created.
  if (next) {
    const [existsNext] = await db
      .select({ id: followUpsTable.id })
      .from(followUpsTable)
      .where(
        and(
          eq(followUpsTable.clientId, client.id),
          eq(followUpsTable.scheduledDate, next),
        ),
      )
      .limit(1);
    if (!existsNext) {
      await db.insert(followUpsTable).values({
        clientId: client.id,
        scheduledDate: next,
        notesSnapshot: client.notes ?? null,
      });
    }
    // Also top up the rolling window.
    await generateForClient(
      client.id,
      client.cadence,
      client.notes ?? null,
      null,
    );
  }

  res.json({ id, completed: true, nextFollowUpDate: next });
});

export default router;

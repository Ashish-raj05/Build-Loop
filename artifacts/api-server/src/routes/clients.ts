import { Router, type IRouter } from "express";
import { db, clientsTable, followUpsTable } from "@workspace/db";
import { and, asc, eq, gte } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";
import {
  deleteFutureUncompleted,
  generateForClient,
  toDateString,
  todayDateString,
} from "../lib/followUps";

const router: IRouter = Router();

router.use(requireAuth);

async function getNextFollowUpDate(clientId: string): Promise<string | null> {
  const today = todayDateString();
  const [row] = await db
    .select({ scheduledDate: followUpsTable.scheduledDate })
    .from(followUpsTable)
    .where(
      and(
        eq(followUpsTable.clientId, clientId),
        eq(followUpsTable.completed, false),
        gte(followUpsTable.scheduledDate, today),
      ),
    )
    .orderBy(asc(followUpsTable.scheduledDate))
    .limit(1);
  return row?.scheduledDate ?? null;
}

function serializeClient(c: typeof clientsTable.$inferSelect, next: string | null) {
  return {
    id: c.id,
    name: c.name,
    notes: c.notes ?? null,
    cadence: c.cadence,
    followUpDate: c.followUpDate ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    nextFollowUpDate: next,
  };
}

router.get("/clients", async (req, res) => {
  const userId = getUserId(req);
  const rows = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId))
    .orderBy(asc(clientsTable.name));

  const result = await Promise.all(
    rows.map(async (c) => serializeClient(c, await getNextFollowUpDate(c.id))),
  );
  res.json(result);
});

router.post("/clients", async (req, res) => {
  const userId = getUserId(req);
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const { name, notes, cadence, followUpDate } = parsed.data;
  const followUpDateStr =
    cadence === "one_time" && followUpDate ? toDateString(followUpDate) : null;

  if (cadence === "one_time" && !followUpDateStr) {
    res
      .status(400)
      .json({ message: "Follow-up date is required for one-time follow-ups" });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({
      userId,
      name,
      notes: notes ?? null,
      cadence,
      followUpDate: followUpDateStr,
    })
    .returning();

  if (!client) {
    res.status(500).json({ message: "Failed to create client" });
    return;
  }

  await generateForClient(client.id, cadence, notes ?? null, followUpDateStr);
  const next = await getNextFollowUpDate(client.id);
  res.json(serializeClient(client, next));
});

router.put("/clients/:id", async (req, res) => {
  const userId = getUserId(req);
  const id = req.params["id"]!;
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  const [existing] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ message: "Client not found" });
    return;
  }

  const { name, notes, cadence, followUpDate } = parsed.data;
  const followUpDateStr =
    cadence === "one_time" && followUpDate ? toDateString(followUpDate) : null;

  if (cadence === "one_time" && !followUpDateStr) {
    res
      .status(400)
      .json({ message: "Follow-up date is required for one-time follow-ups" });
    return;
  }

  const [updated] = await db
    .update(clientsTable)
    .set({
      name,
      notes: notes ?? null,
      cadence,
      followUpDate: followUpDateStr,
      updatedAt: new Date(),
    })
    .where(eq(clientsTable.id, id))
    .returning();

  if (!updated) {
    res.status(500).json({ message: "Failed to update client" });
    return;
  }

  await deleteFutureUncompleted(id);
  await generateForClient(id, cadence, notes ?? null, followUpDateStr);
  const next = await getNextFollowUpDate(id);
  res.json(serializeClient(updated, next));
});

router.delete("/clients/:id", async (req, res) => {
  const userId = getUserId(req);
  const id = req.params["id"]!;
  const result = await db
    .delete(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, userId)))
    .returning({ id: clientsTable.id });
  if (result.length === 0) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;

/**
 * jobOfflineDB — IndexedDB wrapper for offline-first Job Mode.
 *
 * Two object stores:
 *   sync_queue  — serialized API operations pending upload, ordered by enqueue time
 *   blobs       — photo / voice blobs referenced by local event IDs
 *
 * All functions are async and safe to call without await (fire-and-forget writes).
 */

import { openDB, type IDBPDatabase } from "idb";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OpType =
  | "create_job"
  | "patch_job"
  | "create_event"
  | "patch_event"
  | "delete_event"
  | "upload_photo";

export interface QueuedOp {
  /** Stable string key — typically the entity ID being created/modified. */
  id: string;
  type: OpType;
  /** Full serializable body to send to the API endpoint. */
  payload: unknown;
  enqueuedAt: number;
  retries: number;
  lastError: string | null;
}

// ─── DB setup ─────────────────────────────────────────────────────────────────

const DB_NAME = "unitdown_offline";
const DB_VERSION = 1;

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("sync_queue")) {
        const qs = db.createObjectStore("sync_queue", { keyPath: "id" });
        qs.createIndex("by_enqueued", "enqueuedAt");
      }
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs");
      }
    },
  });
  return _db;
}

// ─── Queue operations ─────────────────────────────────────────────────────────

/** Upsert an operation into the queue. Idempotent by op.id. */
export async function enqueueOp(op: QueuedOp): Promise<void> {
  const db = await getDB();
  await db.put("sync_queue", op);
}

/** Return all queued ops in enqueue order (oldest first). */
export async function getQueuedOps(): Promise<QueuedOp[]> {
  const db = await getDB();
  return (await db.getAllFromIndex("sync_queue", "by_enqueued")) as QueuedOp[];
}

/** Remove a successfully processed op. */
export async function dequeueOp(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sync_queue", id);
}

/** Increment retry counter and store error message. */
export async function markOpFailed(id: string, error: string): Promise<void> {
  const db = await getDB();
  const op = (await db.get("sync_queue", id)) as QueuedOp | undefined;
  if (!op) return;
  await db.put("sync_queue", { ...op, retries: op.retries + 1, lastError: error });
}

/** Count pending ops — cheap for status indicators. */
export async function getQueueSize(): Promise<number> {
  const db = await getDB();
  return db.count("sync_queue");
}

// ─── Blob operations ──────────────────────────────────────────────────────────

/** Store a photo or audio blob keyed by local event/blob ID. */
export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put("blobs", blob, id);
}

/** Retrieve a previously stored blob (returns null if not found). */
export async function getBlob(id: string): Promise<Blob | null> {
  const db = await getDB();
  const blob = await db.get("blobs", id);
  return (blob as Blob | undefined) ?? null;
}

/** Remove a blob after successful upload. */
export async function deleteBlob(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("blobs", id);
}

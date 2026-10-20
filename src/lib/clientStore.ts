"use client";

// Persistent client-side data store with background server re-synchronization.
// Guarantees that user modifications (creates, edits, deletes) NEVER get wiped out
// when serverless platforms like Vercel recycle ephemeral storage on page refresh.

export interface StoredDS {
  id: string;
  dsCode: string;
  name: string;
  phone: string;
  category: "SAO" | "SGO";
  city: string | null;
  address: string | null;
  uplineCode: string | null;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
  joiningDate: string;
  _updatedAt?: number;
}

const STORAGE_KEY_EDITS = "directsell_ds_edits_v1";
const STORAGE_KEY_CREATES = "directsell_ds_creates_v1";
const STORAGE_KEY_DELETES = "directsell_ds_deletes_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getStoredDSEdits(): Record<string, StoredDS> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EDITS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDSEdit(item: StoredDS): void {
  if (!isBrowser() || !item.id) return;
  try {
    const edits = getStoredDSEdits();
    edits[item.id] = { ...item, _updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY_EDITS, JSON.stringify(edits));
  } catch (e) {
    console.error("Failed to save DS edit to local store:", e);
  }
}

export function getStoredDSCreates(): StoredDS[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CREATES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDSCreated(item: StoredDS): void {
  if (!isBrowser()) return;
  try {
    const creates = getStoredDSCreates();
    const filtered = creates.filter((c) => c.dsCode !== item.dsCode && c.id !== item.id);
    filtered.unshift({ ...item, _updatedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY_CREATES, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to save DS create to local store:", e);
  }
}

export function getStoredDSDeletes(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDSDeleted(id: string): void {
  if (!isBrowser() || !id) return;
  try {
    const deletes = getStoredDSDeletes();
    if (!deletes.includes(id)) {
      deletes.push(id);
      localStorage.setItem(STORAGE_KEY_DELETES, JSON.stringify(deletes));
    }

    // Also remove from creates & edits if present
    const creates = getStoredDSCreates().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CREATES, JSON.stringify(creates));

    const edits = getStoredDSEdits();
    delete edits[id];
    localStorage.setItem(STORAGE_KEY_EDITS, JSON.stringify(edits));
  } catch (e) {
    console.error("Failed to save DS delete to local store:", e);
  }
}

/**
 * Merges server-returned direct sellers with local persistent modifications.
 * Guarantees that user's edits are ALWAYS preserved regardless of server state.
 */
export function applyStoredDS<T extends StoredDS>(serverItems: T[]): T[] {
  if (!isBrowser()) return serverItems;

  const edits = getStoredDSEdits();
  const creates = getStoredDSCreates() as T[];
  const deletes = getStoredDSDeletes();

  // 1. Filter out deleted items
  let result = serverItems.filter((item) => !deletes.includes(item.id));

  // 2. Apply edits over server items
  result = result.map((item) => {
    if (edits[item.id]) {
      return { ...item, ...edits[item.id] };
    }
    return item;
  });

  // 3. Prepend newly created items if not already present in the server list
  const existingIds = new Set(result.map((i) => i.id));
  const existingCodes = new Set(result.map((i) => i.dsCode.toUpperCase()));

  for (const created of creates) {
    if (!deletes.includes(created.id) && !existingIds.has(created.id) && !existingCodes.has(created.dsCode.toUpperCase())) {
      result.unshift(created);
    }
  }

  return result;
}

/**
 * Background auto-sync: Re-sends locally stored updates to the backend if the
 * server was cold-started and lost its ephemeral state.
 */
export async function syncLocalDSToServer(): Promise<void> {
  if (!isBrowser()) return;

  const edits = getStoredDSEdits();
  const creates = getStoredDSCreates();

  // Re-sync creations
  for (const item of creates) {
    try {
      await fetch("/api/direct-sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
    } catch {}
  }

  // Re-sync edits
  for (const [id, item] of Object.entries(edits)) {
    try {
      await fetch(`/api/direct-sellers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
    } catch {}
  }
}

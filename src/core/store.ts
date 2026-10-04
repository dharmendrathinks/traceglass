import {
  captureSchema,
  policySchema,
  DEFAULT_POLICY,
  MAX_CAPTURES,
  type Capture,
  type Policy,
} from "./model";

const DB = "traceglass-v1";
let database: Promise<IDBDatabase> | undefined;
function open(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("captures", { keyPath: "id" });
      request.result.createObjectStore("settings");
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      database = undefined;
      reject(
        new Error(
          "Local storage could not be opened. Check available disk space and browser storage settings.",
        ),
      );
    };
    request.onblocked = () =>
      reject(
        new Error(
          "Close other Traceglass tabs to finish opening local storage.",
        ),
      );
  });
  return database;
}
async function transaction<T>(
  store: "captures" | "settings",
  mode: IDBTransactionMode,
  run: (
    s: IDBObjectStore,
    set: (v: T) => void,
    fail: (error: Error) => void,
  ) => void,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let value: T;
    let failure: Error | undefined;
    tx.oncomplete = () => resolve(value);
    tx.onerror = () =>
      reject(
        new Error(
          "Local save failed. Export important captures and free browser storage.",
        ),
      );
    tx.onabort = () =>
      reject(
        failure ??
          new Error(
            "Local storage transaction was interrupted. Your change was not saved.",
          ),
      );
    run(
      tx.objectStore(store),
      (v) => {
        value = v;
      },
      (error) => {
        failure = error;
        tx.abort();
      },
    );
  });
}
export async function listCaptures(): Promise<Capture[]> {
  const raw = await transaction<unknown[]>("captures", "readonly", (s, set) => {
    s.getAll().onsuccess = (e) =>
      set((e.target as IDBRequest<unknown[]>).result);
  });
  return raw
    .map((c) => captureSchema.parse(c))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function saveCapture(capture: Capture): Promise<void> {
  await saveCaptures([capture]);
}
export async function saveCaptures(captures: Capture[]): Promise<void> {
  const values = captures.map((c) => captureSchema.parse(c));
  await transaction<void>("captures", "readwrite", (s, _set, fail) => {
    s.getAllKeys().onsuccess = (e) => {
      const keys = new Set<IDBValidKey>(
        (e.target as IDBRequest<IDBValidKey[]>).result,
      );
      for (const c of values) keys.add(c.id);
      if (keys.size > MAX_CAPTURES) {
        fail(
          new Error(
            "Your library holds 40 captures. Export and delete one before adding another.",
          ),
        );
        return;
      }
      for (const c of values) s.put(c);
    };
  });
}
export async function deleteCapture(id: string): Promise<void> {
  await transaction<void>("captures", "readwrite", (s) => {
    s.delete(id);
  });
}
export async function loadPolicy(): Promise<Policy> {
  const raw = await transaction<unknown>("settings", "readonly", (s, set) => {
    s.get("policy").onsuccess = (e) => set((e.target as IDBRequest).result);
  });
  return raw === undefined ? DEFAULT_POLICY : policySchema.parse(raw);
}
export async function savePolicy(value: Policy): Promise<void> {
  await transaction<void>("settings", "readwrite", (s) => {
    s.put(policySchema.parse(value), "policy");
  });
}

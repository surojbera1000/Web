import { openDB, type IDBPDatabase } from 'idb';

export type AccountType = 'user' | 'bot';

export interface AccountRecord {
  id: string;
  type: AccountType;
  /** GramJS StringSession payload. */
  session: string;
  /** Display label (name / @username / bot name). */
  label: string;
  /** Optional avatar data URL cached for the account switcher. */
  avatar?: string;
  createdAt: number;
}

const DB_NAME = 'telegram-web';
const DB_VERSION = 1;
const ACCOUNTS_STORE = 'accounts';
const META_STORE = 'meta';
const ACTIVE_KEY = 'activeAccountId';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  const p = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(ACCOUNTS_STORE)) {
        db.createObjectStore(ACCOUNTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    },
  });
  dbPromise = p;
  return p;
}

export async function listAccounts(): Promise<AccountRecord[]> {
  const db = await getDb();
  const all = (await db.getAll(ACCOUNTS_STORE)) as AccountRecord[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getAccount(id: string): Promise<AccountRecord | undefined> {
  const db = await getDb();
  return (await db.get(ACCOUNTS_STORE, id)) as AccountRecord | undefined;
}

export async function saveAccount(record: AccountRecord): Promise<void> {
  const db = await getDb();
  await db.put(ACCOUNTS_STORE, record);
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(ACCOUNTS_STORE, id);
  const active = await getActiveAccountId();
  if (active === id) await setActiveAccountId(null);
}

export async function getActiveAccountId(): Promise<string | null> {
  const db = await getDb();
  return ((await db.get(META_STORE, ACTIVE_KEY)) as string | undefined) ?? null;
}

export async function setActiveAccountId(id: string | null): Promise<void> {
  const db = await getDb();
  if (id === null) await db.delete(META_STORE, ACTIVE_KEY);
  else await db.put(META_STORE, id, ACTIVE_KEY);
}

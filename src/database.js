import { Platform } from 'react-native';

const DATABASE_VERSION = 1;

export const DATABASE_NAME = 'contracts.db';

/**
 * Runs once when SQLiteProvider mounts, before any child can use the database.
 * Also acts as the migration entry point: bump DATABASE_VERSION and append a new
 * `if (currentDbVersion === N)` block to evolve the schema.
 */
export async function migrateDbIfNeeded(db) {
  const result = await db.getFirstAsync('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE IF NOT EXISTS Contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerName TEXT,
        eventDate TEXT,
        location TEXT,
        localImagePath TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_contracts_event_date
        ON Contracts (eventDate);
    `);
    currentDbVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

/**
 * Returns every contract ordered newest event first. All rows are fetched in one
 * query and grouped in JS, so the Dashboard never issues a query per section.
 */
export async function getAllContracts(db) {
  return db.getAllAsync(
    `SELECT id, customerName, eventDate, location, localImagePath
       FROM Contracts
      ORDER BY date(eventDate) DESC, id DESC`
  );
}

export async function insertContract(db, { customerName, eventDate, location, localImagePath }) {
  const result = await db.runAsync(
    `INSERT INTO Contracts (customerName, eventDate, location, localImagePath)
     VALUES (?, ?, ?, ?)`,
    [customerName ?? '', eventDate ?? '', location ?? '', localImagePath ?? '']
  );
  return result.lastInsertRowId;
}

/**
 * expo-image-picker returns `file:///path/to/photo.jpg` on Android/iOS and a
 * `blob:` or `data:` URL on web-only dev builds. SQLite stores the string as-is;
 * this normaliser only guards the web case where the URI is not loadable later.
 */
export function normaliseImagePath(uri) {
  if (!uri) return '';
  if (Platform.OS === 'web' && uri.startsWith('blob:')) return '';
  return uri;
}

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
export function sqliteStore(path) {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS shop_records (key TEXT PRIMARY KEY, data TEXT NOT NULL, etag TEXT NOT NULL)",
  );
  return {
    async get(key) {
      const row = db
        .prepare("SELECT data,etag FROM shop_records WHERE key=?")
        .get(key);
      return row ? { data: JSON.parse(row.data), etag: row.etag } : null;
    },
    async put(key, data, conditions = {}) {
      const etag = randomUUID();
      let result;
      if (conditions.onlyIfNew)
        result = db
          .prepare(
            "INSERT OR IGNORE INTO shop_records (key,data,etag) VALUES (?,?,?)",
          )
          .run(key, JSON.stringify(data), etag);
      else if (conditions.onlyIfMatch)
        result = db
          .prepare(
            "UPDATE shop_records SET data=?,etag=? WHERE key=? AND etag=?",
          )
          .run(JSON.stringify(data), etag, key, conditions.onlyIfMatch);
      else
        result = db
          .prepare(
            "INSERT INTO shop_records (key,data,etag) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,etag=excluded.etag",
          )
          .run(key, JSON.stringify(data), etag);
      return {
        modified: result.changes === 1,
        etag: result.changes === 1 ? etag : undefined,
      };
    },
    async list(prefix) {
      return db
        .prepare("SELECT key FROM shop_records WHERE key LIKE ?")
        .all(prefix + "%")
        .map((row) => row.key);
    },
    close() {
      db.close();
    },
  };
}

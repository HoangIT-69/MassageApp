import { closeDatabase, createIsolatedDatabase, dropIsolatedDatabase, type AppDatabase } from "./client";

export const TEST_DATABASE_URL = process.env.DATABASE_URL ?? "mysql://root:zalo_root@127.0.0.1:3306/zalo_chat";

export async function openTestDatabase(): Promise<{ db: AppDatabase; cleanup: () => Promise<void> }> {
  const created = await createIsolatedDatabase(TEST_DATABASE_URL);
  return {
    db: created.db,
    cleanup: async () => {
      await closeDatabase(created.db);
      await dropIsolatedDatabase(TEST_DATABASE_URL, created.name);
    },
  };
}

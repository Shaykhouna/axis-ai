import Database from "@tauri-apps/plugin-sql";
import { DB_URL } from "../../lib/constants";

// Singleton. tauri-plugin-sql handles its own pool internally.
let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  try {
    if (dbInstance === null) {
      dbInstance = await Database.load(DB_URL);
    }
    return dbInstance;
  } catch (error) {
    console.error("Error loading database:", error);
    throw error;
  }
}
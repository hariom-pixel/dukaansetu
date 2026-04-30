import Database from '@tauri-apps/plugin-sql'
import { isTauriApp } from './tauri'

let dbInstance: Database | null = null

export async function getDb() {
  if (!isTauriApp()) {
    throw new Error('SQLite is only available inside the Tauri desktop app.')
  }

  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:dukaansetu.db')
  }

  return dbInstance
}

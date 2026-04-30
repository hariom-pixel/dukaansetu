export function isTauriApp() {
  return '__TAURI_INTERNALS__' in window
}

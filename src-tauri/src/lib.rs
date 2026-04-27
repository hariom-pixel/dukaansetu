#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  const DB_URL: &str = "sqlite:dukaansetu.db";

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations(
          DB_URL,
          vec![tauri_plugin_sql::Migration {
            version: 1,
            description: "create initial tables",
            sql: r#"
              CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                category TEXT
              );

              CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                balance REAL NOT NULL DEFAULT 0
              );

              CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                total_price REAL NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
              );
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
          }],
        )
        .build(),
    )
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

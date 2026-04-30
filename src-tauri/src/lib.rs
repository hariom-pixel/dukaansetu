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
                sku TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                barcode TEXT,
                price REAL NOT NULL DEFAULT 0,
                stock INTEGER NOT NULL DEFAULT 0,
                category TEXT,
                reorder_level INTEGER NOT NULL DEFAULT 20,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
              );

              CREATE TABLE IF NOT EXISTS sales (
                id TEXT PRIMARY KEY,
                customer_name TEXT NOT NULL DEFAULT 'Walk-in',
                customer_phone TEXT,
                channel TEXT NOT NULL DEFAULT 'POS',
                subtotal REAL NOT NULL DEFAULT 0,
                discount REAL NOT NULL DEFAULT 0,
                discount_value REAL NOT NULL DEFAULT 0,
                discount_type TEXT NOT NULL DEFAULT 'percent',
                tax REAL NOT NULL DEFAULT 0,
                gst_rate REAL NOT NULL DEFAULT 0,
                gst_mode TEXT NOT NULL DEFAULT 'with',
                total REAL NOT NULL DEFAULT 0,
                payment_mode TEXT NOT NULL DEFAULT 'Cash',
                sale_mode TEXT NOT NULL DEFAULT 'paid',
                paid_amount REAL NOT NULL DEFAULT 0,
                due_amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'Paid',
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
              );

              CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id TEXT NOT NULL,
                product_id INTEGER,
                sku TEXT NOT NULL,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                qty INTEGER NOT NULL,
                line_total REAL NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
              );

              CREATE TABLE IF NOT EXISTS held_bills (
                id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
              );

              CREATE TABLE IF NOT EXISTS stock_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                sku TEXT NOT NULL,
                product_name TEXT NOT NULL,
                qty INTEGER NOT NULL,
                direction TEXT NOT NULL,
                reason TEXT NOT NULL,
                ref_id TEXT,
                note TEXT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
              );

              CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                balance REAL NOT NULL DEFAULT 0
              );
            "#,
            kind: tauri_plugin_sql::MigrationKind::Up,
          },
            tauri_plugin_sql::Migration {
              version: 2,
              description: "purchase tables",
              sql: r#"
                CREATE TABLE IF NOT EXISTS suppliers (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL UNIQUE,
                  outstanding REAL NOT NULL DEFAULT 0,
                  lead_days INTEGER NOT NULL DEFAULT 3,
                  rating REAL NOT NULL DEFAULT 4.5
                );

                CREATE TABLE IF NOT EXISTS purchases (
                  id TEXT PRIMARY KEY,
                  supplier_name TEXT NOT NULL,
                  items INTEGER NOT NULL DEFAULT 0,
                  value REAL NOT NULL DEFAULT 0,
                  status TEXT NOT NULL DEFAULT 'Draft',
                  eta TEXT,
                  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
                );

                CREATE TABLE IF NOT EXISTS purchase_items (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  purchase_id TEXT NOT NULL,
                  sku TEXT NOT NULL,
                  name TEXT NOT NULL,
                  qty INTEGER NOT NULL,
                  price REAL NOT NULL
                );
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
          ],
        )
        .build(),
    )
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

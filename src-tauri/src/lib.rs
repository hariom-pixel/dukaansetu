#[cfg_attr(mobile, tauri::mobile_entry_point)]

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AtomicSaleItem {
  sku: String,
  name: String,
  price: f64,
  qty: i64,
  hsn_code: Option<String>,
  gst_rate: Option<f64>,
  tax_amount: Option<f64>,
  taxable_amount: Option<f64>,
  tax_inclusive: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AtomicSalePayload {
  customer_id: Option<i64>,
  customer_name: String,
  customer_phone: Option<String>,
  subtotal: f64,
  discount: f64,
  discount_value: f64,
  discount_type: String,
  tax: f64,
  gst_rate: f64,
  gst_mode: String,
  total: f64,
  payment_mode: String,
  sale_mode: String,
  items: Vec<AtomicSaleItem>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AtomicSaleResult {
  invoice_id: String,
}

fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_config_dir()
    .map_err(|e| format!("Failed to get app config dir: {e}"))?;

  std::fs::create_dir_all(&dir)
    .map_err(|e| format!("Failed to create app config dir: {e}"))?;

  Ok(dir.join("dukaansetu.db"))
}

#[tauri::command]
fn create_sale_atomic(
  app: tauri::AppHandle,
  payload: AtomicSalePayload,
) -> Result<AtomicSaleResult, String> {
  if payload.items.is_empty() {
    return Err("Cannot create sale without items".to_string());
  }

  if payload.total <= 0.0 {
    return Err("Invalid sale total".to_string());
  }

  let db_path = get_db_path(&app)?;
  let mut conn = Connection::open(db_path)
    .map_err(|e| format!("Failed to open database: {e}"))?;

  conn
    .busy_timeout(std::time::Duration::from_secs(5))
    .map_err(|e| format!("Failed to set busy timeout: {e}"))?;

  let tx = conn
    .transaction()
    .map_err(|e| format!("Failed to start sale transaction: {e}"))?;

  let date_key: String = tx
    .query_row(
      "SELECT strftime('%Y-%m-%d', 'now', 'localtime')",
      [],
      |row| row.get(0),
    )
    .map_err(|e| format!("Failed to get invoice date key: {e}"))?;

  let full_compact_date: String = tx
  .query_row(
    "SELECT strftime('%Y%m%d', 'now', 'localtime')",
    [],
    |row| row.get(0),
  )
  .map_err(|e| format!("Failed to get invoice compact date: {e}"))?;

  let compact_date = full_compact_date
  .get(2..)
  .ok_or_else(|| "Failed to format invoice compact date".to_string())?
  .to_string();

  let last_number: Option<i64> = tx
    .query_row(
      "SELECT last_number FROM invoice_sequences WHERE sequence_date = ?1 LIMIT 1",
      params![date_key],
      |row| row.get(0),
    )
    .optional()
    .map_err(|e| format!("Failed to read invoice sequence: {e}"))?;

  let next_number = last_number.unwrap_or(0) + 1;

  if last_number.is_some() {
    tx.execute(
      "
      UPDATE invoice_sequences
      SET last_number = ?1,
          updated_at = strftime('%s', 'now')
      WHERE sequence_date = ?2
      ",
      params![next_number, date_key],
    )
    .map_err(|e| format!("Failed to update invoice sequence: {e}"))?;
  } else {
    tx.execute(
      "
      INSERT INTO invoice_sequences (sequence_date, last_number)
      VALUES (?1, ?2)
      ",
      params![date_key, next_number],
    )
    .map_err(|e| format!("Failed to create invoice sequence: {e}"))?;
  }

  let invoice_id = format!("INV-{}-{:04}", compact_date, next_number);

  // Validate stock inside the transaction.
  for item in &payload.items {
    if item.qty <= 0 {
      return Err(format!("Invalid quantity for {}", item.name));
    }

    let stock: Option<i64> = tx
      .query_row(
        "SELECT stock FROM products WHERE sku = ?1 LIMIT 1",
        params![item.sku],
        |row| row.get(0),
      )
      .optional()
      .map_err(|e| format!("Failed to read stock for {}: {e}", item.name))?;

    let Some(stock) = stock else {
      return Err(format!("Product not found: {}", item.name));
    };

    if stock < item.qty {
      return Err(format!("Not enough stock for {}", item.name));
    }
  }

  let paid_amount = if payload.sale_mode == "paid" {
    payload.total
  } else {
    0.0
  };

  let due_amount = if payload.sale_mode == "credit" {
    payload.total
  } else {
    0.0
  };

  let status = if payload.sale_mode == "credit" {
    "Credit"
  } else {
    "Paid"
  };

  tx.execute(
    "
    INSERT INTO sales (
      id, customer_id, customer_name, customer_phone,
      subtotal, discount, discount_value, discount_type,
      tax, gst_rate, gst_mode,
      total, payment_mode, sale_mode,
      paid_amount, due_amount, status
    )
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
    ",
    params![
      invoice_id,
      payload.customer_id,
      payload.customer_name,
      payload.customer_phone,
      payload.subtotal,
      payload.discount,
      payload.discount_value,
      payload.discount_type,
      payload.tax,
      payload.gst_rate,
      payload.gst_mode,
      payload.total,
      payload.payment_mode,
      payload.sale_mode,
      paid_amount,
      due_amount,
      status,
    ],
  )
  .map_err(|e| format!("Failed to create sale: {e}"))?;

  for item in &payload.items {
    let product_row: (i64, f64) = tx
      .query_row(
        "SELECT id, COALESCE(cost_price, 0) FROM products WHERE sku = ?1 LIMIT 1",
        params![item.sku],
        |row| Ok((row.get(0)?, row.get(1)?)),
      )
      .map_err(|e| format!("Failed to get product details for {}: {e}", item.name))?;

    let product_id = product_row.0;
    let cost_price = product_row.1;
    let line_total = item.price * item.qty as f64;
    let line_cost = cost_price * item.qty as f64;
    let line_profit = line_total - line_cost;

    let hsn_code = item.hsn_code.clone();
    let gst_rate = item.gst_rate.unwrap_or(0.0);
    let tax_amount = item.tax_amount.unwrap_or(0.0);
    let taxable_amount = item.taxable_amount.unwrap_or(line_total);
    let tax_inclusive = if item.tax_inclusive.unwrap_or(true) { 1 } else { 0 };

    tx.execute(
      "
      INSERT INTO sale_items
        (
          sale_id, product_id, sku, name, price, qty, line_total,
          cost_price, profit, hsn_code, gst_rate, tax_amount,
          tax_inclusive, taxable_amount
        )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
      ",
      params![
        invoice_id,
        product_id,
        item.sku,
        item.name,
        item.price,
        item.qty,
        line_total,
        cost_price,
        line_profit,
        hsn_code,
        gst_rate,
        tax_amount,
        tax_inclusive,
        taxable_amount,
      ],
    )
    .map_err(|e| format!("Failed to add sale item {}: {e}", item.name))?;

    let updated = tx
      .execute(
        "
        UPDATE products
        SET stock = stock - ?1,
            updated_at = strftime('%s', 'now')
        WHERE sku = ?2
          AND stock >= ?1
        ",
        params![item.qty, item.sku],
      )
      .map_err(|e| format!("Failed to reduce stock for {}: {e}", item.name))?;

    if updated != 1 {
      return Err(format!("Stock update failed for {}", item.name));
    }

    tx.execute(
      "
      INSERT INTO stock_movements
        (product_id, sku, product_name, qty, direction, reason, ref_id, note)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      ",
      params![
        product_id,
        item.sku,
        item.name,
        item.qty,
        "OUT",
        "SALE",
        invoice_id,
        format!("Invoice {}", invoice_id),
      ],
    )
    .map_err(|e| format!("Failed to create stock movement for {}: {e}", item.name))?;
  }

  if payload.sale_mode == "paid" {
    let payment_id = format!("PAY-{}", invoice_id);
    let journal_id = format!("J-{}", invoice_id);

    tx.execute(
      "
      INSERT INTO payments
        (id, party_type, party_id, party_name, source_type, source_id, amount, mode, direction, note)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      ",
      params![
        payment_id,
        "CUSTOMER",
        payload.customer_id.map(|id| id.to_string()),
        payload.customer_name,
        "SALE",
        invoice_id,
        payload.total,
        payload.payment_mode,
        "IN",
        format!("Paid sale {}", invoice_id),
      ],
    )
    .map_err(|e| format!("Failed to create payment record: {e}"))?;

    tx.execute(
      "
      INSERT INTO journal_entries
        (id, description, debit, credit, source_type, source_id, is_system)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      ",
      params![
        journal_id,
        format!("Sale {} · {}", invoice_id, payload.customer_name),
        0.0,
        payload.total,
        "SALE",
        invoice_id,
        1,
      ],
    )
    .map_err(|e| format!("Failed to create journal entry: {e}"))?;
  }

  tx.commit()
    .map_err(|e| format!("Failed to commit sale transaction: {e}"))?;

  Ok(AtomicSaleResult { invoice_id })
}

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
          vec![
            tauri_plugin_sql::Migration {
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
            tauri_plugin_sql::Migration {
              version: 3,
              description: "customer master and sales customer id",
              sql: r#"
                ALTER TABLE sales ADD COLUMN customer_id INTEGER;

                INSERT INTO customers (name, phone, balance)
                SELECT
                  customer_name,
                  customer_phone,
                  COALESCE(SUM(due_amount), 0)
                FROM sales
                WHERE customer_name IS NOT NULL
                  AND customer_name != ''
                  AND customer_name != 'Walk-in'
                GROUP BY customer_name, customer_phone;

                UPDATE sales
                SET customer_id = (
                  SELECT c.id
                  FROM customers c
                  WHERE c.name = sales.customer_name
                    AND COALESCE(c.phone, '') = COALESCE(sales.customer_phone, '')
                  LIMIT 1
                )
                WHERE customer_name IS NOT NULL
                  AND customer_name != ''
                  AND customer_name != 'Walk-in';
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
            tauri_plugin_sql::Migration {
              version: 4,
              description: "journal entries",
              sql: r#"
                CREATE TABLE IF NOT EXISTS journal_entries (
                  id TEXT PRIMARY KEY,
                  description TEXT NOT NULL,
                  debit REAL NOT NULL DEFAULT 0,
                  credit REAL NOT NULL DEFAULT 0,
                  source_type TEXT,
                  source_id TEXT,
                  is_system INTEGER NOT NULL DEFAULT 0,
                  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
                );
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
            tauri_plugin_sql::Migration {
              version: 5,
              description: "payments table",
              sql: r#"
                CREATE TABLE IF NOT EXISTS payments (
                  id TEXT PRIMARY KEY,
                  party_type TEXT NOT NULL,
                  party_id TEXT,
                  party_name TEXT NOT NULL,
                  source_type TEXT NOT NULL,
                  source_id TEXT,
                  amount REAL NOT NULL DEFAULT 0,
                  mode TEXT NOT NULL DEFAULT 'Cash',
                  direction TEXT NOT NULL,
                  note TEXT,
                  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
                );
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
            tauri_plugin_sql::Migration {
              version: 6,
              description: "invoice sequences",
              sql: r#"
                CREATE TABLE IF NOT EXISTS invoice_sequences (
                  sequence_date TEXT PRIMARY KEY,
                  last_number INTEGER NOT NULL DEFAULT 0,
                  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
                );
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
            tauri_plugin_sql::Migration {
              version: 7,
              description: "product cost price",
              sql: r#"
                ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0;
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
            tauri_plugin_sql::Migration {
              version: 8,
              description: "sale item cost and profit",
              sql: r#"
                ALTER TABLE sale_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0;
                ALTER TABLE sale_items ADD COLUMN profit REAL NOT NULL DEFAULT 0;
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
            tauri_plugin_sql::Migration {
              version: 9,
              description: "product hsn and gst rate",
              sql: r#"
                ALTER TABLE products ADD COLUMN hsn_code TEXT;
                ALTER TABLE products ADD COLUMN gst_rate REAL NOT NULL DEFAULT 0;

                ALTER TABLE sale_items ADD COLUMN hsn_code TEXT;
                ALTER TABLE sale_items ADD COLUMN gst_rate REAL NOT NULL DEFAULT 0;
                ALTER TABLE sale_items ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0;
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
            tauri_plugin_sql::Migration {
              version: 10,
              description: "product tax inclusive mode",
              sql: r#"
                ALTER TABLE products ADD COLUMN tax_inclusive INTEGER NOT NULL DEFAULT 1;

                ALTER TABLE sale_items ADD COLUMN tax_inclusive INTEGER NOT NULL DEFAULT 1;
                ALTER TABLE sale_items ADD COLUMN taxable_amount REAL NOT NULL DEFAULT 0;
              "#,
              kind: tauri_plugin_sql::MigrationKind::Up,
            },
          ],
        )
        .build(),
    )
    .invoke_handler(tauri::generate_handler![create_sale_atomic])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

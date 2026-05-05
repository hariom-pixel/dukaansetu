open bill instantly
scan barcode instantly
print instantly
search instantly

Cloud sync (big step)

auto WhatsApp reminders
due aging
partial collections
customer statement PDF
pay link
voice reminders in Hindi

beautiful modern UI
super fast POS
powerful udhaar
simple inventory
mobile responsive
Hindi-friendly

1. Fast POS Billing
   barcode scan
   search by name/SKU
   hold bill
   discount ₹ / %
   GST with/without
   print / WhatsApp invoice
   return / void bill

2. Inventory Basics
   stock in/out auto update
   low stock alerts
   stock adjustments
   purchase receive
   unit support

3. Customer + Udhaar
   customer create fast
   due amount tracking
   partial payment collection
   ledger statement

4. Purchase + Suppliers
   PO create
   receive goods
   supplier payable

5. Dashboard
   today sales
   cash in hand
   due receivables
   low stock

6. Multi-user Staff Control
   Roles:
   Owner
   Cashier
   Manager
   Accountant
   Controls:
   who gave discount
   who voided bill
   shift sales
   login PIN

7. Advanced Reports
   product profit
   dead stock
   best seller
   hourly sales
   category sales
   staff performance
   purchase vs sales

8. Multi-device Sync
   POS on desktop
   owner mobile app
   cloud backup

9. AI Shop Assistant

Ask:

Why sales dropped this week?
What should I reorder?
Which products not moving?
Who will likely default?

Nobody does this well for local shops.

2. WhatsApp Commerce
   send catalog
   reorder links
   repeat customer offers
   festive campaigns
3. Auto Purchase Suggestions
   Milk low in 2 days
   Order 15 units now
4. Voice ERP (India Opportunity)

Hindi:

आज की बिक्री बताओ
राम का कितना उधार है?

Sprint Roadmap
Sprint 1
Perfect POS UX
invoice flow
returns
speed
Sprint 2
customer dues
ledger
payment collection
Sprint 3
reports
owner dashboard
Sprint 4
auth + multi-user
Sprint 5
WhatsApp reminders
Sprint 6
AI insights

Rule: Every "Save" button in your React UI should resolve instantly after the SQLite write. The user should never wait for the NestJS server to respond before they can move to the next bill. The sync happens in the background.

Since this is a billing system, ensure your SQLite database has WAL (Write-Ahead Logging) enabled. This prevents the database from locking up when your background sync worker is reading data while the cashier is trying to save a new bill.

You’re using BrowserRouter, which often shows a blank/404 when you refresh on a nested route (e.g. /pos) in a Tauri webview. Fix: switch to HashRouter (typical for Tauri), or set up SPA fallback if you have a custom asset server.

Application must work for all different type sof shops like pharmacy/medical, kirana store, mini mart, restaurant, ply shop, paint shop etc, whether create sperate version for each type of shop or one app handles all?

b.ts just does Database.load(...). Default journal mode is DELETE, which locks during reads. The exact bug you warned about in architecture.txt

GST Report

Architecture

Phase -1

Desktop App: Tauri
Frontend UI: React + TypeScript + Vite
Offline Database: SQLite
Backend API: NestJS
Cloud DB: PostgreSQL
Sync Engine: Queue-based sync

Phase -2

Desktop App: Tauri 2.x
Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui
State: TanStack Query + Zustand (lightweight)
Local DB: SQLite (via tauri-plugin-sql or @libsql/client)
ORM/Schema: Drizzle ORM (one schema → SQLite + Postgres)
Cloud API: FastAPI (Python) OR Hono (TS, share types)
Cloud DB: PostgreSQL (Supabase/Neon for managed)
Sync: PowerSync or ElectricSQL ← critical
Auth: Better-Auth (TS) or your existing JWT
PDFs: Browser print (already works)

Phase -3

Desktop App: Tauri 2.x
Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui
State: TanStack Query + Zustand only for UI/session/cart
Local DB: SQLite via Tauri SQL plugin for now
Local Queries: Service layer, maybe Drizzle later
Cloud API: Hono or NestJS
Cloud DB: PostgreSQL on Neon/Supabase
ORM Cloud: Drizzle or Prisma
Sync: PowerSync first choice
Auth: JWT / Better-Auth if you stay TS
PDF/Print: Browser print first, thermal printer integration later

Finish offline product first
But keep all tables sync-ready
Then add NestJS + PostgreSQL + sync

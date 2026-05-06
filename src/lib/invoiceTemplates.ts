import { fmtINR } from '@/lib/format'
import { SHOP } from '@/config/shop'

export type ReceiptItem = {
  sku: string
  name: string
  price: number
  qty: number
  gstMode?: 'with' | 'without'
}

export type ReceiptData = {
  id: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  time: string
  customer?: {
    name: string
    phone?: string
    gstin?: string
  }
  paymentMode?: string
}

export type InvoiceTemplateKey = 'thermal' | 'gstClassic' | 'modern' | 'minimal'

const baseStyles = `
  body {
    font-family: Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 24px;
    background: #fff;
  }
  .wrap {
    max-width: 820px;
    margin: 0 auto;
  }
  .muted { color: #64748b; }
  .mono { font-variant-numeric: tabular-nums; }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .section { margin-top: 16px; }
  .totals { margin-top: 18px; margin-left: auto; max-width: 320px; }
  .totals .line {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
  }
  .grand {
    border-top: 2px solid #0f172a;
    margin-top: 8px;
    padding-top: 10px;
    font-weight: 700;
    font-size: 18px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
  }
  th, td {
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    font-size: 13px;
  }
  th {
    color: #475569;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .06em;
  }
  .right { text-align: right; }
  .title {
    font-size: 24px;
    font-weight: 800;
    margin: 0;
  }
  .chip {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
`

function itemRows(items: ReceiptItem[]) {
  return items
    .map(
      (i) => `
      <tr>
        <td>${i.name}</td>
        <td class="right mono">${i.qty}</td>
        <td class="right mono">${fmtINR(i.price)}</td>
        <td class="right mono">${fmtINR(i.price * i.qty)}</td>
      </tr>
    `
    )
    .join('')
}

function totalsBlock(data: ReceiptData) {
  return `
    <div class="totals">
      <div class="line"><span>Subtotal</span><span class="mono">${fmtINR(
        data.subtotal
      )}</span></div>
      <div class="line"><span>Discount</span><span class="mono">- ${fmtINR(
        data.discount
      )}</span></div>
      ${
        data.gstMode === 'with'
          ? `<div class="line"><span>GST</span><span class="mono">+ ${fmtINR(
              data.tax
            )}</span></div>`
          : ''
      }
      <div class="line grand"><span>Total</span><span class="mono">${fmtINR(
        data.total
      )}</span></div>
    </div>
  `
}

export function renderInvoiceTemplate(
  template: InvoiceTemplateKey,
  data: ReceiptData
) {
  const commonTable = `
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="right">Qty</th>
          <th class="right">Rate</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows(data.items)}</tbody>
    </table>
  `

  if (template === 'thermal') {
    return `
      <html>
      <head>
        <title>${data.id}</title>
        <style>
          body { font-family: ui-monospace, monospace; padding: 14px; font-size: 12px; }
          .wrap { max-width: 360px; margin: 0 auto; }
          h1 { margin: 0; text-align: center; font-size: 18px; }
          .sub { text-align: center; color: #666; margin: 4px 0 10px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border-bottom: 1px dashed #cbd5e1; padding: 6px 0; font-size: 12px; }
          th { text-transform: uppercase; font-size: 10px; color: #64748b; }
          .right { text-align: right; }
          .totals { margin-top: 10px; }
          .line { display: flex; justify-content: space-between; padding: 3px 0; }
          .grand { font-weight: 700; border-top: 1px dashed #0f172a; padding-top: 8px; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>ShopOS Retail</h1>
          <div class="sub">POS Receipt</div>
          <div class="line"><span>Bill No</span><span>${data.id}</span></div>
          <div class="line"><span>Date</span><span>${data.time}</span></div>
          <div class="line"><span>Customer</span><span>${
            data.customer || 'Walk-in'
          }</span></div>
          ${commonTable}
          <div class="totals">
            <div class="line"><span>Subtotal</span><span>${fmtINR(
              data.subtotal
            )}</span></div>
            <div class="line"><span>Discount</span><span>- ${fmtINR(
              data.discount
            )}</span></div>
            <div class="line"><span>GST</span><span>+ ${fmtINR(
              data.tax
            )}</span></div>
            <div class="line grand"><span>Total</span><span>${fmtINR(
              data.total
            )}</span></div>
          </div>
          <p style="text-align:center;margin-top:14px;font-size:11px;">Thank you! Visit again.</p>
        </div>
      </body>
      </html>
    `
  }

  if (template === 'gstClassic') {
    return `
      <html>
      <head>
        <title>${data.id}</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="wrap">
          <div class="row">
            <div>
              <div class="chip">Tax Invoice</div>
              <h1 class="title">${SHOP.name}</h1>
              <div class="muted">${SHOP.address}</div>
              <div class="muted">Phone: ${SHOP.phone}</div>
              <div class="muted">GSTIN: ${SHOP.gstin}</div>
              <div class="muted">GSTIN: 27ABCDE1234F1Z5</div>
              <div class="muted">Bandra West, Mumbai</div>
            </div>
            <div style="text-align:right">
              <div><strong>Invoice #</strong> ${data.id}</div>
              <div class="muted">Date: ${data.time}</div>
              <div class="muted">
                Customer: ${data.customer?.name || 'Walk-in'}
              </div>
              ${
                data.customer?.phone
                  ? `<div class="muted">Phone: ${data.customer.phone}</div>`
                  : ''
              }
              ${
                data.customer?.gstin
                  ? `<div class="muted">GSTIN: ${data.customer.gstin}</div>`
                  : ''
              }
            </div>
          </div>
          ${commonTable}
          ${totalsBlock(data)}
        </div>
      </body>
      </html>
    `
  }

  if (template === 'modern') {
    return `
      <html>
      <head>
        <title>${data.id}</title>
        <style>
          ${baseStyles}
          .hero {
            padding: 24px;
            border-radius: 18px;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
          }
          .hero .muted { color: rgba(255,255,255,.8); }
          .card {
            margin-top: 18px;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            padding: 18px;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="hero">
            <div class="row">
              <div>
                <div class="chip" style="background: rgba(255,255,255,.16); color:white;">Invoice</div>
                <h1 class="title" style="color:white;">ShopOS Retail</h1>
                <div class="muted">Simple business billing</div>
              </div>
              <div style="text-align:right">
                <div><strong>#${data.id}</strong></div>
                <div class="muted">${data.time}</div>
                <div class="muted">${data.customer || 'Walk-in'}</div>
              </div>
            </div>
          </div>
          <div class="card">
            ${commonTable}
            ${totalsBlock(data)}
          </div>
        </div>
      </body>
      </html>
    `
  }

  return `
    <html>
    <head>
      <title>${data.id}</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="wrap">
        <div class="row">
          <div>
            <h1 class="title">Invoice</h1>
            <div class="muted">Customer: ${data.customer || 'Walk-in'}</div>
          </div>
          <div style="text-align:right">
            <div><strong>${data.id}</strong></div>
            <div class="muted">${data.time}</div>
          </div>
        </div>
        ${commonTable}
        ${totalsBlock(data)}
      </div>
    </body>
    </html>
  `
}

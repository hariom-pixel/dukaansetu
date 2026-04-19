import {
  renderInvoiceTemplate,
  type InvoiceTemplateKey,
  type ReceiptData,
} from "@/lib/invoiceTemplates";
import { toast } from "sonner";

export function openPrintWindow(
  data: ReceiptData,
  template: InvoiceTemplateKey
) {
  const w = window.open("", "_blank", "width=900,height=760");
  if (!w) return;

  w.document.write(renderInvoiceTemplate(template, data));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 200);
}

export async function shareReceiptText(data: ReceiptData) {
  const text = [
    `Invoice ${data.id}`,
    `Customer: ${data.customer || "Walk-in"}`,
    ...data.items.map((i) => `${i.name} x${i.qty} — ₹${i.price * i.qty}`),
    "",
    `Subtotal: ₹${data.subtotal}`,
    `Discount: ₹${data.discount}`,
    `GST: ₹${data.tax}`,
    `Total: ₹${data.total}`,
    `Date: ${data.time}`,
  ].join("\n");

  try {
    if (navigator.share) {
      await navigator.share({ title: data.id, text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Receipt copied to clipboard");
  } catch {
    // ignore
  }
}
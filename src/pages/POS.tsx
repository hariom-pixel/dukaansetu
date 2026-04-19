import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScanBarcode, Search, Plus, Minus, X, CreditCard, Wallet, Smartphone, Receipt, User, Percent, PauseCircle, PlayCircle, Printer, Share2 } from "lucide-react";
import { POS_PRODUCTS, RECENT_INVOICES, fmtINR, type Product, type Invoice } from "@/lib/mockData";
import {
  type InvoiceTemplateKey,
} from "@/lib/invoiceTemplates";
import { openPrintWindow, shareReceiptText } from "@/lib/receiptActions";
import { useLocalStore, useLocalObject, newId } from "@/hooks/useLocalStore";
import { toast } from "sonner";

interface CartItem { sku: string; name: string; price: number; qty: number; }
interface HeldBill { id: string; cart: CartItem[]; createdAt: string; }

export default function POS() {
  const products = useLocalStore<Product>("erp.products", POS_PRODUCTS);
  const invoices = useLocalStore<Invoice>("erp.invoices", RECENT_INVOICES);
  const [held, setHeld] = useLocalObject<HeldBill[]>("erp.heldBills", []);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeHoldId, setActiveHoldId] = useState<string | null>(null);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; items: CartItem[]; subtotal: number; discount: number; tax: number; total: number; time: string } | null>(null);

  const [template, setTemplate] = useState<InvoiceTemplateKey>("thermal");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const filtered = products.items.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const add = (p: Product) => {
    setCart(c => {
      const ex = c.find(i => i.sku === p.sku);
      if (ex) return c.map(i => i.sku === p.sku ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { sku: p.sku, name: p.name, price: p.price, qty: 1 }];
    });
  };
  const upd = (sku: string, d: number) => setCart(c => c.map(i => i.sku === sku ? { ...i, qty: Math.max(0, i.qty + d) } : i).filter(i => i.qty > 0));
  const remove = (sku: string) => setCart(c => c.filter(i => i.sku !== sku));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Math.round(subtotal * 0.05);
  const tax = Math.round((subtotal - discount) * 0.05);
  const total = subtotal - discount + tax;

  const charge = () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    const id = newId("INV");
    invoices.add({ id, customer: "Walk-in", channel: "POS", amount: total, status: "Paid", time: "Just now" });
    cart.forEach(ci => {
      const prod = products.items.find(p => p.sku === ci.sku);
      if (prod) products.update(prod.id, { stock: Math.max(0, prod.stock - ci.qty) });
    });
    // remove from held if resumed
    if (activeHoldId) {
      setHeld(held.filter(h => h.id !== activeHoldId));
      setActiveHoldId(null);
    }
    setReceipt({ id, items: cart, subtotal, discount, tax, total, time: new Date().toLocaleString() });
    toast.success(`Bill ${id} created for ${fmtINR(total)}`);
    setCart([]);
  };

  const holdBill = () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    const id = activeHoldId ?? newId("HOLD");
    const entry: HeldBill = { id, cart, createdAt: new Date().toLocaleString() };
    const next = activeHoldId
      ? held.map(h => h.id === activeHoldId ? entry : h)
      : [entry, ...held];
    setHeld(next);
    setCart([]);
    setActiveHoldId(null);
    toast.success(`Bill held as ${id}`);
  };

  const resumeHold = (h: HeldBill) => {
    if (cart.length > 0 && !activeHoldId) {
      // auto-hold current cart first
      const id = newId("HOLD");
      setHeld([{ id, cart, createdAt: new Date().toLocaleString() }, ...held.filter(x => x.id !== h.id)]);
    } else {
      setHeld(held.filter(x => x.id !== h.id));
    }
    setCart(h.cart);
    setActiveHoldId(h.id);
    setHoldsOpen(false);
    toast.success(`Resumed ${h.id}`);
  };

  const deleteHold = (id: string) => {
    setHeld(held.filter(h => h.id !== id));
    toast.success(`Removed ${id}`);
  };

  const printReceipt = () => {
    if (!receipt) return;
    openPrintWindow(
      {
        ...receipt,
       customer: {
          name: "Walk-in",
        },
        gstMode: "with",
        paymentMode: "UPI",
      },
      template
    );
  };


  const shareReceipt = async () => {
    if (!receipt) return;
    await shareReceiptText({
      ...receipt,
      customer: {
        name: "Walk-in",
      },
      gstMode: "with",
      paymentMode: "UPI",
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="POS · Cashier · Bandra"
        title="Quick billing"
        subtitle="Scan or search products. Use ⌘K for instant lookup."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setHoldsOpen(true)}>
              <PlayCircle className="h-4 w-4" /> Held bills
              {held.length > 0 && <Badge className="ml-1 h-5 px-1.5">{held.length}</Badge>}
            </Button>
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Drawer #2 open</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Product picker */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4 border border-border shadow-soft rounded-xl bg-card">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  autoFocus
                  placeholder="Search item or scan barcode"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-11 h-11 text-sm font-medium border border-border focus-visible:ring-2 focus-visible:ring-primary/20 rounded-lg bg-background"
                />
              </div>
              <Button size="lg" variant="outline" className="h-12 gap-1.5"><Search className="h-4 w-4" /> Browse</Button>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(p => (
              <button
                key={p.sku}
                onClick={() => add(p)}
                className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary transition-smooth"
              >
                <div className="h-14 mb-3 rounded-lg bg-secondary flex items-center justify-center">
                  <span className="font-display font-extrabold text-2xl text-primary/40">{p.name.slice(0,2).toUpperCase()}</span>
                </div>
                <div className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono-num font-bold text-primary">{fmtINR(p.price)}</span>
                  <span className="text-[10px] text-muted-foreground font-mono-num">{p.stock} in stock</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-2">
          <Card className="p-0 border border-border shadow-soft rounded-xl bg-card overflow-hidden">
            <div className="p-4 bg-primary text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-90 uppercase tracking-widest font-semibold">
                    {activeHoldId ? "Resumed bill" : "Current bill"}
                  </div>
                  <div className="font-display font-extrabold text-xl">#{activeHoldId ?? "NEW"}</div>
                </div>
                <Button size="sm" variant="secondary" className="gap-1.5 bg-white/20 text-primary-foreground border-0 hover:bg-white/30">
                  <User className="h-4 w-4" /> Add customer
                </Button>
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-3 space-y-2">
              {cart.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Cart is empty. Start scanning items.
                </div>
              )}
              {cart.map(i => (
                <div key={i.sku} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/30 group">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{i.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono-num">{fmtINR(i.price)} × {i.qty}</div>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => upd(i.sku, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center font-mono-num font-bold text-sm">{i.qty}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => upd(i.sku, +1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <div className="w-16 text-right font-mono-num font-bold text-sm">{fmtINR(i.price * i.qty)}</div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => remove(i.sku)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border bg-secondary/30 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-mono-num">{fmtINR(subtotal)}</span></div>
              <div className="flex justify-between text-success"><span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Discount (5%)</span><span className="font-mono-num">- {fmtINR(discount)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST (5%)</span><span className="font-mono-num">+ {fmtINR(tax)}</span></div>
              <div className="flex justify-between items-end pt-2 border-t border-border">
                <span className="font-display font-bold">Total</span>
                <span className="font-display font-extrabold text-2xl text-primary font-mono-num">{fmtINR(total)}</span>
              </div>
            </div>

            <div className="p-4 border-t border-border space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="flex-col h-16 gap-1"><Wallet className="h-4 w-4" /><span className="text-[11px]">Cash</span></Button>
                <Button variant="outline" className="flex-col h-16 gap-1 border-primary bg-primary/10"><Smartphone className="h-4 w-4 text-primary" /><span className="text-[11px] font-semibold text-primary">UPI</span></Button>
                <Button variant="outline" className="flex-col h-16 gap-1"><CreditCard className="h-4 w-4" /><span className="text-[11px]">Card</span></Button>
              </div>
              <Button
                size="lg"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold"
                onClick={charge}
              >
                Charge {fmtINR(total)}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={holdBill}>
                  <PauseCircle className="h-3 w-3 mr-1" /> Hold
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => setHoldsOpen(true)}>
                  <PlayCircle className="h-3 w-3 mr-1" /> Resume
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Held bills dialog */}
      <Dialog open={holdsOpen} onOpenChange={setHoldsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Held bills</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {held.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No held bills yet. Use Hold to park a cart.</div>}
            {held.map(h => {
              const t = h.cart.reduce((s, i) => s + i.price * i.qty, 0);
              return (
                <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{h.id}</div>
                    <div className="text-xs text-muted-foreground">{h.cart.length} items · {h.createdAt}</div>
                  </div>
                  <div className="font-mono-num font-bold text-sm">{fmtINR(t)}</div>
                  <Button size="sm" onClick={() => resumeHold(h)}>Resume</Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteHold(h.id)}><X className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog with print/share */}
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
          <DialogTitle>Receipt {receipt?.id}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Template</div>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as InvoiceTemplateKey)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="thermal">Thermal</option>
            <option value="gstClassic">GST Classic</option>
            <option value="modern">Modern</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>
          {/* <DialogHeader><DialogTitle>Receipt {receipt?.id}</DialogTitle></DialogHeader> */}
          {receipt && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                  Preview style: <span className="font-medium text-foreground">{template}</span>
            </div>
              <div className="rounded-lg border border-border p-4 bg-secondary/30 font-mono text-xs">
                <div className="text-center font-bold text-base mb-1">Friendly Retail</div>
                <div className="text-center text-muted-foreground mb-3">Bandra · Drawer #2</div>
                <div className="flex justify-between mb-2"><span>{receipt.id}</span><span>{receipt.time}</span></div>
                <div className="border-t border-dashed border-border pt-2 space-y-1">
                  {receipt.items.map(i => (
                    <div key={i.sku} className="flex justify-between gap-2">
                      <span className="truncate">{i.name} ×{i.qty}</span>
                      <span className="font-mono-num">{fmtINR(i.price * i.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-border mt-2 pt-2 space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmtINR(receipt.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Discount</span><span>- {fmtINR(receipt.discount)}</span></div>
                  <div className="flex justify-between"><span>GST</span><span>+ {fmtINR(receipt.tax)}</span></div>
                  <div className="flex justify-between font-bold text-sm border-t border-border pt-1 mt-1"><span>TOTAL</span><span>{fmtINR(receipt.total)}</span></div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={shareReceipt} className="gap-1.5"><Share2 className="h-4 w-4" /> Share</Button>
            <Button onClick={printReceipt} className="gap-1.5"><Printer className="h-4 w-4" /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

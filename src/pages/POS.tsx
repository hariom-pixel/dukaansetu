import { useEffect, useMemo, useState, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ScanBarcode,
  Search,
  Plus,
  Minus,
  X,
  CreditCard,
  Wallet,
  Smartphone,
  Receipt,
  User,
  Percent,
  PauseCircle,
  PlayCircle,
  Printer,
  Share2,
} from "lucide-react";
import { fmtINR } from "@/lib/format";
import { type InvoiceTemplateKey } from "@/lib/invoiceTemplates";
import { openPrintWindow, shareReceiptText } from "@/lib/receiptActions";
import { newId } from "@/hooks/useLocalStore";
import {
  getHeldBills,
  saveHeldBill,
  deleteHeldBill,
  type HeldBillRow,
} from "@/services/held-bill-db.service";
import { toast } from "sonner";
import { createSale } from "@/services/pos-db.service";
import { getAllProducts, getTopSellingProducts, createProductFromBarcode, type ProductRow } from "@/services/product-db.service";
import { getAllCustomers,findOrCreateCustomer, type CustomerRow } from "@/services/customer-db.service";
import { getNextInvoiceNumber } from "@/services/invoice-sequence-db.service";


interface CartItem {
  sku: string;
  name: string;
  price: number;
  qty: number;
  hsnCode?: string | null;
  gstRate?: number;
  taxAmount?: number;
  taxInclusive?: boolean;
  taxableAmount?: number;
}

interface HeldBill {
  id: string;
  cart: CartItem[];
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  discountValue?: number;
  discountType?: "percent" | "flat";
  gstMode?: "with" | "without";
  gstRate?: number;
  paymentMode?: PaymentMode;
}

type PaymentMode = "Cash" | "UPI" | "Card";

type ReceiptState = {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountValue: number;
  discountType: "percent" | "flat";
  tax: number;
  gstRate: number;
  total: number;
  time: string;
  customer: {
    name: string;
    phone?: string;
  };
  gstMode: "with" | "without";
  paymentMode: PaymentMode;
};

export default function POS() {

  const [held, setHeld] = useState<HeldBill[]>([]);

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeHoldId, setActiveHoldId] = useState<string | null>(null);
  const [holdsOpen, setHoldsOpen] = useState(false);

  const [template, setTemplate] = useState<InvoiceTemplateKey>("thermal");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [gstMode, setGstMode] = useState<"with" | "without">("with");
  const [gstRate, setGstRate] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [saleMode, setSaleMode] = useState<"paid" | "credit">("paid");

  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");

  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [quickProducts, setQuickProducts] = useState<ProductRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

  const [unknownBarcodeOpen, setUnknownBarcodeOpen] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState("");
  const [newBarcodeProduct, setNewBarcodeProduct] = useState({
    name: "",
    price: "",
    stock: "1",
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scanBufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  const currentCustomer = {
    name: customerName.trim() || "Walk-in",
    phone: customerPhone.trim() || "",
  }

  async function loadCustomers() {
    const rows = await getAllCustomers();
    setCustomers(rows);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return quickProducts;
    }

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
    );
  }, [products, quickProducts, query]);

  const add = (p: ProductRow) => {
     const existing = cart.find((i) => i.sku === p.sku);
      const qty = existing ? existing.qty + 1 : 1;

      if (qty > p.stock) {
        toast.error("Not enough stock");
        return;
      }
    setCart((c) => {
      const ex = c.find((i) => i.sku === p.sku);
      if (ex)
        return c.map((i) =>
          i.sku === p.sku ? { ...i, qty: i.qty + 1 } : i
        );
      return [
        ...c,
        {
          sku: p.sku,
          name: p.name,
          price: p.price,
          qty: 1,
          hsnCode: p.hsnCode ?? null,
          gstRate: Number(p.gstRate || 0),
          taxInclusive: Number(p.taxInclusive ?? 1) === 1,
        },
      ];
    });
    setQuery("");
  };

  const upd = (sku: string, d: number) =>
    setCart((c) =>
      c
        .map((i) => {
          if (i.sku !== sku) return i;

          const product = products.find((p) => p.sku === sku);
          const nextQty = Math.max(0, i.qty + d);

          if (d > 0 && product && nextQty > product.stock) {
            toast.error("Not enough stock");
            return i;
          }

          return { ...i, qty: nextQty };
        })
        .filter((i) => i.qty > 0)
  );

  const remove = (sku: string) =>
    setCart((c) => c.filter((i) => i.sku !== sku));

    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const safeDiscountValue =
      discountType === "percent"
        ? Math.min(Math.max(discountValue || 0, 0), 100)
        : Math.max(discountValue || 0, 0);

    const rawDiscount =
      discountType === "percent"
        ? (subtotal * safeDiscountValue) / 100
        : safeDiscountValue;

    const discount = Math.min(Math.round(rawDiscount), subtotal);

  const lineBreakups = cart.map((item) => {
    const lineAmount = item.price * item.qty;

    const discountShare =
      subtotal > 0 ? (lineAmount / subtotal) * discount : 0;

    const afterDiscount = Math.max(lineAmount - discountShare, 0);

    const itemGstRate = gstMode === "with" ? Number(item.gstRate || 0) : 0;
    const isInclusive = Boolean(item.taxInclusive);

    let taxableAmount = afterDiscount;
    let taxAmount = 0;
    let finalAmount = afterDiscount;

    if (gstMode === "with" && itemGstRate > 0) {
      if (isInclusive) {
        taxableAmount = afterDiscount / (1 + itemGstRate / 100);
        taxAmount = afterDiscount - taxableAmount;
        finalAmount = afterDiscount;
      } else {
        taxableAmount = afterDiscount;
        taxAmount = (taxableAmount * itemGstRate) / 100;
        finalAmount = taxableAmount + taxAmount;
      }
    }

    return {
      sku: item.sku,
      lineAmount,
      discountShare,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      gstRate: itemGstRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
      taxInclusive: isInclusive,
    };
  });

  const taxableAmount = lineBreakups.reduce(
    (sum, line) => sum + line.taxableAmount,
    0
  );

  const tax = lineBreakups.reduce(
    (sum, line) => sum + line.taxAmount,
    0
  );

  const total = Math.round(
    lineBreakups.reduce((sum, line) => sum + line.finalAmount, 0)
  );

const safeGstRate = 0;

  const customerResults = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();

    if (!q) return customers.slice(0, 8);

    return customers.filter(
      (c) =>
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q)
    );
  }, [customers, customerQuery]);

  const charge = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    for (const ci of cart) {
      const prod = products.find((p) => p.sku === ci.sku)

      if (!prod || prod.stock < ci.qty) {
        toast.error(`Stock issue for ${ci.name}`)
        return
      }
    }

    const customerId =
    currentCustomer.name !== "Walk-in"
    ? await findOrCreateCustomer({
        name: currentCustomer.name,
        phone: currentCustomer.phone,
      })
    : null;

    let id = "";

    try {
      id = await createSale(
        {
          customerId,
          customerName: currentCustomer.name,
          customerPhone: currentCustomer.phone,
          subtotal,
          discount,
          discountValue: safeDiscountValue,
          discountType,
          tax,
          gstRate: safeGstRate,
          gstMode,
          total,
          paymentMode,
          saleMode,
        },
        cart.map((item) => {
          const breakup = lineBreakups.find((l) => l.sku === item.sku);

          return {
            ...item,
            gstRate: breakup?.gstRate ?? Number(item.gstRate || 0),
            taxAmount: breakup?.taxAmount ?? 0,
            taxableAmount: breakup?.taxableAmount ?? 0,
            taxInclusive: breakup?.taxInclusive ?? Boolean(item.taxInclusive),
            hsnCode: item.hsnCode ?? null,
          };
        })
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save bill");
      return;
    }

    await loadProducts();
    await loadCustomers();

    if (activeHoldId) {
      await deleteHeldBill(activeHoldId);
      const rows = await getHeldBills();
      setHeld(rows as HeldBill[]);
      setActiveHoldId(null);
    }

    setReceipt({
      id,
      items: cart,
      subtotal,
      discount,
      discountValue: safeDiscountValue,
      discountType,
      tax,
      gstRate: safeGstRate,
      total,
      time: new Date().toLocaleString(),
      customer: currentCustomer,
      gstMode,
      paymentMode,
    });

    toast.success(`Bill ${id} created for ${fmtINR(total)}`);

    setDiscountValue(0);
    setDiscountType("percent");
    setGstMode("with");
    setGstRate(0);
    setPaymentMode("UPI");
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setQuery("");
    setSaleMode("paid");
  };

  const holdBill = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const id = activeHoldId ?? newId("HOLD");

    const entry: HeldBill = {
      id,
      cart,
      createdAt: new Date().toLocaleString(),
      customerName: currentCustomer.name,
      customerPhone: currentCustomer.phone,
      discountValue: safeDiscountValue,
      discountType,
      gstMode,
      gstRate: safeGstRate,
      paymentMode,
    };

    try {
      await saveHeldBill(entry as HeldBillRow);

      const rows = await getHeldBills();
      setHeld(rows as HeldBill[]);

      setCart([]);
      setActiveHoldId(null);
      setCustomerName("");
      setCustomerPhone("");

      toast.success(`Bill held as ${id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to hold bill");
    }
  };

  const resumeHold = async (h: HeldBill) => {
    try {
      if (cart.length > 0 && !activeHoldId) {
        const id = newId("HOLD");

        const currentEntry: HeldBill = {
          id,
          cart,
          createdAt: new Date().toLocaleString(),
          customerName: currentCustomer.name,
          customerPhone: currentCustomer.phone,
          discountValue: safeDiscountValue,
          discountType,
          gstMode,
          gstRate: safeGstRate,
          paymentMode,
        };

        await saveHeldBill(currentEntry as HeldBillRow);
      }

      await deleteHeldBill(h.id);

      const rows = await getHeldBills();
      setHeld(rows as HeldBill[]);

      setCart(h.cart);
      setCustomerName(h.customerName || "");
      setCustomerPhone(h.customerPhone || "");
      setActiveHoldId(h.id);
      setHoldsOpen(false);
      setDiscountValue(h.discountValue ?? 0);
      setDiscountType(h.discountType ?? "percent");
      setGstMode(h.gstMode ?? "with");
      setGstRate(h.gstRate ?? 5);
      setPaymentMode(h.paymentMode ?? "UPI");

      toast.success(`Resumed ${h.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to resume held bill");
    }
  };

  const deleteHold = async (id: string) => {
    try {
      await deleteHeldBill(id);

      const rows = await getHeldBills();
      setHeld(rows as HeldBill[]);

      toast.success(`Removed ${id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove held bill");
    }
  };

  const printReceipt = () => {
    if (!receipt) return;
    openPrintWindow(receipt, template);
  };

  const shareReceipt = async () => {
    if (!receipt) return;
    await shareReceiptText(receipt);
  };

  async function loadProducts() {
    const [allRows, topRows] = await Promise.all([
      getAllProducts(),
      getTopSellingProducts(8),
    ]);

    setProducts(allRows);
    setQuickProducts(topRows.length > 0 ? topRows : allRows.slice(0, 8));
  }

  useEffect(() => {
    loadProducts().catch(console.error);
    loadCustomers().catch(console.error);

    getHeldBills()
      .then((rows) => setHeld(rows as HeldBill[]))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Fast typing = scanner
      if (timeDiff < 50) {
        if (e.key === "Enter") {
          const scanned = scanBufferRef.current.trim().toLowerCase();
          scanBufferRef.current = "";

          if (!scanned) return;

          const exactMatch = products.find(
            (p) =>
              String(p.barcode || "").toLowerCase() === scanned ||
              String(p.sku || "").toLowerCase() === scanned
          );

          if (exactMatch) {
            add(exactMatch);
            toast.success(`${exactMatch.name} added`);
          } else {
            setUnknownBarcode(scanned);
            setNewBarcodeProduct({
              name: "",
              price: "",
              stock: "1",
            });
            setUnknownBarcodeOpen(true);
            toast.error("Barcode not found. Add product details.");
          }

          // Clear visible input also
          setQuery("");
          return;
        }

        if (e.key.length === 1) {
          scanBufferRef.current += e.key;
        }
      } else {
        // Slow typing = human → reset buffer
        scanBufferRef.current = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [products]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const saveUnknownBarcodeProduct = async () => {
    const name = newBarcodeProduct.name.trim();
    const price = Number(newBarcodeProduct.price) || 0;
    const stock = Number(newBarcodeProduct.stock) || 0;

    if (!unknownBarcode.trim()) {
      toast.error("Barcode missing");
      return;
    }

    if (!name) {
      toast.error("Product name required");
      return;
    }

    if (price <= 0) {
      toast.error("Enter valid price");
      return;
    }

    if (stock < 0) {
      toast.error("Enter valid stock");
      return;
    }

    const sku = `SKU-${unknownBarcode}`;

    try {
      await createProductFromBarcode({
        sku,
        name,
        barcode: unknownBarcode,
        price,
        costPrice: 0,
        stock,
        category: "General",
      });

      await loadProducts();

      const createdProduct: ProductRow = {
        id: Date.now() as any,
        sku,
        name,
        barcode: unknownBarcode,
        price,
        stock,
        category: "General",
        reorder_level: 10,
        created_at: Date.now(),
        updated_at: Date.now(),
      } as any;

      add(createdProduct);

      setUnknownBarcodeOpen(false);
      setUnknownBarcode("");
      setNewBarcodeProduct({
        name: "",
        price: "",
        stock: "1",
      });

      toast.success(`${name} added and placed in cart`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create product");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="POS · Cashier · Bandra"
        title="Quick billing"
        subtitle="Search or scan products, manage held bills, and complete checkout quickly."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setHoldsOpen(true)}
            >
              <PlayCircle className="h-4 w-4" /> Held bills
              {held.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5">{held.length}</Badge>
              )}
            </Button>
            <Badge
              variant="outline"
              className="border-success/30 bg-success/10 text-success gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
            </Badge>
          </div>
        }
      />
      <div className="h-px bg-border mb-4"></div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)_310px] gap-5 items-start">
        {/* Left: product picker */}
        <div className="space-y-4">
          <Card className="p-3 border border-border shadow-soft rounded-xl bg-card">
            <div className="space-y-3">
            <div className="relative">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                autoFocus
                placeholder="Search item or scan barcode"
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-11 h-11 text-sm font-medium border border-border focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:shadow-sm rounded-lg bg-background"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;

                  const scanned = query.trim().toLowerCase();

                  const exactMatch =
                    products.find(
                      (p) =>
                        String(p.barcode || "").toLowerCase() === scanned ||
                        String(p.sku || "").toLowerCase() === scanned
                    ) || filtered[0];

                  if (exactMatch) {
                    add(exactMatch);
                    toast.success("Item added");
                  } else {
                    setUnknownBarcode(scanned);
                    setNewBarcodeProduct({
                      name: "",
                      price: "",
                      stock: "1",
                    });
                    setUnknownBarcodeOpen(true);
                    toast.error("Barcode not found. Add product.");
                  }
                }}
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center gap-1.5 h-9 text-sm"
              onClick={() => setQuery("")}
            >
              <Search className="h-4 w-4" /> Browse all items
            </Button>
          </div>
          </Card>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {query.trim() ? "Search results" : "Frequently sold"}
            </h4>
            <span className="text-xs text-muted-foreground">
              {query.trim() ? `${filtered.length} results` : `Top ${filtered.length} items`}
            </span>
          </div>
          <Card className="p-3 border border-border rounded-xl bg-card">
            <div className="grid grid-cols-1 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.sku}
                  onClick={() => add(p)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary/40 hover:border-primary transition-all active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono-num">
                      {p.sku}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono-num font-bold text-primary text-sm">
                      {fmtINR(p.price)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Stock {p.stock}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Center: cart */}
        <Card className="p-0 border border-border shadow-soft rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 bg-secondary border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  {activeHoldId ? "Resumed bill" : "Current bill"}
                </div>
                <div className="font-display font-semibold text-[28px] leading-none text-foreground">
                  #{activeHoldId ?? "NEW"}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCustomerQuery("");
                  setCustomerPickerOpen(true);
                }}
              >
                <User className="h-4 w-4" /> Add customer
              </Button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-border bg-secondary/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Customer name"
              value={customerName}
              className="h-10"
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              placeholder="Phone number"
              value={customerPhone}
              className="h-10"
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <div className="min-h-[320px] max-h-[420px] overflow-y-auto">
            <table className="w-full text-[13px] erp-table">
              <thead>
                <tr>
                  <th className="text-left w-[42%]">Item</th>
                  <th className="text-right w-[18%]">Qty</th>
                  <th className="text-right w-[14%]">Rate</th>
                  <th className="text-right w-[18%]">Amount</th>
                  <th className="text-right w-[8%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-16 text-muted-foreground text-xs"
                    >
                      <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Cart is empty. Start scanning items.
                    </td>
                  </tr>
                )}

                {cart.map((i) => (
                  <tr
                    key={i.sku}
                    className="border-b border-border/60 odd:bg-transparent even:bg-secondary/20 hover:bg-secondary/30"
                  >
                    <td>
                      <div className="font-medium text-sm text-foreground">{i.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono-num mt-0.5">
                        {fmtINR(i.price)} × {i.qty}
                      </div>
                    </td>

                    <td className="text-right">
                      <div className="inline-flex items-center gap-1 bg-secondary/70 rounded-lg px-1 py-0.5 shadow-none">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => upd(i.sku, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-mono-num font-bold text-sm">
                          {i.qty}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => upd(i.sku, +1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>

                    <td className="text-right font-mono-num">
                      {fmtINR(i.price)}
                    </td>
                    <td className="text-right font-mono-num font-bold">
                      {fmtINR(i.price * i.qty)}
                    </td>
                    <td className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove(i.sku)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right: summary */}
        <Card className="p-4 border border-border shadow-soft rounded-xl bg-card sticky top-20">
          <h4 className="text-sm font-semibold mb-4">Summary</h4>

          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                GST mode
              </div>
              <select
                value={gstMode}
                onChange={(e) =>
                  setGstMode(e.target.value as "with" | "without")
                }
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="with">With GST</option>
                <option value="without">Without GST</option>
              </select>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Sale mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={saleMode === "paid" ? "default" : "outline"}
                  className={saleMode === "paid" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                  onClick={() => setSaleMode("paid")}
                >
                  Paid
                </Button>
                <Button
                  variant={saleMode === "credit" ? "default" : "outline"}
                  className={saleMode === "credit" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                  onClick={() => setSaleMode("credit")}
                >
                  Udhaar
                </Button>
              </div>
            </div>

            {saleMode === "paid" && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Payment method
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={paymentMode === "Cash" ? "default" : "outline"}
                    className={`flex-col h-12 gap-1 ${
                      paymentMode === "Cash"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : ""
                    }`}
                    onClick={() => setPaymentMode("Cash")}
                  >
                    <Wallet
                      className={`h-4 w-4 ${
                        paymentMode === "Cash" ? "text-primary-foreground" : ""
                      }`}
                    />
                    <span
                      className={`text-[10px] ${
                        paymentMode === "Cash"
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Cash
                    </span>
                  </Button>

                  <Button
                    variant={paymentMode === "UPI" ? "default" : "outline"}
                    className={`flex-col h-12 gap-1 ${
                      paymentMode === "UPI"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : ""
                    }`}
                    onClick={() => setPaymentMode("UPI")}
                  >
                    <Smartphone
                      className={`h-4 w-4 ${
                        paymentMode === "UPI" ? "text-primary-foreground" : ""
                      }`}
                    />
                    <span
                      className={`text-[10px] ${
                        paymentMode === "UPI"
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      UPI
                    </span>
                  </Button>

                  <Button
                    variant={paymentMode === "Card" ? "default" : "outline"}
                    className={`flex-col h-12 gap-1 ${
                      paymentMode === "Card"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : ""
                    }`}
                    onClick={() => setPaymentMode("Card")}
                  >
                    <CreditCard
                      className={`h-4 w-4 ${
                        paymentMode === "Card" ? "text-primary-foreground" : ""
                      }`}
                    />
                    <span
                      className={`text-[10px] ${
                        paymentMode === "Card"
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Card
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Discount
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={discountType === "percent" ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                className="h-9"
                placeholder={discountType === "percent" ? "0-100" : "Amount"}
              />
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percent" | "flat")
                }
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="percent">%</option>
                <option value="flat">₹</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 text-sm mt-5 rounded-lg bg-secondary/25 p-3 border border-border/60">
            <div className="flex justify-between text-muted-foreground">
              <span>Item total</span>
              <span className="font-mono-num">{fmtINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-success">
              <span className="flex items-center gap-1">
                Discount {discountType === "percent" ? `(${safeDiscountValue}%)` : "(₹)"}
              </span>
              <span className="font-mono-num">- {fmtINR(discount)}</span>
            </div>
            {gstMode === "with" && (
              <div className="flex justify-between text-muted-foreground">
                <span>Taxable value</span>
                <span className="font-mono-num">{fmtINR(taxableAmount)}</span>
              </div>
            )}
            {gstMode === "with" && (
              <div className="flex justify-between text-muted-foreground">
                <span>GST included/added</span>
                <span className="font-mono-num">+ {fmtINR(tax)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-3 mt-2 border-t border-border">
              <span className="font-display font-bold">Total</span>
              <span className="font-display font-extrabold text-[28px] text-primary tracking-tight font-mono-num">
                {fmtINR(total)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="outline" className="h-10" onClick={holdBill}>
              <PauseCircle className="h-4 w-4 mr-1" /> Hold
            </Button>
            <Button variant="outline"  className="h-10" onClick={() => setHoldsOpen(true)}>
              <PlayCircle className="h-4 w-4 mr-1" /> Resume
            </Button>
          </div>

          <Button
            size="lg"
            className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-sm font-semibold shadow-sm active:scale-[0.98]"
            onClick={charge}
          >
            {saleMode === "credit" ? `Save Udhaar ${fmtINR(total)}` : `Charge ${fmtINR(total)}`}
          </Button>
        </Card>
      </div>

      <Dialog open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select customer</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Search customer name or phone"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
            />

            <div className="max-h-[360px] overflow-y-auto space-y-2">
              {customerResults.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No customers found.
                </div>
              )}

              {customerResults.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary/30 transition-smooth"
                  onClick={() => {
                    setCustomerName(c.name || "");
                    setCustomerPhone(c.phone || "");
                    setCustomerPickerOpen(false);
                    toast.success(`Selected ${c.name}`);
                  }}
                >
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.phone || "No phone"}{" "}
                    {c.outstanding ? `· Due ${fmtINR(c.outstanding)}` : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerPickerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Held bills dialog */}
      <Dialog open={holdsOpen} onOpenChange={setHoldsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Held bills</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {held.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No held bills yet. Use Hold to park a cart.
              </div>
            )}

            {held.map((h) => {
              const t = h.cart.reduce((s, i) => s + i.price * i.qty, 0);
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13.5px] text-foreground">{h.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.customerName || "Walk-in"} · {h.cart.length} items ·{" "}
                      {h.createdAt}
                    </div>
                  </div>
                  <div className="font-mono-num font-bold text-sm">
                    {fmtINR(t)}
                  </div>
                  <Button size="sm" onClick={() => resumeHold(h)}>
                    Resume
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteHold(h.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
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

          {receipt && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Preview style:{" "}
                <span className="font-medium text-foreground">{template}</span>
              </div>

              <div className="rounded-lg border border-border p-4 bg-secondary/30 font-mono text-xs">
                <div className="text-center font-bold text-base mb-1">
                  Friendly Retail
                </div>
                <div className="text-center text-muted-foreground mb-3">
                  Bandra · Drawer #2
                </div>

                <div className="flex justify-between mb-1">
                  <span>{receipt.id}</span>
                  <span>{receipt.time}</span>
                </div>

                <div className="mb-2 text-muted-foreground">
                  Customer: {receipt.customer.name}
                  {receipt.customer.phone
                    ? ` · ${receipt.customer.phone}`
                    : ""}
                </div>

                <div className="border-t border-dashed border-border pt-2 space-y-1">
                  {receipt.items.map((i) => (
                    <div key={i.sku} className="flex justify-between gap-2">
                      <span className="truncate">
                        {i.name} ×{i.qty}
                      </span>
                      <span className="font-mono-num">
                        {fmtINR(i.price * i.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-border mt-2 pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{fmtINR(receipt.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>- {fmtINR(receipt.discount)}</span>
                  </div>
                  {receipt.gstMode === "with" && (
                    <div className="flex justify-between">
                      <span>GST ({receipt.gstRate}%)</span>
                      <span>+ {fmtINR(receipt.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-border pt-1 mt-1">
                    <span>TOTAL</span>
                    <span>{fmtINR(receipt.total)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid via</span>
                    <span>{receipt.paymentMode}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={shareReceipt} className="gap-1.5">
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button onClick={printReceipt} className="gap-1.5">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={unknownBarcodeOpen} onOpenChange={setUnknownBarcodeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unknown barcode</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              Barcode:{" "}
              <span className="font-mono-num font-semibold">
                {unknownBarcode}
              </span>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Product name
              </label>
              <Input
                autoFocus
                value={newBarcodeProduct.name}
                onChange={(e) =>
                  setNewBarcodeProduct({
                    ...newBarcodeProduct,
                    name: e.target.value,
                  })
                }
                placeholder="e.g. Amul Milk 500ml"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Selling price
                </label>
                <Input
                  type="number"
                  value={newBarcodeProduct.price}
                  onChange={(e) =>
                    setNewBarcodeProduct({
                      ...newBarcodeProduct,
                      price: e.target.value,
                    })
                  }
                  placeholder="₹"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Opening stock
                </label>
                <Input
                  type="number"
                  value={newBarcodeProduct.stock}
                  onChange={(e) =>
                    setNewBarcodeProduct({
                      ...newBarcodeProduct,
                      stock: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnknownBarcodeOpen(false)}
            >
              Cancel
            </Button>

            <Button onClick={saveUnknownBarcodeProduct}>
              Save & add to cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
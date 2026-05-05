import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, Boxes, AlertTriangle, Clock, Search, Filter, Plus, Download, ArrowRightLeft, Pencil, Trash2 } from "lucide-react";
import { POS_PRODUCTS, LOW_STOCK, EXPIRING, fmtINR, type Product } from "@/lib/mockData";
import { toast } from "sonner";
import { getStockLedger, addStockLedgerEntry, createStockLedgerEntry } from "@/lib/stockLedger";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  updateProductStock,
  debugProductStock,
  deleteProduct,
} from "@/services/product-db.service";


type InventoryProduct = Product & {
  barcode?: string;
  reorderLevel?: number;
};

interface Form {
  sku: string;
  name: string;
  barcode: string;
  price: string;
  reorderLevel: string;
}

const empty: Form = {
  sku: "",
  name: "",
  barcode: "",
  price: "",
  reorderLevel: "20",
};

export default function Inventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [confirmDel, setConfirmDel] = useState<Product | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<InventoryProduct | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const filtered = products.filter((p) =>
    [p.name, p.sku, p.barcode ?? ""].some((s) =>
      s.toLowerCase().includes(query.toLowerCase())
    )
  );

  const liveReorderAlerts = products
  .filter((p) => p.stock <= Number(p.reorderLevel ?? 20))
  .sort((a, b) => a.stock - b.stock)
  .slice(0, 6);

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: InventoryProduct) => {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      barcode: p.barcode ?? "",
      price: String(p.price),
      reorderLevel: String(p.reorderLevel ?? 20),
    });
    setOpen(true);
  };

  const openAdjust = (p: InventoryProduct) => {
    setAdjusting(p);
    setAdjustQty("");
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const submit = async () => {
    if (!form.sku.trim() || !form.name.trim()) {
      toast.error("SKU and name required");
      return;
    }

    const price = Number(form.price) || 0;
    const reorderLevel = Number(form.reorderLevel) || 20;

    try {
      if (editing) {
        await updateProduct(Number(editing.id), {
          name: form.name,
          barcode: form.barcode.trim(),
          price,
          reorderLevel,
        });

        toast.success("Product updated");
      } else {
        if (products.some((p) => p.sku === form.sku)) {
          toast.error("SKU already exists");
          return;
        }

        await createProduct({
          sku: form.sku,
          name: form.name,
          barcode: form.barcode.trim(),
          price,
          stock: 0,
          reorderLevel,
        });

        toast.success("Product added");
      }

      await loadProducts();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save product");
    }
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;

    try {
      await deleteProduct(Number(confirmDel.id));
      await loadProducts();

      toast.success(`${confirmDel.name} deleted`);
      setConfirmDel(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product");
    }
  };

  const submitAdjustment = async () => {
    if (!adjusting) return;

    const qty = Number(adjustQty);
    if (!qty) {
      toast.error("Enter adjustment quantity");
      return;
    }

    const newStock = Math.max(0, adjusting.stock + qty);
    await updateProductStock(Number(adjusting.id), newStock);
    await loadProducts();

    // ADD STOCK LEDGER ENTRY
    addStockLedgerEntry(
      createStockLedgerEntry({
        sku: adjusting.sku,
        productName: adjusting.name,
        qty: Math.abs(qty),
        direction: qty > 0 ? "IN" : "OUT",
        reason: "ADJUSTMENT",
        refId: adjusting.id,
        note: adjustReason || "Manual adjustment",
      })
    );

    toast.success(
      `${adjusting.name} stock adjusted by ${qty > 0 ? "+" : ""}${qty}${
        adjustReason ? ` · ${adjustReason}` : ""
      }`
    );

    setAdjustOpen(false);
    setAdjusting(null);
    setAdjustQty("");
    setAdjustReason("");
  };

  const stockValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const stockLedger = getStockLedger().slice(0, 20);

  const lowCount = products.filter(
    (p) => p.stock <= Number(p.reorderLevel ?? 20)
  ).length;

  async function loadProducts() {
    const rows = await getAllProducts();
    setProducts(rows as InventoryProduct[]);
  }

  useEffect(() => {
    loadProducts().catch(console.error);

    const reloadInventory = () => {
      loadProducts().catch(console.error);
    };

    window.addEventListener("focus", reloadInventory);
    window.addEventListener("visibilitychange", reloadInventory);

    return () => {
      window.removeEventListener("focus", reloadInventory);
      window.removeEventListener("visibilitychange", reloadInventory);
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Inventory & warehouse"
        title="Stock control"
        subtitle="Real-time stock across branches with batch and expiry tracking."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><ArrowRightLeft className="h-4 w-4" /> Transfer</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Catalog exported")}><Download className="h-4 w-4" /> Export</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" /> Add product</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total SKUs" value={String(products.length)} icon={Package} delta={+4} hint="active" accent="primary" />
        <StatCard label="Stock Value" value={fmtINR(stockValue)} icon={Boxes} delta={+11} hint="across branches" accent="success" />
        <StatCard label="Low Stock" value={String(lowCount)} icon={AlertTriangle} delta={-2} hint="needs reorder" accent="warning" />
        <StatCard label="Expiring (30d)" value={String(EXPIRING.length)} icon={Clock} delta={+3} hint="batches" accent="accent" />
      </div>

      <Card className="p-4 mb-4 shadow-soft border-border/60">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search SKU, barcode or product name…" className="pl-9 h-10" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" /> All branches</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-soft border-border/60 overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-display font-bold text-lg">Product catalog</h3>
            <p className="text-xs text-muted-foreground">Showing {filtered.length} of {products.length} products</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-3">Product</th>
                  <th className="text-right font-medium px-4 py-3">Price</th>
                  <th className="text-right font-medium px-4 py-3">Stock</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const low = p.stock <= Number(p.reorderLevel ?? 20);
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-cream flex items-center justify-center text-primary/60 font-display font-bold text-xs shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono-num">
                              {p.sku}
                              {p.barcode ? ` · ${p.barcode}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold">{fmtINR(p.price)}</td>
                      <td className={`px-4 py-3 text-right font-mono-num font-bold ${low ? "text-destructive" : ""}`}>
                        <div>{p.stock}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          reorder {p.reorderLevel ?? 20}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={low ? "bg-warning/10 text-warning border-warning/30" : "bg-success/10 text-success border-success/30"}>
                          {low ? "Low" : "In stock"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 mr-2 text-xs"
                          onClick={() => openAdjust(p)}
                        >
                          Adjust
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setConfirmDel(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">No products match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 shadow-soft border-border/60">
            <h3 className="font-display font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Reorder alerts
            </h3>
            <div className="space-y-2">
              {liveReorderAlerts.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No reorder alerts right now.
                </div>
              ) : (
                liveReorderAlerts.map((p) => (
                  <div key={p.sku} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      SKU: {p.sku}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Stock: <b className="text-destructive font-mono-num">{p.stock}</b> /{" "}
                        {p.reorderLevel ?? 20}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => toast.success(`Reorder raised for ${p.name}`)}
                      >
                        Reorder
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card className="p-5 shadow-soft border-border/60">
            <h3 className="font-display font-bold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-destructive" /> Expiring batches
            </h3>
            <div className="space-y-2">
              {EXPIRING.map((p) => (
                <div key={p.sku} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/60">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono-num">{p.batch} · {p.qty} units</div>
                  </div>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-mono-num">{p.days}d left</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 shadow-soft border-border/60 overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-bold text-lg">
            Stock movement
          </h3>
          <p className="text-xs text-muted-foreground">
            Latest stock changes across sales, purchases and returns
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-center px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Ref</th>
                <th className="text-right px-4 py-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {stockLedger.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{e.productName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono-num">
                      {e.sku}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={
                        e.direction === "IN"
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      }
                    >
                      {e.direction}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-right font-mono-num font-bold">
                    {e.direction === "OUT" ? "-" : "+"}
                    {e.qty}
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {e.reason}
                    {e.note ? ` · ${e.note}` : ""}
                  </td>

                  <td className="px-4 py-3 font-mono-num text-xs text-muted-foreground">
                    {e.refId}
                  </td>

                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {e.date}
                  </td>
                </tr>
              ))}

              {stockLedger.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No stock activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>{editing ? "Update product details." : "Add a new SKU to your catalog."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>SKU</Label>
            <Input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="SKU-XXXX"
              disabled={!!editing}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Product name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Amul Milk 1L"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Barcode</Label>
            <Input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="Optional barcode"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Reorder level</Label>
              <Input
                type="number"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              />
            </div>
          </div>

          {editing && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              Current stock: <span className="font-mono-num font-semibold text-foreground">{editing.stock}</span>
              <div className="mt-1">Use <b>Adjust</b> from the table to change stock quantity.</div>
            </div>
          )}
        </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={submit}>{editing ? "Save changes" : "Add product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              Update stock quantity for {adjusting?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              Current stock:{" "}
              <span className="font-mono-num font-semibold">
                {adjusting?.stock ?? 0}
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label>Adjustment quantity</Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="Use +10 or -5"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Damaged, opening stock, manual count correction..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAdjustment}>Apply adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDel?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This product will be removed from the catalog. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
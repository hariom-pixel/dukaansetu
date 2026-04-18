import { useState } from "react";
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
import { useLocalStore } from "@/hooks/useLocalStore";
import { toast } from "sonner";

interface Form { sku: string; name: string; price: string; stock: string; }
const empty: Form = { sku: "", name: "", price: "", stock: "" };

export default function Inventory() {
  const { items: products, add, update, remove } = useLocalStore<Product>("erp.products", POS_PRODUCTS);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [confirmDel, setConfirmDel] = useState<Product | null>(null);

  const filtered = products.filter((p) =>
    [p.name, p.sku].some((s) => s.toLowerCase().includes(query.toLowerCase()))
  );

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ sku: p.sku, name: p.name, price: String(p.price), stock: String(p.stock) }); setOpen(true); };

  const submit = () => {
    if (!form.sku.trim() || !form.name.trim()) { toast.error("SKU and name required"); return; }
    const price = Number(form.price) || 0;
    const stock = Number(form.stock) || 0;
    if (editing) {
      update(editing.id, { sku: form.sku, name: form.name, price, stock });
      toast.success("Product updated");
    } else {
      if (products.some((p) => p.sku === form.sku)) { toast.error("SKU already exists"); return; }
      add({ id: form.sku, sku: form.sku, name: form.name, price, stock });
      toast.success("Product added");
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!confirmDel) return;
    remove(confirmDel.id);
    toast.success(`${confirmDel.name} deleted`);
    setConfirmDel(null);
  };

  const stockValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowCount = products.filter((p) => p.stock < 40).length;

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
            <Button size="sm" className="bg-gradient-primary shadow-glow gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" /> Add product</Button>
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
                  const low = p.stock < 40;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-cream flex items-center justify-center text-primary/60 font-display font-bold text-xs shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono-num">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold">{fmtINR(p.price)}</td>
                      <td className={`px-4 py-3 text-right font-mono-num font-bold ${low ? "text-destructive" : ""}`}>{p.stock}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={low ? "bg-warning/10 text-warning border-warning/30" : "bg-success/10 text-success border-success/30"}>
                          {low ? "Low" : "In stock"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDel(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
              {LOW_STOCK.map((p) => (
                <div key={p.sku} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">{p.branch}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Stock: <b className="text-destructive font-mono-num">{p.qty}</b> / {p.reorder}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success(`Reorder raised for ${p.name}`)}>Reorder</Button>
                  </div>
                </div>
              ))}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>{editing ? "Update product details." : "Add a new SKU to your catalog."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-XXXX" disabled={!!editing} />
            </div>
            <div className="grid gap-1.5">
              <Label>Product name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amul Milk 1L" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Price (₹)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={submit}>{editing ? "Save changes" : "Add product"}</Button>
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
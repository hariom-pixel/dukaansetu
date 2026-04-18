import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Truck, FileText, Wallet, Plus, ChevronRight, Star, Pencil, Trash2 } from "lucide-react";
import { SUPPLIERS, PURCHASE_ORDERS, fmtINR, type PurchaseOrder, type Supplier } from "@/lib/mockData";
import { useLocalStore, newId } from "@/hooks/useLocalStore";
import { toast } from "sonner";

type Status = PurchaseOrder["status"];
interface POForm { supplier: string; items: string; value: string; status: Status; eta: string; }
const emptyPO: POForm = { supplier: "", items: "", value: "", status: "Draft", eta: "—" };

export default function Purchase() {
  const pos = useLocalStore<PurchaseOrder>("erp.pos", PURCHASE_ORDERS);
  const sup = useLocalStore<Supplier>("erp.suppliers", SUPPLIERS);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<POForm>(emptyPO);
  const [confirmDel, setConfirmDel] = useState<PurchaseOrder | null>(null);

  const openAdd = () => { setEditing(null); setForm({ ...emptyPO, supplier: sup.items[0]?.name || "" }); setOpen(true); };
  const openEdit = (p: PurchaseOrder) => { setEditing(p); setForm({ supplier: p.supplier, items: String(p.items), value: String(p.value), status: p.status, eta: p.eta }); setOpen(true); };

  const submit = () => {
    if (!form.supplier) { toast.error("Supplier required"); return; }
    const items = Number(form.items) || 0;
    const value = Number(form.value) || 0;
    if (editing) {
      pos.update(editing.id, { supplier: form.supplier, items, value, status: form.status, eta: form.eta });
      toast.success("PO updated");
    } else {
      pos.add({ id: newId("PO"), supplier: form.supplier, items, value, status: form.status, eta: form.eta });
      toast.success("PO created");
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!confirmDel) return;
    pos.remove(confirmDel.id);
    toast.success(`${confirmDel.id} deleted`);
    setConfirmDel(null);
  };

  const payables = sup.items.reduce((s, x) => s + x.outstanding, 0);

  return (
    <>
      <PageHeader
        eyebrow="Procurement"
        title="Purchase & suppliers"
        subtitle="Compare suppliers, raise POs, and reconcile invoices in one place."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.success("Goods inward logged")}>Goods inward</Button>
            <Button size="sm" className="bg-gradient-primary shadow-glow gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" /> New PO</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open POs" value={String(pos.items.filter(p => p.status !== "Delivered").length)} icon={FileText} delta={+2} hint="active" accent="primary" />
        <StatCard label="In transit" value={String(pos.items.filter(p => p.status === "In transit").length)} icon={Truck} delta={+1} hint="GRN pending" accent="accent" />
        <StatCard label="Payables" value={fmtINR(payables)} icon={Wallet} delta={-4} hint="due 15d" accent="warning" />
        <StatCard label="Suppliers" value={String(sup.items.length)} icon={Truck} delta={0} hint="active" accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-soft border-border/60 overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">Purchase orders</h3>
            <Button variant="ghost" size="sm" className="text-primary gap-1">All POs <ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-3">PO</th>
                  <th className="text-left font-medium px-4 py-3">Supplier</th>
                  <th className="text-right font-medium px-4 py-3">Items</th>
                  <th className="text-right font-medium px-4 py-3">Value</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.items.map((po) => (
                  <tr key={po.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono-num font-semibold text-primary">{po.id}</td>
                    <td className="px-4 py-3 font-medium">{po.supplier}</td>
                    <td className="px-4 py-3 text-right font-mono-num">{po.items}</td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold">{fmtINR(po.value)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        po.status === "Delivered" ? "bg-success/10 text-success border-success/30" :
                          po.status === "In transit" ? "bg-accent/10 text-accent-foreground border-accent/30" :
                            po.status === "Approval" ? "bg-warning/10 text-warning border-warning/30" :
                              "bg-muted text-muted-foreground border-border"
                      }>{po.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(po)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDel(po)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {pos.items.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No purchase orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 shadow-soft border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Top suppliers</h3>
            <Button size="sm" variant="ghost" className="text-primary text-xs" onClick={() => {
              const name = window.prompt("Supplier name?");
              if (!name) return;
              sup.add({ id: newId("SUP"), name, outstanding: 0, leadDays: 3, rating: 4.5 });
              toast.success("Supplier added");
            }}>+ Add</Button>
          </div>
          <div className="space-y-3">
            {sup.items.map((s) => (
              <div key={s.id} className="p-3 rounded-xl border border-border hover:border-primary/30 hover:shadow-soft transition-smooth group">
                <div className="flex items-start justify-between mb-1">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/30 gap-1 text-[10px]">
                      <Star className="h-3 w-3 fill-current" /> {s.rating}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => { sup.remove(s.id); toast.success("Supplier removed"); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Outstanding</div>
                    <div className="font-mono-num font-bold">{fmtINR(s.outstanding)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Lead time</div>
                    <div className="font-mono-num font-bold">{s.leadDays} days</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit PO" : "New purchase order"}</DialogTitle>
            <DialogDescription>{editing ? "Update PO details." : "Raise a purchase order."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Supplier</Label>
              <Select value={form.supplier} onValueChange={(v) => setForm({ ...form, supplier: v })}>
                <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                <SelectContent>
                  {sup.items.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Items</Label>
                <Input type="number" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Value (₹)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Approval">Approval</SelectItem>
                    <SelectItem value="In transit">In transit</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>ETA</Label>
                <Input value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} placeholder="Tomorrow" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={submit}>{editing ? "Save changes" : "Create PO"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDel?.id}?</AlertDialogTitle>
            <AlertDialogDescription>This purchase order will be removed.</AlertDialogDescription>
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
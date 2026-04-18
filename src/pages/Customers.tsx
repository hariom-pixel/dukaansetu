import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Heart, Sparkles, Plus, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { CUSTOMERS, fmtINR, type Customer } from "@/lib/mockData";
import { useLocalStore, newId } from "@/hooks/useLocalStore";
import { toast } from "sonner";

const tierColor: Record<string, string> = {
  Platinum: "bg-gradient-warm text-primary-foreground",
  Gold: "bg-accent text-accent-foreground",
  Silver: "bg-secondary text-secondary-foreground",
  Bronze: "bg-muted text-muted-foreground",
};

type Loyalty = Customer["loyalty"];
interface Form { name: string; visits: string; spent: string; loyalty: Loyalty; }
const empty: Form = { name: "", visits: "0", spent: "0", loyalty: "Bronze" };

export default function Customers() {
  const { items, add, update, remove } = useLocalStore<Customer>("erp.customers", CUSTOMERS);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [confirmDel, setConfirmDel] = useState<Customer | null>(null);

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, visits: String(c.visits), spent: String(c.spent), loyalty: c.loyalty }); setOpen(true); };

  const submit = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const visits = Number(form.visits) || 0;
    const spent = Number(form.spent) || 0;
    if (editing) {
      update(editing.id, { name: form.name, visits, spent, loyalty: form.loyalty });
      toast.success("Customer updated");
    } else {
      add({ id: newId("C"), name: form.name, visits, spent, loyalty: form.loyalty, last: "Today" });
      toast.success("Customer added");
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!confirmDel) return;
    remove(confirmDel.id);
    toast.success(`${confirmDel.name} removed`);
    setConfirmDel(null);
  };

  const totalSpent = items.reduce((s, c) => s + c.spent, 0);
  const avgLtv = items.length ? Math.round(totalSpent / items.length) : 0;

  return (
    <>
      <PageHeader
        eyebrow="CRM & loyalty"
        title="Customer 360"
        subtitle="Every customer's purchase history, loyalty tier, and lifetime value."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Campaign drafted")}><MessageCircle className="h-4 w-4" /> Campaign</Button>
            <Button size="sm" className="bg-gradient-primary shadow-glow gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" /> New customer</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total customers" value={String(items.length)} icon={Users} delta={+8} hint="this month" accent="primary" />
        <StatCard label="Loyalty members" value={String(items.filter(c => c.loyalty !== "Bronze").length)} icon={Heart} delta={+14} hint="penetration" accent="accent" />
        <StatCard label="Repeat rate" value="62%" icon={Sparkles} delta={+4} hint="vs last mo" accent="success" />
        <StatCard label="Avg LTV" value={fmtINR(avgLtv)} icon={Users} delta={+11} hint="per customer" accent="warning" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((c) => (
          <Card key={c.id} className="p-5 shadow-soft hover:shadow-card transition-smooth border-border/60 group">
            <div className="flex items-start justify-between mb-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-warm text-primary-foreground font-bold">{c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
              </Avatar>
              <Badge className={`${tierColor[c.loyalty]} border-0 shadow-soft`}>{c.loyalty}</Badge>
            </div>
            <div className="font-display font-bold text-base">{c.name}</div>
            <div className="text-[11px] text-muted-foreground font-mono-num mb-3">{c.id} · last visit {c.last}</div>
            <div className="space-y-1.5 pt-3 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lifetime spent</span>
                <span className="font-mono-num font-bold">{fmtINR(c.spent)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Visits</span>
                <span className="font-mono-num font-semibold">{c.visits}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /> Edit</Button>
              <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => setConfirmDel(c)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
            <DialogDescription>{editing ? "Update customer profile." : "Add a customer to your CRM."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rohit Sharma" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Visits</Label>
                <Input type="number" value={form.visits} onChange={(e) => setForm({ ...form, visits: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Lifetime spent (₹)</Label>
                <Input type="number" value={form.spent} onChange={(e) => setForm({ ...form, spent: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Loyalty tier</Label>
              <Select value={form.loyalty} onValueChange={(v) => setForm({ ...form, loyalty: v as Loyalty })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={submit}>{editing ? "Save changes" : "Add customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmDel?.name}?</AlertDialogTitle>
            <AlertDialogDescription>The customer profile will be deleted from your CRM.</AlertDialogDescription>
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
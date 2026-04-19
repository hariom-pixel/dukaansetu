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
import { Receipt, RotateCcw, Banknote, ShoppingCart, Download, Plus, Pencil, Trash2 } from "lucide-react";
import { RECENT_INVOICES, fmtINR, type Invoice } from "@/lib/mockData";
import { useLocalStore, newId } from "@/hooks/useLocalStore";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const data = [
  { day: "Mon", pos: 92000, b2b: 50000, online: 28000 },
  { day: "Tue", pos: 108000, b2b: 42000, online: 34000 },
  { day: "Wed", pos: 124000, b2b: 38000, online: 41000 },
  { day: "Thu", pos: 102000, b2b: 48000, online: 36000 },
  { day: "Fri", pos: 142000, b2b: 56000, online: 48000 },
  { day: "Sat", pos: 168000, b2b: 62000, online: 58000 },
  { day: "Sun", pos: 138000, b2b: 52000, online: 42000 },
];

type Status = Invoice["status"];
interface Form { customer: string; channel: string; amount: string; status: Status; }
const empty: Form = { customer: "", channel: "POS", amount: "", status: "Paid" };

export default function Sales() {
  const { items, add, update, remove } = useLocalStore<Invoice>("erp.invoices", RECENT_INVOICES);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [confirmDel, setConfirmDel] = useState<Invoice | null>(null);

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (i: Invoice) => { setEditing(i); setForm({ customer: i.customer, channel: i.channel, amount: String(i.amount), status: i.status }); setOpen(true); };

  const submit = () => {
    if (!form.customer.trim()) { toast.error("Customer required"); return; }
    const amount = Number(form.amount) || 0;
    if (editing) {
      update(editing.id, { customer: form.customer, channel: form.channel, amount, status: form.status });
      toast.success("Invoice updated");
    } else {
      add({ id: newId("INV"), customer: form.customer, channel: form.channel, amount, status: form.status, time: "Just now" });
      toast.success("Invoice created");
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!confirmDel) return;
    remove(confirmDel.id);
    toast.success(`${confirmDel.id} deleted`);
    setConfirmDel(null);
  };

  const net = items.reduce((s, i) => s + i.amount, 0);
  const avg = items.length ? Math.round(net / items.length) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Sales & billing"
        title="All sales channels"
        subtitle="Walk-in, online, and B2B sales unified in one ledger."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Returns flow opened")}><RotateCcw className="h-4 w-4" /> Returns</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Exported")}><Download className="h-4 w-4" /> Export</Button>
            <Button size="sm" className="bg-gradient-primary shadow-glow gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" /> New invoice</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Invoices" value={String(items.length)} icon={Receipt} delta={+12} hint="all channels" accent="primary" />
        <StatCard label="Net sales" value={fmtINR(net)} icon={Banknote} delta={+17} hint="total" accent="success" />
        <StatCard label="Returns" value={fmtINR(10500)} icon={RotateCcw} delta={-3} hint="this week" accent="warning" />
        <StatCard label="Avg basket" value={fmtINR(avg)} icon={ShoppingCart} delta={+5} hint="per invoice" accent="accent" />
      </div>

      <Card className="p-5 mb-5 border border-border shadow-soft rounded-xl bg-card">
        <h3 className="font-display font-bold text-lg mb-4">Sales by channel · 7 days</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="pos" stackId="a" fill="hsl(16 78% 52%)" />
            <Bar dataKey="b2b" stackId="a" fill="hsl(38 88% 56%)" />
            <Bar dataKey="online" stackId="a" fill="hsl(152 52% 40%)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="border border-border shadow-soft rounded-xl bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-bold text-lg">Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm erp-table">
            <thead className="bg-secondary/60">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left font-medium px-4 py-3">Invoice</th>
                <th className="text-left font-medium px-4 py-3">Customer</th>
                <th className="text-left font-medium px-4 py-3">Channel</th>
                <th className="text-right font-medium px-4 py-3">Amount</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Time</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-mono-num font-semibold text-primary">{inv.id}</td>
                  <td className="px-4 py-3 font-medium">{inv.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.channel}</td>
                  <td className="px-4 py-3 text-right font-mono-num font-bold">{fmtINR(inv.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={
                      inv.status === "Paid" ? "bg-success/10 text-success border-success/30" :
                        inv.status === "Pending" ? "bg-warning/10 text-warning border-warning/30" :
                          "bg-accent/10 text-accent-foreground border-accent/30"
                    }>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{inv.time}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(inv)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDel(inv)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit invoice" : "New invoice"}</DialogTitle>
            <DialogDescription>{editing ? "Update invoice details." : "Add an invoice to the ledger."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Customer</Label>
              <Input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POS">POS</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="B2B">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Amount (₹)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={submit}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDel?.id}?</AlertDialogTitle>
            <AlertDialogDescription>This invoice will be removed permanently.</AlertDialogDescription>
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
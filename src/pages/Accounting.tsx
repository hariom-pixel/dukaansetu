import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Wallet, TrendingUp, FileText, Receipt, Download, Plus, Trash2 } from "lucide-react";
import { JOURNAL_SEED, fmtINR, type JournalEntry } from "@/lib/mockData";
import { useLocalStore, newId } from "@/hooks/useLocalStore";
import { toast } from "sonner";

interface Form { date: string; desc: string; debit: string; credit: string; }
const empty: Form = { date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), desc: "", debit: "0", credit: "0" };

export default function Accounting() {
  const { items, add, remove } = useLocalStore<JournalEntry>("erp.journal", JOURNAL_SEED);
  const invoicesStore = useLocalStore<any>("erp.invoices", []);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [confirmDel, setConfirmDel] = useState<JournalEntry | null>(null);

  const suppliersStore = useLocalStore<any>("erp.suppliers", []);

  const payables = suppliersStore.items.reduce(
    (sum: number, s: any) => sum + (s.outstanding || 0),
    0
  );

  const ledger = useMemo(() => {
    let bal = 0;
    return items.map((l) => { bal += l.credit - l.debit; return { ...l, balance: bal }; });
  }, [items]);

  const submit = () => {
    if (!form.desc.trim()) { toast.error("Description required"); return; }
    const debit = Number(form.debit) || 0;
    const credit = Number(form.credit) || 0;
    add({ id: newId("J"), date: form.date, desc: form.desc, debit, credit });
    toast.success("Journal entry added");
    setOpen(false);
    setForm(empty);
  };

  const confirmDelete = () => {
    if (!confirmDel) return;

    const desc = String(confirmDel.desc || "");

    if (
      desc.includes("Sale") ||
      desc.includes("Purchase") ||
      desc.includes("Payment to") ||
      desc.includes("Invoice payment") ||
      desc.includes("Void invoice")
    ) {
      toast.error("System-generated entries cannot be deleted");
      setConfirmDel(null);
      return;
    }

    remove(confirmDel.id);
    toast.success("Entry removed");
    setConfirmDel(null);
  };

  const cashPos = ledger.length ? ledger[ledger.length - 1].balance : 0;

  const receivables = invoicesStore.items.reduce(
    (sum: number, inv: any) => sum + (inv.dueAmount || 0),
    0
  );

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Accounting & ledgers"
        subtitle="Triple ledger architecture: stock, cash, and customer balances."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("GST report generated")}><Download className="h-4 w-4" /> GST report</Button>
            <Button size="sm" className="bg-gradient-primary shadow-glow gap-1.5" onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4" /> Journal entry</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Receivables"
          value={fmtINR(receivables)}
          icon={Wallet}
          delta={-3}
          hint="invoice dues"
          accent="warning"
        />
        <StatCard label="Payables" value={fmtINR(payables)} icon={Receipt} delta={+2} hint="due 30d" accent="primary" />
        <StatCard label="Cash position" value={fmtINR(cashPos)} icon={TrendingUp} delta={+8} hint="ledger balance" accent="success" />
        <StatCard label="Entries" value={String(items.length)} icon={FileText} delta={0} hint="this period" accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-soft border-border/60 overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-display font-bold text-lg">Cash ledger</h3>
            <p className="text-xs text-muted-foreground">Every entry traceable to source document</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Description</th>
                  <th className="text-right font-medium px-4 py-3">Debit</th>
                  <th className="text-right font-medium px-4 py-3">Credit</th>
                  <th className="text-right font-medium px-4 py-3">Balance</th>
                  <th className="text-right font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-secondary/30 group">
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono-num">{l.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.desc}</div>
                      <div className="text-xs text-muted-foreground">
                        {String(l.desc).toLowerCase().includes("payment")
                          ? "Collection"
                          : String(l.desc).toLowerCase().includes("sale")
                          ? "Sale"
                          : l.credit
                          ? "Receipt"
                          : "Purchase"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num text-destructive">{l.debit ? fmtINR(l.debit) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono-num text-success">{l.credit ? fmtINR(l.credit) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold">{fmtINR(l.balance)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setConfirmDel(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No journal entries.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 shadow-soft border-border/60 bg-gradient-cream">
            <h3 className="font-display font-bold mb-3">Compliance status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded-lg bg-card"><span>GST filing</span><Badge className="bg-success/15 text-success border-0">Up to date</Badge></div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-card"><span>TDS</span><Badge className="bg-success/15 text-success border-0">Filed</Badge></div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-card"><span>E-invoice</span><Badge className="bg-warning/15 text-warning border-0">3 pending</Badge></div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-card"><span>Audit trail</span><Badge className="bg-success/15 text-success border-0">Locked</Badge></div>
            </div>
          </Card>
          <Card className="p-5 shadow-soft border-border/60">
            <h3 className="font-display font-bold mb-3">Quick actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => toast.success("P&L generated")}><FileText className="h-4 w-4" /> Generate P&L</Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => toast.success("Balance sheet generated")}><FileText className="h-4 w-4" /> Balance sheet</Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => toast.success("Bank reconciliation started")}><Receipt className="h-4 w-4" /> Bank reconcile</Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => toast.success("Tally export queued")}><Download className="h-4 w-4" /> Export Tally</Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New journal entry</DialogTitle>
            <DialogDescription>Add a debit or credit to the cash ledger.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="18 Apr" />
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="e.g. Cash deposit · HDFC" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Debit (₹)</Label>
                <Input type="number" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Credit (₹)</Label>
                <Input type="number" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={submit}>Add entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>{confirmDel?.desc}</AlertDialogDescription>
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
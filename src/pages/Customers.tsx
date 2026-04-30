import { useEffect, useState } from "react";
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
import {
  getAllCustomers,
  getCustomerInvoices as getCustomerInvoicesFromDb,
  getCustomerLedger as getCustomerLedgerFromDb,
  collectCustomerPayment,
  type CustomerInvoiceRow,
  type CustomerLedgerRow,
} from "@/services/customer-db.service";

const tierColor: Record<string, string> = {
  Platinum: "bg-gradient-warm text-primary-foreground",
  Gold: "bg-accent text-accent-foreground",
  Silver: "bg-secondary text-secondary-foreground",
  Bronze: "bg-muted text-muted-foreground",
};

type Loyalty = Customer["loyalty"];
interface Form { name: string; visits: string; spent: string; loyalty: Loyalty; }
const empty: Form = { name: "", visits: "0", spent: "0", loyalty: "Bronze" };

type CustomerEx = Customer & {
  phone?: string;
  outstanding?: number;
};

export default function Customers() {
  const journalStore = useLocalStore<any>("erp.journal", []);
  const invoicesStore = useLocalStore<any>("erp.invoices", []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerEx | null>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<any | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<CustomerEx | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [confirmDel, setConfirmDel] = useState<CustomerEx | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CustomerEx[]>([]);
  const [profileInvoices, setProfileInvoices] = useState<CustomerInvoiceRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<CustomerLedgerRow[]>([]);

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: CustomerEx) => { setEditing(c); setForm({ name: c.name, visits: String(c.visits), spent: String(c.spent), loyalty: c.loyalty }); setOpen(true); };

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

    if ((confirmDel.outstanding || 0) > 0) {
      toast.error("Cannot delete customer with outstanding dues");
      return;
    }

    remove(confirmDel.id);
    toast.success(`${confirmDel.name} removed`);
    setConfirmDel(null);
  };

  const totalSpent = items.reduce((s, c) => s + c.spent, 0);
  const avgLtv = items.length ? Math.round(totalSpent / items.length) : 0;

  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const getLedger = (customerName: string) => {
    const entries: any[] = [];

    // 1. invoices
    invoicesStore.items.forEach((inv: any) => {
      if (inv.customer === customerName && inv.status !== "Voided") {
        entries.push({
          date: inv.time,
          type: "Invoice",
          ref: inv.id,
          debit: inv.amount,
          credit: 0,
        });
      }
    });

    // 2. payments
    invoicesStore.items.forEach((inv: any) => {
      if (inv.customer === customerName && inv.payments) {
        inv.payments.forEach((p: any) => {
          entries.push({
            date: p.date,
            type: "Payment",
            ref: inv.id,
            debit: 0,
            credit: p.amount,
          });
        });
      }
    });

    // 3. returns
    invoicesStore.items.forEach((inv: any) => {
      if (inv.customer === customerName && inv.status === "Returned") {
        entries.push({
          date: inv.time,
          type: "Return",
          ref: inv.id,
          debit: 0,
          credit: inv.amount,
        });
      }
    });

    // sort by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // running balance
    let balance = 0;

    return entries.map((e) => {
      balance += e.debit - e.credit;
      return {
        ...e,
        balance,
      };
    });
  };

  const getCustomerInvoices = (customerName: string) => {
  return [...invoicesStore.items]
    .filter((inv: any) => inv.customer === customerName)
    .sort(
      (a: any, b: any) =>
        new Date(String(b.time)).getTime() - new Date(String(a.time)).getTime()
    );
};

  const collectFromCustomer = async (customer: CustomerEx) => {
    const raw = window.prompt(
      `Collect amount from ${customer.name} (max ₹${customer.outstanding || 0})`,
      String(customer.outstanding || 0)
    );

    if (!raw) return;

    const amt = Number(raw) || 0;

    if (amt <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    try {
      const applied = await collectCustomerPayment(customer.name, amt);

      if (applied <= 0) {
        toast.error("No outstanding dues found");
        return;
      }

      toast.success(`Collected ${fmtINR(applied)} from ${customer.name}`);

      await loadCustomers();

      if (profileCustomer?.name === customer.name) {
        const updatedCustomers = await getAllCustomers();
        const updatedCustomer = updatedCustomers.find((c) => c.name === customer.name);

        if (updatedCustomer) {
          setProfileCustomer(updatedCustomer as CustomerEx);
        }

        const invoices = await getSqlCustomerInvoices(customer.name);
        setProfileInvoices(invoices);

        const ledger = await getSqlCustomerLedger(customer.name);
        setLedgerRows(ledger);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to collect payment");
    }
  };

  async function loadCustomers() {
    const rows = await getAllCustomers();
    setItems(rows as CustomerEx[]);
  }

  useEffect(() => {
    loadCustomers().catch(console.error);
  }, []);

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
        <StatCard
          label="Outstanding"
          value={fmtINR(items.reduce((s, c) => s + (c.outstanding || 0), 0))}
          icon={Sparkles}
          delta={+4}
          hint="customer dues"
          accent="success"
        />
        <StatCard label="Avg LTV" value={fmtINR(avgLtv)} icon={Users} delta={+11} hint="per customer" accent="warning" />
      </div>

      <Card className="p-4 mb-4">
        <Input
          placeholder="Search customer name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>

      <Card className="shadow-soft border-border/60 overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-bold text-lg">Customers</h3>
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} customers
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-right">Visits</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.id} · {c.last}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right font-mono-num">
                    {fmtINR(c.spent)}
                  </td>

                  <td className="px-4 py-3 text-right font-mono-num">
                    {c.visits}
                  </td>

                  <td className={`px-4 py-3 text-right font-mono-num ${
                    (c.outstanding || 0) > 0 ? "text-destructive" : ""
                  }`}>
                    {fmtINR(c.outstanding || 0)}
                  </td>

                  <td className="px-4 py-3 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      setLedgerCustomer(c);
                      const rows = await getCustomerLedgerFromDb(c.name);
                      setLedgerRows(rows);
                    }}>
                      Ledger
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={async () => {
                        setProfileCustomer(c);
                         const rows = await getCustomerInvoicesFromDb(c.name);
                        setProfileInvoices(rows);
                      }}
                    >
                      Profile
                    </Button>

                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                      Edit
                    </Button>

                    {(c.outstanding || 0) > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => collectFromCustomer(c)}
                      >
                        Collect total
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmDel(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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

      <Dialog open={!!profileCustomer} onOpenChange={(o) => !o && setProfileCustomer(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{profileCustomer?.name} · Customer profile</DialogTitle>
            <DialogDescription>
              Full relationship view including sales, dues and activity
            </DialogDescription>
          </DialogHeader>

          {profileCustomer && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Loyalty
                  </div>
                  <div className="font-semibold text-sm">{profileCustomer.loyalty}</div>
                </Card>

                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Lifetime spent
                  </div>
                  <div className="font-mono-num font-bold text-sm">
                    {fmtINR(profileCustomer.spent)}
                  </div>
                </Card>

                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Visits
                  </div>
                  <div className="font-mono-num font-bold text-sm">
                    {profileCustomer.visits}
                  </div>
                </Card>

                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Outstanding
                  </div>
                  <div className={`font-mono-num font-bold text-sm ${(profileCustomer.outstanding || 0) > 0 ? "text-destructive" : ""}`}>
                    {fmtINR(profileCustomer.outstanding || 0)}
                  </div>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2">
                {(profileCustomer.outstanding || 0) > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => collectFromCustomer(profileCustomer)}
                  >
                    Collect payment
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={async () => {
                    setLedgerCustomer(profileCustomer);
                    const rows = await getCustomerLedgerFromDb(profileCustomer.name);
                    setLedgerRows(rows);
                  }}
                >
                  Open ledger
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openEdit(profileCustomer)}
                >
                  Edit customer
                </Button>
              </div>

              <Card className="border border-border/60 shadow-none overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-sm">Recent invoices</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr className="text-xs uppercase text-muted-foreground">
                        <th className="text-left px-4 py-3">Invoice</th>
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-right px-4 py-3">Amount</th>
                        <th className="text-right px-4 py-3">Due</th>
                        <th className="text-left px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            No invoices found for this customer.
                          </td>
                        </tr>
                      ) : (
                        profileInvoices.map((inv: any) => (
                          <tr key={inv.id} className="border-t border-border hover:bg-secondary/30">
                            <td className="px-4 py-3 font-mono-num text-primary font-semibold">
                              {inv.id}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {inv.time ? new Date(String(inv.time)).toLocaleString() : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-num">
                              {fmtINR(inv.amount || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-num">
                              {fmtINR(inv.dueAmount || 0)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={
                                  inv.status === "Paid"
                                    ? "bg-success/10 text-success border-success/30"
                                    : inv.status === "Credit"
                                    ? "bg-accent/10 text-accent-foreground border-accent/30"
                                    : inv.status === "Returned" || inv.status === "Voided"
                                    ? "bg-muted text-muted-foreground border-border"
                                    : "bg-warning/10 text-warning border-warning/30"
                                }
                              >
                                {inv.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileCustomer(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ledgerCustomer} onOpenChange={(o) => !o && setLedgerCustomer(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {ledgerCustomer?.name} · Ledger
            </DialogTitle>
            <DialogDescription>
              Complete transaction history and balance
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Ref</th>
                  <th className="text-right px-4 py-3">Debit</th>
                  <th className="text-right px-4 py-3">Credit</th>
                  <th className="text-right px-4 py-3">Balance</th>
                </tr>
              </thead>

              <tbody>
                {ledgerCustomer &&
                  ledgerRows.map((e, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{e.type}</td>
                      <td className="px-4 py-3 font-mono-num text-xs">{e.ref}</td>
                      <td className="px-4 py-3 text-right font-mono-num">
                        {e.debit ? fmtINR(e.debit) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num">
                        {e.credit ? fmtINR(e.credit) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num font-bold">
                        {fmtINR(e.balance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLedgerCustomer(null)}>
              Close
            </Button>
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
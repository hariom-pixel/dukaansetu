import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Heart, Sparkles, MessageCircle } from "lucide-react";
import { fmtINR } from "@/lib/mockData";
import { toast } from "sonner";
import {
  getAllCustomers,
  getCustomerInvoices as getCustomerInvoicesFromDb,
  getCustomerLedger as getCustomerLedgerFromDb,
  collectCustomerPayment,
  createCustomer,
  type CustomerRow,
  type CustomerInvoiceRow,
  type CustomerLedgerRow,
} from "@/services/customer-db.service";

export default function Customers() {
  const [ledgerCustomer, setLedgerCustomer] = useState<CustomerRow | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<CustomerRow | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [profileInvoices, setProfileInvoices] = useState<CustomerInvoiceRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<CustomerLedgerRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    openingBalance: "",
  });
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectCustomer, setCollectCustomer] = useState<CustomerRow | null>(null);
  const [collectAmount, setCollectAmount] = useState("");

  async function loadCustomers() {
    const rows = await getAllCustomers();
    setItems(rows);
  }

  useEffect(() => {
    loadCustomers().catch(console.error);
  }, []);

  const totalSpent = items.reduce((s, c) => s + Number(c.spent || 0), 0);
  const avgLtv = items.length ? Math.round(totalSpent / items.length) : 0;

  const filtered = items.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      String(c.phone || "").toLowerCase().includes(q)
    );
  });

  const collectFromCustomer = (customer: CustomerRow) => {
    setCollectCustomer(customer);
    setCollectAmount(String(customer.outstanding || 0));
    setCollectOpen(true);
  };

  const openProfile = async (customer: CustomerRow) => {
    setProfileCustomer(customer);
    const rows = await getCustomerInvoicesFromDb(Number(customer.id));
    setProfileInvoices(rows);
  };

  const openLedger = async (customer: CustomerRow) => {
    setLedgerCustomer(customer);
    const rows = await getCustomerLedgerFromDb(Number(customer.id));
    setLedgerRows(rows);
  };

  const saveNewCustomer = async () => {
    const name = newCustomer.name.trim();
    const phone = newCustomer.phone.trim();
    const openingBalance = Number(newCustomer.openingBalance || 0);

    if (!name) {
      toast.error("Customer name required");
      return;
    }

    try {
      await createCustomer({
        name,
        phone,
        openingBalance,
      });

      await loadCustomers();

      setNewCustomer({
        name: "",
        phone: "",
        openingBalance: "",
      });

      setAddOpen(false);
      toast.success("Customer added");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to add customer");
    }
  };

  const submitCollectPayment = async () => {
    if (!collectCustomer) return;

    const amt = Number(collectAmount) || 0;

    if (amt <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    if (amt > Number(collectCustomer.outstanding || 0)) {
      toast.error("Amount cannot exceed outstanding");
      return;
    }

    try {
      const applied = await collectCustomerPayment(Number(collectCustomer.id), amt);

      if (applied <= 0) {
        toast.error("No outstanding dues found");
        return;
      }

      toast.success(`Collected ${fmtINR(applied)} from ${collectCustomer.name}`);

      await loadCustomers();

      const updatedCustomers = await getAllCustomers();
      const updatedCustomer = updatedCustomers.find(
        (c) => Number(c.id) === Number(collectCustomer.id)
      );

      if (updatedCustomer && profileCustomer?.id === collectCustomer.id) {
        setProfileCustomer(updatedCustomer);
      }

      if (profileCustomer?.id === collectCustomer.id) {
        const invoices = await getCustomerInvoicesFromDb(Number(collectCustomer.id));
        setProfileInvoices(invoices);
      }

      if (ledgerCustomer?.id === collectCustomer.id) {
        const ledger = await getCustomerLedgerFromDb(Number(collectCustomer.id));
        setLedgerRows(ledger);
      }

      setCollectOpen(false);
      setCollectCustomer(null);
      setCollectAmount("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to collect payment");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="CRM & loyalty"
        title="Customer 360"
        subtitle="Every customer's purchase history, outstanding balance, and ledger."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => toast.success("Campaign drafted")}
            >
              <MessageCircle className="h-4 w-4" /> Campaign
            </Button>
             <Button
              size="sm"
              className="bg-gradient-primary shadow-glow gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              Add customer
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total customers"
          value={String(items.length)}
          icon={Users}
          delta={0}
          hint="from sales"
          accent="primary"
        />

        <StatCard
          label="Loyalty members"
          value={String(items.filter((c) => c.loyalty !== "Bronze").length)}
          icon={Heart}
          delta={0}
          hint="silver+"
          accent="accent"
        />

        <StatCard
          label="Outstanding"
          value={fmtINR(items.reduce((s, c) => s + Number(c.outstanding || 0), 0))}
          icon={Sparkles}
          delta={0}
          hint="customer dues"
          accent="success"
        />

        <StatCard
          label="Avg LTV"
          value={fmtINR(avgLtv)}
          icon={Users}
          delta={0}
          hint="per customer"
          accent="warning"
        />
      </div>

      <Card className="p-4 mb-4">
        <Input
          placeholder="Search customer name or phone..."
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No customers found. Customers are created from POS sales.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        CUST-{c.id} {c.phone ? `· ${c.phone}` : ""} · {c.last}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-mono-num">
                      {fmtINR(c.spent)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono-num">
                      {c.visits}
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-mono-num ${
                        (c.outstanding || 0) > 0 ? "text-destructive" : ""
                      }`}
                    >
                      {fmtINR(c.outstanding || 0)}
                    </td>

                    <td className="px-4 py-3 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openLedger(c)}>
                        Ledger
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => openProfile(c)}
                      >
                        Profile
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={!!profileCustomer}
        onOpenChange={(o) => !o && setProfileCustomer(null)}
      >
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
                  <div className="font-semibold text-sm">
                    {profileCustomer.loyalty}
                  </div>
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
                  <div
                    className={`font-mono-num font-bold text-sm ${
                      (profileCustomer.outstanding || 0) > 0
                        ? "text-destructive"
                        : ""
                    }`}
                  >
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

                <Button variant="outline" onClick={() => openLedger(profileCustomer)}>
                  Open ledger
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
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-sm text-muted-foreground"
                          >
                            No invoices found for this customer.
                          </td>
                        </tr>
                      ) : (
                        profileInvoices.map((inv) => (
                          <tr
                            key={inv.id}
                            className="border-t border-border hover:bg-secondary/30"
                          >
                            <td className="px-4 py-3 font-mono-num text-primary font-semibold">
                              {inv.id}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {inv.time
                                ? new Date(String(inv.time)).toLocaleString()
                                : "—"}
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
                                    : inv.status === "Returned" ||
                                      inv.status === "Voided"
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

      <Dialog
        open={!!ledgerCustomer}
        onOpenChange={(o) => !o && setLedgerCustomer(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{ledgerCustomer?.name} · Ledger</DialogTitle>
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
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No ledger entries found.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((e, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {e.date ? new Date(e.date).toLocaleDateString() : "—"}
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
                  ))
                )}
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
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add customer</DialogTitle>
        <DialogDescription>
          Create a customer account before billing or udhaar.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 py-2">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Customer name
          </label>
          <Input
            value={newCustomer.name}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, name: e.target.value })
            }
            placeholder="e.g. Rohit Sharma"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Phone number
          </label>
          <Input
            value={newCustomer.phone}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, phone: e.target.value })
            }
            placeholder="Optional"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Opening balance
          </label>
          <Input
            type="number"
            value={newCustomer.openingBalance}
            onChange={(e) =>
              setNewCustomer({
                ...newCustomer,
                openingBalance: e.target.value,
              })
            }
            placeholder="Old udhaar amount, if any"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setAddOpen(false)}>
          Cancel
        </Button>
        <Button onClick={saveNewCustomer}>Save customer</Button>
      </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect payment</DialogTitle>
            <DialogDescription>
              Record payment against outstanding dues.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              <div className="font-semibold">{collectCustomer?.name}</div>
              <div className="text-xs text-muted-foreground">
                Outstanding: {fmtINR(collectCustomer?.outstanding || 0)}
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Amount received
              </label>
              <Input
                autoFocus
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectOpen(false)}>
              Cancel
            </Button>

            <Button onClick={submitCollectPayment}>
              Collect payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
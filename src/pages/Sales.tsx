import { useEffect, useState } from "react";
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
import { addStockLedgerEntry, createStockLedgerEntry } from "@/lib/stockLedger";
import { getAllSales, getSaleItems, collectSalePayment, returnSale, voidSale } from "@/services/sales-db.service";

const data = [
  { day: "Mon", pos: 92000, b2b: 50000, online: 28000 },
  { day: "Tue", pos: 108000, b2b: 42000, online: 34000 },
  { day: "Wed", pos: 124000, b2b: 38000, online: 41000 },
  { day: "Thu", pos: 102000, b2b: 48000, online: 36000 },
  { day: "Fri", pos: 142000, b2b: 56000, online: 48000 },
  { day: "Sat", pos: 168000, b2b: 62000, online: 58000 },
  { day: "Sun", pos: 138000, b2b: 52000, online: 42000 },
];

  type InvoicePayment = {
    id: string;
    date: string;
    amount: number;
    mode: string;
  };

  type InvoiceEx = Invoice & {
    paidAmount?: number;
    dueAmount?: number;
    payments?: InvoicePayment[];
    total?: number;
    subtotal?: number;
    discount?: number;
    discountValue?: number;
    discountType?: "percent" | "flat";
    tax?: number;
    gstRate?: number;
    gstMode?: "with" | "without";
    voidedAt?: string;
    voidReason?: string;
    items?: Array<{
      sku: string;
      name: string;
      qty: number;
      price: number;
    }>;
  };

type Status = Invoice["status"];
interface Form { customer: string; channel: string; amount: string; status: Status; }
const empty: Form = { customer: "", channel: "POS", amount: "", status: "Paid" };

export default function Sales() {
  const customersStore = useLocalStore<any>("erp.customers", []);
  const journalStore = useLocalStore<any>("erp.journal", []);
  const productsStore = useLocalStore<any>("erp.products", []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [collecting, setCollecting] = useState<InvoiceEx | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMode, setCollectMode] = useState("Cash");
  const [viewing, setViewing] = useState<InvoiceEx | null>(null);
  const [voiding, setVoiding] = useState<InvoiceEx | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [returning, setReturning] = useState<InvoiceEx | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [items, setItems] = useState<any[]>([]);

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

  const confirmVoid = async () => {
    if (!voiding) return;

    if (!voidReason.trim()) {
      toast.error("Void reason required");
      return;
    }

    try {
      await voidSale(voiding.id, voidReason.trim());

      toast.success(`Invoice ${voiding.id} voided`);

      await loadSales();

      if (viewing?.id === voiding.id) {
        setViewing({
          ...viewing,
          status: "Voided",
          paidAmount: 0,
          dueAmount: 0,
        });
      }

      setVoiding(null);
      setVoidReason("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to void invoice");
    }
  };

  const collectInvoicePayment = async () => {
    if (!collecting) return;

    const amount = Number(collectAmount) || 0;

    if (amount <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    try {
      const applied = await collectSalePayment(collecting.id, amount);

      if (applied <= 0) {
        toast.error("No due amount found");
        return;
      }

      toast.success(`Collected ${fmtINR(applied)} for ${collecting.id}`);

      await loadSales();

      if (viewing?.id === collecting.id) {
        setViewing({
          ...viewing,
          paidAmount: Number(viewing.paidAmount || 0) + applied,
          dueAmount: Math.max(Number(viewing.dueAmount || 0) - applied, 0),
          status:
            Math.max(Number(viewing.dueAmount || 0) - applied, 0) <= 0
              ? "Paid"
              : "Credit",
        });
      }

      setCollecting(null);
      setCollectAmount("");
      setCollectMode("Cash");
    } catch (error) {
      console.error(error);
      toast.error("Failed to collect payment");
    }
  };

  const confirmReturn = async () => {
    if (!returning) return;

    if (!returnReason.trim()) {
      toast.error("Return reason required");
      return;
    }

    try {
      await returnSale(returning.id, returnReason.trim());

      toast.success(`Invoice ${returning.id} returned`);

      await loadSales();

      if (viewing?.id === returning.id) {
        setViewing({
          ...viewing,
          status: "Returned",
          paidAmount: 0,
          dueAmount: 0,
        });
      }

      setReturning(null);
      setReturnReason("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to return invoice");
    }
  };

  const activeItems = items.filter((i: any) => i.status !== "Voided");

  const net = activeItems.reduce((s, i) => s + Number(i.amount || 0), 0);
  const avg = activeItems.length ? Math.round(net / activeItems.length) : 0;
  const totalDue = activeItems.reduce((s, i) => s + Number(i.dueAmount || 0), 0);

  async function loadSales() {
    const rows = await getAllSales();
    setItems(rows);
  }

  useEffect(() => {
    loadSales().catch(console.error);
  }, []);

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
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => toast("Create invoice from POS screen")}
            >
              <Plus className="h-4 w-4" /> New invoice
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Invoices" value={String(activeItems.length)} icon={Receipt} delta={+12} hint="active invoices" accent="primary" />
        <StatCard label="Net sales" value={fmtINR(net)} icon={Banknote} delta={+17} hint="total" accent="success" />
        <StatCard
          label="Invoice dues"
          value={fmtINR(totalDue)}
          icon={RotateCcw}
          delta={-3}
          hint="credit invoices"
          accent="warning"
        />
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
            <Bar dataKey="pos" stackId="a" fill="hsl(217 91% 60%)" />
            <Bar dataKey="b2b" stackId="a" fill="hsl(38 92% 50%)" />
            <Bar dataKey="online" stackId="a" fill="hsl(168 76% 36%)" radius={[8, 8, 0, 0]} />
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
                <th className="text-right font-medium px-4 py-3">Due</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Time</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id} className="border-t border-border hover:bg-secondary/40 transition">
                  <td className="px-4 py-3 font-mono-num font-semibold text-primary">{inv.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{inv.customer}</div>
                    <div className="text-xs text-muted-foreground">{inv.channel}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.gstMode ? `GST ${inv.gstMode}` : inv.channel}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-num font-bold">{fmtINR(inv.amount)}</td>
                  <td className="px-4 py-3 text-right font-mono-num">
                    {fmtINR(inv.dueAmount || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        inv.status === "Paid"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : inv.status === "Returned"
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : inv.status === "Voided"
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : inv.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                          : "bg-blue-100 text-blue-700 border-blue-200"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{new Date(inv.time).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={async () => {
                          const saleItems = await getSaleItems(inv.id);
                          setViewing({
                            ...inv,
                            items: saleItems,
                          });
                        }}
                      >
                        View
                      </Button>

                      {inv.status !== "Voided" && inv.status !== "Returned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-warning"
                          onClick={() => {
                            setReturning(inv);
                            setReturnReason("");
                          }}
                        >
                          Return
                        </Button>
                      )}

                      {inv.status !== "Voided" &&
                        inv.status !== "Returned" &&
                        (inv.dueAmount || 0) > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              setCollecting(inv);
                              setCollectAmount(String(inv.dueAmount || 0));
                              setCollectMode("Cash");
                            }}
                          >
                            Collect
                          </Button>
                        )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (inv.status === "Voided" || inv.status === "Returned") {
                            toast.error("This invoice cannot be voided");
                            return;
                          }
                          setVoiding(inv);
                          setVoidReason("");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">No invoices yet.</td></tr>
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

      <Dialog open={!!collecting} onOpenChange={(o) => !o && setCollecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect payment</DialogTitle>
            <DialogDescription>
              {collecting?.id} · {collecting?.customer}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              Outstanding:{" "}
              <span className="font-mono-num font-semibold">
                {fmtINR(collecting?.dueAmount || 0)}
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Payment mode</Label>
              <Select value={collectMode} onValueChange={setCollectMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCollecting(null)}>
              Cancel
            </Button>
            <Button onClick={collectInvoicePayment}>
              Collect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-lg font-bold">
                  {viewing?.id}
                </DialogTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {viewing?.customer} · {new Date(viewing?.time || "").toLocaleString()}
                </div>
              </div>
              <Badge
                className={
                  viewing?.status === "Voided" || viewing?.status === "Returned"
                    ? "bg-slate-100 text-slate-700"
                    : viewing?.dueAmount
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }
              >
                {viewing?.status === "Voided"
                  ? "Voided"
                  : viewing?.status === "Returned"
                  ? "Returned"
                  : viewing?.dueAmount
                  ? "Due"
                  : "Paid"}
              </Badge>
            </div>
          </DialogHeader>

          {viewing && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Customer
                  </div>
                  <div className="font-semibold text-sm">{viewing.customer}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Channel: {viewing.channel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: {viewing.status}
                  </div>
                  {viewing.status === "Voided" && (
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                      <div className="font-medium text-destructive">Invoice voided</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {viewing.voidedAt ? new Date(viewing.voidedAt).toLocaleString() : ""}
                      </div>
                      {viewing.voidReason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Reason: {viewing.voidReason}
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Payment summary
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-mono-num font-semibold">
                        {fmtINR(viewing.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-mono-num">
                        {fmtINR(viewing.paidAmount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due</span>
                      <span className={`font-mono-num font-semibold ${
                        (viewing.dueAmount || 0) > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}>
                        {fmtINR(viewing.dueAmount || 0)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="border border-border/60 shadow-none overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h4 className="font-semibold text-sm">Invoice items</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="text-left font-medium px-4 py-3">Item</th>
                        <th className="text-right font-medium px-4 py-3">Qty</th>
                        <th className="text-right font-medium px-4 py-3">Rate</th>
                        <th className="text-right font-medium px-4 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewing.items && viewing.items.length > 0 ? (
                        viewing.items.map((item: any, idx: number) => (
                          <tr key={`${item.sku}-${idx}`} className="border-t border-border">
                            <td className="px-4 py-3">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground font-mono-num">
                                {item.sku}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono-num">
                              {item.qty}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-num">
                              {fmtINR(item.price)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-num font-semibold">
                              {fmtINR(item.qty * item.price)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">
                            No item details stored for this invoice.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                    Payment history
                  </div>

                  {viewing.payments && viewing.payments.length > 0 ? (
                    <div className="space-y-2">
                      {viewing.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium">{p.mode}</div>
                            <div className="text-xs text-muted-foreground">{p.date}</div>
                          </div>
                          <div className="font-mono-num font-semibold">
                            {fmtINR(p.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No payment history yet.
                    </div>
                  )}
                </Card>

                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                    Totals
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono-num">
                        {fmtINR(viewing.subtotal || viewing.amount || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Discount{" "}
                        {viewing.discountType === "percent"
                          ? `(${viewing.discountValue || 0}%)`
                          : ""}
                      </span>
                      <span className="font-mono-num">
                        - {fmtINR(viewing.discount || 0)}
                      </span>
                    </div>

                    {(viewing.gstMode === "with" || viewing.tax) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          GST ({viewing.gstRate || 0}%)
                        </span>
                        <span className="font-mono-num">
                          + {fmtINR(viewing.tax || 0)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between pt-3 mt-3 border-t border-border text-base font-bold">
                      <span>Total</span>
                      <span className="font-mono-num">
                        {fmtINR(viewing.total || viewing.amount || 0)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voiding} onOpenChange={(o) => !o && setVoiding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void invoice {voiding?.id}?</DialogTitle>
            <DialogDescription>
              This will restore stock and reverse linked balances where applicable.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              Customer: <span className="font-medium">{voiding?.customer}</span>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              Amount: <span className="font-mono-num font-semibold">{fmtINR(voiding?.amount || 0)}</span>
            </div>

            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Billing mistake, duplicate invoice"
              />
            </div>

            {(voiding?.payments?.length || 0) > 0 && (voiding?.dueAmount || 0) > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Partially paid invoices cannot be voided yet.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVoiding(null)}>
              Cancel
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmVoid}
            >
              Void invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returning} onOpenChange={(o) => !o && setReturning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return invoice {returning?.id}?</DialogTitle>
            <DialogDescription>
              This will restore stock and reverse financial impact.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="text-sm">
              Customer: <b>{returning?.customer}</b>
            </div>

            <div className="text-sm">
              Amount: <b>{fmtINR(returning?.amount || 0)}</b>
            </div>

            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Input
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Damaged / wrong item / cancelled"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturning(null)}>
              Cancel
            </Button>
            <Button
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={confirmReturn}
            >
              Confirm return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
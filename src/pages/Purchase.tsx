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
import { Truck, FileText, Wallet, Plus, ChevronRight, Star, Pencil, Trash2 } from "lucide-react";
import { fmtINR } from "@/lib/format";
import { toast } from "sonner";
import { getAllProducts, type ProductRow } from "@/services/product-db.service";
import { addJournalEntry } from "@/services/accounting-db.service";
import {
  addPayment,
  getPaymentsByParty,
  type PaymentRow,
} from "@/services/payment-db.service";
import {
  getAllSuppliers,
  getAllPurchases,
  createSupplier,
  createPurchase,
  receivePurchase,
  paySupplier
} from "@/services/purchase-db.service";

type Status = "Draft" | "Approval" | "In transit" | "Delivered";

type PurchaseLine = {
  sku: string;
  name: string;
  qty: number;
  price: number;
};

type PurchaseOrderEx = {
  id: string;
  supplier: string;
  supplier_name?: string;
  items: number;
  value: number;
  status: Status;
  eta: string;
  created_at?: number;
  lines?: PurchaseLine[];
};

interface POForm {
  supplier: string;
  productSku: string;
  qty: string;
  price: string;
  status: Status;
  eta: string;
}

const emptyPO: POForm = {
  supplier: "",
  productSku: "",
  qty: "",
  price: "",
  status: "Draft",
  eta: "—",
};

export default function Purchase() {
  // const pos = useLocalStore<PurchaseOrderEx>("erp.purchaseOrders", PURCHASE_ORDERS as PurchaseOrderEx[]);
  // const sup = useLocalStore<Supplier>("erp.suppliers", SUPPLIERS);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrderEx | null>(null);
  const [form, setForm] = useState<POForm>(emptyPO);
  const [confirmDel, setConfirmDel] = useState<PurchaseOrderEx | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [paySupplierRow, setPaySupplierRow] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const [supplierHistoryOpen, setSupplierHistoryOpen] = useState(false);
  const [historySupplier, setHistorySupplier] = useState<any | null>(null);
  const [supplierPayments, setSupplierPayments] = useState<PaymentRow[]>([]);


  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyPO,
      supplier: suppliers[0]?.name || "",
      productSku: products[0]?.sku || "",
    });
    setOpen(true);
  };

  const openEdit = (p: PurchaseOrderEx) => {
    const firstLine = p.lines?.[0];
    setEditing(p);
    setForm({
      supplier: p.supplier,
      productSku: firstLine?.sku || "",
      qty: firstLine ? String(firstLine.qty) : String(p.items || 0),
      price: firstLine ? String(firstLine.price) : "",
      status: p.status,
      eta: p.eta,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.supplier) {
      toast.error("Supplier required");
      return;
    }

    if (!form.productSku) {
      toast.error("Product required");
      return;
    }

    const qty = Number(form.qty) || 0;
    const price = Number(form.price) || 0;

    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    if (price <= 0) {
      toast.error("Enter valid price");
      return;
    }

    const product = products.find((p) => p.sku === form.productSku);

    if (!product) {
      toast.error("Selected product not found");
      return;
    }

    const value = qty * price;
    if (editing) {
        toast.error("Edit PO update coming next");
        return;
      }

      const id = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
      await createPurchase({
        id,
        supplier: form.supplier,
        items: qty,
        value,
        status: form.status,
        eta: form.eta,
        line: {
          sku: product.sku,
          name: product.name,
          qty,
          price,
        },
      });

      await loadPurchaseData();
      toast.success(editing ? "PO updated" : "PO created");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save purchase order");
    }
  };

  const confirmDelete = () => {
    toast.error("Delete PO will be connected to SQLite next");
    setConfirmDel(null);
  };

  const payables = suppliers.reduce((s, x) => s + x.outstanding, 0);

  async function openSupplierHistory(supplier: any) {
    try {
      setHistorySupplier(supplier);

      const payments = await getPaymentsByParty("SUPPLIER", supplier.id);
      setSupplierPayments(payments);

      setSupplierHistoryOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load supplier payment history");
    }
  }

  async function loadPurchaseData() {
    const [poRows, supplierRows, productRows] = await Promise.all([
      getAllPurchases(),
      getAllSuppliers(),
      getAllProducts(),
    ]);

    setPurchaseOrders(poRows as any[]);
    setSuppliers(supplierRows as any[]);
    setProducts(productRows);
  }

  useEffect(() => {
    loadPurchaseData().catch(console.error);
  }, []);

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
        <StatCard label="Open POs" value={String(purchaseOrders.filter(p => p.status !== "Delivered").length)} icon={FileText} delta={+2} hint="active" accent="primary" />
        <StatCard label="In transit" value={String(purchaseOrders.filter(p => p.status === "In transit").length)} icon={Truck} delta={+1} hint="GRN pending" accent="accent" />
        <StatCard label="Payables" value={fmtINR(payables)} icon={Wallet} delta={-4} hint="supplier dues" accent="warning" />
        <StatCard label="Suppliers" value={String(suppliers.length)} icon={Truck} delta={0} hint="active" accent="success" />
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
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono-num font-semibold text-primary">{po.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{po.supplier}</div>
                      <div className="text-xs text-muted-foreground">
                        {po.lines?.[0]?.name || "No product selected"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num">
                      {po.lines?.[0]?.qty ?? po.items}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold">
                      {fmtINR(po.value)}
                    </td>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await receivePurchase(po.id);
                            await loadPurchaseData();
                            toast.success("Goods received successfully");
                          } catch (error) {
                            console.error(error);
                            toast.error("Failed to receive goods");
                          }
                        }}
                      >
                        Receive
                      </Button>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No purchase orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 shadow-soft border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Top suppliers</h3>
            <Button size="sm" variant="ghost" className="text-primary text-xs" onClick={() => setAddSupplierOpen(true)}>+ Add</Button>
          </div>
          <div className="space-y-3">
            {suppliers.map((s) => (
              <div key={s.id} className="p-3 rounded-xl border border-border hover:border-primary/30 hover:shadow-soft transition-smooth group">
                <div className="flex items-start justify-between mb-1">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/30 gap-1 text-[10px]">
                      <Star className="h-3 w-3 fill-current" /> {s.rating}
                    </Badge>
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

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => openSupplierHistory(s)}
                  >
                    History
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPaySupplierRow(s);
                      setPayAmount(String(s.outstanding || 0));
                      setPayOpen(true);
                    }}
                  >
                    Pay
                  </Button>
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

              <div className="flex gap-2">
                <Select
                  value={form.supplier}
                  onValueChange={(v) => setForm({ ...form, supplier: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose supplier" />
                  </SelectTrigger>

                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddSupplierOpen(true)}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Product</Label>
                <Select
                  value={form.productSku}
                  onValueChange={(v) => setForm({ ...form, productSku: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.sku} value={p.sku}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Rate (₹)</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: {fmtINR((Number(form.qty) || 0) * (Number(form.price) || 0))}
                </div>
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

      <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier for purchase orders.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <Input
              autoFocus
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              placeholder="Supplier name"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSupplierOpen(false)}>
              Cancel
            </Button>

            <Button
              onClick={async () => {
                if (!newSupplierName.trim()) {
                  toast.error("Supplier name required");
                  return;
                }

                try {
                  await createSupplier(newSupplierName.trim());
                  await loadPurchaseData();
                  toast.success("Supplier added");

                  setNewSupplierName("");
                  setAddSupplierOpen(false);
                } catch (e) {
                  toast.error("Failed to add supplier");
                }
              }}
            >
              Add supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay supplier</DialogTitle>
            <DialogDescription>
              Record payment against supplier outstanding.
            </DialogDescription>
          </DialogHeader>

          {paySupplierRow && (
            <div className="space-y-4 py-2">
              <div className="border rounded-lg p-3 bg-secondary/30">
                <div className="font-semibold">{paySupplierRow.name}</div>
                <div className="text-xs text-muted-foreground">
                  Outstanding: {fmtINR(paySupplierRow.outstanding || 0)}
                </div>
              </div>

              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>

            <Button
              onClick={async () => {
                if (!paySupplierRow) return;

                const amt = Number(payAmount) || 0;

                if (amt <= 0) {
                  toast.error("Enter valid amount");
                  return;
                }

                if (amt > Number(paySupplierRow.outstanding || 0)) {
                  toast.error("Amount exceeds outstanding");
                  return;
                }

                try {
                  const applied = await paySupplier(Number(paySupplierRow.id), amt);

                  await addJournalEntry({
                    desc: `Payment to ${paySupplierRow.name}`,
                    debit: applied,
                    credit: 0,
                    sourceType: "SUPPLIER_PAYMENT",
                    sourceId: String(paySupplierRow.id),
                    isSystem: true,
                  });

                  await addPayment({
                    partyType: "SUPPLIER",
                    partyId: paySupplierRow.id,
                    partyName: paySupplierRow.name,
                    sourceType: "SUPPLIER_PAYMENT",
                    sourceId: paySupplierRow.id,
                    amount: applied,
                    mode: "Cash",
                    direction: "OUT",
                    note: `Payment to supplier ${paySupplierRow.name}`,
                  });

                  await loadPurchaseData();

                  if (historySupplier?.id === paySupplierRow.id) {
                    const payments = await getPaymentsByParty("SUPPLIER", paySupplierRow.id);
                    setSupplierPayments(payments);
                  }

                  toast.success("Payment recorded");

                  setPayOpen(false);
                  setPaySupplierRow(null);
                  setPayAmount("");
                } catch (e) {
                  toast.error("Failed to pay supplier");
                }
              }}
            >
              Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={supplierHistoryOpen}
        onOpenChange={(open) => {
          setSupplierHistoryOpen(open);
          if (!open) {
            setHistorySupplier(null);
            setSupplierPayments([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {historySupplier?.name} · Supplier history
            </DialogTitle>
            <DialogDescription>
              Supplier payable and payment records from SQLite.
            </DialogDescription>
          </DialogHeader>

          {historySupplier && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Outstanding
                  </div>
                  <div className="font-mono-num font-bold text-lg">
                    {fmtINR(historySupplier.outstanding || 0)}
                  </div>
                </Card>

                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Payments
                  </div>
                  <div className="font-mono-num font-bold text-lg">
                    {supplierPayments.length}
                  </div>
                </Card>

                <Card className="p-4 border border-border/60 shadow-none">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Total paid
                  </div>
                  <div className="font-mono-num font-bold text-lg">
                    {fmtINR(
                      supplierPayments.reduce(
                        (sum, p) => sum + Number(p.amount || 0),
                        0
                      )
                    )}
                  </div>
                </Card>
              </div>

              <Card className="border border-border/60 shadow-none overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-sm">Payment history</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr className="text-xs uppercase text-muted-foreground">
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3">Mode</th>
                        <th className="text-left px-4 py-3">Source</th>
                        <th className="text-left px-4 py-3">Note</th>
                        <th className="text-right px-4 py-3">Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {supplierPayments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-sm text-muted-foreground"
                          >
                            No supplier payments recorded yet.
                          </td>
                        </tr>
                      ) : (
                        supplierPayments.map((p) => (
                          <tr key={p.id} className="border-t border-border">
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {p.date ? new Date(p.date).toLocaleString() : "—"}
                            </td>

                            <td className="px-4 py-3">{p.mode}</td>

                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {p.sourceType}
                              {p.sourceId ? ` · ${p.sourceId}` : ""}
                            </td>

                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {p.note || "—"}
                            </td>

                            <td className="px-4 py-3 text-right font-mono-num font-semibold text-destructive">
                              - {fmtINR(p.amount)}
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
            <Button
              variant="outline"
              onClick={() => setSupplierHistoryOpen(false)}
            >
              Close
            </Button>
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
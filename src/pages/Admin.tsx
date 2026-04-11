import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Search, Shield, SlidersHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import MainLayout from "@/layouts/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getAllOrders, updateOrderStatus } from "@/lib/adminService";
import type { PrebookingRecord } from "@/lib/prebookService";

const formatDate = (value: any): string => {
  if (!value) return "-";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString("en-IN");
  }
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleString("en-IN");
  }
  return "-";
};

export default function Admin() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PrebookingRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PrebookingRecord | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("newest");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoadingOrders(true);
        const result = await getAllOrders();
        setOrders(result);
      } catch (error) {
        console.error("Failed to load orders", error);
        toast.error("Failed to load orders.");
      } finally {
        setLoadingOrders(false);
      }
    };

    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const searchTerm = orderSearch.trim().toLowerCase();

    const filtered = orders.filter((order) => {
      const haystack = [
        order.id,
        order.fullName,
        order.email,
        order.phone,
        order.address,
        order.city,
        order.state,
        order.pincode,
        ...(order.items || []).map((item) => item.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchTerm || haystack.includes(searchTerm);
      const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((left, right) => {
      const leftCreated = left.createdAt?.seconds ? left.createdAt.seconds * 1000 : 0;
      const rightCreated = right.createdAt?.seconds ? right.createdAt.seconds * 1000 : 0;

      switch (orderSort) {
        case "oldest":
          return leftCreated - rightCreated;
        case "amount-high":
          return Number(right.totalAmount || 0) - Number(left.totalAmount || 0);
        case "amount-low":
          return Number(left.totalAmount || 0) - Number(right.totalAmount || 0);
        case "name-az":
          return (left.fullName || "").localeCompare(right.fullName || "");
        case "name-za":
          return (right.fullName || "").localeCompare(left.fullName || "");
        case "newest":
        default:
          return rightCreated - leftCreated;
      }
    });
  }, [orderSearch, orderSort, orderStatusFilter, orders]);

  const handleStatusUpdate = async (orderId: string, status: PrebookingRecord["status"]) => {
    try {
      setUpdatingOrderId(orderId);
      await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status } : prev));
      toast.success(`Order marked as ${status}.`);
    } catch (error) {
      console.error("Failed to update order status", error);
      toast.error("Failed to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <MainLayout>
      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground">Orders start as pending and can only be confirmed or cancelled here.</p>
          </div>
          <Badge className="px-3 py-1 text-sm" variant="secondary">
            <Shield className="w-4 h-4 mr-2" />
            {user?.email}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Orders</CardDescription>
              <CardTitle className="text-3xl">{orders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Orders</CardDescription>
              <CardTitle className="text-3xl">{orders.filter((order) => order.status === "pending").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Confirmed Orders</CardDescription>
              <CardTitle className="text-3xl">{orders.filter((order) => order.status === "confirmed").length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>Search, sort, filter, confirm, or cancel orders from this panel only.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 mb-6">
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Search by order no, name, phone, email..."
                  className="pl-9"
                />
              </div>
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={orderSort} onValueChange={setOrderSort}>
                <SelectTrigger>
                  <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="amount-high">Amount high to low</SelectItem>
                  <SelectItem value="amount-low">Amount low to high</SelectItem>
                  <SelectItem value="name-az">Name A to Z</SelectItem>
                  <SelectItem value="name-za">Name Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingOrders ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs max-w-[140px] truncate">{order.id}</TableCell>
                      <TableCell>{order.fullName || "-"}</TableCell>
                      <TableCell>{order.phone || "-"}</TableCell>
                      <TableCell>₹{Number(order.totalAmount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === "confirmed" ? "default" : order.status === "cancelled" ? "destructive" : "outline"}>
                          {order.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingOrderId === order.id || order.status === "confirmed"}
                            onClick={() => handleStatusUpdate(order.id, "confirmed")}
                          >
                            {updatingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Confirm
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={updatingOrderId === order.id || order.status === "cancelled"}
                            onClick={() => handleStatusUpdate(order.id, "cancelled")}
                          >
                            {updatingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Full order data from Firestore</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p><span className="font-medium">Order ID:</span> {selectedOrder.id}</p>
                <p><span className="font-medium">Status:</span> {selectedOrder.status || "pending"}</p>
                <p><span className="font-medium">Name:</span> {selectedOrder.fullName || "-"}</p>
                <p><span className="font-medium">Email:</span> {selectedOrder.email || "-"}</p>
                <p><span className="font-medium">Phone:</span> {selectedOrder.phone || "-"}</p>
                <p><span className="font-medium">Amount:</span> ₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                <p><span className="font-medium">Address:</span> {selectedOrder.address || "-"}</p>
                <p><span className="font-medium">City/State:</span> {selectedOrder.city || "-"}, {selectedOrder.state || "-"}</p>
                <p><span className="font-medium">Pincode:</span> {selectedOrder.pincode || "-"}</p>
                <p><span className="font-medium">Created:</span> {formatDate(selectedOrder.createdAt)}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item) => (
                    <div key={item.id} className="rounded-md border p-3 text-sm flex items-center justify-between">
                      <span>{item.title}</span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.payment && (
                <div>
                  <h3 className="font-semibold mb-2">Payment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <p><span className="font-medium">Gateway:</span> {selectedOrder.payment.gateway}</p>
                    <p><span className="font-medium">Order ID:</span> {selectedOrder.payment.orderId}</p>
                    <p><span className="font-medium">Payment ID:</span> {selectedOrder.payment.paymentId}</p>
                    <p><span className="font-medium">Currency:</span> {selectedOrder.payment.currency}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => selectedOrder && handleStatusUpdate(selectedOrder.id, "confirmed")}
                  disabled={!selectedOrder || updatingOrderId === selectedOrder.id || selectedOrder.status === "confirmed"}
                >
                  Confirm Order
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedOrder && handleStatusUpdate(selectedOrder.id, "cancelled")}
                  disabled={!selectedOrder || updatingOrderId === selectedOrder.id || selectedOrder.status === "cancelled"}
                >
                  Cancel Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

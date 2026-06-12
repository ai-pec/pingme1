import { ShoppingBag, Package, Edit2, CheckCircle, Clock, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadReceipt } from "@/lib/paymentService";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PrebookingRecord, CartItem } from "@/lib/prebookService";
import { getNfcLineProfilesFromOrder, expandNfcCartUnits } from "@/lib/nfcCheckout";

interface OrderHistoryProps {
  orders: PrebookingRecord[];
  ordersLoading: boolean;
  onEditNFC: (order: PrebookingRecord, lineKey?: string, lineTitle?: string) => void;
}

export function OrderHistory({ orders, ordersLoading, onEditNFC }: OrderHistoryProps) {
  const isNFCOrder = (order: PrebookingRecord): boolean => {
    return !!order.items?.some(
      (item) => typeof item.id === "string" && item.id.startsWith("nfc-")
    );
  };

  const getLineDisplayTitle = (
    line: { lineKey: string; title: string },
    order: PrebookingRecord
  ): string => {
    const units = expandNfcCartUnits(order.items || []);
    const unit = units.find((u) => u.lineKey === line.lineKey);
    return unit?.displayTitle || line.title;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Orders &amp; Pre-bookings
        </CardTitle>
        <CardDescription>
          Track your orders and pre-booking status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ordersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">No orders yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Your pre-bookings and orders will appear here once you place them.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const displayStatus =
                order.status === "pending" && order.payment?.paymentId
                  ? "confirmed"
                  : order.status;
              const nfcLines = getNfcLineProfilesFromOrder(order);
              const hasNfcActions =
                isNFCOrder(order) && displayStatus === "confirmed" && nfcLines.length > 0;

              return (
                <div
                  key={order.id}
                  className="border border-border rounded-xl p-4 bg-card"
                >
                  {/* ── Row 1: Order ID + Status Badge ── */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground truncate">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    {/* Status badge — always visible with text */}
                    <Badge
                      variant="secondary"
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        displayStatus === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : displayStatus === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {displayStatus === "confirmed" && (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>Confirmed</span>
                        </>
                      )}
                      {displayStatus === "pending" && (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </>
                      )}
                      {displayStatus === "cancelled" && (
                        <span>Cancelled</span>
                      )}
                    </Badge>
                  </div>

                  {/* ── Row 2: Action buttons — full-width, always labelled ── */}
                  {(hasNfcActions || order.payment) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {hasNfcActions &&
                        nfcLines.map((line) => (
                          <Button
                            key={line.lineKey}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 px-3 text-xs font-medium"
                            onClick={() =>
                              onEditNFC(
                                order,
                                line.lineKey,
                                getLineDisplayTitle(line, order)
                              )
                            }
                            aria-label={`Edit NFC profile for ${getLineDisplayTitle(line, order)}`}
                          >
                            <Edit2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {nfcLines.length > 1
                                ? `Edit — ${getLineDisplayTitle(line, order)}`
                                : "Edit NFC Profile"}
                            </span>
                          </Button>
                        ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 px-3 text-xs font-medium"
                        onClick={() => downloadReceipt(order as PrebookingRecord, order.email || "")}
                        disabled={!order.payment}
                        aria-label="Download Invoice"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Download Invoice</span>
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2 mb-3">
                    {order.items?.map((item: CartItem, idx: number) => {
                      const itemImage = item.image;
                      const itemTitle =
                        typeof item?.title === "string" && item.title.trim()
                          ? item.title
                          : "Product";
                      const itemQuantity =
                        Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
                      const itemPrice =
                        typeof item?.price === "string"
                          ? item.price
                          : `₹${Number(item?.price || 0).toFixed(2)}`;

                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-center gap-3 text-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-md border border-border bg-secondary/40 flex items-center justify-center shrink-0 overflow-hidden">
                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={itemTitle}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : typeof item?.emoji === "string" &&
                                item.emoji.trim() ? (
                                <span className="text-base">{item.emoji}</span>
                              ) : (
                                <Package className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-foreground truncate">
                              {itemTitle}{" "}
                              <span className="text-muted-foreground">
                                × {itemQuantity}
                              </span>
                            </span>
                          </div>
                          <span className="font-medium shrink-0">{itemPrice}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                    <div className="text-xs text-muted-foreground">
                      <MapPin className="inline w-3 h-3 mr-1" />
                      {order.address}, {order.city}, {order.state} –{" "}
                      {order.pincode}
                    </div>
                    <span className="font-bold text-lg text-primary">
                      ₹{order.totalAmount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

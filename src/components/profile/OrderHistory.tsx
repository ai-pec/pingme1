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
          Orders & Pre-bookings
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

              return (
                <div
                  key={order.id}
                  className="border border-border rounded-xl p-4 bg-card"
                >
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="text-xs font-mono text-muted-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isNFCOrder(order) &&
                        displayStatus === "confirmed" &&
                        nfcLines.map((line) => (
                          <Button
                            key={line.lineKey}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 shrink-0 md:px-3 md:gap-2"
                            onClick={() =>
                              onEditNFC(
                                order,
                                line.lineKey,
                                getLineDisplayTitle(line, order)
                              )
                            }
                            aria-label={`Edit NFC profile for ${line.title}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">
                              {nfcLines.length > 1
                                ? `Edit NFC — ${getLineDisplayTitle(line, order)}`
                                : "Edit NFC"}
                            </span>
                          </Button>
                        ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 shrink-0 md:h-9 md:w-auto md:px-3 md:gap-2"
                        onClick={() => downloadReceipt(order as PrebookingRecord, order.email || "")}
                        disabled={!order.payment}
                        aria-label="Download Invoice"
                      >
                        <span className="hidden md:inline">Download Invoice</span>
                      </Button>
                      <Badge
                        variant="secondary"
                        className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 text-xs ${
                          displayStatus === "confirmed"
                            ? "bg-green-100 text-green-700 md:min-w-0 md:px-2.5"
                            : displayStatus === "cancelled"
                            ? "bg-red-100 text-red-700 md:min-w-0 md:px-2.5"
                            : "bg-amber-100 text-amber-700 md:min-w-0 md:px-2.5"
                        }`}
                      >
                        {displayStatus === "confirmed" && (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span className="hidden md:inline">Confirmed</span>
                            <span className="sr-only md:hidden">Confirmed</span>
                          </>
                        )}
                        {displayStatus === "pending" && (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>
                              {displayStatus.charAt(0).toUpperCase() +
                                displayStatus.slice(1)}
                            </span>
                          </>
                        )}
                        {displayStatus === "cancelled" && (
                          <span>
                            {displayStatus.charAt(0).toUpperCase() +
                              displayStatus.slice(1)}
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>

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
                          <span className="font-medium">{itemPrice}</span>
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

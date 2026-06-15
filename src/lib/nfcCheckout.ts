import type { CartItem, NFCProfile } from "@/lib/prebookService";

export interface NfcCartUnit {
  lineKey: string;
  itemId: string;
  title: string;
  displayTitle: string;
  unitIndex: number;
  quantityTotal: number;
}

export const isNfcCartItem = (item: CartItem): boolean =>
  typeof item.id === "string" && item.id.startsWith("nfc-");

export const expandNfcCartUnits = (items: CartItem[]): NfcCartUnit[] => {
  const units: NfcCartUnit[] = [];

  for (const item of items) {
    if (!isNfcCartItem(item)) continue;

    const quantity = Math.min(Math.max(1, item.quantity), 10);
    const title = item.title?.trim() || "NFC Card";

    for (let unitIndex = 0; unitIndex < quantity; unitIndex += 1) {
      const lineKey = `${item.id}__${unitIndex}`;
      const displayTitle =
        quantity > 1 ? `${title} (${unitIndex + 1} of ${quantity})` : title;

      units.push({
        lineKey,
        itemId: item.id,
        title,
        displayTitle,
        unitIndex,
        quantityTotal: quantity,
      });
    }
  }

  return units;
};

export const getNfcProfileDocId = (paymentOrderId: string, lineKey: string): string =>
  `${paymentOrderId}_${lineKey}`;

/** Firestore nfcProfiles document id for an order line (legacy vs multi-line). */
export const resolveNfcProfileDocId = (params: {
  paymentOrderId?: string;
  bookingId: string;
  lineKey?: string | null;
  hasStoredLineProfiles: boolean;
}): string => {
  const { paymentOrderId, bookingId, lineKey, hasStoredLineProfiles } = params;

  if (hasStoredLineProfiles && paymentOrderId && lineKey) {
    return getNfcProfileDocId(paymentOrderId, lineKey);
  }

  return paymentOrderId || bookingId;
};

/** All doc ids that may own this username for the given order (edit / uniqueness checks). */
export const getOwnedNfcProfileDocIds = (params: {
  paymentOrderId?: string;
  bookingId: string;
  lineKey?: string | null;
  hasStoredLineProfiles: boolean;
}): string[] => {
  const ids = new Set<string>();
  const primary = resolveNfcProfileDocId(params);

  ids.add(primary);
  if (params.bookingId) ids.add(params.bookingId);
  if (params.paymentOrderId) ids.add(params.paymentOrderId);

  return Array.from(ids);
};

export const isNfcLineProfileComplete = (profile: NFCProfile | undefined): boolean => {
  if (!profile) return false;
  if (!profile.name?.trim()) return false;
  return true;
};

export const getNfcLineProfilesFromOrder = (order: {
  nfcLineProfiles?: Array<{ lineKey: string; itemId: string; title: string; nfcProfile: NFCProfile }>;
  nfcProfile?: NFCProfile;
  items?: CartItem[];
}): Array<{ lineKey: string; itemId: string; title: string; nfcProfile: NFCProfile }> => {
  if (order.nfcLineProfiles && order.nfcLineProfiles.length > 0) {
    return order.nfcLineProfiles;
  }

  const nfcUnits = expandNfcCartUnits(order.items || []);
  if (nfcUnits.length > 0) {
    const fallbackProfile = order.nfcProfile || {
      name: "",
      email: "",
      phone: "",
    };

    return nfcUnits.map((unit) => ({
      lineKey: unit.lineKey,
      itemId: unit.itemId,
      title: unit.title,
      nfcProfile: fallbackProfile,
    }));
  }

  return [];
};

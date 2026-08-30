/** Shared cart types (safe for client import). */
export type CartLine = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isAvailable: boolean;
  maxQuantity: number | null;
  stockLeft: number | null;
};

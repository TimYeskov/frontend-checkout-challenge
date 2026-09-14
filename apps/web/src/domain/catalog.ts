import type { Cart, Product } from '@checkout/contracts';

type CartItem = Cart['items'][number];

export function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (let i = 0; i < items.length; i++) map.set(items[i].id, items[i]);
  return map;
}

export function quantityByProduct(items: readonly CartItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < items.length; i++) map.set(items[i].productId, items[i].quantity);
  return map;
}

export type CatalogRow = {
  product: Product;
  inCart: number;
  available: boolean;
};

export function catalogRows(products: readonly Product[], qty: Map<string, number>): CatalogRow[] {
  const rows = new Array<CatalogRow>(products.length);
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    rows[i] = {
      product,
      inCart: qty.get(product.id) ?? 0,
      available: product.stock > 0,
    };
  }
  return rows;
}

export type CartLine = {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
};

export function cartLines(cart: Cart, products: Map<string, Product>): CartLine[] {
  const items = cart.items;
  const lines = new Array<CartLine>(items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    lines[i] = {
      productId: item.productId,
      title: item.title,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      stock: products.get(item.productId)?.stock ?? item.quantity,
    };
  }
  return lines;
}

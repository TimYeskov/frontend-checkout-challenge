import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Cart, Product } from '@checkout/contracts';
import { api, ensureSession } from '../api/resources';
import {
  cartLines,
  catalogRows,
  indexById,
  quantityByProduct,
  type CartLine,
  type CatalogRow,
} from '../domain/catalog';
import { AppError, isAbortError, toAppError } from '../http';

type ShopValue = {
  ready: boolean;
  loading: boolean;
  error: AppError | null;
  products: Product[];
  cart: Cart | null;
  rows: CatalogRow[];
  lines: CartLine[];
  refresh: () => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
};

const ShopContext = createContext<ShopValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const productSeq = useRef(0);
  const cartSeq = useRef(0);

  const applyCart = useCallback(async (seq: number) => {
    const next = await api.cart();
    if (seq !== cartSeq.current) return;
    setCart(next.data);
  }, []);

  const refresh = useCallback(async () => {
    const nextProducts = (productSeq.current += 1);
    const nextCart = (cartSeq.current += 1);
    setLoading(true);
    setError(null);
    try {
      await ensureSession();
      const [productResult, cartResult] = await Promise.all([api.products(), api.cart()]);
      if (nextProducts === productSeq.current) setProducts(productResult.data);
      if (nextCart === cartSeq.current) setCart(cartResult.data);
      setReady(true);
    } catch (value) {
      if (isAbortError(value)) return;
      if (nextCart === cartSeq.current) setError(toAppError(value));
    } finally {
      if (nextCart === cartSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      productSeq.current += 1;
      cartSeq.current += 1;
    };
  }, [refresh]);

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const seq = (cartSeq.current += 1);
      setError(null);
      try {
        await api.setItem(productId, quantity);
        await applyCart(seq);
      } catch (value) {
        if (seq !== cartSeq.current || isAbortError(value)) return;
        setError(toAppError(value));
        try {
          await applyCart(seq);
        } catch {
          /* keep the last known cart */
        }
      }
    },
    [applyCart],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      const seq = (cartSeq.current += 1);
      setError(null);
      try {
        await api.removeItem(productId);
        await applyCart(seq);
      } catch (value) {
        if (seq !== cartSeq.current || isAbortError(value)) return;
        setError(toAppError(value));
      }
    },
    [applyCart],
  );

  const productsById = useMemo(() => indexById(products), [products]);
  const qtyByProduct = useMemo(() => quantityByProduct(cart?.items ?? []), [cart]);
  const rows = useMemo(() => catalogRows(products, qtyByProduct), [products, qtyByProduct]);
  const lines = useMemo(
    () => (cart ? cartLines(cart, productsById) : []),
    [cart, productsById],
  );

  const value = useMemo<ShopValue>(
    () => ({
      ready,
      loading,
      error,
      products,
      cart,
      rows,
      lines,
      refresh,
      setQuantity,
      removeItem,
    }),
    [ready, loading, error, products, cart, rows, lines, refresh, setQuantity, removeItem],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopValue {
  const value = useContext(ShopContext);
  if (!value) throw new Error('useShop must be used inside ShopProvider');
  return value;
}

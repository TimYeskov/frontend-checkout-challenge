import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ShopProvider } from './state/ShopContext';
import { Layout } from './ui/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { OrderPage } from './pages/OrderPage';

export function App() {
  return (
    <ShopProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<CatalogPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders/:orderId/pay" element={<PaymentPage />} />
            <Route path="orders/:orderId" element={<OrderPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ShopProvider>
  );
}

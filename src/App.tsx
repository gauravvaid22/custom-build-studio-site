import { useEffect, useRef } from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";
import { Header, Footer } from "./components/Shared";
import Analytics from "./components/Analytics";
import Seo from "./components/Seo";
import Home from "./pages/Home";
import { Services, ServiceDetail } from "./pages/Services";
import { Work, ProjectDetail } from "./pages/Work";
import Contact from "./pages/Contact";
import { CartProvider } from "./components/Cart";
import { Shop, ShopProduct, ShopCart, Checkout, OrderConfirmation, ShopAdmin } from "./pages/Shop";
import {
  About,
  Pricing,
  Products,
  Reviews,
  Privacy,
  ThankYou,
  NotFound,
} from "./pages/Studio";
import projects from "./data/projects.json";
import { allServices as services } from "./data/landing";
function ValidService() {
  const { id } = useParams();
  return services.some((s) => s.id === id) ? <ServiceDetail /> : <NotFound />;
}
function ValidProject() {
  const { id } = useParams();
  return projects.some((p) => p.id === id) ? <ProjectDetail /> : <NotFound />;
}
export default function App() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.getElementById("main")?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    }
    if (location.hash) {
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
    }
  }, [location.pathname, location.hash]);
  return (
    <CartProvider>
      <Seo />
      <Analytics />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ValidService />} />
          <Route path="/work" element={<Work />} />
          <Route path="/work/:id" element={<ValidProject />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/products" element={<Products />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/halloween" element={<Shop key="halloween" halloween />} />
          <Route path="/shop/cart" element={<ShopCart />} />
          <Route path="/shop/checkout" element={<Checkout />} />
          <Route path="/shop/order" element={<OrderConfirmation />} />
          <Route path="/shop/admin" element={<ShopAdmin />} />
          <Route path="/shop/:id" element={<ShopProduct />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/contact" element={<Contact key={location.search} />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/thank-you.html" element={<ThankYou />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </CartProvider>
  );
}

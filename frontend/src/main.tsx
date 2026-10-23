import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  ArrowUpRight,
  CircuitBoard,
  ShoppingBag,
  UserRound,
  Search,
  Truck,
  ShieldCheck,
  Headphones,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { StoreProvider, useStore } from "./state";
import {
  CatalogPage,
  ProductPage,
  AuthPage,
  CartPage,
  OrdersPage,
  OrderPage,
  AccountPage,
} from "./pages";
import { AdminPage } from "./admin";
import { PCBuilderPage } from "./PCBuilderPage";
import { ThemeToggle } from "./components";
import "./styles.css";

function Shell() {
  const { user, logout, cart, notice, notify, theme, toggleTheme } = useStore(),
    navigate = useNavigate(),
    location = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isBuilder = location.pathname === "/builder";

  return (
    <>
      {!isBuilder && (
        <>
          <div className="announcement">
            <span>GOOD COMPONENTS. GREAT POSSIBILITIES.</span>
            <span>
              Free delivery across Thailand <ArrowUpRight size={13} />
            </span>
          </div>
          <header>
            <div className="header-inner">
              <Link to="/" className="wordmark">
                <span className="brand-icon">
                  <CircuitBoard size={25} />
                </span>
                circuit<span className="brand-light">supply</span>
                <span className="brand-dot">®</span>
              </Link>
              <form
                className="header-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  const q = new FormData(event.currentTarget).get("q");
                  navigate(`/?q=${encodeURIComponent(String(q || ""))}`);
                }}
              >
                <Search size={18} />
                <input
                  key={location.search}
                  name="q"
                  aria-label="Search products"
                  placeholder="Search for your next upgrade"
                  defaultValue={
                    new URLSearchParams(location.search).get("q") || ""
                  }
                />
                <kbd>↵</kbd>
              </form>
              <div className="header-actions">
                <ThemeToggle />
                <Link
                  to={user ? "/account" : "/login"}
                  className="account-link"
                >
                  <UserRound size={21} />
                  <span>{user ? user.name.split(" ")[0] : "Sign in"}</span>
                </Link>
                <Link
                  to="/cart"
                  className="cart-link"
                  aria-label={`Cart with ${cart.reduce((sum, p) => sum + p.quantity, 0)} items`}
                >
                  <ShoppingBag size={21} />
                  <span>Cart</span>
                  <b>{cart.reduce((sum, p) => sum + p.quantity, 0)}</b>
                </Link>
                {user && (
                  <button
                    className="icon-button logout-button"
                    title="Sign out"
                    onClick={() =>
                      logout()
                        .then(() => navigate("/"))
                        .catch((e) => notify(e.message))
                    }
                  >
                    <LogOut size={17} />
                  </button>
                )}
              </div>
            </div>
            <nav>
              <div className="nav-inner">
                <NavLink to="/" end>
                  All products
                </NavLink>
                <NavLink to="/builder">3D PC Builder</NavLink>
                <Link to="/?category=cpu">PC components</Link>
                <Link to="/?category=monitor">Monitors</Link>
                <Link to="/?category=laptop">Laptops</Link>
                {user && <NavLink to="/orders">My orders</NavLink>}
                {user?.role === "admin" && (
                  <NavLink to="/admin">Store admin</NavLink>
                )}
                <span className="nav-note">
                  <span /> Built for your next build
                </span>
              </div>
            </nav>
          </header>
        </>
      )}
      <main>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/builder" element={<PCBuilderPage />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>Page not found</h1>
                <Link to="/">Back to the store</Link>
              </div>
            }
          />
        </Routes>
      </main>
      {!isBuilder && (
        <>
          <section className="service-strip">
            <div>
              <Truck />
              <span>
                <strong>Delivery, on us</strong>
                <small>Free shipping across Thailand</small>
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <strong>Made for peace of mind</strong>
                <small>Transparent prices. No hidden fees.</small>
              </span>
            </div>
            <div>
              <Headphones />
              <span>
                <strong>Built around your needs</strong>
                <small>Specifications that make sense</small>
              </span>
            </div>
          </section>
          <footer>
            <Link to="/" className="wordmark">
              <CircuitBoard size={22} />
              circuit<span className="brand-light">supply</span>
            </Link>
            <span>A little more power. A lot more possibility.</span>
            <small>Course project · Simulated payments only</small>
          </footer>
        </>
      )}
      {notice && (
        <div role="status" className="toast">
          {notice}
        </div>
      )}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setCSRF } from "./api";
import type { CartItem, Product, User } from "./types";

export type Theme = "dark" | "light";

type State = {
  user: User | null;
  ready: boolean;
  authenticate: (data: { user: User; csrf_token: string }) => void;
  logout: () => Promise<void>;
  cart: CartItem[];
  add: (product: Product) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
  notice: string;
  notify: (text: string) => void;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};
const Store = createContext<State>(null!);
export const useStore = () => useContext(Store);

export const LEGACY_BUILDER_ID_MAP: Record<string, string> = {
  "cpu-9950x3d": "3e821709-c2fa-59d1-b570-d0d55483e428",
  "cpu-14900ks": "f4dd78b2-5927-5eac-8d97-09a6ab59587f",
  "cpu-7800x3d": "fc437841-8134-599c-9385-995430a3e181",
  "cpu-14700k": "45f05cf7-74af-5b96-b9be-9ee292b9d843",
  "mb-x670e-hero": "2d6cfb3c-ea4d-561b-96f1-4ac8c09586c2",
  "mb-z790-dark": "4ff78ff6-06b6-5c01-b51f-3200654c04b4",
  "mb-b650-tomahawk": "452f24db-df5c-587c-a3b1-0eaefa41f7fb",
  "mb-z790-aorus": "db114746-9db1-5869-80f1-862340af5c9e",
  "gpu-4090-strix": "b511b224-430a-5bdd-ada6-ee7ec6076f96",
  "gpu-7900xtx-nitro": "230b8f75-8ddb-5fe7-b106-64539226c183",
  "gpu-4080s-proart": "b1b532c7-c517-54f1-b2a5-d9f4c0a4779d",
  "gpu-7800xt-pulse": "ae6b38f2-74ff-529d-ba90-d1893ad07d80",
  "cooler-ryujin-360": "8383a7e7-9512-528a-addb-62e929701fa7",
  "cooler-kraken-elite": "f025f984-fd5f-5143-a651-9a84a98c7196",
  "cooler-nh-d15": "b1004ae0-2863-5a43-9c6c-95c340d85ecd",
  "ram-trident-z5": "0655a597-cb15-5eec-af24-039b3b86c07d",
  "ram-dominator-titanium": "d6038a6c-40e9-5685-9b0a-dc9848e43a4e",
  "ram-fury-beast": "17bce453-13a6-58fe-a241-06c881e35e80",
  "ssd-990-pro-2tb": "bbecf3ae-4800-57cd-86d6-616b41739c57",
  "ssd-sn850x-2tb": "71429aeb-47a2-5cec-9e18-11bdabb7f633",
  "psu-prime-tx1000": "0dae6b52-197c-5d0c-990b-4c832d9edfa0",
  "psu-darkpower-1300": "054804f4-9c19-5636-8483-46817c9d0e16",
  "psu-rm850x": "e697fbc3-6d37-51cb-88c2-9caf19bc7021",
};

function readCart(): CartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem("circuit-cart") || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (v: CartItem) =>
              typeof v.id === "string" &&
              typeof v.name === "string" &&
              Number.isFinite(Number(v.price)) &&
              Number(v.price) >= 0 &&
              Number.isInteger(v.quantity) &&
              v.quantity > 0 &&
              v.quantity <= 100,
          )
          .map((v: CartItem) => ({
            ...v,
            id: LEGACY_BUILDER_ID_MAP[v.id] || v.id,
          }))
      : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [cart, setCart] = useState<CartItem[]>(readCart),
    [notice, setNotice] = useState("");

  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("circuit-theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch {}
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("circuit-theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  function authenticate(data: { user: User; csrf_token: string }) {
    setUser(data.user);
    setCSRF(data.csrf_token);
  }
  useEffect(() => {
    api<{ user: User; csrf_token: string }>("/auth/me")
      .then(authenticate)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("circuit-cart", JSON.stringify(cart));
    } catch {
      /* Cart remains usable if storage is disabled. */
    }
  }, [cart]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setCSRF("");
  }
  function add(product: Product) {
    setCart((old) => {
      const existing = old.find((item) => item.id === product.id);
      return existing
        ? old.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, product.quantity, 100),
                }
              : item,
          )
        : [
            ...old,
            {
              id: product.id,
              name: product.name,
              category: product.category,
              price: product.price,
              quantity: 1,
            },
          ];
    });
    setNotice("Added to your cart");
  }
  return (
    <Store.Provider
      value={{
        user,
        ready,
        authenticate,
        logout,
        cart,
        add,
        update: (id, quantity) =>
          setCart((old) =>
            quantity <= 0
              ? old.filter((item) => item.id !== id)
              : old.map((item) =>
                  item.id === id
                    ? { ...item, quantity: Math.min(quantity, 100) }
                    : item,
                ),
          ),
        clear: () => setCart([]),
        notice,
        notify: setNotice,
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </Store.Provider>
  );
}

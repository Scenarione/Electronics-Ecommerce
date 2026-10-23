import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, X, Pencil, PackageCheck } from "lucide-react";
import { gsap } from "gsap";
import { api, money } from "./api";
import { ErrorBox, Loading } from "./components";
import { useStore } from "./state";
import type { Category, Order, Product } from "./types";

export function AdminPage() {
  const { user, ready, notify } = useStore(),
    [tab, setTab] = useState<"products" | "orders">("products"),
    [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Product | "new" | null>(null),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [total, setTotal] = useState(0),
    [search, setSearch] = useState("");

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      api<Category[]>("/categories")
        .then(setCategories)
        .catch((e) => setError(e.message));
    }
  }, [user]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    setLoading(true);
    setError("");
    if (tab === "products")
      api<{ items: Product[]; total: number }>(
        `/admin/products?page=${page}&q=${encodeURIComponent(search)}`,
      )
        .then((d) => {
          setProducts(d.items);
          setTotal(d.total);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    else
      api<{ items: Order[] }>(`/admin/orders?page=${page}`)
        .then((d) => setOrders(d.items))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
  }, [user, tab, page, revision, search]);

  // Purposeful GSAP Table Row Stagger
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (tableRef.current && !loading) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          "tbody tr",
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.25,
            stagger: 0.015,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      }, tableRef);
      return () => ctx.revert();
    }
  }, [tab, page, revision, loading]);

  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "admin")
    return (
      <div className="container page">
        <h1>Administrator access required</h1>
        <Link to="/">Back to the store</Link>
      </div>
    );

  async function ship(id: string) {
    try {
      await api(`/admin/orders/${id}/ship`, { method: "POST" });
      notify("Order marked as shipped");
      setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="container page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">STORE WORKSPACE</span>
          <h1>Keep good things moving.</h1>
        </div>
        {tab === "products" && (
          <button className="button dark" onClick={() => setEditing("new")}>
            <Plus size={17} /> New product
          </button>
        )}
      </div>
      <div className="tabs">
        <button
          className={tab === "products" ? "active" : ""}
          onClick={() => {
            setTab("products");
            setPage(1);
          }}
        >
          Catalog & inventory
        </button>
        <button
          className={tab === "orders" ? "active" : ""}
          onClick={() => {
            setTab("orders");
            setPage(1);
          }}
        >
          Orders
        </button>
      </div>
      <ErrorBox message={error} />
      {tab === "products" && (
        <label className="admin-search">
          Find a product
          <input
            aria-label="Find a product"
            placeholder="Search product names"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
      )}
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="table-scroll panel" ref={tableRef}>
            <table>
              <thead>
                {tab === "products" ? (
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tab === "products"
                  ? products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          <small className="block muted">{p.sku}</small>
                        </td>
                        <td>{p.category}</td>
                        <td>{money(p.price)}</td>
                        <td>{p.quantity}</td>
                        <td>
                          <span
                            className={`badge ${p.active ? "paid" : "payment_failed"}`}
                          >
                            {p.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => setEditing(p)}
                          >
                            <Pencil size={17} />
                          </button>
                        </td>
                      </tr>
                    ))
                  : orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/orders/${o.id}`}>
                            #{o.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>{money(o.total)}</td>
                        <td>
                          <span className={`badge ${o.status}`}>
                            {o.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          {o.status === "paid" && (
                            <button
                              className="button subtle"
                              onClick={() => ship(o.id)}
                            >
                              <PackageCheck size={16} /> Mark shipped
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>Page {page}</span>
            <button
              disabled={
                tab === "products" ? page * 20 >= total : orders.length < 20
              }
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {editing && (
        <ProductEditor
          key={editing === "new" ? "new" : editing.id}
          product={editing === "new" ? null : editing}
          categories={categories}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            setRevision((v) => v + 1);
            notify("Product saved");
          }}
        />
      )}
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  close,
  saved,
}: {
  product: Product | null;
  categories: Category[];
  close: () => void;
  saved: () => void;
}) {
  const [category, setCategory] = useState(
      product?.category || categories[0]?.id || "cpu",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [identifier] = useState(product?.id || crypto.randomUUID());
  const definition = categories.find((c) => c.id === category);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          modalRef.current,
          { opacity: 0, scale: 0.95, y: 10 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.25,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      }, modalRef);
      return () => ctx.revert();
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const specifications = Object.fromEntries(
      Object.entries(definition?.attributes || {}).map(([key, rule]) => [
        key,
        rule.type === "number"
          ? Number(form.get(`spec-${key}`))
          : String(form.get(`spec-${key}`)),
      ]),
    );
    const catalogBody = {
      name: form.get("name"),
      brand: form.get("brand"),
      description: form.get("description"),
      images: String(form.get("images") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      specifications,
    };
    try {
      if (product) {
        await api(`/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify(catalogBody),
        });
        await api(`/products/${product.id}/commerce`, {
          method: "PATCH",
          body: JSON.stringify({
            price: form.get("price"),
            active: form.get("active") === "on",
          }),
        });
        const delta = Number(form.get("delta"));
        if (delta)
          await api(`/products/${product.id}/inventory`, {
            method: "POST",
            body: JSON.stringify({ delta }),
          });
      } else {
        await api("/products", {
          method: "POST",
          body: JSON.stringify({
            ...catalogBody,
            id: identifier,
            sku: form.get("sku"),
            slug: form.get("slug"),
            category,
            price: form.get("price"),
            quantity: Number(form.get("quantity")),
          }),
        });
      }
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        ref={modalRef}
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="section-heading">
          <h2 id="editor-title">
            {product ? "Edit product" : "A new addition to the circuit"}
          </h2>
          <button
            className="icon-button"
            aria-label="Close editor"
            disabled={busy}
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <ErrorBox message={error} />
          <label>
            Product name
            <input
              name="name"
              defaultValue={product?.name}
              required
              maxLength={200}
              autoFocus
            />
          </label>
          <div className="form-row">
            <label>
              Brand
              <input
                name="brand"
                defaultValue={product?.brand}
                required
                maxLength={80}
              />
            </label>
            <label>
              Category
              <select
                aria-label="Category"
                value={category}
                disabled={!!product}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!product && (
            <div className="form-row">
              <label>
                SKU
                <input name="sku" required pattern="[A-Za-z0-9_-]+" />
              </label>
              <label>
                URL slug
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  placeholder="my-new-product"
                />
              </label>
            </div>
          )}
          <label>
            Description
            <textarea
              name="description"
              defaultValue={product?.description}
              maxLength={5000}
              rows={3}
            />
          </label>
          <label>
            Image URLs (one per line)
            <textarea
              name="images"
              defaultValue={product?.images.join("\n")}
              rows={2}
            />
          </label>
          <h3>Specifications</h3>
          <div className="form-row spec-fields" key={category}>
            {Object.entries(definition?.attributes || {}).map(([key, rule]) => (
              <label key={key}>
                {rule.label}
                {rule.unit ? ` (${rule.unit})` : ""}
                {rule.values ? (
                  <select
                    aria-label={`${rule.label}${rule.unit ? ` (${rule.unit})` : ""}`}
                    name={`spec-${key}`}
                    defaultValue={product?.specifications[key]}
                    required
                  >
                    {rule.values.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={`spec-${key}`}
                    type={rule.type === "number" ? "number" : "text"}
                    min={rule.type === "number" ? 0 : undefined}
                    step="any"
                    defaultValue={product?.specifications[key]}
                    required={rule.required}
                  />
                )}
              </label>
            ))}
          </div>
          <h3>Commerce & inventory</h3>
          <div className="form-row">
            <label>
              Price (THB)
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                max="99999999"
                required
                defaultValue={product?.price}
              />
            </label>
            {product ? (
              <label>
                Stock adjustment (+/−)
                <input name="delta" type="number" step="1" defaultValue={0} />
                <small>Current quantity: {product.quantity}</small>
              </label>
            ) : (
              <label>
                Opening stock
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={0}
                />
              </label>
            )}
          </div>
          {product && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={product.active}
              />{" "}
              Available for purchase
            </label>
          )}
          <button className="button dark wide" disabled={busy}>
            {busy ? "Saving…" : "Save product"}
          </button>
        </form>
      </section>
    </div>
  );
}

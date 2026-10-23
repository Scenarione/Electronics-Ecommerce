import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Package,
  SlidersHorizontal,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { gsap } from "gsap";
import { api, money } from "./api";
import {
  categoryIcons,
  ErrorBox,
  Loading,
  ProductArt,
  ProductCard,
} from "./components";
import { useStore } from "./state";
import type { Category, Order, Product, User } from "./types";

const PAGE_SIZE = 15;

export function CatalogPage() {
  const [params, setParams] = useSearchParams(),
    [categories, setCategories] = useState<Category[]>([]),
    [data, setData] = useState<{
      items: Product[];
      total: number;
      page?: number;
      page_size?: number;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [pricePopoverOpen, setPricePopoverOpen] = useState<boolean>(false);
  const pricePopoverRef = useRef<HTMLDivElement>(null);

  const category = params.get("category") || "",
    page = Number(params.get("page") || 1),
    q = params.get("q") || "",
    minPrice = params.get("min_price") || "",
    maxPrice = params.get("max_price") || "";

  const [tempMinPrice, setTempMinPrice] = useState(minPrice);
  const [tempMaxPrice, setTempMaxPrice] = useState(maxPrice);

  useEffect(() => {
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  const hasPriceFilter = Boolean(minPrice || maxPrice);

  const current = categories.find((c) => c.id === category);
  let filters: Record<string, string | number> = {};
  try {
    filters = JSON.parse(params.get("filters") || "{}");
  } catch {
    /* Ignore malformed URL until backend validation. */
  }

  const activeFilterCount =
    Object.keys(filters).length +
    (params.get("brand") ? 1 : 0) +
    (hasPriceFilter ? 1 : 0);

  const heroRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Close filter popovers on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        filterOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
      if (
        pricePopoverOpen &&
        pricePopoverRef.current &&
        !pricePopoverRef.current.contains(e.target as Node)
      ) {
        setPricePopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen, pricePopoverOpen]);

  function applyPriceFilter(min: string, max: string) {
    const next = new URLSearchParams(params);
    const trimmedMin = min.trim();
    const trimmedMax = max.trim();
    if (trimmedMin) next.set("min_price", trimmedMin);
    else next.delete("min_price");
    if (trimmedMax) next.set("max_price", trimmedMax);
    else next.delete("max_price");
    next.delete("page");
    setParams(next);
    setPricePopoverOpen(false);
  }

  const PRICE_PRESETS = [
    { label: "Under ฿5K", min: "", max: "5000" },
    { label: "฿5K - ฿15K", min: "5000", max: "15000" },
    { label: "฿15K - ฿35K", min: "15000", max: "35000" },
    { label: "฿35K+", min: "35000", max: "" },
  ];

  useEffect(() => {
    api<Category[]>("/categories")
      .then(setCategories)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    const searchParams = new URLSearchParams(params);
    if (!searchParams.has("page_size")) {
      searchParams.set("page_size", String(PAGE_SIZE));
    }
    api<{ items: Product[]; total: number; page?: number; page_size?: number }>(
      `/products?${searchParams}`,
    )
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [params]);

  // Purposeful GSAP Hero Animation
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (heroRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".hero-copy > *",
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.05,
            ease: "power2.out",
            clearProps: "all",
          },
        );
        gsap.fromTo(
          ".hero-visual",
          { opacity: 0, scale: 0.96 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
            delay: 0.05,
            clearProps: "all",
          },
        );
      }, heroRef);
      return () => ctx.revert();
    }
  }, [category, q]);

  // Sorted items based on client-side sort selector and price bounds
  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    let items = [...data.items];

    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    if (min !== null && !isNaN(min)) {
      items = items.filter((p) => Number(p.price) >= min);
    }
    if (max !== null && !isNaN(max)) {
      items = items.filter((p) => Number(p.price) <= max);
    }

    switch (sortBy) {
      case "price-asc":
        return items.sort((a, b) => Number(a.price) - Number(b.price));
      case "price-desc":
        return items.sort((a, b) => Number(b.price) - Number(a.price));
      case "name-asc":
        return items.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return items.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return items;
    }
  }, [data?.items, sortBy, minPrice, maxPrice]);

  // Purposeful GSAP Product Grid Stagger
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sortedItems.length && gridRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".product-card",
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.02,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      }, gridRef);
      return () => ctx.revert();
    }
  }, [sortedItems]);

  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    if (key === "category") next.delete("filters");
    setParams(next);
  }

  return (
    <div className="container catalog-page">
      <div className="breadcrumb">
        Home <ChevronRight size={12} /> <span>Shop all products</span>
      </div>

      {!category && !q && (
        <section className="hero" ref={heroRef}>
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> THE NEXT CHAPTER OF YOUR SETUP
            </div>
            <h1>
              Small upgrade.
              <br />
              <span>Big difference.</span>
            </h1>
            <p>
              From your first build to your next obsession.
              <br />
              Find the parts that bring your possibilities to life.
            </p>
            <a className="button dark" href="#catalog">
              Find your next upgrade <ArrowRight size={17} />
            </a>
            <div className="hero-footnote">
              <Check size={14} /> Thoughtfully selected. Ready to perform.
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="technical-label">PERFORMANCE / REIMAGINED</span>
            <ProductArt category="gpu" large />
            <div className="floating-label">
              <span className="green-dot" /> More frames. More possibilities.
              <ArrowUpRightIcon />
            </div>
            <span className="hero-index">01 / THE COMPONENT COLLECTION</span>
          </div>
        </section>
      )}

      {/* Top Horizontal Filter & Category Toolbar (Sticky Shopify-inspired) */}
      <section id="catalog" className="catalog-section">
        <div className="catalog-toolbar-sticky">
          {/* Row 1: Sleek Category Pills */}
          <div className="category-pills-scroll" aria-label="Categories">
            <button
              type="button"
              className={!category ? "category-pill selected" : "category-pill"}
              onClick={() => change("category", "")}
            >
              <Package size={15} />
              <span>All products</span>
            </button>
            {categories.map((c) => {
              const Icon = categoryIcons[c.id] || Package;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={
                    category === c.id
                      ? "category-pill selected"
                      : "category-pill"
                  }
                  onClick={() => change("category", c.id)}
                >
                  <Icon size={15} />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Filter Toolbar (Filters button, Active Facet dropdowns, Count, Sort) */}
          <div className="catalog-toolbar-actions">
            <div className="toolbar-left-group">
              {/* Filters Popover Anchor */}
              <div className="filter-popover-anchor" ref={popoverRef}>
                <button
                  type="button"
                  className={`filter-btn-toggle ${filterOpen ? "open" : ""} ${activeFilterCount > 0 ? "has-filters" : ""}`}
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-expanded={filterOpen}
                  aria-label="Toggle filters popover"
                >
                  <SlidersHorizontal size={14} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="filter-badge">{activeFilterCount}</span>
                  )}
                </button>

                {filterOpen && (
                  <div
                    className="filter-popover-dropdown"
                    role="dialog"
                    aria-label="Filters"
                  >
                    <div className="popover-header">
                      <strong>Refine Products</strong>
                      <button
                        type="button"
                        className="popover-close-btn"
                        onClick={() => setFilterOpen(false)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="popover-body">
                      <div className="popover-field">
                        <label
                          htmlFor="popover-brand-filter"
                          className="popover-label"
                        >
                          Brand
                        </label>
                        <input
                          id="popover-brand-filter"
                          aria-label="Filter by brand"
                          className="popover-input"
                          placeholder="e.g. ASUS, AMD, Corsair"
                          defaultValue={params.get("brand") || ""}
                          key={params.get("brand")}
                          onBlur={(event) =>
                            change("brand", event.target.value.trim())
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              change("brand", event.currentTarget.value.trim());
                              event.currentTarget.blur();
                            }
                          }}
                        />
                      </div>

                      {/* Customer Price Range in Main Filters Popover */}
                      <div className="popover-field">
                        <label className="popover-label">
                          Price Range (THB)
                        </label>
                        <div className="price-inputs-row">
                          <div className="price-input-box">
                            <span className="currency-prefix">฿</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              aria-label="Filter min price"
                              placeholder="Min"
                              value={tempMinPrice}
                              onChange={(e) => setTempMinPrice(e.target.value)}
                              onBlur={() => {
                                const next = new URLSearchParams(params);
                                if (tempMinPrice.trim())
                                  next.set("min_price", tempMinPrice.trim());
                                else next.delete("min_price");
                                next.delete("page");
                                setParams(next);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const next = new URLSearchParams(params);
                                  if (tempMinPrice.trim())
                                    next.set("min_price", tempMinPrice.trim());
                                  else next.delete("min_price");
                                  next.delete("page");
                                  setParams(next);
                                  e.currentTarget.blur();
                                }
                              }}
                            />
                          </div>
                          <span className="price-range-dash">–</span>
                          <div className="price-input-box">
                            <span className="currency-prefix">฿</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              aria-label="Filter max price"
                              placeholder="Max"
                              value={tempMaxPrice}
                              onChange={(e) => setTempMaxPrice(e.target.value)}
                              onBlur={() => {
                                const next = new URLSearchParams(params);
                                if (tempMaxPrice.trim())
                                  next.set("max_price", tempMaxPrice.trim());
                                else next.delete("max_price");
                                next.delete("page");
                                setParams(next);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const next = new URLSearchParams(params);
                                  if (tempMaxPrice.trim())
                                    next.set("max_price", tempMaxPrice.trim());
                                  else next.delete("max_price");
                                  next.delete("page");
                                  setParams(next);
                                  e.currentTarget.blur();
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {current ? (
                        <div className="popover-specs">
                          <span className="popover-label">
                            {current.name} Specifications
                          </span>
                          {Object.entries(current.attributes).map(
                            ([key, rule]) => (
                              <div key={key} className="popover-spec-row">
                                <span className="popover-spec-title">
                                  {rule.label}
                                  {rule.unit ? ` (${rule.unit})` : ""}
                                </span>
                                <div className="popover-chips">
                                  <button
                                    type="button"
                                    className={`popover-chip ${!filters[key] ? "active" : ""}`}
                                    onClick={() => {
                                      const next = { ...filters };
                                      delete next[key];
                                      change(
                                        "filters",
                                        Object.keys(next).length
                                          ? JSON.stringify(next)
                                          : "",
                                      );
                                    }}
                                  >
                                    All
                                  </button>
                                  {(current.facets[key] || []).map((val) => {
                                    const isSelected =
                                      String(filters[key]) === String(val);
                                    return (
                                      <button
                                        key={String(val)}
                                        type="button"
                                        className={`popover-chip ${isSelected ? "active" : ""}`}
                                        onClick={() => {
                                          const next = { ...filters };
                                          if (isSelected) {
                                            delete next[key];
                                          } else {
                                            next[key] =
                                              rule.type === "number"
                                                ? Number(val)
                                                : val;
                                          }
                                          change(
                                            "filters",
                                            Object.keys(next).length
                                              ? JSON.stringify(next)
                                              : "",
                                          );
                                        }}
                                      >
                                        {val} {rule.unit || ""}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="popover-tip">
                          <Package size={15} />
                          <span>
                            Select a category above to unlock socket, refresh
                            rate, and memory filters.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="popover-footer">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          const next = new URLSearchParams(params);
                          next.delete("filters");
                          next.delete("brand");
                          next.delete("min_price");
                          next.delete("max_price");
                          next.delete("page");
                          setTempMinPrice("");
                          setTempMaxPrice("");
                          setParams(next);
                        }}
                      >
                        Reset filters
                      </button>
                      <button
                        type="button"
                        className="button dark popover-apply-btn"
                        onClick={() => setFilterOpen(false)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Price Filter Dropdown Pill */}
              <div className="filter-price-anchor" ref={pricePopoverRef}>
                <button
                  type="button"
                  className={`filter-btn-toggle filter-price-toggle-btn ${pricePopoverOpen ? "open" : ""} ${hasPriceFilter ? "has-filters" : ""}`}
                  onClick={() => setPricePopoverOpen((o) => !o)}
                  aria-expanded={pricePopoverOpen}
                  aria-label="Filter by price"
                >
                  <Coins size={14} />
                  <span>
                    {minPrice && maxPrice
                      ? `฿${Number(minPrice).toLocaleString()} - ฿${Number(maxPrice).toLocaleString()}`
                      : minPrice
                        ? `≥ ฿${Number(minPrice).toLocaleString()}`
                        : maxPrice
                          ? `≤ ฿${Number(maxPrice).toLocaleString()}`
                          : "Price"}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`price-caret ${pricePopoverOpen ? "rotate" : ""}`}
                  />
                </button>

                {pricePopoverOpen && (
                  <div
                    className="filter-popover-dropdown price-popover-menu"
                    role="dialog"
                    aria-label="Filter by price"
                  >
                    <div className="popover-header">
                      <strong>Price Range (THB)</strong>
                      <button
                        type="button"
                        className="popover-close-btn"
                        onClick={() => setPricePopoverOpen(false)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="popover-body">
                      {/* Quick Presets */}
                      <div className="price-presets-wrap">
                        <span className="popover-label">Quick Presets</span>
                        <div className="popover-chips">
                          {PRICE_PRESETS.map((preset) => {
                            const isSelected =
                              minPrice === preset.min &&
                              maxPrice === preset.max;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                className={`popover-chip ${isSelected ? "active" : ""}`}
                                onClick={() => {
                                  if (isSelected) {
                                    applyPriceFilter("", "");
                                  } else {
                                    setTempMinPrice(preset.min);
                                    setTempMaxPrice(preset.max);
                                    applyPriceFilter(preset.min, preset.max);
                                  }
                                }}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Range Inputs */}
                      <div className="price-custom-inputs">
                        <span className="popover-label">
                          Custom Range (THB)
                        </span>
                        <div className="price-inputs-row">
                          <div className="price-input-box">
                            <span className="currency-prefix">฿</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              aria-label="Minimum price in THB"
                              placeholder="Min"
                              value={tempMinPrice}
                              onChange={(e) => setTempMinPrice(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  applyPriceFilter(tempMinPrice, tempMaxPrice);
                                }
                              }}
                            />
                          </div>
                          <span className="price-range-dash">–</span>
                          <div className="price-input-box">
                            <span className="currency-prefix">฿</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              aria-label="Maximum price in THB"
                              placeholder="Max"
                              value={tempMaxPrice}
                              onChange={(e) => setTempMaxPrice(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  applyPriceFilter(tempMinPrice, tempMaxPrice);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="popover-footer">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          setTempMinPrice("");
                          setTempMaxPrice("");
                          applyPriceFilter("", "");
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className="button dark popover-apply-btn"
                        onClick={() =>
                          applyPriceFilter(tempMinPrice, tempMaxPrice)
                        }
                      >
                        Apply Price
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Inline attribute selects for active category (e.g. Socket, Refresh rate) */}
              {current &&
                Object.entries(current.attributes).map(([key, rule]) => (
                  <div key={key} className="filter-pill-select-wrapper">
                    <label
                      htmlFor={`filter-${key}`}
                      className="filter-pill-label"
                    >
                      {rule.label}
                      {rule.unit ? ` (${rule.unit})` : ""}
                    </label>
                    <select
                      id={`filter-${key}`}
                      aria-label={`${rule.label}${rule.unit ? ` (${rule.unit})` : ""}`}
                      className="filter-pill-select"
                      value={filters[key] ?? ""}
                      onChange={(event) => {
                        const next = { ...filters };
                        if (event.target.value)
                          next[key] =
                            rule.type === "number"
                              ? Number(event.target.value)
                              : event.target.value;
                        else delete next[key];
                        change(
                          "filters",
                          Object.keys(next).length ? JSON.stringify(next) : "",
                        );
                      }}
                    >
                      <option value="">All options</option>
                      {(current.facets[key] || []).map((value) => (
                        <option key={value} value={value}>
                          {value} {rule.unit || ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="filter-reset-link"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("filters");
                    next.delete("brand");
                    next.delete("min_price");
                    next.delete("max_price");
                    next.delete("page");
                    setTempMinPrice("");
                    setTempMaxPrice("");
                    setParams(next);
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="toolbar-right-group">
              <span className="product-count-text">
                {data ? `${data.total.toLocaleString()} products` : "—"}
              </span>

              <div className="sort-selector-wrap">
                <label htmlFor="catalog-sort-select" className="sr-only">
                  Sort by
                </label>
                <select
                  id="catalog-sort-select"
                  aria-label="Sort products"
                  className="sort-dropdown-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Alphabetical: A-Z</option>
                  <option value="name-desc">Alphabetical: Z-A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Grid - Full Width, No Sidebar */}
        <div className="catalog-full-results">
          <ErrorBox message={error} />
          {loading ? (
            <Loading />
          ) : sortedItems.length ? (
            <>
              <div className="product-grid" ref={gridRef}>
                {sortedItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="pagination">
                <span>
                  Page {page} of{" "}
                  {Math.max(
                    1,
                    Math.ceil(data!.total / (data?.page_size || PAGE_SIZE)),
                  )}
                </span>
                <button
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("page", String(page - 1));
                    setParams(next);
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="Next page"
                  disabled={
                    page * (data?.page_size || PAGE_SIZE) >= data!.total
                  }
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("page", String(page + 1));
                    setParams(next);
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            !error && (
              <div className="empty-state">
                <SearchEmpty />
                <h3>No matching products</h3>
                <p>Try a different search or reset your filters.</p>
                <button
                  className="button dark"
                  style={{ marginTop: 12 }}
                  onClick={() => setParams(category ? { category } : {})}
                >
                  Reset filters
                </button>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} style={{ transform: "rotate(-35deg)" }} />;
}
function SearchEmpty() {
  return <Package size={36} />;
}

export function ProductPage() {
  const { id } = useParams(),
    { add } = useStore(),
    [product, setProduct] = useState<Product | null>(null),
    [error, setError] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProduct(null);
    setError("");
    api<Product>(`/products/${id}`)
      .then(setProduct)
      .catch((e) => setError(e.message));
  }, [id]);

  // Purposeful GSAP Detail Entrance
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (product && pageRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".detail-art",
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.45,
            ease: "power2.out",
            clearProps: "all",
          },
        );
        gsap.fromTo(
          ".detail-grid > div:last-child > *",
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.04,
            ease: "power2.out",
            clearProps: "all",
          },
        );
        gsap.fromTo(
          ".spec-table > div",
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.02,
            ease: "power2.out",
            delay: 0.1,
            clearProps: "all",
          },
        );
      }, pageRef);
      return () => ctx.revert();
    }
  }, [product]);

  if (error)
    return (
      <div className="container page">
        <ErrorBox message={error} />
        <Link to="/">Back to products</Link>
      </div>
    );
  if (!product) return <Loading />;
  return (
    <div className="container page" ref={pageRef}>
      <Link to={`/?category=${product.category}`} className="back-link">
        <ChevronLeft size={16} /> Back to {product.category}
      </Link>
      <div className="detail-grid">
        <div className="detail-art">
          {product.images.length ? (
            <img src={product.images[0]} alt={product.name} />
          ) : (
            <ProductArt category={product.category} large />
          )}
        </div>
        <div>
          <span className="eyebrow">
            {product.brand} / {product.sku}
          </span>
          <h1 className="detail-title">{product.name}</h1>
          <span className="stock">
            {product.quantity
              ? `${product.quantity} available · Ready for your setup`
              : "Currently out of stock"}
          </span>
          <p className="description">{product.description}</p>
          <div className="detail-price">{money(product.price)}</div>
          <p className="muted">Final demo price · Free shipping</p>
          <button
            className="button dark wide"
            disabled={!product.quantity}
            onClick={() => add(product)}
          >
            <ShoppingBag size={18} /> Add to cart
          </button>
          <div className="detail-perk">
            <Truck size={20} /> Free delivery across Thailand
          </div>
        </div>
      </div>
      <section className="spec-section">
        <h2>Every detail matters.</h2>
        <p className="muted">The specifications behind your next upgrade.</p>
        <dl className="spec-table">
          {Object.entries(product.specifications).map(([key, value]) => (
            <div key={key}>
              <dt>{key.replaceAll("_", " ")}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const { authenticate, user } = useStore(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const authRef = useRef<HTMLDivElement>(null);
  const destination = params.get("next") === "/cart" ? "/cart" : "/";

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (authRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".auth-intro",
          { opacity: 0, x: -16 },
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            ease: "power2.out",
            clearProps: "all",
          },
        );
        gsap.fromTo(
          ".auth-form",
          { opacity: 0, x: 16 },
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      }, authRef);
      return () => ctx.revert();
    }
  }, [register]);

  if (user) return <Navigate to={destination} />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      authenticate(
        await api<{ user: User; csrf_token: string }>(
          register ? "/users" : "/auth/login",
          { method: "POST", body: JSON.stringify(fields) },
        ),
      );
      navigate(destination);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page" ref={authRef}>
      <div className="auth-intro">
        <span className="eyebrow">YOUR NEXT BUILD STARTS HERE</span>
        <h1>
          A better setup.
          <br />A little closer.
        </h1>
        <ProductArt category="cpu" large />
      </div>
      <form className="panel auth-form" onSubmit={submit}>
        <span className="eyebrow">WELCOME TO CIRCUIT SUPPLY</span>
        <h1>
          {register ? "Make yourself at home." : "Good to see you again."}
        </h1>
        <p className="muted">
          {register
            ? "Create an account to save your orders and start upgrading."
            : "Sign in to pick up where you left off."}
        </p>
        <ErrorBox message={error} />
        {register && (
          <label>
            Your name
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
        )}
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={register ? 10 : undefined}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
            required
          />
        </label>
        {register && (
          <small className="muted">Use at least 10 characters.</small>
        )}
        <button className="button dark wide" disabled={busy}>
          {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          <ArrowRight size={17} />
        </button>
        <p className="auth-switch">
          {register ? "Already part of the circuit?" : "New to Circuit Supply?"}{" "}
          <Link to={`${register ? "/login" : "/register"}?next=${destination}`}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </div>
  );
}

export function CartPage() {
  const { cart, update, clear, user, ready } = useStore(),
    navigate = useNavigate(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState<{ key: string; body: string } | null>(
      null,
    );
  const cartRef = useRef<HTMLDivElement>(null);
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (cartRef.current && cart.length > 0) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".cart-item",
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.04,
            ease: "power2.out",
            clearProps: "all",
          },
        );
        gsap.fromTo(
          ".checkout-form",
          { opacity: 0, x: 16 },
          {
            opacity: 1,
            x: 0,
            duration: 0.45,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      }, cartRef);
      return () => ctx.revert();
    }
  }, [cart.length]);

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = JSON.stringify({
      items: cart.map((item) => ({
        item_id: item.id,
        quantity: item.quantity,
      })),
      shipping_address: {
        recipient: values.recipient,
        line1: values.line1,
        city: values.city,
        postal_code: values.postal_code,
        country: "TH",
      },
      simulation: values.simulation,
    });
    const request =
      attempt?.body === body ? attempt : { key: crypto.randomUUID(), body };
    setAttempt(request);
    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": request.key },
        body,
      });
      if (order.status === "paid") clear();
      setAttempt(null);
      navigate(`/orders/${order.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <Loading />;
  return (
    <div className="container page">
      <span className="eyebrow">ONE STEP CLOSER</span>
      <h1>Your next upgrade.</h1>
      {cart.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={44} />
          <h2>Your cart has room for possibilities.</h2>
          <Link to="/" className="button dark">
            Explore the catalog
          </Link>
        </div>
      ) : (
        <div className="checkout-grid" ref={cartRef}>
          <div>
            <div className="panel cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <ProductArt category={item.category} />
                  <div>
                    <Link to={`/products/${item.id}`}>
                      <strong>{item.name}</strong>
                    </Link>
                    <p className="muted">{money(item.price)} each</p>
                    <label className="quantity-label">
                      Quantity
                      <input
                        aria-label={`Quantity for ${item.name}`}
                        type="number"
                        min={1}
                        max={100}
                        value={item.quantity}
                        onChange={(event) => {
                          const q = Number(event.target.value);
                          if (Number.isInteger(q) && q > 0) update(item.id, q);
                        }}
                      />
                    </label>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => update(item.id, 0)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <p className="muted">
              Saved cart prices are estimates. Current prices and stock are
              confirmed at checkout.
            </p>
          </div>
          <form className="panel checkout-form" onSubmit={checkout}>
            <h2>Order summary</h2>
            <div className="summary-line">
              <span>Subtotal estimate</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-line">
              <span>Delivery</span>
              <span className="stock">On us</span>
            </div>
            <div className="summary-line total">
              <span>Estimated total</span>
              <strong>{money(total)}</strong>
            </div>
            {!user ? (
              <Link className="button dark wide" to="/login?next=/cart">
                Sign in to checkout <ArrowRight size={17} />
              </Link>
            ) : (
              <>
                <h3>Where should it go?</h3>
                <label>
                  Recipient
                  <input
                    name="recipient"
                    defaultValue={user.name}
                    required
                    maxLength={120}
                  />
                </label>
                <label>
                  Street address
                  <input
                    name="line1"
                    autoComplete="street-address"
                    required
                    maxLength={200}
                  />
                </label>
                <div className="form-row">
                  <label>
                    City
                    <input name="city" required maxLength={100} />
                  </label>
                  <label>
                    Postal code
                    <input
                      name="postal_code"
                      pattern="[0-9]{5}"
                      inputMode="numeric"
                      required
                    />
                  </label>
                </div>
                <label>
                  Demo payment outcome
                  <select aria-label="Demo payment outcome" name="simulation">
                    <option value="success">Successful payment</option>
                    <option value="failure">Declined payment</option>
                  </select>
                </label>
                <div className="demo-note">
                  This is a course demo. No card details or real money are
                  involved.
                </div>
                <ErrorBox message={error} />
                <button className="button dark wide" disabled={busy}>
                  {busy ? "Placing your order…" : "Place demo order"}
                  <ArrowRight size={17} />
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export function OrdersPage() {
  const { user, ready } = useStore(),
    [orders, setOrders] = useState<Order[] | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    if (user)
      api<{ items: Order[] }>(`/orders?page=${page}`)
        .then((data) => setOrders(data.items))
        .catch((e) => setError(e.message));
  }, [user, page]);
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  return (
    <div className="container page">
      <span className="eyebrow">YOUR BUILD JOURNEY</span>
      <h1>My orders</h1>
      <ErrorBox message={error} />
      {orders ? (
        <>
          <OrderList orders={orders} />
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>Page {page}</span>
            <button
              disabled={orders.length < 20}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <Loading />
      )}
    </div>
  );
}

export function OrderList({ orders }: { orders: Order[] }) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (orders.length && listRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".order-row",
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.03,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      }, listRef);
      return () => ctx.revert();
    }
  }, [orders]);

  return orders.length ? (
    <div className="order-list" ref={listRef}>
      {orders.map((order) => (
        <Link
          to={`/orders/${order.id}`}
          className="panel order-row"
          key={order.id}
        >
          <Package />
          <div>
            <strong>Order #{order.id.slice(0, 8)}</strong>
            <small>{new Date(order.created_at).toLocaleDateString()}</small>
          </div>
          <span className={`badge ${order.status}`}>
            {order.status.replaceAll("_", " ")}
          </span>
          <strong>{money(order.total)}</strong>
          <ChevronRight size={18} />
        </Link>
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <Package size={40} />
      <h2>No orders yet.</h2>
      <Link to="/">Find your next upgrade</Link>
    </div>
  );
}

export function OrderPage() {
  const { id } = useParams(),
    { user, ready } = useStore(),
    [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState("");
  const orderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user)
      api<Order>(`/orders/${id}`)
        .then(setOrder)
        .catch((e) => setError(e.message));
  }, [id, user]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (order && orderRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".order-success",
          { opacity: 0, scale: 0.95 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.35,
            ease: "power2.out",
            clearProps: "all",
          },
        );
        gsap.fromTo(
          ".panel",
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            delay: 0.05,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      }, orderRef);
      return () => ctx.revert();
    }
  }, [order]);

  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  return (
    <div className="container page narrow" ref={orderRef}>
      <ErrorBox message={error} />
      {order ? (
        <>
          <div className="order-success">
            {order.status === "payment_failed" ? (
              <ShoppingBag size={38} />
            ) : (
              <CheckCircle2 size={44} />
            )}
            <span className="eyebrow">ORDER #{order.id.slice(0, 8)}</span>
            <h1>
              {order.status === "payment_failed"
                ? "That payment didn’t go through."
                : order.status === "shipped"
                  ? "Your upgrade is on its way."
                  : "Your next upgrade is on the list."}
            </h1>
            <p>
              {order.status === "payment_failed"
                ? "No stock was deducted. Your cart is ready for another attempt."
                : "Order confirmed. Thanks for building with Circuit Supply."}
            </p>
            <span className={`badge ${order.status}`}>
              {order.status.replaceAll("_", " ")}
            </span>
          </div>
          <div className="panel">
            {order.items?.map((item) => (
              <div className="summary-line" key={item.item_id}>
                <span>
                  {item.name}
                  <small className="block muted">
                    {item.quantity} × {money(item.unit_price)}
                  </small>
                </span>
                <strong>
                  {money(Number(item.unit_price) * item.quantity)}
                </strong>
              </div>
            ))}
            <div className="summary-line total">
              <strong>Total</strong>
              <strong>{money(order.total)}</strong>
            </div>
            <h3>Delivery address</h3>
            <p className="muted">
              {Object.values(order.shipping_address).join(", ")}
            </p>
            <small className="muted">
              Simulated payment reference: {order.payment?.reference}
            </small>
          </div>
          <Link
            className="button dark"
            to={order.status === "payment_failed" ? "/cart" : "/orders"}
          >
            {order.status === "payment_failed"
              ? "Return to cart"
              : "View all orders"}
            <ArrowRight size={16} />
          </Link>
        </>
      ) : (
        !error && <Loading />
      )}
    </div>
  );
}

export function AccountPage() {
  const { user, ready, notify, authenticate, logout } = useStore(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (accountRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".panel",
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      }, accountRef);
      return () => ctx.revert();
    }
  }, []);

  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api<User>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      authenticate(await api<{ user: User; csrf_token: string }>("/auth/me"));
      notify("Account details updated");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page narrow" ref={accountRef}>
      <span className="eyebrow">YOUR CORNER OF THE CIRCUIT</span>
      <h1>Account details</h1>
      <form className="panel" onSubmit={save}>
        <ErrorBox message={error} />
        <label>
          Name
          <input
            name="name"
            defaultValue={user.name}
            required
            maxLength={120}
          />
        </label>
        <label>
          Email
          <input value={user.email} readOnly />
        </label>
        <button className="button dark" disabled={busy}>
          Save changes
        </button>
      </form>
      <button
        className="button subtle"
        style={{ marginTop: 16 }}
        onClick={() => logout().catch((e) => setError(e.message))}
      >
        Sign out
      </button>
    </div>
  );
}

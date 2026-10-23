import { useState } from "react";
import {
  Cpu,
  CircuitBoard,
  Monitor,
  MemoryStick,
  Laptop,
  CircuitBoard as Gpu,
  ArrowUpRight,
  Plus,
  Check,
  LoaderCircle,
  ShoppingBag,
  Sun,
  Moon,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "./types";
import { money } from "./api";
import { useStore } from "./state";

export const categoryIcons: Record<string, typeof Cpu> = {
  cpu: Cpu,
  gpu: Gpu,
  ram: MemoryStick,
  motherboard: CircuitBoard,
  monitor: Monitor,
  laptop: Laptop,
};

export function ProductArt({
  category,
  large = false,
}: {
  category: string;
  large?: boolean;
}) {
  return (
    <div
      className={`product-art art-${category} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      {category === "gpu" ? (
        <div className="gpu-housing">
          <div className="fan" />
          <div className="fan" />
          <div className="fan" />
          <span>GEFORCE RTX</span>
        </div>
      ) : category === "cpu" ? (
        <div className="cpu-chip">
          <span>AMD</span>
          <strong>RYZEN</strong>
          <small>PERFORMANCE SERIES</small>
        </div>
      ) : category === "ram" ? (
        <div className="ram-pair">
          <div>
            FURY <b>DDR5</b>
          </div>
          <div>
            FURY <b>DDR5</b>
          </div>
        </div>
      ) : category === "monitor" ? (
        <div className="monitor-art">
          <div />
          <span />
        </div>
      ) : category === "laptop" ? (
        <div className="laptop-art">
          <div />
          <span />
        </div>
      ) : (
        <div className="motherboard-art">
          <div className="socket" />
          <i />
          <i />
          <i />
          <span>CIRCUIT</span>
        </div>
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useStore();
  const [added, setAdded] = useState(false);

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!product.quantity) return;
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  };

  return (
    <article className="product-card">
      <div className="product-card-media-wrap">
        <Link
          to={`/products/${product.id}`}
          className="art-link"
          aria-label={`View ${product.name}`}
        >
          <ProductArt category={product.category} />
          <span className="art-arrow">
            <ArrowUpRight size={18} />
          </span>
        </Link>
        <div className="quick-add-wrap">
          <button
            type="button"
            className={`quick-add-btn ${added ? "added" : ""}`}
            aria-label={`Add ${product.name} to cart`}
            disabled={!product.quantity}
            onClick={handleAdd}
          >
            {added ? (
              <>
                <Check size={14} /> Added
              </>
            ) : product.quantity ? (
              <>
                <ShoppingBag size={14} /> Quick Add
              </>
            ) : (
              "Sold Out"
            )}
          </button>
        </div>
      </div>
      <div className="product-info">
        <div className="product-eyebrow">
          <span className="product-brand">{product.brand}</span>
          <span className={product.quantity ? "stock" : "sold-out"}>
            {product.quantity ? "In stock" : "Sold out"}
          </span>
        </div>
        <Link to={`/products/${product.id}`} className="product-name">
          {product.name}
        </Link>
        <p className="spec-preview">
          {Object.entries(product.specifications)
            .slice(0, 2)
            .map(([key, value]) => `${value} ${key.replaceAll("_", " ")}`)
            .join(" · ")}
        </p>
        <div className="card-bottom">
          <strong className="product-price">{money(product.price)}</strong>
          <button
            className="add-button"
            aria-label={`Add ${product.name} to cart`}
            disabled={!product.quantity}
            onClick={handleAdd}
            title={added ? "Added to cart" : `Add ${product.name} to cart`}
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </article>
  );
}

export function Loading() {
  return (
    <div className="empty-state" role="status">
      <LoaderCircle className="spin" size={32} />
      <p style={{ marginTop: 12, fontWeight: 550 }}>
        Loading your next upgrade…
      </p>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useStore();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`.trim()}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-icon-wrap">
        {isDark ? (
          <Sun size={15} className="theme-icon-sun" />
        ) : (
          <Moon size={15} className="theme-icon-moon" />
        )}
      </span>
      <span className="theme-toggle-text">
        {isDark ? "LIGHT MODE" : "DARK MODE"}
      </span>
    </button>
  );
}

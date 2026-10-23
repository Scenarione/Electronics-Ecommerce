export type User = {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
};
export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  images: string[];
  specifications: Record<string, string | number>;
  price: string;
  currency: string;
  quantity: number;
  active: boolean;
};
export type Attribute = {
  label: string;
  type: "string" | "number";
  unit: string;
  required: boolean;
  filterable: boolean;
  values?: string[];
};
export type Category = {
  id: string;
  name: string;
  attributes: Record<string, Attribute>;
  facets: Record<string, (string | number)[]>;
};
export type Order = {
  id: string;
  status: string;
  total: string;
  created_at: string;
  shipping_address: Record<string, string>;
  items?: {
    item_id: string;
    name: string;
    sku: string;
    quantity: number;
    unit_price: string;
  }[];
  payment?: { outcome: string; reference: string; amount: string };
};
export type CartItem = {
  id: string;
  name: string;
  price: string;
  category: string;
  quantity: number;
};

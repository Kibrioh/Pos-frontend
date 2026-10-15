import { apiFetch } from "./client";

const POS_PRODUCT_CATEGORIES = new Set([
  "smartphones",
  "laptops",
  "mobile-accessories",
]);

// Backend product -> the shape the pages already use
function toFrontendProduct(p) {
  return {
    ...p,
    stock: p.stock_quantity,
    price: Number(p.price),
    category: String(p.category || "").toLowerCase(),
  };
}

function toList(data) {
  if (Array.isArray(data)) return data;
  return data?.products || data?.data || [];
}

export async function getAllProducts() {
  const data = await apiFetch("/products");
  return toList(data).map(toFrontendProduct);
}

export async function getProducts() {
  const all = await getAllProducts();
  return all.filter((product) => POS_PRODUCT_CATEGORIES.has(product.category));
}

export async function getProductById(id) {
  const data = await apiFetch(`/products/${id}`);
  return toFrontendProduct(data?.product || data?.data || data);
}

import { apiFetch } from "./client";

// Backend product -> the shape the pages already use
function toFrontendProduct(p) {
  return {
    ...p,
    stock: Number(p.stock_quantity || 0),
    price: Number(p.price),
    category: String(p.category || ""),
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
  return getAllProducts();
}

export async function getProductById(id) {
  const data = await apiFetch(`/products/${id}`);
  return toFrontendProduct(data?.product || data?.data || data);
}

export async function deleteProduct(id) {
  return apiFetch(`/products/${id}`, { method: "DELETE" });
}

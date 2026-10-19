import { apiFetch } from "./client";

export async function getCategories() {
  const data = await apiFetch("/categories");
  if (Array.isArray(data)) return data;
  return data?.categories || data?.data || [];
}

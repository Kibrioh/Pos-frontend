export function filterProducts(products, searchTerm, category = "all") {
  const term = searchTerm.trim().toLowerCase();

  return products.filter((p) => {
    const matchesSearch =
      !term ||
      [p.title, p.brand, p.category].some((field) =>
        field?.toLowerCase().includes(term)
      );
    const matchesCategory = category === "all" || p.category === category;
    return matchesSearch && matchesCategory;
  });
}
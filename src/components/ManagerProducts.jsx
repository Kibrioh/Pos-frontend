import { apiFetch } from "../api/client";
import { getProducts } from "../api/products";
import { useMemo, useState } from "react";
import { formatPrice } from "../utils/formatPrice";

function ManagerProducts({
  products = [],
  setProducts,
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [editingId, setEditingId] = useState(null);
  const [newPrice, setNewPrice] = useState("");

  const [newProduct, setNewProduct] = useState({
    title: "",
    brand: "",
    category: "smartphones",
    price: "",
    stock: "",
  });

  const electronicsCategories = [
    "smartphones",
    "laptops",
    "tablets",
    "mobile-accessories",
    "mens-watches",
    "womens-watches",
    "sunglasses",
    "lighting",
  ];

  const electronicsProducts = useMemo(() => {
    return products.filter((product) =>
      electronicsCategories.includes(product.category)
    );
  }, [products]);

  const categories = useMemo(() => {
    return [
      ...new Set(
        electronicsProducts.map(
          (product) => product.category
        )
      ),
    ].sort();
  }, [electronicsProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return electronicsProducts.filter((product) => {
      const matchesSearch =
        !query ||
        product.title
          .toLowerCase()
          .includes(query) ||
        product.brand
          ?.toLowerCase()
          .includes(query);

      const matchesCategory =
        category === "all" ||
        product.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [
    electronicsProducts,
    search,
    category,
  ]);

  const reloadProducts = async () => {
    setProducts(await getProducts());
  };

  const updateStock = async (id, amount) => {
    const product = products.find((item) => item.id === id);

    if (!product) {
      return;
    }

    const delta = Math.max(product.stock + amount, 0) - product.stock;

    if (delta === 0) {
      return;
    }

    try {
      const me = await apiFetch("/auth/me");

      await apiFetch("/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          product_id: Number(id),
          delta,
          user_id: me.user.id,
          note: "Manual adjustment by manager",
        }),
      });

      await reloadProducts();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const makeOutOfStock = (id) => {
    const product = products.find((item) => item.id === id);

    if (!product) {
      return;
    }

    return updateStock(id, -product.stock);
  };

  const deleteProduct = () => {
    window.alert("Deleting products is not supported by the backend yet.");
  };

  const startEditingPrice = (product) => {
    setEditingId(product.id);
    setNewPrice(product.price);
  };

  const savePrice = async (id) => {
    const price = Number(newPrice);

    if (price <= 0 || Number.isNaN(price)) {
      return;
    }

    try {
      await apiFetch(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ price }),
      });

      await reloadProducts();
      setEditingId(null);
      setNewPrice("");
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleNewProductChange = (e) => {
    const { name, value } = e.target;

    setNewProduct((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const addProduct = async (e) => {
    e.preventDefault();

    if (
      !newProduct.title.trim() ||
      !newProduct.price ||
      !newProduct.stock
    ) {
      return;
    }

    try {
      const data = await apiFetch("/categories");
      const list = Array.isArray(data)
        ? data
        : data.categories || data.data || [];
      const category = list.find((item) => item.name === newProduct.category);

      if (!category) {
        window.alert("That category was not found in the backend.");
        return;
      }

      await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          title: newProduct.title.trim(),
          brand: newProduct.brand.trim() || "TechPoint",
          category_id: category.id,
          price: Number(newProduct.price),
          stock_quantity: Number(newProduct.stock),
          description: "Product added by the TechPoint manager.",
        }),
      });

      await reloadProducts();

      setNewProduct({
        title: "",
        brand: "",
        category: "smartphones",
        price: "",
        stock: "",
      });
    } catch (err) {
      window.alert(err.message);
    }
  };

  const formatCategory = (value) => {
    return value
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  };

  return (
    <main className="manager-content">
      <div className="manager-page-heading">
        <div>
          <p className="manager-page-kicker">
            INVENTORY MANAGEMENT
          </p>

          <h2>Products & Inventory</h2>

          <p>
            Manage prices, stock and products
            available to cashiers.
          </p>
        </div>

        <div className="inventory-summary">
          <strong>
            {electronicsProducts.length}
          </strong>

          <span>Products</span>
        </div>
      </div>

      <section className="manager-section">
        <div className="inventory-controls">
          <div className="manager-search">
            <label htmlFor="product-search">
              Search products
            </label>

            <input
              id="product-search"
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search by name or brand..."
            />
          </div>

          <div className="manager-filter">
            <label htmlFor="category-filter">
              Category
            </label>

            <select
              id="category-filter"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
            >
              <option value="all">
                All categories
              </option>

              {categories.map(
                (categoryName) => (
                  <option
                    key={categoryName}
                    value={categoryName}
                  >
                    {formatCategory(categoryName)}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      <section className="manager-section">
        <div className="section-heading-row">
          <div>
            <h3>Product Catalogue</h3>

            <p>
              Showing{" "}
              <strong>
                {filteredProducts.length}
              </strong>{" "}
              product
              {filteredProducts.length === 1
                ? ""
                : "s"}
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-inventory">
            <h3>No products found</h3>

            <p>
              Try changing your search or
              category filter.
            </p>
          </div>
        ) : (
          <div className="manager-product-grid">
            {filteredProducts.map((product) => (
              <article
                className="manager-product-card"
                key={product.id}
              >
                <div className="manager-product-image">
                  <img
                    src={product.thumbnail}
                    alt={product.title}
                  />
                </div>

                <div className="manager-product-info">
                  <span className="manager-product-category">
                    {formatCategory(
                      product.category
                    )}
                  </span>

                  <h3>{product.title}</h3>

                  <p className="manager-product-brand">
                    {product.brand || "No brand"}
                  </p>

                  <div className="manager-product-price">
                    {editingId === product.id ? (
                      <div className="price-edit">
                        <input
                          type="number"
                          min="1"
                          value={newPrice}
                          onChange={(e) =>
                            setNewPrice(
                              e.target.value
                            )
                          }
                        />

                        <button
                          className="button-success"
                          onClick={() =>
                            savePrice(product.id)
                          }
                        >
                          Save
                        </button>

                        <button
                          className="button-secondary"
                          onClick={() => {
                            setEditingId(null);
                            setNewPrice("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <strong>
                          {formatPrice(product.price)}
                        </strong>

                        <button
                          className="button-secondary"
                          onClick={() =>
                            startEditingPrice(product)
                          }
                        >
                          Edit Price
                        </button>
                      </>
                    )}
                  </div>

                  <div
                    className={`stock-status ${
                      product.stock === 0
                        ? "out-of-stock"
                        : product.stock <= 10
                        ? "low-stock"
                        : "in-stock"
                    }`}
                  >
                    {product.stock === 0
                      ? "Out of Stock"
                      : `${product.stock} units available`}
                  </div>

                  <div className="inventory-actions">
                    <button
                      className="button-primary"
                      onClick={() =>
                        updateStock(product.id, 1)
                      }
                    >
                      + Stock
                    </button>

                    <button
                      className="button-secondary"
                      onClick={() =>
                        updateStock(product.id, -1)
                      }
                      disabled={product.stock === 0}
                    >
                      - Stock
                    </button>

                    <button
                      className="button-warning"
                      onClick={() =>
                        makeOutOfStock(product.id)
                      }
                      disabled={product.stock === 0}
                    >
                      Out of Stock
                    </button>

                    <button
                      className="button-danger"
                      onClick={() =>
                        deleteProduct(product.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="manager-section add-product-section">
        <div className="section-heading-row">
          <div>
            <h3>Add New Product</h3>

            <p>
              Register a new electronics or
              accessories product.
            </p>
          </div>
        </div>

        <form
          className="add-product-form"
          onSubmit={addProduct}
        >
          <div>
            <label htmlFor="new-title">
              Product name
            </label>

            <input
              id="new-title"
              name="title"
              type="text"
              value={newProduct.title}
              onChange={handleNewProductChange}
              placeholder="e.g. Wireless Keyboard"
            />
          </div>

          <div>
            <label htmlFor="new-brand">
              Brand
            </label>

            <input
              id="new-brand"
              name="brand"
              type="text"
              value={newProduct.brand}
              onChange={handleNewProductChange}
              placeholder="e.g. Logitech"
            />
          </div>

          <div>
            <label htmlFor="new-category">
              Category
            </label>

            <select
              id="new-category"
              name="category"
              value={newProduct.category}
              onChange={handleNewProductChange}
            >
              {electronicsCategories.map(
                (categoryName) => (
                  <option
                    key={categoryName}
                    value={categoryName}
                  >
                    {formatCategory(categoryName)}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label htmlFor="new-price">
              Price (KSh)
            </label>

            <input
              id="new-price"
              name="price"
              type="number"
              min="1"
              value={newProduct.price}
              onChange={handleNewProductChange}
              placeholder="Price"
            />
          </div>

          <div>
            <label htmlFor="new-stock">
              Initial stock
            </label>

            <input
              id="new-stock"
              name="stock"
              type="number"
              min="1"
              value={newProduct.stock}
              onChange={handleNewProductChange}
              placeholder="Stock"
            />
          </div>

          <button
            className="button-primary add-product-button"
            type="submit"
          >
            + Add Product
          </button>
        </form>
      </section>
    </main>
  );
}

export default ManagerProducts;
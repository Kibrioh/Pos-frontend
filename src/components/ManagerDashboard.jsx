import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

function ManagerDashboard({
  user,
  onLogout,
  products = [],
  sales = [],
}) {
  const [cashierCount, setCashierCount] = useState(null);

  useEffect(() => {
    apiFetch("/reports/dashboard")
      .then((data) => setCashierCount(data.cashier_count))
      .catch((err) =>
        console.error("Could not load dashboard:", err.message)
      );
  }, []);

  const totalSales = sales.reduce(
    (total, sale) => total + sale.total,
    0
  );

  const lowStockCount = products.filter(
    (product) =>
      product.stock > 0 && product.stock <= 10
  ).length;

  return (
    <div className="manager-dashboard">
      <main className="manager-content">
        <h2>Overview</h2>

        <div className="manager-cards">
          <div className="manager-card">
            <h3>Total Sales</h3>
            <p>KSh {totalSales.toLocaleString()}</p>
          </div>

          <div className="manager-card">
            <h3>Cashiers</h3>
            <p>{cashierCount ?? "-"}</p>
          </div>

          <div className="manager-card">
            <h3>Products</h3>
            <p>{products.length}</p>
          </div>

          <div className="manager-card">
            <h3>Low Stock</h3>
            <p>{lowStockCount}</p>
          </div>
        </div>

        <section className="manager-section">
          <h2>Sales Overview</h2>

          {sales.length === 0 ? (
            <p>No sales have been recorded yet.</p>
          ) : (
            <div>
              <p>
                Total completed sales:{" "}
                <strong>{sales.length}</strong>
              </p>

              <p>
                Total revenue:{" "}
                <strong>
                  KSh {totalSales.toLocaleString()}
                </strong>
              </p>
            </div>
          )}
        </section>

        <section className="manager-section">
          <h2>Inventory Overview</h2>

          <p>
            Total products:{" "}
            <strong>{products.length}</strong>
          </p>

          <p>
            Low-stock products:{" "}
            <strong>{lowStockCount}</strong>
          </p>

          <p>
            Use <strong>Products & Inventory</strong>{" "}
            to manage product prices and stock.
          </p>
        </section>

        <section className="manager-section">
          <h2>Cashier Management</h2>

          <p>
            Use the <strong>Cashiers</strong> section
            to register and manage cashiers.
          </p>
        </section>
      </main>
    </div>
  );
}

export default ManagerDashboard;
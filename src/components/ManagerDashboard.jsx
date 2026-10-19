import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { formatKsh, toKsh } from "../utils/formatPrice";

function ManagerDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [margin, setMargin] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/reports/dashboard")
      .then(setDashboard)
      .catch((err) =>
        setError(err.message)
      );
  }, []);

  useEffect(() => {
    apiFetch("/reports/gross-margin")
      .then(setMargin)
      .catch(() => setMargin(null));
  }, []);

  const revenue = dashboard
    ? formatKsh(toKsh(dashboard.total_revenue))
    : "—";
  const transactionCount = dashboard?.transaction_count ?? "—";
  const cashierCount = dashboard?.cashier_count ?? "—";
  const productCount = dashboard?.product_count ?? "—";
  const lowStockCount = dashboard?.low_stock_count ?? "—";
  const grossMargin = margin
    ? formatKsh(toKsh(margin.gross_margin))
    : "—";

  return (
    <div className="manager-dashboard">
      <main className="manager-content">
        <h2>Overview</h2>

          {error && <p role="alert">Dashboard unavailable: {error}</p>}

        <div className="manager-cards">
          <div className="manager-card">
            <h3>Total Sales</h3>
            <p>{revenue}</p>
          </div>

          <div className="manager-card">
            <h3>Cashiers</h3>
            <p>{cashierCount}</p>
          </div>

          <div className="manager-card">
            <h3>Products</h3>
            <p>{productCount}</p>
          </div>

          <div className="manager-card">
            <h3>Low Stock</h3>
            <p>{lowStockCount}</p>
          </div>

          <div className="manager-card">
            <h3>Gross Margin</h3>
            <p>{grossMargin}</p>
            {margin?.items_without_cost > 0 && (
              <small>{margin.items_without_cost} sold units have no cost recorded</small>
            )}
          </div>
        </div>

        <section className="manager-section">
          <h2>Sales Overview</h2>

          {dashboard ? (
            <div>
              <p>
                Total completed sales: <strong>{transactionCount}</strong>
              </p>
              <p>
                Total revenue: <strong>{revenue}</strong>
              </p>
            </div>
          ) : error ? (
            <p>Could not load the sales summary.</p>
          ) : (
            <p>Loading sales summary…</p>
          )}
        </section>

        <section className="manager-section">
          <h2>Inventory Overview</h2>

          <p>
            Total products: <strong>{productCount}</strong>
          </p>
          <p>
            Low-stock products: <strong>{lowStockCount}</strong>
          </p>
          <p>
            Use <strong>Products & Inventory</strong> to manage product prices and stock.
          </p>
        </section>

        <section className="manager-section">
          <h2>Cashier Management</h2>
          <p>
            Use the <strong>Cashiers</strong> section to register and manage cashiers.
          </p>
        </section>
      </main>
    </div>
  );
}

export default ManagerDashboard;

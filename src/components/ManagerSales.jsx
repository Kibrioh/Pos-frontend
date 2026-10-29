import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import { formatKsh } from "../utils/formatPrice";
import "../styles/manager-actions.css";

function returnedQuantity(sale, saleItemId) {
  return (sale.returns || []).reduce(
    (sum, returnRecord) => sum + (returnRecord.items || [])
      .filter((item) => item.sale_item_id === saleItemId)
      .reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
    0,
  );
}

function ManagerSales({ sales = [], onReturnCreated }) {
  const [returnSaleId, setReturnSaleId] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [restockItems, setRestockItems] = useState({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [shiftId, setShiftId] = useState("");
  const [openShifts, setOpenShifts] = useState([]);
  const [saleSearch, setSaleSearch] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [error, setError] = useState("");
  const [returnSuccess, setReturnSuccess] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch("/shifts?status=open")
      .then((data) => {
        const active = Array.isArray(data) ? data : [];
        setOpenShifts(active);
        setShiftId((current) => current || String(active[0]?.id || ""));
      })
      .catch(() => setOpenShifts([]));
  }, []);

  const netSales = useMemo(() => sales.reduce((sum, sale) => {
    const refunded = (sale.returns || []).reduce(
      (returnSum, record) => returnSum + Number(record.refund_total || 0),
      0,
    );
    return sum + Number(sale.total || 0) - refunded;
  }, 0), [sales]);

  const cashierNames = useMemo(
    () => [...new Set(sales.map((sale) => String(sale.cashier || "")).filter(Boolean))],
    [sales],
  );
  const selectedCashierSales = useMemo(
    () => sales.filter((sale) => sale.cashier === selectedCashier),
    [sales, selectedCashier],
  );
  const selectedCashierNet = useMemo(() => selectedCashierSales.reduce((total, sale) => {
    const refunds = (sale.returns || []).reduce(
      (sum, record) => sum + Number(record.refund_total || 0),
      0,
    );
    return total + Number(sale.total || 0) - refunds;
  }, 0), [selectedCashierSales]);

  const filteredSales = useMemo(() => {
    const query = saleSearch.trim().toLowerCase();
    if (!query) return sales;

    return sales.filter((sale) => [
      sale.id,
      `Sale #${sale.id}`,
      sale.cashier,
      sale.paymentMethod,
      sale.completedAt,
      sale.completedAt ? new Date(sale.completedAt).toLocaleString() : "",
      ...(sale.items || []).map((item) => item.title),
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [sales, saleSearch]);

  const beginReturn = (sale) => {
    setReturnSaleId(sale.id);
    setReturnSuccess(null);
    setQuantities(Object.fromEntries(sale.items.map((item) => [item.saleItemId, ""])));
    setRestockItems(Object.fromEntries(sale.items.map((item) => [item.saleItemId, true])));
    setReason("");
    setRefundMethod("cash");
    setError("");
  };

  const submitReturn = async (event, sale) => {
    event.preventDefault();
    const items = sale.items
      .map((item) => ({
        sale_item_id: item.saleItemId,
        quantity: Number(quantities[item.saleItemId] || 0),
        restock: Boolean(restockItems[item.saleItemId]),
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setError("Enter a return quantity for at least one item.");
      return;
    }
    if (refundMethod === "cash" && !shiftId) {
      setError("Open a till shift before recording a cash refund.");
      return;
    }

    setBusy(true);
    setError("");
    setReturnSuccess(null);
    try {
      await apiFetch(`/sales/${sale.id}/returns`, {
        method: "POST",
        body: JSON.stringify({
          items,
          reason,
          refund_method: refundMethod,
          ...(refundMethod === "cash" ? { shift_id: Number(shiftId) } : {}),
        }),
      });
      setReturnSuccess({
        saleId: sale.id,
        message: `Return for Sale #${sale.id} recorded successfully.`,
      });
      setReturnSaleId(null);
      onReturnCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="manager-content manager-sales-page">
      <div className="manager-page-heading">
        <div>
          <p className="manager-page-kicker">SALES MANAGEMENT</p>
          <h2>Sales & Returns</h2>
          <p>Review transactions and process manager-approved returns.</p>
        </div>
        <div className="inventory-summary"><strong>{formatKsh(netSales)}</strong><span>Net sales</span></div>
      </div>

      <section className="manager-section">
        <div className="section-heading-row cashier-sales-heading">
          <div><h3>Cashier Sales Summary</h3><p>Select a cashier to view their sales totals.</p></div>
          <div className="cashier-sales-picker">
            <label htmlFor="cashier-sales-select">Select cashier</label>
            <select
              id="cashier-sales-select"
              value={selectedCashier}
              onChange={(event) => setSelectedCashier(event.target.value)}
              disabled={cashierNames.length === 0}
            >
              <option value="">Choose a cashier</option>
              {cashierNames.map((cashier) => <option key={cashier} value={cashier}>{cashier}</option>)}
            </select>
          </div>
        </div>
        {cashierNames.length === 0 ? <p>No cashier sales yet.</p> : selectedCashier ? (
          <div className="manager-card cashier-sales-summary-card">
            <h3>{selectedCashier}</h3>
            <div className="cashier-sales-summary-metrics">
              <p>Transactions <strong>{selectedCashierSales.length}</strong></p>
              <p>Net revenue <strong>{formatKsh(selectedCashierNet)}</strong></p>
            </div>
          </div>
        ) : <p className="cashier-summary-prompt">Choose a cashier from the dropdown to view their sales summary.</p>}
      </section>

      <section className="manager-section">
        <div className="section-heading-row manager-sales-list-heading">
          <div><h3>Completed Sales</h3><p>Returns are linked to the original sale and cannot exceed the purchased quantity.</p></div>
          <label className="manager-search manager-sales-search" htmlFor="manager-sale-search">
            <span>Search sales</span>
            <input
              id="manager-sale-search"
              type="search"
              value={saleSearch}
              onChange={(event) => setSaleSearch(event.target.value)}
              placeholder="Sale ID, cashier, or product"
            />
          </label>
        </div>
        {sales.length === 0 ? <p>No sales have been recorded yet.</p> : filteredSales.length === 0 ? (
          <div className="empty-inventory"><p>No sales match “{saleSearch}”. Try another sale ID, cashier, or product.</p></div>
        ) : (
          <div className="manager-sales-list">
            {filteredSales.slice().reverse().map((sale) => {
              const refunded = (sale.returns || []).reduce((sum, record) => sum + Number(record.refund_total || 0), 0);
              const hasReturnableItems = sale.items.some((item) => returnedQuantity(sale, item.saleItemId) < item.quantity);
              return (
                <article className="manager-sale-card" key={sale.id}>
                  <div className="manager-sale-heading">
                    <div><h4>Sale #{sale.id}</h4><p>{sale.cashier} · {new Date(sale.completedAt).toLocaleString()}</p><p>{sale.itemCount} items · {sale.paymentMethod || "Payment method unavailable"}</p></div>
                    <div className="manager-sale-total"><strong>{formatKsh(sale.total)}</strong>{refunded > 0 && <span>{formatKsh(refunded)} refunded</span>}</div>
                  </div>
                  {returnSuccess?.saleId === sale.id && <p className="form-success" role="status">{returnSuccess.message}</p>}
                  <details className="manager-sale-items-disclosure">
                    <summary>Items · {sale.itemCount}</summary>
                    <ul className="manager-sale-items">{sale.items.map((item) => <li key={item.saleItemId}><span>{item.title} × {item.quantity}</span><strong>{formatKsh(item.price * item.quantity)}</strong></li>)}</ul>
                  </details>

                  {(sale.returns || []).length > 0 && <details className="sale-return-history"><summary>{sale.returns.length} return{sale.returns.length === 1 ? "" : "s"} recorded</summary>{sale.returns.map((record) => <p key={record.id}>{formatKsh(Number(record.refund_total))} via {record.refund_method} · {record.reason} · {new Date(record.created_at).toLocaleString()}</p>)}</details>}

                  {hasReturnableItems && <button className="manager-action-button manager-action-button--primary" type="button" onClick={() => beginReturn(sale)}>Process return</button>}

                  {returnSaleId === sale.id && (
                    <form className="return-form" onSubmit={(event) => submitReturn(event, sale)}>
                      <h4>Return items from Sale #{sale.id}</h4>
                      {sale.items.map((item) => {
                        const remaining = item.quantity - returnedQuantity(sale, item.saleItemId);
                        if (remaining <= 0) return null;
                        return <div className="return-item-row" key={item.saleItemId}>
                          <span>{item.title} · {remaining} returnable</span>
                          <label>Quantity<input type="number" min="0" max={remaining} step="1" value={quantities[item.saleItemId] || ""} onChange={(event) => setQuantities((current) => ({ ...current, [item.saleItemId]: event.target.value }))} /></label>
                          <label className="return-restock-check"><input type="checkbox" checked={restockItems[item.saleItemId] || false} onChange={(event) => setRestockItems((current) => ({ ...current, [item.saleItemId]: event.target.checked }))} />Return to stock</label>
                        </div>;
                      })}
                      <label>Reason<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength="240" required /></label>
                      <label>Refund method<select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="m-pesa">M-Pesa</option></select></label>
                      {refundMethod === "cash" && <label>Refund from till<select value={shiftId} onChange={(event) => setShiftId(event.target.value)} required><option value="">Select an open till</option>{openShifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.cashier} · Shift #{shift.id}</option>)}</select></label>}
                      {error && <p className="form-error" role="alert">{error}</p>}
                      <div className="return-form-actions"><button className="manager-action-button manager-action-button--primary" disabled={busy}>{busy ? "Saving return…" : "Confirm return"}</button><button type="button" className="manager-action-button manager-action-button--secondary" onClick={() => setReturnSaleId(null)}>Cancel</button></div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default ManagerSales;

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { formatKsh, toKsh } from "../utils/formatPrice";
import CashierShiftPanel from "./CashierShiftPanel";

function ManagerShifts({ user }) {
  const [shifts, setShifts] = useState([]);
  const [error, setError] = useState("");

  const reload = useCallback(() => apiFetch("/shifts")
    .then((data) => setShifts(Array.isArray(data) ? data : []))
    .catch((err) => setError(err.message)), []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <main className="manager-content">
      <div className="manager-page-heading">
        <div><p className="manager-page-kicker">TILL CONTROL</p><h2>Cashier shifts</h2><p>Review opening floats, cash movements, and closing variances.</p></div>
        <div className="inventory-summary"><strong>{shifts.filter((shift) => shift.status === "open").length}</strong><span>Open shifts</span></div>
      </div>
      <CashierShiftPanel user={user} onShiftChange={reload} />
      <section className="manager-section">
        <div className="section-heading-row"><div><h3>Recent shifts</h3><p>Includes open and closed till sessions.</p></div></div>
        {error ? <p className="form-error" role="alert">{error}</p> : shifts.length === 0 ? <p>No shifts have been opened yet.</p> : (
          <div className="shift-list">
            {shifts.map((shift) => (
              <article className="shift-record" key={shift.id}>
                <div className="shift-record-main">
                  <div><h4>{shift.cashier || `User ${shift.user_id}`}</h4><p>Opened {new Date(shift.opened_at).toLocaleString()}</p>{shift.closed_at && <p>Closed {new Date(shift.closed_at).toLocaleString()}</p>}</div>
                  <span className={`shift-status${shift.status === "open" ? " is-open" : ""}`}>{shift.status}</span>
                </div>
                <div className="shift-record-values"><span>Float <strong>{formatKsh(toKsh(shift.opening_cash))}</strong></span>{shift.status === "closed" && <><span>Expected <strong>{formatKsh(toKsh(shift.expected_cash))}</strong></span><span>Counted <strong>{formatKsh(toKsh(shift.closing_cash))}</strong></span><span>Variance <strong>{formatKsh(toKsh(shift.cash_variance))}</strong></span></>}</div>
                {shift.cash_movements?.length > 0 && <details className="shift-movements"><summary>{shift.cash_movements.length} till movements</summary><ul>{shift.cash_movements.map((movement) => <li key={movement.id}>{movement.direction === "in" ? "Cash in" : "Cash out"} · {formatKsh(toKsh(movement.amount))} · {movement.note}</li>)}</ul></details>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default ManagerShifts;

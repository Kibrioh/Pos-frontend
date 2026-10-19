import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { formatKsh, toKsh, USD_TO_KSH } from "../utils/formatPrice";

const toBaseAmount = (value) => Number(value || 0) / USD_TO_KSH;

function CashierShiftPanel({ user, onShiftChange }) {
  const [shift, setShift] = useState(null);
  const [closingCash, setClosingCash] = useState("");
  const [movementDirection, setMovementDirection] = useState("in");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementNote, setMovementNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [closeResult, setCloseResult] = useState(null);

  const acceptShift = (nextShift) => {
    setShift(nextShift);
    if (nextShift) setCloseResult(null);
    onShiftChange?.(nextShift);
  };

  const refreshShift = async () => {
    setError("");
    try {
      acceptShift(await apiFetch("/shifts/current"));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    let mounted = true;
    apiFetch("/shifts/current")
      .then((data) => {
        if (mounted) acceptShift(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const addCashMovement = async (event) => {
    event.preventDefault();
    if (!shift) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/shifts/${shift.id}/cash-movements`, {
        method: "POST",
        body: JSON.stringify({
          direction: movementDirection,
          amount: toBaseAmount(movementAmount),
          note: movementNote,
        }),
      });
      const updated = await apiFetch("/shifts/current");
      acceptShift(updated);
      setMovementAmount("");
      setMovementNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const closeShift = async (event) => {
    event.preventDefault();
    if (!shift) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch(`/shifts/${shift.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closing_cash: toBaseAmount(closingCash) }),
      });
      setCloseResult(result);
      acceptShift(null);
      setClosingCash("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="shift-panel" aria-labelledby="shift-panel-title">
      <div className="shift-panel-heading">
        <div>
          <p className="section-kicker">CASH CONTROL</p>
          <h2 id="shift-panel-title">Till shift</h2>
        </div>
        <span className={`shift-status${shift ? " is-open" : ""}`}>
          {shift ? "Shift open" : "Awaiting float"}
        </span>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      {!shift ? (
        <div className="shift-unassigned">
          <p className="shift-open-summary">No float has been assigned yet. Ask your manager to assign your till float before starting sales.</p>
          <button className="button-secondary" type="button" onClick={refreshShift}>Check for assigned float</button>
        </div>
      ) : (
        <>
          <p className="shift-open-summary">
            Opened {new Date(shift.opened_at).toLocaleString()} · Opening float {formatKsh(toKsh(shift.opening_cash))}
          </p>
          <form className="shift-inline-form" onSubmit={addCashMovement}>
            <label>
              Till movement
              <select value={movementDirection} onChange={(event) => setMovementDirection(event.target.value)}>
                <option value="in">Cash in</option>
                <option value="out">Cash out</option>
              </select>
            </label>
            <label>
              Amount (KSh)
              <input type="number" min="0.01" step="0.01" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} required />
            </label>
            <label>
              Reason
              <input value={movementNote} onChange={(event) => setMovementNote(event.target.value)} maxLength="240" required />
            </label>
            <button className="button-secondary" disabled={busy}>Record movement</button>
          </form>
          <form className="shift-inline-form shift-close-form" onSubmit={closeShift}>
            <label>
              Counted cash at close (KSh)
              <input type="number" min="0" step="0.01" value={closingCash} onChange={(event) => setClosingCash(event.target.value)} required />
            </label>
            <button className="button-warning" disabled={busy}>
              {busy ? "Closing…" : "Close shift & reconcile"}
            </button>
          </form>
        </>
      )}

      {closeResult && (
        <div className="shift-close-result" role="status">
          Expected {formatKsh(toKsh(closeResult.expected_cash))} · Counted {formatKsh(toKsh(closeResult.closing_cash))} · Variance {formatKsh(toKsh(closeResult.cash_variance))}
        </div>
      )}
    </section>
  );
}

export default CashierShiftPanel;

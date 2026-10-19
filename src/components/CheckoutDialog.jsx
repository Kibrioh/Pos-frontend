import { useState } from "react";
import { formatKsh } from "../utils/formatPrice";

function CheckoutDialog({ totalKsh, error, onCancel, onComplete }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [busy, setBusy] = useState(false);

  const tenderedKsh = Number(amountTendered);
  const isCash = paymentMethod === "cash";
  const cashIsEnough = Number.isFinite(tenderedKsh) && tenderedKsh >= totalKsh;
  const changeKsh = cashIsEnough ? tenderedKsh - totalKsh : 0;

  const submitCheckout = async (event) => {
    event.preventDefault();
    if (isCash && !cashIsEnough) return;

    setBusy(true);
    try {
      await onComplete({
        paymentMethod,
        amountTenderedKsh: isCash ? tenderedKsh : null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="checkout-overlay">
      <form
        className="checkout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onSubmit={submitCheckout}
      >
        <div className="checkout-dialog__heading">
          <div>
            <p className="section-kicker">FINAL STEP</p>
            <h2 id="checkout-title">Take payment</h2>
          </div>
          <button className="checkout-dialog__close" type="button" onClick={onCancel} aria-label="Cancel checkout">×</button>
        </div>

        <div className="checkout-dialog__total">
          <span>Amount due</span>
          <strong>{formatKsh(totalKsh)}</strong>
        </div>

        <label className="checkout-dialog__field">
          Payment method
          <select value={paymentMethod} onChange={(event) => {
            setPaymentMethod(event.target.value);
            setAmountTendered("");
          }}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="m-pesa">M-Pesa</option>
          </select>
        </label>

        {isCash && (
          <>
            <label className="checkout-dialog__field">
              Cash received (KSh)
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={amountTendered}
                onChange={(event) => setAmountTendered(event.target.value)}
                placeholder="Enter amount received"
                autoFocus
                required
              />
            </label>
            <div className={`checkout-dialog__change${cashIsEnough ? " is-ready" : ""}`} aria-live="polite">
              <span>{cashIsEnough ? "Change to give" : "Still due"}</span>
              <strong>{formatKsh(cashIsEnough ? changeKsh : Math.max(0, totalKsh - (Number.isFinite(tenderedKsh) ? tenderedKsh : 0)))}</strong>
            </div>
          </>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="checkout-dialog__actions">
          <button className="button-secondary" type="button" onClick={onCancel} disabled={busy}>Back to cart</button>
          <button className="button-primary" type="submit" disabled={busy || (isCash && !cashIsEnough)}>
            {busy ? "Completing sale…" : "Confirm payment & complete sale"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CheckoutDialog;

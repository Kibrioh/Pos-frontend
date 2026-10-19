import { formatKsh, toKsh } from "../utils/formatPrice";

function Cart({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onCheckout,
  onHoldSale,
  checkoutDisabled = false,
}) {
  const total = toKsh(items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  ));

  const itemCount = items.reduce(
    (sum, i) => sum + i.quantity,
    0
  );

  return (
    <aside className="cart">
      <h2>Cart ({itemCount})</h2>

      {items.length === 0 ? (
        <p className="cart-empty">
          Your cart is empty. Add a product to begin a sale.
        </p>
      ) : (
        <>
          <ul className="cart-items">
            {items.map((item) => (
              <li key={item.id} className="cart-item">
                <span className="cart-item-title">
                  {item.title}
                </span>

                <span>
                  {formatKsh(toKsh(item.price))} each
                </span>

                <div className="cart-item-controls">
                  <button
                    onClick={() =>
                      onDecrement(item.id)
                    }
                    aria-label={`Decrease ${item.title}`}
                  >
                    −
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    onClick={() =>
                      onIncrement(item.id)
                    }
                    disabled={
                      item.quantity >= item.stock
                    }
                    aria-label={`Increase ${item.title}`}
                  >
                    +
                  </button>

                  <button
                    onClick={() =>
                      onRemove(item.id)
                    }
                  >
                    Remove
                  </button>
                </div>

                <strong>
                  {formatKsh(
                    toKsh(Number(item.price) * item.quantity)
                  )}
                </strong>
              </li>
            ))}
          </ul>

          <p className="cart-total">
            Total: <strong>{formatKsh(total)}</strong>
          </p>

          <div className="cart-actions">
            <button onClick={onClear}>
              Clear cart
            </button>

            <button onClick={onHoldSale}>
              Hold Sale
            </button>

            <button
              disabled={checkoutDisabled}
              title={checkoutDisabled ? "Open a till shift before checking out" : undefined}
              onClick={() =>
                onCheckout(total, itemCount)
              }
            >
              {checkoutDisabled ? "Open shift to checkout" : "Complete Sale"}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

export default Cart;

import { useEffect, useState } from "react";
import { formatPrice } from "../utils/formatPrice";

function ProductDetails({ product, onClose, onAddToCart, readOnly = false }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [product?.id, product?.thumbnail]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (!product) return null;

  const inStock = Number(product.stock) > 0;

  return (
    <div
      className="product-details-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="product-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
      >
        <button
          type="button"
          className="product-details-close"
          onClick={onClose}
          aria-label="Close product details"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="product-details-content">
          <div className="product-details-image-frame">
            {product.thumbnail && !imageFailed ? (
              <img
                src={product.thumbnail}
                alt={product.title}
                className="product-details-image"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="product-details-image-placeholder" aria-label="Product image unavailable">
                <span aria-hidden="true">▧</span>
                <span>Image unavailable</span>
              </div>
            )}
          </div>

          <div className="product-details-info">
            <p className="product-details-category">{product.category || "Product"}</p>
            <h2 id="product-details-title">{product.title}</h2>
            {product.description && <p className="product-details-description">{product.description}</p>}

            <div className="product-details-price">{formatPrice(product.price)}</div>

            <dl className="product-details-facts">
              <div>
                <dt>Brand</dt>
                <dd>{product.brand || "Not specified"}</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>
                  <span className={`product-details-stock ${inStock ? "is-available" : "is-unavailable"}`}>
                    <span aria-hidden="true" />
                    {inStock ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </dd>
              </div>
            </dl>

            {!readOnly && (
              <button
                type="button"
                className="product-details-add-button"
                onClick={() => onAddToCart(product)}
                disabled={!inStock}
              >
                {inStock ? "Add to cart" : "Out of stock"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProductDetails;

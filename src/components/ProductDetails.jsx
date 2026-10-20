import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "../utils/formatPrice";

function ProductDetails({ product, anchorElement, onClose, onAddToCart, readOnly = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [position, setPosition] = useState(null);
  const detailsRef = useRef(null);

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

  useLayoutEffect(() => {
    const placeDetails = () => {
      const details = detailsRef.current;
      if (!details) return;

      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const detailsRect = details.getBoundingClientRect();
      const margin = 16;

      if (!anchorElement || viewportWidth <= 850) {
        setPosition({
          left: Math.max(margin, (viewportWidth - detailsRect.width) / 2),
          top: Math.max(margin, (viewportHeight - detailsRect.height) / 2),
        });
        return;
      }

      const anchorRect = anchorElement.getBoundingClientRect();
      const gap = 16;
      const roomRight = viewportWidth - anchorRect.right - gap - margin;
      const roomLeft = anchorRect.left - gap - margin;
      const placeRight = roomRight >= detailsRect.width || roomRight >= roomLeft;
      const left = placeRight
        ? Math.min(anchorRect.right + gap, viewportWidth - detailsRect.width - margin)
        : Math.max(margin, anchorRect.left - detailsRect.width - gap);
      const top = Math.min(
        Math.max(margin, anchorRect.top + (anchorRect.height - detailsRect.height) / 2),
        Math.max(margin, viewportHeight - detailsRect.height - margin),
      );

      setPosition({ left, top });
    };

    placeDetails();
    window.addEventListener("resize", placeDetails);
    window.addEventListener("scroll", placeDetails, true);
    return () => {
      window.removeEventListener("resize", placeDetails);
      window.removeEventListener("scroll", placeDetails, true);
    };
  }, [anchorElement, product?.id]);

  if (!product) return null;

  const inStock = Number(product.stock) > 0;

  return createPortal((
    <div
      className="product-details-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={detailsRef}
        className="product-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        style={{
          left: position ? `${position.left}px` : "50%",
          top: position ? `${position.top}px` : "50%",
          visibility: position ? "visible" : "hidden",
        }}
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
  ), document.body);
}

export default ProductDetails;

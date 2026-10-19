import { useState } from "react";
import { formatPrice } from "../utils/formatPrice";

function ProductCard({
  product,
  inCart,
  onAddToCart,
  onViewDetails,
  readOnly = false,
}) {
  const remainingStock = Math.max(product.stock - (readOnly ? 0 : inCart), 0);
  const outOfStock = remainingStock === 0;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="product-card">
      <div className="product-card__image-wrap">
        {product.thumbnail && !imageFailed ? (
          <img
            className="product-card__image"
            src={product.thumbnail}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="product-card__placeholder" aria-label="Product image unavailable">
            <span>TP</span>
            <small>Product image</small>
          </div>
        )}
      </div>

      <div className="product-card__details">
        <span className="product-card__category">{product.category || "Uncategorised"}</span>

        <h2 className="product-card__title">
          {product.title}
        </h2>

        <p className="product-card__price">
          {formatPrice(product.price)}
        </p>

        <p className={`product-card__stock${outOfStock ? " is-empty" : ""}`}>
          {outOfStock ? "Out of stock" : `${remainingStock} available`}
        </p>

        <button
          className="product-card__details-button"
          onClick={() => onViewDetails(product)}
        >
          View Details
        </button>

        {!readOnly && (
          <button
            className="product-card__button"
            onClick={() => onAddToCart(product)}
            disabled={outOfStock}
          >
            {outOfStock ? "Out of stock" : "Add to cart"}
          </button>
        )}
      </div>
    </article>
  );
}

export default ProductCard;

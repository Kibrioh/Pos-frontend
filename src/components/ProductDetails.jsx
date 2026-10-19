import { formatPrice } from "../utils/formatPrice";

function ProductDetails({ product, onClose, onAddToCart, readOnly = false }) {
  if (!product) return null;

  return (
    <div className="product-details">
      <button
        type="button"
        className="product-details-back-button"
        onClick={onClose}
      >
        <span aria-hidden="true">←</span>
        Back to Products
      </button>

      <div className="product-details-content">
        <div className="product-details-image-frame">
          <img
            src={product.thumbnail}
            alt={product.title}
            className="product-details-image"
          />
        </div>

        <div className="product-details-info">
          <p className="product-category">
            {product.category}
          </p>

          <h2>{product.title}</h2>

          <p>{product.description}</p>

          <p>
            <strong>Brand:</strong>{" "}
            {product.brand || "N/A"}
          </p>

          <p>
            <strong>Price:</strong>{" "}
            {formatPrice(product.price)}
          </p>

          <p>
            <strong>Available:</strong>{" "}
            {product.stock}
          </p>

          {!readOnly && (
            <button
              onClick={() => onAddToCart(product)}
              disabled={product.stock < 1}
            >
              {product.stock < 1
                ? "Out of Stock"
                : "Add to Cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;

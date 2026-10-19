import { formatPrice } from "../utils/formatPrice";

function ProductDetails({ product, onClose, onAddToCart }) {
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
        <img
          src={product.thumbnail}
          alt={product.title}
          className="product-details-image"
        />

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

          <button
            onClick={() => onAddToCart(product)}
            disabled={product.stock < 1}
          >
            {product.stock < 1
              ? "Out of Stock"
              : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;

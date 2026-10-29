import "../styles/manager-success-popup.css";

function ManagerSuccessPopup({ message, onClose, className = "" }) {
  if (!message) return null;

  return (
    <div className={`manager-success-popup ${className}`.trim()}>
      <span className="manager-success-popup__icon" aria-hidden="true">✓</span>
      <p className="manager-success-popup__message" role="status">{message}</p>
      <button
        className="manager-success-popup__close"
        type="button"
        onClick={onClose}
        aria-label="Close success message"
      >
        ×
      </button>
    </div>
  );
}

export default ManagerSuccessPopup;

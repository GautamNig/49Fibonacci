// src/components/FibonacciTiles/PurchaseModal.jsx
import React from 'react';

const PurchaseModal = ({ 
  showModal, 
  selectedTile, 
  purchaseForm, 
  onClose, 
  onPurchase, 
  onFormChange 
}) => {
  if (!showModal || !selectedTile) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onPurchase();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Purchase Tile #{selectedTile.id + 1}</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="purchase-info">
              <div className="price-display">
                <span className="price-label">Price:</span>
                <span className="price-value">${selectedTile.price}</span>
              </div>
              <p className="modal-description">
                Claim your spot in the 49Fibonacci universe! This tile will be forever associated with your name.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="celebrityName">Celebrity/Public Name *</label>
              <input
                type="text"
                id="celebrityName"
                placeholder="Enter your public name"
                value={purchaseForm.celebrityName}
                onChange={(e) => onFormChange('celebrityName', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email (optional)"
                value={purchaseForm.email}
                onChange={(e) => onFormChange('email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Personal Message</label>
              <textarea
                id="message"
                placeholder="Add a message to display with your tile (optional)"
                rows="3"
                value={purchaseForm.message}
                onChange={(e) => onFormChange('message', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="purchase-button"
              disabled={!purchaseForm.celebrityName.trim()}
            >
              Purchase for ${selectedTile.price}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseModal;
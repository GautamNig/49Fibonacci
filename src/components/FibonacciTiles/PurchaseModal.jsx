// src/components/FibonacciTiles/PurchaseModal.jsx
import React, { useState, useRef } from 'react';
import { uploadImage } from '../../lib/supabase';

const PurchaseModal = ({ 
  showModal, 
  selectedTile, 
  purchaseForm, 
  onClose, 
  onPurchase, 
  onFormChange 
}) => {
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (showModal) {
      // Reset image preview when modal opens
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [showModal]);

  if (!showModal || !selectedTile) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onPurchase();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploading(true);

    try {
      // Create preview with proper sizing
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create a canvas to resize the image for preview
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set maximum dimensions for preview
          const maxWidth = 150;
          const maxHeight = 150;
          
          let { width, height } = img;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          setImagePreview(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const publicUrl = await uploadImage(file, purchaseForm.celebrityName || 'user');
      onFormChange('profileImageUrl', publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
      // Reset on error
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    onFormChange('profileImageUrl', '');
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    // Clear all form data when closing
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Purchase Tile #{selectedTile.id + 1}</h2>
          <button 
            className="close-button"
            onClick={handleClose}
            type="button"
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
                placeholder="Enter your email"
                value={purchaseForm.email}
                onChange={(e) => onFormChange('email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="profileImage">Profile Image (Max 2MB)</label>
              <input
                ref={fileInputRef}
                type="file"
                id="profileImage"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              <div className="file-helper">
                Supported formats: JPG, PNG, GIF. Max size: 2MB
              </div>
              {uploading && <div className="uploading-text">Uploading...</div>}
              {imagePreview && (
                <div className="image-preview-container">
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" className="preview-image" />
                    <button 
                      type="button" 
                      onClick={removeImage} 
                      className="remove-image-btn"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="quote">Inspirational Quote</label>
              <input
                type="text"
                id="quote"
                placeholder="Enter your favorite quote (optional)"
                value={purchaseForm.quote}
                onChange={(e) => onFormChange('quote', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">About You</label>
              <textarea
                id="description"
                placeholder="Tell us about yourself (optional)"
                rows="3"
                value={purchaseForm.description}
                onChange={(e) => onFormChange('description', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="personalMessage">Personal Message for Tile</label>
              <textarea
                id="personalMessage"
                placeholder="Add a message to display with your tile (optional)"
                rows="2"
                value={purchaseForm.personalMessage}
                onChange={(e) => onFormChange('personalMessage', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button"
              className="cancel-button"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="purchase-button"
              disabled={!purchaseForm.celebrityName.trim() || uploading}
            >
              {uploading ? 'Uploading...' : `Purchase for $${selectedTile.price}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseModal;
// src/components/FibonacciTiles/PurchaseModal.jsx
import React, { useState, useRef } from 'react';
import { uploadImage, supabase } from "../../lib/supabase";
import PayPalButtonIntegration from "../Payment/PayPalButtonIntegration";

const PurchaseModal = ({ 
  showModal, 
  selectedTile, 
  onClose, 
  onPurchase 
}) => {
  const [purchaseForm, setPurchaseForm] = useState({
    celebrityName: '',
    email: '',
    profileImageUrl: '',
    quote: '',
    description: '',
    personalMessage: ''
  });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentStep, setCurrentStep] = useState('form');
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (showModal) {
      setPurchaseForm({
        celebrityName: '',
        email: '',
        profileImageUrl: '',
        quote: '',
        description: '',
        personalMessage: ''
      });
      setImagePreview(null);
      setCurrentStep('form');
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [showModal]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.celebrityName.trim()) {
      alert('Please enter a celebrity name');
      return;
    }
    setCurrentStep('payment');
  };

  const handlePayPalApprove = async (transactionId, payerName, payerEmail) => {
    setProcessing(true);
    
    try {
      console.log('💰 PayPal payment approved:', { 
        transactionId, 
        payerName, 
        payerEmail,
        tileId: selectedTile.id,
        celebrityName: purchaseForm.celebrityName,
        price: selectedTile.price
      });

      // Auto-fill email if empty
      const finalEmail = purchaseForm.email || payerEmail;

      // Complete the purchase in database
      const { data, error } = await supabase.rpc('purchase_tile', {
        p_tile_id: selectedTile.id,
        p_celebrity_name: purchaseForm.celebrityName,
        p_celebrity_email: finalEmail,
        p_profile_image_url: purchaseForm.profileImageUrl,
        p_quote: purchaseForm.quote,
        p_description: purchaseForm.description,
        p_personal_message: purchaseForm.personalMessage,
        p_purchase_price: selectedTile.price
      });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Purchase completed successfully. Celebrity ID:', data);
      
      // Show success message
      alert(`🎉 Congratulations! Tile #${selectedTile.id + 1} has been purchased by ${purchaseForm.celebrityName} for $${selectedTile.price}`);
      
      // Call success callback
      onPurchase();
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('❌ Purchase completion error:', error);
      alert(`Payment processing failed: ${error.message}. Your payment was successful but we couldn't assign the tile. Please contact support with transaction ID: ${transactionId}`);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayPalError = (error) => {
    console.error('❌ PayPal error:', error);
    setProcessing(false);
    alert(`Payment error: ${error.message}. Please try again.`);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase storage
      const publicUrl = await uploadImage(file, purchaseForm.celebrityName || 'user');
      setPurchaseForm(prev => ({ ...prev, profileImageUrl: publicUrl }));
      
      console.log('✅ Image uploaded successfully:', publicUrl);
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setPurchaseForm(prev => ({ ...prev, profileImageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (field, value) => {
    setPurchaseForm(prev => ({ ...prev, [field]: value }));
  };

  if (!showModal || !selectedTile) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {currentStep === 'form' && `Purchase Tile #${selectedTile.id + 1}`}
            {currentStep === 'payment' && 'Complete Payment'}
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {currentStep === 'form' && (
            <form onSubmit={handleFormSubmit}>
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
                  onChange={(e) => handleInputChange('celebrityName', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email for receipt"
                  value={purchaseForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                <small className="field-help">We'll send a confirmation email</small>
              </div>

              <div className="form-group">
                <label htmlFor="profileImage">Profile Image (Optional, Max 2MB)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="profileImage"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <div className="uploading-text">Uploading...</div>}
                {imagePreview && (
                  <div className="image-preview-container">
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" className="preview-image" />
                      <button type="button" onClick={removeImage} className="remove-image-btn">
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                )}
                <small className="field-help">JPG, PNG, or WebP recommended</small>
              </div>

              <div className="form-group">
                <label htmlFor="quote">Inspirational Quote (Optional)</label>
                <input
                  type="text"
                  id="quote"
                  placeholder="Enter your favorite quote"
                  value={purchaseForm.quote}
                  onChange={(e) => handleInputChange('quote', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">About You (Optional)</label>
                <textarea
                  id="description"
                  placeholder="Tell us about yourself, your achievements, or why you're joining 49Fibonacci"
                  rows="3"
                  value={purchaseForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="personalMessage">Personal Message for Tile (Optional)</label>
                <textarea
                  id="personalMessage"
                  placeholder="Add a special message to display with your tile"
                  rows="2"
                  value={purchaseForm.personalMessage}
                  onChange={(e) => handleInputChange('personalMessage', e.target.value)}
                />
                <small className="field-help">This message will be visible when others hover over your tile</small>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-button" onClick={onClose}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="purchase-button"
                  disabled={!purchaseForm.celebrityName.trim()}
                >
                  Continue to Payment
                </button>
              </div>
            </form>
          )}

          {currentStep === 'payment' && (
            <div className="payment-section">
              <div className="payment-info">
                <h3>Complete Your Purchase</h3>
                <div className="purchase-summary">
                  <div className="summary-item">
                    <span>Tile Number:</span>
                    <strong>#{selectedTile.id + 1}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Price:</span>
                    <strong>${selectedTile.price}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Name:</span>
                    <strong>{purchaseForm.celebrityName}</strong>
                  </div>
                  {purchaseForm.email && (
                    <div className="summary-item">
                      <span>Email:</span>
                      <span>{purchaseForm.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {processing && (
                <div className="processing-overlay">
                  <div className="processing-spinner"></div>
                  <p>Processing your purchase...</p>
                </div>
              )}

              <PayPalButtonIntegration
                amount={selectedTile.price}
                description={`49Fibonacci Tile #${selectedTile.id + 1} - ${purchaseForm.celebrityName}`}
                onApprove={handlePayPalApprove}
                onError={handlePayPalError}
                disabled={processing}
              />

              <div className="payment-security">
                <small>🔒 Secure payment processed by PayPal</small>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="cancel-button" 
                  onClick={() => setCurrentStep('form')}
                  disabled={processing}
                >
                  ← Back to Form
                </button>
                <div className="payment-help">
                  <small>Having issues? Try refreshing the page.</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseModal;
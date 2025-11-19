import React, { useState, useRef, useEffect } from 'react';
import { uploadImage, supabase } from "../../lib/supabase";
import PayPalButtonIntegration from "../Payment/PayPalButtonIntegration";

const PurchaseModal = ({
  showModal,
  selectedTile,
  onClose,
  onPurchaseSuccess,
  gameConfig
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
  const [timeLeft, setTimeLeft] = useState(gameConfig?.TIMEOUT_DURATION);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const lockSubscriptionRef = useRef(null);

  // Handle auto-close due to timeout
  const handleAutoClose = async () => {
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
    }
    
    if (lockSubscriptionRef.current) {
      lockSubscriptionRef.current.unsubscribe();
    }
    
    onClose();
  };

  // Start countdown timer when modal opens
  useEffect(() => {
    if (showModal) {
      setTimeLeft(gameConfig?.TIMEOUT_DURATION); // 1 minutes
      setShowTimeoutWarning(false);
      
      // Start countdown
      timeoutRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 60 && prev > 0) {
            setShowTimeoutWarning(true); // Show warning at 1 minute
          }
          if (prev <= 0) {
            handleAutoClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Subscribe to lock changes
      lockSubscriptionRef.current = supabase
        .channel('lock-changes')
        .on('postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'system_state',
            filter: 'key=eq.purchase_in_progress'
          },
          (payload) => {
            // If lock was released by timeout, close modal
            if (payload.new.value === 'false') {
              alert('Purchase session was released due to system timeout.');
              handleAutoClose();
            }
          }
        )
        .subscribe();

      return () => {
        if (timeoutRef.current) {
          clearInterval(timeoutRef.current);
        }
        if (lockSubscriptionRef.current) {
          lockSubscriptionRef.current.unsubscribe();
        }
      };
    }
  }, [showModal]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (showModal) {
        supabase
          .from('system_state')
          .update({ 
            value: 'false',
            updated_at: new Date().toISOString()
          })
          .eq('key', 'purchase_in_progress')
          .then(() => console.log('Auto-released purchase lock on unmount'));
      }
    };
  }, [showModal]);

  // Reset form when modal opens
  useEffect(() => {
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

    // Add validation for tile ID
    if (selectedTile && gameConfig && selectedTile.id >= gameConfig.TOTAL_TILES) {
      alert(`Tile #${selectedTile.id + 1} is not available in the current configuration. Please refresh the page.`);
      return;
    }

    setCurrentStep('payment');
  };

  // Updated handlePayPalApprove with lock validation
  const handlePayPalApprove = async (transactionId, payerName, payerEmail) => {
    setProcessing(true);

    try {
      // Validate lock still belongs to this user
      const { data: lockState, error: lockError } = await supabase
        .from('system_state')
        .select('value, updated_at')
        .eq('key', 'purchase_in_progress')
        .single();

      if (lockError || !lockState || lockState.value === 'false') {
        throw new Error('Purchase session expired. Please try again.');
      }

      // Check if lock is stale (more than 10 minutes old)
      const lockAge = new Date() - new Date(lockState.updated_at);
      const ONE_MIN = gameConfig.TIMEOUT_DURATION * 1000;
      
      if (lockAge > ONE_MIN) {
        throw new Error('Purchase session expired due to inactivity.');
      }

      // Validate tile is within configured range using gameConfig prop
      if (gameConfig && selectedTile.id >= gameConfig.TOTAL_TILES) {
        throw new Error(`Tile #${selectedTile.id + 1} is not available in the current configuration.`);
      }

      console.log('💰 PayPal payment approved:', {
        transactionId,
        payerName,
        payerEmail,
        tileId: selectedTile.id,
        celebrityName: purchaseForm.celebrityName,
        price: selectedTile.price,
        totalTiles: gameConfig?.TOTAL_TILES
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
      onPurchaseSuccess();

      // Close modal
      onClose();

    } catch (error) {
      console.error('❌ Purchase completion error:', error);
      alert(`Payment processing failed: ${error.message}.`);
      onClose();
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

  // Format time for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render timeout warning
  const renderTimeoutWarning = () => {
    if (!showTimeoutWarning) return null;
    
    return (
      <div className="timeout-warning">
        <div className="warning-content">
          <div className="warning-icon">⚠️</div>
          <div className="warning-text">
            <strong>Session expiring in {formatTime(timeLeft)}!</strong>
            <br />
            Complete your purchase soon or your session will be released.
          </div>
          <button 
            className="warning-dismiss"
            onClick={() => setShowTimeoutWarning(false)}
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  if (!gameConfig) {
    console.warn('PurchaseModal: gameConfig not available');
  }

  if (!showModal || !selectedTile) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {currentStep === 'form' && `Purchase Tile #${selectedTile.id + 1}`}
            {currentStep === 'payment' && 'Complete Payment'}
          </h2>
          <div className="session-timer">
            Time left: {formatTime(timeLeft)}
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {renderTimeoutWarning()}
          
          {currentStep === 'form' && (
            <form onSubmit={handleFormSubmit}>
              <div className="purchase-info">
                <div className="price-display">
                  <span className="price-label">Price:</span>
                  <span className="price-value">${selectedTile.price}</span>
                </div>
                <p className="modal-description">
                  Claim your spot in the {gameConfig?.TOTAL_TILES || 49}Fibonacci universe! This tile will be forever associated with your name.
                </p>

                {/* Add config info for debugging */}
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Configuration: {gameConfig?.TOTAL_TILES || 49} tiles, {gameConfig?.GRID_COLUMNS || 7} columns
                </div>
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
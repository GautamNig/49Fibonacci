// src/components/FibonacciTiles/Tile.jsx
import React, { useState, useRef } from 'react';
import { getTileColor, getTileGlow } from '../../utils/fibonacci';
import { constructImageUrl } from '../../lib/supabase'; // Use constructImageUrl instead of fixImageUrl

const Tile = ({ tile, onTileClick }) => {
  const [showHoverModal, setShowHoverModal] = useState(false);
  const tileRef = useRef(null);

  const handleClick = () => {
    onTileClick(tile);
  };

  const handleMouseEnter = () => {
    if (tile.isPurchased && tile.celebrity) {
      setShowHoverModal(true);
    }
  };

  const handleMouseLeave = () => {
    setShowHoverModal(false);
  };

  // Get correctly constructed image URL
  const imageUrl = tile.celebrity?.profile_image_url 
    ? constructImageUrl(tile.celebrity.profile_image_url)
    : null;

  return (
    <div
      ref={tileRef}
      className={`tile ${tile.isPurchased ? 'purchased' : 'available'}`}
      style={{ 
        backgroundColor: getTileColor(tile),
        boxShadow: getTileGlow(tile)
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="tile-content">
        {tile.isPurchased ? (
          <>
            <div className="owner">{tile.owner}</div>
            <div className="price-paid">${tile.price}</div>
            {imageUrl && (
              <div className="tile-image-indicator">📷</div>
            )}
          </>
        ) : (
          <>
            <div className="price-current">${tile.price}</div>
            <div className="buy-label">Click to Buy</div>
          </>
        )}
      </div>
      
      {/* Hover Modal */}
      {showHoverModal && tile.celebrity && (
        <div 
          className="tile-hover-modal"
          onMouseEnter={() => setShowHoverModal(true)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="hover-modal-content">
            <div className="hover-modal-header">
              <h3>Tile #{tile.id + 1}</h3>
              <div className="purchase-price">Purchased for: ${tile.price}</div>
            </div>
            
            <div className="hover-modal-body">
              {imageUrl ? (
                <div className="image-container">
                  <img 
                    src={imageUrl} 
                    alt={tile.celebrity.name}
                    className="hover-modal-image"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error('❌ Image failed to load:', imageUrl);
                      e.target.style.display = 'none';
                      const placeholder = e.target.parentElement.querySelector('.hover-modal-placeholder');
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                    onLoad={(e) => {
                      console.log('✅ Image loaded successfully:', imageUrl);
                    }}
                  />
                  <div 
                    className="hover-modal-placeholder"
                    style={{ display: 'none' }}
                  >
                    <div className="placeholder-icon">👤</div>
                    <div className="placeholder-text">Image Not Available</div>
                  </div>
                </div>
              ) : (
                <div className="hover-modal-placeholder">
                  <div className="placeholder-icon">👤</div>
                  <div className="placeholder-text">No Image</div>
                </div>
              )}

              <div className="hover-modal-info">
                <h4 className="celebrity-name">{tile.celebrity.name}</h4>
                
                {tile.celebrity.email && (
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{tile.celebrity.email}</span>
                  </div>
                )}
                
                {tile.celebrity.quote && (
                  <div className="info-item">
                    <span className="info-label">Quote:</span>
                    <blockquote className="info-quote">"{tile.celebrity.quote}"</blockquote>
                  </div>
                )}
                
                {tile.celebrity.description && (
                  <div className="info-item">
                    <span className="info-label">About:</span>
                    <p className="info-description">{tile.celebrity.description}</p>
                  </div>
                )}
                
                {tile.personal_message && (
                  <div className="info-item">
                    <span className="info-label">Message:</span>
                    <p className="info-message">{tile.personal_message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!tile.isPurchased && <div className="tile-glow"></div>}
    </div>
  );
};

export default Tile;
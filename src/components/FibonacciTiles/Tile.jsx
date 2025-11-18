// src/components/FibonacciTiles/Tile.jsx
import React, { useState, useRef } from 'react';
import { getTileColor, getTileGlow } from '../../utils/fibonacci';
import { constructImageUrl } from '../../lib/supabase';

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

  const handleImageError = (e) => {
    console.log('Image failed to load:', tile.celebrity?.profile_image_url);
    e.target.style.display = 'none';
  };

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
            <div className="weightage" title="Market Weight">
              {typeof tile.weightage === 'number' ? tile.weightage.toFixed(1) : '0.0'}%
            </div>
            <div className="buy-label">Click to Buy</div>
          </>
        )}
      </div>

      {/* Enhanced Hover Modal */}
      {showHoverModal && tile.celebrity && (
        <div className="tile-hover-modal">
          <div className="hover-modal-content">
            {imageUrl && (
              <div className="celebrity-image">
                <img
                  src={imageUrl}
                  alt={tile.owner}
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
            )}

            <div className="celebrity-info">
              <h4>{tile.owner}</h4>

              {tile.celebrity.quote && (
                <div className="celebrity-quote">
                  "{tile.celebrity.quote}"
                </div>
              )}

              <div className="purchase-details">
                <div className="detail-item">
                  <span className="label">Purchased Price:</span>
                  <span className="value">${tile.price}</span>
                </div>

                <div className="detail-item">
                  <span className="label">Owner Share:</span>
                  <span className="value">{tile.weightage ? tile.weightage.toFixed(4) + '%' : 'N/A'}</span>
                </div>

                {tile.celebrity.description && (
                  <div className="detail-item full-width">
                    <span className="label">About:</span>
                    <span className="value">{tile.celebrity.description}</span>
                  </div>
                )}
              </div>

              {tile.personal_message && (
                <div className="personal-message">
                  <strong>Personal Message:</strong> "{tile.personal_message}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!tile.isPurchased && <div className="tile-glow"></div>}
    </div>
  );
};

export default Tile;
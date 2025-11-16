// src/components/FibonacciTiles/Tile.jsx
import React, { useState } from 'react';
import { getTileColor, getTileGlow } from '../../utils/fibonacci';

const Tile = ({ tile, onTileClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    onTileClick(tile);
  };

  const handleMouseEnter = () => {
    if (tile.isPurchased && tile.celebrity) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div
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
            {tile.celebrity?.profile_image_url && (
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
      
      {/* Hover Tooltip */}
      {showTooltip && tile.celebrity && (
        <div className="tile-tooltip">
          <div className="tooltip-content">
            {tile.celebrity.profile_image_url && (
              <img 
                src={tile.celebrity.profile_image_url} 
                alt={tile.celebrity.name}
                className="tooltip-image"
              />
            )}
            <div className="tooltip-info">
              <h4>{tile.celebrity.name}</h4>
              {tile.celebrity.quote && (
                <p className="tooltip-quote">"{tile.celebrity.quote}"</p>
              )}
              {tile.celebrity.description && (
                <p className="tooltip-description">{tile.celebrity.description}</p>
              )}
              {tile.personal_message && (
                <p className="tooltip-message">{tile.personal_message}</p>
              )}
              <p className="tooltip-price">Purchased for: ${tile.price}</p>
            </div>
          </div>
        </div>
      )}
      
      {!tile.isPurchased && <div className="tile-glow"></div>}
    </div>
  );
};

export default Tile;
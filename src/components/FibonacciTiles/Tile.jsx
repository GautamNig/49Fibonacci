// src/components/FibonacciTiles/Tile.jsx
import React from 'react';
import { getTileColor, getTileGlow } from '../../utils/fibonacci';

const Tile = ({ tile, onTileClick }) => {
  const handleClick = () => {
    onTileClick(tile);
  };

  return (
    <div
      className={`tile ${tile.isPurchased ? 'purchased' : 'available'}`}
      style={{ 
        backgroundColor: getTileColor(tile),
        boxShadow: getTileGlow(tile)
      }}
      onClick={handleClick}
    >
      <div className="tile-content">
        {tile.isPurchased ? (
          <>
            <div className="owner">{tile.owner}</div>
            <div className="price-paid">${tile.price}</div>
          </>
        ) : (
          <>
            <div className="price-current">${tile.price}</div>
            <div className="buy-label">Click to Buy</div>
          </>
        )}
      </div>
      {!tile.isPurchased && <div className="tile-glow"></div>}
    </div>
  );
};

export default Tile;
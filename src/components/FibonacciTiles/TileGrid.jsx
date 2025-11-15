// src/components/FibonacciTiles/TileGrid.jsx
import React from 'react';
import Tile from './Tile';

const TileGrid = ({ tiles, totalPurchased, currentPrice, onTileClick }) => {
  const TOTAL_TILES = 49;
  const GRID_COLUMNS = 7;

  return (
    <div className="tiles-panel">
      <div className="panel-header">
        <h2>Cosmic Grid</h2>
        <div className="grid-stats">
          <span>{totalPurchased}/{TOTAL_TILES} Tiles Claimed</span>
          <span>Current Price: ${currentPrice}</span>
        </div>
      </div>
      <div className="grid-container">
        <div 
          className="tiles-grid" 
          style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)` }}
        >
          {tiles.map((tile) => (
            <Tile
              key={tile.id}
              tile={tile}
              onTileClick={onTileClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TileGrid;
// src/components/FibonacciTiles/TileGrid.jsx
import React from 'react';
import Tile from './Tile';

const TileGrid = ({ tiles, totalPurchased, currentPrice, onTileClick, gameConfig }) => {
  const TOTAL_TILES = gameConfig.TOTAL_TILES;
  const GRID_COLUMNS = gameConfig.GRID_COLUMNS;

  // Validate we have the right number of tiles
  if (tiles.length !== TOTAL_TILES) {
    console.warn(`Tile count mismatch: Expected ${TOTAL_TILES}, got ${tiles.length}`);
  }

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
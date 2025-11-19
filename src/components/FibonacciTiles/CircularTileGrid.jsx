// src/components/FibonacciTiles/CircularTileGrid.jsx
import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import Tile from './Tile';

const CircularTileGrid = ({ tiles, totalPurchased, currentPrice, onTileClick, gameConfig }) => {
  const TOTAL_TILES = gameConfig.TOTAL_TILES;
  const [animationData, setAnimationData] = useState(null);
  
  // Load Lottie animation dynamically
  useEffect(() => {
    const loadAnimation = async () => {
      try {
        // Method 1: Using fetch for public folder
        const response = await fetch('/lottie/Firewood.json');
        const data = await response.json();
        setAnimationData(data);
      } catch (error) {
        console.error('Failed to load Lottie animation:', error);
      }
    };

    loadAnimation();
  }, []);

  // Calculate circular positions
  const calculatePosition = (index, total, radius) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y };
  };

  const radius = 120;
  const containerSize = radius * 2 + 200;

  console.log('🔄 CircularTileGrid rendering with', tiles.length, 'tiles');

  return (
    <div className="tiles-panel">
      <div className="panel-header">
        <h2>Bonfire Circle</h2>
        <div className="grid-stats">
          <span>{totalPurchased}/{TOTAL_TILES} Tiles Claimed</span>
          <span>Current Price: ${currentPrice}</span>
        </div>
      </div>
      
      <div className="circular-grid-container">
        <div 
          className="circular-grid"
          style={{
            width: `${containerSize}px`,
            height: `${containerSize}px`,
            position: 'relative'
          }}
        >
          {/* Bonfire Lottie Animation in Center */}
          <div className="bonfire-animation">
            {animationData ? (
              <Lottie
                animationData={animationData}
                loop={true}
                autoplay={true}
                style={{ width: 120, height: 120 }}
              />
            ) : (
              // Fallback placeholder while loading
              <div style={{
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, #ff6b00, #ff8c00, #ff4500)',
                borderRadius: '50%',
                filter: 'blur(5px) drop-shadow(0 0 20px orange)'
              }}></div>
            )}
          </div>

          {/* Circular Arranged Tiles */}
          {tiles.map((tile, index) => {
            const position = calculatePosition(index, TOTAL_TILES, radius);
            
            return (
              <div
                key={tile.id}
                className="circular-tile"
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${position.x}px)`,
                  top: `calc(50% + ${position.y}px)`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2
                }}
              >
                <Tile
                  tile={tile}
                  onTileClick={onTileClick}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CircularTileGrid;
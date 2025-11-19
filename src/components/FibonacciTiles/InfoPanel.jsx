// src/components/FibonacciTiles/InfoPanel.jsx
import React from 'react';
import { getFibonacciPrice, getCurrentPrice } from '../../config/gameConfig';

const StatsCard = ({ totalPurchased, currentPrice, gameConfig }) => {
  const nextPrice = getCurrentPrice(totalPurchased + 1, gameConfig.TILE_RANGE_START);
  const remainingTiles = gameConfig.TOTAL_TILES - totalPurchased;
  
  // Calculate total cost of all tiles in the configured range
  let totalCostAllTiles = 0;
  for (let i = gameConfig.TILE_RANGE_START; i <= gameConfig.TILE_RANGE_END; i++) {
    totalCostAllTiles += getFibonacciPrice(i);
  }
  
  const currentWeightage = (currentPrice / totalCostAllTiles) * 100;
  const currentFibonacciPosition = gameConfig.TILE_RANGE_START + totalPurchased;

  return (
    <div className="stats-card">
      <h3>🌌 Universe Stats</h3>
      <div className="stat-item">
        <span>Tile Range:</span>
        <span>{gameConfig.TILE_RANGE_START}-{gameConfig.TILE_RANGE_END}</span>
      </div>
      <div className="stat-item">
        <span>Tiles Purchased:</span>
        <span>{totalPurchased}/{gameConfig.TOTAL_TILES}</span>
      </div>
      <div className="stat-item">
        <span>Remaining:</span>
        <span>{remainingTiles} tiles</span>
      </div>
      <div className="stat-item">
        <span>Current Fibonacci Position:</span>
        <span>#{currentFibonacciPosition}</span>
      </div>
      <div className="stat-item">
        <span>Current Price:</span>
        <span className="price-highlight">${currentPrice}</span>
      </div>
      <div className="stat-item">
        <span>Current Weight:</span>
        <span className="weight-highlight">{currentWeightage.toFixed(4)}%</span>
      </div>
      <div className="stat-item">
        <span>Next Price:</span>
        <span className="next-price">${nextPrice}</span>
      </div>
      <div className="stat-item">
        <span>Total Universe Value:</span>
        <span className="total-value">${totalCostAllTiles.toLocaleString()}</span>
      </div>
    </div>
  );
};

const LeaderboardCard = ({ leaderboard }) => {
  return (
    <div className="leaderboard-card">
      <h3>⭐ Cosmic Leaders</h3>
      <div className="leaderboard-list">
        {leaderboard.map(([owner, count], index) => (
          <div key={owner} className="leaderboard-item">
            <div className="leaderboard-rank">#{index + 1}</div>
            <span className="owner-name">{owner}</span>
            <span className="tile-count">{count} tile{count > 1 ? 's' : ''}</span>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <div className="empty-state">
            No tiles purchased yet. Be the first star in our galaxy!
          </div>
        )}
      </div>
    </div>
  );
};

const ProgressionCard = ({ totalPurchased, gameConfig }) => {
  const currentFibonacciPosition = gameConfig.TILE_RANGE_START + totalPurchased;
  
  return (
    <div className="progression-card">
      <h3>📈 Fibonacci Journey</h3>
      <div className="progression-list">
        {Array.from({ length: Math.min(10, gameConfig.TOTAL_TILES - totalPurchased) }, (_, i) => {
          const step = totalPurchased + i;
          const fibonacciPosition = gameConfig.TILE_RANGE_START + step;
          const price = getFibonacciPrice(fibonacciPosition);
          
          return (
            <div 
              key={step} 
              className={`progression-item ${step === totalPurchased ? 'current' : ''}`}
            >
              {step === 0 ? <span className="step-number"></span> : <span className="step-number">After {step} purchases:</span>}
              <span className="step-price">${price}</span>
              {step === totalPurchased && (
                <span className="current-badge">Current</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InfoPanel = ({ tiles, totalPurchased, currentPrice, gameConfig }) => {
  const leaderboard = Object.entries(
    tiles
      .filter(tile => tile.owner)
      .reduce((acc, tile) => {
        acc[tile.owner] = (acc[tile.owner] || 0) + 1;
        return acc;
      }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="info-panel">
      <StatsCard 
        totalPurchased={totalPurchased} 
        currentPrice={currentPrice} 
        gameConfig={gameConfig}
      />
      <LeaderboardCard leaderboard={leaderboard} />
      <ProgressionCard totalPurchased={totalPurchased} gameConfig={gameConfig} />
    </div>
  );
};

export default InfoPanel;
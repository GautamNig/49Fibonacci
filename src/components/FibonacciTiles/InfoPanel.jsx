// src/components/FibonacciTiles/InfoPanel.jsx
import React from 'react';
import { getFibonacciPrice } from '../../utils/fibonacci';

const StatsCard = ({ totalPurchased, currentPrice }) => {
  const nextPrice = getFibonacciPrice(totalPurchased + 1);

  return (
    <div className="stats-card">
      <h3>🌌 Universe Stats</h3>
      <div className="stat-item">
        <span>Tiles Purchased:</span>
        <span>{totalPurchased}/49</span>
      </div>
      <div className="stat-item">
        <span>Current Price:</span>
        <span className="price-highlight">${currentPrice}</span>
      </div>
      <div className="stat-item">
        <span>Next Price:</span>
        <span className="next-price">${nextPrice}</span>
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

const ProgressionCard = ({ totalPurchased }) => {
  return (
    <div className="progression-card">
      <h3>📈 Fibonacci Journey</h3>
      <div className="progression-list">
        {Array.from({ length: 8 }, (_, i) => totalPurchased + i).map(step => (
          <div 
            key={step} 
            className={`progression-item ${step === totalPurchased ? 'current' : ''}`}
          >
            <span>After {step} purchases:</span>
            <span>${getFibonacciPrice(step)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const InfoPanel = ({ tiles, totalPurchased, currentPrice }) => {
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
      />
      <LeaderboardCard leaderboard={leaderboard} />
      <ProgressionCard totalPurchased={totalPurchased} />
    </div>
  );
};

export default InfoPanel;
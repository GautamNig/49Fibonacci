import React, { useState, useEffect } from 'react';
import './FibonacciTiles.css';

const CelebrityPixelWall = () => {
  const TOTAL_TILES = 49;
  const GRID_COLUMNS = 7; // 7x7 grid for 49 tiles
  
  const [tiles, setTiles] = useState(Array(TOTAL_TILES).fill(null).map((_, index) => ({
    id: index,
    owner: null,
    price: 1,
    isPurchased: false
  })));
  
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(1);

  // Fibonacci function
  const getFibonacciPrice = (n) => {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  };

  // Update current price when totalPurchased changes
  useEffect(() => {
    // For Fibonacci: price = fib(totalPurchased + 1) but we want:
    // After 0 purchases: $1 (fib(1))
    // After 1 purchase: $1 (fib(2)) 
    // After 2 purchases: $2 (fib(3))
    // After 3 purchases: $3 (fib(4))
    const newPrice = getFibonacciPrice(totalPurchased);
    setCurrentPrice(newPrice);
    
    // Update prices for unpurchased tiles
    setTiles(prevTiles => 
      prevTiles.map(tile => 
        !tile.isPurchased ? { ...tile, price: newPrice } : tile
      )
    );
  }, [totalPurchased]);

  const handlePurchase = (tileId) => {
    const tile = tiles[tileId];
    if (tile.isPurchased) return;

    const celebrityName = prompt(`Enter celebrity name for tile ${tileId + 1} (Price: $${tile.price}):`);
    if (!celebrityName) return;

    setTiles(prevTiles => 
      prevTiles.map(t => 
        t.id === tileId 
          ? { ...t, owner: celebrityName, isPurchased: true }
          : t
      )
    );
    
    setTotalPurchased(prev => prev + 1);
  };

  const getTileColor = (tile) => {
    if (!tile.owner) return '#f0f0f0';
    // Generate consistent color based on owner name
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#A29BFE', '#FD79A8', '#81ECEC', '#FDCB6E'];
    const index = tile.owner.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Calculate next Fibonacci price for display
  const nextPrice = getFibonacciPrice(totalPurchased + 1);

  return (
    <div className="pixel-wall">
      <h1>Celebrity Pixel Wall</h1>
      <div className="stats">
        <p>Tiles Purchased: {totalPurchased}/49</p>
        <p>Current Price per Tile: ${currentPrice}</p>
        <p>Next Price: ${nextPrice}</p>
        <p>Price Series: Fibonacci (1, 1, 2, 3, 5, 8, 13, 21...)</p>
      </div>
      
      <div className="tiles-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)` }}>
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className={`tile ${tile.isPurchased ? 'purchased' : 'available'}`}
            style={{ backgroundColor: getTileColor(tile) }}
            onClick={() => handlePurchase(tile.id)}
          >
            <div className="tile-content">
              {tile.isPurchased ? (
                <>
                  <div className="owner">{tile.owner}</div>
                  <div className="price-paid">${tile.price}</div>
                </>
              ) : (
                <div className="price">${tile.price}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="leaderboard">
        <h3>Leaderboard</h3>
        {Object.entries(
          tiles
            .filter(tile => tile.owner)
            .reduce((acc, tile) => {
              acc[tile.owner] = (acc[tile.owner] || 0) + 1;
              return acc;
            }, {})
        )
          .sort((a, b) => b[1] - a[1])
          .map(([owner, count]) => (
            <div key={owner} className="leaderboard-item">
              <span className="owner-name">{owner}</span>
              <span className="tile-count">{count} tile{count > 1 ? 's' : ''}</span>
            </div>
          ))
        }
      </div>

      <div className="price-progression">
        <h3>Price Progression (Next 10 steps)</h3>
        <div className="price-list">
          {Array.from({ length: 10 }, (_, i) => totalPurchased + i).map(step => (
            <div key={step} className="price-item">
              After {step} purchases: ${getFibonacciPrice(step)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CelebrityPixelWall;
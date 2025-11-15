// src/utils/fibonacci.js

// Fibonacci function
export const getFibonacciPrice = (n) => {
  if (n <= 1) return 1;
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
};

// Calculate leaderboard from tiles
export const calculateLeaderboard = (tiles) => {
  return Object.entries(
    tiles
      .filter(tile => tile.owner)
      .reduce((acc, tile) => {
        acc[tile.owner] = (acc[tile.owner] || 0) + 1;
        return acc;
      }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
};

// Generate tile colors
export const getTileColor = (tile) => {
  if (!tile.owner) return 'rgba(255, 255, 255, 0.1)';
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#A29BFE', '#FD79A8',
    '#81ECEC', '#FDCB6E', '#74B9FF', '#55E6C1', '#FC427B',
    '#82589F', '#F97F51', '#1B9CFC', '#F8EFBA', '#58B19F'
  ];
  const index = tile.owner.charCodeAt(0) % colors.length;
  return colors[index];
};

export const getTileGlow = (tile) => {
  if (!tile.owner) return 'none';
  const color = getTileColor(tile);
  return `0 0 20px ${color}, 0 0 40px ${color}40`;
};
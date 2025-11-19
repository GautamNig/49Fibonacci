// src/config/gameConfig.js
import { supabase } from '../lib/supabase';

// Default fallback values
const DEFAULT_CONFIG = {
  TOTAL_TILES: 5,
  GRID_COLUMNS: 5,
  STARTING_PRICE: 1,
  TIMEOUT_DURATION: 10 * 60, // 10 min
  TILE_RANGE_START: 45,
  TILE_RANGE_END: 49
};

// Function to load config from database
export const loadGameConfig = async () => {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .single();
    
    if (error) throw error;
    
    return {
      TOTAL_TILES: data.total_tiles,
      GRID_COLUMNS: data.grid_columns,
      STARTING_PRICE: DEFAULT_CONFIG.STARTING_PRICE,
      TIMEOUT_DURATION: DEFAULT_CONFIG.TIMEOUT_DURATION,
      TILE_RANGE_START: data.tile_range_start,
      TILE_RANGE_END: data.tile_range_end
    };
  } catch (error) {
    console.error('Error loading game config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
};

// Fibonacci calculation remains the same
export const getFibonacciPrice = (n) => {
  if (n < 2) return 1;
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
};

// Get current price based on total purchased and tile range
export const getCurrentPrice = (totalPurchased, tileRangeStart) => {
  return getFibonacciPrice(tileRangeStart + totalPurchased);
};

// Generate tiles based on config and range
export const generateInitialTiles = async () => {
  const config = await loadGameConfig();
  const tiles = [];
  
  // Only generate tiles within the configured range
  for (let i = config.TILE_RANGE_START; i <= config.TILE_RANGE_END; i++) {
    tiles.push({
      id: i,
      owner: null,
      price: getCurrentPrice(0, config.TILE_RANGE_START),
      weightage: 0,
      isPurchased: false
    });
  }
  return tiles;
};

// Calculate total universe value for configured range
export const calculateTotalUniverseValue = async () => {
  const config = await loadGameConfig();
  let total = 0;
  for (let i = config.TILE_RANGE_START; i <= config.TILE_RANGE_END; i++) {
    total += getFibonacciPrice(i);
  }
  return total;
};

// Export default config for immediate use
export let GAME_CONFIG = DEFAULT_CONFIG;

// Function to initialize config
export const initializeConfig = async () => {
  GAME_CONFIG = await loadGameConfig();
  return GAME_CONFIG;
};
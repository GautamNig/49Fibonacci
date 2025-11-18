// src/config/gameConfig.js
import { supabase } from '../lib/supabase';

// Default fallback values
const DEFAULT_CONFIG = {
  TOTAL_TILES: 49,
  GRID_COLUMNS: 7,
  STARTING_PRICE: 1
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
      STARTING_PRICE: DEFAULT_CONFIG.STARTING_PRICE
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

// Generate tiles based on config
export const generateInitialTiles = async () => {
  const config = await loadGameConfig();
  const tiles = [];
  for (let i = 0; i < config.TOTAL_TILES; i++) {
    tiles.push({
      id: i,
      owner: null,
      price: getFibonacciPrice(0),
      weightage: 0,
      isPurchased: false
    });
  }
  return tiles;
};

// Calculate total universe value
export const calculateTotalUniverseValue = async () => {
  const config = await loadGameConfig();
  let total = 0;
  for (let i = 0; i < config.TOTAL_TILES; i++) {
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
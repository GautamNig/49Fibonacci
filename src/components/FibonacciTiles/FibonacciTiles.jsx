// src/components/FibonacciTiles/FibonacciTiles.jsx
import React, { useState, useEffect, useCallback } from 'react';
import CircularTileGrid from './CircularTileGrid';
import {
  getFibonacciPrice,
  generateInitialTiles,
  initializeConfig,
  GAME_CONFIG,
  getCurrentPrice
} from '../../config/gameConfig';
import { supabase } from '../../lib/supabase';
import TileGrid from './TileGrid';
import InfoPanel from './InfoPanel';
import PurchaseModal from './PurchaseModal';
import './FibonacciTiles.css';

const FibonacciTiles = () => {
  const [tiles, setTiles] = useState([]);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(1);
  const [selectedTile, setSelectedTile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameConfig, setGameConfig] = useState(GAME_CONFIG);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);

  // Load config and data from Supabase
  const loadGameData = useCallback(async () => {
    try {
      console.log('🔄 Loading game data from database...');

      // Initialize config first
      const config = await initializeConfig();
      setGameConfig(config);
      console.log('✅ Config loaded:', config);

      // Load ALL tiles first, then filter by range
      const { data: allTilesData, error: tilesError } = await supabase
        .from('tiles')
        .select(`
          id,
          is_purchased,
          purchase_price,
          personal_message,
          weightage,
          celebrities (
            name,
            email,
            profile_image_url,
            quote,
            description
          )
        `)
        .order('id');

      if (tilesError) throw tilesError;

      // Load game state
      const { data: gameState, error: gameError } = await supabase
        .from('game_state')
        .select('*')
        .single();

      if (gameError) throw gameError;

      console.log('✅ Data loaded:', {
        allTilesInDB: allTilesData?.length,
        totalPurchased: gameState.total_purchased,
        tileRange: `${config.TILE_RANGE_START}-${config.TILE_RANGE_END}`,
        currentPrice: gameState.current_price
      });

      // Filter tiles to only show the configured range
      const filteredTiles = allTilesData
        .filter(tile => tile.id >= config.TILE_RANGE_START && tile.id <= config.TILE_RANGE_END)
        .map(tile => {
          const price = tile.is_purchased
            ? tile.purchase_price
            : getCurrentPrice(gameState.total_purchased, config.TILE_RANGE_START);

          // Calculate weightage if not set in database
          let totalCostAllTiles = 0;
          for (let i = config.TILE_RANGE_START; i <= config.TILE_RANGE_END; i++) {
            totalCostAllTiles += getFibonacciPrice(i);
          }
          const currentWeightage = (getCurrentPrice(gameState.total_purchased, config.TILE_RANGE_START) / totalCostAllTiles) * 100;

          const weightage = tile.weightage && tile.weightage > 0 ? tile.weightage : currentWeightage;

          return {
            id: tile.id,
            owner: tile.celebrities?.name || null,
            price: price,
            weightage: weightage,
            isPurchased: tile.is_purchased,
            personal_message: tile.personal_message,
            celebrity: tile.celebrities
          };
        });

      console.log('🔄 Filtered tiles for display:', {
        totalInRange: filteredTiles.length,
        tileIds: filteredTiles.map(t => t.id),
        rangeStart: config.TILE_RANGE_START,
        rangeEnd: config.TILE_RANGE_END,
        sampleTile: filteredTiles[0]
      });

      // Debug: Check if tiles are properly configured
      filteredTiles.forEach(tile => {
        console.log(`Tile ${tile.id}: purchased=${tile.isPurchased}, price=$${tile.price}, clickable=${!tile.isPurchased}`);
      });

      setTiles(filteredTiles);
      setTotalPurchased(gameState.total_purchased);
      setCurrentPrice(getCurrentPrice(gameState.total_purchased, config.TILE_RANGE_START));
    } catch (error) {
      console.error('❌ Error loading game data:', error);
      // Initialize with local tiles using current config
      const localTiles = await generateInitialTiles();
      setTiles(localTiles);
      setTotalPurchased(0);
      setCurrentPrice(getCurrentPrice(0, gameConfig.TILE_RANGE_START));
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup real-time subscriptions
  useEffect(() => {
    console.log('🔌 Setting up real-time subscriptions...');

    loadGameData();

    const subscription = supabase
      .channel('game-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tiles' },
        () => {
          console.log('🔄 Tile change detected, reloading data...');
          loadGameData();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_state' },
        () => {
          console.log('🔄 Game state change detected, reloading data...');
          loadGameData();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        () => {
          console.log('🔄 Config change detected, reloading data...');
          loadGameData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadGameData]);

  useEffect(() => {
    const checkForStaleLocks = async () => {
      try {
        const { data: state } = await supabase
          .from('system_state')
          .select('value, updated_at')
          .eq('key', 'purchase_in_progress')
          .single();

        if (state && state.value === 'true') {
          const lockAge = new Date() - new Date(state.updated_at);

          if (lockAge > gameConfig.TIMEOUT_DURATION * 1000) {
            // Auto-release stale lock
            await supabase
              .from('system_state')
              .update({
                value: 'false',
                updated_at: new Date().toISOString()
              })
              .eq('key', 'purchase_in_progress');

            console.log('Auto-released stale purchase lock');
          }
        }
      } catch (error) {
        console.error('Error checking stale locks:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkForStaleLocks, gameConfig.TIMEOUT_DURATION * 1000);

    // Initial check
    checkForStaleLocks();

    return () => clearInterval(interval);
  }, [gameConfig.TIMEOUT_DURATION]);

  // Purchase lock functions
  const checkPurchaseLock = async () => {
    try {
      const { data, error } = await supabase
        .from('system_state')
        .select('value')
        .eq('key', 'purchase_in_progress')
        .single();

      if (error) throw error;
      return data.value === 'true';
    } catch (error) {
      console.error('Error checking purchase lock:', error);
      return false;
    }
  };

  const acquirePurchaseLock = async () => {
    try {
      const { error } = await supabase
        .from('system_state')
        .update({
          value: 'true',
          updated_at: new Date().toISOString()
        })
        .eq('key', 'purchase_in_progress');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error acquiring purchase lock:', error);
      return false;
    }
  };

  const releasePurchaseLock = async () => {
    try {
      const { error } = await supabase
        .from('system_state')
        .update({
          value: 'false',
          updated_at: new Date().toISOString()
        })
        .eq('key', 'purchase_in_progress');

      if (error) throw error;
    } catch (error) {
      console.error('Error releasing purchase lock:', error);
    }
  };

  // Update handleTileClick function with better debugging
  const handleTileClick = async (tile) => {
    console.log('🎯 Tile clicked:', {
      id: tile.id,
      isPurchased: tile.isPurchased,
      price: tile.price,
      owner: tile.owner
    });

    if (tile.isPurchased) {
      console.log('⏹️ Tile already purchased, ignoring click');
      return;
    }

    console.log('🔒 Checking purchase lock...');

    // Check if purchase is already in progress
    const isLocked = await checkPurchaseLock();
    if (isLocked) {
      console.log('🔒 Purchase locked, showing alert');
      alert('Another purchase is currently in progress. Please try again in a few moments.');
      return;
    }

    console.log('🔓 Attempting to acquire purchase lock...');

    // Try to acquire lock
    const lockAcquired = await acquirePurchaseLock();
    if (!lockAcquired) {
      console.log('❌ Failed to acquire lock');
      alert('Failed to start purchase. Please try again.');
      return;
    }

    console.log('✅ Lock acquired, opening modal for tile:', tile.id);

    setPurchaseInProgress(true);
    setSelectedTile(tile);
    setShowModal(true);
  };

  // Update modal close handler
  const handleCloseModal = () => {
    console.log('🗑️ Closing modal, releasing lock');
    setShowModal(false);
    setSelectedTile(null);
    setPurchaseInProgress(false);
    releasePurchaseLock(); // Always release lock when modal closes
  };

  if (loading) {
    return (
      <div className="fibonacci-app">
        <div className="stars"></div>
        <div className="twinkling"></div>
        <div className="loading">
          <div className="loading-spinner"></div>
          Loading Cosmic Universe...
        </div>
      </div>
    );
  }

  return (
    <div className="fibonacci-app">
      <div className="stars"></div>
      <div className="twinkling"></div>

      <header className="app-header">
        <h1>{gameConfig.TILE_RANGE_START}-{gameConfig.TILE_RANGE_END} Fibonacci Tiles</h1>
        <div className="subtitle">Where Every Purchase Changes the Universe</div>
        <div className="config-info">
          Tile Range: {gameConfig.TILE_RANGE_START}-{gameConfig.TILE_RANGE_END} |
          Grid: {gameConfig.GRID_COLUMNS}x{Math.ceil(gameConfig.TOTAL_TILES / gameConfig.GRID_COLUMNS)} |
          Current Price: ${currentPrice} |
          Fibonacci Position: {gameConfig.TILE_RANGE_START + totalPurchased}
        </div>
      </header>

      <div className="app-container">
        {/* <TileGrid
          tiles={tiles}
          totalPurchased={totalPurchased}
          currentPrice={currentPrice}
          onTileClick={handleTileClick}
          gameConfig={gameConfig}
        /> */}
        <CircularTileGrid
          tiles={tiles}
          totalPurchased={totalPurchased}
          currentPrice={currentPrice}
          onTileClick={handleTileClick}
          gameConfig={gameConfig}
        />
        <InfoPanel
          tiles={tiles}
          totalPurchased={totalPurchased}
          currentPrice={currentPrice}
          gameConfig={gameConfig}
        />
      </div>

      <PurchaseModal
        showModal={showModal}
        selectedTile={selectedTile}
        onClose={handleCloseModal}
        onPurchaseSuccess={loadGameData}
        gameConfig={gameConfig}
      />
    </div>
  );
};

export default FibonacciTiles;
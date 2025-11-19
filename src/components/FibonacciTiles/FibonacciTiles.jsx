// src/components/FibonacciTiles/FibonacciTiles.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  getFibonacciPrice,
  generateInitialTiles,
  initializeConfig,
  GAME_CONFIG
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

      // Load ALL tiles with celebrity data
      const { data: tilesData, error: tilesError } = await supabase
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
        tilesInDB: tilesData?.length,
        totalPurchased: gameState.total_purchased,
        configTiles: config.TOTAL_TILES
      });

      // Filter tiles to only show the configured number (0 to TOTAL_TILES-1)
      const filteredTiles = tilesData
        .filter(tile => tile.id < config.TOTAL_TILES)
        .map(tile => {
          const price = tile.is_purchased ? tile.purchase_price : getFibonacciPrice(gameState.total_purchased);

          return {
            id: tile.id,
            owner: tile.celebrities?.name || null,
            price: price,
            weightage: tile.weightage || 0,
            isPurchased: tile.is_purchased,
            personal_message: tile.personal_message,
            celebrity: tile.celebrities
          };
        });

      console.log('🔄 Filtered tiles for display:', {
        totalInDB: tilesData.length,
        configuredTiles: config.TOTAL_TILES,
        displayedTiles: filteredTiles.length,
        tileIds: filteredTiles.map(t => t.id)
      });

      setTiles(filteredTiles);
      setTotalPurchased(gameState.total_purchased);
      setCurrentPrice(getFibonacciPrice(gameState.total_purchased));
    } catch (error) {
      console.error('❌ Error loading game data:', error);
      // Initialize with local tiles using current config
      const localTiles = await generateInitialTiles();
      setTiles(localTiles);
      setTotalPurchased(0);
      setCurrentPrice(1);
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
        () => loadGameData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_state' },
        () => loadGameData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        () => loadGameData()
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
  }, []);

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

  // Update handleTileClick function
  const handleTileClick = async (tile) => {
    if (tile.isPurchased) return;

    // Check if purchase is already in progress
    const isLocked = await checkPurchaseLock();
    if (isLocked) {
      alert('Another purchase is currently in progress. Please try again in a few moments.');
      return;
    }

    // Try to acquire lock
    const lockAcquired = await acquirePurchaseLock();
    if (!lockAcquired) {
      alert('Failed to start purchase. Please try again.');
      return;
    }

    setPurchaseInProgress(true);
    setSelectedTile(tile);
    setShowModal(true);
  };

  // Update modal close handler
  const handleCloseModal = () => {
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
        <h1>{gameConfig.TOTAL_TILES}Fibonacci Tiles</h1>
        <div className="subtitle">Where Every Purchase Changes the Universe</div>
        <div className="config-info">
          Total Tiles: {gameConfig.TOTAL_TILES} | Grid: {gameConfig.GRID_COLUMNS}x{Math.ceil(gameConfig.TOTAL_TILES / gameConfig.GRID_COLUMNS)} | Current Price: ${currentPrice}
        </div>
      </header>

      <div className="app-container">
        <TileGrid
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
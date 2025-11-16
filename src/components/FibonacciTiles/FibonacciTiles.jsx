// src/components/FibonacciTiles/FibonacciTiles.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getFibonacciPrice } from '../../utils/fibonacci';
import { supabase } from '../../lib/supabase';
import { realtimeService } from '../../services/realtimeService';
import TileGrid from './TileGrid';
import InfoPanel from './InfoPanel';
import PurchaseModal from './PurchaseModal';
import './FibonacciTiles.css';

const FibonacciTiles = () => {
  const TOTAL_TILES = 49;

  const [tiles, setTiles] = useState([]);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(1);
  const [selectedTile, setSelectedTile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchaseForm, setPurchaseForm] = useState({
    celebrityName: '',
    email: '',
    profileImageUrl: '',
    quote: '',
    description: '',
    personalMessage: ''
  });

  // Memoized data loader
  const loadGameData = useCallback(async () => {
    try {
      console.log('🔄 Loading game data from database...');

      // Load tiles with celebrity data
      const { data: tilesData, error: tilesError } = await supabase
        .from('tiles')
        .select(`
          id,
          is_purchased,
          purchase_price,
          personal_message,
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
        tiles: tilesData?.length,
        totalPurchased: gameState.total_purchased
      });

      // Transform tiles data
      const transformedTiles = tilesData.map(tile => ({
        id: tile.id,
        owner: tile.celebrities?.name || null,
        price: tile.is_purchased ? tile.purchase_price : getFibonacciPrice(gameState.total_purchased),
        isPurchased: tile.is_purchased,
        personal_message: tile.personal_message,
        celebrity: tile.celebrities
      }));

      setTiles(transformedTiles);
      setTotalPurchased(gameState.total_purchased);
      setCurrentPrice(getFibonacciPrice(gameState.total_purchased));
    } catch (error) {
      console.error('❌ Error loading game data:', error);
      initializeLocalTiles();
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize with local state as fallback
  const initializeLocalTiles = useCallback(() => {
    console.log('🔄 Initializing local tiles as fallback');
    const initialTiles = Array(TOTAL_TILES).fill(null).map((_, index) => ({
      id: index,
      owner: null,
      price: 1,
      isPurchased: false,
      personal_message: '',
      celebrity: null
    }));
    setTiles(initialTiles);
    setTotalPurchased(0);
    setCurrentPrice(1);
  }, [TOTAL_TILES]);

  // Real-time event handler
  const handleRealtimeUpdate = useCallback((event, payload) => {
    console.log('🎯 Real-time event received:', event, payload);

    switch (event) {
      case 'TILE_UPDATED':
      case 'TILE_INSERTED':
      case 'GAME_STATE_UPDATED':
      case 'CELEBRITY_UPDATED':
        console.log('🔄 Reloading data due to real-time update...');
        loadGameData();
        break;
      default:
        console.log('Unknown real-time event:', event);
    }
  }, [loadGameData]);

  // Setup real-time subscriptions
  useEffect(() => {
    console.log('🔌 Setting up real-time subscriptions...');

    // Load initial data
    loadGameData();

    // Subscribe to real-time updates
    const unsubscribe = realtimeService.subscribe(handleRealtimeUpdate);

    return () => {
      console.log('🧹 Cleaning up real-time subscriptions');
      unsubscribe();
    };
  }, [loadGameData, handleRealtimeUpdate]);

  // In your FibonacciTiles.jsx, update the handleTileClick function:
  const handleTileClick = (tile) => {
    if (tile.isPurchased) return;
    setSelectedTile(tile);
    setShowModal(true);
    // Reset form completely
    setPurchaseForm({
      celebrityName: '',
      email: '',
      profileImageUrl: '',
      quote: '',
      description: '',
      personalMessage: ''
    });
  };

  const handlePurchase = async () => {
    if (!selectedTile || !purchaseForm.celebrityName.trim()) return;

    try {
      console.log('💰 Starting purchase process...', {
        tileId: selectedTile.id,
        celebrityName: purchaseForm.celebrityName,
        price: selectedTile.price
      });

      // Call the database function to handle purchase
      const { data, error } = await supabase.rpc('purchase_tile', {
        p_tile_id: selectedTile.id,
        p_celebrity_name: purchaseForm.celebrityName,
        p_celebrity_email: purchaseForm.email,
        p_profile_image_url: purchaseForm.profileImageUrl,
        p_quote: purchaseForm.quote,
        p_description: purchaseForm.description,
        p_personal_message: purchaseForm.personalMessage,
        p_purchase_price: selectedTile.price
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }

      console.log('✅ Purchase successful, celebrity ID:', data);

      // Show success message
      // alert(`🎉 Congratulations! Tile #${selectedTile.id + 1} has been purchased by ${purchaseForm.celebrityName} for $${selectedTile.price}`);

      // Close modal
      setShowModal(false);
      setSelectedTile(null);

      // Force immediate data reload (in case real-time is delayed)
      setTimeout(() => {
        console.log('🔄 Force reloading data after purchase...');
        loadGameData();
      }, 500);

    } catch (error) {
      console.error('❌ Error purchasing tile:', error);
      alert(`❌ Error purchasing tile: ${error.message}. Please try again.`);
    }
  };

  const handleFormChange = (field, value) => {
    setPurchaseForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // And update the handleCloseModal function:
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTile(null);
    // Also reset form when closing without purchase
    setPurchaseForm({
      celebrityName: '',
      email: '',
      profileImageUrl: '',
      quote: '',
      description: '',
      personalMessage: ''
    });
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
        <h1>49Fibonacci Tiles</h1>
        <div className="subtitle">Where Every Purchase Changes the Universe</div>
        <div className="realtime-indicator">
          🔄 Real-time Updates Active
        </div>
      </header>

      <div className="app-container">
        <TileGrid
          tiles={tiles}
          totalPurchased={totalPurchased}
          currentPrice={currentPrice}
          onTileClick={handleTileClick}
        />

        <InfoPanel
          tiles={tiles}
          totalPurchased={totalPurchased}
          currentPrice={currentPrice}
        />
      </div>

      <PurchaseModal
        showModal={showModal}
        selectedTile={selectedTile}
        purchaseForm={purchaseForm}
        onClose={handleCloseModal}
        onPurchase={handlePurchase}
        onFormChange={handleFormChange}
      />
    </div>
  );
};

export default FibonacciTiles;
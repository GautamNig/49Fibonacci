// src/components/FibonacciTiles/FibonacciTiles.jsx
import React, { useState, useEffect } from 'react';
import { getFibonacciPrice } from '../../utils/fibonacci';
import { supabase } from '../../lib/supabase';
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

  // Load data from Supabase
  const loadGameData = async () => {
    try {
      console.log('Loading game data...');
      
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

      if (tilesError) {
        console.error('Tiles error:', tilesError);
        throw tilesError;
      }

      // Load game state
      const { data: gameState, error: gameError } = await supabase
        .from('game_state')
        .select('*')
        .single();

      if (gameError) {
        console.error('Game state error:', gameError);
        throw gameError;
      }

      console.log('Loaded data:', { tilesCount: tilesData?.length, gameState });

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
      console.error('Error loading game data:', error);
      // Fallback to local state
      initializeLocalTiles();
    } finally {
      setLoading(false);
    }
  };

  // Initialize with local state as fallback
  const initializeLocalTiles = () => {
    console.log('Initializing local tiles as fallback');
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
  };

  // Enhanced real-time subscriptions
  const subscribeToUpdates = () => {
    console.log('Setting up real-time subscriptions...');

    // Subscribe to tiles table changes
    const tilesSubscription = supabase
      .channel('tiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tiles'
        },
        (payload) => {
          console.log('Tiles change detected:', payload);
          loadGameData(); // Reload all data when tiles change
        }
      )
      .subscribe((status) => {
        console.log('Tiles subscription status:', status);
      });

    // Subscribe to game_state table changes
    const gameStateSubscription = supabase
      .channel('game-state-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_state'
        },
        (payload) => {
          console.log('Game state change detected:', payload);
          loadGameData(); // Reload all data when game state changes
        }
      )
      .subscribe((status) => {
        console.log('Game state subscription status:', status);
      });

    // Subscribe to celebrities table changes (in case celebrity data updates)
    const celebritiesSubscription = supabase
      .channel('celebrities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'celebrities'
        },
        (payload) => {
          console.log('Celebrities change detected:', payload);
          loadGameData();
        }
      )
      .subscribe((status) => {
        console.log('Celebrities subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscriptions');
      tilesSubscription.unsubscribe();
      gameStateSubscription.unsubscribe();
      celebritiesSubscription.unsubscribe();
    };
  };

  useEffect(() => {
    loadGameData();
    const unsubscribe = subscribeToUpdates();
    
    return () => {
      unsubscribe();
    };
  }, []);

  const handleTileClick = (tile) => {
    if (tile.isPurchased) return;
    setSelectedTile(tile);
    setShowModal(true);
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
      console.log('Starting purchase process...', {
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
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('Purchase successful, celebrity ID:', data);
      
      // Show success message
      alert(`Congratulations! Tile #${selectedTile.id + 1} has been purchased by ${purchaseForm.celebrityName} for $${selectedTile.price}`);
      
      // Close modal immediately
      setShowModal(false);
      setSelectedTile(null);

      // The real-time subscription will automatically reload the data
      // But we can also force a reload to be safe
      setTimeout(() => {
        loadGameData();
      }, 1000);
      
    } catch (error) {
      console.error('Error purchasing tile:', error);
      alert(`Error purchasing tile: ${error.message}. Please try again.`);
    }
  };

  const handleFormChange = (field, value) => {
    setPurchaseForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTile(null);
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
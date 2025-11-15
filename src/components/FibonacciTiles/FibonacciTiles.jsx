// src/components/FibonacciTiles/FibonacciTiles.jsx
import React, { useState, useEffect } from 'react';
import { getFibonacciPrice } from '../../utils/fibonacci';
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
  const [purchaseForm, setPurchaseForm] = useState({
    celebrityName: '',
    email: '',
    message: ''
  });

  // Initialize with local state
  useEffect(() => {
    const initialTiles = Array(TOTAL_TILES).fill(null).map((_, index) => ({
      id: index,
      owner: null,
      price: 1,
      isPurchased: false
    }));
    setTiles(initialTiles);
  }, []);

  // Update prices when totalPurchased changes
  useEffect(() => {
    const newPrice = getFibonacciPrice(totalPurchased);
    setCurrentPrice(newPrice);
    
    setTiles(prevTiles => 
      prevTiles.map(tile => 
        !tile.isPurchased ? { ...tile, price: newPrice } : tile
      )
    );
  }, [totalPurchased]);

  const handleTileClick = (tile) => {
    if (tile.isPurchased) return;
    setSelectedTile(tile);
    setShowModal(true);
    setPurchaseForm({
      celebrityName: '',
      email: '',
      message: ''
    });
  };

  const handlePurchase = () => {
    if (!selectedTile || !purchaseForm.celebrityName.trim()) return;

    const updatedTiles = tiles.map(t => 
      t.id === selectedTile.id 
        ? { 
            ...t, 
            owner: purchaseForm.celebrityName, 
            isPurchased: true,
            email: purchaseForm.email,
            message: purchaseForm.message
          }
        : t
    );
    
    setTiles(updatedTiles);
    setTotalPurchased(prev => prev + 1);
    setShowModal(false);
    setSelectedTile(null);
    
    alert(`Congratulations! Tile #${selectedTile.id + 1} has been purchased by ${purchaseForm.celebrityName} for $${selectedTile.price}`);
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
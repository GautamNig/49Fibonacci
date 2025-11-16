// src/services/realtimeService.js
import { supabase } from '../lib/supabase';

class RealtimeService {
  constructor() {
    this.channel = null;
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Initialize channel if not already done
    if (!this.channel) {
      this.initializeChannel();
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  initializeChannel() {
    console.log('Initializing real-time channel...');
    
    this.channel = supabase.channel('fibonacci-tiles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tiles'
        },
        (payload) => {
          console.log('New tile inserted:', payload);
          this.notifySubscribers('TILE_INSERTED', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tiles'
        },
        (payload) => {
          console.log('Tile updated:', payload);
          this.notifySubscribers('TILE_UPDATED', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_state'
        },
        (payload) => {
          console.log('Game state updated:', payload);
          this.notifySubscribers('GAME_STATE_UPDATED', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'celebrities'
        },
        (payload) => {
          console.log('Celebrity changed:', payload);
          this.notifySubscribers('CELEBRITY_UPDATED', payload);
        }
      )
      .on('system', { event: 'connected' }, () => {
        console.log('✅ Realtime connected!');
      })
      .on('system', { event: 'disconnected' }, () => {
        console.log('❌ Realtime disconnected');
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('🎉 Successfully subscribed to real-time updates!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error - check database replication settings');
        } else if (status === 'TIMED_OUT') {
          console.error('Realtime connection timed out');
        }
      });
  }

  notifySubscribers(event, payload) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, payload);
      } catch (error) {
        console.error('Error in real-time callback:', error);
      }
    });
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscribers.clear();
  }
}

export const realtimeService = new RealtimeService();
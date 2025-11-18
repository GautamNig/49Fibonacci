// src/config/paypal.js
export const paypalConfig = {
  // For SANDBOX testing, use your sandbox client ID
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID_SANDBOX,
  
  // Make sure this is set to sandbox for testing
  environment: 'sandbox', // Add this line
  
  currency: 'USD',
  intent: 'capture',
};
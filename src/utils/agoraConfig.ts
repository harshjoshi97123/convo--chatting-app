/**
 * Agora SDK Configuration
 * 
 * To get your App ID:
 * 1. Log in to https://console.agora.io/
 * 2. Create a project and copy the App ID.
 * 3. Replace the placeholder below.
 */

export const AGORA_CONFIG = {
  // IMPORTANT: Ensure your project in Agora Console is in "Testing Mode" (APP ID only) if you use TOKEN: null.
  // If your project is in "Safe Mode", you MUST provide a valid token here.
  APP_ID: '54c7fe0a41f745a69d3c74b88eb56a02', 
  TOKEN: null, 
};

// IMPORTANT: This app uses Supabase UUIDs as UIDs. 
// You MUST enable "Case-insensitive string UID" in your Agora Project settings.
export const AGORA_MODE = 'rtc';
export const AGORA_CODEC = 'vp8';

import fetch from 'node-fetch';

async function listAllKeys() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  const res = await fetch(`${url}/kv_store_5b740c2f?select=key&limit=100`, { headers });
  const data = await res.json();
  
  console.log("FIRST 100 KEYS:");
  data.forEach(k => console.log(`  ${k.key}`));
}

listAllKeys();

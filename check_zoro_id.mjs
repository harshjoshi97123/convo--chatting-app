import fetch from 'node-fetch';

async function checkZoroProfile() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  const zoroUUID = 'a352fd73-4b9d-48a1-89c0-86d6e54a653a';
  const res = await fetch(`${url}/kv_store_5b740c2f?key=like.user:*${zoroUUID}*`, { headers });
  const data = await res.json();
  
  console.log("ZORO PROFILE KV ENTRIES:");
  console.log(JSON.stringify(data, null, 2));
}

checkZoroProfile();

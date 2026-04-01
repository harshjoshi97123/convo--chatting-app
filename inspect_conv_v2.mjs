import fetch from 'node-fetch';

const SUPABASE_REST_URL = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
const restHeaders = { 
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM', 
  'Content-Type': 'application/json' 
};

async function test() {
  const res = await fetch(`${SUPABASE_REST_URL}/kv_store_5b740c2f?select=*&key=like.conv:*&limit=5`, { headers: restHeaders });
  if (res.ok) {
    const data = await res.json();
    console.log("KV Sample:", JSON.stringify(data, null, 2));
  }
}

test();

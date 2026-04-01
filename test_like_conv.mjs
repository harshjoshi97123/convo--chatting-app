import fetch from 'node-fetch';

const SUPABASE_REST_URL = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
const restHeaders = { 
  'apikey': process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM', 
  'Content-Type': 'application/json' 
};

async function test() {
  console.log("Testing like.*conv:*");
  const res1 = await fetch(`${SUPABASE_REST_URL}/kv_store_5b740c2f?select=*&key=like.*conv:*`, { headers: restHeaders });
  console.log("Res1 status:", res1.status);
  if (res1.ok) console.log("Res1 length:", (await res1.json()).length);
  else console.log("Res1 error:", await res1.text());

  console.log("Testing like.conv:*");
  const res2 = await fetch(`${SUPABASE_REST_URL}/kv_store_5b740c2f?select=*&key=like.conv:*`, { headers: restHeaders });
  console.log("Res2 status:", res2.status);
  if (res2.ok) console.log("Res2 length:", (await res2.json()).length);
  
}

test();

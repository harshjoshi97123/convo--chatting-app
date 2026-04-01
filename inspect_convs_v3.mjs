import fetch from 'node-fetch';

async function listConvs() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  console.log("Fetching first 50 conv: keys...");
  const res = await fetch(`${url}/kv_store_5b740c2f?key=like.conv:*&limit=50`, { headers });
  const data = await res.json();
  
  if (!Array.isArray(data)) {
      console.error("FAILED to list convs:", data);
      return;
  }

  console.log(`FOUND ${data.length} conv: keys`);
  data.forEach(item => {
      console.log(`KEY: ${item.key}`);
      console.log(`VALUE: ${JSON.stringify(item.value, null, 2)}`);
      console.log("---");
  });
}

listConvs();

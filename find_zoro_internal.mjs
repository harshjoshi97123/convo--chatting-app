import fetch from 'node-fetch';

async function findZoroInternal() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  const zoroEmail = 'zorohero2345@gmail.com';
  console.log(`Searching for profile with email: ${zoroEmail}`);
  
  const res = await fetch(`${url}/kv_store_5b740c2f?key=like.user:*&select=*`, { headers });
  const data = await res.json();
  
  if (!Array.isArray(data)) {
      console.error("FAILED to list profiles:", data);
      return;
  }

  const match = data.find(item => {
      const v = item.value;
      return v && (v.email === zoroEmail || v.id === 'a352fd73-4b9d-48a1-89c0-86d6e54a653a');
  });

  if (match) {
      console.log("FOUND ZORO INTERNAL PROFILE!");
      console.log(`KEY: ${match.key}`);
      console.log("VALUE:", JSON.stringify(match.value, null, 2));
      const internalId = match.key.split('user:')[1];
      console.log(`INTERNAL ID: ${internalId}`);
  } else {
      console.log("No profile found for Zoro email via broad search.");
  }
}

findZoroInternal();

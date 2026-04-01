import fetch from 'node-fetch';

async function listAllKeys() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  console.log("Listing ALL keys...");
  const res = await fetch(`${url}/kv_store_5b740c2f?select=key`, { headers });
  const data = await res.json();
  
  if (!Array.isArray(data)) {
      console.error("FAILED to list keys:", data);
      return;
  }

  console.log(`TOTAL KEYS: ${data.length}`);
  
  const userPrefix = 'user-conv:a352fd73-4b9d-48a1-89c0-86d6e54a653a';
  const userKeys = data.filter(k => k.key.startsWith(userPrefix));
  console.log(`ZORO USER-CONV KEYS: ${userKeys.length}`);
  userKeys.forEach(k => console.log(`  KEY: ${k.key}`));

  const convKeys = data.filter(k => k.key.startsWith('conv:'));
  console.log(`TOTAL CONV: KEYS: ${convKeys.length}`);

  // Inspect first user-conv value
  if (userKeys.length > 0) {
      console.log("\nInspecting first ZORO key value...");
      const valRes = await fetch(`${url}/kv_store_5b740c2f?key=eq.${userKeys[0].key}&select=value`, { headers });
      const valData = await valRes.json();
      console.log("VALUE:", JSON.stringify(valData[0]?.value, null, 2));
  }
}

listAllKeys();

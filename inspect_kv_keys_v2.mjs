import fetch from 'node-fetch';

async function listAllKeys() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  const res = await fetch(`${url}/kv_store_5b740c2f?select=key`, { headers });
  const data = await res.json();
  
  const allUserConvs = data.filter(k => k.key.startsWith('user-conv:'));
  console.log(`TOTAL USER-CONV: KEYS: ${allUserConvs.length}`);
  allUserConvs.slice(0, 20).forEach(k => console.log(`  KEY: ${k.key}`));

  const allConvs = data.filter(k => k.key.startsWith('conv:'));
  console.log(`TOTAL CONV: KEYS: ${allConvs.length}`);
  
  if (allConvs.length > 0) {
      const valRes = await fetch(`${url}/kv_store_5b740c2f?key=eq.${allConvs[0].key}&select=value`, { headers });
      const valData = await valRes.json();
      console.log(`SAMPLE CONV VALUE (${allConvs[0].key}):`, JSON.stringify(valData[0]?.value, null, 2));
  }
}

listAllKeys();

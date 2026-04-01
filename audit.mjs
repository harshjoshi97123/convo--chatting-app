const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1/kv_store_5b740c2f?select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';

const ID = 'a352fd73-4b9d-48a1-89c0-86d6e54a653a';

async function audit() {
  const res = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  const data = await res.json();
  
  const zoro = data.find(d => d.key === `user:${ID}`)?.value;
  console.log(`ZORO: ${JSON.stringify(zoro)}`);
  
  const convs = data.filter(d => d.key.startsWith('conv:') && JSON.stringify(d.value).includes(ID));
  console.log(`CONVS (${convs.length}):`);
  
  for (const c of convs) {
    console.log(`- ${c.key} -> ${JSON.stringify(c.value).slice(0, 100)}...`);
  }
}

audit();

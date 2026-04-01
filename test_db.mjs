import fetch from 'node-fetch';

const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';

async function test() {
  const res = await fetch(`${url}/users?select=*&limit=1`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    }
  });
  
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
test();

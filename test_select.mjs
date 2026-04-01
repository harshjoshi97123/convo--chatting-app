async function testSelect() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  console.log("Checking if room_messages exists and has data...");
  const msgRes = await fetch(`${url}/room_messages?select=*`, { headers });
  const msgData = await msgRes.json();
  
  console.log("Status:", msgRes.status);
  console.log("Total messages found in DB:", msgData.length);
  if (msgData.length > 0) {
    console.log("First message sample:", JSON.stringify(msgData[0], null, 2));
  } else {
    console.log("Empty Array returned! This implies either NO messages exist, OR Row-Level Security is silently deleting them from the SELECT return payload.");
  }
}

testSelect();

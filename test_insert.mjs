async function testInsert() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  console.log("1. Creating test room...");
  const roomRes = await fetch(`${url}/rooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'room:test' + Date.now(),
      name: 'Automated Test Room'
    })
  });
  
  const roomData = await roomRes.json();
  console.log("Room Insert Result:", roomRes.status, JSON.stringify(roomData, null, 2));

  if (!roomData || !roomData[0] || !roomData[0].id) {
    console.error("Failed to extract room ID. Aborting message test.");
    return;
  }

  const roomId = roomData[0].id;
  
  console.log("2. Creating test message referencing", roomId, "...");
  const msgRes = await fetch(`${url}/room_messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room_id: roomId,
      content: 'This is an automated test message from the debugger',
      type: 'text'
    })
  });
  
  console.log("Message Insert Result:", msgRes.status, JSON.stringify(await msgRes.json(), null, 2));
}

testInsert();

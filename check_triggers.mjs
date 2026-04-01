async function checkTriggers() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  // Instead of querying pg_trigger (which PostgREST blocks), let's try a different approach to debug the EXACT failure.
  // We will insert a room, then insert a message, and catch the exact Postgres error code and details!
  
  const testId = 'room:debug' + Date.now();
  console.log("Testing with ID:", testId);
  
  await fetch(`${url}/rooms`, {
    method: 'POST', headers: {...headers, 'Content-Type': 'application/json'},
    body: JSON.stringify({ id: testId, name: 'Debug' })
  });

  const msgRes = await fetch(`${url}/room_messages`, {
    method: 'POST', headers: {...headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation'},
    body: JSON.stringify({ room_id: testId, content: 'debug' })
  });
  
  const msgData = await msgRes.json();
  console.log("Msg Insert:", msgRes.status, JSON.stringify(msgData, null, 2));

  // Let's also check if they have a 'conversations' table that their foreign key is ACTUALLY hitting?
  // We dumped schema earlier. The schema said room_messages -> rooms.id.
}

checkTriggers();

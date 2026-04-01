async function testFilter() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  const roomId = "room:w4b1ei0";
  console.log("Testing PostgREST exact match filter for URL:", `${url}/room_messages?select=*&room_id=eq.${roomId}`);
  
  const msgRes = await fetch(`${url}/room_messages?select=*&room_id=eq.${roomId}`, { headers });
  const msgs = await msgRes.json();
  
  console.log("Filtered Length:", msgs.length);
  if (msgs.length > 0) {
    console.log("First item match:", msgs[0].room_id);
  } else {
    console.log("FAILED! PostgREST string matcher rejected the payload!");
  }
}

testFilter();

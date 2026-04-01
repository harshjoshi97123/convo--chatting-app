async function checkRooms() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1/rooms?select=*';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  console.log("Rooms status:", res.status);
  const data = await res.json();
  console.log("Rooms data:", JSON.stringify(data, null, 2));

  const msgUrl = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1/room_messages?select=*&limit=5';
  const msgRes = await fetch(msgUrl, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  console.log("Messages data:", JSON.stringify(await msgRes.json(), null, 2));
}

checkRooms();

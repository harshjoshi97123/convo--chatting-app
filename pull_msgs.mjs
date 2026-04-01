import fs from 'fs';

async function pullMsgs() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  const roomsRes = await fetch(`${url}/rooms?select=*`, { headers });
  const rooms = await roomsRes.json();
  fs.writeFileSync('output_rooms.json', JSON.stringify(rooms, null, 2));
  
  const msgRes = await fetch(`${url}/room_messages?select=*`, { headers });
  const msgs = await msgRes.json();
  fs.writeFileSync('output_msgs.json', JSON.stringify(msgs, null, 2));

  console.log("DONE");
}

pullMsgs();

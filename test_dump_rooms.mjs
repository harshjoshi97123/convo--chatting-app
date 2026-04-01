async function dumpTarget() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  const roomsRes = await fetch(`${url}/rooms?select=*`, { headers });
  const rooms = await roomsRes.json();
  console.log("ALL ROOMS:", JSON.stringify(rooms, null, 2));

  // Find DSA COURSE
  const dsa = rooms.find(r => r.name === 'DSA COURSE');
  if (dsa) {
     console.log("Found DSA COURSE. ID EXACT STRING LENGTH:", dsa.id.length, "HEX:", Array.from(dsa.id).map(c => c.charCodeAt(0).toString(16)).join(' '));
     
     console.log("Attempting insertion directly into this specific room...");
     const msgRes = await fetch(`${url}/room_messages`, {
       method: 'POST', headers: {...headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation'},
       body: JSON.stringify({ room_id: dsa.id, content: 'Terminal injection test' })
     });
     console.log("Insert result:", msgRes.status, await msgRes.json());
  } else {
     console.log("DSA COURSE NOT FOUND IN DATABASE!");
  }
}

dumpTarget();

import fs from 'fs';

async function dumpSchema() {
  const url = 'https://wsvhuivpzqmvznznbqyq.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';
  const res = await fetch(url);
  const data = await res.json();
  
  if (data && data.definitions) {
    fs.writeFileSync('schema_dump.json', JSON.stringify(data.definitions, null, 2));
    console.log("Successfully wrote schema_dump.json");
  } else {
    console.log("Failed to fetch schema", data);
  }
}

dumpSchema();

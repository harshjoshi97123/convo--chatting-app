import fetch from 'node-fetch';

const SUPABASE_URL = "https://wsvhuivpzqmvznznbqyq.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc4OTkzMCwiZXhwIjoyMDc4MzY1OTMwfQ.ad24c90f06c5cecc006b81692fdb40157fff36ecc006b81692fdb40157fff36";

async function listUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY
    }
  });

  if (!res.ok) {
     console.log("FAILED:", res.status, await res.text());
     return;
  }

  const data = await res.json();
  console.log("TOTAL USERS:", data.users.length);
  data.users.slice(0, 100).forEach(u => {
     console.log(`- ID: ${u.id} | EMAIL: ${u.email} | NAME: ${u.user_metadata?.name}`);
  });
}

listUsers();

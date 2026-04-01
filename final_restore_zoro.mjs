import fetch from 'node-fetch';

const SUPABASE_URL = "https://wsvhuivpzqmvznznbqyq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_ID = "3d6ff47d-381c-475a-8d6f-21f4bd6ff47d";
const ZORO_ID = "a352fd73-4b9d-48a1-89c0-86d6e54a653a";

async function restore() {
  console.log("FETCHING USER FROM AUTH ADMIN...");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${TARGET_ID}`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY
    }
  });

  if (!res.ok) {
     console.log("FAILED to fetch user from Auth:", res.status, await res.text());
     return;
  }

  const user = await res.json();
  const name = user.user_metadata?.name || user.email.split('@')[0];
  const email = user.email;

  console.log(`FOUND CONTACT: ${name} (${email})`);

  // Now create KV profile via PROBE script (using the endpoint I created)
  // Actually, I'll just write a script that uses the SERVICE_ROLE_KEY to set the KV directly
  console.log("SETTING KV PROFILE...");
  
  // Use the local node-fetch with SERVICE_ROLE_KEY to upsert to the table directly
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  await supabase.from("kv_store_5b740c2f").upsert({
    key: `user:${TARGET_ID}`,
    value: {
      id: TARGET_ID,
      email: email,
      name: name,
      username: user.user_metadata?.username || null,
      createdAt: user.created_at
    }
  });
  
  console.log("RESTORED PROFILE FOR CONTACT.");

  // NOW: DELETE DEMO DATA FOR ZORO
  console.log("DELETING DEMO DATA FOR ZORO...");
  const { data: zoroConvs } = await supabase.from("kv_store_5b740c2f").select("key").like("key", "conv:%");
  
  for (const row of zoroConvs) {
    if (row.key.includes("demo-") || row.key.includes("group-team")) {
       if (row.key.includes(ZORO_ID.slice(0, 8)) || row.key.includes(ZORO_ID)) {
          console.log(`- Deleting demo conv: ${row.key}`);
          await supabase.from("kv_store_5b740c2f").delete().eq("key", row.key);
       }
    }
  }

  console.log("CLEANUP COMPLETE.");
}

restore();

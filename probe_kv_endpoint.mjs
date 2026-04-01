import fetch from 'node-fetch';

const URL = "https://wsvhuivpzqmvznznbqyq.supabase.co/functions/v1/make-server-5b740c2f/debug-kv?prefix=user:";
const SECRET = "ZORO_KV_DEBUG_77";

async function probe() {
  console.log("PROBING KV VIA SERVER ENDPOINT...");
  const res = await fetch(URL, {
    headers: { 'x-debug-secret': SECRET }
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log("KV AUDIT RESULTS:");
    const harsh = data.sample.find(s => s.name?.toLowerCase().includes('harsh'));
    if (harsh) {
       console.log("FOUND HARSH JOSHI:", JSON.stringify(harsh));
    } else {
       console.log("HARSH NOT FOUND IN SAMPLES. ALL USERS:", JSON.stringify(data.sample.map(s => s.name)));
    }
    data.sample.forEach(s => {
       console.log(`- USER: ${s.name} | ID: ${s.id}`);
    });
  } else {
     console.log("FAILED:", res.status, await res.text());
  }
}

probe();

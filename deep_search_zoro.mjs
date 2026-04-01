import fetch from 'node-fetch';

const SUPABASE_URL = 'https://wsvhuivpzqmvznznbqyq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY; // I'll assume it's available or use the debug endpoint

async function deepSearch() {
  const URL = `${SUPABASE_URL}/functions/v1/make-server-5b740c2f/debug-kv?prefix=user:`;
  const res = await fetch(URL, { headers: { 'x-debug-secret': 'ZORO_KV_DEBUG_77' } });
  const data = await res.json();
  
  console.log('--- ALL PROFILES AUDIT ---');
  const harshProfiles = data.sample.filter(u => u.name?.toLowerCase().includes('harsh joshi'));
  console.log('Harsh Profiles found:', harshProfiles.length);
  harshProfiles.forEach(p => console.log(`ID: ${p.id}, Email: ${p.email}, Profile: ${JSON.stringify(p)}`));

  console.log('\n--- ALL CONVERSATIONS AUDIT ---');
  const convRes = await fetch(`${SUPABASE_URL}/functions/v1/make-server-5b740c2f/debug-kv?prefix=conv:`, { headers: { 'x-debug-secret': 'ZORO_KV_DEBUG_77' } });
  const convData = await convRes.json();
  const participantsSet = new Set();
  convData.sample.forEach(c => {
    if (c.participants) c.participants.forEach(p => participantsSet.add(p));
  });
  console.log('Total unique IDs found in all conversations:', participantsSet.size);
  
  // Search for any ID that is NOT in the 105 known profiles
  const knownIds = new Set(data.sample.map(u => u.id));
  const unknownIds = [...participantsSet].filter(id => !knownIds.has(id));
  console.log('Participants without profiles:', unknownIds.length);
  console.log('Sample Unknown IDs:', unknownIds.slice(0, 5));
}

deepSearch();

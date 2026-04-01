import { createClient } from '@supabase/supabase-js';

const s = createClient('https://wsvhuivpzqmvznznbqyq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM');

async function check() {
  const { data: kvProfiles } = await s.from('kv_store_5b740c2f').select('*').like('key', 'profile:%');
  console.log('Total profiles found:', kvProfiles?.length);
  
  // Find profiles by email manav7@gmail.com or other similar
  const manavProfile = kvProfiles?.find(p => p.value?.email?.includes('manav7') || p.value?.username?.includes('manav7'));
  console.log('Legacy Manav Profile:', manavProfile ? JSON.stringify(manavProfile, null, 2) : 'Not found');
  
  // Also find Zoro if he is the other user
  const zoroProfile = kvProfiles?.find(p => p.value?.email?.includes('zorohero') || p.value?.username?.includes('zorohero'));
  console.log('Legacy Zoro Profile:', zoroProfile ? JSON.stringify(zoroProfile, null, 2) : 'Not found');
}

check();

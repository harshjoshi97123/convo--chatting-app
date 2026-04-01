import fetch from 'node-fetch';

const URL = 'https://wsvhuivpzqmvznznbqyq.supabase.co/functions/v1/make-server-5b740c2f/god-restore-zoro';

async function run() {
  const res = await fetch(URL, { headers: { 'x-debug-secret': 'ZORO_KV_DEBUG_77' } });
  const d = await res.json();
  
  console.log('TOTAL MATCHES:', d.matchingConvsCount);
  d.matchingConvsSummary.forEach((s, i) => {
    console.log(`[${i}] ID: ${s.id}`);
    console.log(`    Participants: ${s.participants}`);
    console.log(`    Last Msg: ${s.lastMsg}`);
    console.log(`    isDemo: ${s.isDemo}`);
    
    if (s.id.includes('becffdef')) {
       console.log('    FOUND BROS GROUP! Checking participants names...');
    }
  });
  
  // Custom check for becffdef
  const res2 = await fetch('https://wsvhuivpzqmvznznbqyq.supabase.co/functions/v1/make-server-5b740c2f/debug-kv?prefix=&match=becffdef', { headers: { 'x-debug-secret': 'ZORO_KV_DEBUG_77' } });
  const d2 = await res2.json();
  const group = d2.sample.find(x => x.id === 'becffdef-0f56-4fcc-8519-75e11c210629');
  console.log('BROS GROUP PARTICIPANTS:', group?.participants);
}

run();

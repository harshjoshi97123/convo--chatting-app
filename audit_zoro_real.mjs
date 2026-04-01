import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wsvhuivpzqmvznznbqyq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ZORO_ID = "a352fd73-4b9d-48a1-89c0-86d6e54a653a";

async function audit() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  console.log("AUDITING KV FOR ZORO ID:", ZORO_ID);
  
  // 1. Get ALL conversations Zoro is in
  const { data: allConvs } = await supabase.from("kv_store_5b740c2f").select("*").like("key", "conv:%");
  
  const zoroConvs = allConvs.filter(row => {
    const val = row.value;
    return val.participants && val.participants.includes(ZORO_ID);
  });
  
  console.log(`Found ${zoroConvs.length} total conversations for Zoro.`);
  
  for (const row of zoroConvs) {
    const conv = row.value;
    // Get messages for this conv
    const { data: dbMsgs } = await supabase.from("kv_store_5b740c2f").select("*").like("key", `msg:${conv.id}:%`);
    console.log(`- CONV: ${row.key} | MSGS: ${dbMsgs?.length || 0} | PARTICIPANTS: ${JSON.stringify(conv.participants)}`);
    
    if (dbMsgs && dbMsgs.length > 0) {
       console.log(`  Sample Msg: ${dbMsgs[0].value.content.substring(0, 30)}...`);
    }
  }
}

audit();

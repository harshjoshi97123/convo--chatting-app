import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wsvhuivpzqmvznznbqyq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;

async function dumpSql() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  console.log('--- SUPABASE SQL AUDIT ---');
  
  const { data: convs, error: cErr } = await supabase.from('conversations').select('*');
  console.log('SQL Conversations:', convs?.length || 0);
  if (cErr) console.error('Conv Error:', cErr);
  
  const { data: msgs, error: mErr } = await supabase.from('messages').select('*').limit(200);
  console.log('SQL Messages (Sample 200):', msgs?.length || 0);
  if (mErr) console.error('Msg Error:', mErr);

  const zoroMsgs = msgs?.filter(m => JSON.stringify(m).includes('zoro') || JSON.stringify(m).includes('a352fd73') || JSON.stringify(m).includes('387a3786'));
  console.log('Zoro-related SQL Messages (in sample):', zoroMsgs?.length || 0);
  zoroMsgs?.forEach(m => console.log(`Msg: ${m.content.substring(0, 30)} (From: ${m.sender_id}, Conv: ${m.conversation_id})`));
}

dumpSql();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testSign() {
  const { data, error } = await supabase.auth.signUp({
    email: 'zorohero9328@gmail.com', // Let's use the one from the screenshot properly formatted
    password: 'password123'
  });
  console.log('Result:', JSON.stringify({ data, error }, null, 2));
}

testSign();

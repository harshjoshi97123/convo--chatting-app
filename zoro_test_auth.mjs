import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const email = 'zoro_test_' + Date.now() + '@example.com';
const username = 'zoro_user_' + Date.now();

console.log('1. Testing auth.signUp...');
const res1 = await supabase.auth.signUp({
  email,
  password: 'password123',
  options: {
     data: { name: 'Test User', username }
  }
});

console.log('Auth signUp result:', JSON.stringify({
  user: res1.data?.user?.id ? 'Created' : null,
  session: res1.data?.session ? 'Established' : null,
  error: res1.error
}, null, 2));

if (res1.data?.user) {
  console.log('2. Testing users table insert (Checking if RLS is fixed)...');
  const res2 = await supabase.from('users').insert({
    id: res1.data.user.id,
    name: 'Test User',
    username,
    email,
    avatar: ''
  });
  console.log('DB insert result:', JSON.stringify(res2, null, 2));
  
  console.log('3. Testing handle-to-email lookup...');
  const res3 = await supabase.from('users').select('email').eq('username', username).single();
  console.log('DB lookup result:', JSON.stringify(res3, null, 2));
}

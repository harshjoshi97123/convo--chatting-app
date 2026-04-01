-- 1. Ensure `users` table exists and is accessible
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  name text,
  username text UNIQUE,
  email text,
  avatar text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure anon/authenticated users can select profiles for the search system
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Create `chats` table for 1-on-1 conversations
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id uuid REFERENCES public.users(id) NOT NULL,
  user2_id uuid REFERENCES public.users(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- 3. Create `messages` table for individual texts
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.users(id) NOT NULL,
  receiver_id uuid REFERENCES public.users(id) NOT NULL,
  text text NOT NULL,
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- 4. Enable Realtime on the `messages` table so the UI can listen to new texts
alter publication supabase_realtime add table public.messages;

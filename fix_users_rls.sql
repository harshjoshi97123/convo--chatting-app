-- 1. Check if users table exists, if not create it
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  name text,
  username text UNIQUE,
  email text,
  avatar text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Temporarily Disable RLS or Enable specific open policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- (Optional) If you want to keep RLS ENABLED but explicitly allow these actions, 
-- you can run the following instead of disabling it:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Public users are viewable by everyone." ON public.users;
-- CREATE POLICY "Public profiles are viewable by everyone." 
--   ON public.users FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
-- CREATE POLICY "Users can insert their own profile." 
--   ON public.users FOR INSERT WITH CHECK ( auth.uid() = id );

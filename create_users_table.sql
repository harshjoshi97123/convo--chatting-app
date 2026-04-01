--- 1. Create the 'users' table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Everyone can read profiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 4. Create the 'chats' table if missing (for relational connections)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES public.users(id) NOT NULL,
  user2_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own chats" ON public.chats;
CREATE POLICY "Users can see their own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 5. BACKFILL: Insert existing auth.users into the public.users table
INSERT INTO public.users (id, name, email, username)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', email), 
  email, 
  raw_user_meta_data->>'username'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Trigger for Automatic Insertion on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    NEW.email, 
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Create the 'messages' table for 1-on-1 chats
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  receiver_id UUID REFERENCES public.users(id) NOT NULL,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see messages in their chats" ON public.messages;
CREATE POLICY "Users can see messages in their chats" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
CREATE POLICY "Users can insert messages in their chats" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

-- 8. Create the 'room_messages' table for community rooms
CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL, -- Logical ID for the room
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  sender_name TEXT,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can see room messages" ON public.room_messages;
CREATE POLICY "Everyone can see room messages" ON public.room_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert room messages" ON public.room_messages;
CREATE POLICY "Users can insert room messages" ON public.room_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );


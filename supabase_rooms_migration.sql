-- Supabase Migration: Rooms Feature
-- Paste this script into your Supabase SQL Editor and click "Run"

-- 1. Create Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create Room Members Table (Junction Table)
CREATE TABLE IF NOT EXISTS public.room_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id text REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_id, user_id)
);

-- 3. Create Room Messages Table
CREATE TABLE IF NOT EXISTS public.room_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id text REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  reply_to_id text
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Create Policies for Rooms
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Room creators can update their rooms" ON public.rooms FOR UPDATE USING (auth.uid() = created_by);

-- Create Policies for Room Members
CREATE POLICY "Anyone can view room members" ON public.room_members FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON public.room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.room_members FOR DELETE USING (auth.uid() = user_id);

-- Create Policies for Room Messages
CREATE POLICY "Anyone can view room messages" ON public.room_messages FOR SELECT USING (true);
CREATE POLICY "Only members can send room messages" ON public.room_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = room_messages.room_id
    AND room_members.user_id = auth.uid()
  )
);

-- Add Realtime Publication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.room_messages;

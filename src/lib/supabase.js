import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lpqaatxbqqluyvfkonrr.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWFhdHhicXFsdXl2ZmtvbnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzg3NjksImV4cCI6MjA5MTA1NDc2OX0.sy_i2tcfoUskkLV7IWhPCkk93AoYOozWdcJCLtuLy64'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zplrfkkyaxalniiofdsp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwbHJma2t5YXhhbG5paW9mZHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzQ2MDIsImV4cCI6MjA4NjQ1MDYwMn0._6Qf5J4ZyBbSarryZwT6jeEDrWWcmF4vPYGIoFVEyaw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

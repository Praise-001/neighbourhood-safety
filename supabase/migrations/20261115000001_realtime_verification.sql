-- Migration: Verify & enforce Realtime publication settings
-- Ensures public.tickets is published for perimeter alerts, and ticket_private is NOT published.

DO $$
BEGIN
  -- Add public.tickets if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;

  -- Ensure ticket_private is explicitly removed if present
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ticket_private'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.ticket_private;
  END IF;
END $$;

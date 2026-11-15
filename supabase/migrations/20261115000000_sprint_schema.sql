-- ====================================================================
-- Sprint Schema Migration: S1-01, S1-02, S1-03
-- Academic Prototype: Neighbourhood Safety
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Helper to check if current authenticated user is an active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND banned = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, banned)
  VALUES (
    new.id,
    new.email,
    'user',
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Tickets (PUBLIC COLUMNS ONLY - ADR-0004 Privacy & Realtime Rule)
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('theft', 'fire', 'accident', 'suspicious_activity', 'flooding', 'missing_person', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  location_name TEXT,
  public_lat DOUBLE PRECISION NOT NULL,
  public_lng DOUBLE PRECISION NOT NULL,
  public_location geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(public_lng, public_lat), 4326)) STORED,
  photo_url TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  flag_count INT NOT NULL DEFAULT 0,
  confirmation_count INT NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  incident_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_public_location ON public.tickets USING GIST (public_location);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets (category);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_hidden_expires ON public.tickets (hidden, expires_at);
CREATE INDEX IF NOT EXISTS idx_tickets_reference_code ON public.tickets (reference_code);

-- 4. Ticket Private (Private data: exact location and reporter identity)
CREATE TABLE IF NOT EXISTS public.ticket_private (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES public.tickets(id) ON DELETE CASCADE,
  exact_lat DOUBLE PRECISION NOT NULL,
  exact_lng DOUBLE PRECISION NOT NULL,
  exact_location geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(exact_lng, exact_lat), 4326)) STORED,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email_hash TEXT,
  reporter_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ticket_private_exact_location ON public.ticket_private USING GIST (exact_location);
CREATE INDEX IF NOT EXISTS idx_ticket_private_reporter_id ON public.ticket_private (reporter_id);
CREATE INDEX IF NOT EXISTS idx_ticket_private_email_hash ON public.ticket_private (reporter_email_hash);

-- 5. Ticket Updates (Official timeline of updates)
CREATE TABLE IF NOT EXISTS public.ticket_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL DEFAULT 'user' CHECK (author_role IN ('user', 'admin')),
  status_change TEXT CHECK (status_change IN ('open', 'investigating', 'resolved', 'closed')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ticket_updates_ticket_id ON public.ticket_updates (ticket_id, created_at ASC);

-- 6. Comments (Community discussion)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Neighbour',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON public.comments (ticket_id, created_at ASC);

-- 7. Confirmations ("I see this too" - 1 per user/token per ticket)
CREATE TABLE IF NOT EXISTS public.confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_ticket_client_confirm UNIQUE (ticket_id, client_token)
);

CREATE INDEX IF NOT EXISTS idx_confirmations_ticket_id ON public.confirmations (ticket_id);

-- Trigger to increment confirmation_count on tickets
CREATE OR REPLACE FUNCTION public.handle_ticket_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tickets
  SET confirmation_count = confirmation_count + 1
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_confirmation_inserted ON public.confirmations;
CREATE TRIGGER on_confirmation_inserted
  AFTER INSERT ON public.confirmations
  FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_confirmation();

-- 8. Flags ("Flag as false" - auto hide at 3 flags)
CREATE TABLE IF NOT EXISTS public.flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_token TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'false_report',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_ticket_client_flag UNIQUE (ticket_id, client_token)
);

CREATE INDEX IF NOT EXISTS idx_flags_ticket_id ON public.flags (ticket_id);

-- Trigger to increment flag_count and auto-hide if flag_count >= 3
CREATE OR REPLACE FUNCTION public.handle_ticket_flag()
RETURNS TRIGGER AS $$
DECLARE
  v_new_count INT;
BEGIN
  UPDATE public.tickets
  SET flag_count = flag_count + 1
  WHERE id = NEW.ticket_id
  RETURNING flag_count INTO v_new_count;

  IF v_new_count >= 3 THEN
    UPDATE public.tickets
    SET hidden = true
    WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_flag_inserted ON public.flags;
CREATE TRIGGER on_flag_inserted
  AFTER INSERT ON public.flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_flag();

-- 9. Alert Settings (User radius alerts)
CREATE TABLE IF NOT EXISTS public.alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_token TEXT NOT NULL,
  home_lat DOUBLE PRECISION NOT NULL,
  home_lng DOUBLE PRECISION NOT NULL,
  home_location geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(home_lng, home_lat), 4326)) STORED,
  radius_meters INT NOT NULL DEFAULT 1000 CHECK (radius_meters IN (500, 1000, 5000)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_alert_settings_client UNIQUE (client_token)
);

-- ====================================================================
-- S1-02: Row-Level Security Policies
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are readable by self and admins"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own non-sensitive profile info"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    banned = (SELECT banned FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- Tickets policies (ADR-0004 & S1-02)
-- Public can read non-hidden, non-expired rows of tickets; Admins can read all
CREATE POLICY "Public read non-hidden non-expired tickets"
  ON public.tickets FOR SELECT
  USING (
    (hidden = false AND expires_at > timezone('utc'::text, now()))
    OR public.is_admin()
  );

-- Anyone can submit a ticket (non-banned users)
CREATE POLICY "Anyone can insert tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (
    hidden = false AND
    flag_count = 0 AND
    NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned = true
    )
  );

-- Only admins can update (status, hide) or delete tickets
CREATE POLICY "Admins can update tickets"
  ON public.tickets FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete tickets"
  ON public.tickets FOR DELETE
  USING (public.is_admin());

-- Ticket Private policies (ADR-0004 strict privacy rule)
-- Readable ONLY by owner or admins
CREATE POLICY "Ticket private readable by reporter or admin"
  ON public.ticket_private FOR SELECT
  USING (
    (reporter_id IS NOT NULL AND auth.uid() = reporter_id)
    OR public.is_admin()
  );

-- Allowed to insert ticket private record when ticket is created
CREATE POLICY "Insert ticket private record"
  ON public.ticket_private FOR INSERT
  WITH CHECK (
    (reporter_id IS NULL OR auth.uid() = reporter_id) AND
    NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned = true
    )
  );

-- Ticket Updates policies
CREATE POLICY "Ticket updates readable with ticket"
  ON public.ticket_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_updates.ticket_id
      AND ((t.hidden = false AND t.expires_at > timezone('utc'::text, now())) OR public.is_admin())
    )
  );

CREATE POLICY "Admins can create ticket updates"
  ON public.ticket_updates FOR INSERT
  WITH CHECK (public.is_admin());

-- Comments policies
CREATE POLICY "Comments readable for visible tickets"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = comments.ticket_id
      AND ((t.hidden = false AND t.expires_at > timezone('utc'::text, now())) OR public.is_admin())
    )
  );

CREATE POLICY "Anyone can insert comment on visible ticket"
  ON public.comments FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned = true
    ) AND
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = comments.ticket_id
      AND t.hidden = false
      AND t.expires_at > timezone('utc'::text, now())
    )
  );

-- Confirmations policies
CREATE POLICY "Confirmations are readable"
  ON public.confirmations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add confirmation"
  ON public.confirmations FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned = true
    )
  );

-- Flags policies
CREATE POLICY "Flags readable by admins only"
  ON public.flags FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Anyone can flag a report"
  ON public.flags FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND banned = true
    )
  );

-- Alert Settings policies
CREATE POLICY "Users can manage own alert settings"
  ON public.alert_settings FOR ALL
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    client_token IS NOT NULL
  );

-- ====================================================================
-- S1-03: Postgres Functions for Map & Radius Queries
-- ====================================================================

-- Function 1: Radius search around a point
CREATE OR REPLACE FUNCTION public.get_nearby_tickets(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 50000,
  filter_category TEXT DEFAULT NULL,
  since_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF public.tickets AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM public.tickets t
  WHERE t.hidden = false
    AND t.expires_at > timezone('utc'::text, now())
    AND (filter_category IS NULL OR filter_category = '' OR filter_category = 'all' OR t.category = filter_category)
    AND (since_time IS NULL OR t.created_at >= since_time)
    AND ST_DWithin(
      t.public_location::geography,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function 2: Bounding box search for Map viewport
CREATE OR REPLACE FUNCTION public.get_tickets_in_bounds(
  min_lng DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  filter_category TEXT DEFAULT NULL,
  since_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF public.tickets AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM public.tickets t
  WHERE t.hidden = false
    AND t.expires_at > timezone('utc'::text, now())
    AND (filter_category IS NULL OR filter_category = '' OR filter_category = 'all' OR t.category = filter_category)
    AND (since_time IS NULL OR t.created_at >= since_time)
    AND t.public_location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Realtime publication for live alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;
END $$;

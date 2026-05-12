-- ============================================================
-- REVIEWS TABLE — Real guest review system with moderation
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_location text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL CHECK (char_length(comment) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  stay_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_reviews_hotel_status ON reviews (hotel_id, status);
CREATE INDEX idx_reviews_status ON reviews (status);

-- Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
CREATE POLICY "approved_reviews_readable_by_all"
  ON reviews FOR SELECT
  USING (status = 'approved');

-- Anyone can submit a new review
CREATE POLICY "anyone_can_submit_review"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- Authenticated users (admins) can update reviews (approve/reject)
CREATE POLICY "authenticated_users_can_update_reviews"
  ON reviews FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Authenticated users can also delete if needed
CREATE POLICY "authenticated_users_can_delete_reviews"
  ON reviews FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Leaderboard storage for Sanyal's Newsstand.
--
-- One row per completed examination. Rows are never updated: a player who plays
-- twice gets two rows, and the board collapses them to each player's best run at
-- read time. That keeps writes append-only, so two concurrent submissions can
-- never clobber each other.

CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  points     INTEGER NOT NULL,
  correct    INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  seconds    INTEGER NOT NULL,
  researched INTEGER NOT NULL DEFAULT 0,  -- exhibits read before the exam
  country    TEXT,                        -- from Cloudflare's request.cf, may be null
  ip_hash    TEXT,                        -- SHA-256 of (salt + address), never the address
  created_at INTEGER NOT NULL             -- unix seconds
);

-- The board reads `ORDER BY points DESC, seconds ASC`; this index serves it
-- without a sort.
CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores (points DESC, seconds ASC);

-- The rate limiter counts recent rows from one hashed address.
CREATE INDEX IF NOT EXISTS idx_scores_limiter ON scores (ip_hash, created_at);

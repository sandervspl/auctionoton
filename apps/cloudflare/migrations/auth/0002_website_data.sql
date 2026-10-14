-- Access owner IDs are independent of the isolated Better Auth trial accounts.
CREATE TABLE website_recent_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  search TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  UNIQUE(user_id, item_id)
);
CREATE INDEX website_recent_searches_owner ON website_recent_searches(user_id, timestamp DESC);
CREATE TABLE website_dashboard_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX website_dashboard_sections_owner ON website_dashboard_sections(user_id, sort_order);
CREATE TABLE website_dashboard_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES website_dashboard_sections(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(section_id, item_id)
);

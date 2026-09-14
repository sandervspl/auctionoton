CREATE TABLE item_metadata (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en_US',
  quality INTEGER NOT NULL DEFAULT 1,
  tags TEXT NOT NULL DEFAULT '',
  item_level INTEGER NOT NULL DEFAULT 0,
  required_level INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg'
);
CREATE INDEX item_metadata_name ON item_metadata(name COLLATE NOCASE);
CREATE INDEX item_metadata_slug ON item_metadata(slug);

-- Seed fixed categories for tasks
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO categories (id, label, sort_order) VALUES
  ('general', 'Allgemein', 0),
  ('room.kitchen', 'Küche', 10),
  ('room.living', 'Wohnzimmer', 20),
  ('room.bedroom', 'Schlafzimmer', 30),
  ('room.bath', 'Badezimmer', 40),
  ('room.office', 'Arbeitszimmer', 50),
  ('room.laundry', 'Waschküche', 60),
  ('outdoors', 'Außenbereich', 70),
  ('room.baby', 'Babyzimmer', 80);

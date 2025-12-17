-- Update category labels to German
UPDATE categories SET label = 'Allgemein', sort_order = 0 WHERE id = 'general';
UPDATE categories SET label = 'Küche', sort_order = 10 WHERE id = 'room.kitchen';
UPDATE categories SET label = 'Wohnzimmer', sort_order = 20 WHERE id = 'room.living';
UPDATE categories SET label = 'Schlafzimmer', sort_order = 30 WHERE id = 'room.bedroom';
UPDATE categories SET label = 'Badezimmer', sort_order = 40 WHERE id = 'room.bath';
UPDATE categories SET label = 'Arbeitszimmer', sort_order = 50 WHERE id = 'room.office';
UPDATE categories SET label = 'Waschküche', sort_order = 60 WHERE id = 'room.laundry';
UPDATE categories SET label = 'Außenbereich', sort_order = 70 WHERE id = 'outdoors';
UPDATE categories SET label = 'Babyzimmer', sort_order = 80 WHERE id = 'room.baby';

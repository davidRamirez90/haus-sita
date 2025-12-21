-- Add email column to users for Cloudflare Access mapping
ALTER TABLE users ADD COLUMN email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

UPDATE users
SET email = 'dramirez.c90@gmail.com'
WHERE id = 'you' AND (email IS NULL OR email = '');

UPDATE users
SET email = 'lenaschlueter@gmx.de'
WHERE id = 'partner' AND (email IS NULL OR email = '');

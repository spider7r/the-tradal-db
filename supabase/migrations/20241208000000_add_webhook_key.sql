-- Add webhook_key to users table for API authentication
alter table public.users add column if not exists webhook_key text default md5(random()::text);

-- Add unique constraint
alter table public.users add constraint users_webhook_key_key unique (webhook_key);

-- Force refresh existing users to have a key
update public.users set webhook_key = md5(random()::text) where webhook_key is null;

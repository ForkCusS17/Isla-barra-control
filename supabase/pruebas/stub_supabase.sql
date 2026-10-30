create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users(id uuid primary key, email text, last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid',true),'')::uuid $$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant all on storage.objects to authenticated;
grant usage on schema public to authenticated, anon;

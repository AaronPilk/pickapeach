-- Owner logins for /admin: one email + password per person instead of a single shared password.
-- Passwords are stored as bcrypt hashes. The first owner was created directly in the SQL editor (never in this repo):
--   insert into private.admin_users (email, name, password_hash)
--   values ('owner@example.com', 'Name', extensions.crypt('their-password', extensions.gen_salt('bf', 12)));
-- After that, owners add each other from Dashboard → Account.

create table if not exists private.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  disabled_at timestamptz
);
create unique index if not exists admin_users_email_uidx on private.admin_users (lower(email));

alter table private.admin_sessions add column if not exists user_id uuid;
alter table private.admin_attempts add column if not exists email text;

-- Lockouts: 8 misses per connection or 30 per email in 15 minutes.
create or replace function public.owner_login(p_email text, p_password text) returns uuid
language plpgsql security definer set search_path = private, extensions as $$
declare
  em text := lower(trim(coalesce(p_email, '')));
  ih text := private.ip_hash();
  u record;
  tok uuid;
begin
  if em = '' then return null; end if;
  if ih is not null and (select count(*) from private.admin_attempts where ip_hash = ih and not ok and at > now() - interval '15 minutes') >= 8 then
    return null;
  end if;
  if (select count(*) from private.admin_attempts where email = em and not ok and at > now() - interval '15 minutes') >= 30 then
    return null;
  end if;
  select id, password_hash into u from private.admin_users where lower(email) = em and disabled_at is null;
  if u.id is null or extensions.crypt(coalesce(p_password, ''), u.password_hash) <> u.password_hash then
    insert into private.admin_attempts (ok, ip_hash, email) values (false, ih, em);
    return null;
  end if;
  insert into private.admin_attempts (ok, ip_hash, email) values (true, ih, em);
  update private.admin_users set last_login_at = now() where id = u.id;
  insert into private.admin_sessions (user_id) values (u.id) returning token into tok;
  return tok;
end;
$$;

create or replace function private.owner_from_token(p_token uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select s.user_id from private.admin_sessions s join private.admin_users u on u.id = s.user_id
  where s.token = p_token and s.expires_at > now() and u.disabled_at is null;
$$;

create or replace function public.owner_me(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', u.id, 'email', u.email, 'name', u.name)
  from private.admin_users u where u.id = private.owner_from_token(p_token);
$$;

create or replace function public.owner_change_password(p_token uuid, p_current text, p_new text) returns boolean
language plpgsql security definer set search_path = private, extensions as $$
declare
  uid uuid := private.owner_from_token(p_token);
  h text;
begin
  if uid is null then raise exception 'Log in again.'; end if;
  select password_hash into h from private.admin_users where id = uid;
  if extensions.crypt(coalesce(p_current, ''), h) <> h then raise exception 'Your current password isn''t right.'; end if;
  if length(coalesce(p_new, '')) < 10 then raise exception 'Use at least 10 characters.'; end if;
  update private.admin_users set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 12)) where id = uid;
  -- Sign out every other device.
  update private.admin_sessions set expires_at = now() where user_id = uid and token <> p_token and expires_at > now();
  return true;
end;
$$;

create or replace function public.owner_list(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'email', email, 'name', name, 'lastLogin', last_login_at, 'createdAt', created_at,
           'you', id = private.owner_from_token(p_token)) order by created_at), '[]'::jsonb)
  from private.admin_users where disabled_at is null and private.owner_from_token(p_token) is not null;
$$;

create or replace function public.owner_add(p_token uuid, p_email text, p_name text, p_password text) returns jsonb
language plpgsql security definer set search_path = private, extensions as $$
declare
  em text := lower(trim(coalesce(p_email, '')));
  new_id uuid;
begin
  if private.owner_from_token(p_token) is null then raise exception 'Log in again.'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Enter a valid email.'; end if;
  if length(coalesce(p_password, '')) < 10 then raise exception 'Use at least 10 characters for their password.'; end if;
  if exists (select 1 from private.admin_users where lower(email) = em and disabled_at is null) then raise exception 'That email already has a login.'; end if;
  update private.admin_users set disabled_at = null, name = nullif(trim(p_name), ''), password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 12))
    where lower(email) = em returning id into new_id;
  if new_id is null then
    insert into private.admin_users (email, name, password_hash) values (em, nullif(left(trim(p_name), 60), ''), extensions.crypt(p_password, extensions.gen_salt('bf', 12)))
    returning id into new_id;
  end if;
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

create or replace function public.owner_remove(p_token uuid, p_id uuid) returns boolean
language plpgsql security definer set search_path = private as $$
declare
  me uuid := private.owner_from_token(p_token);
begin
  if me is null then raise exception 'Log in again.'; end if;
  if p_id = me then raise exception 'You can''t remove your own login.'; end if;
  update private.admin_users set disabled_at = now() where id = p_id and disabled_at is null;
  update private.admin_sessions set expires_at = now() where user_id = p_id and expires_at > now();
  return true;
end;
$$;

revoke all on function private.owner_from_token(uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['public.owner_me(uuid)', 'public.owner_change_password(uuid,text,text)', 'public.owner_list(uuid)',
                           'public.owner_add(uuid,text,text,text)', 'public.owner_remove(uuid,uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
-- owner_login stays callable with the public key (like admin_login) so `npm run sync:sheet` can sign in with an email.
revoke all on function public.owner_login(text, text) from public;
grant execute on function public.owner_login(text, text) to anon, service_role;

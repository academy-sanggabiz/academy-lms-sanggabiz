-- Learner auth: profiles table, auto-provisioning trigger, and JWT role claim hook.
-- Run this in the Supabase Dashboard SQL Editor (or `supabase db push` once the
-- project is linked). After running, also complete the dashboard-only steps
-- documented in the plan (Auth Hooks, Email/Google providers, redirect URLs).

-- 1. Role enum + profiles table (1:1 with auth.users)
create type public.user_role as enum ('learner', 'admin', 'superadmin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'learner',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user may read/update only their own row. There is no insert policy —
-- rows are created only by the trigger below, never directly by clients.
create policy "own profile read" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "own profile update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 2. Auto-create a profile row (default role 'learner') whenever a new
-- auth.users row is created, whether via email/password or Google OAuth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3. Custom access-token hook: injects the learner/admin/superadmin role
-- into app_metadata.role in the issued JWT, so the role is readable from
-- the session with no extra DB round trip.
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public.user_role;
begin
  select role into user_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if user_role is not null then
    if jsonb_typeof(claims -> 'app_metadata') is null then
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    end if;
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- The Auth service (not application clients) must be able to read profiles
-- and call the hook. Application roles must NOT be able to call it directly.
grant all on table public.profiles to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

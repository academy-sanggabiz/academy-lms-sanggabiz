-- Settings page: per-learner notification preference and display currency.
-- Covered by the existing "own profile update" RLS policy (learner_auth.sql) —
-- no new policy needed since it has no column-level restriction.

alter table public.profiles
  add column notification_email_enabled boolean not null default true,
  add column currency text not null default 'USD';

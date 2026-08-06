-- =============================================================================
-- Drop the quiz-submissions storage bucket (file_upload questions now use links)
-- =============================================================================
--
-- Run this once in the Supabase Dashboard SQL Editor against the live
-- database. databaseSetup.sql (the consolidated from-scratch script) has
-- already been updated to no longer create this bucket, for future fresh
-- setups -- this script applies the same removal incrementally.
--
-- Reverses the storage half of 20260803010000_quiz_file_upload_question.sql:
-- 'file_upload' questions no longer have learners upload a PDF -- they submit
-- a plain link instead (quiz_responses.response is an untyped jsonb string,
-- so no schema change was needed there). The 'file_upload' value stays in
-- public.question_type (Postgres can't drop an enum value, and it's still a
-- valid authored question type, just link-based now) -- only the now-unused
-- storage bucket and its policies are removed here.
--
-- Supabase blocks raw SQL `delete` on storage.objects/storage.buckets (a
-- protect_delete() trigger raises 42501 "Direct deletion from storage tables
-- is not allowed") -- bucket/object removal has to go through the Storage
-- API instead. This script only drops the policies below; after running it,
-- go to the Dashboard -> Storage, select the `quiz-submissions` bucket, and
-- use its "Delete bucket" action to remove the bucket (and any objects in
-- it) through the Storage API.

drop policy if exists "admins can read quiz submissions" on storage.objects;
drop policy if exists "admins can delete quiz submissions" on storage.objects;
drop policy if exists "learners can upload own quiz submissions" on storage.objects;
drop policy if exists "learners can read own quiz submissions" on storage.objects;
drop policy if exists "learners can update own quiz submissions" on storage.objects;

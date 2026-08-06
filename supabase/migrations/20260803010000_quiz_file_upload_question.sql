-- =============================================================================
-- File-upload (PDF) question type for study-case quizzes
-- =============================================================================
--
-- Run this once in the Supabase Dashboard SQL Editor against the live
-- database. databaseSetup.sql (the consolidated from-scratch script) has
-- already been updated with the equivalent changes for future fresh setups
-- -- this script applies the same change incrementally.
--
-- Effect: adds 'file_upload' to public.question_type (learners upload a PDF
-- instead of typing an answer -- same manual-grading path as 'essay', since
-- public.grade_attempt() already treats any unrecognized question type as
-- ungraded/pending-review, no function changes needed) and creates a private
-- `quiz-submissions` storage bucket for the uploaded PDFs.

alter type public.question_type add value if not exists 'file_upload';

-- Private (not public-read, unlike course-thumbnails/certificate-assets/
-- lesson-content) since quiz answers are learner-private data. Admins get
-- global is_admin() access (matching the documented convention that
-- storage-bucket write policies stay is_admin()-gated, not owner-scoped --
-- see 20260803000000_admin_course_ownership.sql). Learners are restricted to
-- their own path prefix, mirroring "learners can upload own certificate
-- pdfs" in databaseSetup.sql. Path convention:
-- {learner_id}/{attempt_id}/{question_id}.pdf
insert into storage.buckets (id, name, public)
values ('quiz-submissions', 'quiz-submissions', false)
on conflict (id) do nothing;

create policy "admins can read quiz submissions" on storage.objects
  for select to authenticated
  using (bucket_id = 'quiz-submissions' and public.is_admin());

create policy "admins can delete quiz submissions" on storage.objects
  for delete to authenticated
  using (bucket_id = 'quiz-submissions' and public.is_admin());

create policy "learners can upload own quiz submissions" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'quiz-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "learners can read own quiz submissions" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'quiz-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "learners can update own quiz submissions" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'quiz-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'quiz-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

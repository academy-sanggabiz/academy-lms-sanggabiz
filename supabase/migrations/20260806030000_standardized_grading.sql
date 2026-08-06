-- Standardized grading: question points are derived from question type
-- instead of authored per-question, quizzes get a weight for the final
-- course grade, and courses get a minimum passing grade for certificates.

-- 1. Per-assessment weight in the final course grade.
alter table public.quizzes
  add column if not exists weight int not null default 1
  check (weight > 0);

-- 2. Course-level minimum grade for certificate eligibility.
alter table public.courses
  add column if not exists passing_grade int not null default 70
  check (passing_grade between 0 and 100);

-- 3. Backfill existing questions to the standardized scale (objective
-- questions = 1, manually-graded written work = 20). This changes the
-- denominator of already-graded attempts on mixed quizzes -- historical
-- quiz_attempts.score values are intentionally NOT recomputed.
update public.questions set points = 20
  where type in ('essay', 'file_upload') and points <> 20;
update public.questions set points = 1
  where type in ('multiple_choice', 'true_false', 'short_answer') and points <> 1;

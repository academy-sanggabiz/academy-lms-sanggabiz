-- Drop quizzes.weight -- a quiz's weight in the final course grade is derived
-- from is_assessment now, not authored.
--
-- It was a per-quiz number input in the course editor's quiz settings, which
-- made every admin guess a value on every quiz while the rest of the grading
-- model (QUESTION_TYPE_POINTS, courses.passing_grade) is deliberately
-- standardized. quizGradeWeight() in lib/course-grade.ts is the replacement:
-- a study-case assessment counts ASSESSMENT_GRADE_WEIGHT (3) times a regular
-- quiz, and that ratio lives in exactly one place.
--
-- The column is dropped rather than left defaulted at 1 so nobody later
-- assumes a stored value is still honoured -- nothing reads or writes it.
-- Added by 20260806030000_standardized_grading.sql; add-then-drop replays
-- fine on a fresh database.

alter table public.quizzes drop column if exists weight;

-- admin_grading_quizzes was defined and granted but never called from app
-- code (lib/grading-server.ts only uses admin_grading_courses and
-- admin_grading_stats) -- dead RPC surface, dropped.
drop function if exists public.admin_grading_quizzes(uuid, text, int, int);

-- Adds a "ppt" lesson content type for Google Slides presentations.
-- Reuses the existing lessons.video_url column to store the Slides embed
-- link (video and ppt are mutually exclusive per lesson) -- no new column.
alter type public.lesson_content_type add value if not exists 'ppt';

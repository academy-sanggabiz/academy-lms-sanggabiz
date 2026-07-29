-- The app is IDR-only (lib/courses.ts formatPrice() already hardcodes "Rp"
-- / id-ID formatting and never read profiles.currency). The learner-facing
-- currency picker just changed a value nothing consumed, so it's removed.

alter table public.profiles drop column currency;

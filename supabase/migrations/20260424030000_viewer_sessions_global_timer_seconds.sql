alter table public.viewer_sessions
  add column global_timer_seconds integer not null default 10 check (global_timer_seconds between 1 and 120);

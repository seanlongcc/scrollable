alter table public.viewer_sessions
  add column if not exists template_slots jsonb not null default '[]'::jsonb;

alter table public.viewer_sessions
  drop constraint if exists viewer_sessions_template_slots_array_check,
  add constraint viewer_sessions_template_slots_array_check
    check (jsonb_typeof(template_slots) = 'array');

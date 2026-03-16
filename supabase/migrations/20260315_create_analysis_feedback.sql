create table if not exists public.analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  analysis_id bigint not null references public.health_reports (id) on delete cascade,
  was_helpful boolean not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analysis_feedback_profile_id_idx
  on public.analysis_feedback (profile_id, created_at desc);

create index if not exists analysis_feedback_analysis_id_idx
  on public.analysis_feedback (analysis_id);

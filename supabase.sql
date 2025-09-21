
-- Supabase schema for Vocabulary Game analytics

create table if not exists public.sessions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  grade int not null,
  started_at timestamptz not null default now()
);

create table if not exists public.answers (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id bigint references public.sessions(id) on delete set null,
  grade int not null,
  word text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create table if not exists public.question_stats (
  grade int not null,
  word text not null,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  last_answered timestamptz,
  primary key (grade, word)
);

create or replace function public.update_question_stats()
returns trigger language plpgsql as $$
begin
  if (new.is_correct) then
    update public.question_stats
      set correct_count = correct_count + 1, last_answered = now()
      where grade = new.grade and word = new.word;
  else
    update public.question_stats
      set wrong_count = wrong_count + 1, last_answered = now()
      where grade = new.grade and word = new.word;
  end if;

  if not found then
    insert into public.question_stats (grade, word, correct_count, wrong_count, last_answered)
    values (new.grade, new.word, case when new.is_correct then 1 else 0 end, case when new.is_correct then 0 else 1 end, now());
  end if;
  return new;
end $$;

drop trigger if exists trg_update_question_stats on public.answers;
create trigger trg_update_question_stats
after insert on public.answers
for each row execute function public.update_question_stats();

-- RLS
alter table public.sessions enable row level security;
alter table public.answers enable row level security;
alter table public.question_stats enable row level security;

create policy "sessions are manageable by owner" on public.sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "answers are manageable by owner" on public.answers
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Allow anyone (even anon) to read aggregated stats
create policy "stats readable by all" on public.question_stats
for select using (true);

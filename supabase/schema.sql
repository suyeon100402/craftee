-- Craftee 클라우드 동기화 설정
-- Supabase 대시보드 → SQL Editor → New query 에 이 파일 내용을 전부 붙여넣고 Run 을 누르세요.
-- 여러 번 실행해도 괜찮아요.

-- 1) 기록 표: 작품·진행 기록·재료·종류를 모두 한 표에 JSON으로 저장한다.
create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,              -- projects, progressLogs, materials, categories, materialTypes
  id text not null,
  data jsonb not null,             -- 앱의 기록 그대로
  updated_at bigint not null,      -- 기기에서 마지막으로 고친 시각(ms). 더 큰 쪽이 이긴다.
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, kind, id)
);

create index if not exists records_pull_idx on public.records (user_id, server_updated_at);

-- 2) 내 기록만 읽고 쓸 수 있게 한다.
alter table public.records enable row level security;

drop policy if exists "own records" on public.records;
create policy "own records" on public.records
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) 서버에 저장될 때마다 서버 시각을 찍는다(다른 기기가 '여기부터 받아 가기'에 쓴다).
create or replace function public.records_touch() returns trigger
language plpgsql as $$
begin
  new.server_updated_at = clock_timestamp();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
  for each row execute function public.records_touch();

-- 4) 올리기: 같은 기록이 이미 있으면 더 나중에 고친 쪽만 남긴다.
create or replace function public.push_records(rows jsonb) returns void
language sql security invoker as $$
  insert into public.records (user_id, kind, id, data, updated_at)
  select auth.uid(), r->>'kind', r->>'id', r->'data', (r->>'updated_at')::bigint
  from jsonb_array_elements(rows) as r
  on conflict (user_id, kind, id) do update
    set data = excluded.data, updated_at = excluded.updated_at
    where public.records.updated_at < excluded.updated_at;
$$;

-- 5) 사진 보관함(비공개). 각자 자기 폴더(<사용자 id>/...)에만 접근할 수 있다.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "own photos read" on storage.objects;
create policy "own photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos write" on storage.objects;
create policy "own photos write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos update" on storage.objects;
create policy "own photos update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

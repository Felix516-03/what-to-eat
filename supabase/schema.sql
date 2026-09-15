-- What to eat · 饭圈儿 MVP
-- 在 Supabase Dashboard > SQL Editor 中整段执行。
-- 执行前请在 Authentication > Sign In / Providers 中启用 Anonymous。

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 30),
  avatar_url text null,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null constraint posts_user_id_fkey references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  post_type text not null check (post_type in ('ask', 'recommend', 'warning', 'chat')),
  shop_name text null,
  shop_location text null,
  shop_category text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null constraint comments_post_id_fkey references public.posts(id) on delete cascade,
  user_id uuid not null constraint comments_user_id_fkey references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 300),
  recommended_shop_name text null,
  recommended_shop_location text null,
  recommended_shop_category text null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null constraint post_likes_post_id_fkey references public.posts(id) on delete cascade,
  user_id uuid not null constraint post_likes_user_id_fkey references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null constraint reports_reporter_id_fkey references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_post_type_created_at_idx on public.posts (post_type, created_at desc);
create index if not exists comments_post_id_created_at_idx on public.comments (post_id, created_at);
create index if not exists post_likes_post_id_idx on public.post_likes (post_id);
create index if not exists reports_status_created_at_idx on public.reports (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.reports enable row level security;

drop policy if exists "authenticated users can read profiles" on public.profiles;
create policy "authenticated users can read profiles"
on public.profiles for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "users can create own profile" on public.profiles;
create policy "users can create own profile"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "authenticated users can read posts" on public.posts;
create policy "authenticated users can read posts"
on public.posts for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "users can create own posts" on public.posts;
create policy "users can create own posts"
on public.posts for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users can update own posts" on public.posts;
create policy "users can update own posts"
on public.posts for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "users can delete own posts" on public.posts;
create policy "users can delete own posts"
on public.posts for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "authenticated users can read comments" on public.comments;
create policy "authenticated users can read comments"
on public.comments for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "users can create own comments" on public.comments;
create policy "users can create own comments"
on public.comments for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users can delete own comments" on public.comments;
create policy "users can delete own comments"
on public.comments for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "authenticated users can read likes" on public.post_likes;
create policy "authenticated users can read likes"
on public.post_likes for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "users can create own likes" on public.post_likes;
create policy "users can create own likes"
on public.post_likes for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users can delete own likes" on public.post_likes;
create policy "users can delete own likes"
on public.post_likes for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users can create own reports" on public.reports;
create policy "users can create own reports"
on public.reports for insert to authenticated
with check (reporter_id = (select auth.uid()));

drop policy if exists "users can read own reports" on public.reports;
create policy "users can read own reports"
on public.reports for select to authenticated
using (reporter_id = (select auth.uid()));

-- 帖子流：一条 RPC 同时取得作者、点赞数、评论数和当前用户点赞状态，避免 N+1。
create or replace function public.circle_posts_feed(
  p_post_type text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  content text,
  post_type text,
  shop_name text,
  shop_location text,
  shop_category text,
  created_at timestamptz,
  updated_at timestamptz,
  nickname text,
  avatar_url text,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.user_id,
    p.content,
    p.post_type,
    p.shop_name,
    p.shop_location,
    p.shop_category,
    p.created_at,
    p.updated_at,
    pr.nickname,
    pr.avatar_url,
    (select count(*) from public.post_likes pl where pl.post_id = p.id) as like_count,
    (select count(*) from public.comments c where c.post_id = p.id) as comment_count,
    exists (
      select 1 from public.post_likes mine
      where mine.post_id = p.id and mine.user_id = auth.uid()
    ) as liked_by_me
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p_post_type is null or p.post_type = p_post_type
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.circle_post_detail(p_post_id uuid)
returns table (
  id uuid,
  user_id uuid,
  content text,
  post_type text,
  shop_name text,
  shop_location text,
  shop_category text,
  created_at timestamptz,
  updated_at timestamptz,
  nickname text,
  avatar_url text,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.user_id,
    p.content,
    p.post_type,
    p.shop_name,
    p.shop_location,
    p.shop_category,
    p.created_at,
    p.updated_at,
    pr.nickname,
    pr.avatar_url,
    (select count(*) from public.post_likes pl where pl.post_id = p.id),
    (select count(*) from public.comments c where c.post_id = p.id),
    exists (
      select 1 from public.post_likes mine
      where mine.post_id = p.id and mine.user_id = auth.uid()
    )
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.id = p_post_id;
$$;

-- 原子切换点赞；user_id 始终取 auth.uid()，客户端无法替别人操作。
create or replace function public.toggle_post_like(p_post_id uuid)
returns table (liked boolean, like_count bigint)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if exists (
    select 1 from public.post_likes
    where post_id = p_post_id and user_id = auth.uid()
  ) then
    delete from public.post_likes
    where post_id = p_post_id and user_id = auth.uid();
    return query
      select false, count(*) from public.post_likes where post_id = p_post_id;
  else
    insert into public.post_likes (post_id, user_id)
    values (p_post_id, auth.uid())
    on conflict (post_id, user_id) do nothing;
    return query
      select true, count(*) from public.post_likes where post_id = p_post_id;
  end if;
end;
$$;

revoke all on function public.circle_posts_feed(text, integer, integer) from public;
revoke all on function public.circle_post_detail(uuid) from public;
revoke all on function public.toggle_post_like(uuid) from public;
grant execute on function public.circle_posts_feed(text, integer, integer) to authenticated;
grant execute on function public.circle_post_detail(uuid) to authenticated;
grant execute on function public.toggle_post_like(uuid) to authenticated;

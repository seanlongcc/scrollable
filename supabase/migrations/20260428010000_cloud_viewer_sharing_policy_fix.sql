drop policy if exists "share links public read" on public.share_links;

create policy "share links public read" on public.share_links
  for select using (
    is_enabled
    and (
      (
        feed_config_id is not null
        and exists (
          select 1 from public.feed_configs fc
          where fc.id = feed_config_id
            and (not fc.is_nsfw or auth.uid() is not null)
        )
      )
      or (
        collection_id is not null
        and exists (
          select 1 from public.collections c
          where c.id = collection_id
            and (not c.is_nsfw or auth.uid() is not null)
        )
      )
      or viewer_session_id is not null
      or viewer_template_id is not null
    )
  );

create or replace function public.collection_is_shared(collection_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.share_links sl
    join public.collections c on c.id = sl.collection_id
    where sl.collection_id = collection_uuid
      and sl.is_enabled
      and (not c.is_nsfw or auth.uid() is not null)
  );
$$;

create or replace function public.feed_config_is_shared(config_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.share_links sl
    join public.feed_configs fc on fc.id = sl.feed_config_id
    where sl.feed_config_id = config_uuid
      and sl.is_enabled
      and (not fc.is_nsfw or auth.uid() is not null)
  )
  or exists (
    select 1
    from public.collection_items ci
    join public.feed_configs fc on fc.id = ci.feed_config_id
    where ci.feed_config_id = config_uuid
      and public.collection_is_shared(ci.collection_id)
      and (not fc.is_nsfw or auth.uid() is not null)
  );
$$;

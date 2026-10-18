begin;

create schema if not exists photo_private;
revoke all on schema photo_private from public, anon, authenticated;

create table photo_private.settings (
  singleton boolean primary key default true check (singleton),
  uploads_enabled boolean not null default false
);
insert into photo_private.settings (singleton) values (true);

create table photo_private.albums (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 80),
  invite_hash text not null unique check (invite_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'active' check (state in ('active', 'deleting')),
  created_at timestamptz not null default now()
);

create table photo_private.members (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references photo_private.albums(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (album_id, user_id),
  unique (album_id, id, user_id)
);
create index members_user_idx on photo_private.members(user_id);

create table photo_private.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references photo_private.albums(id) on delete cascade,
  member_id uuid not null,
  owner_id uuid not null references auth.users(id),
  filename text not null check (octet_length(filename) between 1 and 255),
  bytes bigint not null check (bytes between 1 and 40000000),
  reserved_bytes bigint generated always as (bytes + 200000) stored,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  content_type text not null check (content_type in (
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'
  )),
  declared_content_type text not null check (declared_content_type in (
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'
  )),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  status text not null default 'reserved' check (status in ('reserved', 'uploading', 'ready', 'cleanupRequired')),
  object_path text unique,
  preview_path text unique,
  preview_bytes bigint not null default 0 check (preview_bytes between 0 and 200000),
  preview_sha256 text check (preview_sha256 ~ '^[0-9a-f]{64}$'),
  preview_type text check (preview_type in ('image/jpeg', 'image/png')),
  preview_status text not null default 'none' check (preview_status in ('none', 'uploading', 'ready', 'cleanupRequired')),
  operation text check (operation in ('original', 'preview', 'delete')),
  claim uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  foreign key (album_id, member_id, owner_id) references photo_private.members(album_id, id, user_id),
  unique (album_id, owner_id, idempotency_key)
);
create index photos_album_idx on photo_private.photos(album_id);
create index photos_member_idx on photo_private.photos(member_id);

create table photo_private.rate_windows (
  subject text not null,
  scope text not null,
  window_start bigint not null,
  requests integer not null,
  primary key (subject, scope)
);

create table photo_private.download_usage (
  month date primary key,
  charged_bytes bigint not null default 0 check (charged_bytes between 0 and 4000000000)
);

create table photo_private.download_days (
  day date primary key,
  charged_bytes bigint not null default 0 check (charged_bytes between 0 and 4000000000)
);

alter table photo_private.settings enable row level security;
alter table photo_private.albums enable row level security;
alter table photo_private.members enable row level security;
alter table photo_private.photos enable row level security;
alter table photo_private.rate_windows enable row level security;
alter table photo_private.download_usage enable row level security;
alter table photo_private.download_days enable row level security;
revoke all on all tables in schema photo_private from public, anon, authenticated;
alter default privileges in schema photo_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema photo_private revoke execute on functions from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 40000000,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']);

create function photo_private.limits()
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'fileBytes', 40000000, 'previewBytes', 200000,
    'projectBytes', 900000000, 'albumBytes', 500000000,
    'photosPerAlbum', 50, 'albumsPerProject', 20, 'membersPerAlbum', 250,
    'monthlyDownloadBudget', 4000000000, 'downloadChargeMultiplier', 2,
    'previewMaxDimension', 1600, 'simultaneousBinaryUploads', 1,
    'maxBytes', 500000000, 'maxPhotos', 50, 'maxFileBytes', 40000000
  );
$$;

create function photo_private.album_json(album photo_private.albums, actor uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', album.id, 'title', album.title, 'createdAt', album.created_at,
    'state', album.state, 'isCreator', album.creator_id = actor,
    'myMemberId', (select member.id from photo_private.members member
      where member.album_id = album.id and member.user_id = actor and member.revoked_at is null),
    'creatorMemberId', (select member.id from photo_private.members member
      where member.album_id = album.id and member.user_id = album.creator_id),
    'photoCount', (select count(*) from photo_private.photos photo where photo.album_id = album.id and photo.status = 'ready'),
    'totalPhotoCount', (select count(*) from photo_private.photos photo where photo.album_id = album.id),
    'bytes', (select coalesce(sum(photo.bytes), 0) from photo_private.photos photo where photo.album_id = album.id and photo.status = 'ready'),
    'reservedBytes', (select coalesce(sum(photo.reserved_bytes), 0) from photo_private.photos photo where photo.album_id = album.id)
  );
$$;

create function photo_private.member_json(member photo_private.members)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', member.id, 'displayName', member.display_name, 'userId', member.user_id);
$$;

create function photo_private.photo_json(photo photo_private.photos)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', photo.id, 'albumId', photo.album_id, 'memberId', photo.member_id,
    'filename', photo.filename, 'bytes', photo.bytes, 'sha256', photo.sha256,
    'contentType', photo.content_type, 'status', photo.status, 'createdAt', photo.created_at,
    'needsCleanup', photo.status = 'cleanupRequired' or photo.preview_status = 'cleanupRequired',
    'preview', case when photo.preview_status = 'ready' then
      jsonb_build_object('bytes', photo.preview_bytes, 'contentType', photo.preview_type) else null end
  );
$$;

create function photo_private.object_matches(object_name text, expected_bytes bigint, expected_sha text, expected_type text)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from storage.objects stored
    where stored.bucket_id = 'trip-photos' and stored.name = object_name
      and stored.metadata ->> 'size' = expected_bytes::text
      and stored.metadata ->> 'mimetype' = expected_type
      and to_jsonb(stored) -> 'user_metadata' ->> 'sha256' = expected_sha
  );
$$;

create function public.trip_photos_rate(p_subject text, p_scope text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  period_seconds integer;
  request_limit integer;
  epoch_now bigint := floor(extract(epoch from clock_timestamp()));
  bucket_start bigint;
  current_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise sqlstate 'PT403' using message = 'AccessDenied';
  end if;
  if p_subject !~ '^(public|[0-9a-f-]{36})$' then
    raise sqlstate 'PT400' using message = 'InvalidRequest';
  end if;
  case p_scope
    when 'inspect' then period_seconds := 60; request_limit := 60;
    when 'request' then period_seconds := 60; request_limit := 120;
    when 'create' then period_seconds := 3600; request_limit := 3;
    when 'join' then period_seconds := 3600; request_limit := 30;
    when 'reserve' then period_seconds := 3600; request_limit := 60;
    when 'binary' then period_seconds := 3600; request_limit := 120;
    else raise sqlstate 'PT400' using message = 'InvalidRequest';
  end case;
  bucket_start := epoch_now / period_seconds * period_seconds;
  insert into photo_private.rate_windows as counter (subject, scope, window_start, requests)
  values (p_subject, p_scope, bucket_start, 1)
  on conflict (subject, scope) do update set
    window_start = excluded.window_start,
    requests = case when counter.window_start = excluded.window_start then least(counter.requests + 1, request_limit + 1) else 1 end
  returning requests into current_count;
  return jsonb_build_object('allowed', current_count <= request_limit,
    'retryAfter', bucket_start + period_seconds - epoch_now);
end;
$$;

create function public.trip_photos(p_action text, p_actor uuid default null, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  album_row photo_private.albums%rowtype;
  member_row photo_private.members%rowtype;
  photo_row photo_private.photos%rowtype;
  total_bytes bigint;
  total_photos bigint;
  object_name text;
  extension text;
  kind text;
  charge bigint;
  charged bigint;
  billing_month date := date_trunc('month', now() at time zone 'UTC')::date;
  billing_day date := (now() at time zone 'UTC')::date;
  response jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise sqlstate 'PT403' using message = 'AccessDenied';
  end if;
  if p_action = 'health' then
    return jsonb_build_object(
      'ready', (select uploads_enabled from photo_private.settings) and
        exists(select 1 from storage.buckets where id = 'trip-photos' and not public),
      'uploadsEnabled', (select uploads_enabled from photo_private.settings),
      'configuration', jsonb_build_object('schemaVersion', 1,
        'privateStorage', exists(select 1 from storage.buckets where id = 'trip-photos' and not public),
        'verifiedIdentity', false, 'authorization', 'server-verified-auth'),
      'limits', photo_private.limits());
  end if;
  if p_action = 'inspect' then
    select * into album_row from photo_private.albums where invite_hash = p_payload ->> 'inviteHash' and state = 'active';
    if not found then raise sqlstate 'PT404' using message = 'InviteNotFound'; end if;
    return jsonb_build_object('albumId', album_row.id, 'title', album_row.title, 'limits', photo_private.limits());
  end if;
  if p_actor is null or not exists(select 1 from auth.users where id = p_actor) then
    raise sqlstate 'PT401' using message = 'AuthenticationRequired';
  end if;

  perform pg_advisory_xact_lock(202610190001);

  if p_action = 'create_album' then
    if (select count(*) from photo_private.albums) >= 20 then
      raise sqlstate 'PT507' using message = 'AlbumLimit';
    end if;
    insert into photo_private.albums (creator_id, title, invite_hash)
      values (p_actor, p_payload ->> 'title', p_payload ->> 'inviteHash') returning * into album_row;
    insert into photo_private.members (album_id, user_id, display_name)
      values (album_row.id, p_actor, p_payload ->> 'displayName') returning * into member_row;
    return jsonb_build_object('album', photo_private.album_json(album_row, p_actor), 'member', photo_private.member_json(member_row));
  end if;
  if p_action = 'list_albums' then
    return jsonb_build_object('albums', coalesce((select jsonb_agg(photo_private.album_json(album, p_actor) order by album.created_at desc)
      from photo_private.albums album join photo_private.members member on member.album_id = album.id
      where member.user_id = p_actor and member.revoked_at is null
        and (album.state = 'active' or album.creator_id = p_actor)), '[]'::jsonb));
  end if;
  if p_action = 'join_album' then
    select * into album_row from photo_private.albums where invite_hash = p_payload ->> 'inviteHash' and state = 'active';
    if not found then raise sqlstate 'PT404' using message = 'InviteNotFound'; end if;
    select * into member_row from photo_private.members where album_id = album_row.id and user_id = p_actor;
    if found and member_row.revoked_at is not null then raise sqlstate 'PT403' using message = 'MembershipRemoved'; end if;
    if not found then
      if (select count(*) from photo_private.members where album_id = album_row.id) >= 250 then
        raise sqlstate 'PT507' using message = 'MemberLimit';
      end if;
      insert into photo_private.members (album_id, user_id, display_name)
        values (album_row.id, p_actor, p_payload ->> 'displayName') returning * into member_row;
    end if;
    return jsonb_build_object('album', photo_private.album_json(album_row, p_actor), 'member', photo_private.member_json(member_row));
  end if;

  if p_payload ? 'photoId' then
    select * into photo_row from photo_private.photos where id = (p_payload ->> 'photoId')::uuid;
    if not found then raise sqlstate 'PT404' using message = 'PhotoNotFound'; end if;
    select * into album_row from photo_private.albums where id = photo_row.album_id;
  else
    select * into album_row from photo_private.albums where id = (p_payload ->> 'albumId')::uuid;
  end if;
  if not found then raise sqlstate 'PT404' using message = 'AlbumNotFound'; end if;
  select * into member_row from photo_private.members
    where album_id = album_row.id and user_id = p_actor and revoked_at is null;
  if not found then raise sqlstate 'PT403' using message = 'AccessDenied'; end if;
  if album_row.state <> 'active' and not (album_row.creator_id = p_actor and p_action in ('get_album', 'close_album', 'finish_album_delete')) then
    raise sqlstate 'PT403' using message = 'AlbumClosed';
  end if;

  if p_action = 'get_album' then
    return jsonb_build_object('album', photo_private.album_json(album_row, p_actor),
      'member', photo_private.member_json(member_row), 'limits', photo_private.limits(),
      'members', coalesce((select jsonb_agg(jsonb_build_object(
        'id', member.id, 'displayName', member.display_name, 'removed', member.revoked_at is not null,
        'photoCount', (select count(*) from photo_private.photos photo where photo.member_id = member.id and photo.status = 'ready'),
        'bytes', (select coalesce(sum(photo.bytes), 0) from photo_private.photos photo where photo.member_id = member.id and photo.status = 'ready')
      ) order by member.created_at) from photo_private.members member where member.album_id = album_row.id), '[]'::jsonb),
      'readyPhotos', coalesce((select jsonb_agg(photo_private.photo_json(photo) order by photo.created_at desc)
        from photo_private.photos photo where photo.album_id = album_row.id and photo.status = 'ready'), '[]'::jsonb),
      'pendingUploads', coalesce((select jsonb_agg(photo_private.photo_json(photo) order by photo.created_at)
        from photo_private.photos photo where photo.album_id = album_row.id and photo.owner_id = p_actor
          and (photo.status <> 'ready' or photo.preview_status = 'cleanupRequired' or photo.operation is not null)), '[]'::jsonb));
  end if;
  if p_action = 'rotate_invite' then
    if album_row.creator_id <> p_actor then raise sqlstate 'PT403' using message = 'AccessDenied'; end if;
    update photo_private.albums set invite_hash = p_payload ->> 'inviteHash' where id = album_row.id;
    return jsonb_build_object('rotated', true);
  end if;
  if p_action = 'remove_member' then
    if album_row.creator_id <> p_actor then raise sqlstate 'PT403' using message = 'AccessDenied'; end if;
    update photo_private.members set revoked_at = coalesce(revoked_at, now())
      where album_id = album_row.id and id = (p_payload ->> 'memberId')::uuid and user_id <> album_row.creator_id;
    if not found then raise sqlstate 'PT404' using message = 'MemberNotFound'; end if;
    return jsonb_build_object('removed', true);
  end if;
  if p_action in ('close_album', 'finish_album_delete') then
    if album_row.creator_id <> p_actor then raise sqlstate 'PT403' using message = 'AccessDenied'; end if;
    if exists(select 1 from photo_private.photos where album_id = album_row.id and lease_until > now()) then
      raise sqlstate 'PT409' using message = 'UploadInProgress';
    end if;
    if p_action = 'close_album' then
      update photo_private.albums set state = 'deleting' where id = album_row.id;
      return jsonb_build_object('paths', coalesce((select jsonb_agg(stored.name) from storage.objects stored
        where stored.bucket_id = 'trip-photos' and starts_with(stored.name, album_row.id::text || '/')), '[]'::jsonb));
    end if;
    if album_row.state <> 'deleting' or exists(select 1 from storage.objects stored
      where stored.bucket_id = 'trip-photos' and starts_with(stored.name, album_row.id::text || '/')) then
      raise sqlstate 'PT409' using message = 'CleanupRequired';
    end if;
    delete from photo_private.photos where album_id = album_row.id;
    delete from photo_private.albums where id = album_row.id;
    return jsonb_build_object('deleted', true);
  end if;
  if p_action = 'reserve' then
    if not (select uploads_enabled from photo_private.settings) or not exists(
      select 1 from storage.buckets where id = 'trip-photos' and not public) then
      raise sqlstate 'PT503' using message = 'UploadsDisabled';
    end if;
    select * into photo_row from photo_private.photos
      where album_id = album_row.id and owner_id = p_actor and idempotency_key = p_payload ->> 'idempotencyKey';
    if found then
      if photo_row.bytes <> (p_payload ->> 'bytes')::bigint or photo_row.sha256 <> p_payload ->> 'sha256'
        or photo_row.filename <> p_payload ->> 'filename' or photo_row.declared_content_type <> p_payload ->> 'contentType' then
        raise sqlstate 'PT409' using message = 'IdempotencyConflict';
      end if;
      return jsonb_build_object('upload', photo_private.photo_json(photo_row));
    end if;
    if (p_payload ->> 'bytes')::bigint not between 1 and 40000000 then
      raise sqlstate 'PT413' using message = 'FileTooLarge';
    end if;
    select coalesce(sum(reserved_bytes), 0), count(*) into total_bytes, total_photos
      from photo_private.photos where album_id = album_row.id;
    if total_photos >= 50 then raise sqlstate 'PT507' using message = 'PhotoLimit'; end if;
    if total_bytes + (p_payload ->> 'bytes')::bigint + 200000 > 500000000 then
      raise sqlstate 'PT507' using message = 'AlbumFull';
    end if;
    if (select coalesce(sum(reserved_bytes), 0) from photo_private.photos) + (p_payload ->> 'bytes')::bigint + 200000 > 900000000 then
      raise sqlstate 'PT507' using message = 'StorageFull';
    end if;
    insert into photo_private.photos (album_id, member_id, owner_id, filename, bytes, sha256, content_type, declared_content_type, idempotency_key)
      values (album_row.id, member_row.id, p_actor, p_payload ->> 'filename', (p_payload ->> 'bytes')::bigint,
        p_payload ->> 'sha256', p_payload ->> 'contentType', p_payload ->> 'contentType', p_payload ->> 'idempotencyKey') returning * into photo_row;
    return jsonb_build_object('upload', photo_private.photo_json(photo_row));
  end if;
  if p_action = 'download' then
    if photo_row.status <> 'ready' then raise sqlstate 'PT409' using message = 'UploadNotReady'; end if;
    if p_payload ->> 'kind' = 'preview' then
      if photo_row.preview_status <> 'ready' then raise sqlstate 'PT404' using message = 'PreviewNotFound'; end if;
      if not photo_private.object_matches(photo_row.preview_path, photo_row.preview_bytes, photo_row.preview_sha256, photo_row.preview_type) then
        raise sqlstate 'PT409' using message = 'CleanupRequired';
      end if;
      object_name := photo_row.preview_path;
      charge := photo_row.preview_bytes * 2;
      response := jsonb_build_object('path', object_name, 'bytes', photo_row.preview_bytes,
        'contentType', photo_row.preview_type, 'filename', photo_row.filename);
    else
      if not photo_private.object_matches(photo_row.object_path, photo_row.bytes, photo_row.sha256, photo_row.content_type) then
        raise sqlstate 'PT409' using message = 'CleanupRequired';
      end if;
      object_name := photo_row.object_path;
      charge := photo_row.bytes * 2;
      response := jsonb_build_object('path', object_name, 'bytes', photo_row.bytes,
        'contentType', photo_row.content_type, 'filename', photo_row.filename);
    end if;
    if object_name is null or not exists(select 1 from storage.objects where bucket_id = 'trip-photos' and name = object_name) then
      raise sqlstate 'PT409' using message = 'CleanupRequired';
    end if;
    insert into photo_private.download_usage (month) values (billing_month) on conflict do nothing;
    select charged_bytes into charged from photo_private.download_usage where month = billing_month for update;
    if charged + charge > 4000000000 then raise sqlstate 'PT429' using message = 'DownloadBudgetExceeded'; end if;
    if (select coalesce(sum(charged_bytes), 0) from photo_private.download_days where day >= billing_day - 31) + charge > 4000000000 then
      raise sqlstate 'PT429' using message = 'DownloadBudgetExceeded';
    end if;
    insert into photo_private.download_days (day, charged_bytes) values (billing_day, charge)
      on conflict (day) do update set charged_bytes = photo_private.download_days.charged_bytes + excluded.charged_bytes;
    update photo_private.download_usage set charged_bytes = charged_bytes + charge where month = billing_month;
    return response;
  end if;

  if photo_row.id is null then raise sqlstate 'PT400' using message = 'InvalidRequest'; end if;
  if photo_row.owner_id <> p_actor and not (album_row.creator_id = p_actor and p_action in ('prepare_delete', 'finish_delete')) then
    raise sqlstate 'PT403' using message = 'AccessDenied';
  end if;
  if p_action = 'get_upload' then
    if photo_row.status = 'ready' and not photo_private.object_matches(photo_row.object_path, photo_row.bytes, photo_row.sha256, photo_row.content_type) then
      update photo_private.photos set status = 'cleanupRequired' where id = photo_row.id returning * into photo_row;
    end if;
    if photo_row.preview_status = 'ready' and not photo_private.object_matches(photo_row.preview_path, photo_row.preview_bytes, photo_row.preview_sha256, photo_row.preview_type) then
      update photo_private.photos set preview_status = 'cleanupRequired' where id = photo_row.id returning * into photo_row;
    end if;
    if photo_row.operation = 'original' and photo_private.object_matches(photo_row.object_path, photo_row.bytes, photo_row.sha256, photo_row.content_type) then
      update photo_private.photos set status = 'ready', operation = null, claim = null, lease_until = null
        where id = photo_row.id returning * into photo_row;
    elsif photo_row.operation = 'preview' and photo_private.object_matches(photo_row.preview_path, photo_row.preview_bytes, photo_row.preview_sha256, photo_row.preview_type) then
      update photo_private.photos set preview_status = 'ready', operation = null, claim = null, lease_until = null
        where id = photo_row.id returning * into photo_row;
    elsif photo_row.lease_until < now() and photo_row.operation is not null then
      update photo_private.photos set
        status = case when operation in ('original', 'delete') then 'cleanupRequired' else status end,
        preview_status = case when operation = 'preview' then 'cleanupRequired' else preview_status end
        where id = photo_row.id returning * into photo_row;
    end if;
    return jsonb_build_object('upload', photo_private.photo_json(photo_row));
  end if;
  if p_action in ('begin_original', 'begin_preview') then
    if not (select uploads_enabled from photo_private.settings) or not exists(
      select 1 from storage.buckets where id = 'trip-photos' and not public) then
      raise sqlstate 'PT503' using message = 'UploadsDisabled';
    end if;
    kind := case when p_action = 'begin_original' then 'original' else 'preview' end;
    if kind = 'original' and photo_row.status = 'ready' then
      return jsonb_build_object('upload', photo_private.photo_json(photo_row), 'complete', true);
    end if;
    if kind = 'preview' and photo_row.preview_status = 'ready' then
      if photo_row.preview_sha256 <> p_payload ->> 'sha256' then raise sqlstate 'PT409' using message = 'PreviewAlreadyExists'; end if;
      return jsonb_build_object('upload', photo_private.photo_json(photo_row), 'complete', true);
    end if;
    if photo_row.operation is not null or (kind = 'original' and photo_row.status <> 'reserved')
      or (kind = 'preview' and (photo_row.status <> 'ready' or photo_row.preview_status <> 'none')) then
      raise sqlstate 'PT409' using message = 'ReconcileUploadFirst';
    end if;
    if exists(select 1 from photo_private.photos where operation in ('original', 'preview') and lease_until > now()) then
      raise sqlstate 'PT429' using message = 'UploadBusy';
    end if;
    update photo_private.photos set operation = kind, claim = gen_random_uuid(), lease_until = now() + interval '10 minutes',
      status = case when kind = 'original' then 'uploading' else status end,
      preview_status = case when kind = 'preview' then 'uploading' else preview_status end,
      preview_sha256 = case when kind = 'preview' then p_payload ->> 'sha256' else preview_sha256 end
      where id = photo_row.id returning * into photo_row;
    return jsonb_build_object('upload', photo_private.photo_json(photo_row), 'claim', photo_row.claim, 'complete', false);
  end if;
  if p_action = 'prepare_delete' then
    if photo_row.lease_until > now() then raise sqlstate 'PT409' using message = 'UploadInProgress'; end if;
    update photo_private.photos set status = 'cleanupRequired', operation = 'delete', claim = gen_random_uuid(),
      lease_until = now() + interval '10 minutes' where id = photo_row.id returning * into photo_row;
    return jsonb_build_object('claim', photo_row.claim,
      'paths', to_jsonb(array_remove(array[photo_row.object_path, photo_row.preview_path], null)));
  end if;
  if photo_row.claim is null or photo_row.claim <> (p_payload ->> 'claim')::uuid then
    raise sqlstate 'PT409' using message = 'OperationConflict';
  end if;
  if p_action = 'finish_delete' then
    if photo_row.operation <> 'delete' or exists(select 1 from storage.objects stored
      where stored.bucket_id = 'trip-photos' and stored.name in (photo_row.object_path, photo_row.preview_path)) then
      raise sqlstate 'PT409' using message = 'CleanupRequired';
    end if;
    delete from photo_private.photos where id = photo_row.id;
    return jsonb_build_object('deleted', true);
  end if;
  if p_action = 'abort_unwritten' then
    if photo_row.operation = 'original' and photo_row.object_path is null then
      update photo_private.photos set status = 'reserved', operation = null, claim = null, lease_until = null where id = photo_row.id;
    elsif photo_row.operation = 'preview' and photo_row.preview_path is null then
      update photo_private.photos set preview_status = 'none', preview_sha256 = null, operation = null, claim = null, lease_until = null where id = photo_row.id;
    end if;
    return jsonb_build_object('retainedReservation', true);
  end if;
  if p_action = 'mark_uncertain' then
    update photo_private.photos set
      status = case when operation = 'original' then 'cleanupRequired' else status end,
      preview_status = case when operation = 'preview' then 'cleanupRequired' else preview_status end
      where id = photo_row.id;
    return jsonb_build_object('retainedReservation', true);
  end if;
  if p_action in ('stage_original', 'stage_preview') then
    kind := case when p_action = 'stage_original' then 'original' else 'preview' end;
    if photo_row.operation <> kind or photo_row.lease_until <= now() then
      raise sqlstate 'PT409' using message = 'OperationConflict';
    end if;
    extension := case p_payload ->> 'contentType'
      when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp'
      when 'image/heic' then 'heic' when 'image/heif' then 'heif' when 'image/avif' then 'avif' else null end;
    if extension is null or (kind = 'preview' and extension not in ('jpg', 'png')) then
      raise sqlstate 'PT415' using message = 'UnsupportedImage';
    end if;
    object_name := photo_row.album_id::text || '/' || photo_row.member_id::text || '/' || photo_row.id::text ||
      case when kind = 'preview' then '.preview.' else '.' end || extension;
    if kind = 'original' then
      if photo_row.object_path is not null or (p_payload ->> 'bytes')::bigint <> photo_row.bytes or p_payload ->> 'sha256' <> photo_row.sha256 then
        raise sqlstate 'PT409' using message = 'OperationConflict';
      end if;
      update photo_private.photos set object_path = object_name, content_type = p_payload ->> 'contentType' where id = photo_row.id;
    else
      if photo_row.preview_path is not null or (p_payload ->> 'bytes')::bigint not between 1 and 200000 or p_payload ->> 'sha256' <> photo_row.preview_sha256 then
        raise sqlstate 'PT409' using message = 'OperationConflict';
      end if;
      update photo_private.photos set preview_path = object_name, preview_bytes = (p_payload ->> 'bytes')::bigint,
        preview_type = p_payload ->> 'contentType' where id = photo_row.id;
    end if;
    return jsonb_build_object('path', object_name);
  end if;
  if p_action = 'finish_original' and photo_row.operation = 'original' then
    if not photo_private.object_matches(photo_row.object_path, photo_row.bytes, photo_row.sha256, photo_row.content_type) then
      raise sqlstate 'PT409' using message = 'CleanupRequired';
    end if;
    update photo_private.photos set status = 'ready', operation = null, claim = null, lease_until = null
      where id = photo_row.id returning * into photo_row;
    return jsonb_build_object('upload', photo_private.photo_json(photo_row));
  end if;
  if p_action = 'finish_preview' and photo_row.operation = 'preview' then
    if not photo_private.object_matches(photo_row.preview_path, photo_row.preview_bytes, photo_row.preview_sha256, photo_row.preview_type) then
      raise sqlstate 'PT409' using message = 'CleanupRequired';
    end if;
    update photo_private.photos set preview_status = 'ready', operation = null, claim = null, lease_until = null
      where id = photo_row.id returning * into photo_row;
    return jsonb_build_object('upload', photo_private.photo_json(photo_row));
  end if;
  raise sqlstate 'PT400' using message = 'InvalidRequest';
exception
  when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then
    raise sqlstate 'PT400' using message = 'InvalidRequest';
  when unique_violation then
    raise sqlstate 'PT409' using message = 'Conflict';
end;
$$;

revoke all on all functions in schema photo_private from public, anon, authenticated;
revoke all on function public.trip_photos(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.trip_photos_rate(text, text) from public, anon, authenticated;
grant execute on function public.trip_photos(text, uuid, jsonb) to service_role;
grant execute on function public.trip_photos_rate(text, text) to service_role;

commit;
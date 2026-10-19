begin;
set local lock_timeout = '10s';
set local statement_timeout = '30s';

do $$
declare
  previous_limits jsonb := jsonb_build_object(
    'fileBytes', 40000000, 'previewBytes', 200000,
    'projectBytes', 900000000, 'albumBytes', 500000000,
    'photosPerAlbum', 50, 'albumsPerProject', 20, 'membersPerAlbum', 250,
    'monthlyDownloadBudget', 4000000000, 'downloadChargeMultiplier', 2,
    'previewMaxDimension', 1600, 'simultaneousBinaryUploads', 1,
    'maxBytes', 500000000, 'maxPhotos', 50, 'maxFileBytes', 40000000
  );
  updated_limits jsonb;
  current_limits jsonb;
  limits_definition text;
  rpc_definition text;
  already_updated boolean;
begin
  perform pg_advisory_xact_lock(202610190001);
  updated_limits := previous_limits || jsonb_build_object(
    'albumBytes', 800000000, 'photosPerAlbum', 500,
    'maxBytes', 800000000, 'maxPhotos', 500
  );
  current_limits := photo_private.limits();
  limits_definition := pg_get_functiondef('photo_private.limits()'::regprocedure);
  rpc_definition := pg_get_functiondef('public.trip_photos(text,uuid,jsonb)'::regprocedure);
  already_updated := current_limits = updated_limits;

  if already_updated then
    if position('if total_photos >= 500 then' in rpc_definition) = 0
        or position('+ 200000 > 800000000 then' in rpc_definition) = 0 then
      raise exception 'UnexpectedPhotoQuotaDefinition';
    end if;
    limits_definition := replace(replace(replace(limits_definition,
      '800000000', '500000000'),
      '''photosPerAlbum'', 500,', '''photosPerAlbum'', 50,'),
      '''maxPhotos'', 500,', '''maxPhotos'', 50,');
    rpc_definition := replace(replace(rpc_definition,
      'if total_photos >= 500 then', 'if total_photos >= 50 then'),
      '+ 200000 > 800000000 then', '+ 200000 > 500000000 then');
  elsif current_limits is distinct from previous_limits then
    raise exception 'UnexpectedPhotoQuotaConfiguration';
  end if;

  if md5(limits_definition) <> 'ca9ab4f2ad6577e61b91084f1d3574de'
      or md5(rpc_definition) <> '2f435bcc1643aea726244b64aaac803a' then
    raise exception 'UnexpectedPhotoQuotaDefinition';
  end if;
  if already_updated then return; end if;

  execute replace(replace(replace(limits_definition,
    '500000000', '800000000'),
    '''photosPerAlbum'', 50,', '''photosPerAlbum'', 500,'),
    '''maxPhotos'', 50,', '''maxPhotos'', 500,');
  execute replace(replace(rpc_definition,
    'if total_photos >= 50 then', 'if total_photos >= 500 then'),
    '+ 200000 > 500000000 then', '+ 200000 > 800000000 then');

  execute 'select photo_private.limits()' into current_limits;
  if current_limits is distinct from updated_limits then
    raise exception 'PhotoQuotaUpdateMismatch';
  end if;
end;
$$;

commit;
begin;

create or replace function photo_private.limits()
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
revoke all on function photo_private.limits() from public, anon, authenticated;

commit;
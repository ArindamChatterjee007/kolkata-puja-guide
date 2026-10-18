begin;

do $$
begin
	if (select count(*) from pg_tables
			where schemaname = 'storage' and tablename in ('objects', 'buckets') and rowsecurity) <> 2 then
		raise exception 'ManagedStorageRlsRequired';
	end if;
	if exists(select 1 from pg_policies
			where schemaname = 'storage' and tablename in ('objects', 'buckets')
				and roles && array['public', 'anon', 'authenticated']::name[]) then
		raise exception 'ClientStoragePoliciesForbidden';
	end if;
	if not exists(select 1 from storage.buckets
			where id = 'trip-photos' and not public and file_size_limit = 40000000) then
		raise exception 'PrivateBoundedBucketRequired';
	end if;
	if has_function_privilege('anon', 'public.trip_photos(text,uuid,jsonb)', 'EXECUTE')
		or has_function_privilege('authenticated', 'public.trip_photos(text,uuid,jsonb)', 'EXECUTE')
		or has_function_privilege('anon', 'public.trip_photos_rate(text,text)', 'EXECUTE')
		or has_function_privilege('authenticated', 'public.trip_photos_rate(text,text)', 'EXECUTE') then
		raise exception 'ClientRpcExecutionForbidden';
	end if;
end;
$$;

commit;
-- Fix function search path mutable warnings
-- Set explicit search_path on functions to prevent security issues

-- Update existing functions to have explicit search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    case 
      when new.email = 'sunny@example.com' then 'admin'
      else 'viewer'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
begin
  delete from public.users where id = old.id;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.promote_user(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
begin
  -- Validate role
  if new_role not in ('admin','volunteer','viewer') then
    raise exception 'Invalid role: %', new_role;
  end if;

  -- Update the user's role
  update users
  set role = new_role
  where id = target_user;
end;
$function$;
-- Add RLS policies for classes table
CREATE POLICY "Public can view classes" 
ON public.classes 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage classes" 
ON public.classes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users u 
  WHERE u.id = auth.uid() AND u.role = 'admin'
));

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.users (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  delete from public.users where id = old.id;
  return old;
end;
$function$;
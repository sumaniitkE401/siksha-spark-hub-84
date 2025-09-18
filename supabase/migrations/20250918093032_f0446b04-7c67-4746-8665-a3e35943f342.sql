-- Fix security definer view issues by setting security_invoker = true
-- This ensures views respect RLS policies of the querying user, not the view creator

-- Set security_invoker on the volunteer_dashboard view
ALTER VIEW public.volunteer_dashboard SET (security_invoker = true);

-- Query to find any other views that might need this fix
-- and apply the same security_invoker setting to all public views
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', 
                      view_record.schemaname, view_record.viewname);
    END LOOP;
END $$;
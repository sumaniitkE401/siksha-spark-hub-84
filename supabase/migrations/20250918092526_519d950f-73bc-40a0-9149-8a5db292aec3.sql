-- Query to find all views with SECURITY DEFINER
SELECT schemaname, viewname, definition
FROM pg_views 
WHERE schemaname = 'public' 
AND definition ILIKE '%security%definer%';

-- Also check for any materialized views with security definer
SELECT schemaname, matviewname, definition
FROM pg_matviews 
WHERE schemaname = 'public' 
AND definition ILIKE '%security%definer%';

-- Let's also check system information about views to be thorough
SELECT 
    ns.nspname as schema_name,
    c.relname as view_name,
    pg_get_viewdef(c.oid) as view_definition
FROM pg_class c
JOIN pg_namespace ns ON c.relnamespace = ns.oid
WHERE c.relkind = 'v' 
AND ns.nspname = 'public'
AND pg_get_viewdef(c.oid) ILIKE '%security%definer%';
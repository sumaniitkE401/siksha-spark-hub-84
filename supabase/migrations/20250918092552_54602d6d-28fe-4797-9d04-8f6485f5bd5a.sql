-- Check for all SECURITY DEFINER functions and views across all schemas
-- Check functions with SECURITY DEFINER
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%security definer%'
AND n.nspname IN ('public', 'auth', 'storage', 'extensions');

-- Check for any views with SECURITY DEFINER across relevant schemas
SELECT 
    ns.nspname as schema_name,
    c.relname as view_name,
    pg_get_viewdef(c.oid) as view_definition
FROM pg_class c
JOIN pg_namespace ns ON c.relnamespace = ns.oid
WHERE c.relkind = 'v' 
AND ns.nspname IN ('public', 'auth', 'storage', 'extensions')
AND pg_get_viewdef(c.oid) ILIKE '%security definer%';

-- Also check if there are any remaining issue-causing views in the public schema
SELECT 
    schemaname, 
    viewname, 
    definition
FROM pg_views 
WHERE schemaname = 'public';
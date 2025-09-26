-- Fix security definer view warnings
-- Recreate views with security_invoker = true to use querying user's permissions

-- Fix pending_volunteers view security
DROP VIEW IF EXISTS public.pending_volunteers;

CREATE VIEW public.pending_volunteers 
WITH (security_invoker = true) AS
SELECT id, name, email, programme, created_at
FROM public.users 
WHERE role = 'viewer';

-- Fix volunteer_dashboard view security  
DROP VIEW IF EXISTS public.volunteer_dashboard;

CREATE VIEW public.volunteer_dashboard 
WITH (security_invoker = true) AS
SELECT 
    se.id as syllabus_entry_id,
    se.class_id,
    se.volunteer_id,
    se.date_taught,
    se.duration_min,
    se.topics,
    se.test_given,
    se.test_info,
    se.notes,
    se.attachments,
    se.created_at as entry_created_at,
    se.updated_at as entry_updated_at,
    u.name as volunteer_name,
    u.email as volunteer_email,
    u.programme,
    u.photo_url,
    c.subject,
    c.grade,
    c.class_label,
    c.description
FROM public.syllabus_entries se
JOIN public.users u ON se.volunteer_id = u.id  
JOIN public.classes c ON se.class_id = c.id
WHERE u.role IN ('volunteer', 'admin');
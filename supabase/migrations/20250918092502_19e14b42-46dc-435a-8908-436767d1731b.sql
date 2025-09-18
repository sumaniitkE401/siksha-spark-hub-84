-- Fix security definer views by recreating them without SECURITY DEFINER property
-- This ensures RLS policies are properly enforced for querying users

-- Drop the existing security definer views
DROP VIEW IF EXISTS public.volunteer_dashboard;

-- Recreate volunteer_dashboard view without SECURITY DEFINER
CREATE VIEW public.volunteer_dashboard AS
SELECT 
    u.id as volunteer_id,
    u.name as volunteer_name,
    u.email as volunteer_email,
    u.programme,
    u.photo_url,
    c.id as class_id,
    c.subject,
    c.grade,
    c.class_label,
    c.description,
    se.id as syllabus_entry_id,
    se.date_taught,
    se.duration_min,
    se.topics,
    se.notes,
    se.attachments,
    se.test_given,
    se.test_info,
    se.created_at as entry_created_at,
    se.updated_at as entry_updated_at
FROM users u
LEFT JOIN class_assignments ca ON u.id = ca.user_id
LEFT JOIN classes c ON ca.class_id = c.id
LEFT JOIN syllabus_entries se ON c.id = se.class_id AND u.id = se.volunteer_id
WHERE u.role IN ('volunteer', 'admin');

-- Enable RLS on the view
ALTER VIEW public.volunteer_dashboard SET (security_barrier = true);

-- Grant appropriate permissions
GRANT SELECT ON public.volunteer_dashboard TO authenticated;

-- The view will now respect RLS policies from the underlying tables
-- instead of bypassing them with SECURITY DEFINER
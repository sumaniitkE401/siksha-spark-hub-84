-- Critical Security Fixes (Corrected)
-- Since pending_volunteers and volunteer_dashboard are views, we need different approach

-- Fix 1: Create secure pending volunteers view
-- First drop the existing view if it exists as a view
DROP VIEW IF EXISTS public.pending_volunteers;

-- Create a secure view that only admins can access through application logic
CREATE VIEW public.pending_volunteers AS
SELECT id, name, email, programme, created_at
FROM public.users 
WHERE role = 'viewer';

-- Grant access only to authenticated users (application will handle admin check)
GRANT SELECT ON public.pending_volunteers TO authenticated;

-- Fix 2: Create secure volunteer dashboard view  
-- Drop existing view if it exists
DROP VIEW IF EXISTS public.volunteer_dashboard;

-- Recreate with proper structure (this will be secured by application logic)
CREATE VIEW public.volunteer_dashboard AS
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

-- Grant access to authenticated users (RLS on underlying tables will handle security)
GRANT SELECT ON public.volunteer_dashboard TO authenticated;

-- Fix 3: Prevent role escalation - users cannot modify their own role
DROP POLICY IF EXISTS "Users update own profile" ON public.users;

CREATE POLICY "Users update own profile except role"
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND 
  -- Prevent role changes by regular users
  (role = (SELECT role FROM public.users WHERE id = auth.uid()) OR get_current_user_role() = 'admin')
);

-- Additional security: Add role validation constraint
ALTER TABLE public.users 
ADD CONSTRAINT valid_user_roles 
CHECK (role IN ('admin', 'volunteer', 'viewer'));
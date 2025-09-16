-- Fix critical security vulnerabilities

-- 1. Create security definer function to safely check user roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 2. Drop the problematic recursive RLS policy on users table
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;

-- 3. Create new non-recursive RLS policy for users table
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT 
  USING (public.get_current_user_role() = 'admin' OR id = auth.uid());

-- 4. Fix classes table - remove duplicate policies and secure properly
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Admins manage all classes" ON public.classes;
DROP POLICY IF EXISTS "Volunteers view assigned classes only" ON public.classes;

-- Add proper classes policies
CREATE POLICY "Authenticated users can view classes" ON public.classes
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage all classes" ON public.classes
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- 5. Secure syllabus_entries - currently publicly accessible
DROP POLICY IF EXISTS "Volunteers view syllabus of own classes" ON public.syllabus_entries;
DROP POLICY IF EXISTS "Volunteers manage syllabus of own classes" ON public.syllabus_entries;
DROP POLICY IF EXISTS "Admins manage all syllabus" ON public.syllabus_entries;

-- Add secure syllabus policies
CREATE POLICY "Authenticated users view assigned class syllabus" ON public.syllabus_entries
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND 
    (public.get_current_user_role() = 'admin' OR 
     EXISTS (SELECT 1 FROM class_assignments ca WHERE ca.class_id = syllabus_entries.class_id AND ca.user_id = auth.uid()))
  );

CREATE POLICY "Volunteers manage own class syllabus" ON public.syllabus_entries
  FOR ALL 
  USING (
    auth.role() = 'authenticated' AND 
    volunteer_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM class_assignments ca WHERE ca.class_id = syllabus_entries.class_id AND ca.user_id = auth.uid())
  );

CREATE POLICY "Admins manage all syllabus" ON public.syllabus_entries
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- 6. Secure announcements table
DROP POLICY IF EXISTS "Volunteers read class announcements" ON public.announcements;
DROP POLICY IF EXISTS "Volunteers post to own classes" ON public.announcements;
DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;

-- Add secure announcement policies
CREATE POLICY "Authenticated users read relevant announcements" ON public.announcements
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND 
    (class_id IS NULL OR 
     public.get_current_user_role() = 'admin' OR
     EXISTS (SELECT 1 FROM class_assignments ca WHERE ca.class_id = announcements.class_id AND ca.user_id = auth.uid()))
  );

CREATE POLICY "Volunteers post to assigned classes" ON public.announcements
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    author_id = auth.uid() AND 
    (class_id IS NULL OR EXISTS (SELECT 1 FROM class_assignments ca WHERE ca.class_id = announcements.class_id AND ca.user_id = auth.uid()))
  );

CREATE POLICY "Admins manage all announcements" ON public.announcements
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- 7. Add missing INSERT policy for users (currently blocked)
CREATE POLICY "System can insert users" ON public.users
  FOR INSERT 
  WITH CHECK (true);

-- 8. Ensure all tables have proper DELETE policies where needed
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE 
  USING (public.get_current_user_role() = 'admin');

-- 9. Add UPDATE policies for announcements and syllabus
CREATE POLICY "Authors can update own announcements" ON public.announcements
  FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "Volunteers can update own syllabus entries" ON public.syllabus_entries
  FOR UPDATE 
  USING (volunteer_id = auth.uid());
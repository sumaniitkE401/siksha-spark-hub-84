-- Fix critical security vulnerabilities (revised)

-- 1. Create security definer function to safely check user roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 2. Drop ALL existing problematic RLS policies and recreate them properly
-- Users table policies
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Classes table policies  
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Admins manage all classes" ON public.classes;
DROP POLICY IF EXISTS "Volunteers view assigned classes only" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can view classes" ON public.classes;

-- Syllabus entries policies
DROP POLICY IF EXISTS "Volunteers view syllabus of own classes" ON public.syllabus_entries;
DROP POLICY IF EXISTS "Volunteers manage syllabus of own classes" ON public.syllabus_entries;
DROP POLICY IF EXISTS "Admins manage all syllabus" ON public.syllabus_entries;

-- Announcements policies
DROP POLICY IF EXISTS "Volunteers read class announcements" ON public.announcements;
DROP POLICY IF EXISTS "Volunteers post to own classes" ON public.announcements;
DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;

-- Class assignments policies
DROP POLICY IF EXISTS "Admins manage assignments" ON public.class_assignments;
DROP POLICY IF EXISTS "Volunteers see their own assignments" ON public.class_assignments;

-- 3. Recreate secure policies for users table
CREATE POLICY "Users can read own profile or admins read all" ON public.users
  FOR SELECT 
  USING (id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "System can insert users" ON public.users
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE 
  USING (public.get_current_user_role() = 'admin');

-- 4. Recreate secure policies for classes table
CREATE POLICY "Authenticated users view assigned classes" ON public.classes
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND 
    (public.get_current_user_role() = 'admin' OR 
     EXISTS (SELECT 1 FROM class_assignments ca WHERE ca.class_id = classes.id AND ca.user_id = auth.uid()))
  );

CREATE POLICY "Admins manage all classes" ON public.classes
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- 5. Recreate secure policies for syllabus_entries
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

-- 6. Recreate secure policies for announcements
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

CREATE POLICY "Authors can update own announcements" ON public.announcements
  FOR UPDATE 
  USING (author_id = auth.uid());

-- 7. Recreate secure policies for class_assignments
CREATE POLICY "Volunteers see own assignments" ON public.class_assignments
  FOR SELECT 
  USING (user_id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "Admins manage all assignments" ON public.class_assignments
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');
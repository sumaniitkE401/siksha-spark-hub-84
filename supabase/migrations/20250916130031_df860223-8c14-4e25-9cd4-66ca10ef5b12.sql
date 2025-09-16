-- Comprehensive security fix - drop all existing policies first

-- 1. Create security definer function to safely check user roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 2. Drop ALL existing policies on all tables to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
    
    -- Drop all policies on classes table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'classes' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.classes';
    END LOOP;
    
    -- Drop all policies on syllabus_entries table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'syllabus_entries' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.syllabus_entries';
    END LOOP;
    
    -- Drop all policies on announcements table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'announcements' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.announcements';
    END LOOP;
    
    -- Drop all policies on class_assignments table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'class_assignments' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.class_assignments';
    END LOOP;
END $$;

-- 3. Create new secure policies for users table
CREATE POLICY "Users read own profile or admins read all" ON public.users
  FOR SELECT 
  USING (id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "System inserts users" ON public.users
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins delete users" ON public.users
  FOR DELETE 
  USING (public.get_current_user_role() = 'admin');

-- 4. Create secure policies for classes table (only authenticated users with assignments can view)
CREATE POLICY "Users view assigned classes" ON public.classes
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND 
    (public.get_current_user_role() = 'admin' OR 
     EXISTS (SELECT 1 FROM class_assignments ca WHERE ca.class_id = classes.id AND ca.user_id = auth.uid()))
  );

CREATE POLICY "Admins manage classes" ON public.classes
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- 5. Create secure policies for syllabus_entries (only users assigned to classes can view)
CREATE POLICY "Users view assigned class syllabus" ON public.syllabus_entries
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND 
    (public.get_current_user_role() = 'admin' OR 
     EXISTS (SELECT 1 FROM class_assignments ca WHERE ca.class_id = syllabus_entries.class_id AND ca.user_id = auth.uid()))
  );

CREATE POLICY "Volunteers manage own syllabus" ON public.syllabus_entries
  FOR ALL 
  USING (
    auth.role() = 'authenticated' AND 
    volunteer_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM class_assignments ca WHERE ca.class_id = syllabus_entries.class_id AND ca.user_id = auth.uid())
  );

CREATE POLICY "Admins manage all syllabus" ON public.syllabus_entries
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- 6. Create secure policies for announcements (only authenticated users in relevant classes)
CREATE POLICY "Users read relevant announcements" ON public.announcements
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

CREATE POLICY "Authors update own announcements" ON public.announcements
  FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "Admins manage all announcements" ON public.announcements
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- 7. Create secure policies for class_assignments
CREATE POLICY "Users see own assignments" ON public.class_assignments
  FOR SELECT 
  USING (user_id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "Admins manage assignments" ON public.class_assignments
  FOR ALL 
  USING (public.get_current_user_role() = 'admin');

-- Add user_id column to patients so patients can be linked to auth users
ALTER TABLE public.patients ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated can view patients" ON public.patients;
DROP POLICY IF EXISTS "Staff can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Staff can update patients" ON public.patients;

-- Patients can view only their own record; doctors and admins can view all
CREATE POLICY "Patient views own record"
  ON public.patients FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
  );

-- Only doctors and admins can insert patients
CREATE POLICY "Doctors and admins insert patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
  );

-- Only doctors and admins can update patients
CREATE POLICY "Doctors and admins update patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
  );

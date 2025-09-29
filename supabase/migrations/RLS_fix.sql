-- Fix RLS 

-- PROFILES
DROP POLICY IF EXISTS "Officers can view all profiles" ON public.profiles;

CREATE POLICY "Officers can view all profiles" ON public.profiles
  FOR SELECT USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') IN ('officer','admin'), false)
  );

-- COUNTERS
DROP POLICY IF EXISTS "Officers can manage counters" ON public.counters;
CREATE POLICY "Officers can manage counters" ON public.counters
  FOR ALL USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') IN ('officer','admin'), false)
  );

-- TOKENS
DROP POLICY IF EXISTS "Officers can view all tokens" ON public.tokens;
CREATE POLICY "Officers can view all tokens" ON public.tokens
  FOR SELECT USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') IN ('officer','admin'), false)
  );

DROP POLICY IF EXISTS "Officers can update all tokens" ON public.tokens;
CREATE POLICY "Officers can update all tokens" ON public.tokens
  FOR UPDATE USING (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') IN ('officer','admin'), false)
  );





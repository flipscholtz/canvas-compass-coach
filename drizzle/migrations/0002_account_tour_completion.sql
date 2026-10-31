CREATE TABLE public.account_preferences (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 tour_completed boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT ON public.account_preferences TO authenticated;
GRANT UPDATE(tour_completed) ON public.account_preferences TO authenticated;
GRANT ALL ON public.account_preferences TO service_role;
ALTER TABLE public.account_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY preferences_read_own ON public.account_preferences FOR SELECT TO authenticated USING(user_id = auth.uid());
CREATE POLICY preferences_insert_own ON public.account_preferences FOR INSERT TO authenticated WITH CHECK(user_id = auth.uid());
CREATE POLICY preferences_update_own ON public.account_preferences FOR UPDATE TO authenticated USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());
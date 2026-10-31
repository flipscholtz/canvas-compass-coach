CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE FUNCTION public.create_account_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id, username) VALUES (NEW.id, lower(split_part(NEW.email, '@', 1)));
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_account_profile() FROM PUBLIC;
CREATE TRIGGER canvasstack_account_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_account_profile();
CREATE TABLE public.account_scenarios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
 data jsonb NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_scenarios TO authenticated;
GRANT ALL ON public.account_scenarios TO service_role;
ALTER TABLE public.account_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY scenarios_read_own ON public.account_scenarios FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY scenarios_insert_own ON public.account_scenarios FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY scenarios_update_own ON public.account_scenarios FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY scenarios_delete_own ON public.account_scenarios FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX account_scenarios_owner ON public.account_scenarios(owner_id);
CREATE TABLE public.demo_scenarios (
 id text PRIMARY KEY,
 name text NOT NULL,
 template_key text NOT NULL CHECK (template_key IN ('veritrace', 'learnloop'))
);
GRANT SELECT ON public.demo_scenarios TO authenticated;
GRANT ALL ON public.demo_scenarios TO service_role;
ALTER TABLE public.demo_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY demos_read_signed_in ON public.demo_scenarios FOR SELECT TO authenticated USING (true);
INSERT INTO public.demo_scenarios (id, name, template_key) VALUES
 ('demo-veritrace', 'VeriTrace · Industrial Carbon ESG SaaS', 'veritrace'),
 ('demo-learnloop', 'LearnLoop · Matric Exam-Prep Tutoring', 'learnloop');
-- 巨笑版的 page.tsx 直接用前端 anon client 進行 INSERT/UPDATE/DELETE
-- 需要為 anon 角色加上寫入 policy，否則 RLS 啟用後這些操作會被擋
-- （server action 用 service_role 不受影響）

DO $$
DECLARE
    -- 需要 anon 完整讀寫的表
    rw_tables TEXT[] := ARRAY[
        'CharacterStats',
        'DailyLogs',
        'TeamSettings',
        'SystemSettings',
        'TopicHistory',
        'temporaryquests',
        'MandatoryQuestHistory',
        'CourseRegistrations',
        'CourseAttendance',
        'FinePayments',
        'SquadFineSubmissions',
        'Achievements',
        'Testimonies',
        'LineGroups',
        'BoardGameStats',
        'BoardGameTransactions'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY rw_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- INSERT
            EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON public.%I', t, t);
            EXECUTE format('CREATE POLICY "anon_insert_%s" ON public.%I FOR INSERT TO anon WITH CHECK (true)', t, t);
            -- UPDATE
            EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON public.%I', t, t);
            EXECUTE format('CREATE POLICY "anon_update_%s" ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)', t, t);
            -- DELETE
            EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON public.%I', t, t);
            EXECUTE format('CREATE POLICY "anon_delete_%s" ON public.%I FOR DELETE TO anon USING (true)', t, t);
        END IF;
    END LOOP;
END $$;

-- 1. Ensure Plan Tier is TEXT (Handles existing Enum conversion)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan_tier') THEN
         ALTER TABLE users ALTER COLUMN plan_tier DROP DEFAULT;
         ALTER TABLE users ALTER COLUMN plan_tier TYPE text USING plan_tier::text;
    END IF;
END $$;

-- 2. Add column if it doesn't exist (fresh install case)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'FREE';

-- 3. Add strict limit columns with defaults
ALTER TABLE users ADD COLUMN IF NOT EXISTS trade_count_limit integer DEFAULT 50; -- 50 Trades (Free)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_daily_limit integer DEFAULT 3;     -- 3 Chats (Free)
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_limit integer DEFAULT 1;    -- 1 Portfolio (Free)
ALTER TABLE users ADD COLUMN IF NOT EXISTS backtest_count_limit integer DEFAULT 3; -- 3 Backtests (Free)

-- 4. Update existing NULL users to 'FREE'
UPDATE users SET plan_tier = 'FREE' WHERE plan_tier IS NULL;

-- 5. Update Constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_plan_tier;
ALTER TABLE users ADD CONSTRAINT valid_plan_tier CHECK (plan_tier IN ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE', 'PROFESSIONAL', 'ELITE'));

-- 6. RLS Policies
DROP POLICY IF EXISTS "Users can view their own limits" ON users;
CREATE POLICY "Users can view their own limits" ON users FOR SELECT USING (auth.uid() = id);

-- 7. Grant access (optional, depending on setup)
GRANT SELECT ON users TO authenticated;

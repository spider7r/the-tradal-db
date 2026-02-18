import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { AutoUpgradeTrigger } from '@/components/upgrade/AutoUpgradeTrigger'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AccountProvider } from '@/context/AccountContext'
import { Providers } from '@/components/Providers'
import { PlanEnforcementWrapper } from '@/components/auth/PlanEnforcementWrapper'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
        redirect('/login')
    }

    const user = authUser

    // Fetch user accounts (will return empty for guest)
    const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

    // Check actual subscription status
    const { data: userProfile } = await supabase
        .from('users')
        .select('subscription_status, plan_tier, onboarding_completed')
        .eq('id', user.id)
        .single()

    // =============================================================
    // BULLETPROOF ONBOARDING GATE (Cookie-first, then DB fallback)
    // =============================================================
    // 1. Check cookie FIRST — this is synchronous, never fails,
    //    and persists across LemonSqueezy redirects.
    // 2. If cookie exists → user already selected a plan → SHOW DASHBOARD
    // 3. If no cookie → check DB → if onboarding_completed is true → SHOW DASHBOARD
    // 4. Otherwise → redirect to /onboarding
    // =============================================================
    const cookieStore = await cookies()
    const onboardedCookie = cookieStore.get('tradal_onboarded')?.value

    if (onboardedCookie === 'true') {
        // Cookie says user already completed onboarding — trust it.
        // Also try to sync the DB if it's out of date (best-effort, don't block)
        if (!userProfile || userProfile.onboarding_completed !== true) {
            // Best-effort DB sync — don't block rendering
            try {
                await supabase.from('users').upsert({
                    id: user.id,
                    email: user.email,
                    onboarding_completed: true,
                }, { onConflict: 'id' })
            } catch { /* ignore */ }
        }
        // Proceed to dashboard — DO NOT redirect to onboarding
    } else if (userProfile?.onboarding_completed === true) {
        // DB says onboarding is complete — trust it, no redirect needed
    } else {
        // Neither cookie nor DB says onboarding is done → redirect
        redirect('/onboarding')
    }

    // Check if we need to enforce plan (User selected paid plan but has no active subscription)
    const isActive = userProfile?.subscription_status === 'active' ||
        userProfile?.subscription_status === 'trialing' ||
        userProfile?.subscription_status === 'free' ||
        !userProfile?.subscription_status // No profile = free tier

    return (
        <AccountProvider initialAccounts={accounts || []}>
            <Providers>
                <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 text-zinc-50">
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

                    <div className="relative z-10 flex h-full w-full">
                        <Sidebar />
                        <div className="flex flex-1 flex-col overflow-hidden">
                            <Topbar />
                            <main className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                <div className="mx-auto max-w-7xl">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                    <AutoUpgradeTrigger />
                </div>
                <PlanEnforcementWrapper isActive={isActive} userPlanTier={userProfile?.plan_tier} />
            </Providers>
        </AccountProvider>
    )
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { validatePassword, validateEmail } from '@/utils/validation'

export async function login(formData: FormData) {
    try {
        const supabase = await createClient()

        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const plan = formData.get('plan') as string

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('Supabase Auth Error:', error)
            return redirect(`/login?error=${encodeURIComponent(error.message)}${plan ? `&plan=${plan}` : ''}`)
        }

        revalidatePath('/', 'layout')

        if (plan) {
            return redirect(`/checkout?plan=${plan}`)
        }
    } catch (error) {
        // Check if it's a Next.js redirect error
        if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
            throw error
        }

        console.error('Login Action Error:', error)
        return redirect(`/login?error=${encodeURIComponent('An unexpected error occurred. Please try again.')}`)
    }

    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const phone = formData.get('phone') as string
    const plan = formData.get('plan') as string

    // Server-side validation
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
        return { error: emailValidation.error }
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
        return { error: passwordValidation.error }
    }

    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const affiliateRef = cookieStore.get('affiliate_ref')?.value

    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.thetradal.com'
    const redirectTo = plan
        ? `${origin}/auth/callback?next=/checkout?plan=${plan}`
        : `${origin}/auth/callback`


    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                phone_number: phone,
                referred_by: affiliateRef || null,
            },
            emailRedirectTo: redirectTo
        },
    })

    if (error) {
        return { error: error.message }
    }

    // Do not redirect, let the client handle the success state
    return { success: true }
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const origin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

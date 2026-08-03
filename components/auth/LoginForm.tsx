"use client"

import * as React from "react"
import { useActionState } from "react"
import Link from "next/link"
import HCaptcha from "@hcaptcha/react-hcaptcha"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/auth/PasswordInput"
import { GoogleIcon } from "@/components/auth/GoogleIcon"
import { login, type LoginState } from "@/app/auth/login/actions"
import { createClient } from "@/lib/supabase/client"

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ""

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(login, null)
  const captchaRef = React.useRef<HCaptcha>(null)
  const pendingFormData = React.useRef<FormData | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setIsGoogleLoading(false)
  }

  React.useEffect(() => {
    if (state && "error" in state) {
      captchaRef.current?.resetCaptcha()
    }
  }, [state])

  const onVerify = (token: string) => {
    const formData = pendingFormData.current
    pendingFormData.current = null
    if (!formData) return
    formData.set("captchaToken", token)
    React.startTransition(() => formAction(formData))
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    if (!HCAPTCHA_SITE_KEY) {
      React.startTransition(() => formAction(formData))
      return
    }

    pendingFormData.current = formData
    captchaRef.current?.execute()
  }

  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Sign in to Sanggabiz to continue.</p>
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <Input type="email" name="email" placeholder="Email" required />
        <PasswordInput name="password" placeholder="Password" required />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Logging in..." : "Log in"}
        </Button>
      </form>

      {HCAPTCHA_SITE_KEY && (
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          size="invisible"
          onVerify={onVerify}
        />
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">Or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
      >
        <GoogleIcon className="size-4" />
        {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/auth/learner/signup" className="text-ring hover:underline">
          Sign up
        </Link>
      </p>
    </>
  )
}

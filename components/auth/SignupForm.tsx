"use client"

import * as React from "react"
import { useActionState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import HCaptcha from "@hcaptcha/react-hcaptcha"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/auth/PasswordInput"
import { GoogleIcon } from "@/components/auth/GoogleIcon"
import { signupSchema, type SignupFormValues } from "@/components/auth/schema"
import { signup, type SignupState } from "@/app/auth/learner/actions"
import { createClient } from "@/lib/supabase/client"

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ""

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<SignupState, FormData>(signup, null)
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
  const captchaRef = React.useRef<HCaptcha>(null)
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  })

  React.useEffect(() => {
    // hCaptcha tokens are single-use; resetting the widget also fires
    // onExpire, which clears captchaToken via setCaptchaToken(null) below.
    if (state && "error" in state) {
      captchaRef.current?.resetCaptcha()
    }
  }, [state])

  if (state && "status" in state && state.status === "check-email") {
    return (
      <div className="space-y-3 text-center">
        <Mail className="mx-auto size-10 text-ring" />
        <h1 className="text-xl font-bold">Periksa email Anda</h1>
        <p className="text-sm text-muted-foreground">
          Kami telah mengirim tautan konfirmasi ke <span className="font-medium text-foreground">{state.email}</span>.
          Klik tautan tersebut untuk mengaktifkan akun Anda.
        </p>
        <Link href="/auth/login" className="inline-block text-sm text-ring underline underline-offset-4">
          Kembali ke halaman masuk
        </Link>
      </div>
    )
  }

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData()
    formData.set("fullName", values.fullName)
    formData.set("email", values.email)
    formData.set("password", values.password)
    formData.set("confirmPassword", values.confirmPassword)
    formData.set("captchaToken", captchaToken ?? "")
    React.startTransition(() => formAction(formData))
  })

  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold">Buat akun Anda</h1>
        <p className="text-sm text-muted-foreground">Mulai belajar bersama Sanggabiz.</p>
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Input type="text" placeholder="Nama lengkap" aria-label="Nama lengkap" {...register("fullName")} />
          {errors.fullName && (
            <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>
        <div>
          <Input type="email" placeholder="Email" aria-label="Email" {...register("email")} />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div>
          <PasswordInput placeholder="Kata sandi" aria-label="Kata sandi" {...register("password")} />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div>
          <PasswordInput placeholder="Konfirmasi kata sandi" aria-label="Konfirmasi kata sandi" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        {HCAPTCHA_SITE_KEY && (
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
          />
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || (!!HCAPTCHA_SITE_KEY && !captchaToken)}
        >
          {isPending ? "Mendaftar..." : "Daftar"}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">Atau lanjutkan dengan</span>
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
        {isGoogleLoading ? "Mengalihkan..." : "Lanjutkan dengan Google"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/auth/login" className="text-ring underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </>
  )
}

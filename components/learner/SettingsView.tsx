"use client"

import { useState, useTransition } from "react"
import { Bell, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { changePassword, deleteAccount, updateNotificationPref } from "@/app/learner/settings/actions"

export function SettingsView({
  notificationEmailEnabled,
}: {
  notificationEmailEnabled: boolean
}) {
  return (
    <div>
      <div className="mb-6 text-3xl font-bold">Settings</div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <NotificationsCard initialEnabled={notificationEmailEnabled} />
          <SecurityCard />
        </div>
        <div className="flex flex-col gap-6">
          <DeleteAccountCard />
        </div>
      </div>
    </div>
  )
}

function NotificationsCard({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <div className="mb-5 flex items-center gap-2.5 text-lg font-bold">
        <Bell className="size-[18px]" />
        Notifications
      </div>
      <div className="flex items-center justify-between gap-5">
        <div>
          <div className="text-sm font-semibold">Email Notifications</div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            Receive email updates about your courses and account
          </div>
        </div>
        <Switch
          checked={enabled}
          disabled={isPending}
          onCheckedChange={(checked) => {
            setEnabled(checked)
            startTransition(async () => {
              const result = await updateNotificationPref(checked)
              if (result?.error) setEnabled(!checked)
            })
          }}
        />
      </div>
    </div>
  )
}

function SecurityCard() {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <div className="mb-5 flex items-center gap-2.5 text-lg font-bold">
        <Shield className="size-[18px]" />
        Security
      </div>
      <div className="mb-2.5 text-sm font-semibold">Change Password</div>
      <form
        action={(formData) => {
          setStatus(null)
          startTransition(async () => {
            const result = await changePassword(formData)
            if (result?.error) {
              setStatus({ type: "error", message: result.error })
            } else {
              setStatus({ type: "success", message: "Password updated" })
              ;(document.getElementById("password-form") as HTMLFormElement)?.reset()
            }
          })
        }}
        id="password-form"
        className="flex gap-3"
      >
        <Input
          type="password"
          name="password"
          placeholder="Enter new password"
          className="flex-1"
          required
        />
        <Button type="submit" disabled={isPending} className="bg-brand-gradient text-white hover:brightness-105">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </form>
      {status && (
        <p className={`mt-2.5 text-sm ${status.type === "error" ? "text-destructive" : "text-ring"}`}>
          {status.message}
        </p>
      )}
    </div>
  )
}

function DeleteAccountCard() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <div className="mb-5 text-lg font-bold">Delete Account</div>
      <div className="rounded-xl border border-[#f3d5d5] bg-[#fdf1f1] p-5">
        <div className="text-[14.5px] font-semibold text-destructive">Permanently delete your account</div>
        <div className="mt-1 mb-3.5 text-[13px] text-destructive/80">
          Once deleted, your account cannot be recovered
        </div>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          disabled={isPending}
          className="w-full bg-destructive text-white hover:bg-destructive/90"
          onClick={() => {
            const confirmed = window.confirm(
              "This will permanently delete your account and all its data. This cannot be undone. Continue?"
            )
            if (!confirmed) return

            setError(null)
            startTransition(async () => {
              const result = await deleteAccount()
              if (result?.error) setError(result.error)
            })
          }}
        >
          {isPending ? "Deleting..." : "Delete Account"}
        </Button>
      </div>
    </div>
  )
}

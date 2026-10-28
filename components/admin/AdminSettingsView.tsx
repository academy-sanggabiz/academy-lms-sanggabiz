"use client"

import { useState, useTransition } from "react"
import { Bell, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { PasswordInput } from "@/components/auth/PasswordInput"
import { changePassword, deleteAccount, updateNotificationPref } from "@/app/admin/settings/actions"

export function AdminSettingsView({
  notificationEmailEnabled,
}: {
  notificationEmailEnabled: boolean
}) {
  return (
    <div>
      <div className="mb-6 text-3xl font-bold">Pengaturan</div>
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
        Notifikasi
      </div>
      <div className="flex items-center justify-between gap-5">
        <div>
          <div className="text-sm font-semibold">Notifikasi Email</div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            Terima kabar terbaru tentang kursus dan akun Anda melalui email
          </div>
        </div>
        <Switch
          aria-label="Notifikasi email"
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
        Keamanan
      </div>
      <div className="mb-2.5 text-sm font-semibold">Ubah Kata Sandi</div>
      <form
        action={(formData) => {
          setStatus(null)
          startTransition(async () => {
            const result = await changePassword(formData)
            if (result?.error) {
              setStatus({ type: "error", message: result.error })
            } else {
              setStatus({ type: "success", message: "Kata sandi diperbarui" })
              ;(document.getElementById("admin-password-form") as HTMLFormElement)?.reset()
            }
          })
        }}
        id="admin-password-form"
        className="flex gap-3"
      >
        <PasswordInput
          name="password"
          placeholder="Masukkan kata sandi baru"
          aria-label="Kata sandi baru"
          className="flex-1"
          required
        />
        <Button type="submit" disabled={isPending} className="bg-brand-gradient text-white hover:brightness-105">
          {isPending ? "Menyimpan..." : "Simpan"}
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
      <div className="mb-5 text-lg font-bold">Hapus Akun</div>
      <div className="rounded-xl border border-[#f3d5d5] bg-[#fdf1f1] p-5">
        <div className="text-[14.5px] font-semibold text-destructive">Hapus akun Anda secara permanen</div>
        <div className="mt-1 mb-3.5 text-[13px] text-destructive">
          Akun yang sudah dihapus tidak dapat dipulihkan
        </div>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          disabled={isPending}
          className="w-full bg-destructive text-white hover:bg-destructive/90"
          onClick={() => {
            const confirmed = window.confirm(
              "Akun dan seluruh datanya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan. Lanjutkan?"
            )
            if (!confirmed) return

            setError(null)
            startTransition(async () => {
              const result = await deleteAccount()
              if (result?.error) setError(result.error)
            })
          }}
        >
          {isPending ? "Menghapus..." : "Hapus Akun"}
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { ArrowLeft, Calendar, Mail, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfileName } from "@/app/admin/profile/actions"

type AdminProfileViewProps = {
  name: string
  email: string
  joinedYear: number
  role: "admin" | "superadmin"
}

export function AdminProfileView({ name, email, joinedYear, role }: AdminProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const initial = name.charAt(0).toUpperCase()
  const roleLabel = role === "superadmin" ? "Superadmin" : "Admin"

  if (isEditing) {
    return (
      <EditProfileForm
        name={name}
        email={email}
        initial={initial}
        onDone={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-6 rounded-2xl border border-border bg-gradient-to-br from-[#e3f4f7] to-[#e8f1fc] p-8">
        <div className="relative flex-none">
          <div className="flex size-[100px] items-center justify-center rounded-full border-4 border-white bg-brand-gradient text-4xl font-semibold text-white uppercase shadow-[0_4px_14px_rgba(20,55,64,0.12)]">
            {initial}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            title="Edit profile"
            className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[0_2px_8px_rgba(20,55,64,0.15)] hover:bg-muted"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-bold">{name}</span>
            <span className="rounded-full border border-ring/30 bg-secondary px-3 py-1 text-xs font-semibold text-ring">
              {roleLabel}
            </span>
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5 text-[13.5px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <Mail className="size-3.5 text-ring" />
              {email}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="size-3.5 text-ring" />
              Joined since {joinedYear}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditProfileForm({
  name,
  email,
  initial,
  onDone,
}: {
  name: string
  email: string
  initial: string
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <div className="mb-6 flex items-center gap-3.5">
        <button
          onClick={onDone}
          title="Back to profile"
          className="flex size-9 flex-none items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
        >
          <ArrowLeft className="size-[17px]" />
        </button>
        <div className="text-2xl font-bold">Edit Profile</div>
      </div>

      <form
        action={(formData) => {
          setError(null)
          startTransition(async () => {
            const result = await updateProfileName(formData)
            if (result?.error) {
              setError(result.error)
              return
            }
            onDone()
          })
        }}
        className="max-w-[560px] rounded-2xl border border-border bg-card p-7"
      >
        <div className="mb-5 flex items-center gap-5">
          <div className="flex size-[72px] flex-none items-center justify-center rounded-full border-2 border-[#e3f4f7] bg-brand-gradient text-2xl font-semibold text-white uppercase">
            {initial}
          </div>
        </div>

        <Label htmlFor="fullName" className="mb-2 block text-sm font-semibold">
          Name
        </Label>
        <Input id="fullName" name="fullName" defaultValue={name} className="mb-4 w-full" />

        <Label htmlFor="email" className="mb-2 block text-sm font-semibold">
          Email
        </Label>
        <Input id="email" value={email} disabled className="w-full bg-muted" />
        <p className="mt-1.5 mb-4 text-xs text-muted-foreground">Email cannot be changed</p>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending} className="bg-brand-gradient text-white hover:brightness-105">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

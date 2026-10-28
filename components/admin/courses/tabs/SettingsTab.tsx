"use client"

import { TriangleAlert } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Instructor } from "@/lib/courses"
import type { CoursePrerequisite } from "@/lib/courses-admin"
import { InstructorPicker } from "../InstructorPicker"
import { PrerequisitesSettings } from "./PrerequisitesSettings"
import { CertificateSettings } from "./CertificateSettings"
import { useCourseDraft } from "../CourseDraftContext"

const LEVELS = ["beginner", "intermediate", "advanced"]

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Pemula",
  intermediate: "Menengah",
  advanced: "Lanjutan",
}

export function SettingsTab({
  status,
  instructors,
  availableCoursesForPrerequisites,
}: {
  /** Last-saved status -- `private` and `draft` are independent, and a private
   *  DRAFT is invisible even to invited learners (can_read_course requires
   *  published), which is easy to mistake for the feature being broken. */
  status: "draft" | "published"
  instructors: Instructor[]
  availableCoursesForPrerequisites: CoursePrerequisite[]
}) {
  const { draft, dispatch } = useCourseDraft()

  function setField<K extends "level" | "isPrivate" | "enrollmentMode" | "price">(
    key: K,
    value: (typeof draft)[K]
  ) {
    dispatch({ type: "setField", patch: { [key]: value } })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-[17px] font-bold">Pengaturan Dasar</h3>
        <div className="space-y-1.5">
          <Label htmlFor="level">Tingkat</Label>
          <Select
            value={draft.level || undefined}
            onValueChange={(value) => setField("level", value ?? "")}
          >
            <SelectTrigger id="level" className="w-full">
              <SelectValue placeholder="Pilih tingkat" />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {LEVEL_LABEL[level] ?? level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[17px] font-bold">Pengaturan Pendaftaran</h3>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <Label htmlFor="isPrivate" className="text-sm font-medium">
              Kursus privat
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Hanya peserta yang Anda daftarkan yang dapat menemukan atau membuka kursus ini. Kursus
              tidak tampil di katalog publik. Tambahkan peserta dari tab Peserta.
            </p>
          </div>
          <Switch
            id="isPrivate"
            checked={draft.isPrivate}
            onCheckedChange={(checked) => setField("isPrivate", checked)}
          />
        </div>
        {draft.isPrivate && status === "draft" && (
          <div className="flex items-start gap-2 rounded-lg border border-pill-border bg-draft-background p-3 text-xs">
            <TriangleAlert className="mt-px size-4 shrink-0 text-destructive" />
            <p>
              <span className="font-medium">Kursus ini masih berupa draf.</span> Peserta yang diundang
              belum dapat membukanya sampai Anda menekan Terbitkan. Pengaturan privat hanya mengatur siapa
              yang dapat menemukannya, bukan apakah kursus sudah tayang.
            </p>
          </div>
        )}
        {draft.isPrivate && (
          <p className="text-xs text-muted-foreground">
            Peserta tidak dapat mendaftar sendiri ke kursus privat, jadi opsi harga di bawah hanya
            berlaku jika nanti kursus dijadikan publik.
          </p>
        )}
        <RadioGroup
          value={draft.enrollmentMode}
          onValueChange={(value) => setField("enrollmentMode", value as "free" | "paid")}
          className="gap-3"
        >
          <label className="flex items-start gap-2.5 rounded-lg border border-border p-3">
            <RadioGroupItem value="free" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Publik</span>
              <span className="block text-xs text-muted-foreground">
                Siapa pun dapat mendaftar tanpa biaya.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 rounded-lg border border-border p-3">
            <RadioGroupItem value="paid" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Berbayar</span>
              <span className="block text-xs text-muted-foreground">
                Peserta membayar harga tetap untuk mendaftar.
              </span>
            </span>
          </label>
        </RadioGroup>
        {draft.enrollmentMode === "paid" && (
          <div className="space-y-1.5">
            <Label htmlFor="price">Harga</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step={1000}
              value={draft.price}
              onChange={(e) => setField("price", Number(e.target.value) || 0)}
              placeholder="Rp 150.000"
            />
          </div>
        )}
      </section>

      <PrerequisitesSettings availableCourses={availableCoursesForPrerequisites} />

      <CertificateSettings />

      <section className="space-y-3">
        <h3 className="text-[17px] font-bold">Pengaturan Instruktur</h3>
        <InstructorPicker instructors={instructors} />
      </section>
    </div>
  )
}

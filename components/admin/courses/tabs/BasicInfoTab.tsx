"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadCourseThumbnail } from "@/lib/storage"
import { ImageDropzone } from "../ImageDropzone"
import { useCourseDraft } from "../CourseDraftContext"

type BasicField = "title" | "description" | "requirementsText" | "audienceText" | "thumbnail_url"

export function BasicInfoTab({ errors = {} }: { errors?: Partial<Record<BasicField, string>> }) {
  const { draft, dispatch } = useCourseDraft()

  function setField(key: BasicField, value: string) {
    dispatch({ type: "setField", patch: { [key]: value } })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Judul Kursus</Label>
        <Input
          id="title"
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="misal: Pengantar Pengembangan Web"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Deskripsi Kursus</Label>
        <Textarea
          id="description"
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Apa yang akan peserta dapatkan dari kursus ini?"
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="requirementsText">Persyaratan</Label>
        <Textarea
          id="requirementsText"
          value={draft.requirementsText}
          onChange={(e) => setField("requirementsText", e.target.value)}
          placeholder="Satu persyaratan per baris"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audienceText">Untuk siapa kursus ini</Label>
        <Textarea
          id="audienceText"
          value={draft.audienceText}
          onChange={(e) => setField("audienceText", e.target.value)}
          placeholder="Satu sasaran peserta per baris"
          rows={3}
        />
      </div>

      <ImageDropzone
        value={draft.thumbnail_url || null}
        onChange={(url) => setField("thumbnail_url", url)}
        uploadFn={uploadCourseThumbnail}
        label="Gambar Kursus"
        hint="PNG atau JPEG, maks. 5MB"
      />
      {errors.thumbnail_url && <p className="text-xs text-destructive">{errors.thumbnail_url}</p>}
    </div>
  )
}

"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CertificateType, CourseCertificateSettings } from "@/lib/courses-admin"
import { uploadCertificateTemplate, uploadSignatureImage } from "@/lib/storage"
import { ImageDropzone } from "../ImageDropzone"
import { useCourseDraft } from "../CourseDraftContext"

const CERTIFICATE_TYPES: { value: CertificateType; label: string; description: string }[] = [
  { value: "completion", label: "Kelulusan", description: '"Sertifikat Kelulusan" - "telah berhasil menyelesaikan"' },
  { value: "participation", label: "Partisipasi", description: '"Sertifikat Partisipasi" - "telah berpartisipasi dalam"' },
  { value: "achievement", label: "Prestasi", description: '"Sertifikat Prestasi" - "telah berhasil meraih"' },
  { value: "custom", label: "Judul Khusus (Opsional)", description: "Masukkan judul sertifikat sendiri" },
]

const DEFAULT_SETTINGS: CourseCertificateSettings = {
  enabled: false,
  template_url: null,
  certificate_type: "completion",
  custom_title: null,
  description: null,
  signature_url: null,
  signer_name: null,
  signer_title: null,
  additional_text: null,
}

export function CertificateSettings() {
  const { draft, dispatch } = useCourseDraft()
  const settings = draft.certificate ?? DEFAULT_SETTINGS

  const [customTitle, setCustomTitle] = useState(settings.custom_title ?? "")
  const [description, setDescription] = useState(settings.description ?? "")
  const [signerName, setSignerName] = useState(settings.signer_name ?? "")
  const [signerTitle, setSignerTitle] = useState(settings.signer_title ?? "")
  const [additionalText, setAdditionalText] = useState(settings.additional_text ?? "")
  const [passingGrade, setPassingGrade] = useState(String(draft.passingGrade))

  function save(patch: Partial<CourseCertificateSettings>) {
    dispatch({ type: "setField", patch: { certificate: { ...settings, ...patch } } })
  }

  return (
    <section className="space-y-3">
      <h3 className="text-[17px] font-bold">Pengaturan Sertifikat</h3>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="text-sm font-medium">Aktifkan Sertifikat</div>
          <div className="text-xs text-muted-foreground">
            Terbitkan sertifikat untuk peserta yang menyelesaikan kursus
          </div>
        </div>
        <Switch aria-label="Aktifkan sertifikat" checked={settings.enabled} onCheckedChange={(checked) => save({ enabled: checked })} />
      </div>

      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="cert-passing-grade">Nilai Kelulusan (%)</Label>
        <Input
          id="cert-passing-grade"
          type="number"
          min={0}
          max={100}
          value={passingGrade}
          onChange={(e) => setPassingGrade(e.target.value)}
          onBlur={() =>
            dispatch({
              type: "setField",
              patch: { passingGrade: Math.min(100, Math.max(0, Number(passingGrade) || 0)) },
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          Nilai kursus berbobot minimum yang harus dicapai peserta, selain lulus setiap kuis,
          sebelum kursus dinyatakan selesai dan sertifikat diterbitkan.
        </p>
      </div>

      {settings.enabled && (
        <div className="space-y-4 border-t border-border pt-4">
          <ImageDropzone
            value={settings.template_url}
            onChange={(url) => save({ template_url: url || null })}
            uploadFn={uploadCertificateTemplate}
            label="Templat Sertifikat (Opsional)"
            hint="Orientasi lanskap, PNG/JPEG, maks. 5MB"
          />

          <div className="space-y-2.5">
            <div className="text-xs font-semibold">Jenis Sertifikat</div>
            {CERTIFICATE_TYPES.map((t) => (
              <div
                key={t.value}
                className="flex cursor-pointer gap-2.5"
                onClick={() => save({ certificate_type: t.value })}
              >
                <div
                  className={cn(
                    "mt-0.5 size-4 shrink-0 rounded-full border-2",
                    settings.certificate_type === t.value ? "border-primary bg-primary/20" : "border-border"
                  )}
                />
                <div>
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              </div>
            ))}
          </div>

          {settings.certificate_type === "custom" && (
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="cert-custom-title">Judul Sertifikat Khusus</Label>
              <Input
                id="cert-custom-title"
                placeholder="misal: Sertifikat Keahlian"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onBlur={() => save({ custom_title: customTitle.trim() || null })}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="cert-description">Deskripsi Sertifikat</Label>
              <span className="text-xs text-muted-foreground">{description.length}/150 karakter</span>
            </div>
            <Textarea
              id="cert-description"
              maxLength={150}
              placeholder="misal: Dengan ini menyatakan bahwa [Student Name] telah menyelesaikan [Course Name]."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => save({ description: description.trim() || null })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Penanda yang didukung: [Student Name] (nama peserta), [Course Name] (nama kursus)
            </p>
          </div>

          <ImageDropzone
            value={settings.signature_url}
            onChange={(url) => save({ signature_url: url || null })}
            uploadFn={uploadSignatureImage}
            label="Unggah Gambar Tanda Tangan"
            hint="PNG atau JPEG, maks. 1MB"
          />

          <div className="space-y-1.5">
            <Label htmlFor="cert-signer-name">Nama Penanda Tangan</Label>
            <Input
              id="cert-signer-name"
              placeholder="misal: Budi Santoso"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              onBlur={() => save({ signer_name: signerName.trim() || null })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cert-signer-title">Jabatan Penanda Tangan</Label>
            <Input
              id="cert-signer-title"
              placeholder="misal: Instruktur Kursus, Direktur Pendidikan"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              onBlur={() => save({ signer_title: signerTitle.trim() || null })}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="cert-additional-text">Teks Tambahan (Opsional)</Label>
              <span className="text-xs text-muted-foreground">{additionalText.length}/150 karakter</span>
            </div>
            <Textarea
              id="cert-additional-text"
              maxLength={150}
              placeholder="Teks tambahan yang tampil di sertifikat..."
              value={additionalText}
              onChange={(e) => setAdditionalText(e.target.value)}
              onBlur={() => save({ additional_text: additionalText.trim() || null })}
              rows={3}
            />
          </div>
        </div>
      )}
    </section>
  )
}

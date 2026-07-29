"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CertificateType, CourseCertificateSettings } from "@/lib/courses-admin"
import { saveCertificateSettingsAction } from "@/app/admin/courses/settings-actions"
import { uploadCertificateTemplate, uploadSignatureImage } from "@/lib/storage"
import { ImageDropzone } from "../ImageDropzone"

const CERTIFICATE_TYPES: { value: CertificateType; label: string; description: string }[] = [
  { value: "completion", label: "Completion", description: '"Certificate of Completion" - "has successfully completed"' },
  { value: "participation", label: "Participation", description: '"Certificate of Participation" - "has successfully participated in"' },
  { value: "achievement", label: "Achievement", description: '"Certificate of Achievement" - "has successfully achieved"' },
  { value: "custom", label: "Custom Title (Optional)", description: "Enter your own certificate title" },
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

export function CertificateSettings({
  courseId,
  settings,
}: {
  courseId: string
  settings: CourseCertificateSettings | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const initial = settings ?? DEFAULT_SETTINGS

  const [enabled, setEnabled] = useState(initial.enabled)
  const [templateUrl, setTemplateUrl] = useState(initial.template_url ?? "")
  const [certificateType, setCertificateType] = useState<CertificateType>(initial.certificate_type)
  const [customTitle, setCustomTitle] = useState(initial.custom_title ?? "")
  const [description, setDescription] = useState(initial.description ?? "")
  const [signatureUrl, setSignatureUrl] = useState(initial.signature_url ?? "")
  const [signerName, setSignerName] = useState(initial.signer_name ?? "")
  const [signerTitle, setSignerTitle] = useState(initial.signer_title ?? "")
  const [additionalText, setAdditionalText] = useState(initial.additional_text ?? "")

  function save(input: Partial<CourseCertificateSettings>) {
    startTransition(async () => {
      const result = await saveCertificateSettingsAction(courseId, input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleToggle(checked: boolean) {
    setEnabled(checked)
    save({ enabled: checked })
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Certificate Settings</h3>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="text-sm font-medium">Enable Certificate</div>
          <div className="text-xs text-muted-foreground">
            Issue certificates to students upon course completion
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isPending} />
      </div>

      {enabled && (
        <div className="space-y-4 border-t border-border pt-4">
          <ImageDropzone
            value={templateUrl || null}
            onChange={(url) => {
              setTemplateUrl(url)
              save({ template_url: url || null })
            }}
            uploadFn={uploadCertificateTemplate}
            label="Certificate Template (Optional)"
            hint="Landscape orientation, PNG/JPEG, max 5MB"
          />

          <div className="space-y-2.5">
            <div className="text-xs font-semibold">Certificate Type</div>
            {CERTIFICATE_TYPES.map((t) => (
              <div
                key={t.value}
                className="flex cursor-pointer gap-2.5"
                onClick={() => {
                  setCertificateType(t.value)
                  save({ certificate_type: t.value })
                }}
              >
                <div
                  className={cn(
                    "mt-0.5 size-4 shrink-0 rounded-full border-2",
                    certificateType === t.value ? "border-primary bg-primary/20" : "border-border"
                  )}
                />
                <div>
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              </div>
            ))}
          </div>

          {certificateType === "custom" && (
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="cert-custom-title">Custom Certificate Title</Label>
              <Input
                id="cert-custom-title"
                placeholder="e.g. Certificate of Mastery"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onBlur={() => save({ custom_title: customTitle.trim() || null })}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="cert-description">Certificate Description</Label>
              <span className="text-xs text-muted-foreground">{description.length}/150 characters</span>
            </div>
            <Textarea
              id="cert-description"
              maxLength={150}
              placeholder="e.g., This certifies that [Student Name] has completed the [Course Name]."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => save({ description: description.trim() || null })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Supported placeholders: [Student Name], [Course Name]
            </p>
          </div>

          <ImageDropzone
            value={signatureUrl || null}
            onChange={(url) => {
              setSignatureUrl(url)
              save({ signature_url: url || null })
            }}
            uploadFn={uploadSignatureImage}
            label="Upload Signature Image"
            hint="PNG or JPEG, max 1MB"
          />

          <div className="space-y-1.5">
            <Label htmlFor="cert-signer-name">Name of Signer</Label>
            <Input
              id="cert-signer-name"
              placeholder="e.g., John Doe"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              onBlur={() => save({ signer_name: signerName.trim() || null })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cert-signer-title">Title of Signer</Label>
            <Input
              id="cert-signer-title"
              placeholder="e.g., Course Instructor, Director of Education"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              onBlur={() => save({ signer_title: signerTitle.trim() || null })}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="cert-additional-text">Additional Text (Optional)</Label>
              <span className="text-xs text-muted-foreground">{additionalText.length}/150 characters</span>
            </div>
            <Textarea
              id="cert-additional-text"
              maxLength={150}
              placeholder="Any additional text to appear on the certificate..."
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

"use client"

import { useRef, useState } from "react"
import { Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function ImageDropzone({
  value,
  onChange,
  uploadFn,
  label,
  hint,
}: {
  value: string | null
  onChange: (url: string) => void
  uploadFn: (file: File) => Promise<{ url: string } | { error: string }>
  label: string
  hint: string
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setIsUploading(true)
    const result = await uploadFn(file)
    setIsUploading(false)

    if ("error" in result) {
      toast.error(result.error)
      return
    }
    onChange(result.url)
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div
        role="button"
        tabIndex={0}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        className={cn(
          "relative flex h-40 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 text-center",
          !isUploading && "cursor-pointer hover:bg-muted/50"
        )}
      >
        {isUploading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Upload className="size-4" />
            <span className="text-xs">Click to upload image</span>
          </div>
        )}

        {value && !isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
            }}
            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

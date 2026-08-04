"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { UploadCloud } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { importGradesAction, type ImportGradesSummary } from "@/app/admin/grading/actions"

export function ImportGradesDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fileName, setFileName] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportGradesSummary | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please select a CSV file")
      return
    }

    setFileName(file.name)
    setSummary(null)

    startTransition(async () => {
      const text = await file.text()
      const result = await importGradesAction(text)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSummary(result.data)
      if (result.data.failedRows.length === 0) {
        toast.success(`Graded ${result.data.gradedCount} attempt${result.data.gradedCount === 1 ? "" : "s"}`)
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setFileName(null)
          setSummary(null)
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        Import Grades
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Import Grades from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV exported from this Grading page (with essay scores filled in) to apply grades in
            bulk.
          </DialogDescription>
        </DialogHeader>

        <div
          onClick={() => !isPending && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-8 text-center transition-colors",
            isDragging && "border-ring bg-muted/50",
            isPending && "pointer-events-none opacity-60"
          )}
        >
          <UploadCloud className="size-6 text-muted-foreground" />
          {fileName ? (
            <p className="text-sm font-medium">{fileName}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Drag & drop your CSV here, or <span className="font-medium text-foreground">click to browse</span>
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={isPending}
            className="hidden"
          />
        </div>

        {summary && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div>{summary.gradedCount} attempt(s) graded successfully.</div>
            {summary.failedRows.length > 0 && (
              <div className="mt-2 text-destructive">
                {summary.failedRows.length} row(s) failed:
                <ul className="mt-1 list-disc pl-4">
                  {summary.failedRows.map((r, i) => (
                    <li key={i}>
                      {r.attemptId}: {r.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

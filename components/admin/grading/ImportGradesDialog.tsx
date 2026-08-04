"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

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
import { importGradesAction, type ImportGradesSummary } from "@/app/admin/grading/actions"

export function ImportGradesDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fileName, setFileName] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportGradesSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={isPending}
          className="text-sm"
        />
        {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}

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

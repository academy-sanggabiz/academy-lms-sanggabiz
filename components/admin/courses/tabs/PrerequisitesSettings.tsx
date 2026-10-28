"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { CoursePrerequisite } from "@/lib/courses-admin"
import { useCourseDraft } from "../CourseDraftContext"

export function PrerequisitesSettings({ availableCourses }: { availableCourses: CoursePrerequisite[] }) {
  const { draft, dispatch } = useCourseDraft()
  const [pickerValue, setPickerValue] = useState<string>("")

  const titleById = new Map(availableCourses.map((c) => [c.id, c.title]))
  const selected = draft.prerequisiteIds.map((id) => ({ id, title: titleById.get(id) ?? id }))
  const pickableCourses = availableCourses.filter((c) => !draft.prerequisiteIds.includes(c.id))

  function handleToggle(checked: boolean) {
    dispatch({ type: "setField", patch: { requirePrerequisites: checked } })
  }

  function handleAdd() {
    if (!pickerValue) return
    dispatch({ type: "setField", patch: { prerequisiteIds: [...draft.prerequisiteIds, pickerValue] } })
    setPickerValue("")
  }

  function handleRemove(prerequisiteCourseId: string) {
    dispatch({
      type: "setField",
      patch: { prerequisiteIds: draft.prerequisiteIds.filter((id) => id !== prerequisiteCourseId) },
    })
  }

  return (
    <section className="space-y-3">
      <h3 className="text-[17px] font-bold">Pengaturan Prasyarat</h3>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="text-sm font-medium">Wajibkan Prasyarat</div>
          <div className="text-xs text-muted-foreground">
            Peserta harus menyelesaikan kursus lain sebelum mendaftar ke kursus ini
          </div>
        </div>
        <Switch aria-label="Wajibkan prasyarat" checked={draft.requirePrerequisites} onCheckedChange={handleToggle} />
      </div>

      {draft.requirePrerequisites && (
        <div className="space-y-3 border-t border-border pt-3.5">
          <div>
            <div className="mb-2.5 text-xs font-semibold">Kursus Prasyarat</div>
            <div className="flex gap-2.5">
              <Select value={pickerValue} onValueChange={(v) => v && setPickerValue(v)}>
                <SelectTrigger aria-label="Kursus prasyarat" className="flex-1">
                  <SelectValue placeholder="Pilih kursus" />
                </SelectTrigger>
                <SelectContent>
                  {pickableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleAdd} disabled={!pickerValue}>
                Tambah
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Pilih kursus yang harus diselesaikan peserta sebelum dapat mendaftar ke kursus ini
            </p>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-col gap-2">
              {selected.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{course.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(course.id)}
                    className="shrink-0 text-destructive"
                    aria-label={`Hapus prasyarat ${course.title}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

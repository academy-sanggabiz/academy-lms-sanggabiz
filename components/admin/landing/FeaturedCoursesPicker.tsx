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

export type PickableCourse = { id: string; title: string }

export function FeaturedCoursesPicker({
  value,
  onChange,
  availableCourses,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  availableCourses: PickableCourse[]
}) {
  const [pickerValue, setPickerValue] = useState<string>("")

  const selected = value
    .map((id) => availableCourses.find((c) => c.id === id))
    .filter((c): c is PickableCourse => !!c)
  const pickableCourses = availableCourses.filter((c) => !value.includes(c.id))

  function handleAdd() {
    if (!pickerValue) return
    onChange([...value, pickerValue])
    setPickerValue("")
  }

  function handleRemove(id: string) {
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2.5">
        <Select value={pickerValue} onValueChange={(v) => v && setPickerValue(v)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {pickableCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={handleAdd} disabled={!pickerValue}>
          Add
        </Button>
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
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

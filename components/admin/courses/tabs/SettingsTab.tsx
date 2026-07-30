"use client"

import { Controller, useFormContext } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Instructor } from "@/lib/courses"
import type { CourseCertificateSettings, CoursePrerequisite } from "@/lib/courses-admin"
import type { CourseFormValues } from "../schema"
import { InstructorPicker } from "../InstructorPicker"
import { PrerequisitesSettings } from "./PrerequisitesSettings"
import { CertificateSettings } from "./CertificateSettings"

const LEVELS = ["beginner", "intermediate", "advanced"]

export function SettingsTab({
  courseId,
  instructors,
  currentInstructorId,
  requirePrerequisites,
  prerequisites,
  availableCoursesForPrerequisites,
  certificateSettings,
}: {
  courseId: string
  instructors: Instructor[]
  currentInstructorId: string | null
  requirePrerequisites: boolean
  prerequisites: CoursePrerequisite[]
  availableCoursesForPrerequisites: CoursePrerequisite[]
  certificateSettings: CourseCertificateSettings | null
}) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<CourseFormValues>()

  const enrollmentMode = watch("enrollmentMode")

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-[17px] font-bold">Basic Settings</h3>
        <div className="space-y-1.5">
          <Label htmlFor="level">Level</Label>
          <Controller
            control={control}
            name="level"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="level" className="w-full">
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[17px] font-bold">Enrollment Settings</h3>
        <Controller
          control={control}
          name="enrollmentMode"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
              <label className="flex items-start gap-2.5 rounded-lg border border-border p-3">
                <RadioGroupItem value="free" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">Free</span>
                  <span className="block text-xs text-muted-foreground">
                    Anyone can enroll at no cost.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 rounded-lg border border-border p-3">
                <RadioGroupItem value="paid" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">Paid</span>
                  <span className="block text-xs text-muted-foreground">
                    Learners pay a fixed price to enroll.
                  </span>
                </span>
              </label>
            </RadioGroup>
          )}
        />
        {enrollmentMode === "paid" && (
          <div className="space-y-1.5">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step={1000}
              {...register("price", { valueAsNumber: true })}
              placeholder="Rp 150.000"
            />
            {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
          </div>
        )}
      </section>

      <PrerequisitesSettings
        courseId={courseId}
        requirePrerequisites={requirePrerequisites}
        prerequisites={prerequisites}
        availableCourses={availableCoursesForPrerequisites}
      />

      <CertificateSettings courseId={courseId} settings={certificateSettings} />

      <section className="space-y-3">
        <h3 className="text-[17px] font-bold">Instructor Settings</h3>
        <InstructorPicker
          courseId={courseId}
          instructors={instructors}
          currentInstructorId={currentInstructorId}
        />
      </section>
    </div>
  )
}

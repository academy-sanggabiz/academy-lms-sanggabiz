"use client"

import { useFormContext } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadCourseThumbnail } from "@/lib/storage"
import { ImageDropzone } from "../ImageDropzone"
import type { CourseFormValues } from "../schema"

export function BasicInfoTab() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CourseFormValues>()

  const thumbnailUrl = watch("thumbnail_url")

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Course Title</Label>
        <Input id="title" {...register("title")} placeholder="e.g. Introduction to Web Development" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Course Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="What will learners get from this course?"
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="requirementsText">Requirements</Label>
        <Textarea
          id="requirementsText"
          {...register("requirementsText")}
          placeholder="One requirement per line"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audienceText">Who this course is for</Label>
        <Textarea
          id="audienceText"
          {...register("audienceText")}
          placeholder="One audience item per line"
          rows={3}
        />
      </div>

      <ImageDropzone
        value={thumbnailUrl || null}
        onChange={(url) => setValue("thumbnail_url", url, { shouldDirty: true })}
        uploadFn={uploadCourseThumbnail}
        label="Course Thumbnail"
        hint="PNG or JPEG, max 5MB"
      />
      {errors.thumbnail_url && <p className="text-xs text-destructive">{errors.thumbnail_url.message}</p>}
    </div>
  )
}

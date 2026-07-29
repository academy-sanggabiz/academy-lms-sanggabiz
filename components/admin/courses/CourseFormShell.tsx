"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Instructor } from "@/lib/courses"
import type { AdminCourseDetail, CoursePrerequisite } from "@/lib/courses-admin"
import { updateCourseAction } from "@/app/admin/courses/actions"

import { BasicInfoTab } from "./tabs/BasicInfoTab"
import { LessonsTab } from "./tabs/LessonsTab"
import { SettingsTab } from "./tabs/SettingsTab"
import { arrayToLines, courseFormSchema, linesToArray, type CourseFormValues } from "./schema"

export function CourseFormShell({
  course,
  instructors,
  availableCoursesForPrerequisites,
  isNew = false,
}: {
  course: AdminCourseDetail
  instructors: Instructor[]
  availableCoursesForPrerequisites: CoursePrerequisite[]
  isNew?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: isNew ? "" : course.title,
      description: course.description ?? "",
      requirementsText: arrayToLines(course.requirements ?? []),
      audienceText: arrayToLines(course.who_for ?? []),
      thumbnail_url: course.thumbnail_url ?? "",
      level: course.level ?? "",
      enrollmentMode: course.price > 0 ? "paid" : "free",
      price: course.price ?? 0,
    },
  })

  function onSubmit(values: CourseFormValues, status: "draft" | "published") {
    startTransition(async () => {
      const input = {
        title: values.title,
        description: values.description || null,
        thumbnail_url: values.thumbnail_url || null,
        price: values.enrollmentMode === "paid" ? values.price : 0,
        level: values.level || null,
        status,
        who_for: linesToArray(values.audienceText),
        requirements: linesToArray(values.requirementsText),
      }

      const result = await updateCourseAction(course.id, input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(status === "published" ? "Course published" : "Saved as draft")
      router.refresh()
    })
  }

  return (
    <FormProvider {...form}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/courses")}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="mr-3 text-xl font-bold">{isNew ? "New Course" : "Edit Course"}</h1>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={form.handleSubmit((values) => onSubmit(values, "draft"))}
            >
              Save to Draft
            </Button>
            <Button
              disabled={isPending}
              onClick={form.handleSubmit((values) => onSubmit(values, "published"))}
            >
              {course.status === "published" ? "Save" : "Publish"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <Tabs defaultValue="basic">
            <TabsList className="mb-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <BasicInfoTab />
            </TabsContent>

            <TabsContent value="lessons">
              <LessonsTab courseId={course.id} initialSections={course.sections} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab
                courseId={course.id}
                instructors={instructors}
                currentInstructorId={course.instructor?.id ?? null}
                requirePrerequisites={course.require_prerequisites}
                prerequisites={course.prerequisites}
                availableCoursesForPrerequisites={availableCoursesForPrerequisites}
                certificateSettings={course.certificate_settings}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FormProvider>
  )
}

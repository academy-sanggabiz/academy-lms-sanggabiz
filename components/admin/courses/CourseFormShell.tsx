"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNavigationBlocker } from "@/components/admin/NavigationBlockerContext"
import type { Instructor } from "@/lib/courses"
import type { AdminCourseDetail, CoursePrerequisite } from "@/lib/courses-admin"
import { updateCourseAction } from "@/app/admin/courses/actions"

import { BasicInfoTab } from "./tabs/BasicInfoTab"
import { LessonsTab } from "./tabs/LessonsTab"
import { PreviewTab } from "./tabs/PreviewTab"
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
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const { setIsBlocked } = useNavigationBlocker()

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

  const isDirty = form.formState.isDirty

  useEffect(() => {
    setIsBlocked(isDirty)
    return () => setIsBlocked(false)
  }, [isDirty, setIsBlocked])

  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  function handleBack() {
    if (isDirty) {
      setShowLeaveDialog(true)
      return
    }
    router.push("/admin/courses")
  }

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
      form.reset(values)
      router.refresh()
    })
  }

  return (
    <FormProvider {...form}>
      <div className="mx-auto max-w-[900px]">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes. Leave without saving?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push("/admin/courses")}>
                  Leave
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              className="bg-brand-gradient text-white hover:brightness-105"
              onClick={form.handleSubmit((values) => onSubmit(values, "published"))}
            >
              {course.status === "published" ? "Save" : "Publish"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <Tabs defaultValue="basic">
            <TabsList className="mb-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
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

            <TabsContent value="preview">
              <PreviewTab lessonCount={course.lesson_count} durationHours={course.duration_hours} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FormProvider>
  )
}

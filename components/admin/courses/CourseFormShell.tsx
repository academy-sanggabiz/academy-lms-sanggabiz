"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
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
import type { CourseRosterEntry } from "@/lib/learners-admin"
import type { Paginated } from "@/lib/pagination"
import { saveCourseDraftAction } from "@/app/admin/courses/actions"
import {
  countDestructiveChanges,
  courseDraftSchema,
  describeQuizIssue,
  validateQuizzes,
  type CourseDraft,
  type QuizIssue,
} from "@/lib/course-draft"

import { CourseDraftProvider, useCourseDraft } from "./CourseDraftContext"
import { RestoreDraftDialog } from "./RestoreDraftDialog"
import { useDraftAutosave } from "./useDraftAutosave"
import { BasicInfoTab } from "./tabs/BasicInfoTab"
import { LearnersTab } from "./tabs/LearnersTab"
import { LessonsTab } from "./tabs/LessonsTab"
import { PreviewTab } from "./tabs/PreviewTab"
import { SettingsTab } from "./tabs/SettingsTab"

type ShellProps = {
  course: AdminCourseDetail
  instructors: Instructor[]
  availableCoursesForPrerequisites: CoursePrerequisite[]
  roster: Paginated<CourseRosterEntry>
  isNew?: boolean
}

export function CourseFormShell(props: ShellProps) {
  return (
    <CourseDraftProvider course={props.course} isNew={props.isNew}>
      <CourseFormShellInner {...props} />
    </CourseDraftProvider>
  )
}

function CourseFormShellInner({ course, instructors, availableCoursesForPrerequisites, roster, isNew = false }: ShellProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [basicInfoErrors, setBasicInfoErrors] = useState<Record<string, string>>({})
  const [quizIssues, setQuizIssues] = useState<QuizIssue[]>([])
  const [tab, setTab] = useState("basic")
  const [pendingSave, setPendingSave] = useState<{
    status: "draft" | "published"
    data: CourseDraft
    destructive: { lessons: number; questions: number }
  } | null>(null)
  const { setIsBlocked } = useNavigationBlocker()
  const { draft, baseline, dispatch, isDirty, courseId } = useCourseDraft()
  const autosave = useDraftAutosave({ courseId, draft, baseline, isDirty, dispatch })

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

  function performSave(status: "draft" | "published", data: CourseDraft) {
    startTransition(async () => {
      const result = await saveCourseDraftAction(course.id, data, status)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(status === "published" ? "Course published" : "Saved as draft")
      dispatch({ type: "commitSaved", saved: data })
      router.refresh()
    })
  }

  function onSubmit(status: "draft" | "published") {
    const parsed = courseDraftSchema.safeParse(draft)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "")
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setBasicInfoErrors(fieldErrors)
      setTab("basic")
      toast.error("Please fix the highlighted fields")
      return
    }
    setBasicInfoErrors({})

    // Blocks Save to Draft as well as Publish -- a question with no correct
    // answer is broken either way, and the localStorage autosave means
    // refusing the save loses nothing.
    const issues = validateQuizzes(parsed.data)
    if (issues.length > 0) {
      setQuizIssues(issues)
      setTab("lessons")
      toast.error(
        issues.length === 1
          ? describeQuizIssue(issues[0])
          : `${describeQuizIssue(issues[0])} (+${issues.length - 1} more)`
      )
      return
    }
    setQuizIssues([])

    const destructive = countDestructiveChanges(parsed.data, baseline)
    if (destructive.lessons > 0 || destructive.questions > 0) {
      setPendingSave({ status, data: parsed.data, destructive })
      return
    }

    performSave(status, parsed.data)
  }

  return (
    <div className="mx-auto max-w-[900px]">
      {autosave.pendingRestore && (
        <RestoreDraftDialog
          updatedAt={autosave.pendingRestore.updatedAt}
          isStale={autosave.isStale}
          onRestore={autosave.restore}
          onDiscard={autosave.discard}
        />
      )}
      <AlertDialog open={pendingSave !== null} onOpenChange={(open) => !open && setPendingSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This save deletes content</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSave && (
                <>
                  Saving will permanently delete{" "}
                  {[
                    pendingSave.destructive.lessons > 0 &&
                      `${pendingSave.destructive.lessons} ${pendingSave.destructive.lessons === 1 ? "lesson" : "lessons"}`,
                    pendingSave.destructive.questions > 0 &&
                      `${pendingSave.destructive.questions} ${pendingSave.destructive.questions === 1 ? "question" : "questions"}`,
                  ]
                    .filter(Boolean)
                    .join(" and ")}
                  , including any learner progress or quiz attempts tied to them. This cannot be
                  undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => {
                if (!pendingSave) return
                performSave(pendingSave.status, pendingSave.data)
                setPendingSave(null)
              }}
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          <Button variant="outline" disabled={isPending} onClick={() => onSubmit("draft")}>
            Save to Draft
          </Button>
          <Button
            disabled={isPending}
            className="bg-brand-gradient text-white hover:brightness-105"
            onClick={() => onSubmit("published")}
          >
            {course.status === "published" ? "Save" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="learners">Learners</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicInfoTab errors={basicInfoErrors} />
          </TabsContent>

          <TabsContent value="lessons">
            <LessonsTab quizIssues={quizIssues} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab
              status={course.status}
              instructors={instructors}
              availableCoursesForPrerequisites={availableCoursesForPrerequisites}
            />
          </TabsContent>

          <TabsContent value="learners">
            <LearnersTab courseId={course.id} roster={roster} />
          </TabsContent>

          <TabsContent value="preview">
            <PreviewTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

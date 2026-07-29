"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CourseSection, Lesson, LessonContentType, Resource } from "@/lib/courses"
import type { AdminQuiz } from "@/lib/courses-admin"
import {
  ChevronDown,
  Clock,
  Copy,
  FileText,
  GripVertical,
  HelpCircle,
  Link2,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  createLessonAction,
  createResourceAction,
  deleteLessonAction,
  deleteResourceAction,
  duplicateLessonAction,
  updateLessonAction,
  updateResourceAction,
} from "@/app/admin/courses/lessons-actions"
import { QuizEditor } from "./QuizEditor"

const LESSON_TYPES: { value: LessonContentType; label: string; description: string }[] = [
  { value: "video", label: "Video Lesson", description: "Lesson content is primarily video-based" },
  { value: "text", label: "Text Lesson", description: "Lesson content is primarily text-based" },
  { value: "quiz", label: "Quiz Lesson", description: "Lesson is a quiz that tests earlier content" },
]

const TYPE_ICON: Record<LessonContentType, React.ComponentType<{ className?: string }>> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  mixed: FileText,
}

export function LessonsTab({ courseId, initialSections }: { courseId: string; initialSections: CourseSection[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const lessons = initialSections[0]?.lessons ?? []

  function handleAddLesson() {
    startTransition(async () => {
      const result = await createLessonAction(courseId, {
        title: "Untitled Lesson",
        content_type: "video",
        duration_seconds: null,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setExpandedId(result.data.id)
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold">Course Lessons</h3>
        <Button onClick={handleAddLesson} disabled={isPending}>
          <Plus className="size-3.5" />
          Add Lesson
        </Button>
      </div>

      {lessons.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No lessons yet — click Add Lesson to build the course.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {lessons.map((lesson, index) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={index}
              expanded={expandedId === lesson.id}
              onToggleExpand={() => setExpandedId(expandedId === lesson.id ? null : lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LessonCard({
  lesson,
  index,
  expanded,
  onToggleExpand,
}: {
  lesson: Lesson
  index: number
  expanded: boolean
  onToggleExpand: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(lesson.title)
  const [contentType, setContentType] = useState<LessonContentType>(lesson.content_type)
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "")
  const [content, setContent] = useState(lesson.content ?? "")
  const [durationMin, setDurationMin] = useState(
    lesson.duration_seconds ? String(Math.round(lesson.duration_seconds / 60)) : ""
  )

  const [contentOpen, setContentOpen] = useState(true)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isComplete =
    title.trim().length > 0 &&
    (contentType === "video"
      ? videoUrl.trim().length > 0
      : contentType === "text"
        ? content.trim().length > 0
        : true)

  function save(input: Parameters<typeof updateLessonAction>[1]) {
    startTransition(async () => {
      const result = await updateLessonAction(lesson.id, input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  function handlePickType(value: LessonContentType) {
    setContentType(value)
    save({ content_type: value })
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateLessonAction(lesson.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Lesson duplicated")
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLessonAction(lesson.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Lesson deleted")
      router.refresh()
    })
  }

  const Icon = TYPE_ICON[contentType]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2.5 bg-muted/40 px-3.5 py-3">
        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <span className="text-sm font-bold whitespace-nowrap">Lesson {index + 1}</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
            isComplete ? "bg-success text-success-foreground" : "bg-amber-100 text-amber-700"
          )}
        >
          {isComplete ? "Complete" : "Incomplete"}
        </span>
        {durationMin && (
          <span className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {durationMin} min
          </span>
        )}
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Duplicate lesson"
          onClick={handleDuplicate}
          disabled={isPending}
        >
          <Copy className="size-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button type="button" variant="ghost" size="icon-sm" title="Delete lesson" />}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{lesson.title}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the lesson and all of its resources. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="button" variant="ghost" size="icon-sm" title="Expand" onClick={onToggleExpand}>
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border p-4">
          <div className="mb-4 space-y-1.5">
            <Label htmlFor={`lesson-title-${lesson.id}`}>Lesson Title</Label>
            <Input
              id={`lesson-title-${lesson.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save({ title })}
            />
          </div>

          <div className="mb-4 space-y-3">
            <span className="text-sm font-semibold">Lesson Type</span>
            <div className="flex flex-col gap-3">
              {LESSON_TYPES.map((type) => (
                <div
                  key={type.value}
                  className="flex cursor-pointer gap-2.5"
                  onClick={() => handlePickType(type.value)}
                >
                  <div
                    className={cn(
                      "mt-0.5 size-4 shrink-0 rounded-full border-2",
                      contentType === type.value ? "border-primary bg-primary/20" : "border-border"
                    )}
                  />
                  <div>
                    <div className="text-sm font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-2 max-w-[220px] space-y-1.5">
            <Label htmlFor={`lesson-duration-${lesson.id}`}>Estimated Duration (minutes)</Label>
            <Input
              id={`lesson-duration-${lesson.id}`}
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              onBlur={() =>
                save({ duration_seconds: durationMin.trim() ? Number(durationMin) * 60 : null })
              }
            />
          </div>

          <SubSection title="Content" open={contentOpen} onToggle={() => setContentOpen((v) => !v)}>
            {contentType === "video" && (
              <div className="space-y-1.5">
                <Label htmlFor={`lesson-video-${lesson.id}`}>YouTube Video URL</Label>
                <Input
                  id={`lesson-video-${lesson.id}`}
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onBlur={() => save({ video_url: videoUrl.trim() || null })}
                />
                <p className="text-xs text-muted-foreground">
                  Paste the full YouTube link for this lesson&apos;s video
                </p>
              </div>
            )}
            {contentType === "text" && (
              <Textarea
                placeholder="Write the lesson content..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => save({ content: content.trim() || null })}
                rows={5}
              />
            )}
          </SubSection>

          <SubSection
            title={`Resources (${lesson.resources.length})`}
            open={resourcesOpen}
            onToggle={() => setResourcesOpen((v) => !v)}
          >
            <ResourcesEditor lessonId={lesson.id} resources={lesson.resources} />
          </SubSection>

          <SubSection
            title={`Quiz (${lesson.quiz?.questions.length ?? 0} questions)`}
            open={quizOpen}
            onToggle={() => setQuizOpen((v) => !v)}
          >
            <QuizEditor lessonId={lesson.id} quiz={lesson.quiz as AdminQuiz | null} />
          </SubSection>

          <SubSection title="Settings" open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)}>
            <div className="flex items-center justify-between gap-4 opacity-60">
              <div>
                <div className="text-sm font-medium">Required to Progress</div>
                <div className="text-xs text-muted-foreground">
                  Coming soon — needs a new schema not modeled yet.
                </div>
              </div>
              <Switch checked={false} disabled />
            </div>
          </SubSection>
        </div>
      )}
    </div>
  )
}

function SubSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 py-3 text-left text-sm font-semibold"
      >
        {title}
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

function ResourcesEditor({ lessonId, resources }: { lessonId: string; resources: Resource[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogType, setDialogType] = useState<"link" | "file" | null>(null)
  const [resTitle, setResTitle] = useState("")
  const [resUrl, setResUrl] = useState("")
  const [openResourceId, setOpenResourceId] = useState<string | null>(null)

  function handleAdd() {
    if (!dialogType || !resTitle.trim() || !resUrl.trim()) return
    startTransition(async () => {
      const result = await createResourceAction(lessonId, {
        title: resTitle.trim(),
        file_url: resUrl.trim(),
        type: dialogType,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setResTitle("")
      setResUrl("")
      setDialogType(null)
      router.refresh()
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await deleteResourceAction(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3.5">
        <div>
          <div className="text-sm font-bold">Resources</div>
          <div className="text-xs text-muted-foreground">
            Add files, documents, or links to supplement the lesson content
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Dialog open={dialogType === "link"} onOpenChange={(open) => setDialogType(open ? "link" : null)}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <Link2 className="size-3.5" />
              Add Link
            </DialogTrigger>
            <ResourceDialogContent
              title="Add Link"
              resTitle={resTitle}
              resUrl={resUrl}
              onTitleChange={setResTitle}
              onUrlChange={setResUrl}
              onSave={handleAdd}
              isPending={isPending}
            />
          </Dialog>
          <Dialog open={dialogType === "file"} onOpenChange={(open) => setDialogType(open ? "file" : null)}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <FileText className="size-3.5" />
              Add File
            </DialogTrigger>
            <ResourceDialogContent
              title="Add File"
              urlLabel="File URL"
              resTitle={resTitle}
              resUrl={resUrl}
              onTitleChange={setResTitle}
              onUrlChange={setResUrl}
              onSave={handleAdd}
              isPending={isPending}
            />
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {resources.map((resource) => (
          <ResourceRow
            key={resource.id}
            resource={resource}
            open={openResourceId === resource.id}
            onToggle={() => setOpenResourceId(openResourceId === resource.id ? null : resource.id)}
            onRemove={() => handleRemove(resource.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ResourceDialogContent({
  title,
  urlLabel = "URL",
  resTitle,
  resUrl,
  onTitleChange,
  onUrlChange,
  onSave,
  isPending,
}: {
  title: string
  urlLabel?: string
  resTitle: string
  resUrl: string
  onTitleChange: (v: string) => void
  onUrlChange: (v: string) => void
  onSave: () => void
  isPending: boolean
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="resource-title">Resource Title</Label>
          <Input id="resource-title" value={resTitle} onChange={(e) => onTitleChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="resource-url">{urlLabel}</Label>
          <Input
            id="resource-url"
            placeholder="https://..."
            value={resUrl}
            onChange={(e) => onUrlChange(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSave} disabled={!resTitle.trim() || !resUrl.trim() || isPending}>
          Add
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function ResourceRow({
  resource,
  open,
  onToggle,
  onRemove,
}: {
  resource: Resource
  open: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(resource.title)
  const [url, setUrl] = useState(resource.file_url)
  const Icon = resource.type === "file" ? FileText : Link2

  function save(input: Parameters<typeof updateResourceAction>[1]) {
    startTransition(async () => {
      const result = await updateResourceAction(resource.id, input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2.5 bg-muted/40 px-3 py-2.5">
        <Icon className="size-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{resource.title}</span>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
          {resource.type === "file" ? "File" : "Link"}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} disabled={isPending}>
          <X className="size-3.5 text-destructive" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onToggle}>
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {open && (
        <div className="space-y-3 bg-card p-3.5">
          <div className="space-y-1.5">
            <Label>Resource Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save({ title })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => save({ file_url: url })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { memo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
import { cn } from "@/lib/utils"
import type { LessonContentType } from "@/lib/courses"
import {
  newId,
  stripEmptyHtml,
  type DraftLesson,
  type DraftResource,
  type DraftSection,
  type QuizIssue,
} from "@/lib/course-draft"
import {
  ChevronDown,
  Clock,
  Copy,
  FileText,
  GripVertical,
  HelpCircle,
  Link2,
  Plus,
  Presentation,
  Trash2,
  Video,
  X,
} from "lucide-react"

import { useCourseDraft } from "../CourseDraftContext"
import { QuizIssuesProvider, useLessonQuizIssues } from "../QuizIssuesContext"
import { QuizEditor } from "./QuizEditor"
import { RichTextEditor } from "../RichTextEditor"
import { LessonWritingGuide } from "../LessonWritingGuide"

const LESSON_TYPES: { value: LessonContentType; label: string; description: string }[] = [
  { value: "video", label: "Pelajaran Video", description: "Konten pelajaran berupa video" },
  { value: "text", label: "Pelajaran Teks", description: "Konten pelajaran berupa teks" },
  { value: "ppt", label: "Pelajaran Slide", description: "Konten pelajaran berupa presentasi Google Slides" },
  { value: "quiz", label: "Pelajaran Kuis", description: "Pelajaran berupa kuis untuk menguji materi sebelumnya" },
]

const TYPE_ICON: Record<LessonContentType, React.ComponentType<{ className?: string }>> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  mixed: FileText,
  ppt: Presentation,
}

export function LessonsTab({ quizIssues = [] }: { quizIssues?: QuizIssue[] }) {
  const { draft, dispatch } = useCourseDraft()
  const sections = draft.sections
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(sections[0]?.id ?? null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // A blocked Save lands the admin on this tab; open straight to the first
  // offending lesson rather than making them hunt through collapsed modules.
  // Adjusted during render (not in an effect) so the tab paints already open
  // -- the sanctioned pattern for reacting to a changed prop.
  const firstIssueLessonId = quizIssues[0]?.lessonId ?? null
  const [seenIssueLessonId, setSeenIssueLessonId] = useState(firstIssueLessonId)
  if (firstIssueLessonId !== seenIssueLessonId) {
    setSeenIssueLessonId(firstIssueLessonId)
    if (firstIssueLessonId) {
      setExpandedId(firstIssueLessonId)
      const section = sections.find((s) => s.lessons.some((l) => l.id === firstIssueLessonId))
      if (section) setExpandedSectionId(section.id)
    }
  }

  // KeyboardSensor: Space/Enter picks a lesson up, arrow keys move it, Space
  // drops it, Escape cancels -- the non-mouse alternative WCAG 2.5.7 asks for.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleAddSection() {
    const id = newId()
    dispatch({ type: "addSection", id })
    setExpandedSectionId(id)
  }

  function handleAddLesson(sectionId: string) {
    const id = newId()
    dispatch({ type: "addLesson", id, sectionId })
    setExpandedId(id)
  }

  function findSectionIdForLesson(lessonId: string) {
    return sections.find((s) => s.lessons.some((l) => l.id === lessonId))?.id ?? null
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const fromSectionId = findSectionIdForLesson(active.id as string)
    const toSectionId = sections.some((s) => s.id === over.id)
      ? (over.id as string)
      : findSectionIdForLesson(over.id as string)

    if (!fromSectionId || !toSectionId) return
    if (fromSectionId === toSectionId && active.id === over.id) return

    const overLessonId = sections.some((s) => s.id === over.id) ? null : (over.id as string)
    dispatch({ type: "moveLesson", lessonId: active.id as string, toSectionId, overLessonId })
  }

  const activeLesson = activeId
    ? sections.flatMap((s) => s.lessons).find((l) => l.id === activeId)
    : null

  return (
    <QuizIssuesProvider issues={quizIssues}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[17px] font-bold">Pelajaran Kursus</h3>
        <Button onClick={handleAddSection} className="bg-brand-gradient text-white hover:brightness-105">
          <Plus className="size-3.5" />
          Tambah Modul
        </Button>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Belum ada modul. Klik Tambah Modul untuk mulai menyusun kursus.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveId(event.active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                expanded={expandedSectionId === section.id}
                onToggleExpand={() =>
                  setExpandedSectionId(expandedSectionId === section.id ? null : section.id)
                }
                onAddLesson={() => handleAddLesson(section.id)}
                expandedLessonId={expandedId}
                onToggleLessonExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLesson && (
              <div className="rounded-xl border border-ring bg-card px-3.5 py-3 text-sm font-bold shadow-lg">
                {activeLesson.title || "Pelajaran Tanpa Judul"}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </QuizIssuesProvider>
  )
}

const SectionCard = memo(function SectionCard({
  section,
  expanded,
  onToggleExpand,
  onAddLesson,
  expandedLessonId,
  onToggleLessonExpand,
}: {
  section: DraftSection
  expanded: boolean
  onToggleExpand: () => void
  onAddLesson: () => void
  expandedLessonId: string | null
  onToggleLessonExpand: (id: string) => void
}) {
  const { dispatch } = useCourseDraft()
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(section.title)

  function saveTitle() {
    setEditingTitle(false)
    if (title.trim() === section.title || !title.trim()) {
      setTitle(section.title)
      return
    }
    dispatch({ type: "renameSection", id: section.id, title: title.trim() })
  }

  function handleDelete() {
    dispatch({ type: "deleteSection", id: section.id })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2.5 bg-secondary/40 px-4 py-3">
        {editingTitle ? (
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-8 max-w-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="min-h-6 min-w-0 flex-1 truncate text-left text-sm font-bold hover:underline"
            title="Klik untuk mengganti nama"
          >
            {section.title}
          </button>
        )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {section.lessons.length} pelajaran
        </span>
        <div className="flex-1" />
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button type="button" variant="ghost" size="icon-sm" title="Hapus modul" />}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus &quot;{section.title}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                Modul ini beserta {section.lessons.length} pelajarannya (termasuk sumber belajar dan
                kuisnya) akan dihapus dari draf. Tidak ada yang dihapus dari database sampai Anda menekan Simpan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={handleDelete}
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="button" variant="ghost" size="icon-sm" title="Buka/tutup" onClick={onToggleExpand}>
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border p-4">
          {section.lessons.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Belum ada pelajaran di modul ini.
            </p>
          ) : (
            <SortableContext
              items={section.lessons.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.lessons.map((lesson, index) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  expanded={expandedLessonId === lesson.id}
                  onToggleExpand={() => onToggleLessonExpand(lesson.id)}
                />
              ))}
            </SortableContext>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onAddLesson} className="self-start">
            <Plus className="size-3.5" />
            Tambah Pelajaran
          </Button>
        </div>
      )}
    </div>
  )
})

const LessonCard = memo(function LessonCard({
  lesson,
  index,
  expanded,
  onToggleExpand,
}: {
  lesson: DraftLesson
  index: number
  expanded: boolean
  onToggleExpand: () => void
}) {
  const { dispatch } = useCourseDraft()

  const [title, setTitle] = useState(lesson.title)
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "")
  const [content, setContent] = useState(lesson.content ?? "")
  const [durationMin, setDurationMin] = useState(
    lesson.duration_seconds ? String(Math.round(lesson.duration_seconds / 60)) : ""
  )

  const [contentOpen, setContentOpen] = useState(true)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(lesson.content_type === "quiz")
  const [settingsOpen, setSettingsOpen] = useState(false)

  const contentType = lesson.content_type

  const isComplete =
    title.trim().length > 0 &&
    (contentType === "video" || contentType === "ppt"
      ? videoUrl.trim().length > 0
      : contentType === "text"
        ? content.replace(/<[^>]*>/g, "").trim().length > 0
        : contentType === "quiz"
          ? (lesson.quiz?.questions.length ?? 0) > 0
          : true)

  function save(patch: Partial<DraftLesson>) {
    dispatch({ type: "patchLesson", id: lesson.id, patch })
  }

  function handlePickType(value: LessonContentType) {
    save({ content_type: value })
  }

  function handleDuplicate() {
    dispatch({ type: "duplicateLesson", id: lesson.id })
  }

  function handleDelete() {
    dispatch({ type: "deleteLesson", id: lesson.id })
  }

  const Icon = TYPE_ICON[contentType]

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  })

  const issues = useLessonQuizIssues(lesson.id)
  // Same render-time adjustment as LessonsTab above: a failed Save must reveal
  // the Quiz sub-section holding the offending question.
  const [seenIssues, setSeenIssues] = useState(issues)
  if (issues !== seenIssues) {
    setSeenIssues(issues)
    if (issues.length > 0) setQuizOpen(true)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        issues.length > 0 && "border-destructive",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2.5 bg-muted/40 px-3.5 py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Pindahkan ${title.trim() || `pelajaran ${index + 1}`}: tekan Spasi untuk mengambil, tombol panah untuk memindahkan, Spasi untuk melepas`}
          className="-m-1 flex size-6 cursor-grab touch-none items-center justify-center rounded active:cursor-grabbing"
        >
          <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold">
          {title.trim() || `Pelajaran ${index + 1}`}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
            isComplete ? "bg-success text-success-foreground" : "bg-amber-100 text-amber-700"
          )}
        >
          {isComplete ? "Lengkap" : "Belum lengkap"}
        </span>
        {issues.length > 0 && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-destructive">
            {issues.length} masalah kuis
          </span>
        )}
        {durationMin && (
          <span className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {durationMin} menit
          </span>
        )}
        <Button type="button" variant="ghost" size="icon-sm" title="Duplikat pelajaran" onClick={handleDuplicate}>
          <Copy className="size-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button type="button" variant="ghost" size="icon-sm" title="Hapus pelajaran" />}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus &quot;{lesson.title}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                Pelajaran ini beserta seluruh sumber belajarnya akan dihapus dari draf. Tidak ada yang
                dihapus dari database sampai Anda menekan Simpan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={handleDelete}
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="button" variant="ghost" size="icon-sm" title="Buka/tutup" onClick={onToggleExpand}>
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border p-4">
          <div className="mb-4 space-y-1.5">
            <Label htmlFor={`lesson-title-${lesson.id}`}>Judul Pelajaran</Label>
            <Input
              id={`lesson-title-${lesson.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save({ title })}
            />
          </div>

          <div className="mb-4 space-y-3">
            <span className="text-sm font-semibold">Jenis Pelajaran</span>
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
            <Label htmlFor={`lesson-duration-${lesson.id}`}>Perkiraan Durasi (menit)</Label>
            <Input
              id={`lesson-duration-${lesson.id}`}
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              onBlur={() =>
                save({ duration_seconds: durationMin.trim() ? Number(durationMin) * 60 : null })
              }
              aria-describedby={`lesson-duration-help-${lesson.id}`}
            />
            <p id={`lesson-duration-help-${lesson.id}`} className="text-xs text-muted-foreground">
              Ditampilkan kepada peserta. Usahakan 5–7 menit per pelajaran.
            </p>
          </div>

          {contentType !== "quiz" && (
          <SubSection title="Konten" open={contentOpen} onToggle={() => setContentOpen((v) => !v)}>
            {contentType === "video" && (
              <div className="space-y-1.5">
                <Label htmlFor={`lesson-video-${lesson.id}`}>URL Video YouTube</Label>
                <Input
                  id={`lesson-video-${lesson.id}`}
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onBlur={() => save({ video_url: videoUrl.trim() || null })}
                />
                <p className="text-xs text-muted-foreground">
                  Tempel tautan YouTube lengkap untuk video pelajaran ini
                </p>
              </div>
            )}
            {contentType === "text" && (
              <>
                <RichTextEditor
                  ariaLabel="Konten pelajaran"
                  value={content}
                  onChange={(html) => {
                    setContent(html)
                    save({ content: stripEmptyHtml(html) })
                  }}
                />
                <LessonWritingGuide
                  html={content}
                  onUseAsDuration={(minutes) => {
                    setDurationMin(String(minutes))
                    save({ duration_seconds: minutes * 60 })
                  }}
                />
              </>
            )}
            {contentType === "ppt" && (
              <div className="space-y-1.5">
                <Label htmlFor={`lesson-slides-${lesson.id}`}>Tautan Google Slides</Label>
                <Input
                  id={`lesson-slides-${lesson.id}`}
                  placeholder="https://docs.google.com/presentation/d/.../edit"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onBlur={() => save({ video_url: videoUrl.trim() || null })}
                />
                <p className="text-xs text-muted-foreground">
                  Tempel tautan berbagi Google Slides atau tautan &quot;Publikasikan ke web&quot;
                </p>
              </div>
            )}
          </SubSection>
          )}

          <SubSection
            title={`Sumber Belajar (${lesson.resources.length})`}
            open={resourcesOpen}
            onToggle={() => setResourcesOpen((v) => !v)}
          >
            <ResourcesEditor lessonId={lesson.id} resources={lesson.resources} />
          </SubSection>

          {contentType === "quiz" && (
          <SubSection
            title={`Kuis (${lesson.quiz?.questions.length ?? 0} soal)`}
            open={quizOpen}
            onToggle={() => setQuizOpen((v) => !v)}
          >
            <QuizEditor lessonId={lesson.id} quiz={lesson.quiz} />
          </SubSection>
          )}

          <SubSection title="Pengaturan" open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)}>
            <div className="flex items-center justify-between gap-4 opacity-60">
              <div>
                <div className="text-sm font-medium">Wajib untuk Melanjutkan</div>
                <div className="text-xs text-muted-foreground">
                  Segera hadir. Memerlukan skema data baru.
                </div>
              </div>
              <Switch checked={false} disabled aria-label="Wajib untuk melanjutkan" />
            </div>
          </SubSection>
        </div>
      )}
    </div>
  )
})

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

function ResourcesEditor({ lessonId, resources }: { lessonId: string; resources: DraftResource[] }) {
  const { dispatch } = useCourseDraft()
  const [dialogType, setDialogType] = useState<"link" | "file" | null>(null)
  const [resTitle, setResTitle] = useState("")
  const [resUrl, setResUrl] = useState("")
  const [openResourceId, setOpenResourceId] = useState<string | null>(null)

  function handleAdd() {
    if (!dialogType || !resTitle.trim() || !resUrl.trim()) return
    dispatch({
      type: "addResource",
      lessonId,
      resource: { title: resTitle.trim(), file_url: resUrl.trim(), type: dialogType },
    })
    setResTitle("")
    setResUrl("")
    setDialogType(null)
  }

  function handleRemove(id: string) {
    dispatch({ type: "deleteResource", id })
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3.5">
        <div>
          <div className="text-sm font-bold">Sumber Belajar</div>
          <div className="text-xs text-muted-foreground">
            Tambahkan berkas, dokumen, atau tautan untuk melengkapi konten pelajaran
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Dialog open={dialogType === "link"} onOpenChange={(open) => setDialogType(open ? "link" : null)}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <Link2 className="size-3.5" />
              Tambah Tautan
            </DialogTrigger>
            <ResourceDialogContent
              title="Tambah Tautan"
              resTitle={resTitle}
              resUrl={resUrl}
              onTitleChange={setResTitle}
              onUrlChange={setResUrl}
              onSave={handleAdd}
            />
          </Dialog>
          <Dialog open={dialogType === "file"} onOpenChange={(open) => setDialogType(open ? "file" : null)}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <FileText className="size-3.5" />
              Tambah Berkas
            </DialogTrigger>
            <ResourceDialogContent
              title="Tambah Berkas"
              urlLabel="URL Berkas"
              resTitle={resTitle}
              resUrl={resUrl}
              onTitleChange={setResTitle}
              onUrlChange={setResUrl}
              onSave={handleAdd}
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
}: {
  title: string
  urlLabel?: string
  resTitle: string
  resUrl: string
  onTitleChange: (v: string) => void
  onUrlChange: (v: string) => void
  onSave: () => void
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="resource-title">Judul Sumber Belajar</Label>
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
        <Button onClick={onSave} disabled={!resTitle.trim() || !resUrl.trim()}>
          Tambah
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
  resource: DraftResource
  open: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const { dispatch } = useCourseDraft()
  const [title, setTitle] = useState(resource.title)
  const [url, setUrl] = useState(resource.file_url)
  const Icon = resource.type === "file" ? FileText : Link2

  function save(patch: Partial<DraftResource>) {
    dispatch({ type: "patchResource", id: resource.id, patch })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2.5 bg-muted/40 px-3 py-2.5">
        <Icon className="size-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{resource.title}</span>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
          {resource.type === "file" ? "Berkas" : "Tautan"}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Hapus ${resource.title}`}>
          <X className="size-3.5 text-destructive" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onToggle} aria-label={`Ubah ${resource.title}`} aria-expanded={open}>
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {open && (
        <div className="space-y-3 bg-card p-3.5">
          <div className="space-y-1.5">
            <Label>Judul Sumber Belajar</Label>
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

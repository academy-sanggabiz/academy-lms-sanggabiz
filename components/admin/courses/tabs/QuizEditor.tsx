"use client"

import { useState } from "react"
import { ChevronDown, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "../RichTextEditor"
import type { AuthorableQuestionType } from "@/lib/courses-admin"
import type { DraftOption, DraftQuestion, DraftQuiz } from "@/lib/course-draft"
import { QUESTION_TYPE_POINTS, REGULAR_QUIZ_MAX_ATTEMPTS } from "@/lib/courses"
import { ASSESSMENT_GRADE_WEIGHT } from "@/lib/course-grade"
import { useCourseDraft } from "../CourseDraftContext"
import { useQuestionQuizIssue } from "../QuizIssuesContext"

// Only auto-gradable types are offered for a normal quiz. Essay/file_upload
// only exist inside a study case (see "Add Study Case" below) -- a normal
// quiz must always resolve to an immediate score, never `pending_review`.
const QUESTION_TYPES: { value: AuthorableQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Pilihan Ganda" },
  { value: "true_false", label: "Benar / Salah" },
  { value: "short_answer", label: "Isian Singkat" },
]

/** Both map to Essay in the UI; the stored `type` is what selects the answer widget. */
const ANSWER_FORMATS: { value: "essay" | "file_upload"; label: string; hint: string }[] = [
  {
    value: "essay",
    label: "Jawaban tertulis",
    hint: "Peserta mengetik jawaban di kotak teks.",
  },
  {
    value: "file_upload",
    label: "Unggah berkas atau tautan",
    hint: "Peserta mengirim tautan ke berkasnya (misal Google Drive), bukan mengetik.",
  },
]

function isEssayQuestion(type: AuthorableQuestionType): type is "essay" | "file_upload" {
  return type === "essay" || type === "file_upload"
}

export function QuizEditor({ lessonId, quiz }: { lessonId: string; quiz: DraftQuiz | null }) {
  const { dispatch } = useCourseDraft()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<AuthorableQuestionType>("multiple_choice")

  function openPicker() {
    // Always start from the default rather than remembering the last pick.
    setSelectedType("multiple_choice")
    setPickerOpen(true)
  }

  function handleAddQuestion(type: AuthorableQuestionType) {
    dispatch({ type: "addQuestion", lessonId, questionType: type })
    setPickerOpen(false)
  }

  function handleAddStudyCase() {
    dispatch({ type: "addQuestion", lessonId, questionType: "essay", isAssessment: true })
  }

  const questions = quiz?.questions ?? []
  const isAssessment = quiz?.is_assessment ?? false

  return (
    <div>
      {quiz && questions.length > 0 && <QuizSettings lessonId={lessonId} quiz={quiz} />}

      {questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Belum ada soal. Tambahkan soal, atau jadikan pelajaran ini studi kasus.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} />
          ))}
        </div>
      )}

      {!isAssessment && (
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openPicker}>
            <Plus className="size-3.5" />
            Tambah Soal
          </Button>
          {questions.length === 0 && (
            <Button type="button" variant="outline" size="sm" onClick={handleAddStudyCase}>
              <Plus className="size-3.5" />
              Tambah Studi Kasus
            </Button>
          )}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Tambah Soal</DialogTitle>
            <DialogDescription>Pilih jenis soal. Jenis ini tidak dapat diubah nanti.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Jenis</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as AuthorableQuestionType)}
            >
              {QUESTION_TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-2.5 text-sm">
                  <RadioGroupItem value={t.value} />
                  {t.label}
                </label>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPickerOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="outline" onClick={() => handleAddQuestion(selectedType)}>
              Tambah Soal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuizSettings({ lessonId, quiz }: { lessonId: string; quiz: DraftQuiz }) {
  const { dispatch } = useCourseDraft()
  const [passScore, setPassScore] = useState(String(quiz.pass_score))
  const [maxAttempts, setMaxAttempts] = useState(quiz.max_attempts ? String(quiz.max_attempts) : "")

  function save(patch: Partial<Omit<DraftQuiz, "id" | "questions">>) {
    dispatch({ type: "patchQuiz", lessonId, patch })
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/30 p-3">
      <div className="w-32 space-y-1.5">
        <Label htmlFor={`pass-score-${quiz.id}`}>Nilai Lulus (%)</Label>
        <Input
          id={`pass-score-${quiz.id}`}
          type="number"
          min={0}
          max={100}
          value={passScore}
          onChange={(e) => setPassScore(e.target.value)}
          onBlur={() => save({ pass_score: Number(passScore) || 0 })}
        />
      </div>
      <div className="w-32 space-y-1.5">
        <Label htmlFor={`max-attempts-${quiz.id}`}>Maks. Percobaan</Label>
        {quiz.is_assessment ? (
          <Input
            id={`max-attempts-${quiz.id}`}
            type="number"
            min={0}
            placeholder="Tidak terbatas"
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(e.target.value)}
            onBlur={() => save({ max_attempts: maxAttempts.trim() ? Number(maxAttempts) : null })}
          />
        ) : (
          <p className="flex h-9 items-center text-sm text-muted-foreground">
            {REGULAR_QUIZ_MAX_ATTEMPTS} (tetap)
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={`shuffle-${quiz.id}`}
          checked={quiz.shuffle}
          onCheckedChange={(checked) => save({ shuffle: checked })}
        />
        <Label htmlFor={`shuffle-${quiz.id}`}>Acak Soal</Label>
      </div>
      <div className="flex w-full items-start gap-2 border-t border-border pt-3">
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            quiz.is_assessment
              ? "bg-secondary text-secondary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {quiz.is_assessment ? "Studi Kasus" : "Kuis Biasa"}
        </span>
        <p className="text-xs text-muted-foreground">
          {quiz.is_assessment
            ? `Tanpa tombol mulai atau batas waktu; peserta menyimpan draf dan mengirim jika sudah selesai. Nilai secara manual di Admin › Penilaian. Bobotnya ${ASSESSMENT_GRADE_WEIGHT}× kuis biasa dalam nilai akhir kursus.`
            : "Dinilai otomatis dan langsung mendapat skor saat dikirim."}{" "}
          Untuk mengganti mode, hapus dulu semua soal di kuis ini.
        </p>
      </div>
    </div>
  )
}

function QuestionCard({ question, index }: { question: DraftQuestion; index: number }) {
  const { dispatch } = useCourseDraft()
  const [expanded, setExpanded] = useState(false)
  const [prompt, setPrompt] = useState(question.prompt)
  const points = QUESTION_TYPE_POINTS[question.type]

  function save(patch: Partial<DraftQuestion>) {
    dispatch({ type: "patchQuestion", id: question.id, patch })
  }

  function handleDelete() {
    dispatch({ type: "deleteQuestion", id: question.id })
  }

  // file_upload has no QUESTION_TYPES entry any more -- it reads as "Essay".
  const typeLabel = isEssayQuestion(question.type)
    ? "Esai"
    : (QUESTION_TYPES.find((t) => t.value === question.type)?.label ?? question.type)

  const issue = useQuestionQuizIssue(question.id)
  // Render-time adjustment rather than an effect: a failed Save must open the
  // offending question immediately, without a second paint.
  const [seenIssue, setSeenIssue] = useState(issue)
  if (issue !== seenIssue) {
    setSeenIssue(issue)
    if (issue) setExpanded(true)
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", issue && "border-destructive")}>
      <div className="flex items-center gap-2.5 bg-muted/30 px-3 py-2">
        <span className="text-sm font-semibold whitespace-nowrap">Soal {index + 1}</span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
          {typeLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {points} poin
        </span>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleDelete} aria-label={`Hapus soal ${index + 1}`}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setExpanded((v) => !v)} aria-label={`Buka/tutup soal ${index + 1}`} aria-expanded={expanded}>
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3.5 p-3.5">
          {issue && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {issue.message}
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Pertanyaan</Label>
            <RichTextEditor
              ariaLabel={`Pertanyaan soal ${index + 1}`}
              value={prompt}
              onChange={(html) => {
                const next = html.replace(/<[^>]*>/g, "").trim() ? html : ""
                setPrompt(next)
                save({ prompt: next })
              }}
            />
          </div>
          {question.type === "multiple_choice" && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id={`allow-multiple-${question.id}`}
                  checked={question.allow_multiple}
                  onCheckedChange={(checked) => save({ allow_multiple: checked })}
                />
                <Label htmlFor={`allow-multiple-${question.id}`}>Izinkan lebih dari satu jawaban benar</Label>
              </div>
              <OptionsEditor
                questionId={question.id}
                options={question.options}
                variant={question.allow_multiple ? "multi" : "single"}
              />
            </>
          )}

          {question.type === "true_false" && <TrueFalseEditor questionId={question.id} options={question.options} />}

          {question.type === "short_answer" && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id={`case-sensitive-${question.id}`}
                  checked={question.case_sensitive}
                  onCheckedChange={(checked) => save({ case_sensitive: checked })}
                />
                <Label htmlFor={`case-sensitive-${question.id}`}>Huruf besar/kecil berpengaruh</Label>
              </div>
              <OptionsEditor questionId={question.id} options={question.options} variant="keyword" />
              {question.options.every((o) => !o.is_correct) && (
                <p className="text-xs text-destructive">
                  Tambahkan minimal satu jawaban yang diterima. Kuis biasa harus dapat dinilai otomatis.
                </p>
              )}
            </>
          )}

          {!isEssayQuestion(question.type) && (
            <div className="space-y-1.5">
              <Label htmlFor={`explanation-${question.id}`}>Penjelasan (opsional)</Label>
              <p id={`explanation-help-${question.id}`} className="text-xs text-muted-foreground">
                Ditampilkan kepada peserta setelah mengirim jawaban: mengapa jawaban itu benar, dan materi apa yang
                perlu dipelajari ulang jika salah. Cukup satu atau dua kalimat sederhana.
              </p>
              <Textarea
                id={`explanation-${question.id}`}
                aria-describedby={`explanation-help-${question.id}`}
                value={question.explanation ?? ""}
                maxLength={5000}
                onChange={(e) => save({ explanation: e.target.value })}
                placeholder="misal: Mengingat kembali lebih efektif daripada membaca ulang. Pelajari lagi pelajaran 2."
                className="min-h-[72px]"
              />
            </div>
          )}

          {isEssayQuestion(question.type) && (
            <div className="space-y-2">
              <Label>Format jawaban</Label>
              <RadioGroup
                value={question.type}
                onValueChange={(value) => save({ type: value as AuthorableQuestionType })}
              >
                {ANSWER_FORMATS.map((f) => (
                  <label key={f.value} className="flex items-start gap-2.5 text-sm">
                    <RadioGroupItem value={f.value} className="mt-0.5" />
                    <span>
                      {f.label}
                      <span className="block text-xs text-muted-foreground">{f.hint}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">Jawaban jenis ini tidak dinilai otomatis.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrueFalseEditor({ questionId, options }: { questionId: string; options: DraftOption[] }) {
  const { dispatch } = useCourseDraft()

  function handleSetCorrect(optionId: string) {
    dispatch({ type: "setCorrectOption", questionId, optionId })
  }

  return (
    <div className="space-y-2">
      <Label>Jawaban Benar</Label>
      <div className="flex gap-2.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleSetCorrect(option.id)}
            className={cn(
              "flex flex-1 items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors disabled:opacity-50",
              option.is_correct ? "border-primary bg-primary/10" : "border-border hover:border-ring"
            )}
          >
            <div
              className={cn(
                "size-4 shrink-0 rounded-full border-2",
                option.is_correct ? "border-primary bg-primary/20" : "border-border"
              )}
            />
            {option.text}
          </button>
        ))}
      </div>
    </div>
  )
}

function OptionsEditor({
  questionId,
  options,
  variant,
}: {
  questionId: string
  options: DraftOption[]
  variant: "single" | "multi" | "keyword"
}) {
  const { dispatch } = useCourseDraft()

  function handleAddOption() {
    dispatch({ type: "addOption", questionId, option: { is_correct: variant === "keyword" } })
  }

  function handleSetCorrect(optionId: string) {
    dispatch({ type: "setCorrectOption", questionId, optionId })
  }

  function handleToggleCorrect(optionId: string, isCorrect: boolean) {
    dispatch({ type: "patchOption", id: optionId, patch: { is_correct: isCorrect } })
  }

  function handleRemove(optionId: string) {
    dispatch({ type: "deleteOption", id: optionId })
  }

  return (
    <div className="space-y-2">
      <Label>{variant === "keyword" ? "Jawaban yang Diterima" : "Pilihan"}</Label>
      {options.map((option) => (
        <OptionRow
          key={option.id}
          option={option}
          variant={variant}
          onSetCorrect={() => handleSetCorrect(option.id)}
          onToggleCorrect={(checked) => handleToggleCorrect(option.id, checked)}
          onRemove={() => handleRemove(option.id)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
        <Plus className="size-3.5" />
        {variant === "keyword" ? "Tambah Jawaban" : "Tambah Pilihan"}
      </Button>
    </div>
  )
}

function OptionRow({
  option,
  variant,
  onSetCorrect,
  onToggleCorrect,
  onRemove,
}: {
  option: DraftOption
  variant: "single" | "multi" | "keyword"
  onSetCorrect: () => void
  onToggleCorrect: (checked: boolean) => void
  onRemove: () => void
}) {
  const { dispatch } = useCourseDraft()
  const [text, setText] = useState(option.text)

  function save() {
    dispatch({ type: "patchOption", id: option.id, patch: { text } })
  }

  return (
    <div className="flex items-center gap-2.5">
      {variant === "single" && (
        <button
          type="button"
          title="Tandai sebagai jawaban benar"
          onClick={onSetCorrect}
          className={cn(
            "size-4 shrink-0 rounded-full border-2",
            option.is_correct ? "border-primary bg-primary/20" : "border-border"
          )}
        />
      )}
      {variant === "multi" && (
        <button
          type="button"
          title="Tandai sebagai jawaban benar"
          onClick={() => onToggleCorrect(!option.is_correct)}
          className={cn(
            "size-4 shrink-0 rounded-sm border-2",
            option.is_correct ? "border-primary bg-primary/20" : "border-border"
          )}
        />
      )}
      <Input value={text} onChange={(e) => setText(e.target.value)} onBlur={save} className="flex-1" aria-label={variant === "keyword" ? "Jawaban yang diterima" : "Teks pilihan"} />
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Hapus pilihan">
        <X className="size-3.5 text-destructive" />
      </Button>
    </div>
  )
}

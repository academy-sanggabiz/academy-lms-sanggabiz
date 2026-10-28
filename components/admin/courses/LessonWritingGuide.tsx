"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Typical silent reading speed for instructional text; deliberately on the
// slow side because learners also study figures and re-read key sentences.
const WORDS_PER_MINUTE = 180

function countWords(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim()
  return text ? text.split(/\s+/).length : 0
}

/**
 * Live authoring guidance under a text lesson (docs/STANDAR-DIGITAL-LEARNING.md
 * §4): estimated reading time against the 5-7 minute, one-goal unit size,
 * plus the content checklist every lesson should pass. Advice only -- it
 * never blocks saving.
 */
export function LessonWritingGuide({
  html,
  onUseAsDuration,
}: {
  html: string
  onUseAsDuration: (minutes: number) => void
}) {
  const words = countWords(html)
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  const tooLong = words > 0 && minutes > 10

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-semibold text-foreground">
          {words} kata · sekitar {words === 0 ? 0 : minutes} menit membaca
        </span>
        <span className={cn(tooLong && "font-semibold text-destructive")}>
          {tooLong
            ? "Lebih dari 10 menit: pertimbangkan membaginya menjadi dua pelajaran dengan satu tujuan masing-masing."
            : "Usahakan 5–7 menit dan satu tujuan belajar per pelajaran."}
        </span>
        {words > 0 && (
          <Button type="button" variant="outline" size="xs" onClick={() => onUseAsDuration(minutes)}>
            Gunakan {minutes} menit sebagai durasi
          </Button>
        )}
      </div>
      <ul className="mt-2 list-disc space-y-0.5 pl-4">
        <li>Awali dengan satu kalimat tentang apa yang akan mampu dilakukan peserta.</li>
        <li>Gunakan subjudul dan paragraf pendek: kebanyakan pembaca memindai sebelum membaca.</li>
        <li>Jelaskan setiap istilah teknis saat pertama kali muncul.</li>
        <li>Berikan contoh dari pekerjaan nyata sebelum aturannya.</li>
        <li>Akhiri dengan latihan singkat (pelajaran kuis) agar peserta mengingat kembali isi bacaan.</li>
      </ul>
    </div>
  )
}

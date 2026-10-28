import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { getPublishedCourses } from "@/lib/courses-server"
import {
  getContinueLearning,
  getEnrolledCourseIds,
  type ContinueLearningItem,
} from "@/lib/enrollments-server"

export default async function LearnerDashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  const [
    { data: profile },
    { count: completedCount },
    { count: inProgressCount },
    enrolledCourseIds,
    publishedCourses,
    continueItems,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", claims?.sub ?? "").single(),
    supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("learner_id", claims?.sub ?? "")
      .eq("status", "completed"),
    supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("learner_id", claims?.sub ?? "")
      .eq("status", "active"),
    getEnrolledCourseIds(),
    getPublishedCourses(),
    getContinueLearning(),
  ])

  const displayName = profile?.full_name || claims?.email || "Peserta"
  const recommended = publishedCourses.filter((c) => !enrolledCourseIds.includes(c.id)).slice(0, 2)
  const [primary, ...others] = continueItems

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Halo, {displayName}</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ring">
              <BookOpen className="size-[18px]" aria-hidden />
              Kursus berjalan
            </div>
            <div className="mt-4 text-4xl leading-none font-bold">{inProgressCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-primary">
              <CheckCircle2 className="size-[18px]" aria-hidden />
              Kursus selesai
            </div>
            <div className="mt-4 text-4xl leading-none font-bold">{completedCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card className="min-h-[280px]">
          <CardContent>
            <h2 className="mb-4 text-lg font-bold">Lanjutkan belajar</h2>
            {primary ? (
              <div className="space-y-4">
                <ContinueRow item={primary} prominent />
                {others.map((item) => (
                  <ContinueRow key={item.courseId} item={item} />
                ))}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">Belum ada kursus yang sedang Anda ikuti.</p>
                <Button variant="outline" render={<Link href="/learner/courses" />} nativeButton={false}>
                  Lihat kursus
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[280px]">
          <CardContent>
            <h2 className="mb-4 text-lg font-bold">Kursus rekomendasi</h2>
            {recommended.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {recommended.map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`/learner/courses/${course.id}`}
                      className="block overflow-hidden rounded-xl border border-border hover:border-ring"
                    >
                      <div
                        className={cn(
                          "relative flex h-[110px] items-center justify-center font-mono text-[11px] text-muted-foreground",
                          !course.thumbnail_url && "course-thumb-placeholder"
                        )}
                      >
                        {course.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
                        ) : (
                          <span aria-hidden>gambar kursus</span>
                        )}
                      </div>
                      <div className="p-3.5">
                        <p className="line-clamp-2 text-sm leading-snug font-semibold">{course.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{course.lesson_count} pelajaran</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pt-2 text-sm text-muted-foreground">Belum ada rekomendasi</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * One active course: where the learner is, how far along, and the exact next
 * lesson (DL standard: honest progress counted from real lessons, plus a
 * labelled next step).
 */
function ContinueRow({ item, prominent = false }: { item: ContinueLearningItem; prominent?: boolean }) {
  const pct = Math.round((item.doneCount / item.totalCount) * 100)
  const href = item.nextLesson
    ? `/learn/${item.courseId}?lesson=${item.nextLesson.id}`
    : `/learn/${item.courseId}`

  return (
    <div className={cn("rounded-xl border border-border p-4", prominent && "bg-secondary/40")}>
      <p className="line-clamp-2 font-semibold">{item.title}</p>
      {item.nextLesson && (
        <p className="mt-1 text-sm text-muted-foreground">
          Berikutnya: pelajaran {item.nextLesson.position} dari {item.totalCount} · {item.nextLesson.title}
        </p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={`Progres ${item.title}`}
          aria-valuemin={0}
          aria-valuemax={item.totalCount}
          aria-valuenow={item.doneCount}
          aria-valuetext={`${item.doneCount} dari ${item.totalCount} pelajaran selesai`}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
        >
          <div className="h-full bg-brand-gradient" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold whitespace-nowrap text-primary">
          {item.doneCount} dari {item.totalCount} selesai
        </span>
      </div>
      {prominent ? (
        <Button
          className="mt-4 bg-brand-gradient text-white hover:brightness-105"
          render={<Link href={href} />}
          nativeButton={false}
        >
          {item.doneCount === 0 ? "Mulai" : "Lanjutkan"}: pelajaran {item.nextLesson?.position ?? item.totalCount}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      ) : (
        <Link href={href} className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-4">
          Lanjutkan
          <span className="sr-only"> {item.title}</span>
        </Link>
      )}
    </div>
  )
}

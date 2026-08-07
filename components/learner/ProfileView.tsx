"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { ArrowLeft, Award, BookOpen, Calendar, CheckCircle2, Clock, Download, Lock, Mail, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { updateProfileName } from "@/app/learner/profile/actions"
import type { EnrolledCourseSummary } from "@/lib/enrollments-server"
import type { LearnerCertificateSummary } from "@/lib/certificates-server"

type ProfileViewProps = {
  name: string
  email: string
  joinedYear: number
  enrolledCourses: EnrolledCourseSummary[]
  certificates: LearnerCertificateSummary[]
  initialTab?: "enrolled" | "certificates"
}

export function ProfileView({
  name,
  email,
  joinedYear,
  enrolledCourses,
  certificates,
  initialTab = "enrolled",
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const initial = name.charAt(0).toUpperCase()

  if (isEditing) {
    return (
      <EditProfileForm
        name={name}
        email={email}
        initial={initial}
        onDone={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-6 rounded-2xl border border-border bg-gradient-to-br from-[#e3f4f7] to-[#e8f1fc] p-8">
        <div className="relative flex-none">
          <div className="flex size-[100px] items-center justify-center rounded-full border-4 border-white bg-brand-gradient text-4xl font-semibold text-white uppercase shadow-[0_4px_14px_rgba(20,55,64,0.12)]">
            {initial}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            title="Edit profile"
            className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[0_2px_8px_rgba(20,55,64,0.15)] hover:bg-muted"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold">{name}</div>
          <div className="mt-2.5 flex flex-col gap-1.5 text-[13.5px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <Mail className="size-3.5 text-ring" />
              {email}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="size-3.5 text-ring" />
              Joined since {joinedYear}
            </span>
          </div>
        </div>
      </div>

      <ProfileTabs enrolledCourses={enrolledCourses} certificates={certificates} initialTab={initialTab} />
    </div>
  )
}

function ProfileTabs({
  enrolledCourses,
  certificates,
  initialTab,
}: {
  enrolledCourses: EnrolledCourseSummary[]
  certificates: LearnerCertificateSummary[]
  initialTab: "enrolled" | "certificates"
}) {
  const [tab, setTab] = useState<"enrolled" | "certificates">(initialTab)

  return (
    <div>
      <div className="mb-6 flex justify-center gap-1.5 rounded-lg bg-muted p-1">
        {(["enrolled", "certificates"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              tab === t ? "bg-card text-ring shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "enrolled" ? "Enrolled Courses" : "Certificates"}
          </button>
        ))}
      </div>

      {tab === "enrolled" ? (
        <div className="rounded-2xl border border-border bg-card p-7">
          <div className="mb-4 flex items-center gap-2.5 text-lg font-bold">
            <BookOpen className="size-[18px]" />
            Enrolled Courses ({enrolledCourses.length})
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="flex flex-col gap-3">
              {enrolledCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/learn/${course.id}`}
                  className="flex items-center gap-3.5 rounded-xl border border-border p-3 hover:border-ring/40 hover:bg-muted/40"
                >
                  <div className="course-thumb-placeholder h-[52px] w-[72px] flex-none rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[13.5px] leading-snug font-semibold">
                      {course.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {course.lesson_count} lessons · {course.duration_hours} hours
                    </div>
                  </div>
                  {course.status === "completed" && (
                    <span className="flex flex-none items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      <CheckCircle2 className="size-3.5" />
                      Completed
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-7 text-center">
              <p className="text-sm text-muted-foreground">You haven&apos;t enrolled in any courses yet.</p>
              <Button className="bg-brand-gradient text-white hover:brightness-105" render={<Link href="/learner/courses" />} nativeButton={false}>
                Browse Courses
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-7">
          <div className="mb-4 flex items-center gap-2.5 text-lg font-bold">
            <Award className="size-[18px]" />
            Certificates ({certificates.length})
          </div>

          {certificates.length > 0 ? (
            <div className="flex flex-col gap-3">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center gap-3.5 rounded-xl border border-border p-3.5"
                >
                  <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-brand-gradient text-white">
                    <Award className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[13.5px] leading-snug font-semibold">
                      {cert.courseTitle}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Certificate No. {cert.serial} · Issued{" "}
                      {new Date(cert.issuedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  {!cert.feedbackGiven ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/learn/${cert.courseId}`} />}
                      nativeButton={false}
                    >
                      <Lock className="size-3.5" />
                      Rate to unlock
                    </Button>
                  ) : cert.pdfUrl ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<a href={cert.pdfUrl} download target="_blank" rel="noopener noreferrer" />}
                      nativeButton={false}
                    >
                      <Download className="size-3.5" />
                      Download
                    </Button>
                  ) : (
                    <span className="flex-none text-xs text-muted-foreground">Generating…</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-7 text-center">
              <Award className="size-10 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Complete a course to earn your first certificate!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EditProfileForm({
  name,
  email,
  initial,
  onDone,
}: {
  name: string
  email: string
  initial: string
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <div className="mb-6 flex items-center gap-3.5">
        <button
          onClick={onDone}
          title="Back to profile"
          className="flex size-9 flex-none items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
        >
          <ArrowLeft className="size-[17px]" />
        </button>
        <div className="text-2xl font-bold">Edit Profile</div>
      </div>

      <form
        action={(formData) => {
          setError(null)
          startTransition(async () => {
            const result = await updateProfileName(formData)
            if (result?.error) {
              setError(result.error)
              return
            }
            onDone()
          })
        }}
        className="max-w-[560px] rounded-2xl border border-border bg-card p-7"
      >
        <div className="mb-5 flex items-center gap-5">
          <div className="flex size-[72px] flex-none items-center justify-center rounded-full border-2 border-[#e3f4f7] bg-brand-gradient text-2xl font-semibold text-white uppercase">
            {initial}
          </div>
        </div>

        <Label htmlFor="fullName" className="mb-2 block text-sm font-semibold">
          Name
        </Label>
        <Input id="fullName" name="fullName" defaultValue={name} className="mb-4 w-full" />

        <Label htmlFor="email" className="mb-2 block text-sm font-semibold">
          Email
        </Label>
        <Input id="email" value={email} disabled className="w-full bg-muted" />
        <p className="mt-1.5 mb-4 text-xs text-muted-foreground">Email cannot be changed</p>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending} className="bg-brand-gradient text-white hover:brightness-105">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

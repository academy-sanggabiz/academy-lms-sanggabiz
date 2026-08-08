import Link from "next/link"
import { Award, GraduationCap, Layers, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FeaturedCoursesCarousel } from "@/components/FeaturedCoursesCarousel"
import { SanitizedHtml } from "@/components/SanitizedHtml"
import type { Course } from "@/lib/courses"
import { getPublishedCourses } from "@/lib/courses-server"
import { getLandingContent } from "@/lib/landing-server"

const ICON_MAP: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  layers: Layers,
  award: Award,
}

export default async function Home() {
  const [{ hero, features, featuredCourseIds }, courses] = await Promise.all([
    getLandingContent(),
    getPublishedCourses(),
  ])

  const featured =
    featuredCourseIds.length > 0
      ? featuredCourseIds
          .map((id) => courses.find((c) => c.id === id))
          .filter((c): c is Course => !!c)
      : courses.slice(0, 4)

  return (
    <div className="min-h-screen bg-card">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/90 px-6 backdrop-blur-sm sm:px-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Sanggabiz" className="size-8 object-contain" />
          <span className="text-xl font-bold tracking-tight text-ring">sanggabiz</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="lg"
            className="h-10 px-5 text-sm font-semibold"
            render={<Link href="/auth/login" />} nativeButton={false}
          >
            Login
          </Button>
          <Button
            size="lg"
            className="h-10 px-5 text-sm font-semibold bg-brand-gradient text-white hover:brightness-105"
            render={<Link href="/auth/login" />} nativeButton={false}
          >
            Get Started
          </Button>
        </div>
      </header>

      <section className="flex flex-col items-center bg-gradient-to-b from-card to-background px-6 py-28 text-center sm:py-32">
        <h1 className="max-w-4xl text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
          {hero.heading} <span className="text-ring">{hero.highlightWord}</span>
        </h1>
        <SanitizedHtml
          className="lesson-prose mt-7 max-w-xl text-lg text-muted-foreground"
          html={hero.subheading}
        />
        <div className="mt-10 flex gap-3.5">
          <Button
            size="xl"
            className="bg-brand-gradient text-white hover:brightness-105"
            render={<Link href={hero.primaryCtaHref} />} nativeButton={false}
          >
            {hero.primaryCtaText}
          </Button>
          <Button size="xl" variant="outline" render={<Link href="/auth/login" />} nativeButton={false}>
            Explore Courses
          </Button>
        </div>
      </section>

      <section className="bg-background px-6 py-24 sm:px-10">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Featured Courses
        </h2>
        <p className="mt-3 mb-11 text-center text-muted-foreground">
          Start with our most popular course — free to enroll.
        </p>
        <FeaturedCoursesCarousel courses={featured} />
      </section>

      <section className="bg-card px-6 py-24 sm:px-10">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Why Choose Sanggabiz?
        </h2>
        <p className="mx-auto mt-3 mb-13 max-w-lg text-center text-muted-foreground">
          We&apos;re committed to providing exceptional learning experiences that
          drive real results.
        </p>
        <div className="mx-auto grid max-w-4xl grid-cols-1 justify-center gap-6 sm:grid-cols-3">
          {features.map(({ icon, title, description }) => {
            const Icon = ICON_MAP[icon ?? "graduation-cap"] ?? GraduationCap
            return (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-9 text-center transition-shadow hover:shadow-[0_8px_24px_rgba(20,55,64,0.08)]"
              >
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-secondary">
                  <Icon className="size-6 text-primary" />
                </div>
                <div className="mb-2.5 text-lg font-bold">{title}</div>
                <SanitizedHtml
                  className="lesson-prose text-sm leading-relaxed text-muted-foreground"
                  html={description}
                />
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-gradient-to-b from-card to-background px-6 py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to Start Learning?
        </h2>
        <p className="mx-auto mt-3.5 max-w-lg text-muted-foreground">
          Join thousands of learners who are already transforming their lives
          through our courses.
        </p>
        <div className="mt-9 flex justify-center gap-3.5">
          <Button
            size="xl"
            className="bg-brand-gradient text-white hover:brightness-105"
            render={<Link href="/auth/login" />} nativeButton={false}
          >
            Create Free Account
          </Button>
          <Button size="xl" variant="outline" render={<Link href="/auth/login" />} nativeButton={false}>
            Browse All Courses
          </Button>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-4 border-t border-border bg-card px-6 py-14 text-center">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Sanggabiz" className="size-6 object-contain" />
          <span className="text-lg font-bold text-ring">sanggabiz</span>
        </div>
        <p className="max-w-lg text-sm text-muted-foreground">
          Transform your life through knowledge with Sanggabiz. Access world-class
          courses designed to help you achieve your goals.
        </p>
        <div className="flex gap-4.5 text-[13.5px]">
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
        </div>
        <div className="text-xs text-muted-foreground">© 2026 Sanggabiz</div>
      </footer>
    </div>
  )
}

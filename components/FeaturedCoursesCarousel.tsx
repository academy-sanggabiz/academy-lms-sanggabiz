"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Course } from "@/lib/courses"
import { CourseCard } from "@/components/CourseCard"

const AUTO_ADVANCE_MS = 5000

export function FeaturedCoursesCarousel({ courses }: { courses: Course[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[index] as HTMLElement | undefined
    if (!card) return
    track.scrollTo({ left: card.offsetLeft, behavior: "smooth" })
  }, [])

  const goTo = useCallback(
    (index: number) => {
      const next = (index + courses.length) % courses.length
      scrollToIndex(next)
    },
    [courses.length, scrollToIndex]
  )

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % courses.length
        scrollToIndex(next)
        return next
      })
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [courses.length, scrollToIndex])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => {
      const cards = Array.from(track.children) as HTMLElement[]
      const nearest = cards.reduce((closest, card, i) => {
        const distance = Math.abs(card.offsetLeft - track.scrollLeft)
        const closestDistance = Math.abs(cards[closest].offsetLeft - track.scrollLeft)
        return distance < closestDistance ? i : closest
      }, 0)
      setActiveIndex(nearest)
    }
    track.addEventListener("scroll", onScroll, { passive: true })
    return () => track.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          title="Previous course"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-input bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div
          ref={trackRef}
          className="flex w-full max-w-5xl snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth [scrollbar-width:none]"
        >
          {courses.map((course) => (
            <div
              key={course.id}
              className="w-full shrink-0 snap-start sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)]"
            >
              <CourseCard course={course} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          title="Next course"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-input bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {courses.map((course, i) => (
          <button
            key={course.id}
            type="button"
            title="Go to course"
            onClick={() => goTo(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === activeIndex ? "w-6 bg-ring" : "w-2 bg-input"
            )}
          />
        ))}
      </div>
    </div>
  )
}

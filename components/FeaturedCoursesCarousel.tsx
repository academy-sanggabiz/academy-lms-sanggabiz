"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Course } from "@/lib/courses"
import { CourseCard } from "@/components/CourseCard"

const AUTO_ADVANCE_MS = 5000
const RESET_FALLBACK_MS = 400

export function FeaturedCoursesCarousel({ courses }: { courses: Course[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(activeIndex)
  const isResettingRef = useRef(false)
  const canLoop = courses.length > 1

  // Track children when looping: [clone of last, ...real courses, clone of first]
  // Real course at `realIndex` lives at child index `realIndex + 1`.
  const scrollToChild = useCallback((childIndex: number, smooth = true) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[childIndex] as HTMLElement | undefined
    if (!card) return
    track.scrollTo({ left: card.offsetLeft, behavior: smooth ? "smooth" : "auto" })
  }, [])

  const settleAfterScroll = useCallback((onSettled: () => void) => {
    const track = trackRef.current
    if (!track) {
      onSettled()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      track.removeEventListener("scrollend", finish)
      clearTimeout(fallback)
      onSettled()
    }
    const fallback = setTimeout(finish, RESET_FALLBACK_MS)
    track.addEventListener("scrollend", finish, { once: true })
  }, [])

  const jumpInstantly = useCallback((childIndex: number, nextActiveIndex: number) => {
    const track = trackRef.current
    if (!track) return
    isResettingRef.current = true
    const previousBehavior = track.style.scrollBehavior
    track.style.scrollBehavior = "auto"
    scrollToChild(childIndex, false)
    requestAnimationFrame(() => {
      track.style.scrollBehavior = previousBehavior
      isResettingRef.current = false
    })
    setActiveIndex(nextActiveIndex)
  }, [scrollToChild])

  const goTo = useCallback(
    (index: number) => {
      if (!canLoop) return
      const length = courses.length

      if (index >= length) {
        // Scroll into the appended clone of the first course, then snap back.
        scrollToChild(length + 1)
        settleAfterScroll(() => jumpInstantly(1, 0))
        return
      }

      if (index < 0) {
        // Scroll into the prepended clone of the last course, then snap back.
        scrollToChild(0)
        settleAfterScroll(() => jumpInstantly(length, length - 1))
        return
      }

      scrollToChild(index + 1)
      setActiveIndex(index)
    },
    [canLoop, courses.length, scrollToChild, settleAfterScroll, jumpInstantly]
  )

  // Land on the first real card (child index 1) without animating on mount.
  useEffect(() => {
    if (!canLoop) return
    scrollToChild(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    if (!canLoop) return
    // goTo itself drives activeIndex (directly, or via jumpInstantly after a
    // loop-wrap settle) -- calling it from a ref here instead of a
    // setActiveIndex updater keeps that as the only path, since React can
    // invoke updater functions more than once and goTo has side effects
    // (scrollTo, timers, listeners) that must run exactly once per tick.
    const id = setInterval(() => {
      goTo(activeIndexRef.current + 1)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [canLoop, goTo])

  useEffect(() => {
    const track = trackRef.current
    if (!track || !canLoop) return
    const onScroll = () => {
      if (isResettingRef.current) return
      const cards = Array.from(track.children) as HTMLElement[]
      const nearest = cards.reduce((closest, card, i) => {
        const distance = Math.abs(card.offsetLeft - track.scrollLeft)
        const closestDistance = Math.abs(cards[closest].offsetLeft - track.scrollLeft)
        return distance < closestDistance ? i : closest
      }, 0)
      const realIndex = nearest - 1
      if (realIndex >= 0 && realIndex < courses.length) {
        setActiveIndex(realIndex)
      }
    }
    track.addEventListener("scroll", onScroll, { passive: true })
    return () => track.removeEventListener("scroll", onScroll)
  }, [canLoop, courses.length])

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
          {canLoop && (
            <div
              aria-hidden
              className="w-full shrink-0 snap-start sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)]"
            >
              <CourseCard course={courses[courses.length - 1]} />
            </div>
          )}

          {courses.map((course) => (
            <div
              key={course.id}
              className="w-full shrink-0 snap-start sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)]"
            >
              <CourseCard course={course} />
            </div>
          ))}

          {canLoop && (
            <div
              aria-hidden
              className="w-full shrink-0 snap-start sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)]"
            >
              <CourseCard course={courses[0]} />
            </div>
          )}
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

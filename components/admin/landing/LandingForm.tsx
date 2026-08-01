"use client"

import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigationBlocker } from "@/components/admin/NavigationBlockerContext"
// Reused from the lesson-content editor -- generic Tiptap editor, no
// lesson-specific coupling other than its image button uploading into the
// `lesson-content` Storage bucket via uploadLessonImage (lib/storage.ts),
// which landing-page images share rather than needing their own bucket.
import { RichTextEditor } from "@/components/admin/courses/RichTextEditor"
import { LANDING_ICON_OPTIONS, type LandingContent } from "@/lib/landing"
import { saveLandingContentAction } from "@/app/admin/landing/actions"

import { FeaturedCoursesPicker, type PickableCourse } from "./FeaturedCoursesPicker"
import { landingFormSchema, type LandingFormValues } from "./schema"

export function LandingForm({
  content,
  availableCourses,
}: {
  content: LandingContent
  availableCourses: PickableCourse[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { setIsBlocked } = useNavigationBlocker()

  const form = useForm<LandingFormValues>({
    resolver: zodResolver(landingFormSchema),
    defaultValues: {
      heading: content.hero.heading,
      highlightWord: content.hero.highlightWord,
      subheading: content.hero.subheading,
      primaryCtaText: content.hero.primaryCtaText,
      primaryCtaHref: content.hero.primaryCtaHref,
      features: content.features,
      featuredCourseIds: content.featuredCourseIds,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "features",
  })

  const isDirty = form.formState.isDirty

  useEffect(() => {
    setIsBlocked(isDirty)
    return () => setIsBlocked(false)
  }, [isDirty, setIsBlocked])

  function onSubmit(values: LandingFormValues) {
    startTransition(async () => {
      const input: LandingContent = {
        hero: {
          heading: values.heading,
          highlightWord: values.highlightWord,
          subheading: values.subheading,
          primaryCtaText: values.primaryCtaText,
          primaryCtaHref: values.primaryCtaHref,
        },
        features: values.features,
        featuredCourseIds: values.featuredCourseIds,
      }

      const result = await saveLandingContentAction(input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Landing page updated")
      form.reset(values)
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-[900px] space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Landing Page</h1>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-brand-gradient text-white hover:brightness-105"
        >
          Save
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Hero</h2>

        <div className="space-y-1.5">
          <Label htmlFor="heading">Heading</Label>
          <Input id="heading" {...form.register("heading")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="highlightWord">Highlight word</Label>
          <Input id="highlightWord" {...form.register("highlightWord")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subheading">Subheading</Label>
          <Controller
            control={form.control}
            name="subheading"
            render={({ field }) => (
              <RichTextEditor value={field.value} onBlur={field.onChange} />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="primaryCtaText">Primary CTA text</Label>
            <Input id="primaryCtaText" {...form.register("primaryCtaText")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primaryCtaHref">Primary CTA link</Label>
            <Input id="primaryCtaHref" {...form.register("primaryCtaHref")} />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Features</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ icon: "graduation-cap", title: "", description: "" })}
          >
            <Plus className="size-4" />
            Add Feature
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Feature {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`features.${index}.icon`}>Icon</Label>
              <select
                id={`features.${index}.icon`}
                className="flex h-8 w-fit items-center rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...form.register(`features.${index}.icon` as const)}
              >
                {LANDING_ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`features.${index}.title`}>Title</Label>
              <Input
                id={`features.${index}.title`}
                {...form.register(`features.${index}.title` as const)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`features.${index}.description`}>Description</Label>
              <Controller
                control={form.control}
                name={`features.${index}.description` as const}
                render={({ field }) => (
                  <RichTextEditor value={field.value} onBlur={field.onChange} />
                )}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Featured Courses</h2>
        <p className="text-sm text-muted-foreground">
          Choose which published courses appear in the &quot;Featured Courses&quot; carousel
          on the public landing page.
        </p>
        <Controller
          control={form.control}
          name="featuredCourseIds"
          render={({ field }) => (
            <FeaturedCoursesPicker
              value={field.value}
              onChange={field.onChange}
              availableCourses={availableCourses}
            />
          )}
        />
      </div>
    </form>
  )
}

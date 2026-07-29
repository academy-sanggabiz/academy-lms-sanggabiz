"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"
import type { Instructor } from "@/lib/courses"
import {
  assignInstructorAction,
  createInstructorAction,
  unassignInstructorAction,
} from "@/app/admin/courses/actions"

export function InstructorPicker({
  courseId,
  instructors,
  currentInstructorId,
}: {
  courseId: string
  instructors: Instructor[]
  currentInstructorId: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")

  function handleSelect(instructorId: string) {
    startTransition(async () => {
      const result =
        instructorId === currentInstructorId
          ? await unassignInstructorAction(courseId)
          : await assignInstructorAction(courseId, instructorId)

      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(instructorId === currentInstructorId ? "Instructor removed" : "Instructor assigned")
    })
  }

  function handleCreate() {
    if (!name.trim()) return
    startTransition(async () => {
      const result = await createInstructorAction({ name: name.trim(), title: null, bio: bio.trim() || null })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const assignResult = await assignInstructorAction(courseId, result.data.id)
      if (!assignResult.ok) {
        toast.error(assignResult.error)
        return
      }
      toast.success("Instructor created and assigned")
      setName("")
      setBio("")
      setDialogOpen(false)
    })
  }

  return (
    <div className="space-y-3">
      {instructors.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          No instructors available. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {instructors.map((instructor) => {
            const selected = instructor.id === currentInstructorId
            return (
              <button
                key={instructor.id}
                type="button"
                disabled={isPending}
                onClick={() => handleSelect(instructor.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selected ? "border-primary bg-secondary" : "border-border hover:bg-muted"
                }`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {instructor.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{instructor.name}</span>
                  {instructor.bio && (
                    <span className="block truncate text-xs text-muted-foreground">{instructor.bio}</span>
                  )}
                </span>
                {selected && <span className="text-xs font-semibold text-primary">Selected ✓</span>}
              </button>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <Plus className="size-3.5" />
          Add Instructor
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Instructor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="instructor-name">Name</Label>
              <Input id="instructor-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instructor-bio">Bio</Label>
              <Textarea id="instructor-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!name.trim() || isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

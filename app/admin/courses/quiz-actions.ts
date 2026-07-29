"use server"

import { revalidatePath } from "next/cache"

import {
  createOption,
  createQuestion,
  deleteOption,
  deleteQuestion,
  setCorrectOption,
  updateOptionText,
  updateQuestion,
  updateQuiz,
  type AuthorableQuestionType,
} from "@/lib/courses-admin"
import { requireAdmin } from "@/lib/auth/require-admin"

import type { ActionResult } from "./actions"

function revalidateEditPage() {
  revalidatePath("/admin/courses/[id]/edit", "page")
}

export async function createQuestionAction(
  lessonId: string,
  input: { type: AuthorableQuestionType; prompt: string; points: number }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await createQuestion(lessonId, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: result }
}

export async function updateQuizAction(
  id: string,
  input: Partial<{ title: string; pass_score: number; max_attempts: number | null; shuffle: boolean }>
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await updateQuiz(id, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function updateQuestionAction(
  id: string,
  input: Partial<{ type: AuthorableQuestionType; prompt: string; points: number }>
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await updateQuestion(id, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function deleteQuestionAction(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await deleteQuestion(id)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function createOptionAction(
  questionId: string,
  input: { text: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await createOption(questionId, input)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: result }
}

export async function updateOptionAction(id: string, text: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await updateOptionText(id, text)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function setCorrectOptionAction(
  questionId: string,
  optionId: string
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await setCorrectOption(questionId, optionId)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

export async function deleteOptionAction(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: "Not authorized" }
  }

  const result = await deleteOption(id)
  if ("error" in result) return { ok: false, error: result.error }

  revalidateEditPage()
  return { ok: true, data: undefined }
}

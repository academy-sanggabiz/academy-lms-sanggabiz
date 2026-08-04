import { cn } from "@/lib/utils"

const HTML_TAG_RE = /<[a-z][\s\S]*>/i

export function QuestionPrompt({ prompt, className }: { prompt: string; className?: string }) {
  if (!HTML_TAG_RE.test(prompt)) {
    return <p className={cn("whitespace-pre-line", className)}>{prompt}</p>
  }
  return <div className={cn("lesson-prose", className)} dangerouslySetInnerHTML={{ __html: prompt }} />
}

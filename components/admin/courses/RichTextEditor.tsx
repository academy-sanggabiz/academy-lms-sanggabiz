"use client"

import { useEffect, useRef, useState } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import type { EditorView } from "@tiptap/pm/view"
import { StarterKit } from "@tiptap/starter-kit"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyle, Color } from "@tiptap/extension-text-style"
import { Highlight } from "@tiptap/extension-highlight"
import { Image } from "@tiptap/extension-image"
import { TableKit } from "@tiptap/extension-table/kit"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Columns3,
  Highlighter,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Palette,
  Quote,
  Rows3,
  Strikethrough,
  TableIcon,
  Trash2,
  Underline,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { uploadLessonImage } from "@/lib/storage"

const TEXT_COLORS = [
  "#14252a",
  "#1a7f91",
  "#2e7ca6",
  "#c24040",
  "#1f8a45",
  "#b45309",
  "#6d28d9",
]

const HIGHLIGHT_COLORS = ["#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#fee2e2"]

const HEADING_OPTIONS = [
  { label: "Paragraph", level: 0 as const },
  { label: "Heading 1", level: 1 as const },
  { label: "Heading 2", level: 2 as const },
  { label: "Heading 3", level: 3 as const },
]

// Google Docs pastes wrap most runs in `<span style="color:#000000">`, which our
// Color extension would otherwise apply literally, clashing with the editor's own
// muted text theme. Strip pasted color so only toolbar-applied color survives.
function stripPastedColor(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  doc.body.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    el.style.removeProperty("color")
    el.style.removeProperty("background-color")
    if (!el.getAttribute("style")) el.removeAttribute("style")
  })
  return doc.body.innerHTML
}

async function uploadAndInsert(view: EditorView, file: File, pos?: number) {
  const toastId = toast.loading("Uploading image…")
  const result = await uploadLessonImage(file)
  toast.dismiss(toastId)

  if ("error" in result) {
    toast.error(result.error)
    return
  }
  const node = view.state.schema.nodes.image.create({ src: result.url })
  const tr = pos == null ? view.state.tr.replaceSelectionWith(node) : view.state.tr.insert(pos, node)
  view.dispatch(tr)
}

// Debounce window for onUpdate -- long enough that a fast typist doesn't
// spam dispatches, short enough that autosave/beforeunload always have a
// near-current draft. Blur (and unmount) flush immediately regardless.
const UPDATE_DEBOUNCE_MS = 400

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mirrors the latest known HTML outside the debounce timer, so the unmount
  // cleanup below can flush it without touching the editor instance (Tiptap's
  // own cleanup effect destroys the editor before this effect's cleanup runs,
  // since effects clean up in reverse mount order).
  const latestHtmlRef = useRef(value)

  function scheduleUpdate(html: string) {
    latestHtmlRef.current = html
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      onChangeRef.current(html)
    }, UPDATE_DEBOUNCE_MS)
  }

  function flush(html: string) {
    latestHtmlRef.current = html
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    onChangeRef.current(html)
  }

  useEffect(() => {
    return () => {
      // Flush any pending debounced edit rather than dropping it on unmount
      // (e.g. collapsing the SubSection this editor lives in).
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
        onChangeRef.current(latestHtmlRef.current)
      }
    }
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "lesson-prose min-h-[160px] rounded-b-lg border border-t-0 border-border bg-card px-3.5 py-3 focus:outline-none",
      },
      transformPastedHTML: stripPastedColor,
      handlePaste: (view, event) => {
        const image = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"))
        if (!image) return false
        event.preventDefault()
        void uploadAndInsert(view, image)
        return true
      },
      handleDrop: (view, event) => {
        const image = Array.from(event.dataTransfer?.files ?? []).find((f) => f.type.startsWith("image/"))
        if (!image) return false
        event.preventDefault()
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        void uploadAndInsert(view, image, coords?.pos)
        return true
      },
    },
    onUpdate: ({ editor }) => scheduleUpdate(editor.getHTML()),
    onBlur: ({ editor }) => flush(editor.getHTML()),
  })

  // External value sync: needed for localStorage-restore and for the
  // post-save reseed (baseline := draft). Guarded so it never fights the
  // user's own typing/cursor position -- only fires when `value` changed
  // for a reason OTHER than this editor's own onUpdate.
  useEffect(() => {
    if (!editor) return
    if (value === editor.getHTML()) return
    editor.commands.setContent(value, { emitUpdate: false })
  }, [value, editor])

  if (!editor) return null

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setIsUploading(true)
    const result = await uploadLessonImage(file)
    setIsUploading(false)

    if ("error" in result) {
      toast.error(result.error)
      return
    }
    editor.chain().focus().setImage({ src: result.url }).run()
  }

  const activeHeading =
    HEADING_OPTIONS.find((h) => h.level > 0 && editor.isActive("heading", { level: h.level })) ??
    HEADING_OPTIONS[0]

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-border bg-muted/40 p-1.5">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="sm" className="gap-1" />}
        >
          {activeHeading.label}
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {HEADING_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.label}
              onClick={() =>
                option.level === 0
                  ? editor.chain().focus().setParagraph().run()
                  : editor.chain().focus().toggleHeading({ level: option.level }).run()
              }
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarDivider />

      <Popover>
        <PopoverTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" title="Text color" />}
        >
          <Palette className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <div className="flex gap-1.5">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="size-6 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" title="Highlight" />}
        >
          <Highlighter className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <div className="flex gap-1.5">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                className="size-6 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <ToolbarDivider />

      <ToolbarToggle
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-3.5" />
      </ToolbarToggle>

      <ToolbarDivider />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Insert image"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
      </Button>

      <ToolbarToggle
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        title="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="size-3.5" />
      </ToolbarToggle>

      <ToolbarDivider />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Insert table"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon className="size-3.5" />
      </Button>

      {editor.isActive("table") && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" className="gap-1" />}>
            Table
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
              <Rows3 className="size-3.5" />
              Add row after
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Columns3 className="size-3.5" />
              Add column after
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
              <Rows3 className="size-3.5" />
              Delete row
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
              <Columns3 className="size-3.5" />
              Delete column
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 className="size-3.5" />
              Delete table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ToolbarDivider />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" title="Text align" />}
        >
          <AlignLeft className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft className="size-3.5" />
            Left
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter className="size-3.5" />
            Center
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight className="size-3.5" />
            Right
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarToggle
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        title="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-3.5" />
      </ToolbarToggle>
    </div>
  )
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-border" />
}

function ToolbarToggle({
  title,
  active,
  onClick,
  children,
}: {
  title: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={title}
      onClick={onClick}
      className={cn(active && "bg-muted text-foreground")}
    >
      {children}
    </Button>
  )
}

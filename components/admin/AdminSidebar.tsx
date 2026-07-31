"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, BookOpen, Users, ShoppingCart, PanelLeftClose } from "lucide-react"

import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Course Management", icon: BookOpen },
  { href: "/admin/learners", label: "Learners", icon: Users },
  { href: "/admin/purchases", label: "Purchase", icon: ShoppingCart },
]

export function AdminSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-none flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200",
        open ? "w-[250px]" : "w-0 border-r-0"
      )}
    >
      <div className="flex items-center gap-2 px-4 py-4 whitespace-nowrap">
        <img src="/logo.png" alt="Sanggabiz" className="size-8 object-contain" />
        <span className="text-[17px] font-bold tracking-tight text-ring">sanggabiz</span>
        <div className="flex-1" />
        <button
          onClick={onToggle}
          className="flex size-8 flex-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Close sidebar"
        >
          <PanelLeftClose className="size-[18px]" />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-2 whitespace-nowrap">
        {navItems.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} icon={Icon} />
        ))}
      </nav>

      <div className="flex-1" />

      <div className="border-t border-border p-3 text-center whitespace-nowrap">
        <div className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} Sanggabiz</div>
      </div>
    </aside>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-[18px]" />
      {label}
    </Link>
  )
}

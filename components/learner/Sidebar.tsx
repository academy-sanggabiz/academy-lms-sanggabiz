"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, BookOpen, ShoppingCart, PanelLeftClose, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { sidebarClasses } from "@/hooks/use-mobile-nav"

const navItems = [
  { href: "/learner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/learner/courses", label: "Kursus", icon: BookOpen },
  { href: "/learner/purchase", label: "Pembelian", icon: ShoppingCart },
]

export function Sidebar({
  open,
  mobileOpen,
  onToggle,
  onCloseMobile,
}: {
  open: boolean
  mobileOpen: boolean
  onToggle: () => void
  onCloseMobile: () => void
}) {
  return (
    <aside id="app-sidebar" aria-label="Navigasi utama" className={sidebarClasses(open, mobileOpen)}>
      <div className="flex items-center gap-2 px-4 py-4 whitespace-nowrap">
        <img src="/logo.png" alt="" className="size-8 object-contain" />
        <span className="text-[17px] font-bold tracking-tight text-ring">sanggabiz</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu"
          className="flex size-8 flex-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <X className="size-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Tutup sidebar"
          className="hidden size-8 flex-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
        >
          <PanelLeftClose className="size-[18px]" aria-hidden />
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

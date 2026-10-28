"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ShoppingCart,
  PanelLeftClose,
  X,
  Layout,
  ClipboardCheck,
  Activity,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { sidebarClasses } from "@/hooks/use-mobile-nav"
import { useNavigationBlocker } from "@/components/admin/NavigationBlockerContext"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Manajemen Kursus", icon: BookOpen },
  { href: "/admin/grading", label: "Penilaian", icon: ClipboardCheck },
  { href: "/admin/tracking", label: "Pelacakan", icon: Activity },
  { href: "/admin/learners", label: "Peserta", icon: Users },
  { href: "/admin/purchases", label: "Pembelian", icon: ShoppingCart },
]

export function AdminSidebar({
  open,
  mobileOpen,
  onToggle,
  onCloseMobile,
  role,
}: {
  open: boolean
  mobileOpen: boolean
  onToggle: () => void
  onCloseMobile: () => void
  role: "admin" | "superadmin"
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
        {role === "superadmin" && (
          <NavLink href="/admin/landing" label="Halaman Depan" icon={Layout} />
        )}
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
  const { isBlocked } = useNavigationBlocker()

  return (
    <Link
      href={href}
      onNavigate={(e) => {
        if (isBlocked && !window.confirm("Ada perubahan yang belum disimpan. Tinggalkan tanpa menyimpan?")) {
          e.preventDefault()
        }
      }}
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

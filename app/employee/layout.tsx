import Link from "next/link";

const links = [
  { href: "/employee", label: "Dashboard" },
  { href: "/employee/tasks", label: "My Tasks" },
  { href: "/employee/projects", label: "My Projects" },
  { href: "/employee/timesheets", label: "Timesheets" },
  { href: "/employee/notifications", label: "Notifications" },
  { href: "/employee/profile", label: "My Profile" },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-slate-200 bg-white p-4">
        <p className="font-semibold text-slate-900 mb-4">Employee</p>
        <nav className="space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-slate-50">{children}</main>
    </div>
  );
}

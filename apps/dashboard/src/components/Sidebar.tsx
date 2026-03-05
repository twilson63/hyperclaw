import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Boxes,
  Settings,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/instances', label: 'Instances', icon: Boxes },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/docs', label: 'Docs', icon: FileText },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
              <span className="text-gray-900 font-bold text-lg">H</span>
            </div>
            <span className="text-white font-semibold text-lg">HyperClaw</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center mx-auto">
            <span className="text-gray-900 font-bold text-lg">H</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse button */}
      <div className="p-2 border-t border-gray-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
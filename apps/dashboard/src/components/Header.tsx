import { useState } from 'react'
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Settings,
} from 'lucide-react'

interface HeaderProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

export function Header({ user }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const defaultUser = {
    name: 'John Doe',
    email: 'john@example.com',
  }

  const currentUser = user || defaultUser

  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-gray-700 text-white placeholder-gray-400 pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-white font-medium">Notifications</h3>
              </div>
              <div className="p-4 text-center text-gray-400 text-sm">
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
              <span className="text-gray-900 font-semibold text-sm">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-white font-medium hidden sm:block">
              {currentUser.name}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-gray-700">
                <p className="text-white font-medium">{currentUser.name}</p>
                <p className="text-gray-400 text-sm">{currentUser.email}</p>
              </div>
              <div className="py-1">
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </a>
                <button
                  onClick={() => {
                    // Handle logout
                    setShowUserMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
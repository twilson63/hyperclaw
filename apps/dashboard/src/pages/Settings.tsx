import { User, Bell, Shield, Palette } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">Settings</h1>
        <p className="mt-1 text-gray-400 font-['IBM_Plex_Mono']">
          Manage your HyperClaw preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Account Settings */}
        <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <User className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">Account</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">Email</span>
              <span className="text-white font-['IBM_Plex_Mono'] text-sm">user@example.com</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">Plan</span>
              <span className="text-cyan-400 font-['IBM_Plex_Mono'] text-sm">Pro</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Bell className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">Instance alerts</span>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-cyan-500/50" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-5 peer-checked:bg-cyan-400 transition-all" />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">Usage warnings</span>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-cyan-500/50" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-5 peer-checked:bg-cyan-400 transition-all" />
              </div>
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">Security</h2>
          </div>
          <button className="w-full rounded-lg bg-white/5 px-4 py-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white font-['IBM_Plex_Mono'] text-sm">
            Change Password
          </button>
        </div>

        {/* Appearance */}
        <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Palette className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">Appearance</h2>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">Theme</span>
            <span className="text-white font-['IBM_Plex_Mono'] text-sm">Dark</span>
          </div>
        </div>
      </div>
    </div>
  );
}
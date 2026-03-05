import { Book, Terminal, Server, Cpu, ExternalLink } from 'lucide-react';

const docSections = [
  {
    title: 'Getting Started',
    icon: Book,
    links: [
      { name: 'Quick Start Guide', href: '#' },
      { name: 'Create Your First Instance', href: '#' },
      { name: 'Understanding HyperClaw', href: '#' },
    ],
  },
  {
    title: 'API Reference',
    icon: Terminal,
    links: [
      { name: 'Authentication', href: '#' },
      { name: 'Instances API', href: '#' },
      { name: 'Webhooks', href: '#' },
    ],
  },
  {
    title: 'Models',
    icon: Cpu,
    links: [
      { name: 'Available Models', href: '#' },
      { name: 'Model Specifications', href: '#' },
      { name: 'GPU vs CPU Selection', href: '#' },
    ],
  },
  {
    title: 'Infrastructure',
    icon: Server,
    links: [
      { name: 'Regions & Availability', href: '#' },
      { name: 'Networking', href: '#' },
      { name: 'Security', href: '#' },
    ],
  },
];

export default function Docs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">Documentation</h1>
        <p className="mt-1 text-gray-400 font-['IBM_Plex_Mono']">
          Learn how to use HyperClaw effectively
        </p>
      </div>

      {/* Quick Start */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-6">
        <h2 className="text-lg font-semibold text-white font-['Space_Grotesk'] mb-4">
          Quick Start
        </h2>
        <div className="rounded-lg bg-[#0a0a0f] p-4 font-mono text-sm overflow-x-auto">
          <div className="text-gray-500"># Install HyperClaw CLI</div>
          <div className="text-gray-300">
            <span className="text-cyan-400">$</span> npm install -g hyperclaw
          </div>
          <div className="mt-2 text-gray-500"># Create your first instance</div>
          <div className="text-gray-300">
            <span className="text-cyan-400">$</span> hyperclaw create --model llama3 --ram 8
          </div>
        </div>
      </div>

      {/* Doc Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {docSections.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-white/5 bg-[#16161f] p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <section.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">
                {section.title}
              </h2>
            </div>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-gray-400 transition-all hover:bg-white/5 hover:text-white font-['IBM_Plex_Mono'] text-sm"
                  >
                    {link.name}
                    <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* CLI Reference */}
      <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
        <h2 className="text-lg font-semibold text-white font-['Space_Grotesk'] mb-4">
          CLI Commands
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-3">
            <code className="text-cyan-400 font-mono text-sm">hyperclaw create</code>
            <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">Create a new instance</span>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-3">
            <code className="text-cyan-400 font-mono text-sm">hyperclaw list</code>
            <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">List all instances</span>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-3">
            <code className="text-cyan-400 font-mono text-sm">hyperclaw stop &lt;id&gt;</code>
            <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">Stop a running instance</span>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-3">
            <code className="text-cyan-400 font-mono text-sm">hyperclaw connect &lt;id&gt;</code>
            <span className="text-gray-400 font-['IBM_Plex_Mono'] text-sm">Connect to instance terminal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
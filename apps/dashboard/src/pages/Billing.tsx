import { CreditCard, Receipt, Download, Zap } from 'lucide-react';

export default function Billing() {
  // Mock billing data
  const currentPlan = {
    name: 'Pro',
    price: 29,
    limits: {
      instances: 10,
      ram: 64,
      storage: 500,
    },
  };

  const invoices = [
    { id: 'INV-001', date: '2024-01-15', amount: 29.00, status: 'paid' },
    { id: 'INV-002', date: '2024-02-15', amount: 29.00, status: 'paid' },
    { id: 'INV-003', date: '2024-03-15', amount: 29.00, status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">Billing</h1>
        <p className="mt-1 text-gray-400 font-['IBM_Plex_Mono']">
          Manage your subscription and invoices
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">
                {currentPlan.name} Plan
              </h2>
            </div>
            <p className="text-3xl font-bold text-white font-['Space_Grotesk']">
              ${currentPlan.price}
              <span className="text-lg text-gray-400 font-normal">/month</span>
            </p>
          </div>
          <button className="rounded-lg bg-cyan-500 px-4 py-2 text-black font-semibold transition-all hover:bg-cyan-400 font-['IBM_Plex_Mono'] text-sm">
            Upgrade
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-gray-400 text-xs font-['IBM_Plex_Mono']">Instances</p>
            <p className="text-white text-lg font-semibold font-['Space_Grotesk']">{currentPlan.limits.instances}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-gray-400 text-xs font-['IBM_Plex_Mono']">RAM</p>
            <p className="text-white text-lg font-semibold font-['Space_Grotesk']">{currentPlan.limits.ram} GB</p>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-gray-400 text-xs font-['IBM_Plex_Mono']">Storage</p>
            <p className="text-white text-lg font-semibold font-['Space_Grotesk']">{currentPlan.limits.storage} GB</p>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">Payment Method</h2>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/5 p-2">
              <CreditCard className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-white font-['IBM_Plex_Mono'] text-sm">•••• •••• •••• 4242</p>
              <p className="text-gray-500 text-xs font-['IBM_Plex_Mono']">Expires 12/25</p>
            </div>
          </div>
          <button className="rounded-lg bg-white/5 px-4 py-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white font-['IBM_Plex_Mono'] text-sm">
            Update
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Receipt className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">Invoices</h2>
        </div>
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-white font-['IBM_Plex_Mono'] text-sm">{invoice.id}</p>
                <p className="text-gray-500 text-xs font-['IBM_Plex_Mono']">{invoice.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white font-['IBM_Plex_Mono'] text-sm">${invoice.amount.toFixed(2)}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  invoice.status === 'paid' 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {invoice.status}
                </span>
                <button className="text-gray-400 hover:text-cyan-400 transition-colors">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
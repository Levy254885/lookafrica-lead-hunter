import { Bell, BookOpen, Bookmark, Briefcase, CreditCard, Gauge, KanbanSquare, LayoutDashboard, Mail, Search, Settings } from 'lucide-react';
import { LogoMark } from '@/components/brand';

const nav = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Search, label: 'Find Leads', on: true },
  { icon: Gauge, label: 'Website Audits' },
  { icon: Briefcase, label: 'Opportunities' },
  { icon: KanbanSquare, label: 'Pipeline' },
  { icon: Mail, label: 'Outreach' },
  { icon: Bookmark, label: 'Saved Searches' },
  { icon: CreditCard, label: 'Usage and Billing' },
  { icon: Settings, label: 'Settings' },
  { icon: BookOpen, label: 'Help' },
];

const stats = [
  { label: 'Leads saved', value: '24' },
  { label: 'Audits completed', value: '12' },
  { label: 'New projects', value: '7' },
  { label: 'Follow-ups due', value: '5' },
];

const rows = [
  { name: 'Acacia Dental Studio', cat: 'Healthcare', city: 'Nairobi', site: 'acaciadental.example', score: 82, status: 'New' },
  { name: 'Rift Valley Grains', cat: 'Agriculture', city: 'Nakuru', site: 'riftgrains.example', score: 74, status: 'Contacted' },
  { name: 'Tana Logistics', cat: 'Transport', city: 'Mombasa', site: 'tanalogistics.example', score: 69, status: 'Qualified' },
  { name: 'Savanna Fitness', cat: 'Fitness', city: 'Kisumu', site: 'savannafit.example', score: 61, status: 'Reviewed' },
  { name: 'Coastline Guest House', cat: 'Hospitality', city: 'Mombasa', site: 'coastlinegh.example', score: 55, status: 'New' },
];

const tone = (n: number) => (n >= 75 ? 'bg-accent-soft text-accent-fg' : 'bg-subtle text-muted');

/** Static illustration of the product with invented sample businesses. It says so in its caption. */
export function ProductPreview() {
  return (
    <figure aria-label="Illustration of the dashboard with sample data" className="m-0">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-28px_rgba(60,30,160,0.45)]" aria-hidden="true">
        <div className="grid grid-cols-1 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
          <div className="hidden border-r border-line bg-sidebar p-3 sm:block">
            <div className="mb-3 flex items-center gap-1.5">
              <LogoMark size={18} />
              <span className="text-[10px] font-bold leading-none">LOOK AFRICA</span>
            </div>
            <ul className="space-y-0.5">
              {nav.map((n) => (
                <li key={n.label} className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] ${n.on ? 'bg-accent-soft font-medium text-accent-fg' : 'text-muted'}`}>
                  <n.icon size={11} />
                  {n.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 flex-1 items-center gap-1.5 rounded-md border border-line px-2 text-[9px] text-faint">
                <Search size={10} /> Search your saved leads
              </div>
              <Bell size={12} className="text-muted" />
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[8px] font-semibold text-on-accent">DU</span>
            </div>
            <p className="mt-3 text-sm font-bold">Find Leads</p>
            <div className="mt-2 flex gap-1.5 text-[9px]">
              <span className="flex-1 truncate rounded-md border border-line px-2 py-1 text-faint">Nairobi</span>
              <span className="rounded-md border border-line px-2 py-1 text-muted">Kenya</span>
              <span className="hidden rounded-md border border-line px-2 py-1 text-muted md:block">Retail</span>
              <span className="rounded-md bg-accent px-2.5 py-1 font-medium text-on-accent">Search</span>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {stats.map((s) => (
                <div key={s.label} className="rounded-md border border-line px-2 py-1.5">
                  <p className="text-sm font-bold leading-none">{s.value}</p>
                  <p className="mt-1 truncate text-[8px] text-faint">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[10px] font-semibold">Recent leads</p>
            <table className="mt-1 w-full text-left text-[9px]">
              <thead>
                <tr className="border-b border-line text-faint">
                  <th className="py-1 font-medium">Business</th>
                  <th className="hidden py-1 font-medium md:table-cell">Location</th>
                  <th className="hidden py-1 font-medium md:table-cell">Website</th>
                  <th className="py-1 font-medium">Score</th>
                  <th className="py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-line last:border-0">
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[9px] font-bold text-accent-fg">{r.name[0]}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[10px] font-medium">{r.name}</span>
                          <span className="block text-faint">{r.cat}</span>
                        </span>
                      </div>
                    </td>
                    <td className="hidden py-1.5 text-muted md:table-cell">{r.city}</td>
                    <td className="hidden py-1.5 text-accent-fg md:table-cell">{r.site}</td>
                    <td className="py-1.5"><span className={`rounded px-1.5 py-0.5 font-semibold ${tone(r.score)}`}>{r.score}</span></td>
                    <td className="py-1.5"><span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-accent-fg">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-faint">Illustration with invented sample businesses and figures. Not real records.</figcaption>
    </figure>
  );
}

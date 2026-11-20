import { Check, ChevronDown, Filter, Globe, Search as SearchIcon } from 'lucide-react';

/*
 * Product illustrations for the public page, built as real components in the palettes of the
 * reference screens. They use invented sample businesses (example domains) and say so in a caption.
 */

export function SampleNote() {
  return <p className="mt-3 text-center text-xs text-faint">Illustration with invented sample businesses and figures. Not real records.</p>;
}

/* 1. Business table with onboarding checklist (warm white, small coloured tags) */
const rows = [
  ['Acacia Dental Studio', 'Healthcare', 'Nairobi', 'acaciadental.example', 'OpenStreetMap', '82'],
  ['Rift Valley Grains', 'Agriculture', 'Nakuru', 'riftgrains.example', 'OpenStreetMap', '74'],
  ['Tana Logistics', 'Transport', 'Mombasa', 'tanalogistics.example', 'OpenStreetMap', '69'],
  ['Savanna Fitness', 'Fitness', 'Kisumu', 'savannafit.example', 'OpenStreetMap', '61'],
  ['Coastline Guest House', 'Hospitality', 'Mombasa', 'No website found', 'OpenStreetMap', '88'],
  ['Mt Kenya Academy', 'Education', 'Nyeri', 'mtkenyaacademy.example', 'OpenStreetMap', '77'],
  ['Lake View Pharmacy', 'Healthcare', 'Kisumu', 'lakeviewpharm.example', 'OpenStreetMap', '58'],
  ['Baobab Interiors', 'Design', 'Nairobi', 'baobabinteriors.example', 'OpenStreetMap', '71'],
];
const tagCls = (s: string) => (Number(s) >= 80 ? 'bg-[#d6f0dd] text-[#14532d]' : Number(s) >= 70 ? 'bg-[#e6ddfa] text-[#3b1f86]' : 'bg-[#fbe3c2] text-[#7a3e0a]');
const steps = [
  ['Create an account', true],
  ['Run a business search', true],
  ['Save a lead', true],
  ['Run a website audit', false],
  ['Draft outreach from findings', false],
] as const;

export function BusinessTable() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e3e0d9] bg-white text-[#171717] shadow-sm" aria-hidden="true">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e3e0d9] px-4 py-2.5 text-xs">
        <span className="font-medium">Find Leads: Nairobi, Mombasa, Kisumu</span>
        <span className="ml-auto flex items-center gap-1 rounded-md border border-[#e3e0d9] px-2 py-1 text-[#6b675f]"><Filter size={12} /> No filters</span>
        <span className="rounded-md bg-[#1d4ed8] px-3 py-1.5 font-medium text-white">Save to pipeline</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-xs">
          <thead>
            <tr className="bg-[#f7f6f3] text-left text-[#6b675f]">
              <th className="w-8 border-b border-[#e3e0d9] px-3 py-2 font-normal">#</th>
              {['Business', 'Category', 'City', 'Website', 'Source', 'Score'].map((h) => (
                <th key={h} className="border-b border-[#e3e0d9] px-3 py-2 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r[0]} className="border-b border-[#eeece7] last:border-0">
                <td className="px-3 py-2 text-[#9a968d]">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{r[0]}</td>
                <td className="px-3 py-2 text-[#55524b]">{r[1]}</td>
                <td className="px-3 py-2 text-[#55524b]">{r[2]}</td>
                <td className={`px-3 py-2 ${r[3].startsWith('No') ? 'text-[#b45309]' : 'text-[#1d4ed8]'}`}>{r[3]}</td>
                <td className="px-3 py-2 text-[#55524b]">{r[4]}</td>
                <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 font-semibold ${tagCls(r[5])}`}>{r[5]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="absolute right-4 top-14 hidden w-60 rounded-xl border border-[#e3e0d9] bg-white p-3 shadow-lg md:block">
        <p className="mb-2 flex items-center justify-between text-xs font-semibold">Get started <span className="font-normal text-[#6b675f]">3 of 5</span></p>
        <ul className="space-y-1.5 text-xs">
          {steps.map(([t, done]) => (
            <li key={t} className={`flex items-center gap-2 ${done ? 'text-[#9a968d] line-through' : ''}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${done ? 'border-[#16a34a] bg-[#16a34a] text-white' : 'border-[#c9c5bb]'}`}>{done && <Check size={10} />}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* 2. Website audit dashboard (pale blue field, olive / amber / red status colours) */
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos((Math.PI * a) / 180), cy - r * Math.sin((Math.PI * a) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

function Gauge({ score }: { score: number }) {
  const ang = 180 - score * 1.8;
  const nx = 100 + 62 * Math.cos((Math.PI * ang) / 180);
  const ny = 100 - 62 * Math.sin((Math.PI * ang) / 180);
  return (
    <svg viewBox="0 0 200 120" className="mx-auto w-full max-w-[16rem]" role="img" aria-label={`Sample score ${score} out of 100`}>
      <path d={arc(100, 100, 80, 180, 126)} stroke="#c9605f" strokeWidth="22" fill="none" />
      <path d={arc(100, 100, 80, 126, 54)} stroke="#f0c36a" strokeWidth="22" fill="none" />
      <path d={arc(100, 100, 80, 54, 0)} stroke="#6b7d2e" strokeWidth="22" fill="none" />
      <line x1="100" y1="100" x2={nx} y2={ny} stroke="#1593d1" strokeWidth="5" strokeLinecap="round" />
      <circle cx="100" cy="100" r="8" fill="#fff" stroke="#1593d1" strokeWidth="3" />
      <text x="100" y="86" textAnchor="middle" fontSize="11" fill="#2a3b4a">Score</text>
    </svg>
  );
}

const vitals: [string, string, number][] = [
  ['Largest Contentful Paint', '2.1s', 38],
  ['Cumulative Layout Shift', '0.01', 12],
  ['First Contentful Paint', '1.3s', 30],
  ['Speed Index', '3.0s', 52],
  ['Total Blocking Time', '137 ms', 24],
];
const seoCards: [string, string, [string, number, string][]][] = [
  ['Title tags', '2 issues', [['Missing', 1, '#c9605f'], ['Too long', 1, '#f0c36a'], ['Duplicate', 0, '#6b7d2e']]],
  ['Meta description', '3 issues', [['Missing', 1, '#c9605f'], ['Too short', 2, '#f0c36a'], ['Duplicate', 0, '#6b7d2e']]],
  ['Heading structure', '1 issue', [['Missing H1', 0, '#6b7d2e'], ['Multiple H1', 0, '#6b7d2e'], ['Skipped levels', 1, '#f0c36a']]],
];

export function AuditDashboard() {
  const card = 'rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(20,60,90,0.08)]';
  return (
    <div className="rounded-2xl bg-[#dff1fb] p-3 text-[#16324a] sm:p-4" aria-hidden="true">
      <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <p className="text-base font-bold">Audit summary</p>
          <p className="text-xs text-[#1593d1]">https://www.example.co.ke</p>
        </div>
        <div className="flex gap-8 text-center text-xs">
          {[['Pages checked', '1'], ['Checks run', '46'], ['Status', 'Completed']].map(([l, v]) => (
            <div key={l}>
              <p className="text-[#5b7285]">{l}</p>
              {v === 'Completed' ? <span className="mt-1 inline-block rounded-full bg-[#5f7a2c] px-3 py-0.5 font-semibold text-white">{v}</span> : <p className="text-xl font-bold text-[#1593d1]">{v}</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className={card}>
          <p className="mb-2 text-sm font-bold">Site health score</p>
          <Gauge score={78} />
          <p className="-mt-1 text-center text-3xl font-bold text-[#1593d1]">78</p>
          <p className="text-center text-xs text-[#5b7285]">Needs work</p>
        </div>
        <div className={card}>
          <p className="mb-3 text-sm font-bold">Checks by result</p>
          <div className="mb-4 flex h-2.5 overflow-hidden rounded-full"><span className="w-[28%] bg-[#6b7d2e]" /><span className="w-[12%] bg-[#c9605f]" /><span className="w-[20%] bg-[#f0c36a]" /><span className="w-[40%] bg-[#1593d1]" /></div>
          {[['Passed', '28', '#6b7d2e'], ['Critical issues', '5', '#c9605f'], ['Warnings', '9', '#f0c36a'], ['Notices', '4', '#1593d1']].map(([l, v, c]) => (
            <div key={l} className="flex items-center justify-between border-b border-[#e8f1f7] py-2 text-xs last:border-0">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
              <b style={{ color: c }}>{v}</b>
            </div>
          ))}
        </div>
        <div className={card}>
          <p className="mb-3 text-sm font-bold">Core Web Vitals</p>
          {vitals.map(([l, v, pos]) => (
            <div key={l} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs"><span>{l}</span><b>{v}</b></div>
              <div className="relative mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#6b7d2e] via-[#f0c36a] to-[#c9605f]">
                <span className="absolute -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#1593d1]" style={{ left: `${pos}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mb-2 mt-4 px-1 text-sm font-bold">On-page SEO analysis</p>
      <div className="grid gap-3 md:grid-cols-3">
        {seoCards.map(([t, n, list]) => (
          <div key={t} className={card}>
            <p className="mb-2 flex items-center justify-between text-xs font-bold">{t}<span className="font-normal text-[#c9605f]">{n}</span></p>
            {list.map(([l, c, col]) => (
              <div key={l} className="flex items-center justify-between py-1.5 text-xs">
                <span>{l}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: col }}>{c}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 3. Opportunity scanner (white window, deep green accents) */
const opps = [
  ['Mt Kenya Academy', 'Education', 'Nyeri, Kenya', 'mtkenyaacademy.example', 97, ['No online application', 'Slow mobile load']],
  ['Acacia Dental Studio', 'Healthcare', 'Nairobi, Kenya', 'acaciadental.example', 94, ['No booking form', 'Missing meta description']],
  ['Coastline Guest House', 'Hospitality', 'Mombasa, Kenya', 'No website found', 93, ['No website on listing']],
];

export function OpportunityScanner() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#b9d4c8] bg-white p-4 text-[#10241d] shadow-sm sm:p-5" aria-hidden="true">
      <p className="mb-4 text-lg font-bold text-[#1d4f3f]">Opportunity scanner</p>
      <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="hidden rounded-lg border border-[#d8e6df] p-3 text-xs md:block">
          <p className="mb-3 font-semibold">Filters</p>
          {['Category', 'City'].map((f) => (
            <p key={f} className="flex items-center justify-between border-b border-[#e6efea] py-2 text-[#6b8077]">{f}<ChevronDown size={13} /></p>
          ))}
          <p className="mb-2 mt-3 font-semibold">Pipeline stage</p>
          <div className="flex flex-wrap gap-1.5">
            {['New', 'Qualified'].map((s) => <span key={s} className="rounded-full bg-[#e4f0ea] px-2.5 py-1 text-[#1d4f3f]">{s}</span>)}
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="rounded-md bg-[#e4f0ea] px-3 py-1.5 font-medium text-[#1d4f3f]">New opportunities</span>
            <span className="px-2 text-[#6b8077]">History</span>
            <span className="ml-auto rounded border border-[#d8e6df] px-2 py-1">Export CSV</span>
          </div>
          <ul className="space-y-3">
            {opps.map((o, i) => (
              <li key={o[0] as string} className={`flex flex-wrap items-center gap-4 rounded-lg border p-3 ${i === 0 ? 'border-[#1d4f3f] bg-[#f4faf7]' : 'border-[#d8e6df]'}`}>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="text-sm font-bold">{o[0] as string}</p>
                  <p className="mt-0.5 text-[#55706a]">{o[1] as string}</p>
                  <p className="text-[#55706a]">{o[2] as string}</p>
                  <p className="flex items-center gap-1 text-[#1d4f3f]"><Globe size={11} />{o[3] as string}</p>
                </div>
                <div className="flex flex-col gap-1 text-[11px]">
                  {(o[5] as string[]).map((e) => <span key={e} className="rounded-full bg-[#e4f0ea] px-2.5 py-0.5 text-[#1d4f3f]">{e}</span>)}
                </div>
                <div className="text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded bg-[#1d4f3f] text-base font-bold text-white">{o[4] as number}</span>
                  <p className="mt-1 text-[10px] leading-tight text-[#55706a]">Opportunity<br />score</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* 4. Sales pipeline (navy sidebar, blue / amber / green stage cards, charts) */
const stages: { name: string; border: string; cards: [string, string][] }[] = [
  { name: 'New', border: '#4f6ee8', cards: [['Acacia Dental Studio', 'Nairobi'], ['Baobab Interiors', 'Nairobi']] },
  { name: 'Qualified', border: '#f0b429', cards: [['Rift Valley Grains', 'Nakuru'], ['Lake View Pharmacy', 'Kisumu']] },
  { name: 'Contacted', border: '#4f6ee8', cards: [['Tana Logistics', 'Mombasa']] },
  { name: 'Won', border: '#2fb872', cards: [['Mt Kenya Academy', 'Nyeri']] },
];

export function PipelineBoard() {
  const bars = [5, 3, 2, 1];
  return (
    <div className="flex overflow-hidden rounded-2xl bg-[#eef0fb] shadow-sm" aria-hidden="true">
      <div className="hidden w-40 shrink-0 bg-[#1b2038] p-4 text-xs text-white/80 sm:block">
        <p className="mb-4 font-bold text-white">LOOK AFRICA</p>
        {['Dashboard', 'Find Leads', 'Pipeline', 'Outreach', 'Settings'].map((n) => (
          <p key={n} className={`mb-1 rounded-md px-2 py-1.5 ${n === 'Pipeline' ? 'bg-white/10 text-white' : ''}`}>{n}</p>
        ))}
      </div>
      <div className="min-w-0 flex-1 p-4 text-[#1b2038]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold">Lead pipeline</p>
          <span className="flex items-center gap-1.5 rounded-full border border-[#d5d9f0] bg-white px-3 py-1 text-xs text-[#6b7094]"><SearchIcon size={12} />Search</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stages.map((s) => (
              <div key={s.name}>
                <p className="mb-2 text-xs font-semibold">{s.name}</p>
                <div className="space-y-2">
                  {s.cards.map((c) => (
                    <div key={c[0]} className="rounded-lg border-2 bg-white p-2.5 text-xs shadow-sm" style={{ borderColor: s.border }}>
                      <p className="font-semibold leading-tight">{c[0]}</p>
                      <p className="mt-0.5 text-[#6b7094]">{c[1]}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-white p-3 text-xs shadow-sm">
            <p className="mb-2 font-semibold">Leads by stage</p>
            <div className="flex h-24 items-end gap-3">
              {bars.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="w-full rounded-t bg-[#4f6ee8]" style={{ height: `${b * 18}px` }} />
                  <span className="text-[9px] text-[#6b7094]">{stages[i].name.slice(0, 4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

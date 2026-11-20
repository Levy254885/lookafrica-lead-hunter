import Link from 'next/link';
import { ArrowRight, Briefcase, Check, Gauge, KanbanSquare, Search } from 'lucide-react';
import { MarketingShell } from '@/components/marketing/chrome';
import { FlowersLeft, FlowersRight } from '@/components/marketing/hero-art';
import { AuditDashboard, BusinessTable, OpportunityScanner, PipelineBoard, SampleNote } from '@/components/marketing/showcase';
import { loadPlans } from '@/lib/entitlements';
import { formatKes, PLAN_IDS } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const PLAN_BLURB: Record<string, string> = {
  free: 'Try the full workflow with a small monthly allowance.',
  starter: 'For individual developers and small teams.',
  pro: 'For growing agencies and serious freelancers.',
  agency: 'For teams and established agencies.',
};

/** These plan features are in the plan definition but not built yet (see PROGRESS.md), so the page says so. */
const PLANNED = /project alerts|automated discovery|team workspace|shared pipeline|automation limits/i;

const tabs = [
  { id: 'discover', icon: Search, label: 'Find businesses' },
  { id: 'audits', icon: Gauge, label: 'Audit websites' },
  { id: 'opportunities', icon: Briefcase, label: 'Spot opportunities' },
  { id: 'pipeline', icon: KanbanSquare, label: 'Manage leads' },
];

function Showcase({ id, kicker, title, text, children }: { id: string; kicker: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{kicker}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-3 text-base leading-7 text-muted">{text}</p>
        </div>
        <div className="mt-8">{children}</div>
        <SampleNote />
      </div>
    </section>
  );
}

export default async function Home() {
  const plans = await loadPlans();
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="px-3 pt-4 sm:px-6 sm:pt-6">
        <div className="relative mx-auto max-w-[78rem] overflow-hidden rounded-[1.75rem] bg-subtle px-5 pb-14 pt-14 text-center sm:pb-20 sm:pt-20">
          <FlowersLeft className="pointer-events-none absolute -bottom-6 -left-6 w-28 sm:-left-2 sm:w-52 lg:w-64" />
          <FlowersRight className="pointer-events-none absolute -right-4 top-6 w-24 sm:right-0 sm:w-44 lg:w-52" />
          <h1 className="relative mx-auto max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Find the opportunities hiding in plain sight.
          </h1>
          <p className="relative mx-auto mt-5 max-w-lg text-sm leading-6 text-muted sm:text-base">
            Discover businesses across Kenya, check their websites and see which digital services they may need. Every record shows its source and every finding shows its evidence.
          </p>
          <div className="relative mt-7 flex justify-center">
            <Link href="/signup" className="btn btn-primary h-11 px-6 text-sm">
              Start for free <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-[78rem] flex-wrap justify-center gap-2 pb-2">
          {tabs.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-subtle px-3.5 text-sm font-medium hover:bg-line">
              <t.icon size={15} aria-hidden="true" /> {t.label}
            </a>
          ))}
        </div>
      </section>

      <div id="features">
        <Showcase id="discover" kicker="Business discovery" title="A table of real businesses, with their source." text="Search by category and city. Each row records where it came from, whether a website was found, and a score that explains itself.">
          <BusinessTable />
        </Showcase>
        <Showcase id="audits" kicker="Website intelligence" title="Audits where every finding has evidence." text="Speed, SEO, accessibility and technical basics are measured and shown with the page they apply to. Nothing is guessed.">
          <AuditDashboard />
        </Showcase>
        <Showcase id="opportunities" kicker="Opportunities" title="See why a business ranks where it does." text="Observed gaps are listed separately from the services they might suggest. A gap is a reason to get in touch, not proof that someone wants to buy.">
          <OpportunityScanner />
        </Showcase>
        <Showcase id="pipeline" kicker="Lead management" title="Move prospects from first look to won." text="Save leads, keep private notes, set follow-ups and draft messages from the findings on file. You review and send every message yourself.">
          <PipelineBoard />
        </Showcase>
      </div>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-t border-line">
        <div className="container-page py-10">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent-fg">
            <span className="h-0.5 w-5 bg-accent" aria-hidden="true" /> Pricing
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Simple, transparent pricing</h2>
          <p className="mt-1 text-sm text-muted">Prices in Kenyan shillings. Upgrade any time; moving to a lower plan applies when your period ends.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_IDS.map((id) => {
              const p = plans.plans[id];
              const featured = id === 'starter';
              return (
                <section key={id} aria-labelledby={`plan-${id}`} className={`relative flex flex-col rounded-xl bg-surface p-5 ${featured ? 'border-2 border-accent' : 'border border-line'}`}>
                  {featured && <span className="absolute -top-px right-4 rounded-b-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-on-accent">Recommended</span>}
                  <h3 id={`plan-${id}`} className="text-lg font-bold">{p.name}</h3>
                  <p className="mt-0.5 min-h-[2.5rem] text-sm text-muted">{PLAN_BLURB[id]}</p>
                  <p className="mt-3 text-3xl font-extrabold tracking-tight">
                    {formatKes(p.priceKes)}
                    <span className="ml-1 text-sm font-normal text-muted">/month</span>
                  </p>
                  <Link href={id === 'free' ? '/signup' : `/signup?plan=${id}`} className={`btn mt-4 h-10 w-full ${featured ? 'btn-primary' : 'border-accent text-accent-fg'}`}>
                    Get Started
                  </Link>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex gap-2">
                        <Check size={14} className="mt-1 shrink-0 text-accent-fg" aria-hidden="true" />
                        <span>{PLANNED.test(h) ? `${h} (planned)` : h}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">
            Allowances reset monthly (UTC). Searching is free; saving a lead, running a new audit or generating an AI draft counts once. <Link href="/pricing" className="link">Full comparison and billing rules</Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-night text-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-5 py-8">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/70">
              <span className="h-0.5 w-5 bg-white/60" aria-hidden="true" /> Ready to get started?
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Turn opportunities into projects.</h2>
            <p className="mt-1 max-w-lg text-sm text-white/70">Create a free account, search your own city and judge the data yourself before paying.</p>
          </div>
          <div className="text-center">
            <Link href="/signup" className="btn btn-primary h-11 px-6 text-sm">
              Get Started Free <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <p className="mt-1.5 text-xs text-white/60">No credit card required.</p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

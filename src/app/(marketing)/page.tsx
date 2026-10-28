import Link from 'next/link';
import { ArrowRight, Briefcase, Check, Gauge, Mail, Search, Sparkles } from 'lucide-react';
import { MarketingShell } from '@/components/marketing/chrome';
import { ProductPreview } from '@/components/marketing/product-preview';
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

const checks = ['Sourced business data', 'Website audits', 'Project opportunities', 'Evidence-based drafts'];

const features = [
  { icon: Search, t: 'Business Discovery', d: 'Find businesses by country, city and category. Each record shows its source and retrieval date.' },
  { icon: Gauge, t: 'Website Audits', d: 'Check SEO, performance, accessibility and technical basics, with every finding tied to evidence.' },
  { icon: Briefcase, t: 'Project Opportunities', d: 'Browse public project listings from permitted sources, with a link to the original.' },
  { icon: Mail, t: 'Proposal Drafts', d: 'Draft messages from real findings on file. You review, edit and send them yourself.' },
];

export default async function Home() {
  const plans = await loadPlans();
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="overflow-hidden">
        <div className="container-page grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:py-14">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-fg">
              <Sparkles size={13} aria-hidden="true" /> Smarter leads. Real opportunities.
            </p>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Find real clients.
              <br />
              Audit their websites.
              <br />
              <span className="text-accent-fg">Win more projects.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              LOOK AFRICA Lead Hunter helps you discover businesses, audit their websites and track public project opportunities, with the source and evidence shown on every record.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary h-11 px-5 text-sm">
                Get Started Free <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/#pricing" className="btn h-11 px-5 text-sm">
                View pricing
              </Link>
            </div>
            <ul className="mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {checks.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <Check size={15} className="shrink-0 text-accent-fg" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-line">
        <div className="container-page py-10">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent-fg">
            <span className="h-0.5 w-5 bg-accent" aria-hidden="true" /> Everything you need
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Built for results, not busy work</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line">
            {features.map((f) => (
              <div key={f.t} className="lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-fg">
                  <f.icon size={18} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-bold">{f.t}</h3>
                <p className="mt-1 text-sm text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-sidebar">
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

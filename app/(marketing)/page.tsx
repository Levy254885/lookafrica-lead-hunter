import Link from 'next/link';
import { ArrowRight, ClipboardList, FileSearch, Gauge, KanbanSquare, Mail, Search, Telescope } from 'lucide-react';
import { MarketingShell } from '@/components/marketing/chrome';
import { PricingTable, UsageRules } from '@/components/marketing/pricing';
import { loadPlans } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

const faqs: { q: string; a: string }[] = [
  {
    q: 'How accurate are the leads?',
    a: 'Business records come from the source named on each result and are shown as reported by that source. We do not independently confirm them. Open data such as OpenStreetMap is contributed by volunteers, so coverage and freshness vary by city and category. Every record shows its source, a link to the original, and the date it was retrieved. Technical website findings come from audits we run ourselves and carry a timestamp.',
  },
  {
    q: 'Does "no website listed" mean a business has no website?',
    a: 'No. It means that source has no website recorded for that business. The business may have one the source does not know about. We label this as an inference and recommend running an audit or checking manually before you say anything to the business.',
  },
  {
    q: 'Where does the data come from?',
    a: 'Business discovery currently uses OpenStreetMap through the Overpass API. Website audits combine direct checks from our servers with Google PageSpeed Insights. Project opportunities come from a public listings API once an operator has confirmed its terms permit it. If a source is not configured, the app says so instead of showing placeholder results.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Free plan has 10 lead records, 3 website audits and 5 AI drafts per month, with a basic pipeline. No payment details are needed.',
  },
  {
    q: 'How do payments and renewals work in Kenya?',
    a: 'Checkout is handled by Pesapal, which supports M-Pesa and cards. M-Pesa payments are one-off: you pay for each 30-day period and we do not pretend they renew automatically. Card payments can opt in to recurring billing on Pesapal\'s page where Pesapal supports it. Your plan changes only after our server has confirmed the payment with Pesapal, never because you visited a success page.',
  },
  {
    q: 'Can I cancel?',
    a: 'Yes, from Usage and Billing. Cancelling stops renewal and keeps paid access until the end of the period you already paid for. We do not refund the unused part of a period unless required by law; see the terms.',
  },
  {
    q: 'What happens if I reach my limit?',
    a: 'The action is refused with a clear message and nothing is charged. Your data stays available. You can wait for the monthly reset or upgrade.',
  },
  {
    q: 'What happens if a payment fails or my plan ends?',
    a: 'A short grace period applies to a lapsed paid plan, after which the account returns to Free limits. Your saved leads, notes and drafts are kept; you simply cannot add beyond the Free allowance or use paid features.',
  },
  {
    q: 'Is it available outside Kenya?',
    a: 'Search covers Kenya, Uganda, Tanzania, Rwanda, Ethiopia, Nigeria, Ghana and South Africa. Data quality will differ by country. Payments are in Kenyan shillings via Pesapal for now. International billing is not set up yet.',
  },
  {
    q: 'Does it send messages for me?',
    a: 'No. It drafts messages from evidence on file and you review, edit and send them yourself. Automated sending is deliberately not enabled. Drafts include an opt-out line and you can keep a suppression list.',
  },
  {
    q: 'What happens to my data?',
    a: 'Your leads, notes, drafts and pipeline are private to your account and are not visible to other customers. You can export leads to CSV on paid plans and delete your account, which removes your private data. See the privacy policy for details.',
  },
];

export default async function Home() {
  const plans = await loadPlans();
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-accent">For developers and digital agencies</p>
            <h1 className="text-4xl font-semibold tracking-tight">Find your next client. Start with evidence.</h1>
            <p className="mt-4 max-w-prose text-lg text-muted">
              Discover businesses, uncover website improvement opportunities, and track public project opportunities from one workspace built for developers and digital agencies.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary h-10 px-4">
                Start for free <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/#how-it-works" className="btn h-10 px-4">
                Explore how it works
              </Link>
            </div>
            <p className="mt-4 text-sm text-faint">Free plan available. No card required. Initially focused on Kenya.</p>
          </div>

          <figure aria-label="Example of an audit finding" className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Audit finding</span>
              <span className="badge badge-info">Format example</span>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Meta description</span>
                <span className="badge badge-bad">Fail</span>
              </div>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
                <dt className="text-muted">Evidence</dt>
                <dd>No meta description was found in the served HTML.</dd>
                <dt className="text-muted">Basis</dt>
                <dd>
                  <span className="badge badge-info">Measured</span> on the home page at the audit time
                </dd>
                <dt className="text-muted">Why it matters</dt>
                <dd>Search engines often use it as the snippet under the title.</dd>
                <dt className="text-muted">Recommendation</dt>
                <dd>Add a description of roughly 50 to 160 characters.</dd>
              </dl>
            </div>
            <figcaption className="border-t border-line bg-subtle px-4 py-2 text-xs text-muted">
              Illustrates how every finding is structured. This is a format example, not a result for a real business.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* What it is / who it is for */}
      <section className="container-page grid gap-8 py-16 md:grid-cols-3">
        <div>
          <h2 className="text-lg font-semibold">What it is</h2>
          <p className="mt-2 text-sm text-muted">LOOK AFRICA Lead Hunter is a subscription workspace that combines business discovery, evidence-based website audits, public project listings, lead qualification and proposal drafting.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Who it is for</h2>
          <p className="mt-2 text-sm text-muted">Freelance and full-stack developers, web and software agencies, SEO professionals, digital marketing teams, and automation and AI consultants.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">The problem</h2>
          <p className="mt-2 text-sm text-muted">Finding clients means searching directories by hand, guessing who needs help, checking sites one at a time, and losing track of follow-ups. Outreach built on guesses is easy to ignore and easy to get wrong.</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-line bg-surface py-16">
        <div className="container-page">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-4">
            {[
              { icon: Search, t: 'Discover', d: 'Search businesses by country, city and category, and browse public project listings.' },
              { icon: FileSearch, t: 'Inspect evidence', d: 'Run an audit and read each finding with its evidence, severity and whether it was measured or unavailable.' },
              { icon: Mail, t: 'Draft a proposal', d: 'Generate a draft that uses only facts on file. Edit it, copy it, and send it yourself.' },
              { icon: KanbanSquare, t: 'Track follow-ups', d: 'Move leads through your pipeline with notes, follow-up dates and an activity log.' },
            ].map((s, i) => (
              <li key={s.t} className="border-t-2 border-accent pt-4">
                <p className="text-xs font-medium text-faint">Step {i + 1}</p>
                <h3 className="mt-1 flex items-center gap-2 font-semibold">
                  <s.icon size={16} className="text-accent" aria-hidden="true" />
                  {s.t}
                </h3>
                <p className="mt-2 text-sm text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Capabilities */}
      <section className="container-page py-16">
        <h2 className="text-2xl font-semibold tracking-tight">What you can do</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Telescope, t: 'Business search', d: 'Filter by country, city, category and website status. Results are deduplicated and show their source and retrieval date.' },
            { icon: Gauge, t: 'Website audits', d: 'HTTP and redirect checks, title, description, canonical, robots, sitemap, HTTPS, image alt text, a sample of internal links, plus mobile performance and Core Web Vitals from PageSpeed Insights where Google has data.' },
            { icon: ClipboardList, t: 'Project opportunities', d: 'Public project listings with a link to the original, the publication date, and when we last checked them. We do not claim a listing is still open unless we checked.' },
            { icon: Search, t: 'Lead scoring', d: 'A transparent prioritization estimate from five factors, each explained. It is not a probability that a business will buy.' },
            { icon: Mail, t: 'Proposal drafts', d: 'Drafts built from real audit findings. No invented problems, connections or urgency.' },
            { icon: KanbanSquare, t: 'Pipeline', d: 'Table and board views, notes, tags, follow-up dates, outcomes and an activity history.' },
          ].map((c) => (
            <div key={c.t}>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <c.icon size={16} className="text-accent" aria-hidden="true" />
                {c.t}
              </h3>
              <p className="mt-2 text-sm text-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data transparency */}
      <section id="data" className="border-y border-line bg-surface py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Where the data comes from</h2>
            <p className="mt-3 text-sm text-muted">Every record shows its source, a link to the original, the retrieval date, and the date the source says it was last checked, when it says so. Sources we cannot use lawfully are not used. We do not scrape sites that do not permit it, and we do not work around logins, CAPTCHAs or paywalls.</p>
            <table className="tbl mt-5">
              <caption className="sr-only">Connected data sources</caption>
              <thead>
                <tr><th scope="col">Source</th><th scope="col">Used for</th></tr>
              </thead>
              <tbody>
                <tr><td>OpenStreetMap (Overpass API)</td><td>Business discovery</td></tr>
                <tr><td>Google PageSpeed Insights</td><td>Mobile performance, Core Web Vitals, accessibility and SEO checks</td></tr>
                <tr><td>Direct checks from our servers</td><td>Redirects, HTTPS, page metadata, robots.txt, sitemap, links</td></tr>
                <tr><td>Remotive jobs API (when enabled)</td><td>Project opportunities</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-semibold">How we label information</h3>
            <dl className="mt-3 space-y-3 text-sm">
              {[
                ['Verified', 'Confirmed at a recorded time.'],
                ['Observed', 'Measured automatically, for example a response header or a PageSpeed score. Timestamped.'],
                ['Reported by source', 'Stated by the data source and not independently confirmed.'],
                ['Inference', 'A conclusion from other evidence, shown with its basis. Estimates are never presented as facts.'],
                ['Unknown', 'Not available. We show it as unknown rather than guessing.'],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] gap-3">
                  <dt className="font-medium">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-8 text-sm font-semibold">Compared with searching by hand</h3>
            <p className="mt-2 text-sm text-muted">You still decide who to contact. The difference is that discovery, deduplication, measured checks, provenance and follow-up tracking sit in one place, and each claim in a draft can be traced to a finding.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container-page py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
        <p className="mt-2 text-sm text-muted">Prices in Kenyan shillings. Start on Free and upgrade when you need more.</p>
        <div className="mt-6">
          <PricingTable doc={plans} />
          <UsageRules />
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-line bg-surface py-16">
        <div className="container-page">
          <h2 className="text-2xl font-semibold tracking-tight">Trust and privacy</h2>
          <div className="mt-6 grid gap-6 text-sm md:grid-cols-3">
            {[
              ['Authentication', 'Sign in with email and password or Google through Firebase Authentication. Email verification is required before using search, audits or drafts. Sessions use secure, HTTP-only cookies.'],
              ['Your data', 'Leads, notes, drafts and pipeline are private to your account and enforced on the server. You can export and delete your data.'],
              ['Subscriptions', 'Limits are enforced on our servers. Plans change only after a payment is confirmed with the payment provider.'],
              ['Source attribution', 'Records keep their source, licence and attribution. Where reuse is not permitted we link out instead of copying.'],
              ['Responsible outreach', 'Drafts only. You review and send. Drafts include an opt-out line, and a suppression list stops you marking messages as sent to people who opted out.'],
              ['Audit safety', 'Audits only reach public websites. Internal addresses are blocked, redirects are re-checked, and size and time limits apply.'],
            ].map(([t, d]) => (
              <div key={t}>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-2 text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container-page max-w-3xl py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">{f.q}</summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-page pb-4">
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Try it on a real search</h2>
            <p className="mt-1 text-sm text-muted">Create a free account, search your own city, and judge the data yourself before paying.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/signup" className="btn btn-primary">Start for free</Link>
            <Link href="/pricing" className="btn">See pricing</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

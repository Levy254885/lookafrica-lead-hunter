export function HelpContent() {
  const sections: [string, string[]][] = [
    ['Getting started', ['Create an account and verify your email. Search, audits and drafts stay locked until your address is verified.', 'Open Settings and choose the services you offer. Lead scores use this to measure fit.', 'Go to Find Leads, pick a country, city and category, and run a search. Searching is free.']],
    ['Reading evidence labels', ['Verified: confirmed at a recorded time.', 'Observed: measured automatically, for example a PageSpeed score. It has a timestamp.', 'Reported by source: stated by the data source, not confirmed by us.', 'Inference: a conclusion drawn from other evidence. Always shown with its basis.', 'Unknown: not available. We do not guess.']],
    ['Website audits', ['Enter a public website address. Only http and https are accepted, and private or internal addresses are blocked.', 'An audit runs in the background and moves from pending to running to completed or failed.', 'Checks cover the home page and a sample of up to 10 internal links. They are not a full-site crawl.', 'If PageSpeed Insights is unavailable or has no data, the finding says so. Nothing is estimated.']],
    ['What counts against your allowance', ['Lead record: a new business saved. Searching is free. Saving the same business twice is not counted twice.', 'Audit: one new audit. The same address within 24 hours reuses the report free. Failed audits are returned.', 'AI draft: one AI-written draft. Template drafts are free.']],
    ['Lead score', ['The score is a prioritization estimate out of 100 built from five visible factors: website issues, fit with your services, public contact channel, data freshness, and an explicit buying signal.', 'It is not a probability of winning the client, and it uses no assumptions about revenue or willingness to pay.']],
    ['Outreach', ['The app writes drafts. You edit and send them yourself, then mark them as sent.', 'Add recipients who ask not to be contacted to your suppression list in Outreach.', 'Follow the law that applies to your recipient, including data protection and electronic marketing rules.']],
    ['Billing', ['Payments are confirmed with Pesapal before your plan changes. Returning from the payment page is not proof of payment.', 'M-Pesa payments cover one period. Pay again before the period ends to extend it; paying early does not lose time.', 'Cancelling keeps access to the end of the paid period.']],
  ];
  return (
    <div className="mt-6 space-y-8 text-sm">
      {sections.map(([title, items]) => (
        <section key={title}>
          <h2 className="text-lg font-semibold">{title}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
            {items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

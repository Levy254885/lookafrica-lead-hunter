/** Answers shown on the pricing page. Plain text so they can be reviewed in one place. */
export const FAQS: { q: string; a: string }[] = [
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


export function FaqList() {
  const half = Math.ceil(FAQS.length / 2);
  return (
    <div className="grid gap-x-12 lg:grid-cols-2">
      {[FAQS.slice(0, half), FAQS.slice(half)].map((col, c) => (
        <div key={c} className="divide-y divide-line border-y border-line">
          {col.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium marker:hidden">
                {f.q}
                <span className="text-lg leading-none text-muted group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}

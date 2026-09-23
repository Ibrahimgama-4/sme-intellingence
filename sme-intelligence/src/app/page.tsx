import Link from 'next/link';
import {
  ArrowUpRight, Upload, LayoutDashboard, TrendingUp, MessageSquareText,
  ShieldCheck, Smartphone, CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="bg-paper text-ink">
      {/* ---------- NAV ---------- */}
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="font-display text-lg font-semibold text-forest-900">SME Intelligence</div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
          <a href="#how-it-works" className="hover:text-ink">How it works</a>
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-ink/70 hover:text-ink">Log in</Link>
          <Link href="/signup" className="text-sm font-medium bg-forest-900 text-paper px-4 py-2 rounded-lg hover:bg-forest-700 transition-colors">
            Start free
          </Link>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.1] text-forest-900">
            Understand your business. Predict what comes next. Make better decisions.
          </h1>
          <p className="mt-6 text-lg text-ink/70 max-w-md">
            Upload your sales spreadsheet and SME Intelligence turns it into a live dashboard, a 30-day
            forecast, and plain-language recommendations - no accounting background required.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-forest-500 text-paper px-6 py-3.5 rounded-lg font-medium hover:bg-forest-600 transition-colors">
              Start Analyzing Your Business <ArrowUpRight size={18} />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 border border-forest-900/20 px-6 py-3.5 rounded-lg font-medium hover:bg-forest-50 transition-colors">
              View Demo
            </Link>
          </div>
          <p className="mt-5 text-sm text-ink/50">No card required. Works with the spreadsheet you already keep.</p>
        </div>

        {/* Dashboard preview mockup - built from real content, not a stock screenshot */}
        <div className="rounded-xl2 border border-forest-900/10 bg-white shadow-[0_20px_60px_-20px_rgba(15,42,30,0.25)] overflow-hidden">
          <div className="bg-forest-900 text-paper/90 px-5 py-3 flex items-center justify-between text-xs">
            <span>Nasser Enterprise, Kano</span>
            <span className="text-paper/50">This month</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <MockKpi label="Revenue" value="N12.45M" change="+12.4%" positive />
            <MockKpi label="Gross Profit" value="N4.25M" change="+8.1%" positive />
            <MockKpi label="Expenses" value="N8.20M" change="+3.2%" positive={false} />
            <MockKpi label="Margin" value="34.1%" change="+1.8 pts" positive />
          </div>
          <div className="px-5 pb-5">
            <div className="rounded-lg bg-amber-100/60 border border-amber-300/40 px-4 py-3 text-sm text-forest-900">
              <strong className="font-display">Insight:</strong> Rice sales rose 22% this month, driven by the run-up to Ramadan.
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PROBLEM ---------- */}
      <section className="bg-forest-900 text-paper py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold">Most SME owners run their business on instinct, not information.</h2>
            <p className="mt-4 text-paper/70 max-w-md">
              A supermarket in Kano, a pharmacy in Enugu, a fashion shop in Lagos - most keep sales
              in a notebook or an Excel file nobody has time to analyze. Decisions about pricing,
              restocking, and spending get made on gut feeling.
            </p>
          </div>
          <ul className="space-y-4 text-paper/90">
            {[
              "\"I don't know which products are actually making me money.\"",
              "\"I can't tell if my business is growing or just busy.\"",
              "\"I only find out I'm losing money at the end of the year.\"",
              "\"I have the data - I just don't have time to make sense of it.\""
            ].map((quote) => (
              <li key={quote} className="border-l-2 border-amber-500 pl-4 italic text-paper/80">{quote}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-semibold text-forest-900 text-center">From spreadsheet to insight in minutes</h2>
        <div className="mt-12 grid md:grid-cols-4 gap-8">
          <Step icon={<Upload size={22} />} title="Upload your file" text="Drop in the Excel or CSV file you already use to track sales - any column names, we'll figure it out." />
          <Step icon={<LayoutDashboard size={22} />} title="We build your dashboard" text="Revenue, profit, top products, and expenses, calculated automatically and explained in plain language." />
          <Step icon={<TrendingUp size={22} />} title="See what's coming" text="A short-term sales forecast so you can plan stock and cash flow ahead of time." />
          <Step icon={<MessageSquareText size={22} />} title="Ask questions, get answers" text="\"Why did profit drop?\" \"What should I restock?\" - answered from your actual numbers." />
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="bg-forest-50/60 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-3xl font-semibold text-forest-900 text-center">Built for the way Nigerian SMEs actually operate</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <FeatureCard title="Product intelligence" text="See which products drive profit, which are slow-moving, and which are high-revenue but low-margin." />
            <FeatureCard title="Expense analytics" text="Track rent, fuel, salaries, and procurement - and get flagged when a category spikes." />
            <FeatureCard title="Sales forecasting" text="7, 30, and 90-day forecasts using moving averages and trend models, with honest uncertainty ranges." />
            <FeatureCard title="Business Health Score" text="One transparent number built from six measurable components - never a black-box AI guess." />
            <FeatureCard title="Naira-native" text="Naira currency, all 36 states + FCT, and business categories that match Nigerian retail - not a US template." />
            <FeatureCard title="Works on your phone" text="A fully responsive dashboard designed for owners who run their business from an Android phone." />
          </div>
        </div>
      </section>

      {/* ---------- WHO IT'S FOR ---------- */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-semibold text-forest-900 text-center">Who it's for</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {['Supermarkets', 'Pharmacies', 'Fashion retailers', 'Electronics shops', 'Restaurants', 'Wholesalers', 'Spare-parts dealers', 'Agro-dealers', 'Small manufacturers', 'Online sellers'].map((tag) => (
            <span key={tag} className="px-4 py-2 rounded-full border border-forest-900/15 text-sm text-forest-900 bg-white">{tag}</span>
          ))}
        </div>
      </section>

      {/* ---------- SECURITY ---------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div className="flex items-center gap-4">
          <ShieldCheck className="text-forest-500 shrink-0" size={40} />
          <p className="text-ink/80">Your business data is isolated at the database level - no other business, ever, can see your numbers.</p>
        </div>
        <div className="flex items-center gap-4">
          <Smartphone className="text-forest-500 shrink-0" size={40} />
          <p className="text-ink/80">Designed mobile-first, because most owners will check their dashboard between customers, not at a desk.</p>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="bg-forest-900 text-paper py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-3xl font-semibold text-center">Simple pricing, once you're ready</h2>
          <p className="text-center text-paper/60 mt-2">Free during early access. Paid plans below are indicative - final pricing is still being finalized.</p>
          <div className="mt-12 grid md:grid-cols-4 gap-5">
            <PricingCard plan="Free" price="N0" features={['1 business', 'Limited uploads/month', 'Core dashboard', 'Basic reports']} />
            <PricingCard plan="Business" price="N15,000/mo" features={['Unlimited uploads', 'Forecasting', 'AI Assistant', 'Advanced analytics']} highlighted />
            <PricingCard plan="Professional" price="N35,000/mo" features={['Multiple branches', 'Automated reports', 'Alerts & notifications', 'Priority support']} />
            <PricingCard plan="Enterprise" price="Custom" features={['API access', 'Custom integrations', 'Dedicated support', 'Advanced security']} />
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-semibold text-forest-900 text-center mb-10">Frequently asked questions</h2>
        <div className="space-y-6">
          <Faq q="Do I need accounting knowledge to use this?" a="No. You upload the spreadsheet you already keep - SME Intelligence explains everything in plain language, not accounting jargon." />
          <Faq q="What file formats are supported?" a="CSV and Excel (.xlsx). We automatically detect your columns even if they're named differently from ours." />
          <Faq q="Is my data shared with anyone?" a="No. Your business data is only ever visible to your account, enforced at the database level." />
          <Faq q="Does this work without an internet connection?" a="You need internet to upload data and view your dashboard, since your data is stored securely in the cloud, not on your device." />
          <Faq q="Can I use Naira and Nigerian business categories?" a="Yes - the platform defaults to NGN and Nigerian states/LGAs, and is built around real Nigerian SME categories." />
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h2 className="font-display text-3xl font-semibold text-forest-900">Ready to see what your data has been trying to tell you?</h2>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-2 bg-forest-500 text-paper px-6 py-3.5 rounded-lg font-medium hover:bg-forest-600 transition-colors">
            Start Analyzing Your Business <ArrowUpRight size={18} />
          </Link>
          <Link href="/demo" className="inline-flex items-center gap-2 border border-forest-900/20 px-6 py-3.5 rounded-lg font-medium hover:bg-forest-50 transition-colors">
            View Demo
          </Link>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-forest-900/10 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-4 text-sm text-ink/50">
          <span>&copy; {new Date().getFullYear()} SME Intelligence. Built for Nigerian businesses.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/demo" className="hover:text-ink">Demo</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function MockKpi({ label, value, change, positive }: { label: string; value: string; change: string; positive: boolean }) {
  return (
    <div className="rounded-lg bg-forest-50/70 p-4">
      <div className="text-xs text-ink/50">{label}</div>
      <div className="font-display text-xl font-semibold text-forest-900 mt-1">{value}</div>
      <div className={`text-xs mt-1 ${positive ? 'text-forest-600' : 'text-risk'}`}>{change} vs last period</div>
    </div>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <div className="w-11 h-11 rounded-lg bg-forest-900 text-paper flex items-center justify-center">{icon}</div>
      <h3 className="font-display font-semibold mt-4 text-forest-900">{title}</h3>
      <p className="text-sm text-ink/60 mt-2">{text}</p>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white rounded-xl2 p-6 border border-forest-900/8">
      <h3 className="font-display font-semibold text-forest-900">{title}</h3>
      <p className="text-sm text-ink/60 mt-2">{text}</p>
    </div>
  );
}

function PricingCard({ plan, price, features, highlighted }: { plan: string; price: string; features: string[]; highlighted?: boolean }) {
  return (
    <div className={`rounded-xl2 p-6 ${highlighted ? 'bg-amber-500 text-forest-900' : 'bg-forest-700/40 text-paper'}`}>
      <div className="font-display font-semibold text-lg">{plan}</div>
      <div className="font-display text-2xl font-semibold mt-2">{price}</div>
      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-forest-900/10 pb-5">
      <h3 className="font-medium text-forest-900">{q}</h3>
      <p className="text-sm text-ink/60 mt-2">{a}</p>
    </div>
  );
}

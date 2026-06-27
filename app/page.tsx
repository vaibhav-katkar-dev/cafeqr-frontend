import Link from "next/link";
import {
  Coffee,
  QrCode,
  ClipboardList,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ChefHat,
  Smartphone,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Cafe<span className="text-emerald-500">QR</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10">
                Start Free
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 flex-1 flex flex-col justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-slate-100/50 -z-10" />
        
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <Badge text="🚀 QR Table Ordering SaaS" />
          
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight tracking-tight max-w-3xl mx-auto">
            Transform Your Cafe with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">Smart QR Orders</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Let customers scan table QR codes, browse your beautiful menu, and place orders instantly. No app downloads, no long wait times. Complete dashboard for cafe owners.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-6 rounded-2xl flex items-center gap-2 shadow-xl shadow-emerald-500/25 transition-all w-full sm:w-auto text-base">
                Get Started For Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-8 py-6 rounded-2xl transition-all w-full sm:w-auto text-base">
                View Dashboard
              </Button>
            </Link>
          </div>

          {/* Quick Stats / Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-16">
            <QuickHighlight icon={Smartphone} title="No Apps Needed" desc="Scan to open standard web page" />
            <QuickHighlight icon={ChefHat} title="Kitchen Flow" desc="Order updates instantly" />
            <QuickHighlight icon={TrendingUp} title="Boost Revenue" desc="Faster tables turnaround time" />
            <QuickHighlight icon={ShieldCheck} title="100% Secure" desc="Encrypted server & rules" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-20 border-t border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Designed For Modern Cafes
            </h2>
            <p className="text-slate-400 max-w-md mx-auto text-sm font-medium">
              Everything you need to accept table orders and manage your shop efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={QrCode}
              title="Instant QR Generation"
              desc="Set your table count and instantly generate downloadable high-quality QR codes for every single table. Download all in a single click."
            />
            <FeatureCard
              icon={ClipboardList}
              title="Real-Time Orders Board"
              desc="Orders appear live on the kitchen dashboard. Update statuses (Pending → Accepted → Preparing → Delivered) and hear notifications instantly."
            />
            <FeatureCard
              icon={Coffee}
              title="Interactive Menu Editor"
              desc="Easily add menu items, upload photos, set prices, and group by categories. Toggle item availability in one click when sold out."
            />
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              How It Works
            </h2>
            <p className="text-slate-400 max-w-sm mx-auto text-sm font-medium">
              Start accepting orders in three simple steps.
            </p>
          </div>

          <div className="relative flex flex-col md:flex-row items-stretch justify-between gap-8">
            <StepItem step="1" title="Register Cafe" desc="Create your profile, enter your details, and specify your table count." />
            <StepItem step="2" title="Design Menu" desc="Add dishes and drinks, set prices, and download your printable QR codes." />
            <StepItem step="3" title="Serve Instantly" desc="Glue QRs to tables. Customers scan and order; you cook and serve." />
          </div>
        </div>
      </section>

      {/* Premium CTA Card */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-0" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-0" />

            <div className="relative z-10 space-y-6 max-w-xl mx-auto">
              <Sparkles className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Ready to Boost Your Cafe's Efficiency?
              </h2>
              <p className="text-slate-400 text-sm md:text-base">
                Join our table ordering SaaS today and experience smooth, automated ordering that delights your customers and cuts down on labor.
              </p>
              <div className="pt-4">
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm">
                    Create a Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 border-t border-slate-800 py-12 text-center text-xs">
        <div className="max-w-6xl mx-auto px-6 space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Coffee className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">CafeQR SaaS</span>
          </div>
          <p>© {new Date().getFullYear()} CafeQR. All rights reserved.</p>
          <div className="flex justify-center gap-4 text-slate-400 font-medium">
            <Link href="/auth/login" className="hover:text-emerald-400 transition-colors">Owner Dashboard</Link>
            <span>•</span>
            <Link href="/auth/signup" className="hover:text-emerald-400 transition-colors">Register Cafe</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide uppercase mx-auto border border-emerald-200">
      {text}
    </div>
  );
}

function QuickHighlight({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-center">
      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-2">
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-bold text-slate-900 text-xs mb-0.5">{title}</div>
      <div className="text-[10px] text-slate-400 leading-snug">{desc}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-slate-50/50 hover:bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

function StepItem({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex-1 bg-white rounded-3xl p-6 border border-slate-200 relative shadow-sm hover:shadow-md transition-all duration-300">
      <div className="absolute -top-4 left-6 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/25">
        {step}
      </div>
      <h3 className="font-bold text-slate-900 text-base mb-2 pt-2">{title}</h3>
      <p className="text-slate-400 text-xs leading-normal">{desc}</p>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Try the magic. Forge your first resume on us.",
    features: [
      "1 ATS-optimized resume",
      "Basic JD keyword analysis",
      "1 standard template",
      "PDF export",
    ],
    cta: "Start free",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ month",
    desc: "Unlimited everything. For serious job seekers.",
    features: [
      "Unlimited resume rewrites",
      "Unlimited cover letters",
      "Premium template library",
      "Advanced ATS scoring & insights",
      "Priority AI processing",
      "Version history",
    ],
    cta: "Go Pro",
    variant: "hero" as const,
    featured: true,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Pricing</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 tracking-tight">
            Simple. Honest. Worth it.
          </h2>
          <p className="text-muted-foreground text-lg">
            One Pro subscription costs less than a single rejected application.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {tiers.map((t, i) => (
            <div
              key={t.name}
              className={`relative p-8 rounded-2xl border transition-all duration-500 hover:-translate-y-2 ${
                t.featured
                  ? "bg-gradient-hero text-primary-foreground border-accent/40 shadow-elegant scale-[1.02] hover:shadow-glow"
                  : "bg-card border-border shadow-card hover:shadow-elegant"
              }`}
              style={{ animation: `fade-up 0.7s ${i * 120}ms var(--transition-smooth) backwards` }}
            >
              {t.featured && (
                <span className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-gradient-accent text-accent-foreground text-xs font-bold">
                  MOST POPULAR
                </span>
              )}
              <h3 className="font-display font-bold text-2xl mb-1">{t.name}</h3>
              <p className={`text-sm mb-6 ${t.featured ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {t.desc}
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="font-display text-5xl font-bold">{t.price}</span>
                <span className={`text-sm ${t.featured ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {t.period}
                </span>
              </div>
              <Button variant={t.variant} className="w-full mb-8" size="lg">
                {t.cta}
              </Button>
              <ul className="space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      t.featured ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
                    }`}>
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;

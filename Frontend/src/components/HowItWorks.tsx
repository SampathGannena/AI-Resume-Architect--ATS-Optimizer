import { Upload, Wand2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useReveal } from "@/hooks/use-reveal";

const steps = [
  { n: "01", icon: Upload, title: "Upload & paste", desc: "Drop in your existing resume (PDF or DOCX) and paste the job description you're targeting." },
  { n: "02", icon: Wand2, title: "AI rewrites & optimizes", desc: "Our agents extract keywords, rewrite your bullets, and calculate your live ATS match score." },
  { n: "03", icon: Download, title: "Export pixel-perfect PDF", desc: "Pick a template, preview the result, and download a recruiter-ready PDF — ready to apply." },
];

const JD_LINES = [
  "Looking for a Senior Engineer with strong",
  "Python, AWS, and React experience to lead",
  "agile teams building scalable platforms.",
];

const TypingDemo = () => {
  const { ref, shown } = useReveal<HTMLDivElement>(0.3);
  const [text, setText] = useState("");
  const full = JD_LINES.join("\n");

  useEffect(() => {
    if (!shown) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setText(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [shown, full]);

  return (
    <div
      ref={ref}
      className="mb-16 max-w-2xl mx-auto rounded-2xl bg-gradient-hero text-primary-foreground p-6 shadow-elegant border border-accent/20"
    >
      <div className="flex items-center gap-2 mb-3 text-xs text-primary-foreground/60">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
        <span className="w-2.5 h-2.5 rounded-full bg-accent" />
        <span className="w-2.5 h-2.5 rounded-full bg-accent-glow" />
        <span className="ml-2 font-mono">job_description.txt</span>
      </div>
      <pre className="font-mono text-sm whitespace-pre-wrap text-primary-foreground/90 min-h-[5rem]">
        {text}
        <span className="inline-block w-2 h-4 bg-accent ml-0.5 align-middle animate-blink" />
      </pre>
    </div>
  );
};

const StepCard = ({ s, i }: { s: typeof steps[number]; i: number }) => {
  const { ref, shown } = useReveal<HTMLDivElement>(0.2);
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "is-visible" : ""} relative p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all duration-500 group`}
      style={{ transitionDelay: `${i * 120}ms` }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow group-hover:scale-110 group-hover:rotate-[-6deg] transition-transform duration-300">
          <s.icon className="w-5 h-5 text-accent-foreground" />
        </div>
        <span className="font-display text-5xl font-bold text-muted-foreground/20 group-hover:text-accent/30 transition-colors">{s.n}</span>
      </div>
      <h3 className="font-display font-semibold text-xl mb-2">{s.title}</h3>
      <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
      {i < steps.length - 1 && (
        <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-accent to-transparent" />
      )}
    </div>
  );
};

const HowItWorks = () => {
  return (
    <section id="how" className="py-24 bg-secondary/40">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">How it works</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 tracking-tight">
            From outdated to outstanding in 3 steps.
          </h2>
        </div>

        <TypingDemo />

        <div className="grid md:grid-cols-3 gap-6 relative">
          {steps.map((s, i) => (
            <StepCard key={s.n} s={s} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

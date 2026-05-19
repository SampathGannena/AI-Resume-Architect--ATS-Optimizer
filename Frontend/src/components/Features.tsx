import { Brain, FileSearch, FileDown, Layers, ShieldCheck } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";
import { useReveal } from "@/hooks/use-reveal";

const features = [
  { icon: FileSearch, title: "JD Analysis Agent", desc: "A dedicated AI agent parses your target job description, semantically extracting and ranking the keywords recruiters actually screen for." },
  { icon: Brain, title: "Smart Rewrite Engine", desc: "Our LLM rewrites every bullet point to naturally include critical keywords — boosting your ATS score without sounding robotic." },
  { icon: ShieldCheck, title: "ATS-Proof Formatting", desc: "Engineered to pass Workday, Greenhouse, Lever, and Taleo. Clean structure, no tables or graphics that break parsers." },
  { icon: FileDown, title: "Pixel-Perfect PDF", desc: "Headless-Chrome rendering produces non-editable, print-ready PDFs that look identical on every screen and recruiter's printer." },
  { icon: Layers, title: "Premium Templates", desc: "Choose from a curated library of recruiter-tested designs — engineering, product, design, executive, and more." },
  { icon: MinionRobotIcon, title: "Cover Letters Included", desc: "Generate matching, JD-tailored cover letters in one click. Same tone, same keywords, fully editable." },
];

const FeatureCard = ({ f, i }: { f: typeof features[number]; i: number }) => {
  const { ref, shown } = useReveal<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "is-visible" : ""} group p-7 rounded-2xl bg-gradient-card border border-border shadow-card hover:shadow-elegant hover:-translate-y-2 transition-all duration-500 tilt-card`}
      style={{ transitionDelay: `${i * 80}ms` }}
    >
      <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-5 group-hover:bg-gradient-accent group-hover:text-accent-foreground group-hover:rotate-6 group-hover:scale-110 transition-all duration-300">
        <f.icon className="w-5 h-5" />
      </div>
      <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-accent transition-colors">{f.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
    </div>
  );
};

const Features = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Features</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4 tracking-tight">
            Built like a recruiter. Writes like a pro.
          </h2>
          <p className="text-muted-foreground text-lg">
            Every feature engineered around one thing: getting your resume seen by humans.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

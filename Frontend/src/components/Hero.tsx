import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Target } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";
import { useEffect, useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";
import { useCountUp, useReveal } from "@/hooks/use-reveal";
import HeroAnimation from "@/components/HeroAnimation";

const KEYWORDS = ["Python", "Agile", "Leadership", "AWS", "React"];

const Hero = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const { ref: scoreRef, shown } = useReveal<HTMLDivElement>(0.4);
  const score = useCountUp(94, shown, 1600);
  const [activeKw, setActiveKw] = useState(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setActiveKw((k) => (k + 1) % KEYWORDS.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative pt-28 pb-16 overflow-hidden bg-gradient-hero text-primary-foreground">
      <div
        className="absolute inset-0 opacity-30 mix-blend-screen transition-transform duration-300 ease-out"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `translate3d(${mouse.x * -10}px, ${mouse.y * -10}px, 0) scale(1.05)`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-glow" />

      <div
        className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-accent/20 blur-3xl animate-blob"
        style={{ transform: `translate3d(${mouse.x * 20}px, ${mouse.y * 20}px, 0)` }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-accent-glow/15 blur-3xl animate-blob"
        style={{ animationDelay: "3s", transform: `translate3d(${mouse.x * -25}px, ${mouse.y * -25}px, 0)` }}
      />

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — existing content */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-medium mb-8 animate-fade-up animate-pulse-glow">
              <MinionRobotIcon className="w-3.5 h-3.5 animate-spin" animate style={{ animationDuration: "6s" }} />
              AI-powered. ATS-optimized. Interview-ready.
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-up">
              Get past the bots.<br />
              Land the <span className="shimmer-text">interview.</span>
            </h1>

            <p className="text-base md:text-lg text-primary-foreground/70 max-w-lg mb-10 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              CareerForge Pro rewrites your resume to perfectly match any job description, beats Applicant Tracking Systems, and exports a pixel-perfect PDF in under 30 seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <Button variant="hero" size="lg" className="group" asChild>
                <a href="/auth">
                  Forge my resume
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button variant="outlineLight" size="lg" asChild>
                <a href="#how">See how it works</a>
              </Button>
            </div>

            {/* ATS Score Visual */}
            <div
              ref={scoreRef}
              className="bg-card/5 backdrop-blur-md border border-foreground/10 rounded-2xl p-6 text-left shadow-elegant animate-fade-up tilt-card"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                  <Target className="w-4 h-4 text-accent" />
                  ATS Match Score
                </div>
                <span className="font-display font-bold text-2xl text-accent tabular-nums">{score}%</span>
              </div>
              <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-accent rounded-full transition-[width] duration-[1600ms] ease-out"
                  style={{ width: shown ? "94%" : "0%" }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {KEYWORDS.map((kw, i) => (
                  <span
                    key={kw}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-all duration-300 ${
                      i === activeKw
                        ? "bg-accent text-accent-foreground border-accent scale-110 shadow-glow"
                        : "bg-accent/15 text-accent border-accent/20"
                    }`}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 text-xs text-primary-foreground/50 animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> 50,000+ resumes forged</span>
              <span>·</span>
              <span>3.2× more interview callbacks</span>
              <span>·</span>
              <span>No credit card required</span>
            </div>
          </div>

          {/* Right — Hero Animation */}
          <div className="hidden lg:block">
            <HeroAnimation />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

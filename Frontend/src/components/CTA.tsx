import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero text-primary-foreground p-12 md:p-20 text-center shadow-elegant">
          <div className="absolute inset-0 bg-gradient-glow" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">
              Your next role is one resume away.
            </h2>
            <p className="text-primary-foreground/70 text-lg mb-8">
              Stop guessing what recruiters want. Let AI craft a resume engineered to win.
            </p>
            <Button variant="hero" size="lg" className="group" asChild>
              <a href="/auth">
                Forge my resume free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <p className="text-xs text-primary-foreground/50 mt-4">No credit card · 60-second setup</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;

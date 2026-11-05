import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import CareerForgeBrandIcon from "@/components/CareerForgeBrandIcon";

const Navbar = () => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
      <nav className="container flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2 font-display font-bold text-lg group">
          <span className="w-8 h-8 rounded-lg bg-transparent flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 shadow-glow">
            <CareerForgeBrandIcon />
          </span>
          CareerForge <span className="text-muted-foreground font-medium">Pro</span>
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          {[
            { href: "#features", label: "Features" },
            { href: "#how", label: "How it works" },
            { href: "#pricing", label: "Pricing" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative hover:text-foreground transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-accent after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;

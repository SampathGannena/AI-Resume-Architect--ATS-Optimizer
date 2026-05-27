import { Link } from "react-router-dom";
import { Github, Instagram, Linkedin, Mail } from "lucide-react";

const primaryLinks = ["Workflows", "Showcase", "Use cases", "About", "Blog", "Manifesto", "Brand"];
const secondaryLinks = ["Help Center", "Contact", "Privacy Policy", "Terms of Use"];

export const AppFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer app-footer-hero">
      <div className="app-footer-grid" />
      <div className="app-footer-word">CareerForge</div>
      <div className="container relative z-10 py-12">
        <div className="app-footer-timeline">
          <span className="app-footer-tick">0s</span>
          <span className="app-footer-tick">4s</span>
          <span className="app-footer-tick">8s</span>
          <span className="app-footer-tick">12s</span>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {primaryLinks.map((label) => (
            <Link key={label} to="/" className="app-footer-pill">
              {label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          {secondaryLinks.map((label) => (
            <Link key={label} to="/" className="app-footer-pill app-footer-pill-muted">
              {label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-sm text-foreground">
              CareerForge Pro
            </Link>
            <span>© {year}. All rights reserved.</span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">SOC 2 Type 1 ready</span>
          </div>
          <div className="flex items-center gap-3">
            <a className="app-footer-icon" href="mailto:support@careerforge.app">
              <Mail className="w-4 h-4" />
            </a>
            <a className="app-footer-icon" href="https://www.linkedin.com" target="_blank" rel="noreferrer">
              <Linkedin className="w-4 h-4" />
            </a>
            <a className="app-footer-icon" href="https://www.instagram.com" target="_blank" rel="noreferrer">
              <Instagram className="w-4 h-4" />
            </a>
            <a className="app-footer-icon" href="https://github.com" target="_blank" rel="noreferrer">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};


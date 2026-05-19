import { Link } from "react-router-dom";
import { Github, Mail } from "lucide-react";

export const AppFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="container h-16 flex items-center justify-between gap-4">
        <div className="text-sm font-medium">
          <Link to="/" className="hover:underline underline-offset-4">
            CareerForge
          </Link>{" "}
          <span className="text-muted-foreground">© {year}</span>
        </div>

        <nav className="flex items-center gap-3 text-sm">
          <a className="app-footer-link" href="mailto:support@careerforge.app">
            <Mail className="w-4 h-4" />
            Support
          </a>
          <a className="app-footer-link" href="https://github.com" target="_blank" rel="noreferrer">
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
};


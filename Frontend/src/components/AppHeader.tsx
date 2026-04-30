import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogOut, LayoutDashboard, FileText, Mail, UserCircle2, CreditCard } from "lucide-react";
import CareerForgeBrandIcon from "@/components/CareerForgeBrandIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export const AppHeader = ({ active }: { active?: "dashboard" | "builder" | "editor" | "cover" }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    toast({ title: "Signed out" });
    navigate("/");
  };

  const link = (to: string, key: string, icon: React.ReactNode, label: string) => (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
        active === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <header
      className={`app-header border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-40 ${
        user ? "app-header-auth" : ""
      }`}
    >
      <div className="container flex items-center justify-between h-16 gap-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold shrink-0">
          <span className="w-8 h-8 rounded-lg bg-transparent flex items-center justify-center">
            <CareerForgeBrandIcon />
          </span>
          <span className="hidden sm:inline">CareerForge <span className="text-muted-foreground font-medium">Pro</span></span>
        </Link>

        {user && (
          <nav className="flex items-center gap-1">
            {link("/dashboard", "dashboard", <LayoutDashboard className="w-3.5 h-3.5" />, "Dashboard")}
            {link("/builder", "builder", <Sparkles className="w-3.5 h-3.5" />, "AI builder")}
            {link("/editor", "editor", <FileText className="w-3.5 h-3.5" />, "Editor")}
            {link("/cover-letter", "cover", <Mail className="w-3.5 h-3.5" />, "Cover letter")}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open profile" className="cf-user-trigger">
                    <UserCircle2 className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-2">
                  <DropdownMenuLabel className="px-2 py-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-none">Profile</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">{user.email}</div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.55)]" />
                        Active
                      </span>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onSelect={() => navigate("/billing")} className="cursor-pointer">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Billing & subscription
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      signOut();
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

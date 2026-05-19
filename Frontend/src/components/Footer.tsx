import MinionRobotIcon from "@/components/MinionRobotIcon";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12 bg-background">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-display font-bold">
            <span className="w-7 h-7 rounded-lg bg-gradient-accent flex items-center justify-center">
              <MinionRobotIcon className="w-3.5 h-3.5 text-accent-foreground" animate />
            </span>
            CareerForge Pro
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 CareerForge Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

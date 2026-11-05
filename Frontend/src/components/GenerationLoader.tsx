import { Loader2 } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";

type Props = { open: boolean; title?: string; subtitle?: string };

export const GenerationLoader = ({ open, title = "Generating...", subtitle = "AI is working its magic. This usually takes 5–15 seconds." }: Props) => {
  if (!open) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-accent/30 bg-card/90 px-8 py-7 shadow-glow max-w-sm text-center">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
          <MinionRobotIcon className="w-4 h-4 text-accent absolute -top-1 -right-1" animate />
        </div>
        <div>
          <div className="font-display text-lg font-semibold">{title}</div>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default GenerationLoader;

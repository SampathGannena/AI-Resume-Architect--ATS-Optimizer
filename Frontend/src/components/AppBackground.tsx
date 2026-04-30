import { Award, BriefcaseBusiness, FileText, Gem, GraduationCap, Wand2 } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";

const icons = [
  { Icon: FileText, className: "left-[7%] top-[14%] h-9 w-9 animation-delay-0" },
  { Icon: MinionRobotIcon, className: "left-[23%] top-[72%] h-7 w-7 animation-delay-700" },
  { Icon: BriefcaseBusiness, className: "left-[42%] top-[18%] h-10 w-10 animation-delay-1400" },
  { Icon: Wand2, className: "left-[66%] top-[78%] h-8 w-8 animation-delay-2100" },
  { Icon: Award, className: "left-[84%] top-[22%] h-9 w-9 animation-delay-2800" },
  { Icon: GraduationCap, className: "left-[12%] top-[46%] h-8 w-8 animation-delay-3500" },
  { Icon: Gem, className: "left-[78%] top-[52%] h-7 w-7 animation-delay-4200" },
];

export const AppBackground = () => (
  <div className="app-animated-bg" aria-hidden="true">
    <div className="app-bg-orbit app-bg-orbit-a" />
    <div className="app-bg-orbit app-bg-orbit-b" />
    {icons.map(({ Icon, className }, index) => (
      <Icon key={index} className={`app-bg-icon ${className}`} strokeWidth={1.5} />
    ))}
  </div>
);

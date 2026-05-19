import { useEffect, useState, useRef } from "react";
import { FileText, Target, Wand2, Upload, Download } from "lucide-react";
import MinionRobotIcon from "@/components/MinionRobotIcon";

const RESUME_CARDS = [
  {
    title: "Sarah Chen",
    role: "Senior Software Engineer",
    score: 94,
    keywords: ["Python", "AWS", "React", "Agile", "Leadership"],
    bullets: [
      "Led cross-functional team of 8 engineers delivering cloud migration project 3 months ahead of schedule",
      "Reduced API latency by 40% through Redis caching and database query optimization",
      "Architected microservices infrastructure handling 10M+ daily requests",
    ],
  },
  {
    title: "Marcus Johnson",
    role: "Product Manager",
    score: 91,
    keywords: ["Roadmap", "A/B Testing", "SQL", "Stakeholder", "Agile"],
    bullets: [
      "Grew monthly active users by 65% through data-driven feature prioritization",
      "Defined product roadmap for $12M revenue stream, aligning engineering with business goals",
      "Launched 3 major features that increased customer retention by 28%",
    ],
  },
  {
    title: "Emily Rodriguez",
    role: "UX Designer",
    score: 88,
    keywords: ["Figma", "User Research", "Prototyping", "Design System", "Accessibility"],
    bullets: [
      "Redesigned onboarding flow increasing completion rate from 52% to 81%",
      "Built and maintained design system with 200+ components used across 5 products",
      "Conducted 50+ user interviews informing redesign of core mobile experience",
    ],
  },
];

const STEPS = [
  { icon: Upload, label: "Paste JD" },
  { icon: Wand2, label: "AI Analyzes" },
  { icon: MinionRobotIcon, label: "Keywords" },
  { icon: Target, label: "Score Boost" },
];

const HeroAnimation = () => {
  const [cardIndex, setCardIndex] = useState(0);
  const [showMini, setShowMini] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const [phase, setPhase] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCardIndex((i) => (i + 1) % RESUME_CARDS.length);
    }, 2800);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Scanner animation phases
  useEffect(() => {
    if (!showScanner) return;
    setPhase(0);
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => setPhase(5), 4400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [showScanner]);

  // Scan line animation
  useEffect(() => {
    if (phase < 2) return;
    const id = setInterval(() => setScanLine((s) => (s + 1) % 6), 500);
    return () => clearInterval(id);
  }, [phase]);

  const handleScan = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowMini(false);
    setTimeout(() => setShowScanner(true), 200);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setTimeout(() => {
      setShowMini(false);
      setCardIndex(0);
      intervalRef.current = setInterval(() => {
        setCardIndex((i) => (i + 1) % RESUME_CARDS.length);
      }, 2800);
    }, 500);
  };

  const currentCard = RESUME_CARDS[cardIndex];
  const offsets = [
    { x: 0, y: 0, rotate: 0 },
    { x: 60, y: 30, rotate: 4 },
    { x: -40, y: 60, rotate: -3 },
  ];

  const jdLines = [
    "Looking for Senior Engineer with strong",
    "Python, AWS, React & Agile leadership",
    "experience to build scalable systems.",
    "",
    "Required: System design, CI/CD,",
    "Cross-team collaboration skills.",
  ];

  return (
    <div className="relative w-full h-[520px]">
      {/* Floating Resume Cards */}
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          showMini || showScanner
            ? "translate-y-[-80px] opacity-30 scale-90 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="relative w-full h-full">
          {RESUME_CARDS.map((card, i) => {
            const off = offsets[i];
            const isActive = i === cardIndex;
            return (
              <div
                key={i}
                className={`absolute top-0 left-0 w-64 transition-all duration-700 ${
                  isActive ? "z-20" : "z-10"
                }`}
                style={{
                  transform: `translate(${off.x}px, ${off.y}px) rotate(${off.rotate}deg) scale(${isActive ? 1 : 0.88})`,
                  opacity: isActive ? 1 : 0.5,
                  transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div className={`bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 ${isActive ? "ring-2 ring-amber-400" : ""}`}>
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-sm">{card.title}</div>
                      <div className="text-white/60 text-xs">{card.role}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full font-medium">
                      <Target className="w-3 h-3" />
                      {card.score}%
                    </div>
                  </div>
                  <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap gap-1.5">
                    {card.keywords.map((kw) => (
                      <span key={kw} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {card.bullets.map((b, j) => (
                      <div key={j} className="flex gap-2 text-xs text-slate-600">
                        <span className="text-emerald-500 mt-0.5 shrink-0">▸</span>
                        <span className="leading-relaxed line-clamp-2">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom button */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-30 transition-all duration-500">
        {/* JD Scanner overlay — appears ON TOP of the button */}
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-80 transition-all duration-500 ${
            showScanner ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div className="h-full bg-slate-900/95 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
            {/* Terminal header */}
            <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-400 text-xs font-mono ml-1">JD Scanner — Live Demo</span>
              </div>
              <button onClick={handleCloseScanner} className="text-slate-500 hover:text-slate-300 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 transition-colors">✕</button>
            </div>

            {/* JD content */}
            <div className="p-3 space-y-3">
              <div>
                <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Job Description</div>
                <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-700 relative overflow-hidden">
                  {phase >= 1 && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/10 to-transparent animate-pulse" />}
                  <pre className="text-slate-300 text-[11px] font-mono leading-relaxed relative z-10">
                    {jdLines.slice(0, phase >= 2 ? 6 : phase >= 1 ? 2 : 0).join("\n")}
                    <span className="animate-blink text-amber-400">|</span>
                  </pre>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-0.5">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex-1 flex items-center gap-0.5">
                    <div
                      className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                        phase > i ? "bg-emerald-500" : "bg-slate-700"
                      }`}
                    />
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
                        phase > i ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-500"
                      }`}
                    >
                      <s.icon className="w-2.5 h-2.5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Keywords */}
              {phase >= 3 && (
                <div className="space-y-1.5">
                  <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Keywords Extracted</div>
                  <div className="flex flex-wrap gap-1">
                    {["Python", "AWS", "React", "Agile", "Leadership", "System Design", "CI/CD"].map((kw, i) => (
                      <span
                        key={kw}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Score */}
              {phase >= 4 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">ATS Match</span>
                    <span className="text-emerald-400 font-bold">94%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: phase >= 5 ? "94%" : "0%" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mini resume card — also on top of button */}
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-72 transition-all duration-500 ${
            showMini && !showScanner ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-sm">{currentCard.title}</div>
                <div className="text-white/60 text-xs">{currentCard.role}</div>
              </div>
              <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full font-medium">
                <Target className="w-3 h-3" />
                {currentCard.score}%
              </div>
            </div>
            <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap gap-1.5">
              {currentCard.keywords.map((kw) => (
                <span key={kw} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                  {kw}
                </span>
              ))}
            </div>
            <div className="px-4 py-2.5 space-y-1.5">
              {currentCard.bullets.map((b, j) => (
                <div key={j} className="flex gap-2 text-[11px] text-slate-600">
                  <span className="text-emerald-500 mt-0.5 shrink-0">▸</span>
                  <span className="leading-relaxed line-clamp-2">{b}</span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-3">
              <button
                onClick={handleScan}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <MinionRobotIcon className="w-3.5 h-3.5" animate />
                Scan with JD Scanner
              </button>
            </div>
          </div>
        </div>

        {/* Try JD Scanner button — base state */}
        <button
          onClick={() => setShowMini(true)}
          className={`relative px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-sm font-bold flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 ${
            showMini || showScanner ? "opacity-0 scale-90 pointer-events-none" : "opacity-100"
          }`}
        >
          <MinionRobotIcon className="w-4 h-4" animate />
          Try JD Scanner
        </button>
      </div>
    </div>
  );
};

export default HeroAnimation;

import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const TechTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-10 bg-zinc-950 text-zinc-100" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>
    <header className="mb-5 border border-cyan-400/40 bg-zinc-900 px-4 py-3">
      <div className="text-cyan-300 text-[11px] mb-1">$ whoami</div>
      <h1 className="text-[26px] font-semibold tracking-tight text-cyan-200">{data.name || "your-name"}</h1>
      {data.headline && <p className="text-[12px] text-zinc-300 mt-1">{data.headline}</p>}
      <div className="mt-2 text-[10px] text-zinc-400 break-words">
        {[data.email, data.phone, data.location].filter(Boolean).join(" | ")}
      </div>
      {data.links && data.links.length > 0 && (
        <div className="mt-1 text-[10px] text-zinc-500">{data.links.map((l) => l.label).join(" | ")}</div>
      )}
    </header>

    {data.summary && (
      <section className="mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 mb-2">Summary</h2>
        <p className="text-[12px] leading-relaxed text-zinc-200">{data.summary}</p>
      </section>
    )}

    {data.skills?.length > 0 && (
      <section className="mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 mb-2">Stack</h2>
        <div className="flex flex-wrap gap-1.5">
          {data.skills.map((s, i) => (
            <span key={i} className="text-[10px] text-cyan-200 border border-cyan-500/50 bg-zinc-900 px-2 py-0.5">
              {s}
            </span>
          ))}
        </div>
      </section>
    )}

    {data.experience?.length > 0 && (
      <section className="mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 mb-2">Experience</h2>
        <div className="space-y-3">
          {data.experience.map((e, i) => (
            <div key={i} className="border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-zinc-100">{e.title}</div>
                  <div className="text-[11px] text-zinc-300">{e.company}{e.location ? ` @ ${e.location}` : ""}</div>
                </div>
                <div className="text-[10px] text-zinc-400 whitespace-nowrap">{e.start_date}{" -> "}{e.end_date}</div>
              </div>
              <ul className="mt-2 space-y-1">
                {e.bullets.map((b, bi) => (
                  <li key={bi} className="text-[11px] text-zinc-200 leading-relaxed pl-4 relative before:absolute before:left-0 before:content-['>'] before:text-cyan-300">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    )}

    <div className="grid grid-cols-2 gap-4">
      {data.education?.length > 0 && (
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 mb-2">Education</h2>
          <div className="space-y-2">
            {data.education.map((e, i) => (
              <div key={i} className="text-[11px] text-zinc-200">
                <div className="font-semibold">{e.school}</div>
                <div>{e.degree}</div>
                <div className="text-zinc-400">{e.start_date ? `${e.start_date} -> ` : ""}{e.end_date}</div>
                {e.details && <div className="text-zinc-400">{e.details}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.projects && data.projects.length > 0 && (
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 mb-2">Projects</h2>
          <div className="space-y-2">
            {data.projects.map((p, i) => (
              <div key={i} className="text-[11px] text-zinc-200">
                <div className="font-semibold">{p.name}</div>
                <ProjectBullets
                  project={p}
                  className="mt-1 space-y-1"
                  itemClassName="text-[11px] text-zinc-200 leading-relaxed pl-4 relative before:absolute before:left-0 before:content-['>'] before:text-cyan-300"
                />
                {p.link && <div className="text-zinc-400">{p.link}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  </div>
);

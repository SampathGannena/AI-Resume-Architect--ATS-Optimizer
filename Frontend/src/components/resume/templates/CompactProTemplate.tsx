import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const CompactProTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-10" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
    <header className="flex items-end justify-between gap-4 pb-3 border-b-2 border-emerald-600">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-zinc-900 leading-none">{data.name || "Your Name"}</h1>
        {data.headline && <p className="text-[12px] text-zinc-700 mt-1">{data.headline}</p>}
      </div>
      <div className="text-right text-[10px] text-zinc-600 leading-relaxed">
        {data.email && <div>{data.email}</div>}
        {data.phone && <div>{data.phone}</div>}
        {data.location && <div>{data.location}</div>}
        {data.links?.map((l, i) => <div key={i}>{l.label}</div>)}
      </div>
    </header>

    {data.summary && (
      <p className="text-[12px] leading-relaxed text-zinc-800 mt-3">{data.summary}</p>
    )}

    <div className="grid grid-cols-[1fr_180px] gap-6 mt-5">
      <div>
        {data.experience?.length > 0 && (
          <section className="mb-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2">Experience</h2>
            <div className="space-y-3">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[13px] font-semibold text-zinc-900">{e.title} <span className="text-zinc-600 font-normal">· {e.company}{e.location ? `, ${e.location}` : ""}</span></div>
                    <div className="text-[10px] text-zinc-500 whitespace-nowrap">{e.start_date} – {e.end_date}</div>
                  </div>
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 marker:text-emerald-600">
                    {e.bullets.map((b, bi) => <li key={bi} className="text-[12px] leading-snug text-zinc-800">{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.projects && data.projects.length > 0 && (
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2">Projects</h2>
            <div className="space-y-1.5">
              {data.projects.map((p, i) => (
                <div key={i}>
                  <div className="text-[12px] font-semibold text-zinc-900">{p.name}</div>
                  <ProjectBullets
                    project={p}
                    className="mt-1 ml-4 list-disc space-y-0.5 marker:text-emerald-600"
                    itemClassName="text-[12px] leading-snug text-zinc-800"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside>
        {data.skills?.length > 0 && (
          <section className="mb-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1">
              {data.skills.map((s, i) => (
                <span key={i} className="text-[10px] text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-sm">{s}</span>
              ))}
            </div>
          </section>
        )}

        {data.education?.length > 0 && (
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2">Education</h2>
            <div className="space-y-2">
              {data.education.map((e, i) => (
                <div key={i} className="text-[11px]">
                  <div className="font-semibold text-zinc-900">{e.school}</div>
                  <div className="text-zinc-700">{e.degree}</div>
                  <div className="text-zinc-500">{e.start_date ? `${e.start_date} – ` : ""}{e.end_date}</div>
                  {e.details && <div className="text-zinc-500">{e.details}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  </div>
);

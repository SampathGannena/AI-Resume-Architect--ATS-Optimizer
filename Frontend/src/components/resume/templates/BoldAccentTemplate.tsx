import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const BoldAccentTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-0" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
    <header className="bg-violet-700 text-white px-12 py-8">
      <h1 className="text-[38px] font-bold tracking-tight leading-none">{data.name || "Your Name"}</h1>
      {data.headline && <p className="text-[14px] text-violet-100 mt-2">{data.headline}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-violet-100 mt-3">
        {data.email && <span>✉ {data.email}</span>}
        {data.phone && <span>☎ {data.phone}</span>}
        {data.location && <span>◉ {data.location}</span>}
        {data.links?.map((l, i) => <span key={i}>↗ {l.label}</span>)}
      </div>
    </header>

    <div className="px-12 py-8">
      {data.summary && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700 mb-2 border-l-4 border-violet-700 pl-2">Summary</h2>
          <p className="text-[13px] leading-relaxed text-zinc-800">{data.summary}</p>
        </section>
      )}

      {data.experience?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700 mb-3 border-l-4 border-violet-700 pl-2">Experience</h2>
          <div className="space-y-4">
            {data.experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-bold text-zinc-900">{e.title}</div>
                    <div className="text-[12px] text-violet-700 font-semibold">{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-800 px-2 py-1 rounded whitespace-nowrap">{e.start_date} – {e.end_date}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {e.bullets.map((b, bi) => (
                    <li key={bi} className="text-[13px] text-zinc-800 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:rounded-sm before:bg-violet-500">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700 mb-2 border-l-4 border-violet-700 pl-2">Skills</h2>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s, i) => (
              <span key={i} className="text-[11px] bg-violet-50 text-violet-900 border border-violet-200 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </section>
      )}

      {data.education?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700 mb-2 border-l-4 border-violet-700 pl-2">Education</h2>
          <div className="space-y-2">
            {data.education.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2 text-[13px]">
                <div>
                  <div className="font-semibold text-zinc-900">{e.degree}</div>
                  <div className="text-zinc-700">{e.school}{e.details ? ` · ${e.details}` : ""}</div>
                </div>
                <div className="text-[11px] text-zinc-500 whitespace-nowrap">{e.start_date ? `${e.start_date} – ` : ""}{e.end_date}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.projects && data.projects.length > 0 && (
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700 mb-2 border-l-4 border-violet-700 pl-2">Projects</h2>
          <div className="space-y-2">
            {data.projects.map((p, i) => (
              <div key={i}>
                <div className="text-[13px] font-bold text-zinc-900">{p.name}</div>
                <ProjectBullets
                  project={p}
                  className="mt-1 space-y-1"
                  itemClassName="text-[13px] text-zinc-800 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:rounded-sm before:bg-violet-500"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  </div>
);

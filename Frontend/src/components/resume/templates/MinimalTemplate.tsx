import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const MinimalTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-14" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
    <header className="mb-8">
      <h1 className="text-2xl font-light tracking-wide">{data.name || "Your Name"}</h1>
      {data.headline && <p className="text-sm text-zinc-500 mt-1">{data.headline}</p>}
      <div className="flex flex-wrap gap-x-3 text-xs text-zinc-500 mt-3">
        {data.email && <span>{data.email}</span>}
        {data.phone && <span>{data.phone}</span>}
        {data.location && <span>{data.location}</span>}
        {data.links?.map((l, i) => <span key={i}>{l.label}</span>)}
      </div>
    </header>

    {data.summary && (
      <section className="mb-7">
        <p className="text-sm leading-relaxed text-zinc-700">{data.summary}</p>
      </section>
    )}

    {data.experience?.length > 0 && (
      <section className="mb-7">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 mb-4">Experience</h2>
        <div className="space-y-5">
          {data.experience.map((e, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr] gap-6">
              <div className="text-xs text-zinc-500 pt-0.5">{e.start_date} – {e.end_date}</div>
              <div>
                <div className="font-medium text-sm">{e.title}</div>
                <div className="text-xs text-zinc-500 mb-2">{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                <ul className="space-y-1">
                  {e.bullets.map((b, bi) => <li key={bi} className="text-sm leading-relaxed text-zinc-700">— {b}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    )}

    {data.education?.length > 0 && (
      <section className="mb-7">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 mb-4">Education</h2>
        <div className="space-y-2">
          {data.education.map((e, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr] gap-6">
              <div className="text-xs text-zinc-500">{e.start_date ? `${e.start_date} – ` : ""}{e.end_date}</div>
              <div>
                <div className="font-medium text-sm">{e.degree}</div>
                <div className="text-xs text-zinc-500">{e.school}{e.details ? ` · ${e.details}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )}

    {data.skills?.length > 0 && (
      <section className="mb-7">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 mb-4">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {data.skills.map((s, i) => <span key={i} className="text-xs text-zinc-700 border border-zinc-200 px-2 py-1">{s}</span>)}
        </div>
      </section>
    )}

    {data.projects && data.projects.length > 0 && (
      <section>
        <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 mb-4">Projects</h2>
        {data.projects.map((p, i) => (
          <div key={i} className="grid grid-cols-[120px_1fr] gap-6 mb-2">
            <div className="text-xs text-zinc-500">{p.link || ""}</div>
            <div>
              <div className="font-medium text-sm">{p.name}</div>
              <ProjectBullets
                project={p}
                className="mt-1 space-y-1"
                itemClassName="text-sm leading-relaxed text-zinc-700"
              />
            </div>
          </div>
        ))}
      </section>
    )}
  </div>
);

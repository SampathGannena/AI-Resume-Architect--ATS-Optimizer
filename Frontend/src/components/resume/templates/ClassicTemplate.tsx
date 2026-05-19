import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const ClassicTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-12" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
    <header className="text-center mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{data.name || "Your Name"}</h1>
      {data.headline && <p className="text-base italic text-zinc-700 mt-1">{data.headline}</p>}
      <div className="flex flex-wrap justify-center gap-x-3 text-xs text-zinc-700 mt-2">
        {data.email && <span>{data.email}</span>}
        {data.phone && <span>| {data.phone}</span>}
        {data.location && <span>| {data.location}</span>}
        {data.links?.map((l, i) => <span key={i}>| {l.label}: {l.url}</span>)}
      </div>
    </header>

    {data.summary && (
      <section className="mb-5">
        <h2 className="text-sm font-bold uppercase border-b border-zinc-900 pb-1 mb-2">Professional Summary</h2>
        <p className="text-sm leading-relaxed">{data.summary}</p>
      </section>
    )}

    {data.experience?.length > 0 && (
      <section className="mb-5">
        <h2 className="text-sm font-bold uppercase border-b border-zinc-900 pb-1 mb-2">Experience</h2>
        <div className="space-y-3">
          {data.experience.map((e, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between">
                <div className="font-bold text-sm">{e.company}{e.location ? `, ${e.location}` : ""}</div>
                <div className="text-xs italic">{e.start_date} – {e.end_date}</div>
              </div>
              <div className="italic text-sm">{e.title}</div>
              <ul className="mt-1 ml-5 list-disc space-y-0.5">
                {e.bullets.map((b, bi) => <li key={bi} className="text-sm leading-relaxed">{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    )}

    {data.education?.length > 0 && (
      <section className="mb-5">
        <h2 className="text-sm font-bold uppercase border-b border-zinc-900 pb-1 mb-2">Education</h2>
        {data.education.map((e, i) => (
          <div key={i} className="flex items-baseline justify-between text-sm">
            <div>
              <div className="font-bold">{e.school}</div>
              <div className="italic">{e.degree}{e.details ? ` — ${e.details}` : ""}</div>
            </div>
            <div className="text-xs italic">{e.start_date ? `${e.start_date} – ` : ""}{e.end_date}</div>
          </div>
        ))}
      </section>
    )}

    {data.skills?.length > 0 && (
      <section className="mb-5">
        <h2 className="text-sm font-bold uppercase border-b border-zinc-900 pb-1 mb-2">Skills</h2>
        <p className="text-sm">{data.skills.join(", ")}</p>
      </section>
    )}

    {data.projects && data.projects.length > 0 && (
      <section>
        <h2 className="text-sm font-bold uppercase border-b border-zinc-900 pb-1 mb-2">Projects</h2>
        {data.projects.map((p, i) => (
          <div key={i} className="text-sm mb-1">
            <div className="font-bold">{p.name}{p.link ? ` | ${p.link}` : ""}</div>
            <ProjectBullets project={p} itemClassName="text-sm leading-relaxed" />
          </div>
        ))}
      </section>
    )}
  </div>
);

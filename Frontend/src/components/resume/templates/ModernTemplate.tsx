import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const ModernTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
    <header className="border-b-2 border-zinc-900 pb-4 mb-6">
      <h1 className="text-4xl font-bold tracking-tight">{data.name || "Your Name"}</h1>
      {data.headline && <p className="text-lg text-zinc-700 mt-1">{data.headline}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 mt-3">
        {data.email && <span>{data.email}</span>}
        {data.phone && <span>· {data.phone}</span>}
        {data.location && <span>· {data.location}</span>}
        {data.links?.map((l, i) => (
          <span key={i}>· <a href={l.url} className="underline">{l.label}</a></span>
        ))}
      </div>
    </header>

    {data.summary && (
      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-900 mb-2">Summary</h2>
        <p className="text-sm leading-relaxed text-zinc-800">{data.summary}</p>
      </section>
    )}

    {data.experience?.length > 0 && (
      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-900 mb-3">Experience</h2>
        <div className="space-y-4">
          {data.experience.map((e, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm">{e.title}</div>
                  <div className="text-sm text-zinc-700">{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                </div>
                <div className="text-xs text-zinc-600 whitespace-nowrap">{e.start_date} – {e.end_date}</div>
              </div>
              <ul className="mt-2 space-y-1">
                {e.bullets.map((b, bi) => (
                  <li key={bi} className="text-sm leading-relaxed text-zinc-800 pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-zinc-900">
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
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-900 mb-2">Skills</h2>
        <p className="text-sm text-zinc-800">{data.skills.join(" · ")}</p>
      </section>
    )}

    {data.education?.length > 0 && (
      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-900 mb-3">Education</h2>
        <div className="space-y-2">
          {data.education.map((e, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2">
              <div>
                <div className="font-semibold text-sm">{e.degree}</div>
                <div className="text-sm text-zinc-700">{e.school}</div>
                {e.details && <div className="text-xs text-zinc-600 mt-0.5">{e.details}</div>}
              </div>
              <div className="text-xs text-zinc-600 whitespace-nowrap">{e.start_date ? `${e.start_date} – ` : ""}{e.end_date}</div>
            </div>
          ))}
        </div>
      </section>
    )}

    {data.projects && data.projects.length > 0 && (
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-900 mb-3">Projects</h2>
        <div className="space-y-2">
          {data.projects.map((p, i) => (
            <div key={i}>
              <div className="font-semibold text-sm">{p.name}{p.link && <span className="font-normal text-zinc-600 text-xs ml-2">{p.link}</span>}</div>
              <ProjectBullets
                project={p}
                className="mt-1 space-y-1"
                itemClassName="text-sm leading-relaxed text-zinc-800 pl-4 relative before:content-['▸'] before:absolute before:left-0 before:text-zinc-900"
              />
            </div>
          ))}
        </div>
      </section>
    )}
  </div>
);

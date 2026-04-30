import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const ElegantSerifTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-12" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>
    <header className="text-center mb-7">
      <h1 className="text-[40px] font-semibold tracking-tight text-zinc-900 leading-tight">{data.name || "Your Name"}</h1>
      <div className="mx-auto mt-2 h-px w-24 bg-amber-700/70" />
      {data.headline && <p className="text-[14px] italic text-zinc-700 mt-3">{data.headline}</p>}
      <div className="flex flex-wrap justify-center gap-x-3 text-[11px] text-zinc-600 mt-3">
        {data.email && <span>{data.email}</span>}
        {data.phone && <span>· {data.phone}</span>}
        {data.location && <span>· {data.location}</span>}
        {data.links?.map((l, i) => <span key={i}>· {l.label}</span>)}
      </div>
    </header>

    {data.summary && (
      <section className="mb-6">
        <h2 className="text-center text-[11px] uppercase tracking-[0.3em] text-amber-800 mb-2">Profile</h2>
        <p className="text-[13px] leading-relaxed text-zinc-800 text-center max-w-3xl mx-auto">{data.summary}</p>
      </section>
    )}

    {data.experience?.length > 0 && (
      <section className="mb-6">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-amber-800 mb-3 text-center">Experience</h2>
        <div className="space-y-4">
          {data.experience.map((e, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[15px] font-semibold text-zinc-900">{e.title}</div>
                <div className="text-[11px] italic text-zinc-600 whitespace-nowrap">{e.start_date} – {e.end_date}</div>
              </div>
              <div className="text-[12px] italic text-zinc-700 mb-1">{e.company}{e.location ? `, ${e.location}` : ""}</div>
              <ul className="ml-5 list-disc space-y-1">
                {e.bullets.map((b, bi) => <li key={bi} className="text-[13px] leading-relaxed text-zinc-800">{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    )}

    <div className="grid grid-cols-2 gap-6">
      {data.education?.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-amber-800 mb-2">Education</h2>
          <div className="space-y-2">
            {data.education.map((e, i) => (
              <div key={i} className="text-[13px]">
                <div className="font-semibold text-zinc-900">{e.school}</div>
                <div className="italic text-zinc-700">{e.degree}</div>
                <div className="text-[11px] text-zinc-500">{e.start_date ? `${e.start_date} – ` : ""}{e.end_date}{e.details ? ` · ${e.details}` : ""}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills?.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-amber-800 mb-2">Skills</h2>
          <p className="text-[13px] leading-relaxed text-zinc-800">{data.skills.join(" · ")}</p>
        </section>
      )}
    </div>

    {data.projects && data.projects.length > 0 && (
      <section className="mt-6">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-amber-800 mb-2 text-center">Projects</h2>
        <div className="space-y-2">
          {data.projects.map((p, i) => (
            <div key={i}>
              <div className="text-[13px] font-semibold text-zinc-900">{p.name}</div>
              <ProjectBullets project={p} itemClassName="text-[13px] leading-relaxed text-zinc-800" />
            </div>
          ))}
        </div>
      </section>
    )}
  </div>
);

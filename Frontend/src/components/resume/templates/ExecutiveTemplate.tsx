import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const ExecutiveTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-12" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
    <header className="pb-5 border-b border-zinc-300 mb-6">
      <h1 className="text-[34px] font-semibold tracking-wide text-zinc-900">{data.name || "Your Name"}</h1>
      {data.headline && <p className="text-[15px] text-zinc-700 mt-1">{data.headline}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-600 mt-3 uppercase tracking-wide">
        {data.email && <span>{data.email}</span>}
        {data.phone && <span>• {data.phone}</span>}
        {data.location && <span>• {data.location}</span>}
        {data.links?.map((l, i) => (
          <span key={i}>• {l.label}</span>
        ))}
      </div>
    </header>

    {data.summary && (
      <section className="mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-2">Executive Summary</h2>
        <p className="text-[13px] leading-relaxed text-zinc-800">{data.summary}</p>
      </section>
    )}

    {data.experience?.length > 0 && (
      <section className="mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-3">Experience</h2>
        <div className="space-y-4">
          {data.experience.map((e, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[14px] text-zinc-900">{e.title}</div>
                  <div className="text-[13px] text-zinc-700">{e.company}{e.location ? `, ${e.location}` : ""}</div>
                </div>
                <div className="text-[11px] text-zinc-500 whitespace-nowrap">{e.start_date} - {e.end_date}</div>
              </div>
              <ul className="mt-2 space-y-1">
                {e.bullets.map((b, bi) => (
                  <li key={bi} className="text-[13px] text-zinc-800 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-0 before:content-['•'] before:text-zinc-500">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    )}

    <div className="grid grid-cols-2 gap-6">
      {data.education?.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-2">Education</h2>
          <div className="space-y-2">
            {data.education.map((e, i) => (
              <div key={i}>
                <div className="text-[13px] font-semibold text-zinc-900">{e.school}</div>
                <div className="text-[12px] text-zinc-700">{e.degree}</div>
                <div className="text-[11px] text-zinc-500">{e.start_date ? `${e.start_date} - ` : ""}{e.end_date}{e.details ? ` • ${e.details}` : ""}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills?.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-2">Core Competencies</h2>
          <p className="text-[13px] leading-relaxed text-zinc-800">{data.skills.join(" • ")}</p>
        </section>
      )}
    </div>

    {data.projects && data.projects.length > 0 && (
      <section className="mt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-2">Selected Projects</h2>
        <div className="space-y-2">
          {data.projects.map((p, i) => (
            <div key={i}>
              <div className="text-[13px] font-semibold text-zinc-900">{p.name}</div>
              <ProjectBullets
                project={p}
                className="mt-1 space-y-1"
                itemClassName="text-[13px] text-zinc-800 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-0 before:content-['•'] before:text-zinc-500"
              />
            </div>
          ))}
        </div>
      </section>
    )}
  </div>
);

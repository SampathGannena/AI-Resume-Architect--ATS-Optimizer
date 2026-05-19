import type { ResumeData } from "@/lib/resumeTypes";
import { ProjectBullets } from "../ProjectBullets";

export const CreativeTwoColumnTemplate = ({ data }: { data: ResumeData }) => (
  <div className="p-0" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
    <div className="grid grid-cols-[220px_1fr] min-h-[11in]">
      <aside className="bg-sky-50 border-r border-sky-200 p-8">
        <h1 className="text-[25px] font-bold tracking-tight text-sky-900 leading-tight">{data.name || "Your Name"}</h1>
        {data.headline && <p className="text-[12px] text-sky-800 mt-2">{data.headline}</p>}

        <section className="mt-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 mb-2">Contact</h2>
          <div className="space-y-1 text-[11px] text-sky-900">
            {data.email && <div>{data.email}</div>}
            {data.phone && <div>{data.phone}</div>}
            {data.location && <div>{data.location}</div>}
            {data.links?.map((l, i) => (
              <div key={i}>{l.label}</div>
            ))}
          </div>
        </section>

        {data.skills?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((s, i) => (
                <span key={i} className="text-[10px] text-sky-900 border border-sky-300 bg-white px-1.5 py-0.5 rounded-sm">
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {data.education?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 mb-2">Education</h2>
            <div className="space-y-3">
              {data.education.map((e, i) => (
                <div key={i}>
                  <div className="text-[11px] font-semibold text-sky-900">{e.school}</div>
                  <div className="text-[10px] text-sky-800">{e.degree}</div>
                  <div className="text-[10px] text-sky-700">{e.start_date ? `${e.start_date} - ` : ""}{e.end_date}</div>
                  {e.details && <div className="text-[10px] text-sky-700">{e.details}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>

      <main className="p-8">
        {data.summary && (
          <section className="mb-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Profile</h2>
            <p className="text-[13px] text-zinc-800 leading-relaxed">{data.summary}</p>
          </section>
        )}

        {data.experience?.length > 0 && (
          <section className="mb-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">Experience</h2>
            <div className="space-y-4">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[14px] font-semibold text-zinc-900">{e.title}</div>
                      <div className="text-[12px] text-zinc-700">{e.company}{e.location ? ` • ${e.location}` : ""}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500 whitespace-nowrap">{e.start_date} - {e.end_date}</div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {e.bullets.map((b, bi) => (
                      <li key={bi} className="text-[13px] text-zinc-800 leading-relaxed pl-4 relative before:absolute before:left-0 before:content-['◆'] before:text-sky-500">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.projects && data.projects.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-2">Projects</h2>
            <div className="space-y-2">
              {data.projects.map((p, i) => (
                <div key={i}>
                  <div className="text-[13px] font-semibold text-zinc-900">{p.name}</div>
                  <ProjectBullets
                    project={p}
                    className="mt-1 space-y-1"
                    itemClassName="text-[12px] text-zinc-800 leading-relaxed pl-4 relative before:absolute before:left-0 before:content-['◆'] before:text-sky-500"
                  />
                  {p.link && <div className="text-[10px] text-zinc-500 mt-0.5">{p.link}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  </div>
);

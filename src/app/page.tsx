import { Fragment, type ReactNode } from "react";
import { contentService } from "@/lib/content-service";
import { CopyEmail } from "@/components/CopyEmail";
import { CountUp } from "@/components/CountUp";
import { DeckIndex } from "@/components/DeckIndex";
import { LensProvider, LensSwitch } from "@/components/Lens";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Tag = "business" | "technical";

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRange(startDate: string, endDate?: string, current?: boolean): string {
  const end = current ? "Present" : endDate ? formatMonth(endDate) : "";
  return end ? `${formatMonth(startDate)} – ${end}` : formatMonth(startDate);
}

// Sets the figures inside a sentence in the display face so the numbers are scannable.
function emphasizeFigures(text: string): ReactNode {
  const parts = text.split(/(\d[\d,]*(?:\.\d+)?\+?%?|first place)/gi);
  return parts.map((part, index) =>
    index % 2 === 1 && !/^(19|20)\d{2}$/.test(part) ? (
      <strong key={index} className="fig">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

const TECHNICAL = new Set(["python", "sql", "javascript", "java", "html", "docker", "react", "git", "typescript", "sqlalchemy", "sqlite", "postgres", "vllm", "tableau"]);
const BUSINESS = new Set(["sql", "python", "tableau"]);

function skillTags(item: string, group: string): Tag[] {
  const key = item.toLowerCase();
  const tags = new Set<Tag>();
  if (TECHNICAL.has(key)) tags.add("technical");
  if (BUSINESS.has(key) || group.toLowerCase() === "analytics") tags.add("business");
  if (!tags.size) tags.add(group.toLowerCase() === "languages" ? "technical" : "business");
  return Array.from(tags);
}

function projectTags(stack: string[]): Tag[] {
  const tags = new Set<Tag>();
  stack.forEach((item) => skillTags(item, "").forEach((tag) => tags.add(tag)));
  const technicalOnly = stack.some((item) => ["react", "docker", "typescript"].includes(item.toLowerCase()));
  return technicalOnly ? ["technical"] : Array.from(tags);
}

function ExternalIcon() {
  return (
    <svg className={styles.externalIcon} viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SECTIONS = [
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
];

export default async function HomePage() {
  const { content } = await contentService.getSiteContent();
  const { profile, experience, education, skills, contact, resume } = content;
  const projects = content.projects.filter((project) => project.status === "published");
  const datathon = projects.find((project) => project.slug === "datathon-ems-dispatch");
  const resumeHref = resume.pdfUrl.toLowerCase().endsWith(".pdf") ? resume.pdfUrl : "/michael-johnson-resume.pdf";

  const proof: { value: number; prefix?: string; suffix?: string; label: string; source: string; tags: Tag[] }[] = [
    { value: 20, suffix: "%", label: "fewer mortgage file errors and delays", source: experience[0]?.company ?? "", tags: ["business"] },
    { value: 1, suffix: "st", label: "place, regional datathon", source: datathon?.title ?? "Datathon", tags: ["business", "technical"] },
    { value: 1732, label: "dispatch records analyzed in SQL and Python", source: "21 California bases", tags: ["business", "technical"] },
  ];

  return (
    <LensProvider>
      <a className="skip-link" href="#experience">
        Skip to experience
      </a>

      <header className={`${styles.hero} on-navy`}>
        <div className={styles.heroBar}>
          <p className={styles.name}>{profile.name}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href={resumeHref} download>
              Download résumé
              <span className={styles.pdfTag}>PDF</span>
            </a>
            <CopyEmail email={contact.email} className={styles.secondary} />
          </div>
        </div>

        <div className={styles.heroBody}>
          <h1 className={styles.title}>
            <span>Business analyst.</span>
            <span className={styles.titleSecond}>Full-stack builder.</span>
          </h1>
          <p className={styles.lede}>{profile.summary}</p>
          <p className={styles.meta}>{profile.location}</p>
        </div>

        <div className={styles.lensRow}>
          <span className={styles.lensLabel} id="lens-label">
            Read this page as
          </span>
          <LensSwitch />
        </div>

        <ol className={styles.proof} aria-label="Key results">
          {proof.map((item, index) => (
            <li key={item.label} className={styles.proofItem} data-tags={item.tags.join(" ")} style={{ animationDelay: `${200 + index * 140}ms` }}>
              <span className={styles.proofValue}>
                <CountUp value={item.value} prefix={item.prefix} suffix={item.suffix} delay={300 + index * 160} />
              </span>
              <span className={styles.proofLabel}>{item.label}</span>
              <span className={styles.proofSource}>{item.source}</span>
            </li>
          ))}
        </ol>
      </header>

      <div className={styles.deck}>
        <DeckIndex sections={SECTIONS} />

        <main className={styles.slides}>
          <section id="experience" className={styles.slide} aria-labelledby="experience-title">
            <h2 id="experience-title" className={styles.actionTitle}>
              Finance and operations, run on data
            </h2>
            {experience.map((job) => (
              <article key={`${job.company}-${job.startDate}`} className={styles.row} data-tags="business">
                <div className={styles.rowMeta}>
                  <p className={styles.dates}>{formatRange(job.startDate, job.endDate, job.current)}</p>
                  <p>{job.location}</p>
                </div>
                <div>
                  <h3 className={styles.rowTitle}>{job.company}</h3>
                  <p className={styles.role}>{job.role}</p>
                  <ul className={styles.bullets}>
                    {job.highlights.map((highlight) => (
                      <li key={highlight}>{emphasizeFigures(highlight)}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </section>

          <section id="projects" className={styles.slide} aria-labelledby="projects-title">
            <h2 id="projects-title" className={styles.actionTitle}>
              Proof in analysis and in code
            </h2>
            {projects.map((project) => {
              const isDatathon = project.slug === "datathon-ems-dispatch";
              return (
                <article key={project.slug} className={styles.row} data-tags={projectTags(project.stack).join(" ")}>
                  <div className={styles.rowMeta}>
                    {isDatathon ? (
                      <div className={styles.bases} aria-label="21 California bases analyzed">
                        {Array.from({ length: 21 }, (_, i) => (
                          <span key={i} style={{ animationDelay: `${i * 45}ms` }} />
                        ))}
                        <p className={styles.basesCaption}>
                          <strong className="fig">21</strong> bases
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <h3 className={styles.rowTitle}>
                      {project.title}
                      {isDatathon ? <span className={styles.badge}>1st place</span> : null}
                    </h3>
                    <p className={styles.summary}>{emphasizeFigures(project.summary)}</p>
                    <ul className={styles.bullets}>
                      {project.highlights.map((highlight) => (
                        <li key={highlight}>{emphasizeFigures(highlight)}</li>
                      ))}
                    </ul>
                    <ul className={styles.chips} aria-label={`${project.title} stack`}>
                      {project.stack.map((item) => (
                        <li key={item} data-chip data-tags={skillTags(item, "").join(" ")}>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className={styles.links}>
                      {project.links.map((link) => (
                        <a key={link.url} href={link.url} aria-label={`${project.title}: ${link.label} (opens external site)`}>
                          {link.label}
                          <ExternalIcon />
                        </a>
                      ))}
                    </p>
                  </div>
                </article>
              );
            })}
          </section>

          <section id="education" className={styles.slide} aria-labelledby="education-title">
            {education.map((entry) => (
              <Fragment key={entry.school}>
                <h2 id="education-title" className={styles.actionTitle}>
                  {entry.school}
                </h2>
                <div className={styles.row}>
                  <div className={styles.rowMeta}>
                    <p className={styles.dates}>{formatRange(entry.startDate, entry.endDate)}</p>
                  </div>
                  <div>
                    <h3 className={styles.rowTitle}>{entry.field}</h3>
                    <p className={styles.role}>{entry.degree}</p>
                    {entry.summary ? <p className={styles.summary}>{emphasizeFigures(entry.summary)}</p> : null}
                  </div>
                </div>
              </Fragment>
            ))}
          </section>

          <section id="skills" className={styles.slide} aria-labelledby="skills-title">
            <h2 id="skills-title" className={styles.actionTitle}>
              The toolkit, sorted by lens
            </h2>
            <div className={styles.skillGrid}>
              {skills.map((group) => (
                <div key={group.name}>
                  <h3 className={styles.skillGroup}>{group.name}</h3>
                  <ul className={styles.chips}>
                    {group.items.map((item) => (
                      <li key={item} data-chip data-tags={skillTags(item, group.name).join(" ")}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <footer className={styles.close}>
            <h2 className={styles.closeTitle}>Let&apos;s talk.</h2>
            <div className={styles.closeActions}>
              <a className={styles.primaryDark} href={resumeHref} download>
                Download résumé
                <span className={styles.pdfTag}>PDF</span>
              </a>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <a href={contact.linkedin} aria-label="Michael Johnson on LinkedIn (opens external site)">
                LinkedIn
                <ExternalIcon />
              </a>
              <a href={contact.github} aria-label="Michael Johnson's GitHub profile (opens external site)">
                GitHub profile
                <ExternalIcon />
              </a>
            </div>
          </footer>
        </main>
      </div>
    </LensProvider>
  );
}

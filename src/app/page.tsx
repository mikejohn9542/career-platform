import { contentService } from "@/lib/content-service";

export const dynamic = "force-dynamic";

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

const sectionStyle = { marginTop: "2rem" };

export default async function HomePage() {
  const { content } = await contentService.getSiteContent();
  const { profile, experience, education, skills, contact } = content;
  const projects = content.projects.filter((project) => project.status === "published");

  return (
    <main style={{ maxWidth: "48rem", margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <header>
        <h1 style={{ marginBottom: "0.25rem" }}>{profile.name}</h1>
        <p style={{ margin: 0, fontSize: "1.1rem" }}>{profile.headline}</p>
        <p style={{ margin: "0.25rem 0 0" }}>
          {profile.location} · <a href={`mailto:${contact.email}`}>{contact.email}</a> ·{" "}
          <a href={contact.linkedin}>LinkedIn</a> · <a href={contact.github}>GitHub</a>
        </p>
        <p>{profile.summary}</p>
      </header>

      <section style={sectionStyle}>
        <h2>Experience</h2>
        {experience.map((job) => (
          <article key={`${job.company}-${job.startDate}`}>
            <h3 style={{ marginBottom: 0 }}>
              {job.role}, {job.company}
            </h3>
            <p style={{ margin: 0 }}>
              {job.location} · {formatRange(job.startDate, job.endDate, job.current)}
            </p>
            <ul>
              {job.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section style={sectionStyle}>
        <h2>Projects</h2>
        {projects.map((project) => (
          <article key={project.slug}>
            <h3 style={{ marginBottom: 0 }}>{project.title}</h3>
            <p style={{ margin: 0 }}>{project.summary}</p>
            <ul>
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
            <p style={{ margin: 0 }}>
              {project.stack.join(" · ")}
              {project.links.map((link) => (
                <span key={link.url}>
                  {" · "}
                  <a href={link.url}>{link.label}</a>
                </span>
              ))}
            </p>
          </article>
        ))}
      </section>

      <section style={sectionStyle}>
        <h2>Education</h2>
        {education.map((entry) => (
          <article key={entry.school}>
            <h3 style={{ marginBottom: 0 }}>{entry.school}</h3>
            <p style={{ margin: 0 }}>
              {entry.degree}, {entry.field} · {formatRange(entry.startDate, entry.endDate)}
            </p>
            {entry.summary ? <p>{entry.summary}</p> : null}
          </article>
        ))}
      </section>

      <section style={sectionStyle}>
        <h2>Skills</h2>
        {skills.map((group) => (
          <p key={group.name}>
            <strong>{group.name}:</strong> {group.items.join(", ")}
          </p>
        ))}
      </section>
    </main>
  );
}

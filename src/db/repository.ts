import { and, asc, eq } from "drizzle-orm";
import type { ProfileContent, ProjectContent } from "@/content/schema";
import { profileContentSchema } from "@/content/schema";
import type { DbClient } from "./client";
import {
  contacts,
  education,
  experienceHighlights,
  experiences,
  projectHighlights,
  projectLinks,
  projectMedia,
  projectTechnologies,
  projects,
  profiles,
  resumeMetadata,
  skillGroups,
  skillItems,
} from "./schema";

const PROFILE_ID = 1;

function now(): string {
  return new Date().toISOString();
}

export async function seedProfile(client: DbClient, content: ProfileContent): Promise<void> {
  const validated = profileContentSchema.parse(content);
  const timestamp = now();

  await client.db.transaction(async (tx) => {
    // Cascading foreign keys remove every row that belongs to the profile.
    await tx.delete(profiles).where(eq(profiles.id, PROFILE_ID));

    await tx.insert(profiles).values({
      id: PROFILE_ID,
      ...validated.profile,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    for (let index = 0; index < validated.experience.length; index++) {
      const experience = validated.experience[index];
      const [inserted] = await tx.insert(experiences).values({
        profileId: PROFILE_ID,
        sortOrder: index,
        company: experience.company,
        role: experience.role,
        location: experience.location,
        startDate: experience.startDate,
        endDate: experience.endDate,
        current: experience.current ?? false,
        summary: experience.summary,
        createdAt: timestamp,
        updatedAt: timestamp,
      }).returning({ id: experiences.id });

      await tx.insert(experienceHighlights).values(
        experience.highlights.map((value, highlightIndex) => ({
          experienceId: inserted.id,
          sortOrder: highlightIndex,
          value,
        })),
      );
    }

    await tx.insert(education).values(validated.education.map((entry, index) => ({
      profileId: PROFILE_ID,
      sortOrder: index,
      ...entry,
      createdAt: timestamp,
      updatedAt: timestamp,
    })));

    for (let index = 0; index < validated.skills.length; index++) {
      const group = validated.skills[index];
      const [inserted] = await tx.insert(skillGroups).values({
        profileId: PROFILE_ID,
        sortOrder: index,
        name: group.name,
      }).returning({ id: skillGroups.id });

      await tx.insert(skillItems).values(
        group.items.map((value, itemIndex) => ({
          skillGroupId: inserted.id,
          sortOrder: itemIndex,
          value,
        })),
      );
    }

    for (let index = 0; index < validated.projects.length; index++) {
      const project = validated.projects[index];
      const [inserted] = await tx.insert(projects).values({
        profileId: PROFILE_ID,
        sortOrder: index,
        slug: project.slug,
        title: project.title,
        summary: project.summary,
        description: project.description,
        status: project.status,
        createdAt: timestamp,
        updatedAt: timestamp,
      }).returning({ id: projects.id });

      await tx.insert(projectTechnologies).values(
        project.stack.map((value, technologyIndex) => ({
          projectId: inserted.id,
          sortOrder: technologyIndex,
          value,
        })),
      );
      await tx.insert(projectHighlights).values(
        project.highlights.map((value, highlightIndex) => ({
          projectId: inserted.id,
          sortOrder: highlightIndex,
          value,
        })),
      );
      await tx.insert(projectLinks).values(
        project.links.map((link, linkIndex) => ({
          projectId: inserted.id,
          sortOrder: linkIndex,
          label: link.label,
          url: link.url,
        })),
      );
      if (project.heroImage) {
        await tx.insert(projectMedia).values({
          projectId: inserted.id,
          src: project.heroImage.src,
          alt: project.heroImage.alt,
        });
      }
    }

    await tx.insert(resumeMetadata).values({
      id: PROFILE_ID,
      profileId: PROFILE_ID,
      ...validated.resume,
    });
    await tx.insert(contacts).values({
      id: PROFILE_ID,
      profileId: PROFILE_ID,
      ...validated.contact,
    });
  });
}

async function readProject(client: DbClient, project: typeof projects.$inferSelect): Promise<ProjectContent> {
  const [stackRows, highlightRows, links, mediaRows] = await Promise.all([
    client.db.select({ value: projectTechnologies.value })
      .from(projectTechnologies)
      .where(eq(projectTechnologies.projectId, project.id))
      .orderBy(asc(projectTechnologies.sortOrder)),
    client.db.select({ value: projectHighlights.value })
      .from(projectHighlights)
      .where(eq(projectHighlights.projectId, project.id))
      .orderBy(asc(projectHighlights.sortOrder)),
    client.db.select({ label: projectLinks.label, url: projectLinks.url })
      .from(projectLinks)
      .where(eq(projectLinks.projectId, project.id))
      .orderBy(asc(projectLinks.sortOrder)),
    client.db.select({ src: projectMedia.src, alt: projectMedia.alt })
      .from(projectMedia)
      .where(eq(projectMedia.projectId, project.id))
      .limit(1),
  ]);
  const heroImage = mediaRows[0];

  return {
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    description: project.description,
    status: project.status,
    stack: stackRows.map((entry) => entry.value),
    highlights: highlightRows.map((entry) => entry.value),
    links,
    ...(heroImage ? { heroImage } : {}),
  };
}

export async function getPublishedProject(client: DbClient, slug: string): Promise<ProjectContent | null> {
  const [project] = await client.db.select().from(projects)
    .where(and(eq(projects.profileId, PROFILE_ID), eq(projects.slug, slug), eq(projects.status, "published")))
    .limit(1);
  return project ? readProject(client, project) : null;
}

export async function getPublishedProfile(client: DbClient): Promise<ProfileContent | null> {
  const [[profile], [resume], [contact]] = await Promise.all([
    client.db.select().from(profiles).where(eq(profiles.id, PROFILE_ID)).limit(1),
    client.db.select().from(resumeMetadata)
      .where(and(eq(resumeMetadata.profileId, PROFILE_ID), eq(resumeMetadata.status, "published")))
      .limit(1),
    client.db.select().from(contacts).where(eq(contacts.profileId, PROFILE_ID)).limit(1),
  ]);
  if (!profile || !resume || !contact) return null;

  const [experienceRows, educationRows, skillGroupRows, projectRows] = await Promise.all([
    client.db.select().from(experiences)
      .where(eq(experiences.profileId, PROFILE_ID)).orderBy(asc(experiences.sortOrder)),
    client.db.select().from(education)
      .where(eq(education.profileId, PROFILE_ID)).orderBy(asc(education.sortOrder)),
    client.db.select().from(skillGroups)
      .where(eq(skillGroups.profileId, PROFILE_ID)).orderBy(asc(skillGroups.sortOrder)),
    client.db.select().from(projects)
      .where(and(eq(projects.profileId, PROFILE_ID), eq(projects.status, "published")))
      .orderBy(asc(projects.sortOrder)),
  ]);

  const experienceEntries = await Promise.all(experienceRows.map(async (entry) => ({
    company: entry.company,
    role: entry.role,
    location: entry.location,
    startDate: entry.startDate,
    ...(entry.endDate ? { endDate: entry.endDate } : {}),
    ...(entry.current ? { current: true } : {}),
    summary: entry.summary,
    highlights: (await client.db.select({ value: experienceHighlights.value })
      .from(experienceHighlights)
      .where(eq(experienceHighlights.experienceId, entry.id))
      .orderBy(asc(experienceHighlights.sortOrder))).map((highlight) => highlight.value),
  })));

  const skillEntries = await Promise.all(skillGroupRows.map(async (group) => ({
    name: group.name,
    items: (await client.db.select({ value: skillItems.value })
      .from(skillItems)
      .where(eq(skillItems.skillGroupId, group.id))
      .orderBy(asc(skillItems.sortOrder))).map((item) => item.value),
  })));

  return profileContentSchema.parse({
    profile: {
      name: profile.name,
      headline: profile.headline,
      summary: profile.summary,
      location: profile.location,
      ...(profile.pronouns ? { pronouns: profile.pronouns } : {}),
    },
    experience: experienceEntries,
    education: educationRows.map(({ school, degree, field, startDate, endDate, summary }) => ({
      school, degree, field, startDate, endDate, ...(summary ? { summary } : {}),
    })),
    skills: skillEntries,
    projects: await Promise.all(projectRows.map((project) => readProject(client, project))),
    resume: {
      fileName: resume.fileName,
      publishedAt: resume.publishedAt,
      status: resume.status,
      pdfUrl: resume.pdfUrl,
      summary: resume.summary,
    },
    contact: {
      email: contact.email,
      ...(contact.phone ? { phone: contact.phone } : {}),
      linkedin: contact.linkedin,
      github: contact.github,
      ...(contact.website ? { website: contact.website } : {}),
      location: contact.location,
    },
  });
}

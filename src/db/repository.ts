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

  client.db.transaction((tx) => {
    tx.delete(profiles).where(eq(profiles.id, PROFILE_ID)).run();

    tx.insert(profiles).values({
      id: PROFILE_ID,
      ...validated.profile,
      createdAt: timestamp,
      updatedAt: timestamp,
    }).run();

    validated.experience.forEach((experience, index) => {
      const inserted = tx.insert(experiences).values({
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
      }).returning({ id: experiences.id }).get();

      tx.insert(experienceHighlights).values(
        experience.highlights.map((value, highlightIndex) => ({
          experienceId: inserted.id,
          sortOrder: highlightIndex,
          value,
        })),
      ).run();
    });

    tx.insert(education).values(validated.education.map((entry, index) => ({
      profileId: PROFILE_ID,
      sortOrder: index,
      ...entry,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))).run();

    validated.skills.forEach((group, index) => {
      const inserted = tx.insert(skillGroups).values({
        profileId: PROFILE_ID,
        sortOrder: index,
        name: group.name,
      }).returning({ id: skillGroups.id }).get();

      tx.insert(skillItems).values(
        group.items.map((value, itemIndex) => ({
          skillGroupId: inserted.id,
          sortOrder: itemIndex,
          value,
        })),
      ).run();
    });

    validated.projects.forEach((project, index) => {
      const inserted = tx.insert(projects).values({
        profileId: PROFILE_ID,
        sortOrder: index,
        slug: project.slug,
        title: project.title,
        summary: project.summary,
        description: project.description,
        status: project.status,
        createdAt: timestamp,
        updatedAt: timestamp,
      }).returning({ id: projects.id }).get();

      tx.insert(projectTechnologies).values(
        project.stack.map((value, technologyIndex) => ({
          projectId: inserted.id,
          sortOrder: technologyIndex,
          value,
        })),
      ).run();
      tx.insert(projectHighlights).values(
        project.highlights.map((value, highlightIndex) => ({
          projectId: inserted.id,
          sortOrder: highlightIndex,
          value,
        })),
      ).run();
      tx.insert(projectLinks).values(
        project.links.map((link, linkIndex) => ({
          projectId: inserted.id,
          sortOrder: linkIndex,
          label: link.label,
          url: link.url,
        })),
      ).run();
      if (project.heroImage) {
        tx.insert(projectMedia).values({
          projectId: inserted.id,
          src: project.heroImage.src,
          alt: project.heroImage.alt,
        }).run();
      }
    });

    tx.insert(resumeMetadata).values({
      id: PROFILE_ID,
      profileId: PROFILE_ID,
      ...validated.resume,
    }).run();
    tx.insert(contacts).values({
      id: PROFILE_ID,
      profileId: PROFILE_ID,
      ...validated.contact,
    }).run();
  });
}

function readProject(client: DbClient, project: typeof projects.$inferSelect): ProjectContent {
  const stack = client.db.select({ value: projectTechnologies.value })
    .from(projectTechnologies)
    .where(eq(projectTechnologies.projectId, project.id))
    .orderBy(asc(projectTechnologies.sortOrder))
    .all()
    .map((entry) => entry.value);
  const highlights = client.db.select({ value: projectHighlights.value })
    .from(projectHighlights)
    .where(eq(projectHighlights.projectId, project.id))
    .orderBy(asc(projectHighlights.sortOrder))
    .all()
    .map((entry) => entry.value);
  const links = client.db.select({
    label: projectLinks.label,
    url: projectLinks.url,
  }).from(projectLinks)
    .where(eq(projectLinks.projectId, project.id))
    .orderBy(asc(projectLinks.sortOrder))
    .all();
  const heroImage = client.db.select({
    src: projectMedia.src,
    alt: projectMedia.alt,
  }).from(projectMedia)
    .where(eq(projectMedia.projectId, project.id))
    .get();

  return {
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    description: project.description,
    status: project.status,
    stack,
    highlights,
    links,
    ...(heroImage ? { heroImage } : {}),
  };
}

export async function getPublishedProject(client: DbClient, slug: string): Promise<ProjectContent | null> {
  const project = client.db.select().from(projects)
    .where(and(eq(projects.profileId, PROFILE_ID), eq(projects.slug, slug), eq(projects.status, "published")))
    .get();
  return project ? readProject(client, project) : null;
}

export async function getPublishedProfile(client: DbClient): Promise<ProfileContent | null> {
  const profile = client.db.select().from(profiles).where(eq(profiles.id, PROFILE_ID)).get();
  const resume = client.db.select().from(resumeMetadata)
    .where(and(eq(resumeMetadata.profileId, PROFILE_ID), eq(resumeMetadata.status, "published")))
    .get();
  const contact = client.db.select().from(contacts).where(eq(contacts.profileId, PROFILE_ID)).get();
  if (!profile || !resume || !contact) return null;

  const experienceRows = client.db.select().from(experiences)
    .where(eq(experiences.profileId, PROFILE_ID)).orderBy(asc(experiences.sortOrder)).all();
  const educationRows = client.db.select().from(education)
    .where(eq(education.profileId, PROFILE_ID)).orderBy(asc(education.sortOrder)).all();
  const skillGroupRows = client.db.select().from(skillGroups)
    .where(eq(skillGroups.profileId, PROFILE_ID)).orderBy(asc(skillGroups.sortOrder)).all();
  const projectRows = client.db.select().from(projects)
    .where(and(eq(projects.profileId, PROFILE_ID), eq(projects.status, "published")))
    .orderBy(asc(projects.sortOrder)).all();

  return profileContentSchema.parse({
    profile: {
      name: profile.name,
      headline: profile.headline,
      summary: profile.summary,
      location: profile.location,
      ...(profile.pronouns ? { pronouns: profile.pronouns } : {}),
    },
    experience: experienceRows.map((entry) => ({
      company: entry.company,
      role: entry.role,
      location: entry.location,
      startDate: entry.startDate,
      ...(entry.endDate ? { endDate: entry.endDate } : {}),
      ...(entry.current ? { current: true } : {}),
      summary: entry.summary,
      highlights: client.db.select({ value: experienceHighlights.value })
        .from(experienceHighlights)
        .where(eq(experienceHighlights.experienceId, entry.id))
        .orderBy(asc(experienceHighlights.sortOrder))
        .all().map((highlight) => highlight.value),
    })),
    education: educationRows.map(({ school, degree, field, startDate, endDate, summary }) => ({
      school, degree, field, startDate, endDate, ...(summary ? { summary } : {}),
    })),
    skills: skillGroupRows.map((group) => ({
      name: group.name,
      items: client.db.select({ value: skillItems.value })
        .from(skillItems)
        .where(eq(skillItems.skillGroupId, group.id))
        .orderBy(asc(skillItems.sortOrder))
        .all().map((item) => item.value),
    })),
    projects: projectRows.map((project) => readProject(client, project)),
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

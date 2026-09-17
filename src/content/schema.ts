import { z } from "zod";

export const urlSchema = z
  .string()
  .trim()
  .url("Expected a valid absolute URL.")
  .refine((value) => /^https?:\/\//i.test(value), "URL must start with http:// or https://");

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase kebab-case");

export const publicationStatusSchema = z.enum(["draft", "published"]);

export const profileSchema = z.object({
  name: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  location: z.string().trim().min(1),
  pronouns: z.string().trim().min(1).optional(),
});

export const experienceSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  location: z.string().trim().min(1),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1).optional(),
  current: z.boolean().optional(),
  summary: z.string().trim().min(1),
  highlights: z.array(z.string().trim().min(1)).min(1),
});

export const educationSchema = z.object({
  school: z.string().trim().min(1),
  degree: z.string().trim().min(1),
  field: z.string().trim().min(1),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  summary: z.string().trim().min(1).optional(),
});

export const skillGroupSchema = z.object({
  name: z.string().trim().min(1),
  items: z.array(z.string().trim().min(1)).min(1),
});

export const projectLinkSchema = z.object({
  label: z.string().trim().min(1),
  url: urlSchema,
});

export const projectImageSchema = z.object({
  src: urlSchema,
  alt: z.string().trim().min(1),
});

export const projectSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  description: z.string().trim().min(1),
  status: publicationStatusSchema,
  stack: z.array(z.string().trim().min(1)).min(1),
  highlights: z.array(z.string().trim().min(1)).min(1),
  links: z.array(projectLinkSchema).min(1),
  heroImage: projectImageSchema.optional(),
});

export const resumeSchema = z.object({
  fileName: z.string().trim().min(1),
  publishedAt: z.string().datetime({ offset: true }),
  status: publicationStatusSchema,
  pdfUrl: urlSchema,
  summary: z.string().trim().min(1),
});

export const contactSchema = z.object({
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).optional(),
  linkedin: urlSchema,
  github: urlSchema,
  website: urlSchema.optional(),
  location: z.string().trim().min(1),
});

export const profileContentSchema = z.object({
  profile: profileSchema,
  experience: z.array(experienceSchema).min(1),
  education: z.array(educationSchema).min(1),
  skills: z.array(skillGroupSchema).min(1),
  projects: z.array(projectSchema).min(1),
  resume: resumeSchema,
  contact: contactSchema,
});

export type ProfileContent = z.infer<typeof profileContentSchema>;

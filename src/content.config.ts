import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title:           z.string(),
    date:            z.coerce.date(),
    author:          z.string().default('Hussnain Dawood'),
    category:        z.string().optional(),
    tags:            z.array(z.string()).optional(),
    featuredImage:   z.string().optional(),
    excerpt:         z.string().optional(),
    metaTitle:       z.string().optional(),
    metaDescription: z.string().optional(),
    draft:           z.boolean().default(false),
  }),
});

export const collections = { blog };

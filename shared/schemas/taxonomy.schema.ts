import { z } from "zod";

export const taxonomySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const taxonomyListSchema = z.array(taxonomySchema);

export type Taxonomy = z.infer<typeof taxonomySchema>;

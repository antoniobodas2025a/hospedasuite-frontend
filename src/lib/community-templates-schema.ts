import { z } from 'zod';

export const communityTemplateSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['cancellation', 'roomDescription', 'hotelDescription']),
  content: z.string().min(10),
  locale: z.enum(['es', 'en']),
  propertyType: z.enum(['hotel', 'glamping', 'cabanas', 'hostal', 'apartamento']).optional(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']),
  source: z.enum(['ai_generated', 'user_written', 'ai_enriched']).default('ai_generated'),
  createdAt: z.string(),
  updatedAt: z.string(),
  hotelName: z.string().optional(), // anonymized in public view
  curatedBy: z.string().optional(),
  curatedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export type CommunityTemplate = z.infer<typeof communityTemplateSchema>;

export const templateCatalogSchema = z.array(communityTemplateSchema);

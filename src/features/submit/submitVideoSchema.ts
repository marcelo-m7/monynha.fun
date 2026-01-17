import { z } from 'zod';

export const submitVideoSchema = z.object({
  youtubeUrl: z
    .string()
    .url('submit.error.invalidUrl')
    .refine((url) => url.includes('youtube.com') || url.includes('youtu.be'), 'submit.error.notYoutubeUrl'),
  description: z.string().max(500, 'submit.error.descriptionMaxLength').optional().or(z.literal('')),
  language: z.string().min(2, 'submit.error.languageRequired'),
  categoryId: z.string().optional().or(z.literal('')),
});

export type SubmitVideoFormValues = z.infer<typeof submitVideoSchema>;

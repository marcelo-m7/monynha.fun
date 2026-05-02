import { z } from 'zod';
import { emailSchema } from '@/shared/lib/validation';

export const editorApplicationSchema = z.object({
  applicantName: z.string().trim().min(1, 'editorApplications.form.errors.nameRequired').max(120, 'editorApplications.form.errors.nameTooLong'),
  applicantEmail: emailSchema,
  motivation: z.string().trim().max(2000, 'editorApplications.form.errors.motivationTooLong').optional().or(z.literal('')),
  portfolioLinks: z.string().trim().max(2000, 'editorApplications.form.errors.portfolioTooLong').optional().or(z.literal('')),
  consentPrivacy: z.boolean().refine((value) => value === true, {
    message: 'editorApplications.form.errors.consentRequired',
  }),
});

export type EditorApplicationFormValues = z.infer<typeof editorApplicationSchema>;

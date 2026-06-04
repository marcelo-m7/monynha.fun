import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { notify } from '@/shared/lib/notify';
import { editorApplicationSchema, type EditorApplicationFormValues } from '../editorApplicationSchema';
import { useSubmitEditorApplication } from '../queries/useEditorApplications';

interface EditorApplicationFormProps {
  sourcePath: string;
}

export function EditorApplicationForm({ sourcePath }: EditorApplicationFormProps) {
  const { t } = useTranslation();
  const submitMutation = useSubmitEditorApplication();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditorApplicationFormValues>({
    resolver: zodResolver(editorApplicationSchema),
    defaultValues: {
      applicantName: '',
      applicantEmail: '',
      motivation: '',
      portfolioLinks: '',
      consentPrivacy: false,
    },
  });

  const onSubmit = async (values: EditorApplicationFormValues) => {
    const portfolioLinks = (values.portfolioLinks || '')
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    let result: Awaited<ReturnType<typeof submitMutation.mutateAsync>> | null = null;

    try {
      result = await submitMutation.mutateAsync({
        applicantName: values.applicantName,
        applicantEmail: values.applicantEmail,
        motivation: values.motivation || undefined,
        portfolioLinks,
        consentPrivacy: values.consentPrivacy,
        sourcePath,
      });
    } catch {
      // Error notification is handled by the mutation's onError callback.
      return;
    }

    if (result.edgeError) {
      notify.warning(t('editorApplications.form.successTitle'), {
        description: t('editorApplications.form.successWithEmailWarningDescription'),
      });
    } else {
      notify.success(t('editorApplications.form.successTitle'), {
        description: t('editorApplications.form.successDescription'),
      });
    }

    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="applicantName">{t('editorApplications.form.fields.nameLabel')} *</Label>
        <Input
          id="applicantName"
          {...register('applicantName')}
          placeholder={t('editorApplications.form.fields.namePlaceholder')}
          aria-invalid={errors.applicantName ? 'true' : 'false'}
        />
        {errors.applicantName && (
          <p className="text-sm text-destructive">{t(errors.applicantName.message as string)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="applicantEmail">{t('editorApplications.form.fields.emailLabel')} *</Label>
        <Input
          id="applicantEmail"
          type="email"
          {...register('applicantEmail')}
          placeholder={t('editorApplications.form.fields.emailPlaceholder')}
          aria-invalid={errors.applicantEmail ? 'true' : 'false'}
        />
        {errors.applicantEmail && (
          <p className="text-sm text-destructive">{t(errors.applicantEmail.message as string)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="motivation">{t('editorApplications.form.fields.motivationLabel')}</Label>
        <Textarea
          id="motivation"
          rows={5}
          {...register('motivation')}
          placeholder={t('editorApplications.form.fields.motivationPlaceholder')}
        />
        {errors.motivation && (
          <p className="text-sm text-destructive">{t(errors.motivation.message as string)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolioLinks">{t('editorApplications.form.fields.portfolioLinksLabel')}</Label>
        <Textarea
          id="portfolioLinks"
          rows={4}
          {...register('portfolioLinks')}
          placeholder={t('editorApplications.form.fields.portfolioLinksPlaceholder')}
        />
        {errors.portfolioLinks && (
          <p className="text-sm text-destructive">{t(errors.portfolioLinks.message as string)}</p>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          {...register('consentPrivacy')}
          className="mt-0.5 h-4 w-4 rounded border-border"
        />
        <span>{t('editorApplications.form.fields.consentLabel')}</span>
      </label>
      {errors.consentPrivacy && (
        <p className="text-sm text-destructive">{t(errors.consentPrivacy.message as string)}</p>
      )}

      <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        {t('editorApplications.form.submitButton')}
      </Button>
    </form>
  );
}

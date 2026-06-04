import { MainLayout } from '@/components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { EditorApplicationForm } from '@/features/editor-applications';

export default function EditorApply() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <section className="container py-10 max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-3">
            {t('editorApplications.applyPage.badge')}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold">
            {t('editorApplications.applyPage.title')}
          </h1>
          <p className="text-muted-foreground mt-3">
            {t('editorApplications.applyPage.description')}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <EditorApplicationForm sourcePath="/editor/apply" />
        </div>
      </section>
    </MainLayout>
  );
}

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail, MapPin, Clock, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useState } from 'react';
import { emailSchema } from '@/shared/lib/validation';

// Define Zod schema for the contact form
const contactFormSchema = z.object({
  name: z.string().min(1, 'contactPage.form.nameRequired'),
  email: emailSchema.refine(() => true, { message: 'contactPage.form.emailInvalid' }),
  subject: z.string().min(1, 'contactPage.form.subjectRequired'),
  message: z.string().min(1, 'contactPage.form.messageRequired').max(1000, 'contactPage.form.messageMaxLength'),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const Contact = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      // Simulate API call - TODO: Replace with actual backend endpoint
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      toast.success(t('contactPage.successMessage'));
      reset();
    } catch (error) {
      toast.error(t('contactPage.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-3xl font-bold">{t('contact.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('contact.description')}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4">{t('contact.title')}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t('contactPage.form.nameLabel')} *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('contactPage.form.namePlaceholder')}
                  {...register('name')}
                  aria-invalid={errors.name ? "true" : "false"}
                />
                {errors.name && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.name.message as string)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('contactPage.form.emailLabel')} *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('contactPage.form.emailPlaceholder')}
                  {...register('email')}
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.email.message as string)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{t('contactPage.form.subjectLabel')} *</Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder={t('contactPage.form.subjectPlaceholder')}
                  {...register('subject')}
                  aria-invalid={errors.subject ? "true" : "false"}
                />
                {errors.subject && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.subject.message as string)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t('contactPage.form.messageLabel')} *</Label>
                <Textarea
                  id="message"
                  placeholder={t('contactPage.form.messagePlaceholder')}
                  {...register('message')}
                  rows={5}
                  maxLength={1000}
                  aria-invalid={errors.message ? "true" : "false"}
                />
                {errors.message && (
                  <p role="alert" className="text-sm text-destructive">{t(errors.message.message as string)}</p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('auth.submittingButton')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('contactPage.form.sendButton')}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Direct Contact Info */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold mb-4">{t('contactPage.directEmailLabel')}</h2>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="w-5 h-5 text-primary" />
              <a href="mailto:hello@monynha.com" className="text-foreground hover:underline">hello@monynha.com</a>
            </div>

            <h2 className="text-2xl font-bold mb-4">{t('contactPage.locationLabel')}</h2>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-5 h-5 text-accent" />
              <p className="text-foreground">{t('contactPage.locationValue')}</p>
            </div>

            <h2 className="text-2xl font-bold mb-4">{t('contactPage.responseTimeLabel')}</h2>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="w-5 h-5 text-secondary-foreground" />
              <p className="text-foreground">{t('contactPage.responseTimeValue')}</p>
            </div>

            <h2 className="text-2xl font-bold mb-4">{t('contactPage.feedbackTitle')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('contactPage.feedbackDescription')}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const faqs = [
    {
      question: t('faqPage.q1.question'),
      answer: t('faqPage.q1.answer'),
    },
    {
      question: t('faqPage.q2.question'),
      answer: t('faqPage.q2.answer'),
    },
    {
      question: t('faqPage.q3.question'),
      answer: t('faqPage.q3.answer'),
    },
    {
      question: t('faqPage.q4.question'),
      answer: t('faqPage.q4.answer'),
    },
    {
      question: t('faqPage.q5.question'),
      answer: t('faqPage.q5.answer'),
    },
  ];

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
          <h1 className="text-3xl font-bold">{t('faq.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('faq.description')}</p>
        </div>

        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            {t('faq.title')}
          </h2 >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
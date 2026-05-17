import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { MotionPage } from '@/components/premium/Motion';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, className }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <MotionPage className={`flex-1 px-0 pb-20 sm:px-0 md:pb-0 ${className}`}>
        {children}
      </MotionPage>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

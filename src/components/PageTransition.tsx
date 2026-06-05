import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export const PageTransition: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-page-enter flex-1 flex flex-col min-h-screen w-full">
      {children}
    </div>
  );
};

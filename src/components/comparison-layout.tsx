import React from 'react';

interface ImageContainerProps {
  side: 'top' | 'bottom';
  children: React.ReactNode;
}

interface ImageWrapperProps {
  children: React.ReactNode;
}

export const ComparisonContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col h-screen bg-background">
    {children}
  </div>
);

export const TopBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 border-b flex items-center space-x-4">
    {children}
  </div>
);

export const MainContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 flex overflow-hidden">
    {children}
  </div>
);

export const ComparisonArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
    {children}
  </div>
);

export const ImageContainer: React.FC<ImageContainerProps> = ({ children, side }) => (
    <div
      className={`relative w-full h-[calc(50vh-60px)] bg-muted rounded-lg overflow-hidden grid place-items-center ${
        side === 'top' ? 'mb-2' : 'mt-2'
      }`}
    >
      {children}
    </div>
  );
  
  export const ImageWrapper: React.FC<ImageWrapperProps> = ({ children }) => (
    <div className="w-full h-full flex items-center justify-center">
      {children}
    </div>
  );

export const RankingSidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-64 border-l bg-muted">
    {children}
  </div>
);

export const TieButtonContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex justify-center my-2">
    {children}
  </div>
);
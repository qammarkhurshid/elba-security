import { type ReactNode, Suspense } from 'react';

export default function SetupLoading({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<span>connecting to your github organization...</span>}>
      {children}
    </Suspense>
  );
}

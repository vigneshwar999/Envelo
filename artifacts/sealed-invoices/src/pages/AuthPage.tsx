import { SignIn, SignUp } from '@clerk/react';
import { Background } from '@/components/marketing/Background';

interface AuthPageProps {
  mode: 'sign-in' | 'sign-up';
  basePath: string;
}

export default function AuthPage({ mode, basePath }: AuthPageProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-transparent selection:bg-primary/30 selection:text-foreground relative overflow-hidden px-4">
      <Background />
      <div className="relative z-10 w-full flex justify-center">
        {mode === 'sign-in' ? (
          // path must be the full browser path — Clerk reads window.location.pathname directly
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
          />
        ) : (
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
          />
        )}
      </div>
    </div>
  );
}
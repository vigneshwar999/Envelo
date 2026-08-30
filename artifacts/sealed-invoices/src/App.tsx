import { useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import WalletSettings from '@/pages/WalletSettings';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UserProvider } from '@/context/UserContext';
import { Shell } from '@/components/layout/Shell';
import { Skeleton } from '@/components/ui/skeleton';

import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import NewInvoice from '@/pages/NewInvoice';
import InvoiceDetail from '@/pages/InvoiceDetail';
import HowItWorks from '@/pages/HowItWorks';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains. Do not inline the env var, leave
// publishableKey undefined, or replace publishableKeyFromHost with anything else.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev (Clerk hits dev FAPI directly), auto-set
// in prod. Do NOT gate on import.meta.env.PROD / NODE_ENV — the empty dev value
// is intentional, and any branching breaks the prod proxy.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

// Matches the app theme in index.css: Outfit, near-white paper, dark navy ink.
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(222 47% 11%)',
    colorForeground: 'hsl(220 15% 15%)',
    colorMutedForeground: 'hsl(220 10% 45%)',
    colorDanger: 'hsl(0 84% 60%)',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: 'hsl(220 15% 15%)',
    colorNeutral: 'hsl(220 15% 25%)',
    fontFamily: "'Outfit', sans-serif",
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox:
      'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden border border-border shadow-lg',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-foreground font-semibold tracking-tight',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground font-medium',
    formFieldLabel: 'text-foreground font-medium',
    footerActionLink: 'text-primary font-semibold hover:underline',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-muted-foreground',
    alertText: 'text-foreground',
    logoBox: 'justify-center',
    logoImage: 'h-10 w-10 rounded-lg',
    socialButtonsBlockButton: 'border border-input bg-white hover:bg-secondary',
    formButtonPrimary:
      'bg-primary text-primary-foreground hover:bg-primary/90 shadow-none font-medium',
    formFieldInput: 'bg-white border border-input text-foreground',
    footerAction: 'justify-center',
    dividerLine: 'bg-border',
    alert: 'border border-border',
    otpCodeFieldInput: 'border border-input text-foreground',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      {/* path must be the full browser path — Clerk reads window.location.pathname directly */}
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// Helps user's webview stay up-to-date when the signed-in user changes by invalidating the QueryClient cache.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function PageLoading() {
  return (
    <div className="space-y-6 py-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/** Public landing for signed-out visitors; signed-in users go straight to work. */
function HomeRoute() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <PageLoading />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Landing />;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <PageLoading />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function AppRoutes() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        {/* REQUIRED — copy "/sign-in/*?" and "/sign-up/*?" verbatim. The /*? optional
            wildcard is the only wouter syntax that matches both the bare URL and Clerk's
            OAuth sub-paths. Not /sign-in, not /sign-in/*, not /sign-in/:rest*. */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route>
          <Shell>
            <Switch>
              <Route path="/" component={HomeRoute} />
              <Route path="/dashboard">
                <Protected>
                  <Dashboard />
                </Protected>
              </Route>
              <Route path="/invoices/new">
                <Protected>
                  <NewInvoice />
                </Protected>
              </Route>
              <Route path="/invoices/:id">
                <Protected>
                  <InvoiceDetail />
                </Protected>
              </Route>
              <Route path="/wallet">
                <Protected>
                  <WalletSettings />
                </Protected>
              </Route>
              <Route path="/how-it-works" component={HowItWorks} />
              <Route component={NotFound} />
            </Switch>
          </Shell>
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back',
            subtitle: 'Sign in to open your sealed invoices',
          },
        },
        signUp: {
          start: {
            title: 'Create your account',
            subtitle: 'Invoices sealed in your browser, receipts on Arc',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <UserProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
          </TooltipProvider>
        </UserProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

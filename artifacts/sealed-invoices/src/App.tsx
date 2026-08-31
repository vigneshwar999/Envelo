import { lazy, Suspense, useEffect, useRef } from 'react';
import { ClerkProvider, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Shell } from '@/components/layout/Shell';
import { Skeleton } from '@/components/ui/skeleton';

const AuthPage = lazy(() => import('@/pages/AuthPage'));
const Explore = lazy(() => import('@/pages/Explore'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const NewInvoice = lazy(() => import('@/pages/NewInvoice'));
const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail'));
const WalletSettings = lazy(() => import('@/pages/WalletSettings'));
const PrivateUsdc = lazy(() => import('@/pages/PrivateUsdc'));
const HowItWorks = lazy(() => import('@/pages/HowItWorks'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const NotFound = lazy(() => import('@/pages/not-found'));
const UserProvider = lazy(() =>
  import('@/context/UserContext').then(({ UserProvider: Provider }) => ({
    default: Provider,
  })),
);

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

// Matches the app theme in index.css: Inter, dark mode.
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(210 6% 80%)', // TEMPORARY: silver theme trial (was orange 24 95% 53%)
    colorForeground: 'hsl(0 0% 98%)',
    colorMutedForeground: 'hsl(0 0% 60%)',
    colorDanger: 'hsl(0 84% 60%)',
    colorBackground: 'transparent',
    colorInput: 'hsl(0 0% 5%)',
    colorInputForeground: 'hsl(0 0% 98%)',
    colorNeutral: 'hsl(0 0% 60%)',
    fontFamily: "'Inter', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox:
      'bg-background/80 backdrop-blur-xl rounded-3xl w-[440px] max-w-full overflow-hidden border border-white/10 shadow-2xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none p-8',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none p-8 pt-0',
    headerTitle: 'text-foreground text-3xl font-light tracking-tight',
    headerSubtitle: 'text-muted-foreground/80 mt-2 text-base',
    socialButtonsBlockButtonText: 'text-foreground font-medium',
    formFieldLabel: 'text-foreground font-medium',
    footerActionLink: 'text-primary font-medium hover:text-primary/80 transition-colors',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground/50 text-xs font-bold uppercase tracking-widest',
    identityPreviewEditButton: 'text-primary hover:text-primary/80 transition-colors',
    formFieldSuccessText: 'text-muted-foreground',
    alertText: 'text-foreground',
    logoBox: 'justify-center',
    logoImage: 'h-12 w-12 rounded-xl border border-white/10 shadow-lg',
    socialButtonsBlockButton: 'border border-white/10 bg-white/5 hover:bg-white/10 transition-colors',
    formButtonPrimary:
      'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(201,206,212,0.3)] transition-all font-medium rounded-full h-11',
    formFieldInput: 'bg-black/40 border border-white/10 text-foreground focus:border-primary/50 transition-colors rounded-xl h-11',
    footerAction: 'justify-center',
    dividerLine: 'bg-white/10',
    alert: 'border border-white/10 bg-white/5',
    otpCodeFieldInput: 'bg-black/40 border border-white/10 text-foreground focus:border-primary/50 transition-colors rounded-xl',
    formFieldRow: 'gap-2',
    main: 'gap-6',
  },
};

function AuthLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-transparent relative overflow-hidden px-4">
      <div className="w-full max-w-[440px] space-y-6 bg-background/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
        <Skeleton className="mx-auto h-12 w-12 rounded-xl bg-white/5" />
        <Skeleton className="mx-auto h-8 w-48 bg-white/5" />
        <Skeleton className="mx-auto h-5 w-64 max-w-full bg-white/5" />
        <div className="space-y-4 pt-4">
          <Skeleton className="h-11 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-11 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-11 w-full rounded-full bg-white/5 mt-2" />
        </div>
      </div>
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
    <div className="space-y-6 py-8" role="status" aria-label="Loading page">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function AppLoading() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <PageLoading />
      </main>
    </div>
  );
}

/** Public landing for signed-out visitors; signed-in users go straight to work. */
function HomeRoute() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <PageLoading />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Explore />;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <PageLoading />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function ShellRoutes() {
  const { isLoaded, isSignedIn } = useUser();
  const routes = (
    <Shell>
      <Suspense fallback={<PageLoading />}>
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/explore" component={Explore} />
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
          <Route path="/private-usdc">
            <Protected>
              <PrivateUsdc />
            </Protected>
          </Route>
          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Shell>
  );

  if (!isLoaded || !isSignedIn) return routes;

  return (
    <Suspense fallback={<AppLoading />}>
      <UserProvider>{routes}</UserProvider>
    </Suspense>
  );
}

function AppRoutes() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        {/* REQUIRED — copy "/sign-in/*?" and "/sign-up/*?" verbatim. The /*? optional
            wildcard is the only wouter syntax that matches both the bare URL and Clerk's
            OAuth sub-paths. Not /sign-in, not /sign-in/*, not /sign-in/:rest*. */}
        <Route path="/sign-in/*?">
          <Suspense fallback={<AuthLoading />}>
            <AuthPage mode="sign-in" basePath={basePath} />
          </Suspense>
        </Route>
        <Route path="/sign-up/*?">
          <Suspense fallback={<AuthLoading />}>
            <AuthPage mode="sign-up" basePath={basePath} />
          </Suspense>
        </Route>
        <Route component={ShellRoutes} />
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
            subtitle: 'Sign in to open your Envelo invoices',
          },
        },
        signUp: {
          start: {
            title: 'Create your account',
            subtitle: 'Private paperwork. Public proof.',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
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

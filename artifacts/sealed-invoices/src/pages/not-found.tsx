import { AlertCircle } from 'lucide-react';
import { Background } from '@/components/marketing/Background';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center relative selection:bg-primary/30 selection:text-foreground">
      <Background />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl p-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <h1 className="text-2xl font-bold text-foreground">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Did you forget to add the page to the router?
          </p>
        </div>
      </div>
    </div>
  );
}

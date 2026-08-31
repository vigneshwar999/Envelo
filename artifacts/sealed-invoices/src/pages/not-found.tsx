import { Link } from 'wouter';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Background } from '@/components/marketing/Background';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center relative selection:bg-primary/30 selection:text-foreground">
      <Background />
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto px-4 space-y-8">
        <div className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md">
          <FileQuestion className="h-10 w-10 text-muted-foreground/50" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-light tracking-tight text-foreground">
            404
          </h1>
          <p className="text-xl text-muted-foreground/80 leading-relaxed text-balance">
            The page you're looking for cannot be found. It may have been moved or deleted.
          </p>
        </div>

        <Button
          asChild
          size="lg"
          className="h-12 rounded-full bg-white/5 border border-white/10 px-8 text-sm font-medium hover:bg-white/10 text-foreground transition-all backdrop-blur-md"
        >
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

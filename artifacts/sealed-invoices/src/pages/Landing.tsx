import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Fingerprint, Coins, ShieldCheck, ArrowRight } from 'lucide-react';

export function Landing() {
  return (
    <div className="space-y-16 py-8 animate-in fade-in duration-500">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Built on Circle's Arc Testnet
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground text-balance">
          Invoices sealed shut.
          <br />
          Proof out in the open.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed text-balance">
          Your invoice is encrypted in your browser before it goes anywhere - like a letter
          sealed in an envelope. Only a tamper-proof fingerprint, the wax stamp, is recorded
          on the Arc testnet. Payment settles there too, in test USDC.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/sign-up" className="flex items-center gap-2">
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* How it works, in three steps */}
      <section className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        <StepCard
          icon={<Lock className="h-5 w-5" />}
          step="Seal"
          title="Encrypted in your browser"
          text="The invoice contents are locked with keys made on your device. The server - and everyone else - only ever sees ciphertext."
        />
        <StepCard
          icon={<Fingerprint className="h-5 w-5" />}
          step="Stamp"
          title="Fingerprint anchored on Arc"
          text="A SHA-256 fingerprint of the document goes onchain. Anyone you allow in can later prove the invoice was never altered."
        />
        <StepCard
          icon={<Coins className="h-5 w-5" />}
          step="Settle"
          title="Paid in test USDC"
          text="Your client pays through the registry contract in one transaction, using Arc's native test USDC. The receipt is public; the contents stay private."
        />
      </section>

      {/* Honesty note */}
      <section className="max-w-2xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is a demo with real cryptography: real encryption in your browser, real
              transactions on the Arc testnet - and no real money anywhere. You can also share
              time-limited, revocable view access, for example with an accountant.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StepCard({
  icon,
  step,
  title,
  text,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  text: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {step}
          </span>
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}

export default Landing;

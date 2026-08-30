import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/context/UserContext';
import { useSetDisplayName } from '@workspace/api-client-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil } from 'lucide-react';

/**
 * Rename control for the signed-in user. The name set here is the letterhead:
 * it appears in the client picker, on invoice headers, in new audit-trail
 * entries, and in the navbar. It survives sign-ins - the login-derived name
 * is only a starting value the very first time an account is created.
 */
export function EditDisplayNameDialog() {
  const { me } = useMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: setDisplayName, isPending } = useSetDisplayName();

  if (!me) return null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setName(me.displayName);
      setError(null);
    }
  };

  const save = async () => {
    setError(null);
    try {
      await setDisplayName({ data: { displayName: name } });
      // The name is embedded in invoice lists, detail headers, grants and
      // the directory - refresh everything instead of chasing each query.
      await queryClient.invalidateQueries();
      toast({
        title: 'Name updated',
        description: 'Your invoices and the client picker now show it.',
      });
      setOpen(false);
    } catch (err) {
      const apiError = (err as { data?: { error?: string } })?.data?.error;
      setError(apiError ?? 'Something went wrong - please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Change the name shown on your invoices"
          data-testid="button-edit-name"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your name on invoices</DialogTitle>
          <DialogDescription>
            This is what clients see on invoices you send, in pickers, and in
            the audit trail. It stays put when you sign in again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isPending) void save();
            }}
            data-testid="input-display-name"
          />
          {error && (
            <p className="text-sm text-destructive" data-testid="text-name-error">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => void save()}
            disabled={isPending}
            data-testid="button-save-name"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save name'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMe } from '@/context/UserContext';
import { useCreateInvoice, useLookupUser, getListInvoicesQueryKey, getGetDashboardSummaryQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { sealInvoice, getStoredPublicKeyJwk } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, Loader2, FileText, Search, X } from 'lucide-react';
import { AnchorApprovalDialog } from '@/components/invoices/AnchorApprovalDialog';
import { Link } from 'wouter';

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  description: z.string().min(1, "Description is required"),
  amountUsdc: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid decimal amount (e.g. 1500.00)"),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

/** The client the lookup resolved - the DirectoryUser entry the server returned. */
type ResolvedClient = {
  id: string;
  displayName: string;
  hasEncryptionKey: boolean;
  publicKeyJwk?: string | null;
};

const ADDRESS_SHAPE = /^0x[0-9a-fA-F]{40}$/;

export function NewInvoice() {
  const { me } = useMe();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSealing, setIsSealing] = useState(false);
  // Ref, not state: a double-click on the approval sheet's Confirm fires
  // twice before React re-renders, and two seals would mean two invoices.
  const sealingRef = useRef(false);
  // Seal/create failures render inline, not as a toast: toasts auto-dismiss
  // in ~5s, and "your invoice was NOT created" is a must-see answer.
  const [sealError, setSealError] = useState<string | null>(null);
  const createInvoiceMutation = useCreateInvoice();
  const queryClient = useQueryClient();

  // The client field: type an email or wallet address, press Find. Only a
  // resolved account with an envelope key can be sealed for - the lookup
  // note explains every other outcome honestly.
  const [clientQuery, setClientQuery] = useState('');
  const [resolvedClient, setResolvedClient] = useState<ResolvedClient | null>(null);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const lookupMutation = useLookupUser();

  // Seal & Send first opens a wallet-style approval sheet; sealing only
  // starts when the user confirms there. The validated values wait here.
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<InvoiceFormValues | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: `INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      clientId: '',
      title: 'Consulting Services',
      description: 'Web development services',
      amountUsdc: '1500.00',
      notes: 'Thank you for your business.',
    },
  });

  const runLookup = () => {
    const q = clientQuery.trim();
    setLookupNote(null);
    if (!q) return;
    const looksLikeAddress = ADDRESS_SHAPE.test(q);
    if (!looksLikeAddress && !q.includes('@')) {
      setLookupNote('Enter a full email address (name@example.com) or a 0x wallet address.');
      return;
    }
    lookupMutation.mutate(
      { data: { query: q } },
      {
        onSuccess: (result) => {
          if (!result.found || !result.user) {
            setLookupNote(
              `No account with that ${looksLikeAddress ? 'wallet address' : 'email'} yet. ` +
                "Invoices are sealed with the client's own key, so ask them to sign up here first - then look them up again.",
            );
            return;
          }
          if (result.user.id === me?.id) {
            setLookupNote("That's your own account - an invoice needs someone else as the client.");
            return;
          }
          if (!result.user.hasEncryptionKey || !result.user.publicKeyJwk) {
            setLookupNote(
              `${result.user.displayName} has an account but hasn't finished setting up - ` +
                'their envelope key is missing. Ask them to sign in once, then look them up again.',
            );
            return;
          }
          setResolvedClient(result.user);
          form.setValue('clientId', result.user.id, { shouldValidate: true });
        },
        onError: (err: any) => {
          setLookupNote(err?.data?.error || 'Lookup failed. Try again.');
        },
      },
    );
  };

  const clearClient = () => {
    setResolvedClient(null);
    setClientQuery('');
    setLookupNote(null);
    form.setValue('clientId', '', { shouldValidate: false });
  };

  // Runs after zod validation passes: hold the values and ask for approval.
  const requestApproval = (data: InvoiceFormValues) => {
    setSealError(null);
    if (!resolvedClient || resolvedClient.id !== data.clientId) {
      setSealError('Look up your client first - enter their email or wallet address and press Find.');
      return;
    }
    setPendingValues(data);
    setApprovalOpen(true);
  };

  const sealAndCreate = async (data: InvoiceFormValues) => {
    if (!me) return;
    if (sealingRef.current) return;
    sealingRef.current = true;

    setIsSealing(true);
    setSealError(null);
    try {
      const client = resolvedClient;
      if (!client || !client.publicKeyJwk || client.id !== data.clientId) {
        throw new Error('Look up your client first - enter their email or wallet address and press Find.');
      }

      const ownJwk = getStoredPublicKeyJwk(me.id);
      if (!ownJwk) {
        throw new Error("This browser doesn't hold your encryption key. Sign out and back in to set it up.");
      }

      // Prepare the document
      const document = {
        invoiceNumber: data.invoiceNumber,
        title: data.title,
        freelancerName: me.displayName,
        clientName: client.displayName,
        lineItems: [
          { description: data.description, quantity: 1, unitPriceUsdc: data.amountUsdc }
        ],
        notes: data.notes || '',
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amountUsdc: data.amountUsdc,
      };

      // Seal the invoice (browser side only)
      const sealed = await sealInvoice(document, [
        { userId: me.id, publicKeyJwk: ownJwk },
        { userId: client.id, publicKeyJwk: client.publicKeyJwk },
      ]);

      // Upload the ciphertext and keys to the server
      createInvoiceMutation.mutate({
        data: {
          clientId: client.id,
          invoiceNumber: data.invoiceNumber,
          amountUsdc: data.amountUsdc,
          dueDate: document.dueDate,
          fingerprint: sealed.fingerprint,
          ciphertext: sealed.ciphertext,
          wrappedKeys: sealed.wrappedKeys,
          // Echo the exact keys the two copies were wrapped for. If either
          // key changed since this page loaded (a rotation or reset in
          // another tab), the server refuses instead of storing a copy
          // nobody could ever open - the error below tells us to reload.
          creatorPublicKeyJwk: ownJwk,
          clientPublicKeyJwk: client.publicKeyJwk,
        }
      }, {
        onSuccess: (result) => {
          toast({
            title: "Invoice Sealed",
            description: "Your invoice was securely encrypted and created.",
          });
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setLocation(`/invoices/${result.id}`);
        },
        onError: (err: any) => {
          setSealError(err?.data?.error || "Failed to create invoice.");
        }
      });
    } catch (err: any) {
      setSealError(err.message);
      sealingRef.current = false; // failed - allow a retry
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">New Sealed Invoice</h1>
        <p className="text-muted-foreground mt-1">
          The contents are encrypted in your browser before saving.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(requestApproval)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clientId"
                  render={() => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      {resolvedClient ? (
                        <div
                          className="flex h-9 items-center justify-between rounded-md border bg-secondary/40 px-3"
                          data-testid="text-client-resolved"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate font-medium">{resolvedClient.displayName}</span>
                          </span>
                          <button
                            type="button"
                            onClick={clearClient}
                            aria-label="Change client"
                            data-testid="button-client-clear"
                            className="text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              value={clientQuery}
                              onChange={(e) => setClientQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  runLookup();
                                }
                              }}
                              placeholder="client@email.com or 0x… address"
                              data-testid="input-client-query"
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={runLookup}
                            disabled={lookupMutation.isPending}
                            aria-label="Find client"
                            data-testid="button-client-lookup"
                          >
                            {lookupMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                      {lookupNote && (
                        <p
                          className="text-xs leading-relaxed text-muted-foreground"
                          data-testid="text-client-lookup-note"
                        >
                          {lookupNote}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project / Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Line Item Description</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  <FormField
                    control={form.control}
                    name="amountUsdc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (USDC)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            {sealError && (
              <div
                className="mx-6 mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                data-testid="text-seal-error"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{sealError}</span>
              </div>
            )}
            <CardFooter className="flex justify-between border-t p-6 bg-secondary/10">
              <p className="text-xs text-muted-foreground flex items-center max-w-[320px]">
                <Lock className="h-3 w-3 mr-2 text-primary shrink-0" />
                End-to-end encrypted - the server only receives ciphertext. Anchoring on Arc
                is paid from your built-in wallet; you approve the fee before anything is sent.
              </p>
              <Button type="submit" disabled={isSealing || createInvoiceMutation.isPending || !me}>
                {(isSealing || createInvoiceMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sealing...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" /> Seal & Send
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
        <AnchorApprovalDialog
          open={approvalOpen}
          onOpenChange={setApprovalOpen}
          onConfirm={() => {
            setApprovalOpen(false);
            if (pendingValues) void sealAndCreate(pendingValues);
          }}
        />
      </Form>
    </div>
  );
}

export default NewInvoice;

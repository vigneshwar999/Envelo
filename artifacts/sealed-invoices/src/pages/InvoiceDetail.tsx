import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useMe } from '@/context/UserContext';
import { 
  useGetInvoice, useGetEnvelope, useListInvoiceEvents, usePayInvoice, 
  useVerifyInvoice, useGetChainStatus, useListGrants, useCreateGrant, useRevokeGrant,
  useListUsers, useRewrapInvoiceKey, InvoiceEvent,
  getGetInvoiceQueryKey, getGetEnvelopeQueryKey, getListInvoiceEventsQueryKey,
  getListGrantsQueryKey, getListInvoicesQueryKey, getGetDashboardSummaryQueryKey,
  getListUsersQueryKey,
} from '@workspace/api-client-react';
import { openEnvelope, computeFingerprint, InvoiceDocument, rewrapKeyForUser, buildInvoiceCopyFile } from '@/lib/crypto';
import { format } from 'date-fns';

import { Background } from '@/components/marketing/Background';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RestoreKeyDialog } from '@/components/keys/RestoreKeyDialog';
import { BackupReminderBanner } from '@/components/keys/BackupReminderBanner';
import { PayApprovalDialog } from '@/components/invoices/PayApprovalDialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Lock, Unlock, ShieldAlert, ShieldCheck, CreditCard, Activity, CheckCircle2, Copy, Key, EyeOff, KeyRound } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function InvoiceDetail() {
  const [, params] = useRoute('/invoices/:id');
  const id = params?.id || '';
  const { me, keyStatus } = useMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading: isLoadingInvoice } = useGetInvoice(id, {
    query: {
      enabled: !!id,
      queryKey: getGetInvoiceQueryKey(id),
      refetchInterval: (query) =>
        (query.state.data as { anchorStatus?: string } | undefined)?.anchorStatus === 'anchored'
          ? false
          : 3000,
    },
  });
  const { data: events } = useListInvoiceEvents(id, { query: { enabled: !!id, queryKey: getListInvoiceEventsQueryKey(id) } });
  // myCopyLocked means the server already knows this user's wrapped copy is
  // gone (key reset) - skip the envelope fetch instead of collecting its 409.
  const { data: envelope, error: envelopeError } = useGetEnvelope(id, { 
    query: { enabled: !!id && invoice?.myCopyLocked !== true, queryKey: getGetEnvelopeQueryKey(id), retry: false } 
  });
  const chainStatusQ = useGetChainStatus();
  const chainStatus = chainStatusQ.data;

  const isOwner = !!me && !!invoice && invoice.freelancerId === me.id;
  const isClient = !!me && !!invoice && invoice.clientId === me.id;

  const { data: grants } = useListGrants(id, { query: { enabled: !!id && isOwner, queryKey: getListGrantsQueryKey(id) } });
  const { data: users } = useListUsers({ query: { enabled: isOwner, queryKey: getListUsersQueryKey() } });

  const payMutation = usePayInvoice();
  const verifyMutation = useVerifyInvoice();
  const createGrantMutation = useCreateGrant();
  const revokeGrantMutation = useRevokeGrant();
  const rewrapMutation = useRewrapInvoiceKey();

  const [document, setDocument] = useState<InvoiceDocument | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [selectedGrantee, setSelectedGrantee] = useState<string>('');
  const [isGranting, setIsGranting] = useState(false);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [isResharing, setIsResharing] = useState(false);
  const [payApprovalOpen, setPayApprovalOpen] = useState(false);

  // Lost-key states, straight from the server's wrapped-key bookkeeping:
  // my own copy is gone (locked out until the other party re-shares), or the
  // other party's copy is gone (I am the one who can bring them back).
  const myCopyLocked = invoice?.myCopyLocked === true;
  const counterpartyNeedsRekey = invoice?.counterpartyNeedsRekey === true;
  const otherPartyName = !invoice || !me
    ? 'the other party'
    : invoice.freelancerId === me.id
      ? invoice.clientName
      : invoice.freelancerName;

  // People the owner can share with: registered users who aren't already a
  // party to this invoice and have finished key setup.
  const activeGrants = (grants ?? []).filter(g => g.status === 'active');
  const activeGranteeIds = new Set(activeGrants.map(g => g.granteeId));
  const granteeCandidates = (users ?? []).filter(u =>
    u.id !== me?.id &&
    u.id !== invoice?.clientId &&
    u.hasEncryptionKey &&
    !activeGranteeIds.has(u.id)
  );

  // Try to decrypt if we have envelope
  const handleOpenEnvelope = async () => {
    if (!envelope || !me) return;
    setIsOpening(true);
    setOpenError(null);
    try {
      const { document: doc } = await openEnvelope(envelope.ciphertext, envelope.wrappedKey, me.id);
      setDocument(doc);
      toast({ title: "Envelope Opened", description: "Invoice decrypted successfully." });
    } catch (err: any) {
      setOpenError(err.message || "Failed to decrypt envelope. Do you have the correct private key?");
    } finally {
      setIsOpening(false);
    }
  };

  // Save the DECRYPTED document as a small JSON file the user keeps outside
  // the app. Assembled entirely in this browser from the already-open
  // document - the server never sees plaintext. The file carries everything
  // needed to re-check it against the onchain anchor later, even if this
  // server is gone (see howToVerify inside the file).
  const handleDownloadCopy = async () => {
    if (!document || !invoice) return;
    setExportError(null);
    try {
      const file = await buildInvoiceCopyFile(document, {
        invoiceId: id,
        fingerprintOnRecord: invoice.fingerprint,
        anchorStatus: invoice.anchorStatus,
        anchorTxHash: invoice.anchorTxHash,
        chainId: chainStatus?.chainId,
        explorerBaseUrl: chainStatus?.explorerBaseUrl,
      });
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      // NB: `document` here is the invoice document state - the DOM one needs window.
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `invoice-${document.invoiceNumber.replace(/[^A-Za-z0-9._-]+/g, '_')}-copy.json`;
      a.click();
      URL.revokeObjectURL(url);
      // Honest per anchor state: only an anchored fingerprint can be checked
      // against the chain today.
      toast({
        title: 'Copy saved',
        description: file.anchor.txHash
          ? 'Keep the file anywhere. Its fingerprint stays checkable against the Arc anchor without this app.'
          : "Keep the file anywhere. Its fingerprint isn't anchored onchain yet - once anchoring completes, the copy can be checked against that transaction.",
      });
    } catch (err: any) {
      // Must-see failure: rendered inline (toasts auto-dismiss).
      setExportError(err?.message || 'Could not assemble the copy in this browser.');
    }
  };

  const handlePay = () => {
    payMutation.mutate({ invoiceId: id }, {
      onSuccess: () => {
        setPayApprovalOpen(false);
        toast({ title: "Payment Complete", description: "The USDC moved on Arc testnet." });
        queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListInvoiceEventsQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: (err: any) => {
        // customFetch throws ApiError: status + parsed body live directly on the error.
        // A 409 ("network not ready") renders as a persistent inline message in the
        // Settle panel via payMutation.error — no toast, so the explanation can't be missed.
        if (err?.status !== 409) {
          toast({ title: "Payment Failed", description: err?.data?.error || "Could not process payment.", variant: "destructive" });
        }
      }
    });
  };

  const handleVerify = async () => {
    if (!document) return;
    setIsVerifying(true);
    try {
      const fingerprint = await computeFingerprint(document);
      verifyMutation.mutate({ 
        invoiceId: id, 
        data: { computedFingerprint: fingerprint } 
      }, {
        onSuccess: (res) => {
          setVerificationResult(res);
        },
        onError: () => {
          toast({ title: "Verification Failed", description: "Failed to connect to verification server.", variant: "destructive" });
        }
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!envelope || !selectedGrantee || !me) return;
    setIsGranting(true);
    try {
      const grantee = (users ?? []).find(u => u.id === selectedGrantee);
      if (!grantee?.publicKeyJwk) throw new Error("This user hasn't finished setting up their encryption key yet.");

      const newWrappedKey = await rewrapKeyForUser(envelope.wrappedKey, me.id, grantee.publicKeyJwk);

      createGrantMutation.mutate({
        invoiceId: id,
        data: {
          granteeId: selectedGrantee,
          wrappedKey: newWrappedKey,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          // Pin the wrap to the exact key it was prepared for - if the
          // grantee rotated or reset meanwhile, the server refuses instead
          // of storing a share they could never open.
          granteePublicKeyJwk: grantee.publicKeyJwk,
        }
      }, {
        onSuccess: () => {
          toast({ title: "Access Granted", description: `Granted access to ${grantee.displayName}.` });
          setSelectedGrantee('');
          queryClient.invalidateQueries({ queryKey: getListGrantsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListInvoiceEventsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: (err: any) => {
          toast({
            title: "Grant Failed",
            description: err?.data?.error || "Could not grant access.",
            variant: "destructive",
          });
          // A 409 means their key changed under us - refetch users so the
          // next attempt wraps for the key they hold now.
          if (err?.status === 409) {
            queryClient.invalidateQueries();
          }
        }
      });
    } catch(err: any) {
      toast({ title: "Grant Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGranting(false);
    }
  };

  // Re-wrap MY working copy of the envelope key for the other party's new
  // public key (which the invoice response carries), then store it server-side
  // as their permanent copy. All crypto happens in this browser.
  const handleReshare = async () => {
    if (!envelope || !me || !invoice?.counterpartyPublicKeyJwk) return;
    setIsResharing(true);
    try {
      const newWrappedKey = await rewrapKeyForUser(
        envelope.wrappedKey,
        me.id,
        invoice.counterpartyPublicKeyJwk,
      );
      // forPublicKeyJwk pins the wrap to the exact key this page prepared it
      // for - if they reset AGAIN meanwhile, the server refuses (409) instead
      // of storing a wrap they cannot open.
      rewrapMutation.mutate({ invoiceId: id, data: { wrappedKey: newWrappedKey, forPublicKeyJwk: invoice.counterpartyPublicKeyJwk } }, {
        onSuccess: () => {
          toast({ title: 'Envelope re-shared', description: `${otherPartyName} can open this invoice again.` });
          queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListInvoiceEventsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: 'Re-share failed', description: err?.data?.error || 'Could not re-share this envelope.', variant: 'destructive' });
          // A 409 means the situation changed (e.g. they already got access
          // back) - refetch so the panel reflects reality.
          if (err?.status === 409) {
            queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
          }
        },
      });
    } catch (err: any) {
      toast({ title: 'Re-share failed', description: err?.message || 'Could not re-wrap the key in this browser.', variant: 'destructive' });
    } finally {
      setIsResharing(false);
    }
  };

  const handleRevoke = (grantId: string) => {
    revokeGrantMutation.mutate({ invoiceId: id, grantId: grantId }, {
      onSuccess: () => {
        toast({ title: "Access Revoked", description: "The grant has been revoked." });
        queryClient.invalidateQueries({ queryKey: getListGrantsQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListInvoiceEventsQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard." });
  };

  if (isLoadingInvoice) {
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!invoice) {
    // Also what a revoked or expired grantee sees: for them the invoice no
    // longer exists at all (the API answers 404 so access can't be probed).
    return <div className="p-8 text-center text-muted-foreground" data-testid="text-invoice-not-found">Invoice not found.</div>;
  }

  // An anchored invoice's copy must embed real chain pointers (tx, chain id,
  // explorer), and those come from /chain/status. While that data is missing
  // - query still loading OR failed - the download stays blocked instead of
  // shipping a proof file with holes. buildInvoiceCopyFile refuses such a
  // file too; this gate just surfaces the wait/retry in the UI.
  const chainIdentityReady = chainStatus?.chainId != null && !!chainStatus?.explorerBaseUrl;
  const downloadBlockedByChain = invoice.anchorStatus === 'anchored' && !chainIdentityReady;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Background />
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Link>
      </div>

      {/* One-time key-backup reminder, for people who read invoices here
          without ever visiting the dashboard. Shares its "done/dismissed"
          memory with the dashboard banner. */}
      <BackupReminderBanner placement="invoice" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
        <div>
          <h1 className="text-4xl font-light tracking-tight">Invoice {invoice.invoiceNumber}</h1>
          <div className="text-sm text-muted-foreground/80 mt-2 flex items-center gap-3 flex-wrap">
            <span>{invoice.freelancerName} to {invoice.clientName}</span>
            <span>•</span>
            <span>Created {format(new Date(invoice.createdAt), 'MMM d, yyyy')}</span>
            <span>•</span>
            <span className="font-mono text-foreground">${invoice.amountUsdc} USDC</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {invoice.anchorStatus === 'anchored' ? (
             <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20" data-testid="badge-anchor-anchored">
               <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Onchain Anchored
             </Badge>
          ) : (
            <Badge variant="secondary" className="bg-secondary text-muted-foreground" data-testid="badge-anchor-pending">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Pending Anchor
            </Badge>
          )}
          <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'} className="px-3 py-1 text-sm" data-testid="badge-invoice-status">
            {invoice.status === 'paid' ? 'Paid' : 'Awaiting Payment'}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
        
        {/* Main Content - The Envelope / Document */}
        <div className="md:col-span-2 space-y-8">
          <Card className="overflow-hidden border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
            <div className="bg-white/[0.02] px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2 font-medium">
                {document ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-amber-600" />}
                {document ? 'Decrypted Document' : 'Sealed Envelope'}
              </div>
              {!document && envelope && !openError && keyStatus !== 'needs-restore' && (
                <Button onClick={handleOpenEnvelope} disabled={isOpening || !me} size="sm" variant="outline" data-testid="button-open-envelope">
                  {isOpening ? "Decrypting..." : "Open Envelope"}
                </Button>
              )}
              {document && (
                <div className="flex items-center gap-3">
                  {downloadBlockedByChain && !chainStatusQ.isFetching && (
                    <button
                      type="button"
                      onClick={() => chainStatusQ.refetch()}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      data-testid="button-retry-chain-status"
                    >
                      Retry chain check
                    </button>
                  )}
                  <Button onClick={handleDownloadCopy} disabled={downloadBlockedByChain} size="sm" variant="outline" data-testid="button-download-copy">
                    <Download className="h-4 w-4 mr-2" />
                    {downloadBlockedByChain
                      ? chainStatusQ.isFetching ? 'Checking chain…' : 'Chain check needed'
                      : 'Download a copy'}
                  </Button>
                </div>
              )}
            </div>
            
            <CardContent className="p-0">
              {document ? (
                <div className="p-8 bg-transparent font-sans">
                  {exportError && (
                    <div className="mb-8 text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/30" data-testid="text-export-error">
                      {exportError}
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <h2 className="text-3xl font-light text-primary">{document.title}</h2>
                      <p className="text-sm font-mono text-muted-foreground mt-2">{document.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{document.freelancerName}</p>
                      <p className="text-sm text-muted-foreground">To: {document.clientName}</p>
                    </div>
                  </div>
                  
                  <div className="border border-white/10 rounded-xl overflow-hidden mb-8 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-left border-b border-white/10">
                        <tr>
                          <th className="px-5 py-4 font-medium text-muted-foreground">Description</th>
                          <th className="px-5 py-4 font-medium text-muted-foreground text-right">Qty</th>
                          <th className="px-5 py-4 font-medium text-muted-foreground text-right">Rate</th>
                          <th className="px-5 py-4 font-medium text-muted-foreground text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {document.lineItems.map((item, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-5 text-foreground/90">{item.description}</td>
                            <td className="px-5 py-5 text-right text-foreground/90">{item.quantity}</td>
                            <td className="px-5 py-5 text-right font-mono text-foreground/90">${item.unitPriceUsdc}</td>
                            <td className="px-5 py-5 text-right font-mono font-medium text-foreground">${(item.quantity * parseFloat(item.unitPriceUsdc)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-white/5 border-t border-white/10">
                        <tr>
                          <td colSpan={3} className="px-5 py-5 text-right font-medium text-muted-foreground">Total (USDC)</td>
                          <td className="px-5 py-5 text-right font-mono font-bold text-xl text-foreground">${document.amountUsdc}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {document.notes && (
                    <div className="mb-8 p-5 bg-white/5 border border-white/5 rounded-xl backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{document.notes}</p>
                    </div>
                  )}
                  
                  <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between text-xs text-muted-foreground/60 gap-4">
                    <div>Issue Date: {format(new Date(document.issueDate), 'PP')}</div>
                    {document.dueDate && <div>Due Date: {format(new Date(document.dueDate), 'PP')}</div>}
                    <div className="font-mono px-2 py-1 rounded bg-white/5 border border-white/10">Nonce: {document.nonce.substring(0,8)}...</div>
                  </div>
                </div>
              ) : myCopyLocked ? (
                // Before the generic needs-restore panel: restoring an old
                // backup cannot help here, because the server-side copy for
                // that key is gone. Only a re-share brings this one back.
                <div className="p-12 text-center flex flex-col items-center justify-center" data-testid="panel-my-copy-locked">
                  <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                    <KeyRound className="h-8 w-8 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Sealed for a key you no longer have</h3>
                  <p className="text-muted-foreground max-w-md">
                    This envelope was sealed for your previous key, and a reset cannot bring
                    that key back. Ask <span className="font-medium text-foreground">{otherPartyName}</span> to
                    open this invoice and press <span className="font-medium text-foreground">Re-share</span> -
                    their copy still works, and the envelope opens here again right after.
                    Payment and the onchain record are not affected.
                  </p>
                </div>
              ) : envelopeError ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <EyeOff className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Access Denied</h3>
                  <p className="text-muted-foreground max-w-md">
                    You do not have the necessary keys to decrypt this envelope. The owner must grant you access first.
                  </p>
                </div>
              ) : keyStatus === 'needs-restore' ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                    <KeyRound className="h-8 w-8 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Your envelope key isn't in this browser</h3>
                  <p className="text-muted-foreground max-w-md mb-6">
                    This envelope was sealed for the key that lives in the browser where you
                    first signed in. Back it up there (Dashboard → Envelope Key), then
                    restore it here to open your invoices on this device.
                  </p>
                  <Button onClick={() => setRestoreOpen(true)} data-testid="button-restore-key-invoice">
                    <KeyRound className="h-4 w-4 mr-2" />
                    Restore my key
                  </Button>
                </div>
              ) : openError ? (
                <div className="p-12 text-center text-destructive">
                  <p>{openError}</p>
                  <Button onClick={handleOpenEnvelope} className="mt-4" variant="outline">Try Again</Button>
                </div>
              ) : (
                <div className="p-12 text-center flex flex-col items-center justify-center bg-secondary/10">
                  <Lock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-mono text-sm break-all max-w-full overflow-hidden opacity-50 px-8">
                    {envelope?.ciphertext.substring(0, 250)}...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Panel - for anyone who opened it */}
          {document && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 font-light">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Cryptographic Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5 font-mono text-xs">
                  <div className="truncate mr-4 text-muted-foreground">
                    <span className="font-semibold text-foreground">Record: </span> 
                    <span data-testid="text-fingerprint">{invoice.fingerprint}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(invoice.fingerprint)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button onClick={handleVerify} disabled={isVerifying} className="w-full" data-testid="button-verify">
                  {isVerifying ? "Computing Hash..." : "Verify Content Matches Record"}
                </Button>

                {verificationResult && (
                  <div
                    className={`p-4 rounded-md border ${verificationResult.matchesRecord ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}
                    data-testid={verificationResult.matchesRecord ? 'verify-result-match' : 'verify-result-mismatch'}
                  >
                    <div className="flex items-start gap-3">
                      {verificationResult.matchesRecord ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
                      ) : (
                        <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{verificationResult.summary}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                          Computed: {verificationResult.computedFingerprint.substring(0,16)}...
                        </p>
                        <p
                          className={`text-xs mt-1 ${verificationResult.matchesOnchain === false ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                          data-testid={
                            verificationResult.matchesOnchain === true
                              ? 'verify-onchain-match'
                              : verificationResult.matchesOnchain === false
                                ? 'verify-onchain-mismatch'
                                : 'verify-onchain-unavailable'
                          }
                        >
                          {verificationResult.matchesOnchain === true
                            ? 'Onchain copy checked: it matches.'
                            : verificationResult.matchesOnchain === false
                              ? 'Onchain copy does NOT match.'
                              : 'Onchain copy could not be checked right now.'}
                        </p>
                        {verificationResult.anchorTxHash && (
                          <a 
                            href={`${chainStatus?.explorerBaseUrl}/tx/${verificationResult.anchorTxHash}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline mt-2 inline-block"
                          >
                            View Anchor Transaction on Arc Explorer
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">

          {/* Re-share panel - shown to the party whose copy still works when
              the other party reset their key. One click: re-wrap in THIS
              browser for their new key, store it as their permanent copy. */}
          {counterpartyNeedsRekey && (
            <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-md shadow-xl" data-testid="panel-reshare">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-600" /> Re-share needed
                </CardTitle>
                <CardDescription>
                  {otherPartyName} reset their envelope key, so their copy of this invoice
                  no longer opens. Your copy still works - re-sharing wraps the envelope
                  key for their new key, right in your browser. The contents never leave it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {envelope && keyStatus === 'ready' ? (
                  <Button
                    onClick={handleReshare}
                    disabled={isResharing || rewrapMutation.isPending}
                    className="w-full"
                    data-testid="button-reshare"
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    {isResharing || rewrapMutation.isPending ? 'Re-sharing…' : `Re-share with ${otherPartyName}`}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-reshare-needs-key">
                    To re-share, this browser first needs your own envelope key. Restore
                    it (or open the envelope once), then come back here.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Panel */}
          {isClient && invoice.status === 'awaiting_payment' && invoice.anchorStatus !== 'anchored' && (
            <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-md shadow-xl" data-testid="panel-payment-waiting-for-anchor">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 font-light">
                  <ShieldAlert className="h-5 w-5 text-amber-600" /> Waiting for Arc anchor
                </CardTitle>
                <CardDescription>
                  The sender&apos;s approved transaction is still anchoring this invoice on Arc.
                  Payment unlocks automatically after the real transaction confirms.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {isClient && invoice.status === 'awaiting_payment' && invoice.anchorStatus === 'anchored' && (
            <>
              <Card className="border-primary/30 bg-primary/5 backdrop-blur-md shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 font-light">
                    <CreditCard className="h-5 w-5 text-primary" /> Settle Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-light text-center py-2">${invoice.amountUsdc}</div>
                  <p className="text-sm text-muted-foreground/80 text-center">
                    Paid from your built-in wallet in test USDC on Arc.
                  </p>

                  {!chainStatusQ.isLoading && !chainStatus?.readyForPayments && (
                    <div
                      className="text-sm p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 leading-relaxed"
                      data-testid="notice-chain-not-ready"
                    >
                      {chainStatus?.statusMessage ?? 'The Arc payment rails are not ready right now.'}
                    </div>
                  )}

                  <Button
                    onClick={() => setPayApprovalOpen(true)}
                    disabled={payMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(201,206,212,0.3)]"
                    data-testid="button-pay"
                  >
                    {payMutation.isPending ? "Processing..." : "Review & Pay with Test USDC"}
                  </Button>

                  {payMutation.isError && (
                    <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/30" data-testid="text-pay-error">
                      <p className="font-medium mb-1">{(payMutation.error as any)?.status === 409 ? "Payment needs another review" : "Payment failed"}</p>
                      <p>{(payMutation.error as any)?.data?.error || "Could not process payment. Please try again."}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <PayApprovalDialog
                open={payApprovalOpen}
                onOpenChange={setPayApprovalOpen}
                invoiceId={id}
                onConfirm={handlePay}
                confirmPending={payMutation.isPending}
              />
            </>
          )}

          {/* Access Grants Panel - owner only */}
          {isOwner && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 font-light">
                  <Key className="h-5 w-5 text-primary" /> Access Control
                </CardTitle>
                <CardDescription className="text-muted-foreground/80">Grant someone temporary access to open this envelope, e.g. an accountant.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!document ? (
                  <div className="text-sm text-amber-500 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    You must open the envelope yourself first before you can wrap a key for someone else.
                  </div>
                ) : granteeCandidates.length === 0 ? (
                  <div className="text-sm text-muted-foreground/80 p-3 bg-white/5 rounded-lg border border-white/10">
                    No one available to share with. Grantees must have a registered account here.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={selectedGrantee} onValueChange={setSelectedGrantee}>
                      <SelectTrigger className="flex-1" data-testid="select-grantee">
                        <SelectValue placeholder="Select a person" />
                      </SelectTrigger>
                      <SelectContent>
                        {granteeCandidates.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleGrantAccess} disabled={!selectedGrantee || isGranting || createGrantMutation.isPending} data-testid="button-grant-access">
                      Grant
                    </Button>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Active Grants</h4>
                  {activeGrants.length === 0 ? (
                    <p className="text-sm text-muted-foreground/60 italic">No active grants. Revoked and expired grants appear in the audit trail below.</p>
                  ) : (
                    activeGrants.map(grant => (
                      <div key={grant.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] text-sm" data-testid={`grant-row-${grant.id}`}>
                        <div>
                          <p className="font-medium text-foreground/90">{grant.granteeName}</p>
                          <p className="text-xs text-muted-foreground">Expires: {format(new Date(grant.expiresAt), 'MMM d, h:mm a')}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => handleRevoke(grant.id)} data-testid={`button-revoke-${grant.id}`}>
                          Revoke
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 font-light">
                <Activity className="h-5 w-5 text-primary" /> Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events?.map((event: InvoiceEvent) => (
                  <div key={event.id} className="relative pl-6 pb-4 border-l border-white/10 last:pb-0 last:border-transparent">
                    <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                    <p className="text-sm font-medium leading-relaxed text-foreground/90 mb-0.5">{event.detail}</p>
                    <p className="text-xs font-mono text-muted-foreground/60">{format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    {event.txHash && (
                      <a href={`${chainStatus?.explorerBaseUrl}/tx/${event.txHash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-mono mt-1 inline-block truncate max-w-full">
                        tx: {event.txHash}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RestoreKeyDialog open={restoreOpen} onOpenChange={setRestoreOpen} />
    </div>
  );
}

export default InvoiceDetail;

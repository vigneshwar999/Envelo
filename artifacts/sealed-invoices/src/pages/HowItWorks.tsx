export function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-4xl font-bold mb-6">How it Works</h1>
      <p className="text-xl text-muted-foreground mb-12">
        Sealed Invoices is a privacy-first invoicing system running on the Arc Testnet. 
        It uses end-to-end encryption so only you and your client can see the invoice contents.
      </p>
      
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-primary">1. The Sealed Envelope</h2>
          <p className="mb-4">
            When you create an invoice, it is encrypted entirely in your browser using an AES-256-GCM key. 
            We call this the <strong>Sealed Envelope</strong>. The server never sees the plaintext document—only 
            the ciphertext. 
          </p>
          <p>
            The key to open the envelope is then encrypted (wrapped) with the public keys of the authorized viewers (like you and your client). Only those with the matching private key (kept securely in their browser) can open the envelope.
          </p>
          <p className="mt-4">
            That private key — your <strong>envelope key</strong> — stays in the browser where you first signed in. 
            To open your invoices on another device, use <strong>Back up my envelope key</strong> on the Dashboard: 
            it downloads a copy locked with a passphrase you choose, which you can restore on any other device. 
            The server never sees your envelope key, locked or not.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-primary">2. The Wax Stamp (Fingerprint)</h2>
          <p className="mb-4">
            How do you know an invoice hasn't been tampered with? We create a SHA-256 hash of the 
            plaintext document before it's encrypted. This acts like a unique wax stamp or <strong>fingerprint</strong>.
          </p>
          <p>
            This fingerprint is anchored on the Arc Testnet blockchain. Later, an accountant or auditor can open the envelope, recompute the fingerprint locally, and compare it against the blockchain record. If it matches, the invoice is authentic.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-primary">3. Payments in Test USDC</h2>
          <p className="mb-4">
            Payments are settled entirely on the Arc Testnet using a mock USDC stablecoin. 
            Because this is a testnet demo, the USDC has no real-world value, but it functions exactly 
            like the real thing. 
          </p>
          <p>
            When an invoice is paid, the transaction hash is recorded alongside the invoice metadata, proving 
            that the specific invoice amount was settled between the client and the freelancer.
          </p>
        </section>
      </div>
    </div>
  );
}

export default HowItWorks;

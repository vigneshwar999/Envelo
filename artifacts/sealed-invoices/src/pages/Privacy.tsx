import { Link } from "wouter";
import { EyeOff } from "lucide-react";
import {
  LegalPageLayout,
  type LegalSection,
} from "@/components/marketing/LegalPageLayout";

const linkClass =
  "font-medium text-foreground underline-offset-4 hover:underline transition-colors";

const sections: LegalSection[] = [
  {
    heading: "What this policy covers",
    body: (
      <p>
        This policy explains what information Envelo handles when you use the
        web app and its API, who can see what, and what stays sealed. Envelo
        is a demonstration running on Arc Testnet; the same honesty we apply
        to the product applies here. The{" "}
        <Link href="/how-it-works" className={linkClass}>
          How it works
        </Link>{" "}
        page covers the underlying mechanics.
      </p>
    ),
  },
  {
    heading: "Information you give us",
    body: (
      <>
        <ul>
          <li>
            <strong>Account details.</strong> Sign-in is handled by Clerk, our
            authentication provider, which processes your email address, name,
            and sign-in activity on our behalf.
          </li>
          <li>
            <strong>Invoice workflow details.</strong> When you create an
            invoice we store, in readable form, what the service needs to
            operate it: invoice number, amount, due date, who the sender and
            client are, status, timestamps, and the invoice fingerprint.
          </li>
          <li>
            <strong>Sealed contents.</strong> Line items, descriptions, and
            notes are encrypted in your browser with AES-256-GCM before they
            are sent. We store only the resulting ciphertext and the wrapped
            (encrypted) document keys. <strong>We cannot decrypt them.</strong>
          </li>
          <li>
            <strong>Payout address (optional).</strong> If you link a
            self-owned wallet address for payouts, we store it. It stays
            private to your account.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "Information created as you use Envelo",
    body: (
      <>
        <ul>
          <li>
            <strong>Testnet wallet records.</strong> Envelo creates a testnet
            wallet for your account and keeps its address, transaction hashes,
            and test-USDC movements so the app can show balances and receipts.
          </li>
          <li>
            <strong>Invoice activity.</strong> An audit trail of workflow
            events: created, first opened, shared, paid, and similar.
          </li>
          <li>
            <strong>Usage analytics.</strong> On the published site, our
            hosting platform may collect privacy-friendly, aggregate usage
            events (page views and clicks). These are used to understand what
            gets used &mdash; not to build advertising profiles.
          </li>
          <li>
            <strong>Technical logs.</strong> Standard server logs (such as IP
            address and browser type) exist for security and debugging, as on
            almost every website.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "What we cannot see",
    body: (
      <>
        <p>Some things are designed to be invisible to us:</p>
        <ul>
          <li>
            the <strong>plaintext of sealed fields</strong> &mdash; line
            items, descriptions, and notes;
          </li>
          <li>
            your <strong>private envelope key</strong>, which stays in your
            browser;
          </li>
          <li>
            your <strong>backup passphrase</strong> &mdash; key backups are
            created and locked entirely on your device.
          </li>
        </ul>
        <p>
          Because we never hold these, we also cannot recover sealed contents
          if you lose your key and its backup.
        </p>
      </>
    ),
  },
  {
    heading: "What is public, permanently",
    body: (
      <>
        <p>
          Arc Testnet is a public blockchain. Anyone, anywhere, can see what
          is recorded there, and neither you nor we can edit or delete it:
        </p>
        <ul>
          <li>
            the invoice <strong>fingerprint</strong> (a SHA-256 hash) and its
            paid status &mdash; the fingerprint cannot be reversed into the
            invoice contents;
          </li>
          <li>
            <strong>payment transactions</strong>, including sending and
            receiving wallet addresses and test-USDC amounts, visible on the
            public block explorer.
          </li>
        </ul>
        <p>
          There is currently no confidential or shielded way to settle:{" "}
          <strong>every settlement record is public</strong>. Wallet addresses
          do not carry your name, but anyone who learns which address is yours
          can follow its activity.
        </p>
      </>
    ),
  },
  {
    heading: "What other users can see",
    body: (
      <>
        <p>
          So invoices can be addressed to you, your{" "}
          <strong>display name</strong> appears to other signed-in users in
          the recipient and sharing pickers. Your email address, wallet
          addresses, and payout details are never listed there. Someone who
          already knows your exact email or wallet address can use it to look
          up your directory entry, but the lookup only confirms a match
          &mdash; it never reveals the email or address itself.
        </p>
        <p>
          Counterparties on an invoice see its workflow details, and people
          you explicitly grant access to can unseal its contents until the
          grant expires or you revoke it.
        </p>
      </>
    ),
  },
  {
    heading: "How we use information",
    body: (
      <>
        <p>
          We use the information above to run Envelo: delivering invoices,
          wrapping keys for approved viewers, settling test payments, showing
          each participant what they are entitled to see, keeping the service
          secure, and understanding usage in aggregate to improve the product.
        </p>
        <p>
          <strong>We do not sell your information</strong>, and we do not use
          it for advertising.
        </p>
      </>
    ),
  },
  {
    heading: "Who else is involved",
    body: (
      <>
        <p>A small set of providers help run the service:</p>
        <ul>
          <li>
            <strong>Clerk</strong> handles accounts and sign-in sessions;
          </li>
          <li>
            <strong>Arc Testnet infrastructure</strong> (public RPC nodes and
            the ArcScan block explorer) processes the onchain records
            described above;
          </li>
          <li>
            <strong>our hosting platform</strong> runs the servers, database,
            and the aggregate usage analytics.
          </li>
        </ul>
        <p>Each receives only what it needs to do its job.</p>
      </>
    ),
  },
  {
    heading: "Cookies and browser storage",
    body: (
      <>
        <ul>
          <li>
            <strong>Session cookies</strong> from Clerk keep you signed in.
            They are essential &mdash; there are no advertising cookies.
          </li>
          <li>
            <strong>Local storage</strong> in your browser holds your envelope
            keys. They are never transmitted to us.
          </li>
          <li>
            <strong>Short-lived browser storage</strong> may hold small pieces
            of UI state, such as which button brought you to sign-up.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "Retention and deletion",
    body: (
      <>
        <p>
          We keep server-side records while your account exists. If you want
          your account and its server-side data deleted, contact us and we
          will handle it. Two honest caveats:
        </p>
        <ul>
          <li>
            <strong>onchain records cannot be deleted</strong> by anyone
            &mdash; fingerprints and payment transactions stay on Arc Testnet
            until the testnet itself resets;
          </li>
          <li>
            invoices you sent to others form part of{" "}
            <strong>their records too</strong>, so their workflow copies may
            persist.
          </li>
        </ul>
        <p>
          Separately, Arc Testnet may reset at any time, which can erase
          onchain records and demo balances on its own.
        </p>
      </>
    ),
  },
  {
    heading: "Your choices",
    body: (
      <ul>
        <li>
          <strong>Back up or rotate your envelope key</strong> from the
          Dashboard at any time.
        </li>
        <li>
          <strong>Grant and revoke viewer access</strong> per invoice;
          revoking takes effect immediately.
        </li>
        <li>
          <strong>Link or unlink a payout wallet</strong> whenever you like.
        </li>
        <li>
          <strong>Ask us to delete</strong> your account&rsquo;s server-side
          data.
        </li>
      </ul>
    ),
  },
  {
    heading: "Children",
    body: (
      <p>
        Envelo is not directed at children and is not intended for anyone
        under 13 (or the higher minimum age where you live).
      </p>
    ),
  },
  {
    heading: "Changes to this policy",
    body: (
      <p>
        As Envelo evolves, this policy will too. Updates appear on this page
        with a new date at the top, and material changes will be announced on
        the site.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Questions, or a deletion request? Reach us on X at{" "}
        <a
          href="https://x.com/enveloarc"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          @enveloarc
        </a>
        .
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPageLayout
      badgeIcon={EyeOff}
      badgeLabel="What Stays Sealed"
      title="Privacy Policy"
      titleTestId="text-privacy-title"
      intro="Exactly what Envelo can see, what it cannot, and what lands on a public blockchain — in the same plain language as the rest of the product."
      lastUpdated="August 30, 2026"
      summaryItems={[
        <>
          Sensitive invoice fields are{" "}
          <strong>encrypted in your browser</strong> before they reach us. We
          store ciphertext we cannot read, and we never receive your private
          key or backup passphrase.
        </>,
        <>
          We <strong>do</strong> see workflow details — invoice numbers,
          amounts, due dates, parties, and status — because the service needs
          them to work.
        </>,
        <>
          Fingerprints and test-USDC payments live on{" "}
          <strong>Arc Testnet, a public blockchain</strong>: amounts and
          wallet addresses are visible to anyone, permanently.
        </>,
        <>
          We <strong>don&rsquo;t sell your data</strong> and don&rsquo;t run
          advertising.
        </>,
      ]}
      sections={sections}
    />
  );
}

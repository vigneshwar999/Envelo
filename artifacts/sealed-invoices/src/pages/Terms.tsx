import { Link } from "wouter";
import { ScrollText } from "lucide-react";
import {
  LegalPageLayout,
  type LegalSection,
} from "@/components/marketing/LegalPageLayout";

const linkClass =
  "font-medium text-foreground underline-offset-4 hover:underline transition-colors";

const sections: LegalSection[] = [
  {
    heading: "What Envelo is",
    body: (
      <>
        <p>
          Envelo (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an invoicing
          application that demonstrates private paperwork with public proof.
          Sensitive invoice fields are encrypted in your browser, a digital
          fingerprint of the invoice is anchored on Arc Testnet or Arc Mainnet,
          and payments settle in USDC on that network. The{" "}
          <Link href="/how-it-works" className={linkClass}>
            How it works
          </Link>{" "}
          page explains the mechanics in plain language.
        </p>
        <p>
          By creating an account or using Envelo you agree to these terms and
          to the{" "}
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          . If you do not agree, please do not use Envelo.
        </p>
      </>
    ),
  },
  {
    heading: "Networks and payments",
    body: (
      <>
        <p>
          Sandbox invoices use built-in wallets and test USDC on{" "}
          <strong>Arc Testnet</strong>. Test USDC has no real-world value. Live
          invoices use real USDC on <strong>Arc Mainnet</strong>. The client
          pays from their own browser wallet straight to the sender&apos;s
          linked payout wallet. Envelo pays the small live anchor fee and never
          holds real funds. Envelo is not a bank, money transmitter, payment
          processor, or custodian, and nothing in the app is financial, legal,
          accounting, or tax advice.
        </p>
        <p>
          All settlement on Arc Testnet and Arc Mainnet is public. Envelo offers no
          confidential or shielded transfer capability: payment amounts and
          wallet addresses are visible to anyone on the public block explorer.
        </p>
        <p>
          Only send test USDC to a built-in Arc Testnet wallet. For live
          invoices, check the network, amount, and payout address in your own
          wallet before approving the payment.
        </p>
      </>
    ),
  },
  {
    heading: "Your account",
    body: (
      <>
        <p>
          You need an account to send or receive invoices. Sign-in is handled
          by Clerk, our authentication provider. You agree to provide accurate
          information, keep your sign-in credentials to yourself, and accept
          responsibility for what happens under your account. One account per
          person, please.
        </p>
        <p>
          We may suspend or remove accounts that break these terms or put
          other users or the service at risk.
        </p>
      </>
    ),
  },
  {
    heading: "Your envelope key is your responsibility",
    body: (
      <>
        <p>
          Sealed invoice contents can only be opened with your private
          envelope key. That key lives in your browser.{" "}
          <strong>
            Envelo never receives your private key or your backup passphrase
          </strong>
          , which is the point: it means we cannot read your sealed documents
          - and it also means we cannot recover them for you.
        </p>
        <p>
          You are responsible for downloading a passphrase-protected backup of
          your key from the Dashboard and keeping it safe. If you lose both
          the key and the backup, no one - including us - can
          unseal your existing envelopes. A key reset lets you continue with a
          fresh key, and counterparties can re-share invoices they sent you,
          but the reset itself does not restore anything.
        </p>
      </>
    ),
  },
  {
    heading: "What other people can see",
    body: (
      <>
        <p>
          Privacy in Envelo applies to the sealed fields of an invoice -
          line items, descriptions, and notes. It does not apply to
          everything:
        </p>
        <ul>
          <li>
            <strong>Counterparties and approved viewers</strong> of an invoice
            see its workflow details (invoice number, amount, due date,
            parties, status) and, if they hold a valid key, the sealed
            contents.
          </li>
          <li>
            <strong>Envelo</strong> stores those workflow details in readable
            form to operate the service, alongside ciphertext it cannot read.
          </li>
          <li>
            <strong>Anyone at all</strong> can see the onchain records: the
            invoice fingerprint, its paid status, and the payment transactions
             with wallet addresses and USDC amounts.
          </li>
        </ul>
        <p>
          Do not put information you consider secret into fields that are not
          sealed, such as the invoice number or the amount.
        </p>
      </>
    ),
  },
  {
    heading: "Sandbox and live wallets",
    body: (
      <>
        <p>
          For sandbox use, Envelo creates a built-in Arc Testnet wallet for each
          account and holds its private key on our servers. These wallets hold
          only test USDC. They are not used for live invoices.
        </p>
        <p>
          Test balances exist to power the demonstration. We may top up,
          adjust, or reset them at any time. Do not treat any balance shown in
          Envelo as a store of value. Live invoices require a linked,
          self-owned payout wallet. Live payments go straight from the
          client&apos;s own wallet to that payout wallet. Managing a self-owned
          wallet is entirely your responsibility.
        </p>
      </>
    ),
  },
  {
    heading: "Acceptable use",
    body: (
      <>
        <p>Keep it lawful and keep it fair. You agree not to:</p>
        <ul>
          <li>
            use Envelo for anything illegal, deceptive, or harmful, even with
            valueless test funds;
          </li>
          <li>
            try to break the encryption, access other people&rsquo;s data, or
            probe, overload, or disrupt the service;
          </li>
          <li>
            impersonate someone else or misrepresent an invoice as a real
            payment obligation when it is not;
          </li>
          <li>
            upload content you have no right to share, or content that is
            unlawful to store or distribute.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "Availability and changes",
    body: (
      <>
        <p>
          Envelo is an evolving demonstration provided free of charge. We may
          change, suspend, or discontinue any part of it at any time. Arc
          Testnet is operated by others and may be slow, unavailable, or reset
          entirely - and a testnet reset can erase wallets, balances,
          and anchored records. Keep your own copies of anything you care
          about.
        </p>
      </>
    ),
  },
  {
    heading: "Your content and our software",
    body: (
      <>
        <p>
          Your invoices remain yours. You grant us only the limited rights
          needed to run the service: storing the ciphertext and wrapped keys,
          processing workflow details, and anchoring fingerprints onchain. The
          Envelo name, design, and software remain ours.
        </p>
      </>
    ),
  },
  {
    heading: "Disclaimers and limits on liability",
    body: (
      <>
        <p>
          Envelo is provided <strong>&ldquo;as is&rdquo;</strong>, without
          warranties of any kind - including fitness for a particular
          purpose or uninterrupted availability. To the maximum extent
          permitted by law, we are not liable for indirect, incidental, or
          consequential damages, lost data, lost profits, or anything arising
          from testnet behaviour beyond our control. Our total liability is
          capped at the amount you paid us to use Envelo - which is
          zero.
        </p>
      </>
    ),
  },
  {
    heading: "Ending or updating these terms",
    body: (
      <>
        <p>
          You can stop using Envelo at any time. We may update these terms as
          the product evolves; when we do, we change the date at the top of
          this page, and material changes will be announced on the site.
          Continuing to use Envelo after an update means you accept the new
          terms.
        </p>
      </>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Questions about these terms? Reach us on X at{" "}
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

export default function Terms() {
  return (
    <LegalPageLayout
      badgeIcon={ScrollText}
      badgeLabel="The Ground Rules"
      title="Terms of Service"
      titleTestId="text-terms-title"
      intro="The plain-language agreement for using Envelo on Arc Testnet and Arc Mainnet, where the paperwork is sealed and the proof is public."
      lastUpdated="August 30, 2026"
      summaryItems={[
        <>
          Sandbox uses <strong>test USDC on Arc Testnet</strong>. Live invoices
          use real USDC on Arc Mainnet, paid wallet to wallet. Envelo never
          holds real funds.
        </>,
        <>
          Sensitive invoice fields are sealed in your browser.{" "}
          <strong>We cannot read them - and we cannot recover them</strong> if
          you lose your key and its backup.
        </>,
        <>
          Workflow details and onchain records (fingerprints, payments, wallet
          addresses) are <strong>not private</strong>.
        </>,
        <>
          Use Envelo lawfully, and don&rsquo;t rely on it as a system of
          record: testnets can reset and demo data can be lost.
        </>,
      ]}
      sections={sections}
    />
  );
}

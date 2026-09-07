import { motion } from 'framer-motion';
import { Check, Lock, X } from 'lucide-react';
import type { CSSProperties } from 'react';

import { Chip, CopyColumn, EASE_OUT, FieldBox, FieldLabel, Headline, INK, Kicker, MUTED, Panel, PanelHeader, SceneRoot, Support, UIButton } from '../ui/primitives';
import { SealedEnvelope } from '../ui/product';
import { Scramble, TypeText, makeHex } from '../ui/textfx';
import { useBeats } from '../ui/useBeats';

// ms from mount
const BEATS = [300, 900, 1350, 2150, 2950, 3700, 4300, 4650, 5800, 6900];
const B = { panel: 0, number: 1, client: 2, title: 3, item: 4, totals: 5, press: 6, encrypt: 7, fold: 8, chips: 9 };

const FIELDS = {
  number: 'INV-2026-014',
  client: 'arjun@northwind.studio',
  title: 'Brand identity, phase 2',
  item: 'Design retainer, September',
  rate: '1,250.00',
  amount: '1,250.00',
  notes: 'Payable in test USDC on Arc.',
};

const dimWhenEncrypted = (on: boolean): CSSProperties => ({ color: on ? '#9a9ea0' : INK, transition: 'color 0.6s' });

function EncField({ text, typed, encrypted, seed, mono = false }: { text: string; typed: boolean; encrypted: boolean; seed: number; mono?: boolean }) {
  return (
    <FieldBox mono={mono || encrypted} style={dimWhenEncrypted(encrypted)}>
      {encrypted ? (
        <Scramble active from={text} to={makeHex(Math.max(text.length, 14), seed)} duration={950} />
      ) : (
        <TypeText text={text} active={typed} />
      )}
    </FieldBox>
  );
}

export function Scene3_Seal() {
  const beat = useBeats(BEATS);
  const at = (k: keyof typeof B) => beat >= B[k];
  const encrypted = at('encrypt');
  const folded = at('fold');

  return (
    <SceneRoot>
      <motion.div exit={{ opacity: 0, y: '-0.8vw' }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <CopyColumn top="12.5vw" width="40vw">
          <Kicker index="01" label="Seal" />
          <Headline lines={['Encrypted before', 'it leaves your', 'browser.']} delay={0.1} />
          <Support delay={1}>AES-256-GCM in the browser. Keys wrapped for you and your client.</Support>
          {at('chips') && (
            <Support color={INK} weight={500}>
              The server never sees plaintext.
            </Support>
          )}
        </CopyColumn>
      </motion.div>

      {/* New Sealed Invoice form */}
      <motion.div
        className="absolute"
        style={{ left: '49vw', top: '10.5vw', width: '43vw', transformOrigin: '50% 50%' }}
        initial={{ opacity: 0, y: 30 }}
        animate={folded ? { opacity: 0, scaleY: 0.03, scaleX: 0.92 } : at('panel') ? { opacity: 1, y: 0 } : {}}
        transition={folded ? { duration: 0.55, ease: [0.7, 0, 0.84, 0] } : { duration: 0.9, ease: EASE_OUT }}
      >
        <Panel
          style={{
            border: encrypted ? '1px solid rgba(226,225,225,0.35)' : undefined,
            boxShadow: encrypted ? '0 1.5vw 5vw rgba(0,0,0,0.65), 0 0 3vw rgba(201,205,208,0.15)' : undefined,
            transition: 'border 0.6s, box-shadow 0.6s',
          }}
        >
          <PanelHeader title="New Sealed Invoice" icon={<Lock size="1.2vw" color={MUTED} />} right={<Chip tone={encrypted ? 'silver' : 'neutral'}>{encrypted ? 'Sealing' : 'Draft'}</Chip>} />
          <div style={{ padding: '1.4vw 1.6vw 0.4vw', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.3vw' }}>
            <div>
              <FieldLabel>Invoice Number</FieldLabel>
              <EncField text={FIELDS.number} typed={at('number')} encrypted={encrypted} seed={11} mono />
            </div>
            <div>
              <FieldLabel>Client</FieldLabel>
              <EncField text={FIELDS.client} typed={at('client')} encrypted={encrypted} seed={12} />
            </div>
          </div>
          <div style={{ padding: '1vw 1.6vw 0.4vw' }}>
            <FieldLabel>Project / Title</FieldLabel>
            <EncField text={FIELDS.title} typed={at('title')} encrypted={encrypted} seed={13} />
          </div>
          <div style={{ padding: '1vw 1.6vw 0.4vw', display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr', gap: '1.3vw' }}>
            <div>
              <FieldLabel>Line Item Description</FieldLabel>
              <EncField text={FIELDS.item} typed={at('item')} encrypted={encrypted} seed={14} />
            </div>
            <div>
              <FieldLabel>Rate</FieldLabel>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: at('totals') ? 1 : 0 }} transition={{ duration: 0.4 }}>
                <EncField text={FIELDS.rate} typed={at('totals')} encrypted={encrypted} seed={15} mono />
              </motion.div>
            </div>
            <div>
              <FieldLabel>Amount</FieldLabel>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: at('totals') ? 1 : 0 }} transition={{ duration: 0.4 }}>
                <EncField text={FIELDS.amount} typed={at('totals')} encrypted={encrypted} seed={16} mono />
              </motion.div>
            </div>
          </div>
          <div className="flex items-center justify-between" style={{ margin: '1.2vw 1.6vw 0', padding: '1.2vw 0 1.4vw', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-baseline" style={{ gap: '0.9vw' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.2vw', color: MUTED }}>Total (USDC)</span>
              <motion.span
                style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8vw', ...dimWhenEncrypted(encrypted) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: at('totals') ? 1 : 0 }}
                transition={{ duration: 0.5 }}
              >
                {encrypted ? <Scramble active from="1,250.00" to={makeHex(8, 17)} duration={900} /> : '1,250.00'}
              </motion.span>
            </div>
            <UIButton primary pressed={at('press')}>
              <Lock size="1.05vw" strokeWidth={2.4} /> Seal &amp; Send
            </UIButton>
          </div>
        </Panel>
      </motion.div>

      {/* The sealed envelope replaces the form */}
      <motion.div
        className="absolute"
        style={{ left: '59.5vw', top: '17vw' }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={folded ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.25, duration: 0.8, ease: EASE_OUT }}
      >
        <SealedEnvelope width="22vw" />
        {/* light ring on seal */}
        <motion.div
          className="absolute rounded-full"
          style={{ left: '50%', top: '52%', width: '4.2vw', height: '4.2vw', marginLeft: '-2.1vw', marginTop: '-2.1vw', border: '2px solid rgba(226,225,225,0.9)' }}
          initial={{ scale: 1, opacity: 0 }}
          animate={folded ? { scale: 3.2, opacity: [0, 0.8, 0] } : {}}
          transition={{ delay: 0.6, duration: 1.1, ease: 'easeOut' }}
        />
      </motion.div>

      {/* What leaves the browser */}
      <div className="absolute" style={{ left: '49vw', top: '34vw', width: '43vw' }}>
        <motion.div
          style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05vw', letterSpacing: '0.24em', textTransform: 'uppercase', color: MUTED, textAlign: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: at('chips') ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        >
          What the server receives
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8vw 1vw', marginTop: '1vw', width: '34vw', margin: '1vw auto 0' }}>
          {[
            { label: 'ciphertext', ok: true },
            { label: 'key wrapped for you', ok: true },
            { label: 'key wrapped for client', ok: true },
            { label: 'plaintext', ok: false },
          ].map((c, i) => (
            <motion.div key={c.label} style={{ justifySelf: i % 2 === 0 ? 'end' : 'start' }} initial={{ opacity: 0, y: 12 }} animate={at('chips') ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15 + i * 0.14, duration: 0.6, ease: EASE_OUT }}>
              <Chip tone={c.ok ? 'silver' : 'red'} dot={false} size="1.1vw" style={c.ok ? {} : { textDecoration: 'line-through', textDecorationColor: 'rgba(224,100,79,0.8)' }}>
                {c.ok ? <Check size="1vw" strokeWidth={2.5} /> : <X size="1vw" strokeWidth={2.5} />}
                {c.label}
              </Chip>
            </motion.div>
          ))}
        </div>
      </div>
    </SceneRoot>
  );
}

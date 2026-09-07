import { motion } from 'framer-motion';
import { Check, Share2, ShieldCheck, Users } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import { Avatar, Chip, EASE_OUT, FieldLabel, GREEN, Headline, INK, Kicker, MUTED, Panel, PanelHeader, SILVER_BRIGHT, SceneRoot, UIButton } from '../ui/primitives';
import { FINGERPRINT, Scramble } from '../ui/textfx';
import { useBeats } from '../ui/useBeats';

const BEATS = [400, 900, 1300, 2000, 3900, 4500];
const B = { panels: 0, row1: 1, row2: 2, compute: 3, match: 4, revoke: 5 };

function GrantRow({ show, initial, name, meta, children, dimmed = false }: PropsWithChildren<{ show: boolean; initial: string; name: string; meta: string; dimmed?: boolean }>) {
  return (
    <motion.div
      className="flex items-center justify-between"
      style={{ padding: '1.1vw 1.6vw', borderTop: '1px solid rgba(255,255,255,0.07)' }}
      initial={{ opacity: 0, x: -12 }}
      animate={show ? { opacity: dimmed ? 0.5 : 1, x: 0 } : {}}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <div className="flex items-center" style={{ gap: '0.9vw' }}>
        <Avatar initial={initial} size="2.8vw" />
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.3vw', fontWeight: 500, color: INK, whiteSpace: 'nowrap', textDecoration: dimmed ? 'line-through' : 'none' }}>{name}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.05vw', color: MUTED, marginTop: '0.15vw', whiteSpace: 'nowrap' }}>{meta}</div>
        </div>
      </div>
      <div className="flex items-center" style={{ gap: '0.6vw' }}>{children}</div>
    </motion.div>
  );
}

function HashBlock({ label, children, matched }: PropsWithChildren<{ label: string; matched: boolean }>) {
  return (
    <div
      style={{
        padding: '0.9vw 1vw',
        borderRadius: '0.5vw',
        background: matched ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.035)',
        border: `1px solid ${matched ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
        transition: 'background 0.6s, border 0.6s',
      }}
    >
      <FieldLabel>{label}</FieldLabel>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1vw', lineHeight: 1.5, color: matched ? GREEN : SILVER_BRIGHT, letterSpacing: '0.03em', transition: 'color 0.6s' }}>{children}</div>
    </div>
  );
}

export function Scene6_GrantVerify() {
  const beat = useBeats(BEATS);
  const at = (k: keyof typeof B) => beat >= B[k];
  const matched = at('match');
  const revoked = at('revoke');

  return (
    <SceneRoot>
      <motion.div exit={{ opacity: 0, y: '-0.8vw' }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <div className="absolute" style={{ left: '6vw', top: '6.2vw', display: 'flex', flexDirection: 'column', gap: '1.3vw' }}>
          <Kicker index="04" label="Grant & Verify" />
          <Headline lines={['Anyone can verify the proof.', 'Only people you choose can read it.']} size="3.5vw" delay={0.1} />
        </div>

        <div className="absolute flex" style={{ left: '6vw', top: '20.5vw', gap: '4vw' }}>
          {/* Grants */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={at('panels') ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, ease: EASE_OUT }}>
            <Panel width="42vw">
              <PanelHeader title="Active Grants" icon={<Users size="1.2vw" color={MUTED} />} right={<UIButton style={{ height: '2.6vw', fontSize: '1.05vw', padding: '0 1vw' }}><Share2 size="1.05vw" /> Re-share</UIButton>} />
              <GrantRow show={at('row1')} initial="A" name="Arjun Mehta" meta="Client · Northwind Studio">
                <Chip tone="silver" dot={false}>Full access</Chip>
                <Chip tone="neutral" dot={false}>No expiry</Chip>
              </GrantRow>
              <GrantRow show={at('row2')} initial="M" name="Meera Iyer" meta="Accountant" dimmed={revoked}>
                {revoked ? (
                  <Chip tone="red">Access revoked</Chip>
                ) : (
                  <Chip tone="amber">Read only · 7 days</Chip>
                )}
                <UIButton pressed={revoked} style={{ height: '2.6vw', fontSize: '1.05vw', padding: '0 1vw', opacity: revoked ? 0.4 : 1 }}>
                  Revoke
                </UIButton>
              </GrantRow>
            </Panel>
          </motion.div>

          {/* Verify */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={at('panels') ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15, duration: 0.8, ease: EASE_OUT }}>
            <Panel width="42vw">
              <PanelHeader
                title="Verify Content Matches Record"
                icon={<ShieldCheck size="1.2vw" color={matched ? GREEN : MUTED} />}
                right={matched ? <Chip tone="green">Match</Chip> : <Chip tone="neutral">{at('compute') ? 'Hashing…' : 'Ready'}</Chip>}
              />
              <div style={{ padding: '1.2vw 1.6vw 1.4vw', display: 'flex', flexDirection: 'column', gap: '0.7vw' }}>
                <HashBlock label="On-chain record" matched={matched}>
                  <div>{FINGERPRINT.slice(0, 32)}</div>
                  <div>{FINGERPRINT.slice(32)}</div>
                </HashBlock>
                <div className="flex items-center justify-center" style={{ gap: '0.8vw', fontFamily: 'var(--font-mono)', fontSize: '1.12vw', color: matched ? GREEN : MUTED, transition: 'color 0.6s' }}>
                  <span style={{ width: '6vw', height: 1, background: matched ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.1)' }} />
                  {matched ? (
                    <span className="inline-flex items-center" style={{ gap: '0.5vw' }}>
                      <Check size="1.1vw" strokeWidth={2.6} /> Content matches on-chain record
                    </span>
                  ) : (
                    <span>compare</span>
                  )}
                  <span style={{ width: '6vw', height: 1, background: matched ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.1)' }} />
                </div>
                <HashBlock label="Computed from file" matched={matched}>
                  <div>
                    <Scramble active={at('compute')} to={FINGERPRINT.slice(0, 32)} duration={1600} />
                  </div>
                  <div>
                    <Scramble active={at('compute')} to={FINGERPRINT.slice(32)} duration={1600} />
                  </div>
                </HashBlock>
              </div>
            </Panel>
          </motion.div>
        </div>
      </motion.div>
    </SceneRoot>
  );
}

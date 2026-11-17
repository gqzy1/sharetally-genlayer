import React from 'react';

const STEPS = [
  {
    num: '01',
    title: 'Create Quote',
    actor: 'Organizer',
    desc: 'Enter title, currency (GBP/USD/EUR), full supplier quotation, and 2–4 named wallets in deterministic roster order.',
    badge: 'DRAFT',
  },
  {
    num: '02',
    title: 'Seal',
    actor: 'Organizer Wallet',
    desc: 'Write immutable input & owner-qualified ID (<owner>:<tag>). Input hash locks all terms and member order.',
    badge: 'SEALED',
  },
  {
    num: '03',
    title: 'Assess',
    actor: 'GenLayer Consensus',
    desc: 'Leader & validators independently extract all 2^n - 1 coalition costs and audit every quote anchor.',
    badge: 'REVIEW / READY',
  },
  {
    num: '04',
    title: 'Inspect Allocation',
    actor: 'Deterministic Contract',
    desc: 'Compute exact Shapley numerators (a_i / n!), largest-remainder rounding, and every subgroup exit check.',
    badge: 'BLOCKED / READY',
  },
  {
    num: '05',
    title: 'Member Approval',
    actor: 'Named Wallets',
    desc: 'Each member verifies the split and signs the exact allocation digest at the current revision.',
    badge: 'READY',
  },
  {
    num: '06',
    title: 'Committed',
    actor: 'Final Distinct Signer',
    desc: 'Final member approval locks the plan as an immutable, exportable cost instruction record.',
    badge: 'COMMITTED',
  },
];

export const WorkflowStepper: React.FC = () => (
  <div className="workflow-grid" role="list" aria-label="ShareTally protocol workflow">
    {STEPS.map((step) => (
      <article key={step.num} className="workflow-card" role="listitem">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="workflow-num">{step.num}</span>
          <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
            {step.actor}
          </span>
        </div>
        <h3 className="workflow-title">{step.title}</h3>
        <p className="workflow-body">{step.desc}</p>
        <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
          <span
            className="mono"
            style={{
              fontSize: '0.68rem',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              background: 'var(--bg-subtle)',
              color: 'var(--ink-secondary)',
            }}
          >
            {step.badge}
          </span>
        </div>
      </article>
    ))}
  </div>
);

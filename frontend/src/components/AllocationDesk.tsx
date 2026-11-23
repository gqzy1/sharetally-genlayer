import React, { useState } from 'react';
import type { Book, Currency, Member } from '../../../sdk/types';
import { formatMajorShort } from '../adapters/format';

type Seat = Pick<Member, 'name'>;
interface TableData {
  members: Seat[];
  currency: Currency;
  costs: number[];
  baseline: number[];
  selected: number[] | null;
  baselineIssues: number[];
}

const sumMask = (charges: number[], mask: number) =>
  charges.reduce((total, charge, index) => total + ((mask & (1 << index)) ? charge : 0), 0);

export function AllocationDesk({data}: {data: TableData}) {
  const [selection, setSelection] = useState<'baseline' | 'selected'>('selected');
  const [activeMask, setActiveMask] = useState<number | null>(null);
  const {members, currency, costs, baseline, selected, baselineIssues} = data;
  const full = (1 << members.length) - 1;
  const mask = activeMask ?? baselineIssues[0] ?? 1;
  const current = selection === 'selected' ? selected : baseline;
  const money = (amount: number) => formatMajorShort(amount,currency);
  const cap = costs[mask];
  const charge = current && sumMask(current, mask);
  const margin = charge === null ? null : cap - charge;
  const group = members.filter((_,index)=>mask & (1 << index)).map(m=>m.name).join(' + ');
  return <div className="allocation-desk">
    <div className="coalition-rail">
      <h2>Coalitions</h2>
      <p>Choose a group to check its quote.</p>
      <div className="coalition-options" aria-label="Coalitions">
        {costs.slice(1,full).map((cost,index) => {
          const id = index+1;
          return <button type="button" key={id} onClick={()=>setActiveMask(id)} aria-pressed={mask===id}>
            <span>{members.filter((_,i)=>id & (1<<i)).map(m=>m.name).join(' + ')}</span>
            {baselineIssues.includes(id) && <span title="Shapley objection" className="objection-dot" aria-label="Shapley objection"/>}
            <small>{money(cost)}</small>
          </button>;
        })}
      </div>
    </div>
    <section className="print-stage" aria-label="Interactive allocation table" onPointerMove={event=>{
      if (event.pointerType!=='mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const area=event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--rx', `${(0.5-(event.clientY-area.top)/area.height)*10}deg`);
      event.currentTarget.style.setProperty('--ry', `${((event.clientX-area.left)/area.width-0.5)*12}deg`);
    }} onPointerLeave={event=>{
      event.currentTarget.style.removeProperty('--rx');
      event.currentTarget.style.removeProperty('--ry');
    }}>
      <div className="stage-controls" role="group" aria-label="Compare splits">
        <button type="button" aria-pressed={selection==='baseline'} onClick={()=>setSelection('baseline')}>Shapley</button>
        <button type="button" aria-pressed={selection==='selected'} onClick={()=>setSelection('selected')}>Selected allocation</button>
      </div>
      <div className="table-perspective">
        <div className="table-surface">
          <div className="table-hub"><span>GROUP TOTAL</span><strong>{money(costs[full])}</strong></div>
          {members.map((member,index)=><div key={index} className="seat-stack" data-active={Boolean(mask & (1<<index))}
            style={{'--seat-x':[23,77,77,23][index]+'%','--seat-y':(members.length===2?[51,51]:[28,28,74,74])[index]+'%'} as React.CSSProperties}>
            <i aria-hidden="true"/><i aria-hidden="true"/>
            <button type="button" aria-label={`Inspect ${member.name}`} onClick={()=>setActiveMask(1<<index)} aria-pressed={mask===(1<<index)}>
              <span>{member.name}</span><strong>{current===null?'—':money(current[index])}</strong>
            </button>
          </div>)}
          <span className="registration-mark mark-a" aria-hidden="true">+</span>
          <span className="registration-mark mark-b" aria-hidden="true">+</span>
        </div>
      </div>
      <div className="stage-caption">{selection==='baseline'?'Rounded Shapley benchmark':'Selected integer charges'}</div>
    </section>
    <aside className="coalition-ticket" aria-live="polite">
      <p className="ticket-label">COALITION CHECK</p>
      <h2>{group}</h2>
      <dl>
        <div><dt>Standalone quote</dt><dd>{money(cap)}</dd></div>
        <div><dt>Allocated charge</dt><dd>{charge===null?'—':money(charge)}</dd></div>
      </dl>
      <div className="ticket-outcome" data-over={margin!==null&&margin<0}>
        {margin===null?'No signable allocation':margin===0?'Matches the quote':margin<0?`${money(-margin)} over the quote`:`${money(margin)} below the quote`}
      </div>
      {selected===null && <p>There is no integer split that meets every coalition cap.</p>}
      {selection==='baseline' && baselineIssues.includes(mask) && margin!==null && margin>=0 &&
        <p>The exact Shapley share exceeds the cap before rounding.</p>}
    </aside>
  </div>;
}

export function BookAllocationDesk({book}: {book: Book}) {
  const p = book.proof;
  if (!p || !('charges' in p)) return null;
  return <AllocationDesk key={book.id} data={{
    members:book.input.members, currency:book.input.currency, costs:p.costs, baseline:p.baseline_charges??p.charges,
    selected:p.selected_charges===undefined ? (p.status==='READY'?p.charges:null) : p.selected_charges,
    baselineIssues:p.blockers.map(b=>b.mask),
  }}/>;
}

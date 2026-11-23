import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AllocationDesk } from '../components/AllocationDesk';
import { showcase } from '../adapters/showcase';

const preview = {
  members:[{name:'Ada'},{name:'Bo'},{name:'Cy'}],
  currency:'GBP' as const,
  costs:[0,100,100,400,200,300,300,400],
  baseline:[134,133,133],
  selected:[100,100,200],
  baselineIssues:[1,2],
};

const examples = [
  { label:'Recovered split', title:'Ink and paper', data:preview },
  { label:'No stable split', title:'Two presses', data:{members:preview.members.slice(0,2),currency:'GBP' as const,costs:[0,100,100,300],baseline:[150,150],selected:null,baselineIssues:[1,2]} },
  { label:'Shapley passes', title:'Shared setup', data:{members:[...preview.members,{name:'Dee'}],currency:'GBP' as const,costs:[0,...Array.from({length:15},(_,i)=>120+30*((i+1).toString(2).match(/1/g)?.length ?? 0))],baseline:[60,60,60,60],selected:[60,60,60,60],baselineIssues:[]} },
];
export function HomePage() {
  const [exampleIndex,setExample] = useState(0);
  const example = examples[exampleIndex];
  return <div className="print-studio container">
    <header className="studio-heading">
      <div>
        <h1>The split table<span>.</span></h1>
        <p>Compare a shared quote, find a split every group can accept, and sign the exact amounts.</p>
      </div>
      <Link to="/books/new" className="btn btn-primary">New quotation <span aria-hidden="true">↗︎</span></Link>
    </header>
    <div className="studio-sheet" aria-label="Interactive offline examples">
      <div className="studio-sheet-title"><div><span>Offline examples</span><h2>{example.title}</h2></div><div className="demo-switch" role="group" aria-label="Choose an example">{examples.map((item,index)=>
        <button type="button" key={item.label} aria-pressed={index===exampleIndex} onClick={()=>setExample(index)}>{item.label}</button>)}</div></div>
      <AllocationDesk key={exampleIndex} data={example.data}/>
    </div>
    <section className="studio-cases" aria-labelledby="studio-cases-title">
      <div><h2 id="studio-cases-title">Studionet casebook</h2><Link to="/books">Browse catalogue ↗︎</Link></div>
      <div className="studio-case-list">{showcase.map(entry =>
        <Link key={entry.id} to={`/books/${entry.id.replace(':','/')}?mode=live`}>
          <span>{entry.state.replaceAll('_',' ')}</span><strong>{entry.label}</strong><span aria-hidden="true">↗︎</span>
        </Link>)}</div>
    </section>
  </div>;
}

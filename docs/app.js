let rows=[];
let registry=[];
const els={
  indicator:document.getElementById('indicator'),
  category:document.getElementById('category'),
  status:document.getElementById('status'),
  reset:document.getElementById('reset'),
  table:document.getElementById('dataTable'),
  title:document.getElementById('chartTitle'),
  subtitle:document.getElementById('chartSubtitle'),
  notice:document.getElementById('notice'),
  registryTheme:document.getElementById('registryTheme'),
  registryClass:document.getElementById('registryClass'),
  registryTable:document.getElementById('registryTable'),
  coverageTable:document.getElementById('coverageTable'),
  coverageSummary:document.getElementById('coverageSummary')
};
function parseCSV(text){
  const lines=text.trim().split(/\r?\n/); const headers=splitLine(lines.shift());
  return lines.map(line=>{const v=splitLine(line),o={};headers.forEach((h,i)=>o[h]=v[i]??'');o.year=+o.year;o.value=+o.value;return o});
}
function splitLine(line){
  const out=[];let cur='',q=false;
  for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out;
}
function uniq(a){return [...new Set(a)]}
function fillIndicators(){
  const labels=new Map(rows.map(r=>[r.indicator,r.indicator_label]));
  els.indicator.innerHTML=[...labels].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
}
function fillCategories(){
  const i=els.indicator.value;const cats=uniq(rows.filter(r=>r.indicator===i).map(r=>r.category));
  els.category.innerHTML=(cats.length>1?'<option value="all">Alla kategorier</option>':'')+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}
function filtered(){
  return rows.filter(r=>r.indicator===els.indicator.value)
    .filter(r=>els.category.value==='all'||r.category===els.category.value)
    .filter(r=>els.status.value==='all'||r.comparability===els.status.value);
}
function render(){
  const data=filtered(); if(!data.length){Plotly.purge('chart');els.table.innerHTML='';els.notice.textContent='Inga datapunkter matchar filtren.';return}
  els.title.textContent=data[0].indicator_label;
  els.subtitle.textContent=`${data[0].unit} · ${Math.min(...data.map(r=>r.year))}–${Math.max(...data.map(r=>r.year))}`;
  const cats=uniq(data.map(r=>r.category));
  const indicatorYears=uniq(rows.filter(r=>r.indicator===els.indicator.value).map(r=>r.year)).sort((a,b)=>a-b);
  const traces=cats.map(cat=>{
    const byYear=new Map(data.filter(r=>r.category===cat).map(r=>[r.year,r]));
    const d=indicatorYears.map(year=>byYear.get(year)||null);
    return{
      x:indicatorYears,
      y:d.map(r=>r?r.value:null),
      name:cat,mode:'lines+markers',type:'scatter',connectgaps:false,
      marker:{size:10,symbol:d.map(r=>r&&r.comparability==='reservation'?'diamond':'circle'),line:{width:1}},
      customdata:d.map(r=>r?[r.status_label,r.method_note,r.source]:['Datapunkt saknas','Ingen interpolation','']),
      hovertemplate:'<b>%{x}</b><br>%{y} '+data[0].unit+'<br>%{customdata[0]}<br>%{customdata[1]}<extra>%{fullData.name}</extra>'
    }
  });
  const shapes=rows.some(r=>r.indicator===els.indicator.value&&r.year===2020)?[{type:'line',x0:2020,x1:2020,y0:0,y1:1,yref:'paper',line:{dash:'dot',width:1}}]:[];
  const annotations=shapes.length?[{x:2020,y:1,yref:'paper',text:'2020 · covid-19',showarrow:false,yanchor:'bottom',font:{size:11}}]:[];
  Plotly.react('chart',traces,{margin:{l:60,r:25,t:35,b:55},hovermode:'closest',legend:{orientation:'h'},xaxis:{dtick:5,title:'År'},yaxis:{rangemode:'tozero',title:data[0].unit},shapes,annotations},{responsive:true,displaylogo:false});
  els.table.innerHTML=data.sort((a,b)=>a.year-b.year||a.category.localeCompare(b.category)).map(r=>`<tr><td>${r.year}</td><td>${r.category}</td><td><strong>${r.value}</strong> ${r.unit}</td><td><span class="status-pill ${r.comparability}">${r.status_label}</span></td><td>${r.method_note}</td><td>${r.source}</td></tr>`).join('');
  const hasReservation=data.some(r=>r.comparability==='reservation');
  els.notice.textContent=hasReservation?'Serien innehåller datapunkter med metodreservation. Läs metodnoten i tabellen innan förändringar tolkas som faktiska beteendeförändringar.':'';
}
els.indicator.addEventListener('change',()=>{fillCategories();render()});
els.category.addEventListener('change',render);els.status.addEventListener('change',render);
els.reset.addEventListener('click',()=>{els.indicator.selectedIndex=0;els.status.value='all';fillCategories();render()});
function renderCoverage(){
  if(!rows.length||!els.coverageTable)return;
  const labels=new Map(rows.map(r=>[r.indicator,r.indicator_label]));
  const indicators=uniq(rows.map(r=>r.indicator)).map(ind=>{
    const d=rows.filter(r=>r.indicator===ind);
    const years=uniq(d.map(r=>r.year)).sort((a,b)=>a-b);
    const cats=uniq(d.map(r=>r.category));
    const reservations=d.filter(r=>r.comparability==='reservation').length;
    return {ind,label:labels.get(ind),years,cats,reservations,points:d.length};
  }).sort((a,b)=>b.years.length-a.years.length||a.label.localeCompare(b.label,'sv'));
  const eligible=indicators.filter(x=>x.years.length>=3);
  els.coverageSummary.textContent=`${eligible.length} indikatorer har minst tre undersökningsår. ${indicators.filter(x=>x.years.length>=5).length} har fem eller fler år.`;
  els.coverageTable.innerHTML=eligible.map(x=>`<tr>
    <td><strong>${x.label}</strong></td>
    <td>${x.years.length}</td>
    <td>${x.years.join(', ')}</td>
    <td>${x.cats.length}</td>
    <td>${x.reservations?'<span class="status-pill reservation">Ja</span>':'<span class="status-pill direct">Nej</span>'}</td>
  </tr>`).join('');
}
fetch('data/harmonized_rvu.csv').then(r=>{if(!r.ok)throw new Error('Kunde inte läsa datafilen');return r.text()}).then(t=>{rows=parseCSV(t);fillIndicators();fillCategories();render();renderCoverage()}).catch(e=>{els.notice.textContent=e.message});

function fillRegistryFilters(){
  if(!registry.length)return;
  const themes=uniq(registry.map(r=>r.theme));
  els.registryTheme.innerHTML='<option value="all">Alla teman</option>'+themes.map(t=>`<option value="${t}">${t}</option>`).join('');
}
function renderRegistry(){
  if(!registry.length)return;
  const data=registry.filter(r=>els.registryTheme.value==='all'||r.theme===els.registryTheme.value)
    .filter(r=>els.registryClass.value==='all'||r.class===els.registryClass.value);
  els.registryTable.innerHTML=data.map(r=>`<tr>
    <td>${r.theme}</td>
    <td><strong>${r.harmonized_question}</strong></td>
    <td>${r.years_present.replaceAll(';', ', ')}</td>
    <td><span class="class-pill class-${r.class.toLowerCase()}">${r.class}</span> ${r.class_label}</td>
    <td>${r.rationale}</td>
    <td>${r.publish_status}</td>
  </tr>`).join('');
}
els.registryTheme.addEventListener('change',renderRegistry);
els.registryClass.addEventListener('change',renderRegistry);
fetch('data/question_harmonization.csv')
  .then(r=>{if(!r.ok)throw new Error('Kunde inte läsa frågeregistret');return r.text()})
  .then(t=>{registry=parseCSV(t).map(r=>({...r,year:undefined,value:undefined}));fillRegistryFilters();renderRegistry()})
  .catch(()=>{});

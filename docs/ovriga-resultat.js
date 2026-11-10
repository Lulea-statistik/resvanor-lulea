const parseCSV = text => {
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"' && quoted && n==='"'){cell+='"';i++}
    else if(c==='"'){quoted=!quoted}
    else if(c===',' && !quoted){row.push(cell);cell=""}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&n==='\n')i++;
      row.push(cell);
      if(row.some(v=>v!==""))rows.push(row);
      row=[];cell="";
    } else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row)}
  const headers=rows.shift();
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
};

let data=[];
const theme=document.getElementById("theme");
const variable=document.getElementById("variable");
const year=document.getElementById("year");
const table=document.getElementById("resultsTable");

function fillSelect(el,values,label){
  const current=el.value;
  el.innerHTML='<option value="all">'+label+'</option>'+values.map(v=>'<option value="'+v+'">'+v+'</option>').join('');
  if([...el.options].some(o=>o.value===current)) el.value=current;
}

function render(){
  const rows=data.filter(r=>
    (theme.value==="all"||r.theme===theme.value) &&
    (variable.value==="all"||r.variable===variable.value) &&
    (year.value==="all"||r.year===year.value)
  );
  table.innerHTML=rows.map(r=>`
    <tr>
      <td>${r.year}</td>
      <td><span class="result-tag">${r.theme}</span></td>
      <td>${r.variable}</td>
      <td>${r.category}</td>
      <td><strong>${r.value} ${r.unit}</strong></td>
      <td class="result-note">${r.reason}</td>
      <td>${r.source}</td>
    </tr>`).join("");
}

fetch("data/ovriga_rvu_resultat.csv")
  .then(r=>r.text())
  .then(text=>{
    data=parseCSV(text);
    fillSelect(theme,[...new Set(data.map(r=>r.theme))].sort(),"Alla teman");
    fillSelect(variable,[...new Set(data.map(r=>r.variable))].sort(),"Alla variabler");
    fillSelect(year,[...new Set(data.map(r=>r.year))].sort(),"Alla år");
    render();
  });

[theme,variable,year].forEach(el=>el.addEventListener("change",render));
document.getElementById("reset").addEventListener("click",()=>{
  theme.value=variable.value=year.value="all"; render();
});
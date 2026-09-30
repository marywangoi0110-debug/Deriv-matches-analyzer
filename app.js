let ws=null, ticks=[], digitCounts=Array(10).fill(0);
const statusEl=()=>document.getElementById('status');

function init(){
  const t=document.getElementById('targetDigit');
  t.innerHTML='';
  for(let i=0;i<=9;i++){ let o=document.createElement('option'); o.value=i; o.textContent=i; t.appendChild(o); }
  render();
}
function connect(){
  if(ws) ws.close();
  const symbol=document.getElementById('symbol').value;
  statusEl().textContent='● Connecting...';
  statusEl().style.color='orange';
  ws=new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  ws.onopen=()=>{
    ws.send(JSON.stringify({ticks_history:symbol, count:1000, end:'latest', style:'ticks'}));
    ws.send(JSON.stringify({ticks:symbol, subscribe:1}));
  };
  ws.onmessage=(msg)=>{
    const data=JSON.parse(msg.data);
    if(data.history){ ticks=data.history.prices||[]; processTicks(); }
    if(data.tick){ ticks.push(data.tick.quote); if(ticks.length>1000) ticks.shift(); processTicks(); }
  };
  ws.onerror=()=>{ statusEl().textContent='● Error'; statusEl().style.color='red'; };
  ws.onclose=()=>{ statusEl().textContent='● Offline'; statusEl().style.color='red'; };
}
function processTicks(){
  digitCounts=Array(10).fill(0);
  ticks.forEach(p=>{
    let s=p.toString(); let d=parseInt(s[s.length-1]); if(!isNaN(d)) digitCounts[d]++;
  });
  const total=ticks.length||1;
  statusEl().textContent='● Connected ('+ticks.length+')';
  statusEl().style.color='#00ff88';
  document.getElementById('ticksAnalyzed').textContent=ticks.length;
  const last=ticks[ticks.length-1];
  if(last){
    let s=last.toString(); let cur=parseInt(s[s.length-1]);
    document.getElementById('currentDigit').textContent=cur;
    const target=document.getElementById('targetDigit').value;
    document.getElementById('selectedDigit').textContent=target;
    let rate=((digitCounts[target]/total)*100).toFixed(1);
    document.getElementById('matchRate').textContent=rate+'%';
  }
  render();
}
function render(){
  const dist=document.getElementById('digitDist');
  const total=ticks.length||1;
  let html='';
  for(let i=0;i<=9;i++){
    let pct=((digitCounts[i]/total)*100).toFixed(1);
    let bar='█'.repeat(Math.round(pct/2));
    html+=`<div>${i}: ${digitCounts[i]} (${pct}%) ${bar}</div>`;
  }
  dist.innerHTML=html||'No data yet - press Connect';
}
function resetData(){ ticks=[]; digitCounts=Array(10).fill(0); render(); document.getElementById('ticksAnalyzed').textContent='0'; }
window.onload=init;

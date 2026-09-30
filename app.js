const ws_URL="wss://ws.derivws.com/websockets/v3?app_id=1089";
let ws=null,ticks=[],selected=0,reqId=0;

const s_id=document.getElementById('status');
const symbolEl=document.getElementById('symbol');
const historyEl=document.getElementById('historySize');
const targetEl=document.getElementById('targetDigit');

// Tengeneza options 0-9 kwa Match Digit
targetEl.innerHTML="";
for(let i=0;i<=9;i++){
  const o=document.createElement("option");
  o.value=i;
  o.textContent=i;
  targetEl.appendChild(o);
}
targetEl.value="0";

function setStatus(online,text="Offline"){
  s_id.textContent= online? "● Connected" : "● "+text;
  s_id.style.color= online? "#00ff88" : "#ff4d4d";
}

function send(obj){
  if(ws && ws.readyState===WebSocket.OPEN){
    obj.req_id=++reqId;
    ws.send(JSON.stringify(obj));
  }
}

function connect(){
  if(ws){ try{ ws.close() }catch(e){} }
  ticks=[];
  render();
  setStatus(false,"Connecting..");
  ws=new WebSocket(ws_URL);

  ws.onopen=()=>{
    setStatus(true);
    send({ticks_history:symbolEl.value,count:Number(historyEl.value),end:"latest",style:"ticks"});
    send({ticks:symbolEl.value,subscribe:1});
  };

  ws.onmessage=(e)=>{
    const d=JSON.parse(e.data);
    if(d.error){ setStatus(false,d.error.message); return; }
    if(d.msg_type==="history"){
      const prices=d.history?.prices||[];
      const times=d.history?.times||[];
      ticks=prices.map((q,i)=>({quote:q,epoch:times[i]}));
      render();
    }
    if(d.msg_type==="tick" && d.tick){
      ticks.push({quote:d.tick.quote,epoch:d.tick.epoch});
      const max=Number(historyEl.value);
      if(ticks.length>max) ticks=ticks.slice(-max);
      render();
    }
  };

  ws.onclose=()=>setStatus(false,"Offline");
  ws.onerror=()=>setStatus(false,"WebSocket error");
}

function lastDigit(q){
  const s=q.toString();
  const last=s.slice(-1);
  const n=parseInt(last);
  return isNaN(n)?0:n;
}

function render(){
  if(!ticks.length) return;
  selected=Number(targetEl.value);
  const digits=ticks.map(t=>lastDigit(t.quote));
  const curr=digits[digits.length-1];
  const matches=digits.filter(d=>d===selected).length;
  const rate=digits.length? (matches/digits.length*100) : 0;

  document.getElementById('selectedDigit').textContent=selected;
  document.getElementById('matchRate').textContent=rate.toFixed(1)+"%";
  document.getElementById('currentDigit').textContent=curr;
  document.getElementById('ticksAnalyzed').textContent=digits.length;

  const distEl=document.getElementById('digitDist');
  if(distEl){
    let html="";
    for(let i=0;i<=9;i++){
      const c=digits.filter(d=>d===i).length;
      const p=digits.length? (c/digits.length*100).toFixed(1):0;
      html+=`<div style="display:flex;justify-content:space-between;padding:3px 0"><span>${i}</span><span>${c} (${p}%)</span></div>`;
    }
    distEl.innerHTML=html;
  }
}

function resetData(){ ticks=[]; render(); }

targetEl.addEventListener('change',render);
window.connect=connect;
window.resetData=resetData;

const WS_URL="wss://api.derivws.com/trading/v1/options/ws/public";
let ws=null,ticks=[],selected=0,reqId=0;

const $=id=>document.getElementById(id);
const symbolEl=$("symbol"),historyEl=$("historySize"),targetEl=$("targetDigit");
for(let i=0;i<10;i++){const o=document.createElement("option");o.value=i;o.textContent=i;targetEl.appendChild(o)}
targetEl.value="0";

function setStatus(online,text="Offline"){
  const s=$("status");s.textContent=online?"● Connected":"● "+text;s.className="status "+(online?"online":"offline");
}
function send(obj){if(ws?.readyState===WebSocket.OPEN){obj.req_id=++reqId;ws.send(JSON.stringify(obj))}}

function connect(){
  if(ws){try{ws.close()}catch(e){}}
  ticks=[];render();setStatus(false,"Connecting…");
  ws=new WebSocket(WS_URL);
  ws.onopen=()=>{
    setStatus(true);
    send({active_symbols:"brief",product_type:"basic"});
    send({ticks_history:symbolEl.value,count:Number(historyEl.value),end:"latest",style:"ticks"});
    send({ticks:symbolEl.value,subscribe:1});
  };
  ws.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.error){setStatus(false,d.error.message||"API error");return}
    if(d.msg_type==="history"){
      const prices=d.history?.prices||[],times=d.history?.times||[];
      ticks=prices.map((quote,i)=>({quote,epoch:times[i]})).filter(x=>x.quote!=null);
      render();
    }
    if(d.msg_type==="tick"&&d.tick){
      ticks.push({quote:d.tick.quote,epoch:d.tick.epoch});
      const max=Number(historyEl.value);if(ticks.length>max)ticks=ticks.slice(-max);
      render();
    }
  };
  ws.onerror=()=>setStatus(false,"Connection error");
  ws.onclose=()=>setStatus(false,"Offline");
}

function lastDigit(q){
  let s=String(q);
  if(/e/i.test(s))s=Number(q).toFixed(12).replace(/0+$/,"");
  const dot=s.indexOf(".");
  return dot>=0&&dot<s.length-1?Number(s[s.length-1]):Math.abs(Math.trunc(Number(q)))%10;
}
function digits(){return ticks.map(t=>lastDigit(t.quote))}
function rateFor(arr,target){return arr.length?arr.filter(d=>d===target).length/arr.length*100:0}
function pct(v){return v==null?"—":v.toFixed(1)+"%"}
function classifyRate(r,n){
  if(n<25)return ["INSUFFICIENT SAMPLE","neutral"];
  if(r>=12)return ["ABOVE BASELINE","positive"];
  if(r<=8)return ["BELOW BASELINE","warning"];
  return ["NEAR BASELINE","neutral"];
}
function sampleStrength(n){
  if(n<25)return "Low";if(n<50)return "Developing";if(n<100)return "Moderate";if(n<200)return "Strong";return "Large";
}
function analyze(){
  const ds=digits(),n=ds.length,t=Number(targetEl.value),match=ds.filter(d=>d===t).length,r=rateFor(ds,t);
  $("selectedDigit").textContent=t;$("matchRate").textContent=pct(r);$("matchPct").textContent=pct(r);
  $("currentDigit").textContent=n?ds[n-1]:"—";$("tickCount").textContent=n;$("windowLabel").textContent=n+" ticks";
  $("deviation").textContent=(r-10).toFixed(1)+" pp";

  let streak=0;for(let i=n-1;i>=0&&ds[i]===t;i--)streak++;
  let last=n-1;while(last>=0&&ds[last]!==t)last--;
  const overdue=last>=0?n-1-last:null;
  $("streak").textContent=streak;$("overdue").textContent=overdue==null?"Not seen":overdue;$("overdue2").textContent=overdue==null?"Not seen":overdue+" ticks";

  const [sig,cls]=classifyRate(r,n),signal=$("signalText");signal.textContent=n?sig:"WAITING";signal.className=n?cls:"neutral";
  const angle=Math.min(360,Math.max(0,r/100*360));$("match-ring")?.style.setProperty("--angle",angle+"deg");$("matchPct").parentElement.parentElement.style.setProperty("--angle",angle+"deg");

  const counts=Array(10).fill(0);ds.forEach(d=>counts[d]++);
  const grid=$("digitGrid");grid.innerHTML="";const max=Math.max(...counts,1);
  for(let d=0;d<10;d++){
    const p=n?counts[d]/n*100:0,div=document.createElement("div");
    div.className="digit"+(d===t?" selected":"");
    div.innerHTML=`<div class="d">${d}</div><div class="bar"><div class="fill" style="width:${Math.min(100,p*5)}%"></div></div><div class="pct">${counts[d]} · ${p.toFixed(1)}%</div>`;
    grid.appendChild(div);
  }

  [25,50,100,200].forEach(w=>{$("rate"+w).textContent=n>=w?pct(rateFor(ds.slice(-w),t)):"—"});
  const overall=counts.map((c,d)=>({d,c,p:n?c/n*100:0})).sort((a,b)=>b.p-a.p);
  $("hotDigit").textContent=n?`${overall[0].d} (${overall[0].p.toFixed(1)}%)`:"—";
  $("coldDigit").textContent=n?`${overall[overall.length-1].d} (${overall[overall.length-1].p.toFixed(1)}%)`:"—";
  $("sampleStrength").textContent=sampleStrength(n);
  const q=$("insightQuality");q.textContent=n<25?"INSUFFICIENT SAMPLE":sampleStrength(n).toUpperCase();q.className=n<25?"warning":"positive";

  let msg="Collecting ticks…";
  if(n>=25){
    const r25=rateFor(ds.slice(-25),t),r100=rateFor(ds.slice(-Math.min(100,n)),t);
    const parts=[];
    if(r25>=12)parts.push("short window is above the 10% baseline");
    else if(r25<=8)parts.push("short window is below the 10% baseline");
    else parts.push("short window is near the 10% baseline");
    if(n>=100)parts.push(Math.abs(r25-r100)>=4?"short- and long-window rates are diverging":"short- and long-window rates are relatively aligned");
    if(overdue!=null&&overdue>=15)parts.push(`the target has not appeared for ${overdue} ticks`);
    msg="Insight: "+parts.join("; ")+". This is descriptive statistics, not a prediction.";
  }
  $("insightMessage").textContent=msg;

  const strip=$("digitStrip");strip.innerHTML="";
  ds.slice(-30).forEach(d=>{const x=document.createElement("span");x.className="digit-chip"+(d===t?" target":"");x.textContent=d;strip.appendChild(x)});
  if(!ds.length)strip.textContent="—";

  const tbody=$("ticksTable");tbody.innerHTML="";
  [...ticks].reverse().slice(0,40).forEach((x,i)=>{
    const d=lastDigit(x.quote),m=d===t,tr=document.createElement("tr");
    const tm=x.epoch?new Date(x.epoch*1000).toLocaleTimeString():"—";
    tr.innerHTML=`<td>${i+1}</td><td>${tm}</td><td>${x.quote}</td><td><b>${d}</b></td><td class="${m?"match":"no-match"}">${m?"MATCH":"—"}</td>`;
    tbody.appendChild(tr);
  });
}
function render(){analyze()}
function exportCSV(){
  if(!ticks.length){alert("No tick data to export yet.");return}
  const t=Number(targetEl.value),rows=[["time","epoch","quote","last_digit","match"]];
  ticks.forEach(x=>rows.push([x.epoch?new Date(x.epoch*1000).toISOString():"",x.epoch,x.quote,lastDigit(x.quote),lastDigit(x.quote)===t?"MATCH":""]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`deriv-matches-${symbolEl.value}-${t}.csv`;a.click();URL.revokeObjectURL(a.href);
}
$("connectBtn").onclick=connect;$("resetBtn").onclick=()=>{ticks=[];render()};$("csvBtn").onclick=exportCSV;
symbolEl.onchange=connect;historyEl.onchange=connect;targetEl.onchange=render;render();

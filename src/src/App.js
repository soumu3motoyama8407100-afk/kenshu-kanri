import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE 接続 ─────────────────────────────────────────────
const supabase = createClient(
  "nncousuugjntzovtmkvt",
  "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
);

// ─── MASTER DATA ───────────────────────────────────────────────
const EMPLOYEES = [
  { id:"E001", password:"pass001", name:"山田 太郎",   dept:"総務部" },
  { id:"E002", password:"pass002", name:"鈴木 花子",   dept:"営業部" },
  { id:"E003", password:"pass003", name:"田中 一郎",   dept:"技術部" },
  { id:"E004", password:"pass004", name:"佐藤 美咲",   dept:"人事部" },
  { id:"E005", password:"pass005", name:"伊藤 健二",   dept:"総務部" },
  { id:"E006", password:"pass006", name:"渡辺 さくら", dept:"営業部" },
  { id:"E007", password:"pass007", name:"小林 達也",   dept:"技術部" },
  { id:"E008", password:"pass008", name:"加藤 あかり", dept:"人事部" },
  { id:"E009", password:"pass009", name:"吉田 誠",     dept:"総務部" },
  { id:"E010", password:"pass010", name:"山本 由美",   dept:"営業部" },
];
const ADMIN = { id:"ADMIN", password:"admin123" };

const INIT_PROFILES = {
  E001:{ joinDate:"2020-04-01", qualifications:["社会福祉士","介護福祉士"], certTrainings:["認知症ケア専門士","実務者研修修了"] },
  E002:{ joinDate:"2021-04-01", qualifications:["看護師"],                  certTrainings:["感染管理認定看護師"] },
  E003:{ joinDate:"2019-10-01", qualifications:["精神保健福祉士"],          certTrainings:["ケアマネジャー"] },
  E004:{ joinDate:"2022-04-01", qualifications:[],                          certTrainings:["実務者研修修了"] },
  E005:{ joinDate:"2018-04-01", qualifications:["社会福祉士"],              certTrainings:["認知症ケア専門士"] },
  E006:{ joinDate:"2023-04-01", qualifications:[],                          certTrainings:[] },
  E007:{ joinDate:"2017-07-01", qualifications:["介護福祉士","社会福祉士"], certTrainings:["認定介護福祉士","実務者研修修了"] },
  E008:{ joinDate:"2024-04-01", qualifications:[],                          certTrainings:[] },
  E009:{ joinDate:"2016-04-01", qualifications:["社会福祉士"],              certTrainings:["介護支援専門員","認知症ケア専門士"] },
  E010:{ joinDate:"2025-04-01", qualifications:[],                          certTrainings:[] },
};

const INIT_INTERNAL = [
  { id:"T001", title:"新入社員オリエンテーション", date:"2026-04-01", required:true,  videoUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ", description:"会社の基本方針・規則・業務フローを学ぶ研修" },
  { id:"T002", title:"情報セキュリティ研修",       date:"2026-04-15", required:true,  videoUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ", description:"個人情報保護・サイバーセキュリティの基礎知識" },
  { id:"T003", title:"ハラスメント防止研修",       date:"2026-05-01", required:true,  videoUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ", description:"職場環境の改善とハラスメント対策" },
  { id:"T004", title:"リーダーシップ研修",         date:"2026-05-20", required:false, videoUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ", description:"チームマネジメントとリーダーシップスキルの向上" },
];
const INIT_EXTERNAL = [
  { id:"X001", title:"自治体向けDX推進セミナー",     date:"2026-06-10", organizer:"総務省",         location:"東京",      targetEmpIds:["E001","E003","E005"], pdfData:null, pdfName:null },
  { id:"X002", title:"メンタルヘルスマネジメント検定", date:"2026-07-01", organizer:"大阪商工会議所", location:"オンライン", targetEmpIds:["E002","E004"],         pdfData:null, pdfName:null },
];

const inFiscalYear = (dateStr,fy) => { if(!dateStr)return false; const d=new Date(dateStr),s=new Date(fy,3,1),e=new Date(fy+1,2,31,23,59,59); return d>=s&&d<=e; };
const currentFY = () => { const n=new Date(); return n.getMonth()>=3?n.getFullYear():n.getFullYear()-1; };
const calcPoints = c => c>=10?2:c>=5?1:0;
const BADGES = [
  {id:"b1",min:1,max:4,icon:"🌱",label:"スタート",color:"#6b7280",bg:"#f9fafb"},
  {id:"b2",min:5,max:9,icon:"⭐",label:"5件達成",color:"#d97706",bg:"#fef3c7"},
  {id:"b3",min:10,max:99,icon:"🏆",label:"10件達成",color:"#7c3aed",bg:"#ede9fe"},
];
const getBadge = c => c===0?null:BADGES.find(b=>c>=b.min&&c<=b.max)||BADGES[BADGES.length-1];
const rankStyle = r => r===1?{icon:"🥇",color:"#d97706"}:r===2?{icon:"🥈",color:"#6b7280"}:r===3?{icon:"🥉",color:"#b45309"}:{icon:`${r}`,color:"#374151"};
const isPast = ds => { if(!ds)return false; const t=new Date();t.setHours(0,0,0,0);const d=new Date(ds);d.setHours(0,0,0,0);return t>d; };
const calcYears = jd => { if(!jd)return ""; const j=new Date(jd),n=new Date();let y=n.getFullYear()-j.getFullYear(),m=n.getMonth()-j.getMonth();if(m<0){y--;m+=12;}return `${y}年${m}ヶ月`; };
const makeAttendUrl = tid => `${window.location.href.split("?")[0]}?attend=${tid}`;

// ─── SUPABASE HELPERS ──────────────────────────────────────────
const db = {
  async getIStatuses() {
    const {data} = await supabase.from("i_statuses").select("*");
    const map = {};
    (data||[]).forEach(r => { if(!map[r.emp_id])map[r.emp_id]={}; map[r.emp_id][r.training_id]={attendance:r.attendance,report:r.report,video:r.video,reportConfirmed:r.report_confirmed}; });
    return map;
  },
  async setIStatus(empId,tid,fields) {
    const row = {emp_id:empId,training_id:tid,attendance:fields.attendance,report:fields.report,video:fields.video,report_confirmed:fields.reportConfirmed,updated_at:new Date().toISOString()};
    await supabase.from("i_statuses").upsert(row,{onConflict:"emp_id,training_id"});
  },
  async getXStatuses() {
    const {data} = await supabase.from("x_statuses").select("*");
    const map = {};
    (data||[]).forEach(r => { if(!map[r.emp_id])map[r.emp_id]={}; map[r.emp_id][r.training_id]={attended:r.attended,reportSubmitted:r.report_submitted,reportConfirmed:r.report_confirmed}; });
    return map;
  },
  async setXStatus(empId,xid,fields) {
    const row = {emp_id:empId,training_id:xid,attended:fields.attended,report_submitted:fields.reportSubmitted,report_confirmed:fields.reportConfirmed,updated_at:new Date().toISOString()};
    await supabase.from("x_statuses").upsert(row,{onConflict:"emp_id,training_id"});
  },
  async getProfiles() {
    const {data} = await supabase.from("profiles").select("*");
    const map = {...INIT_PROFILES};
    (data||[]).forEach(r => { map[r.emp_id]={joinDate:r.join_date,qualifications:r.qualifications||[],certTrainings:r.cert_trainings||[]}; });
    return map;
  },
  async setProfile(empId,p) {
    await supabase.from("profiles").upsert({emp_id:empId,join_date:p.joinDate,qualifications:p.qualifications,cert_trainings:p.certTrainings,updated_at:new Date().toISOString()},{onConflict:"emp_id"});
  },
  async getInternals() {
    const {data} = await supabase.from("internals").select("*").order("date");
    if(!data||data.length===0) { await db.seedInternals(); return INIT_INTERNAL; }
    return data.map(r=>({id:r.id,title:r.title,date:r.date,required:r.required,videoUrl:r.video_url,description:r.description}));
  },
  async seedInternals() {
    for(const t of INIT_INTERNAL) await supabase.from("internals").upsert({id:t.id,title:t.title,date:t.date,required:t.required,video_url:t.videoUrl,description:t.description},{onConflict:"id"});
  },
  async upsertInternal(t) {
    await supabase.from("internals").upsert({id:t.id,title:t.title,date:t.date,required:t.required,video_url:t.videoUrl,description:t.description},{onConflict:"id"});
  },
  async deleteInternal(id) { await supabase.from("internals").delete().eq("id",id); },
  async getExternals() {
    const {data} = await supabase.from("externals").select("*").order("date");
    if(!data||data.length===0) { await db.seedExternals(); return INIT_EXTERNAL; }
    return data.map(r=>({id:r.id,title:r.title,date:r.date,organizer:r.organizer,location:r.location,targetEmpIds:r.target_emp_ids||[],pdfData:r.pdf_data,pdfName:r.pdf_name}));
  },
  async seedExternals() {
    for(const x of INIT_EXTERNAL) await supabase.from("externals").upsert({id:x.id,title:x.title,date:x.date,organizer:x.organizer,location:x.location,target_emp_ids:x.targetEmpIds,pdf_data:x.pdfData,pdf_name:x.pdfName},{onConflict:"id"});
  },
  async upsertExternal(x) {
    await supabase.from("externals").upsert({id:x.id,title:x.title,date:x.date,organizer:x.organizer,location:x.location,target_emp_ids:x.targetEmpIds,pdf_data:x.pdfData,pdf_name:x.pdfName},{onConflict:"id"});
  },
  async deleteExternal(id) { await supabase.from("externals").delete().eq("id",id); },
};

// ─── ROOT ──────────────────────────────────────────────────────
export default function App() {
  const [internals,setInternals] = useState(INIT_INTERNAL);
  const [externals,setExternals] = useState(INIT_EXTERNAL);
  const [iStatuses,setIStatuses] = useState({});
  const [xStatuses,setXStatuses] = useState({});
  const [profiles,setProfiles]   = useState(INIT_PROFILES);
  const [fiscalYear,setFiscalYear] = useState(currentFY());
  const [session,setSession]     = useState(null);
  const [loading,setLoading]     = useState(true);
  const [pendingAttend,setPendingAttend] = useState(null);

  useEffect(()=>{ const p=new URLSearchParams(window.location.search);const a=p.get("attend");if(a)setPendingAttend(a); },[]);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const [iS,xS,pr,int,ext] = await Promise.all([db.getIStatuses(),db.getXStatuses(),db.getProfiles(),db.getInternals(),db.getExternals()]);
      setIStatuses(iS); setXStatuses(xS); setProfiles(pr); setInternals(int); setExternals(ext);
      setLoading(false);
    })();
  },[]);

  // 翌日以降: 自動未参加確定
  useEffect(()=>{
    if(loading)return;
    internals.forEach(t=>{
      if(!isPast(t.date))return;
      EMPLOYEES.forEach(emp=>{
        const cur=iStatuses[emp.id]?.[t.id];
        if(!cur||(cur.attendance!=="参加済"&&cur.attendance!=="未参加（確定）")){
          const next={attendance:"未参加（確定）",report:(cur?.report||"未提出"),video:(cur?.video||"未視聴"),reportConfirmed:(cur?.reportConfirmed||false)};
          setIStatuses(p=>({...p,[emp.id]:{...p[emp.id],[t.id]:next}}));
          db.setIStatus(emp.id,t.id,next);
        }
      });
    });
  },[internals,loading]);// eslint-disable-line

  const getIS = (empId,tid) => iStatuses[empId]?.[tid]||{attendance:"未参加",report:"未提出",video:"未視聴",reportConfirmed:false};
  const setIS = async(empId,tid,field,val) => {
    const cur=getIS(empId,tid);
    const next={...cur,[field]:val};
    setIStatuses(p=>({...p,[empId]:{...p[empId],[tid]:next}}));
    await db.setIStatus(empId,tid,next);
  };
  const getXS = (empId,xid) => xStatuses[empId]?.[xid]||{attended:false,reportSubmitted:false,reportConfirmed:false};
  const setXS = async(empId,xid,patch) => {
    const cur=getXS(empId,xid);
    const next={...cur,...patch};
    setXStatuses(p=>({...p,[empId]:{...p[empId],[xid]:next}}));
    await db.setXStatus(empId,xid,next);
  };

  const getCount = (empId,fy) => {
    const iC=internals.filter(t=>inFiscalYear(t.date,fy)&&getIS(empId,t.id).report==="提出済").length;
    const xC=externals.filter(x=>inFiscalYear(x.date,fy)&&x.targetEmpIds.includes(empId)&&getXS(empId,x.id).reportSubmitted).length;
    return iC+xC;
  };

  const handleLogin=(empId,isAdmin)=>{
    setSession({empId,isAdmin});
    if(pendingAttend&&!isAdmin){ setIS(empId,pendingAttend,"attendance","参加済"); setPendingAttend(null); }
  };
  const handleLogout=()=>setSession(null);

  if(loading) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a,#1e3a5f)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#fff",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>📋</div>
        <div style={{fontSize:18,fontWeight:700}}>研修管理システム</div>
        <div style={{fontSize:14,color:"#93c5fd",marginTop:8}}>読み込み中...</div>
      </div>
    </div>
  );

  if(!session) return <LoginScreen pendingAttend={pendingAttend} internals={internals} onLogin={handleLogin}/>;
  if(session.isAdmin) return(
    <AdminScreen employees={EMPLOYEES}
      internals={internals} setInternals={async(fn)=>{ const next=typeof fn==="function"?fn(internals):fn; setInternals(next); for(const t of next) await db.upsertInternal(t); }}
      externals={externals} setExternals={async(fn)=>{ const next=typeof fn==="function"?fn(externals):fn; setExternals(next); for(const x of next) await db.upsertExternal(x); }}
      deleteInternal={async id=>{ setInternals(p=>p.filter(t=>t.id!==id)); await db.deleteInternal(id); }}
      deleteExternal={async id=>{ setExternals(p=>p.filter(x=>x.id!==id)); await db.deleteExternal(id); }}
      getIS={getIS} setIS={setIS} getXS={getXS} setXS={setXS}
      profiles={profiles} saveProfile={async(empId,p)=>{ setProfiles(prev=>({...prev,[empId]:p})); await db.setProfile(empId,p); }}
      fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
      getCount={getCount} onLogout={handleLogout}/>
  );
  return(
    <EmployeeScreen
      emp={EMPLOYEES.find(e=>e.id===session.empId)}
      internals={internals} getIS={getIS} setIS={setIS}
      externals={externals} getXS={getXS} setXS={setXS}
      profile={profiles[session.empId]||{joinDate:"",qualifications:[],certTrainings:[]}}
      fiscalYear={fiscalYear} getCount={getCount}
      onLogout={handleLogout}/>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────
function LoginScreen({pendingAttend,internals,onLogin}){
  const [id,setId]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState("");
  const training=internals.find(t=>t.id===pendingAttend);
  const submit=()=>{
    setErr("");
    if(id===ADMIN.id&&pw===ADMIN.password){onLogin(ADMIN.id,true);return;}
    const emp=EMPLOYEES.find(e=>e.id===id&&e.password===pw);
    if(emp){onLogin(emp.id,false);return;}
    setErr("IDまたはパスワードが正しくありません");
  };
  return(
    <div style={S.page}>
      <div style={S.loginWrap}>
        {training&&<div style={S.qrBanner}><span style={{fontSize:20}}>📋</span><div>
          <div style={{fontWeight:600,fontSize:14}}>研修QRを読み取りました</div>
          <div style={{fontSize:13,color:"#15803d"}}>「{training.title}」の参加が自動登録されます</div>
        </div></div>}
        <div style={S.logoArea}><div style={S.logoIcon}>研修</div><h1 style={S.appName}>研修管理システム</h1><p style={S.appSub}>ログインしてください</p></div>
        <div style={S.fGroup}><label style={S.label}>従業員ID</label>
          <input style={S.input} placeholder="例: E001" value={id} onChange={e=>{setId(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <div style={S.fGroup}><label style={S.label}>パスワード</label>
          <input style={S.input} type="password" placeholder="パスワード" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        {err&&<div style={S.errBox}>{err}</div>}
        <button style={S.btn} onClick={submit}>ログイン</button>
        <div style={S.demoHint}><div style={{fontWeight:600,marginBottom:4}}>デモ用アカウント</div><div>従業員: E001〜E010 / pass001〜pass010</div><div>管理者: ADMIN / admin123</div></div>
      </div>
    </div>
  );
}

function PointCard({count,fiscalYear}){
  const points=calcPoints(count); const badge=getBadge(count);
  const pct=Math.min(count/10*100,100);
  const bc=count>=10?"#7c3aed":count>=5?"#d97706":"#3b82f6";
  return(
    <div style={{background:"linear-gradient(135deg,#1e3a5f,#1e40af)",borderRadius:18,padding:"20px 22px",color:"#fff",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",right:-20,top:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.06)"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,position:"relative"}}>
        <div><div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginBottom:2}}>{fiscalYear}年度 復命書提出実績</div>
          <div style={{fontSize:36,fontWeight:800,lineHeight:1}}>{count}<span style={{fontSize:14,fontWeight:400,marginLeft:4}}>件</span></div></div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:34}}>{points>0?(points===2?"🏆":"⭐"):"🌱"}</div>
          <div style={{fontSize:11,marginTop:2,color:points>=2?"#c4b5fd":points>=1?"#fcd34d":"rgba(255,255,255,.6)"}}>人事考課 <span style={{fontSize:16,fontWeight:800}}>+{points}</span>点</div>
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:4}}><span>今年度の復命書提出状況</span><span>{count}/10件</span></div>
        <div style={{position:"relative",height:10,background:"rgba(255,255,255,.2)",borderRadius:5,overflow:"visible"}}>
          <div style={{height:"100%",width:`${pct}%`,background:bc,borderRadius:5,transition:"width .5s"}}/>
          <div style={{position:"absolute",left:"50%",top:-3,width:2,height:16,background:"rgba(255,255,255,.6)",borderRadius:1}}/>
          <div style={{position:"absolute",left:"50%",top:14,transform:"translateX(-50%)",fontSize:9,color:"rgba(255,255,255,.7)",whiteSpace:"nowrap"}}>+1点</div>
          <div style={{position:"absolute",right:0,top:14,transform:"translateX(50%)",fontSize:9,color:"rgba(255,255,255,.7)",whiteSpace:"nowrap"}}>+2点</div>
        </div>
      </div>
      <div style={{marginTop:16,padding:"8px 12px",background:"rgba(255,255,255,.12)",borderRadius:10,fontSize:12}}>
        {count>=10?"🎉 10件達成！人事考課 +2点獲得おめでとうございます！":count>=5?`⭐ +1点獲得中！あと${10-count}件で +2点`:`🌱 あと${5-count}件で +1点、${10-count}件で +2点`}
      </div>
      {badge&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}><span style={{fontSize:18}}>{badge.icon}</span><span style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>{badge.label} バッジ獲得中</span></div>}
    </div>
  );
}

function ProfileModal({emp,profile,onClose}){
  const yrs=calcYears(profile.joinDate);
  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal,maxWidth:420}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontWeight:800,fontSize:18,color:"#1e3a5f"}}>{emp.name}</div><div style={{fontSize:13,color:"#6b7280"}}>{emp.dept} · {emp.id}</div></div>
          <button style={S.logoutBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.profileSection}><div style={S.profileLabel}>📅 入社年月日</div>
          <div style={S.profileValue}>{profile.joinDate||"未登録"}{yrs&&<span style={{fontSize:12,color:"#6b7280",marginLeft:8}}>（勤続 {yrs}）</span>}</div></div>
        <div style={S.profileSection}><div style={S.profileLabel}>🎓 保有資格</div>
          {(profile.qualifications||[]).length===0?<div style={{fontSize:13,color:"#9ca3af"}}>未登録</div>
            :<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>{profile.qualifications.map((q,i)=><span key={i} style={S.qBadge}>{q}</span>)}</div>}</div>
        <div style={S.profileSection}><div style={S.profileLabel}>📜 受講済み認定研修</div>
          {(profile.certTrainings||[]).length===0?<div style={{fontSize:13,color:"#9ca3af"}}>未登録</div>
            :<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>{profile.certTrainings.map((c,i)=><span key={i} style={{...S.qBadge,background:"#ede9fe",color:"#7c3aed",borderColor:"#c4b5fd"}}>{c}</span>)}</div>}</div>
        <button style={{...S.btn,marginTop:4}} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

function EmployeeScreen({emp,internals,getIS,setIS,externals,getXS,setXS,profile,fiscalYear,getCount,onLogout}){
  const [tab,setTab]=useState("score");
  const [videoT,setVideoT]=useState(null);
  const [toast,setToast]=useState(null);
  const [pdfExt,setPdfExt]=useState(null);
  const [showProfile,setShowProfile]=useState(false);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2500);};
  const count=getCount(emp.id,fiscalYear);
  const myExt=externals.filter(x=>x.targetEmpIds.includes(emp.id));
  const monthCounts=Array.from({length:12},(_,i)=>{
    const month=(i+4)%12||12; const year=i<9?fiscalYear:fiscalYear+1;
    const iC=internals.filter(t=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()+1===month&&getIS(emp.id,t.id).report==="提出済";}).length;
    const xC=externals.filter(x=>{const d=new Date(x.date);return d.getFullYear()===year&&d.getMonth()+1===month&&x.targetEmpIds.includes(emp.id)&&getXS(emp.id,x.id).reportSubmitted;}).length;
    return{label:`${month}月`,count:iC+xC};
  });
  const maxM=Math.max(...monthCounts.map(m=>m.count),1);
  return(
    <div style={S.page}>
      {toast&&<div style={S.toast}>{toast}</div>}
      {pdfExt&&<PdfModal ext={pdfExt} onClose={()=>setPdfExt(null)}/>}
      {showProfile&&<ProfileModal emp={emp} profile={profile} onClose={()=>setShowProfile(false)}/>}
      <div style={S.appWrap}>
        <div style={S.header}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setShowProfile(true)} style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,.15)",border:"1.5px solid rgba(255,255,255,.3)",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} title="個人情報">👤</button>
            <div><div style={S.headerName}>{emp.name}</div><div style={S.headerSub}>{emp.dept} · {emp.id}</div></div>
          </div>
          <button style={S.logoutBtn} onClick={onLogout}>ログアウト</button>
        </div>
        <div style={S.tabBar}>
          {[["score","🏅 実績"],["internal","🏢 内部研修"],["external","🌐 外部研修"],["video","▶ 動画"]].map(([k,l])=>(
            <button key={k} style={{...S.tab,...(tab===k?S.tabOn:{})}} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={S.scroll}>
          {tab==="score"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <PointCard count={count} fiscalYear={fiscalYear}/>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16}}>
                <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f",marginBottom:12}}>📊 月別復命書提出状況（{fiscalYear}年度）</div>
                <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80}}>
                  {monthCounts.map((m,i)=>(
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{fontSize:9,color:m.count>0?"#1e40af":"#9ca3af",fontWeight:700}}>{m.count>0?m.count:""}</div>
                      <div style={{width:"100%",height:`${(m.count/maxM)*60}px`,minHeight:m.count>0?4:0,background:m.count>=3?"#7c3aed":m.count>=2?"#2563eb":m.count>=1?"#3b82f6":"#e5e7eb",borderRadius:"3px 3px 0 0"}}/>
                      <div style={{fontSize:9,color:"#9ca3af"}}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16}}>
                <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f",marginBottom:12}}>📋 今年度の内訳（復命書ベース）</div>
                {[
                  {label:"内部研修（提出済）",count:internals.filter(t=>inFiscalYear(t.date,fiscalYear)&&getIS(emp.id,t.id).report==="提出済").length,color:"#2563eb"},
                  {label:"外部研修（提出済）",count:myExt.filter(x=>inFiscalYear(x.date,fiscalYear)&&getXS(emp.id,x.id).reportSubmitted).length,color:"#d97706"},
                ].map(row=>(
                  <div key={row.label} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <div style={{width:140,fontSize:12,color:"#374151"}}>{row.label}</div>
                    <div style={{flex:1,height:16,background:"#f3f4f6",borderRadius:8,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(row.count/10*100,100)}%`,background:row.color,borderRadius:8}}/>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:row.color,minWidth:28,textAlign:"right"}}>{row.count}件</div>
                  </div>
                ))}
              </div>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16}}>
                <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f",marginBottom:12}}>🎖 バッジコレクション</div>
                <div style={{display:"flex",gap:10}}>
                  {BADGES.map(b=>{const earned=count>=b.min;return(
                    <div key={b.id} style={{flex:1,textAlign:"center",padding:"12px 8px",borderRadius:12,background:earned?b.bg:"#f9fafb",border:`1.5px solid ${earned?b.color:"#e5e7eb"}`,opacity:earned?1:0.45}}>
                      <div style={{fontSize:28,marginBottom:4}}>{b.icon}</div>
                      <div style={{fontSize:11,fontWeight:700,color:earned?b.color:"#9ca3af"}}>{b.label}</div>
                      <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{b.min}件〜</div>
                    </div>
                  );})}
                </div>
              </div>
            </div>
          )}
          {tab==="internal"&&internals.map(t=>(
            <InternalCard key={t.id} training={t} status={getIS(emp.id,t.id)}
              onReport={v=>{setIS(emp.id,t.id,"report",v);showToast(v==="提出済"?"復命書を提出済にしました":"未提出に戻しました");}}
              onVideo={v=>{setIS(emp.id,t.id,"video",v);showToast(v==="視聴済"?"動画を視聴済":"未視聴に戻しました");}}
              onWatchVideo={()=>{setVideoT(t);setTab("video");}}/>
          ))}
          {tab==="external"&&(myExt.length===0?<div style={S.empty}>申し込み済みの外部研修はありません</div>
            :myExt.map(x=><ExternalCard key={x.id} ext={x} status={getXS(emp.id,x.id)}
              onAttend={()=>{setXS(emp.id,x.id,{attended:true});showToast("受講済にしました");}}
              onReport={()=>{setXS(emp.id,x.id,{reportSubmitted:true});showToast("復命書を提出しました");}}
              onViewPdf={()=>setPdfExt(x)}/>)
          )}
          {tab==="video"&&<VideoTab trainings={internals} selected={videoT||internals[0]}
            onSelect={t=>{setVideoT(t);setIS(emp.id,t.id,"video","視聴済");showToast("「視聴済」に更新しました");}}
            getStatus={t=>getIS(emp.id,t.id)}/>}
        </div>
      </div>
    </div>
  );
}

function internalStepsDone(status){
  const s1=status.attendance==="参加済"||status.video==="視聴済";
  const s2=s1&&status.report==="提出済";
  const s3=s2&&status.reportConfirmed===true;
  return[s1,s2,s3];
}

function InternalProgress({status}){
  const [s1,s2,s3]=internalStepsDone(status);
  const steps=[{label:"参加/動画",done:s1,active:!s1,color:"#16a34a",bg:"#dcfce7"},{label:"復命書",done:s2,active:s1&&!s2,color:"#2563eb",bg:"#dbeafe"},{label:"確認",done:s3,active:s2&&!s3,color:"#7c3aed",bg:"#ede9fe"}];
  const dc=[s1,s2,s3].filter(Boolean).length; const pct=Math.round(dc/3*100);
  const bc=dc===3?"#16a34a":dc===0?"#e5e7eb":"#f59e0b";
  return(
    <div style={{minWidth:130}}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
        <div style={{flex:1,height:4,background:"#e5e7eb",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:bc,borderRadius:3}}/></div>
        <span style={{fontSize:9,fontWeight:700,color:bc,minWidth:22}}>{pct}%</span>
      </div>
      <div style={{display:"flex",gap:3}}>{steps.map(s=>(
        <div key={s.label} style={{flex:1,textAlign:"center",padding:"2px 0",borderRadius:5,background:s.done?s.bg:s.active?"#fffbeb":"#f9fafb",border:`1px solid ${s.done?s.color:s.active?"#fcd34d":"#e5e7eb"}`,fontSize:9,fontWeight:600,color:s.done?s.color:s.active?"#92400e":"#9ca3af"}}>
          {s.done?"✓":s.active?"…":""}{s.label}
        </div>
      ))}</div>
    </div>
  );
}

function ExternalProgress({status}){
  const {attended,reportSubmitted,reportConfirmed}=status;
  const steps=[{label:"受講",done:attended,active:!attended,color:"#d97706",bg:"#fef3c7"},{label:"復命書",done:reportSubmitted,active:attended&&!reportSubmitted,color:"#2563eb",bg:"#dbeafe"},{label:"確認",done:reportConfirmed,active:reportSubmitted&&!reportConfirmed,color:"#16a34a",bg:"#dcfce7"}];
  const dc=steps.filter(s=>s.done).length; const pct=Math.round(dc/3*100);
  const bc=dc===3?"#16a34a":dc===0?"#e5e7eb":"#d97706";
  return(
    <div style={{minWidth:130}}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
        <div style={{flex:1,height:4,background:"#e5e7eb",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:bc,borderRadius:3}}/></div>
        <span style={{fontSize:9,fontWeight:700,color:bc,minWidth:22}}>{pct}%</span>
      </div>
      <div style={{display:"flex",gap:3}}>{steps.map(s=>(
        <div key={s.label} style={{flex:1,textAlign:"center",padding:"2px 0",borderRadius:5,background:s.done?s.bg:s.active?"#fffbeb":"#f9fafb",border:`1px solid ${s.done?s.color:s.active?"#fcd34d":"#e5e7eb"}`,fontSize:9,fontWeight:600,color:s.done?s.color:s.active?"#92400e":"#9ca3af"}}>
          {s.done?"✓":s.active?"…":""}{s.label}
        </div>
      ))}</div>
    </div>
  );
}

function InternalCard({training,status,onReport,onVideo,onWatchVideo}){
  const [open,setOpen]=useState(false);
  const attended=status.attendance==="参加済"; const absentFix=status.attendance==="未参加（確定）"; const showVideo=!attended;
  return(
    <div style={S.card}>
      <div style={S.cardHead} onClick={()=>setOpen(!open)}>
        <div style={{flex:1}}>{training.required&&<span style={S.reqBadge}>必須</span>}<div style={S.cardTitle}>{training.title}</div><div style={S.cardDate}>📅 {training.date}</div></div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}><InternalProgress status={status}/><span style={{color:"#d1d5db",fontSize:14}}>{open?"▲":"▼"}</span></div>
      </div>
      {open&&(
        <div style={S.cardBody}>
          <p style={{color:"#6b7280",fontSize:13,marginBottom:14}}>{training.description}</p>
          <div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>1</span> 研修参加 または 動画視聴</div>
            {attended?<SPill color="#15803d" bg="#f0fdf4" border="#86efac">✅ 参加済（QR認証済）</SPill>
              :absentFix?<SPill color="#dc2626" bg="#fef2f2" border="#fca5a5">❌ 未参加（確定）</SPill>
              :<SPill color="#6b7280" bg="#f9fafb" border="#e5e7eb">🔲 未参加 ─ 当日QRをスキャン</SPill>}
            {showVideo&&(
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>{absentFix?"参加できなかった場合は動画でフォローできます：":"または研修動画を視聴:"}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["視聴済","未視聴"].map(v=><ToggleChip key={v} label={v} active={status.video===v} color={v==="視聴済"?"#7c3aed":"#6b7280"} onClick={()=>onVideo(v)}/>)}
                </div>
                {training.videoUrl&&<button style={{...S.watchBtn,marginTop:8}} onClick={onWatchVideo}>▶ 動画を視聴する</button>}
              </div>
            )}
          </div>
          <div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>2</span> 復命書提出</div>
            <div style={{display:"flex",gap:8}}>{["提出済","未提出"].map(v=><ToggleChip key={v} label={v} active={status.report===v} color={v==="提出済"?"#2563eb":"#f59e0b"} onClick={()=>onReport(v)}/>)}</div>
          </div>
          <div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>3</span> 管理者確認</div>
            {status.reportConfirmed?<SPill color="#15803d" bg="#f0fdf4" border="#86efac">✅ 確認済み</SPill>:<SPill color="#9ca3af" bg="#f9fafb" border="#e5e7eb">⏳ 管理者確認待ち</SPill>}
          </div>
        </div>
      )}
    </div>
  );
}

function ExternalCard({ext,status,onAttend,onReport,onViewPdf}){
  const [open,setOpen]=useState(false);
  const {attended,reportSubmitted,reportConfirmed}=status;
  return(
    <div style={S.card}>
      <div style={S.cardHead} onClick={()=>setOpen(!open)}>
        <div style={{flex:1}}><span style={S.extBadge}>外部</span><div style={S.cardTitle}>{ext.title}</div><div style={S.cardDate}>📅 {ext.date} ｜ 🏢 {ext.organizer} ｜ 📍 {ext.location}</div></div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}><ExternalProgress status={status}/><span style={{color:"#d1d5db",fontSize:14}}>{open?"▲":"▼"}</span></div>
      </div>
      {open&&(
        <div style={S.cardBody}>
          {ext.pdfData?<button style={{...S.watchBtn,background:"#dc2626",marginBottom:12}} onClick={e=>{e.stopPropagation();onViewPdf();}}>📄 研修要綱PDFを見る</button>
            :<div style={{padding:"8px 12px",background:"#f9fafb",borderRadius:8,fontSize:12,color:"#9ca3af",marginBottom:12}}>📄 研修要綱PDFは未添付です</div>}
          <div style={S.sBlock}><div style={S.sLabel}><span style={S.stepNum}>1</span> 受講状況</div>
            {attended?<SPill color="#16a34a" bg="#f0fdf4" border="#86efac">✅ 受講済</SPill>:<button style={S.actionBtn} onClick={onAttend}>受講済にする</button>}</div>
          {attended&&<div style={S.sBlock}><div style={S.sLabel}><span style={S.stepNum}>2</span> 復命書</div>
            {reportConfirmed?<SPill color="#15803d" bg="#f0fdf4" border="#86efac">✅ 提出済（管理者確認済）</SPill>
              :reportSubmitted?<SPill color="#92400e" bg="#fffbeb" border="#fcd34d">⏳ 提出済 ─ 管理者確認待ち</SPill>
              :<button style={{...S.actionBtn,background:"#2563eb"}} onClick={onReport}>復命書を提出する</button>}</div>}
        </div>
      )}
    </div>
  );
}

function SPill({color,bg,border,children}){return <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:bg,color,fontSize:13,fontWeight:600,border:`1.5px solid ${border}`}}>{children}</div>;}
function ToggleChip({label,active,color,onClick}){return <button onClick={onClick} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",borderColor:active?color:"#e5e7eb",background:active?color:"#fff",color:active?"#fff":"#6b7280",fontSize:12,fontWeight:active?700:400,cursor:"pointer"}}>{label}</button>;}

function VideoTab({trainings,selected,onSelect,getStatus}){
  const cur=selected||trainings[0];
  return(
    <div>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:12}}>
        {trainings.filter(t=>t.videoUrl).map(t=>{const s=getStatus(t);const active=cur?.id===t.id;return(
          <button key={t.id} onClick={()=>onSelect(t)} style={{minWidth:130,padding:"8px 12px",borderRadius:10,border:"1.5px solid",borderColor:active?"#1e40af":"#e5e7eb",background:active?"#1e40af":"#fff",color:active?"#fff":"#374151",fontSize:12,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontWeight:600,marginBottom:3}}>{t.title}</div><div>{s.video==="視聴済"?"✅ 視聴済":"○ 未視聴"}</div>
          </button>);
        })}
      </div>
      {cur?.videoUrl&&<>
        <div style={{fontWeight:700,color:"#1e3a5f",marginBottom:8}}>{cur.title}</div>
        <div style={{position:"relative",paddingBottom:"56.25%",borderRadius:12,overflow:"hidden",background:"#000"}}>
          <iframe style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}} src={cur.videoUrl} allowFullScreen title={cur.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
        </div>
        <div style={{marginTop:10,padding:"8px 12px",background:"#f0fdf4",borderRadius:8,color:"#15803d",fontSize:13}}>✅ 視聴すると自動的に「視聴済」に更新されます</div>
      </>}
    </div>
  );
}

function PdfModal({ext,onClose}){
  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal,maxWidth:700,width:"95vw",height:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><div style={{fontWeight:800,fontSize:16,color:"#1e3a5f"}}>📄 研修要綱</div><div style={{fontSize:13,color:"#6b7280"}}>{ext.title}</div></div>
          <button style={S.logoutBtn} onClick={onClose}>✕ 閉じる</button>
        </div>
        <div style={{flex:1,borderRadius:10,overflow:"hidden",border:"1px solid #e5e7eb"}}>
          <iframe src={`data:application/pdf;base64,${ext.pdfData}`} style={{width:"100%",height:"100%",border:"none"}} title="PDF"/>
        </div>
      </div>
    </div>
  );
}

function AdminScreen({employees,internals,setInternals,externals,setExternals,deleteInternal,deleteExternal,getIS,setIS,getXS,setXS,profiles,saveProfile,fiscalYear,setFiscalYear,getCount,onLogout}){
  const [tab,setTab]=useState("ranking");
  const [qrT,setQrT]=useState(null);
  const [profileEmp,setProfileEmp]=useState(null);
  return(
    <div style={S.page}>
      {qrT&&<QRModal training={qrT} onClose={()=>setQrT(null)}/>}
      {profileEmp&&<ProfileEditModal emp={profileEmp} profile={profiles[profileEmp.id]||{joinDate:"",qualifications:[],certTrainings:[]}}
        onSave={async p=>{await saveProfile(profileEmp.id,p);setProfileEmp(null);}} onClose={()=>setProfileEmp(null)}/>}
      <div style={{...S.appWrap,maxWidth:960}}>
        <div style={S.header}>
          <div><div style={S.headerName}>🛡 管理者ダッシュボード</div><div style={S.headerSub}>全従業員の研修進捗管理</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select value={fiscalYear} onChange={e=>setFiscalYear(Number(e.target.value))} style={{padding:"4px 8px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:12,cursor:"pointer"}}>
              {[currentFY()-1,currentFY(),currentFY()+1].map(y=><option key={y} value={y}>{y}年度</option>)}
            </select>
            <button style={{...S.logoutBtn,background:"#1e40af",color:"#fff",borderColor:"#1e40af"}} onClick={()=>window.print()}>🖨 印刷</button>
            <button style={S.logoutBtn} onClick={onLogout}>ログアウト</button>
          </div>
        </div>
        <div style={S.tabBar}>
          {[["ranking","🏅 ランキング"],["iProgress","📊 内部 進捗"],["iManage","📚 内部 管理"],["xProgress","🌐 外部 進捗"],["xManage","✏️ 外部 管理"],["profiles","👤 個人情報"]].map(([k,l])=>(
            <button key={k} style={{...S.tab,...(tab===k?S.tabOn:{}),fontSize:11,padding:"10px 2px"}} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{...S.scroll,maxHeight:"calc(100vh - 185px)"}}>
          {tab==="ranking"   &&<RankingTab employees={employees} fiscalYear={fiscalYear} getCount={getCount}/>}
          {tab==="iProgress" &&<InternalProgressTab employees={employees} internals={internals} getIS={getIS} setIS={setIS} onQR={setQrT}/>}
          {tab==="iManage"   &&<InternalManageTab internals={internals} setInternals={setInternals} deleteInternal={deleteInternal}/>}
          {tab==="xProgress" &&<ExternalProgressTab employees={employees} externals={externals} getXS={getXS} setXS={setXS}/>}
          {tab==="xManage"   &&<ExternalManageTab employees={employees} externals={externals} setExternals={setExternals} deleteExternal={deleteExternal}/>}
          {tab==="profiles"  &&<ProfilesTab employees={employees} profiles={profiles} onEdit={setProfileEmp}/>}
        </div>
      </div>
    </div>
  );
}

function ProfileEditModal({emp,profile,onSave,onClose}){
  const [joinDate,setJoinDate]=useState(profile.joinDate||"");
  const [quals,setQuals]=useState((profile.qualifications||[]).join("\n"));
  const [certs,setCerts]=useState((profile.certTrainings||[]).join("\n"));
  const save=()=>onSave({joinDate,qualifications:quals.split("\n").map(s=>s.trim()).filter(Boolean),certTrainings:certs.split("\n").map(s=>s.trim()).filter(Boolean)});
  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal,maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div style={{fontWeight:800,fontSize:17,color:"#1e3a5f",marginBottom:4}}>👤 個人情報の編集</div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>{emp.name}（{emp.dept}）</div>
        <div style={S.fGroup}><label style={S.label}>入社年月日</label><input type="date" style={S.input} value={joinDate} onChange={e=>setJoinDate(e.target.value)}/></div>
        <div style={S.fGroup}><label style={S.label}>保有資格（1行に1つ）</label><textarea style={{...S.input,height:80,resize:"vertical"}} value={quals} onChange={e=>setQuals(e.target.value)} placeholder={"社会福祉士\n介護福祉士"}/></div>
        <div style={S.fGroup}><label style={S.label}>受講済み認定研修（1行に1つ）</label><textarea style={{...S.input,height:80,resize:"vertical"}} value={certs} onChange={e=>setCerts(e.target.value)} placeholder={"認知症ケア専門士\n実務者研修修了"}/></div>
        <div style={{display:"flex",gap:8}}><button style={{...S.btn,flex:1}} onClick={save}>保存する</button><button style={{...S.btn,flex:1,background:"#6b7280"}} onClick={onClose}>キャンセル</button></div>
      </div>
    </div>
  );
}

function ProfilesTab({employees,profiles,onEdit}){
  return(
    <div>
      {employees.map(emp=>{
        const p=profiles[emp.id]||{joinDate:"",qualifications:[],certTrainings:[]};
        const yrs=calcYears(p.joinDate);
        return(
          <div key={emp.id} style={{...S.card,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontWeight:700,color:"#1e3a5f",fontSize:14}}>{emp.name}</span><span style={{fontSize:12,color:"#6b7280"}}>{emp.dept}</span></div>
              <div style={{fontSize:12,color:"#374151",marginBottom:4}}>📅 入社: {p.joinDate||"未登録"} {yrs&&`（勤続 ${yrs}）`}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {(p.qualifications||[]).map((q,i)=><span key={i} style={S.qBadge}>{q}</span>)}
                {(p.certTrainings||[]).map((c,i)=><span key={i} style={{...S.qBadge,background:"#ede9fe",color:"#7c3aed",borderColor:"#c4b5fd"}}>{c}</span>)}
                {(p.qualifications||[]).length===0&&(p.certTrainings||[]).length===0&&<span style={{fontSize:11,color:"#9ca3af"}}>資格・認定研修 未登録</span>}
              </div>
            </div>
            <button style={{...S.qrBtn,marginLeft:8,flexShrink:0}} onClick={()=>onEdit(emp)}>編集</button>
          </div>
        );
      })}
    </div>
  );
}

function RankingTab({employees,fiscalYear,getCount}){
  const ranked=[...employees].map(e=>({...e,count:getCount(e.id,fiscalYear),points:calcPoints(getCount(e.id,fiscalYear))})).sort((a,b)=>b.count-a.count);
  const maxCount=Math.max(...ranked.map(r=>r.count),1);
  const avg=(ranked.reduce((s,r)=>s+r.count,0)/ranked.length).toFixed(1);
  const reach5=ranked.filter(r=>r.count>=5).length; const reach10=ranked.filter(r=>r.count>=10).length;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
        {[{label:"全体平均",value:`${avg}件`,color:"#2563eb",sub:"提出/人"},{label:"平均加点",value:`+${(ranked.reduce((s,r)=>s+r.points,0)/ranked.length).toFixed(1)}点`,color:"#7c3aed",sub:"人事考課"},{label:"+1点以上",value:`${reach5}名`,color:"#d97706",sub:"5件達成"},{label:"+2点達成",value:`${reach10}名`,color:"#16a34a",sub:"10件達成"}]
          .map(c=><div key={c.label} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 10px",textAlign:"center"}}><div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>{c.label}</div><div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.value}</div><div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{c.sub}</div></div>)}
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,overflow:"hidden"}}>
        <div style={{background:"#1e3a5f",color:"#fff",padding:"12px 16px",fontWeight:700,fontSize:14}}>🏅 {fiscalYear}年度 復命書提出ランキング</div>
        {ranked.map((emp,i)=>{const rank=i+1;const rs=rankStyle(rank);const badge=getBadge(emp.count);const bc=emp.count>=10?"#7c3aed":emp.count>=5?"#d97706":"#3b82f6";
          return(
            <div key={emp.id} style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",background:rank===1?"#fffbeb":rank<=3?"#fafafa":"#fff"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{minWidth:32,textAlign:"center",fontSize:rank<=3?20:14,fontWeight:800,color:rs.color}}>{rs.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:700,fontSize:14,color:"#1e3a5f"}}>{emp.name}</span><span style={{fontSize:11,color:"#6b7280"}}>{emp.dept}</span>{badge&&<span style={{fontSize:16}}>{badge.icon}</span>}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
                    <div style={{flex:1,height:8,background:"#f3f4f6",borderRadius:4,overflow:"hidden",position:"relative"}}>
                      <div style={{height:"100%",width:`${(emp.count/maxCount)*100}%`,background:bc,borderRadius:4}}/>
                      <div style={{position:"absolute",left:"50%",top:0,width:1,height:"100%",background:"rgba(0,0,0,.15)"}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:bc,minWidth:28}}>{emp.count}件</span>
                  </div>
                </div>
                <div style={{textAlign:"center",minWidth:50}}><div style={{fontSize:18,fontWeight:800,color:emp.points>=2?"#7c3aed":emp.points>=1?"#d97706":"#9ca3af"}}>+{emp.points}</div><div style={{fontSize:10,color:"#6b7280"}}>点</div></div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16}}>
        <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f",marginBottom:12}}>🏢 部署別 平均復命書提出数</div>
        {Object.entries(ranked.reduce((acc,e)=>{if(!acc[e.dept])acc[e.dept]={total:0,count:0};acc[e.dept].total+=e.count;acc[e.dept].count+=1;return acc;},{}))
          .sort((a,b)=>b[1].total/b[1].count-a[1].total/a[1].count)
          .map(([dept,d])=>{const avg=d.total/d.count;return(
            <div key={dept} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{fontWeight:600,color:"#374151"}}>{dept}</span><span style={{color:"#6b7280"}}>{avg.toFixed(1)}件 / 人</span></div>
              <div style={{height:10,background:"#f3f4f6",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(avg/10*100,100)}%`,background:"#2563eb",borderRadius:5}}/></div>
            </div>
          );})}
      </div>
    </div>
  );
}

function InternalProgressTab({employees,internals,getIS,setIS,onQR}){
  return(
    <div>
      <div style={{display:"flex",gap:10,overflowX:"auto",padding:"12px 0 16px"}}>
        {internals.map(t=>{
          const n=employees.length;
          const s1=employees.filter(e=>{const s=getIS(e.id,t.id);return s.attendance==="参加済"||s.video==="視聴済";}).length;
          const s2=employees.filter(e=>getIS(e.id,t.id).report==="提出済").length;
          const s3=employees.filter(e=>getIS(e.id,t.id).reportConfirmed===true).length;
          return(
            <div key={t.id} style={S.sCard}>
              {t.required&&<span style={S.reqBadge}>必須</span>}
              <div style={{fontSize:11,fontWeight:700,color:"#1e3a5f",margin:"4px 0 6px",lineHeight:1.3}}>{t.title}</div>
              <MiniBar label="参加/動画" v={s1} n={n} color="#16a34a"/>
              <MiniBar label="復命書" v={s2} n={n} color="#2563eb"/>
              <MiniBar label="確認済" v={s3} n={n} color="#7c3aed"/>
              <button style={{...S.qrBtn,marginTop:8,width:"100%"}} onClick={()=>onQR(t)}>QR生成</button>
            </div>
          );
        })}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#1e3a5f",color:"#fff"}}>
            <th style={S.th}>従業員</th><th style={S.th}>部署</th>
            {internals.map(t=><th key={t.id} style={{...S.th,minWidth:140}}>{t.required?"【必】":""}{t.title}</th>)}
          </tr></thead>
          <tbody>{employees.map((emp,i)=>(
            <tr key={emp.id} style={{background:i%2===0?"#fff":"#f8fafc"}}>
              <td style={S.td}>{emp.name}</td><td style={S.td}>{emp.dept}</td>
              {internals.map(t=>{
                const s=getIS(emp.id,t.id); const [d1,d2,d3]=internalStepsDone(s);
                const done=[d1,d2,d3].filter(Boolean).length; const bc=done===3?"#16a34a":done===0?"#e5e7eb":"#f59e0b";
                return(
                  <td key={t.id} style={{...S.td,minWidth:140}}>
                    <div style={{height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${Math.round(done/3*100)}%`,background:bc,borderRadius:2}}/></div>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      {[["参/動",d1,"#16a34a"],["復命書",d2,"#2563eb"],["確認",d3,"#7c3aed"]].map(([l,ok,c])=>(
                        <span key={l} style={{fontSize:9,padding:"1px 4px",borderRadius:4,background:ok?c:"#f3f4f6",color:ok?"#fff":"#9ca3af",fontWeight:ok?700:400}}>{l}</span>
                      ))}
                      {d2&&!d3&&<button style={{fontSize:9,padding:"2px 6px",borderRadius:4,border:"1px solid #c4b5fd",background:"#f5f3ff",color:"#7c3aed",cursor:"pointer",marginLeft:2,fontWeight:600}}
                        onClick={()=>setIS(emp.id,t.id,"reportConfirmed",true)}>確認✓</button>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function InternalManageTab({internals,setInternals,deleteInternal}){
  const [showAdd,setShowAdd]=useState(false);
  const [newT,setNewT]=useState({title:"",date:"",required:true,videoUrl:"",description:""});
  const add=async()=>{
    if(!newT.title||!newT.date)return;
    const t={...newT,id:"T"+String(Date.now()).slice(-6)};
    await setInternals(p=>[...p,t]);
    setNewT({title:"",date:"",required:true,videoUrl:"",description:""});setShowAdd(false);
  };
  const toggleReq=async id=>{ await setInternals(p=>p.map(t=>t.id===id?{...t,required:!t.required}:t)); };
  return(
    <div style={{padding:4}}>
      <button style={{...S.btn,marginBottom:16}} onClick={()=>setShowAdd(!showAdd)}>＋ 研修を追加</button>
      {showAdd&&(
        <div style={S.formBox}>
          <div style={{fontWeight:700,color:"#0369a1",marginBottom:12}}>新しい内部研修を登録</div>
          {[{key:"title",label:"研修名",placeholder:"例：コンプライアンス研修"},{key:"date",label:"実施日",type:"date"},{key:"videoUrl",label:"YouTube URL",placeholder:"https://www.youtube.com/embed/..."},{key:"description",label:"説明",placeholder:"研修の概要"}]
            .map(f=><div key={f.key} style={{marginBottom:10}}><label style={S.label}>{f.label}</label><input type={f.type||"text"} style={S.input} placeholder={f.placeholder||""} value={newT[f.key]} onChange={e=>setNewT(p=>({...p,[f.key]:e.target.value}))}/></div>)}
          <div style={{marginBottom:12}}><label style={{...S.label,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox" checked={newT.required} onChange={e=>setNewT(p=>({...p,required:e.target.checked}))} style={{width:16,height:16,accentColor:"#dc2626"}}/>全員必須の研修にする</label></div>
          <button style={S.btn} onClick={add}>登録する</button>
        </div>
      )}
      {internals.map(t=>(
        <div key={t.id} style={{...S.card,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{flex:1}}>{t.required&&<span style={S.reqBadge}>必須</span>}<div style={S.cardTitle}>{t.title}</div><div style={S.cardDate}>📅 {t.date}</div></div>
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.qrBtn,background:t.required?"#fef2f2":"#f9fafb",borderColor:t.required?"#fca5a5":"#e5e7eb",color:t.required?"#dc2626":"#6b7280"}} onClick={()=>toggleReq(t.id)}>{t.required?"必須ON":"必須OFF"}</button>
            <button style={S.delBtn} onClick={()=>{if(window.confirm("削除しますか？"))deleteInternal(t.id);}}>削除</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExternalProgressTab({employees,externals,getXS,setXS}){
  return(
    <div>
      {externals.length===0&&<div style={S.empty}>外部研修はまだ登録されていません</div>}
      {externals.map(x=>{const targets=employees.filter(e=>x.targetEmpIds.includes(e.id));return(
        <div key={x.id} style={{marginBottom:24}}>
          <div style={{fontWeight:700,color:"#1e3a5f",fontSize:14,marginBottom:4}}><span style={S.extBadge}>外部</span> {x.title}</div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:10}}>📅 {x.date} ｜ 🏢 {x.organizer} ｜ 📍 {x.location}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#1e3a5f",color:"#fff"}}><th style={S.th}>従業員</th><th style={S.th}>部署</th><th style={S.th}>進捗</th><th style={S.th}>受講</th><th style={S.th}>復命書</th><th style={S.th}>管理者確認</th></tr></thead>
            <tbody>{targets.map((emp,i)=>{const s=getXS(emp.id,x.id);return(
              <tr key={emp.id} style={{background:i%2===0?"#fff":"#f8fafc"}}>
                <td style={S.td}>{emp.name}</td><td style={S.td}>{emp.dept}</td>
                <td style={{...S.td,minWidth:140}}><ExternalProgress status={s}/></td>
                <td style={S.td}>{s.attended?"✅":"○"}</td>
                <td style={S.td}>{s.reportSubmitted?"📄":"─"}</td>
                <td style={S.td}>{s.reportConfirmed?<span style={{color:"#15803d",fontWeight:600}}>✅確認済</span>
                  :s.reportSubmitted?<button style={{...S.qrBtn,fontSize:11}} onClick={()=>setXS(emp.id,x.id,{reportConfirmed:true})}>確認済にする</button>
                  :<span style={{color:"#9ca3af"}}>─</span>}</td>
              </tr>
            );})}
            </tbody>
          </table>
        </div>
      );})}
    </div>
  );
}

function ExternalManageTab({employees,externals,setExternals,deleteExternal}){
  const [showAdd,setShowAdd]=useState(false);
  const [newX,setNewX]=useState({title:"",date:"",organizer:"",location:"",targetEmpIds:[],pdfData:null,pdfName:null});
  const toggleEmp=id=>setNewX(p=>({...p,targetEmpIds:p.targetEmpIds.includes(id)?p.targetEmpIds.filter(x=>x!==id):[...p.targetEmpIds,id]}));
  const handlePdf=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setNewX(p=>({...p,pdfData:ev.target.result.split(",")[1],pdfName:f.name}));r.readAsDataURL(f);};
  const handleExistPdf=(xId,e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setExternals(p=>p.map(x=>x.id===xId?{...x,pdfData:ev.target.result.split(",")[1],pdfName:f.name}:x));r.readAsDataURL(f);};
  const add=async()=>{
    if(!newX.title||!newX.date||newX.targetEmpIds.length===0)return;
    const x={...newX,id:"X"+String(Date.now()).slice(-6)};
    await setExternals(p=>[...p,x]);
    setNewX({title:"",date:"",organizer:"",location:"",targetEmpIds:[],pdfData:null,pdfName:null});setShowAdd(false);
  };
  return(
    <div style={{padding:4}}>
      <button style={{...S.btn,marginBottom:16}} onClick={()=>setShowAdd(!showAdd)}>＋ 外部研修を申し込み登録</button>
      {showAdd&&(
        <div style={S.formBox}>
          <div style={{fontWeight:700,color:"#0369a1",marginBottom:12}}>外部研修を登録</div>
          {[{key:"title",label:"研修名",placeholder:"例：DXセミナー"},{key:"date",label:"実施日",type:"date"},{key:"organizer",label:"主催団体",placeholder:"例：総務省"},{key:"location",label:"場所",placeholder:"例：東京"}]
            .map(f=><div key={f.key} style={{marginBottom:10}}><label style={S.label}>{f.label}</label><input type={f.type||"text"} style={S.input} placeholder={f.placeholder||""} value={newX[f.key]} onChange={e=>setNewX(p=>({...p,[f.key]:e.target.value}))}/></div>)}
          <div style={{marginBottom:14}}>
            <label style={S.label}>研修要綱PDF（任意）</label>
            <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1.5px dashed #bfdbfe",background:"#f0f9ff",cursor:"pointer"}}>
              <input type="file" accept="application/pdf" style={{display:"none"}} onChange={handlePdf}/>
              <span style={{fontSize:20}}>📄</span>
              <div><div style={{fontSize:13,fontWeight:600,color:"#1e40af"}}>{newX.pdfName?"✅ "+newX.pdfName:"クリックしてPDFをアップロード"}</div><div style={{fontSize:11,color:"#6b7280"}}>PDFファイル</div></div>
            </label>
          </div>
          <div style={{marginBottom:14}}>
            <label style={S.label}>対象者を選択</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {employees.map(e=>(
                <label key={e.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,cursor:"pointer",padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:newX.targetEmpIds.includes(e.id)?"#1e40af":"#e5e7eb",background:newX.targetEmpIds.includes(e.id)?"#eff6ff":"#fff",color:newX.targetEmpIds.includes(e.id)?"#1e40af":"#374151"}}>
                  <input type="checkbox" checked={newX.targetEmpIds.includes(e.id)} onChange={()=>toggleEmp(e.id)} style={{display:"none"}}/>{e.name}
                </label>
              ))}
            </div>
            {newX.targetEmpIds.length===0&&<div style={{fontSize:11,color:"#dc2626",marginTop:6}}>※ 1名以上選択してください</div>}
          </div>
          <button style={S.btn} onClick={add}>登録する</button>
        </div>
      )}
      {externals.map(x=>{const targets=employees.filter(e=>x.targetEmpIds.includes(e.id));return(
        <div key={x.id} style={{...S.card,padding:"14px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <span style={S.extBadge}>外部</span><div style={S.cardTitle}>{x.title}</div>
              <div style={S.cardDate}>📅 {x.date} ｜ 🏢 {x.organizer} ｜ 📍 {x.location}</div>
              <div style={{marginTop:6,fontSize:12,color:"#6b7280"}}>対象: {targets.map(e=>e.name).join("、")}</div>
              <div style={{marginTop:8}}>
                {x.pdfData?<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:"#15803d",fontWeight:600}}>📄 {x.pdfName||"PDF添付済"}</span>
                  <label style={{fontSize:11,color:"#2563eb",cursor:"pointer",textDecoration:"underline"}}><input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>handleExistPdf(x.id,e)}/>差し替え</label></div>
                :<label style={{fontSize:12,color:"#2563eb",cursor:"pointer",textDecoration:"underline"}}><input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>handleExistPdf(x.id,e)}/>📄 PDFをアップロード</label>}
              </div>
            </div>
            <button style={S.delBtn} onClick={()=>{if(window.confirm("削除しますか？"))deleteExternal(x.id);}}>削除</button>
          </div>
        </div>
      );})}
    </div>
  );
}

function MiniBar({label,v,n,color}){
  const pct=n>0?(v/n)*100:0;
  return(<div style={{marginBottom:5}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#6b7280",marginBottom:2}}><span>{label}</span><span>{v}/{n}</span></div><div style={{height:4,background:"#e5e7eb",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3}}/></div></div>);
}

function QRModal({training,onClose}){
  const url=makeAttendUrl(training.id); const [copied,setCopied]=useState(false);
  useEffect(()=>{
    const draw=()=>{const el=document.getElementById("qr-canvas-area");if(!el)return;el.innerHTML="";new window.QRCode(el,{text:url,width:220,height:220,correctLevel:window.QRCode.CorrectLevel.H});};
    if(window.QRCode){draw();return;}
    const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";s.onload=draw;document.head.appendChild(s);
  },[url]);
  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <div style={{fontWeight:800,fontSize:17,color:"#1e3a5f",marginBottom:4}}>QRコード</div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>{training.title}</div>
        <div id="qr-canvas-area" style={{display:"flex",justifyContent:"center",marginBottom:12}}/>
        <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#6b7280",wordBreak:"break-all",marginBottom:12}}>{url}</div>
        <div style={{display:"flex",gap:8}}>
          <button style={{...S.btn,flex:1}} onClick={()=>navigator.clipboard?.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);})}>{copied?"✅ コピー済":"URLをコピー"}</button>
          <button style={{...S.btn,flex:1,background:"#059669"}} onClick={()=>window.print()}>🖨 印刷</button>
        </div>
        <div style={{marginTop:12,padding:"8px 12px",background:"#fffbeb",borderRadius:8,fontSize:12,color:"#92400e"}}>💡 研修会場に掲示してください。スキャン後ログインすると「参加済」に自動登録されます。</div>
        <button style={{width:"100%",marginTop:12,padding:"10px",background:"#f3f4f6",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600}} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

const S={
  page:{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f172a 100%)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 8px",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif"},
  loginWrap:{width:"100%",maxWidth:400,background:"#fff",borderRadius:20,padding:"28px 24px",boxShadow:"0 24px 60px rgba(0,0,0,.45)",marginTop:40},
  qrBanner:{display:"flex",alignItems:"center",gap:10,background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:10,padding:"10px 14px",marginBottom:20},
  logoArea:{textAlign:"center",marginBottom:24},
  logoIcon:{width:56,height:56,background:"#1e3a5f",color:"#fff",borderRadius:14,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,marginBottom:10},
  appName:{fontSize:20,fontWeight:800,color:"#1e3a5f",margin:"0 0 4px"},
  appSub:{fontSize:13,color:"#6b7280",margin:0},
  fGroup:{marginBottom:14},
  label:{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5},
  input:{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box"},
  btn:{width:"100%",padding:"11px",background:"#1e40af",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"},
  errBox:{background:"#fef2f2",border:"1px solid #fca5a5",color:"#dc2626",borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:12},
  demoHint:{marginTop:16,padding:"10px 12px",background:"#f8fafc",borderRadius:8,fontSize:11,color:"#6b7280",lineHeight:1.7},
  appWrap:{width:"100%",maxWidth:700,background:"#fff",borderRadius:20,boxShadow:"0 24px 60px rgba(0,0,0,.45)",overflow:"hidden"},
  header:{background:"#1e3a5f",color:"#fff",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  headerName:{fontSize:16,fontWeight:700},
  headerSub:{fontSize:11,color:"#93c5fd",marginTop:2},
  logoutBtn:{padding:"5px 12px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",color:"#374151",cursor:"pointer",fontSize:12,fontWeight:600},
  tabBar:{display:"flex",borderBottom:"1px solid #e5e7eb"},
  tab:{flex:1,padding:"11px 4px",border:"none",background:"transparent",fontSize:13,fontWeight:600,color:"#6b7280",cursor:"pointer"},
  tabOn:{color:"#1e40af",borderBottom:"2.5px solid #1e40af"},
  scroll:{padding:14,overflowY:"auto",maxHeight:"calc(100vh - 200px)"},
  card:{border:"1px solid #e5e7eb",borderRadius:12,marginBottom:10,overflow:"hidden"},
  cardHead:{padding:"11px 14px",display:"flex",alignItems:"flex-start",cursor:"pointer",gap:8},
  cardTitle:{fontWeight:700,color:"#1e3a5f",fontSize:14,marginTop:4},
  cardDate:{fontSize:11,color:"#6b7280",marginTop:2},
  cardBody:{padding:"0 14px 14px",borderTop:"1px solid #f3f4f6"},
  sBlock:{marginBottom:14},
  sLabel:{fontSize:12,fontWeight:600,color:"#374151",marginBottom:6,display:"flex",alignItems:"center",gap:6},
  stepNum:{display:"inline-flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:"50%",background:"#1e3a5f",color:"#fff",fontSize:10,fontWeight:700,flexShrink:0},
  watchBtn:{width:"100%",padding:"10px",background:"#1e40af",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"},
  actionBtn:{padding:"8px 20px",background:"#16a34a",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"},
  reqBadge:{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,display:"inline-block",background:"#fef2f2",color:"#dc2626"},
  extBadge:{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,display:"inline-block",background:"#fef9c3",color:"#854d0e"},
  sCard:{minWidth:150,background:"#f8fafc",borderRadius:12,padding:"12px 14px",border:"1px solid #e2e8f0",flexShrink:0},
  qrBtn:{padding:"5px 12px",borderRadius:8,border:"1px solid #bfdbfe",background:"#eff6ff",color:"#1e40af",cursor:"pointer",fontSize:12,fontWeight:600},
  delBtn:{padding:"6px 12px",borderRadius:8,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontSize:12},
  th:{padding:"10px 12px",textAlign:"left",fontWeight:600,fontSize:12,whiteSpace:"nowrap"},
  td:{padding:"8px 12px",borderBottom:"1px solid #f3f4f6",verticalAlign:"middle",fontSize:12},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},
  modal:{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,.4)"},
  toast:{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#1e3a5f",color:"#fff",padding:"10px 20px",borderRadius:20,fontSize:13,fontWeight:600,zIndex:2000,boxShadow:"0 4px 20px rgba(0,0,0,.3)"},
  empty:{textAlign:"center",color:"#9ca3af",fontSize:14,padding:"40px 0"},
  formBox:{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:12,padding:16,marginBottom:16},
  profileSection:{marginBottom:16,paddingBottom:14,borderBottom:"1px solid #f3f4f6"},
  profileLabel:{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:6},
  profileValue:{fontSize:15,fontWeight:600,color:"#1e3a5f"},
  qBadge:{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:"#dbeafe",color:"#1e40af",border:"1px solid #bfdbfe"},
};

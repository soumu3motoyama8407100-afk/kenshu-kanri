import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nncousuugjntzovtmkvt.supabase.co",
  "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
);

const ADMIN = { id:"ADMIN", password:"admin123" };
const ORG_NAME = "社会福祉法人　ザ・ハート・クラブ";
const LOGO_B64 = "/title-_2_-removebg-preview-removebg-preview-2.png";

const INIT_INTERNAL = [
  { id:"T001", title:"新入社員オリエンテーション", date:"2026-04-01", required:true,  videoUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ", description:"会社の基本方針・規則・業務フローを学ぶ研修" },
  { id:"T002", title:"情報セキュリティ研修",       date:"2026-04-15", required:true,  videoUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ", description:"個人情報保護・サイバーセキュリティの基礎知識" },
  { id:"T003", title:"ハラスメント防止研修",       date:"2026-05-01", required:true,  videoUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ", description:"職場環境の改善とハラスメント対策" },
  { id:"T004", title:"リーダーシップ研修",         date:"2026-05-20", required:false, videoUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ", description:"チームマネジメントとリーダーシップスキルの向上" },
];
const INIT_EXTERNAL = [
  { id:"X001", title:"自治体向けDX推進セミナー",     date:"2026-06-10", organizer:"総務省",         location:"東京",      targetEmpIds:["E001","E003"], pdfData:null, pdfName:null },
  { id:"X002", title:"メンタルヘルスマネジメント検定", date:"2026-07-01", organizer:"大阪商工会議所", location:"オンライン", targetEmpIds:["E002","E004"], pdfData:null, pdfName:null },
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

const db = {
  async getEmployees() {
    const {data} = await supabase.from("employees").select("*").order("sort_order").order("id");
    return (data||[]).map(r=>({id:r.id,password:r.password,name:r.name,dept:r.dept,joinDate:r.join_date||"",qualifications:r.qualifications||[],certTrainings:r.cert_trainings||[],isManager:r.is_manager||false}));
  },
  async upsertEmployee(emp) {
    await supabase.from("employees").upsert({
      id:emp.id,password:emp.password,name:emp.name,dept:emp.dept,
      join_date:emp.joinDate||null,qualifications:emp.qualifications||[],
      cert_trainings:emp.certTrainings||[],is_manager:emp.isManager||false,
      updated_at:new Date().toISOString()
    },{onConflict:"id"});
  },
  async deleteEmployee(id) { await supabase.from("employees").delete().eq("id",id); },
  async getIStatuses() {
    const {data} = await supabase.from("i_statuses").select("*");
    const map = {};
    (data||[]).forEach(r => { if(!map[r.emp_id])map[r.emp_id]={}; map[r.emp_id][r.training_id]={attendance:r.attendance,report:r.report,video:r.video,reportConfirmed:r.report_confirmed}; });
    return map;
  },
  async setIStatus(empId,tid,fields) {
    await supabase.from("i_statuses").upsert({emp_id:empId,training_id:tid,attendance:fields.attendance,report:fields.report,video:fields.video,report_confirmed:fields.reportConfirmed,updated_at:new Date().toISOString()},{onConflict:"emp_id,training_id"});
  },
  async getXStatuses() {
    const {data} = await supabase.from("x_statuses").select("*");
    const map = {};
    (data||[]).forEach(r => { if(!map[r.emp_id])map[r.emp_id]={}; map[r.emp_id][r.training_id]={attended:r.attended,reportSubmitted:r.report_submitted,reportConfirmed:r.report_confirmed}; });
    return map;
  },
  async setXStatus(empId,xid,fields) {
    await supabase.from("x_statuses").upsert({emp_id:empId,training_id:xid,attended:fields.attended,report_submitted:fields.reportSubmitted,report_confirmed:fields.reportConfirmed,updated_at:new Date().toISOString()},{onConflict:"emp_id,training_id"});
  },
  async getInternals() {
    const {data} = await supabase.from("internals").select("*").order("date");
    if(!data||data.length===0){await db.seedInternals();return INIT_INTERNAL;}
    return data.map(r=>({id:r.id,title:r.title,date:r.date,required:r.required,videoUrl:r.video_url,description:r.description}));
  },
  async seedInternals() {
    for(const t of INIT_INTERNAL) await supabase.from("internals").upsert({id:t.id,title:t.title,date:t.date,required:t.required,video_url:t.videoUrl,description:t.description},{onConflict:"id"});
  },
  async upsertInternal(t) { await supabase.from("internals").upsert({id:t.id,title:t.title,date:t.date,required:t.required,video_url:t.videoUrl,description:t.description},{onConflict:"id"}); },
  async deleteInternal(id) { await supabase.from("internals").delete().eq("id",id); },
  async getExternals() {
    const {data} = await supabase.from("externals").select("*").order("date");
    if(!data||data.length===0){await db.seedExternals();return INIT_EXTERNAL;}
    return data.map(r=>({id:r.id,title:r.title,date:r.date,organizer:r.organizer,location:r.location,targetEmpIds:r.target_emp_ids||[],pdfData:r.pdf_data,pdfName:r.pdf_name}));
  },
  async seedExternals() {
    for(const x of INIT_EXTERNAL) await supabase.from("externals").upsert({id:x.id,title:x.title,date:x.date,organizer:x.organizer,location:x.location,target_emp_ids:x.targetEmpIds,pdf_data:x.pdfData,pdf_name:x.pdfName},{onConflict:"id"});
  },
  async upsertExternal(x) { await supabase.from("externals").upsert({id:x.id,title:x.title,date:x.date,organizer:x.organizer,location:x.location,target_emp_ids:x.targetEmpIds,pdf_data:x.pdfData,pdf_name:x.pdfName},{onConflict:"id"}); },
  async deleteExternal(id) { await supabase.from("externals").delete().eq("id",id); },
};

export default function App() {
  const [employees,setEmployees] = useState([]);
  const [internals,setInternals] = useState(INIT_INTERNAL);
  const [externals,setExternals] = useState(INIT_EXTERNAL);
  const [iStatuses,setIStatuses] = useState({});
  const [xStatuses,setXStatuses] = useState({});
  const [fiscalYear,setFiscalYear] = useState(currentFY());
  const [session,setSession]     = useState(null);
  const [loading,setLoading]     = useState(true);
  const [pendingAttend,setPendingAttend] = useState(null);

  useEffect(()=>{ const p=new URLSearchParams(window.location.search);const a=p.get("attend");if(a)setPendingAttend(a); },[]);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const [emps,iS,xS,int,ext] = await Promise.all([db.getEmployees(),db.getIStatuses(),db.getXStatuses(),db.getInternals(),db.getExternals()]);
      setEmployees(emps); setIStatuses(iS); setXStatuses(xS); setInternals(int); setExternals(ext);
      setLoading(false);
    })();
  },[]);

  useEffect(()=>{
    if(loading||employees.length===0)return;
    internals.forEach(t=>{
      if(!isPast(t.date))return;
      employees.forEach(emp=>{
        const cur=iStatuses[emp.id]?.[t.id];
        if(!cur||(cur.attendance!=="参加済"&&cur.attendance!=="未参加（確定）")){
          const next={attendance:"未参加（確定）",report:(cur?.report||"未提出"),video:(cur?.video||"未視聴"),reportConfirmed:(cur?.reportConfirmed||false)};
          setIStatuses(p=>({...p,[emp.id]:{...p[emp.id],[t.id]:next}}));
          db.setIStatus(emp.id,t.id,next);
        }
      });
    });
  },[internals,loading,employees]);// eslint-disable-line

  const getIS = (empId,tid) => iStatuses[empId]?.[tid]||{attendance:"未参加",report:"未提出",video:"未視聴",reportConfirmed:false};
  const setIS = async(empId,tid,field,val) => {
    const next={...getIS(empId,tid),[field]:val};
    setIStatuses(p=>({...p,[empId]:{...p[empId],[tid]:next}}));
    await db.setIStatus(empId,tid,next);
  };
  const getXS = (empId,xid) => xStatuses[empId]?.[xid]||{attended:false,reportSubmitted:false,reportConfirmed:false};
  const setXS = async(empId,xid,patch) => {
    const next={...getXS(empId,xid),...patch};
    setXStatuses(p=>({...p,[empId]:{...p[empId],[xid]:next}}));
    await db.setXStatus(empId,xid,next);
  };
  const getCount = (empId,fy) => {
    const iC=internals.filter(t=>inFiscalYear(t.date,fy)&&getIS(empId,t.id).report==="提出済").length;
    const xC=externals.filter(x=>inFiscalYear(x.date,fy)&&x.targetEmpIds.includes(empId)&&getXS(empId,x.id).reportSubmitted).length;
    return iC+xC;
  };

  const handleLogin=(empId,isAdmin,isManager,dept)=>{
    setSession({empId,isAdmin,isManager,dept});
    if(pendingAttend&&!isAdmin&&!isManager){ setIS(empId,pendingAttend,"attendance","参加済"); setPendingAttend(null); }
  };
  const handleLogout=()=>setSession(null);

  if(loading) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#F5EDD8 0%,#FDF6EC 60%,#F5EDD8 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <img src={LOGO_B64} alt="ロゴ" style={{height:60,marginBottom:16,objectFit:"contain"}}/>
        <div style={{fontSize:18,fontWeight:700,color:"#4A3020"}}>研修管理システム</div>
        <div style={{fontSize:14,color:"#C89A55",marginTop:8}}>読み込み中...</div>
      </div>
    </div>
  );

  if(!session) return <LoginScreen pendingAttend={pendingAttend} internals={internals} employees={employees} onLogin={handleLogin}/>;

  if(session.isAdmin) return(
    <AdminScreen employees={employees} setEmployees={setEmployees}
      internals={internals} setInternals={async fn=>{ const n=typeof fn==="function"?fn(internals):fn; setInternals(n); for(const t of n) await db.upsertInternal(t); }}
      externals={externals} setExternals={async fn=>{ const n=typeof fn==="function"?fn(externals):fn; setExternals(n); for(const x of n) await db.upsertExternal(x); }}
      deleteInternal={async id=>{ setInternals(p=>p.filter(t=>t.id!==id)); await db.deleteInternal(id); }}
      deleteExternal={async id=>{ setExternals(p=>p.filter(x=>x.id!==id)); await db.deleteExternal(id); }}
      getIS={getIS} setIS={setIS} getXS={getXS} setXS={setXS}
      fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
      getCount={getCount} onLogout={handleLogout}/>
  );

  if(session.isManager) return(
    <ManagerScreen
      dept={session.dept}
      employees={employees.filter(e=>e.dept===session.dept)}
      internals={internals} getIS={getIS} setIS={setIS}
      externals={externals} getXS={getXS} setXS={setXS}
      fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
      onLogout={handleLogout}/>
  );

  const emp=employees.find(e=>e.id===session.empId);
  if(!emp){ handleLogout(); return null; }
  return(
    <EmployeeScreen emp={emp}
      internals={internals} getIS={getIS} setIS={setIS}
      externals={externals} getXS={getXS} setXS={setXS}
      fiscalYear={fiscalYear} getCount={getCount}
      onLogout={handleLogout}/>
  );
}

function LoginScreen({pendingAttend,internals,employees,onLogin}){
  const [id,setId]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState("");
  const training=internals.find(t=>t.id===pendingAttend);
  const submit=()=>{
    setErr("");
    if(id===ADMIN.id&&pw===ADMIN.password){onLogin(ADMIN.id,true,false,"");return;}
    const emp=employees.find(e=>e.id===id&&e.password===pw);
    if(emp){onLogin(emp.id,false,emp.isManager||false,emp.dept);return;}
    setErr("IDまたはパスワードが正しくありません");
  };
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#F5EDD8 0%,#FDF6EC 60%,#F5EDD8 100%)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 8px",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif"}}>
      <div style={{width:"100%",maxWidth:400,background:"#fff",borderRadius:20,padding:"28px 24px",boxShadow:"0 24px 60px rgba(200,154,85,.25)",marginTop:40,border:"1px solid #F0D9B0"}}>
        {training&&<div style={{display:"flex",alignItems:"center",gap:10,background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:10,padding:"10px 14px",marginBottom:20}}><span style={{fontSize:20}}>📋</span><div><div style={{fontWeight:600,fontSize:14}}>研修QRを読み取りました</div><div style={{fontSize:13,color:"#15803d"}}>「{training.title}」の参加が自動登録されます</div></div></div>}
        <div style={{textAlign:"center",marginBottom:24}}>
          <img src={LOGO_B64} alt={ORG_NAME} style={{height:64,objectFit:"contain",marginBottom:12}}/>
          <h1 style={{fontSize:20,fontWeight:800,color:"#4A3020",margin:"0 0 4px"}}>研修管理システム</h1>
          <p style={{fontSize:12,color:"#C89A55",margin:0}}>ログインしてください</p>
        </div>
        <div style={{marginBottom:14}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>従業員ID</label>
          <input style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #E8D5B0",fontSize:14,outline:"none",boxSizing:"border-box"}} placeholder="例: E001" value={id} onChange={e=>{setId(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <div style={{marginBottom:14}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>パスワード</label>
          <input style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #E8D5B0",fontSize:14,outline:"none",boxSizing:"border-box"}} type="password" placeholder="パスワード" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        {err&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",color:"#dc2626",borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:12}}>{err}</div>}
        <button style={{width:"100%",padding:"11px",background:"#C89A55",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={submit}>ログイン</button>
        <div style={{marginTop:12,fontSize:11,color:"#9ca3af",textAlign:"center"}}>管理者: ADMIN / admin123</div>
      </div>
    </div>
  );
}

function PointCard({count,fiscalYear}){
  const points=calcPoints(count); const badge=getBadge(count);
  const pct=Math.min(count/10*100,100); const bc=count>=10?"#7c3aed":count>=5?"#d97706":"#C89A55";
  return(
    <div style={{background:"linear-gradient(135deg,#C89A55,#A07840)",borderRadius:18,padding:"20px 22px",color:"#fff",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",right:-20,top:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.08)"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,position:"relative"}}>
        <div><div style={{fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:2}}>{fiscalYear}年度 復命書提出実績</div>
          <div style={{fontSize:36,fontWeight:800,lineHeight:1}}>{count}<span style={{fontSize:14,fontWeight:400,marginLeft:4}}>件</span></div></div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:34}}>{points>0?(points===2?"🏆":"⭐"):"🌱"}</div>
          <div style={{fontSize:11,marginTop:2,color:points>=2?"#c4b5fd":points>=1?"#fcd34d":"rgba(255,255,255,.7)"}}>人事考課 <span style={{fontSize:16,fontWeight:800}}>+{points}</span>点</div>
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:4}}><span>今年度の復命書提出状況</span><span>{count}/10件</span></div>
        <div style={{position:"relative",height:10,background:"rgba(255,255,255,.25)",borderRadius:5,overflow:"visible"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"#fff",borderRadius:5,transition:"width .5s"}}/>
          <div style={{position:"absolute",left:"50%",top:-3,width:2,height:16,background:"rgba(255,255,255,.6)",borderRadius:1}}/>
        </div>
      </div>
      <div style={{marginTop:16,padding:"8px 12px",background:"rgba(255,255,255,.15)",borderRadius:10,fontSize:12}}>
        {count>=10?"🎉 10件達成！人事考課 +2点獲得おめでとうございます！":count>=5?`⭐ +1点獲得中！あと${10-count}件で +2点`:`🌱 あと${5-count}件で +1点、${10-count}件で +2点`}
      </div>
      {badge&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}><span style={{fontSize:18}}>{badge.icon}</span><span style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>{badge.label} バッジ獲得中</span></div>}
    </div>
  );
}

function ProfileModal({emp,onClose}){
  const yrs=calcYears(emp.joinDate);
  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal,maxWidth:420}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontWeight:800,fontSize:18,color:"#4A3020"}}>{emp.name}</div><div style={{fontSize:13,color:"#6b7280"}}>{emp.dept} · {emp.id}</div></div>
          <button style={S.logoutBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.profileSection}><div style={S.profileLabel}>📅 入社年月日</div>
          <div style={S.profileValue}>{emp.joinDate||"未登録"}{yrs&&<span style={{fontSize:12,color:"#6b7280",marginLeft:8}}>（勤続 {yrs}）</span>}</div></div>
        <div style={S.profileSection}><div style={S.profileLabel}>🎓 保有資格</div>
          {(emp.qualifications||[]).length===0?<div style={{fontSize:13,color:"#9ca3af"}}>未登録</div>
            :<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>{emp.qualifications.map((q,i)=><span key={i} style={S.qBadge}>{q}</span>)}</div>}</div>
        <div style={S.profileSection}><div style={S.profileLabel}>📜 受講済み認定研修</div>
          {(emp.certTrainings||[]).length===0?<div style={{fontSize:13,color:"#9ca3af"}}>未登録</div>
            :<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>{emp.certTrainings.map((c,i)=><span key={i} style={{...S.qBadge,background:"#ede9fe",color:"#7c3aed",borderColor:"#c4b5fd"}}>{c}</span>)}</div>}</div>
        <button style={{...S.btn,marginTop:4}} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

function QRScanModal({onScan,onClose}){
  const videoRef=require("react").useRef(null);
  const [error,setError]=useState("");
  const [scanning,setScanning]=useState(false);
  useEffect(()=>{
    let stream=null; let animFrame=null;
    const canvas=document.createElement("canvas"); const ctx=canvas.getContext("2d");
    const startCamera=async()=>{
      try{
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
        if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();setScanning(true);scanLoop();}
      }catch(e){setError("カメラへのアクセスが拒否されました。ブラウザの設定でカメラを許可してください。");}
    };
    const scanLoop=()=>{
      if(!videoRef.current)return;
      const v=videoRef.current;
      if(v.readyState===v.HAVE_ENOUGH_DATA){
        canvas.width=v.videoWidth;canvas.height=v.videoHeight;ctx.drawImage(v,0,0);
        const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
        if(window.jsQR){const code=window.jsQR(imageData.data,imageData.width,imageData.height);
          if(code){const p=new URLSearchParams(code.data.split("?")[1]||"");const tid=p.get("attend");
            if(tid){if(stream)stream.getTracks().forEach(t=>t.stop());onScan(tid);return;}}}
      }
      animFrame=requestAnimationFrame(scanLoop);
    };
    if(window.jsQR){startCamera();}else{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";s.onload=startCamera;document.head.appendChild(s);}
    return()=>{if(stream)stream.getTracks().forEach(t=>t.stop());if(animFrame)cancelAnimationFrame(animFrame);};
  },[]);// eslint-disable-line
  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal,maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:16,color:"#4A3020"}}>📷 QRコードをスキャン</div>
          <button style={S.logoutBtn} onClick={onClose}>✕</button>
        </div>
        {error?<div style={{padding:"16px",background:"#fef2f2",borderRadius:10,color:"#dc2626",fontSize:13,textAlign:"center"}}>{error}</div>
          :<div>
            <div style={{position:"relative",borderRadius:12,overflow:"hidden",background:"#000",aspectRatio:"1"}}>
              <video ref={videoRef} style={{width:"100%",height:"100%",objectFit:"cover"}} playsInline muted/>
              {scanning&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                <div style={{width:200,height:200,border:"2px solid #C89A55",borderRadius:8,boxShadow:"0 0 0 9999px rgba(0,0,0,.4)"}}/>
              </div>}
            </div>
            <div style={{marginTop:12,fontSize:13,color:"#6b7280",textAlign:"center"}}>{scanning?"QRコードを枠内に合わせてください":"カメラを起動中..."}</div>
          </div>}
        <button style={{...S.btn,marginTop:12,background:"#6b7280"}} onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}

function EmployeeScreen({emp,internals,getIS,setIS,externals,getXS,setXS,fiscalYear,getCount,onLogout}){
  const [tab,setTab]=useState("score");
  const [videoT,setVideoT]=useState(null);
  const [toast,setToast]=useState(null);
  const [pdfExt,setPdfExt]=useState(null);
  const [showProfile,setShowProfile]=useState(false);
  const [showQRScan,setShowQRScan]=useState(false);
  const [viewFY,setViewFY]=useState(fiscalYear);
  const isCurrentFY=viewFY===fiscalYear;
  const fyInternals=internals.filter(t=>inFiscalYear(t.date,viewFY)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const fyExternals=externals.filter(x=>x.targetEmpIds.includes(emp.id)&&inFiscalYear(x.date,viewFY)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2500);};
  const count=getCount(emp.id,viewFY);
  const monthCounts=Array.from({length:12},(_,i)=>{
    const month=(i+4)%12||12; const year=i<9?viewFY:viewFY+1;
    const iC=internals.filter(t=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()+1===month&&getIS(emp.id,t.id).report==="提出済";}).length;
    const xC=externals.filter(x=>{const d=new Date(x.date);return d.getFullYear()===year&&d.getMonth()+1===month&&x.targetEmpIds.includes(emp.id)&&getXS(emp.id,x.id).reportSubmitted;}).length;
    return{label:`${month}月`,count:iC+xC};
  });
  const maxM=Math.max(...monthCounts.map(m=>m.count),1);
  return(
    <div style={S.page}>
      {toast&&<div style={S.toast}>{toast}</div>}
      {pdfExt&&<PdfModal ext={pdfExt} onClose={()=>setPdfExt(null)}/>}
      {showProfile&&<ProfileModal emp={emp} onClose={()=>setShowProfile(false)}/>}
      {showQRScan&&<QRScanModal onScan={tid=>{setIS(emp.id,tid,"attendance","参加済");setShowQRScan(false);showToast("✅ 参加済に登録しました！");}} onClose={()=>setShowQRScan(false)}/>}
      <div style={S.appWrap}>
        <div style={S.header}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setShowProfile(true)} style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,.25)",border:"1.5px solid rgba(255,255,255,.4)",color:"#4A3020",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>👤</button>
            <div><div style={S.headerName}>{emp.name}</div><div style={S.headerSub}>{emp.dept} · {emp.id}</div></div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setShowQRScan(true)} style={{padding:"6px 12px",borderRadius:8,background:"#A07840",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>📷 QR読取</button>
            <button style={S.logoutBtn} onClick={onLogout}>ログアウト</button>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"8px 16px",background:"#FDF6EC",borderBottom:"1px solid #E8D5B0"}}>
          <span style={{fontSize:12,color:"#A07840",fontWeight:600}}>📅 年度</span>
          <select value={viewFY} onChange={e=>setViewFY(Number(e.target.value))} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #E8D5B0",fontSize:13,fontWeight:600,color:"#4A3020",cursor:"pointer",background:"#fff"}}>
            {[fiscalYear-2,fiscalYear-1,fiscalYear].map(y=><option key={y} value={y}>{y}年度{y===fiscalYear?"（今年度）":""}</option>)}
          </select>
          {!isCurrentFY&&<span style={{fontSize:11,color:"#d97706",fontWeight:600,background:"#fef3c7",padding:"2px 8px",borderRadius:20}}>過去年度閲覧中</span>}
        </div>
        <div style={S.tabBar}>
          {[["score","🏅 実績"],["internal","🏢 内部研修"],["external","🌐 外部研修"],["video","▶ 動画"]].map(([k,l])=>(
            <button key={k} style={{...S.tab,...(tab===k?S.tabOn:{})}} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{textAlign:"center",padding:"12px 0 8px",borderTop:"1px solid #F0D9B0"}}>
  <img src={LOGO_B64} alt="ロゴ" style={{height:36,objectFit:"contain",opacity:0.7}}/>
</div>

          {tab==="score"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <PointCard count={count} fiscalYear={viewFY}/>
              <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,padding:16}}>
                <div style={{fontWeight:700,fontSize:14,color:"#4A3020",marginBottom:12}}>📊 月別復命書提出状況（{viewFY}年度）</div>
                <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80}}>
                  {monthCounts.map((m,i)=>(
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{fontSize:9,color:m.count>0?"#C89A55":"#9ca3af",fontWeight:700}}>{m.count>0?m.count:""}</div>
                      <div style={{width:"100%",height:`${(m.count/maxM)*60}px`,minHeight:m.count>0?4:0,background:m.count>=3?"#7c3aed":m.count>=2?"#C89A55":m.count>=1?"#D4AA70":"#e5e7eb",borderRadius:"3px 3px 0 0"}}/>
                      <div style={{fontSize:9,color:"#9ca3af"}}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,padding:16}}>
                <div style={{fontWeight:700,fontSize:14,color:"#4A3020",marginBottom:12}}>🎖 バッジコレクション</div>
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
          {tab==="internal"&&(fyInternals.length===0?<div style={S.empty}>{viewFY}年度の内部研修はありません</div>
            :fyInternals.map(t=>(
              <InternalCard key={t.id} training={t} status={getIS(emp.id,t.id)} readonly={!isCurrentFY}
                onReport={v=>{ if(isCurrentFY){setIS(emp.id,t.id,"report",v);showToast(v==="提出済"?"復命書を提出済にしました":"未提出に戻しました");} }}
                onVideo={v=>{ if(isCurrentFY){setIS(emp.id,t.id,"video",v);} }}
                onWatchVideo={()=>{setVideoT(t);setTab("video");}}/>
            ))
          )}
          {tab==="external"&&(fyExternals.length===0?<div style={S.empty}>{viewFY}年度の外部研修はありません</div>
            :fyExternals.map(x=>(
              <ExternalCard key={x.id} ext={x} status={getXS(emp.id,x.id)} readonly={!isCurrentFY}
                onAttend={()=>{ if(isCurrentFY){setXS(emp.id,x.id,{attended:true});showToast("受講済にしました");} }}
                onReport={()=>{ if(isCurrentFY){setXS(emp.id,x.id,{reportSubmitted:true});showToast("復命書を提出しました");} }}
                onViewPdf={()=>setPdfExt(x)}/>
            ))
          )}
          {tab==="video"&&(
            <VideoTab trainings={fyInternals.filter(t=>t.videoUrl)} selected={videoT||fyInternals.find(t=>t.videoUrl)}
              onSelect={t=>setVideoT(t)}
              onMarkWatched={(t,val)=>{ if(isCurrentFY){setIS(emp.id,t.id,"video",val);showToast(val==="視聴済"?"「視聴済」にしました":"未視聴に戻しました");} }}
              getStatus={t=>getIS(emp.id,t.id)} readonly={!isCurrentFY}/>
          )}
        </div>
    </div>
  );
}

// ── 部署長画面 ─────────────────────────────────────────────────
function ManagerScreen({dept,employees,internals,getIS,setIS,externals,getXS,setXS,fiscalYear,setFiscalYear,onLogout}){
  const [tab,setTab]=useState("iProgress");
  const fyInternals=internals.filter(t=>inFiscalYear(t.date,fiscalYear));
  const fyExternals=externals.filter(x=>inFiscalYear(x.date,fiscalYear));
  return(
    <div style={S.page}>
      <div style={{...S.appWrap,maxWidth:960}}>
        <div style={S.header}>
          <div>
            <div style={S.headerName}>🏢 {dept} 部署長ダッシュボード</div>
            <div style={S.headerSub}>{ORG_NAME}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select value={fiscalYear} onChange={e=>setFiscalYear(Number(e.target.value))} style={{padding:"4px 8px",borderRadius:8,border:"1px solid #E8D5B0",fontSize:12,cursor:"pointer",background:"#fff"}}>
              {[currentFY()-1,currentFY(),currentFY()+1].map(y=><option key={y} value={y}>{y}年度</option>)}
            </select>
            <button style={S.logoutBtn} onClick={onLogout}>ログアウト</button>
          </div>
        </div>
        <div style={S.tabBar}>
          {[["iProgress","📊 内部研修 進捗"],["xProgress","🌐 外部研修 進捗"]].map(([k,l])=>(
            <button key={k} style={{...S.tab,...(tab===k?S.tabOn:{})}} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{textAlign:"center",padding:"12px 0 8px",borderTop:"1px solid #F0D9B0"}}>
  <img src={LOGO_B64} alt="ロゴ" style={{height:36,objectFit:"contain",opacity:0.7}}/>
</div>
          <div style={{...S.scroll,maxHeight:"calc(100vh - 185px)"}}>
          {tab==="iProgress"&&(
            <div>
              <div style={{fontSize:12,color:"#A07840",fontWeight:600,marginBottom:12,padding:"8px 12px",background:"#FDF6EC",borderRadius:8}}>
                📋 {dept}の内部研修進捗（{fiscalYear}年度）
              </div>
              {fyInternals.length===0&&<div style={S.empty}>{fiscalYear}年度の内部研修はありません</div>}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"#C89A55",color:"#fff"}}>
                    <th style={S.th}>従業員</th>
                    {fyInternals.map(t=><th key={t.id} style={{...S.th,minWidth:140}}>{t.required?"【必】":""}{t.title}</th>)}
                  </tr></thead>
                  <tbody>{employees.map((emp,i)=>(
                    <tr key={emp.id} style={{background:i%2===0?"#fff":"#FDF6EC"}}>
                      <td style={S.td}><div style={{fontWeight:600}}>{emp.name}</div></td>
                      {fyInternals.map(t=>{
                        const s=getIS(emp.id,t.id);
                        const [d1,d2,d3]=internalStepsDone(s);
                        const done=[d1,d2,d3].filter(Boolean).length;
                        const bc=done===3?"#16a34a":done===0?"#e5e7eb":"#f59e0b";
                        return(
                          <td key={t.id} style={{...S.td,minWidth:140}}>
                            <div style={{height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${Math.round(done/3*100)}%`,background:bc,borderRadius:2}}/></div>
                            <div style={{display:"flex",gap:3,alignItems:"center"}}>
                              {[["参/動",d1,"#16a34a"],["復命書",d2,"#2563eb"],["確認",d3,"#7c3aed"]].map(([l,ok,c])=>(
                                <span key={l} style={{fontSize:9,padding:"1px 4px",borderRadius:4,background:ok?c:"#f3f4f6",color:ok?"#fff":"#9ca3af",fontWeight:ok?700:400}}>{l}</span>
                              ))}
                              {d2&&!d3&&<button style={{fontSize:9,padding:"2px 6px",borderRadius:4,border:"1px solid #C89A55",background:"#FDF6EC",color:"#A07840",cursor:"pointer",marginLeft:2,fontWeight:600}}
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
          )}
          {tab==="xProgress"&&(
            <div>
              <div style={{fontSize:12,color:"#A07840",fontWeight:600,marginBottom:12,padding:"8px 12px",background:"#FDF6EC",borderRadius:8}}>
                📋 {dept}の外部研修進捗（{fiscalYear}年度）
              </div>
              {fyExternals.filter(x=>x.targetEmpIds.some(id=>employees.map(e=>e.id).includes(id))).length===0
                &&<div style={S.empty}>{fiscalYear}年度の外部研修はありません</div>}
              {fyExternals.filter(x=>x.targetEmpIds.some(id=>employees.map(e=>e.id).includes(id))).map(x=>{
                const targets=employees.filter(e=>x.targetEmpIds.includes(e.id));
                return(
                  <div key={x.id} style={{marginBottom:24}}>
                    <div style={{fontWeight:700,color:"#4A3020",fontSize:14,marginBottom:4}}><span style={S.extBadge}>外部</span> {x.title}</div>
                    <div style={{fontSize:12,color:"#6b7280",marginBottom:10}}>📅 {x.date} ｜ 🏢 {x.organizer} ｜ 📍 {x.location}</div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr style={{background:"#C89A55",color:"#fff"}}><th style={S.th}>従業員</th><th style={S.th}>受講</th><th style={S.th}>復命書</th><th style={S.th}>管理者確認</th></tr></thead>
                      <tbody>{targets.map((emp,i)=>{const s=getXS(emp.id,x.id);return(
                        <tr key={emp.id} style={{background:i%2===0?"#fff":"#FDF6EC"}}>
                          <td style={S.td}>{emp.name}</td>
                          <td style={S.td}>{s.attended?"✅":"○"}</td>
                          <td style={S.td}>{s.reportSubmitted?"📄":"─"}</td>
                          <td style={S.td}>{s.reportConfirmed?<span style={{color:"#15803d",fontWeight:600}}>✅確認済</span>
                            :s.reportSubmitted?<button style={{...S.qrBtn,fontSize:11,borderColor:"#C89A55",color:"#A07840",background:"#FDF6EC"}} onClick={()=>setXS(emp.id,x.id,{reportConfirmed:true})}>確認済にする</button>
                            :<span style={{color:"#9ca3af"}}>─</span>}</td>
                        </tr>
                      );})}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
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
  const bc=dc===3?"#16a34a":dc===0?"#e5e7eb":"#C89A55";
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

function InternalCard({training,status,onReport,onVideo,onWatchVideo,readonly}){
  const [open,setOpen]=useState(false);
  const attended=status.attendance==="参加済"; const absentFix=status.attendance==="未参加（確定）"; const showVideo=!attended;
  return(
    <div style={S.card}>
      <div style={S.cardHead} onClick={()=>setOpen(!open)}>
        <div style={{flex:1}}>
          {training.required&&<span style={S.reqBadge}>必須</span>}
          {readonly&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,display:"inline-block",background:"#f3f4f6",color:"#6b7280",marginLeft:4}}>閲覧のみ</span>}
          <div style={S.cardTitle}>{training.title}</div>
          <div style={S.cardDate}>📅 {training.date}</div>
        </div>
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
            {showVideo&&!readonly&&(
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
            {readonly?<SPill color={status.report==="提出済"?"#2563eb":"#9ca3af"} bg={status.report==="提出済"?"#dbeafe":"#f9fafb"} border={status.report==="提出済"?"#bfdbfe":"#e5e7eb"}>{status.report==="提出済"?"✅ 提出済":"未提出"}</SPill>
              :<div style={{display:"flex",gap:8}}>{["提出済","未提出"].map(v=><ToggleChip key={v} label={v} active={status.report===v} color={v==="提出済"?"#2563eb":"#C89A55"} onClick={()=>onReport(v)}/>)}</div>}
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

function ExternalCard({ext,status,onAttend,onReport,onViewPdf,readonly}){
  const [open,setOpen]=useState(false);
  const {attended,reportSubmitted,reportConfirmed}=status;
  return(
    <div style={S.card}>
      <div style={S.cardHead} onClick={()=>setOpen(!open)}>
        <div style={{flex:1}}>
          <span style={S.extBadge}>外部</span>
          {readonly&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,display:"inline-block",background:"#f3f4f6",color:"#6b7280",marginLeft:4}}>閲覧のみ</span>}
          <div style={S.cardTitle}>{ext.title}</div>
          <div style={S.cardDate}>📅 {ext.date} ｜ 🏢 {ext.organizer} ｜ 📍 {ext.location}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}><ExternalProgress status={status}/><span style={{color:"#d1d5db",fontSize:14}}>{open?"▲":"▼"}</span></div>
      </div>
      {open&&(
        <div style={S.cardBody}>
          {ext.pdfData?<button style={{...S.watchBtn,background:"#dc2626",marginBottom:12}} onClick={e=>{e.stopPropagation();onViewPdf();}}>📄 研修要綱PDFを見る</button>
            :<div style={{padding:"8px 12px",background:"#f9fafb",borderRadius:8,fontSize:12,color:"#9ca3af",marginBottom:12}}>📄 研修要綱PDFは未添付です</div>}
          <div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>1</span> 受講状況</div>
            {attended?<SPill color="#16a34a" bg="#f0fdf4" border="#86efac">✅ 受講済</SPill>
              :readonly?<SPill color="#9ca3af" bg="#f9fafb" border="#e5e7eb">未受講</SPill>
              :<button style={S.actionBtn} onClick={onAttend}>受講済にする</button>}
          </div>
          {attended&&<div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>2</span> 復命書</div>
            {reportConfirmed?<SPill color="#15803d" bg="#f0fdf4" border="#86efac">✅ 提出済（管理者確認済）</SPill>
              :reportSubmitted?<SPill color="#92400e" bg="#fffbeb" border="#fcd34d">⏳ 提出済 ─ 管理者確認待ち</SPill>
              :readonly?<SPill color="#9ca3af" bg="#f9fafb" border="#e5e7eb">未提出</SPill>
              :<button style={{...S.actionBtn,background:"#2563eb"}} onClick={onReport}>復命書を提出する</button>}
          </div>}
        </div>
      )}
    </div>
  );
}

function VideoTab({trainings,selected,onSelect,onMarkWatched,getStatus,readonly}){
  const cur=selected||trainings[0]; const s=cur?getStatus(cur):null;
  return(
    <div>
      {(!trainings||trainings.length===0)&&<div style={S.empty}>この年度に動画付きの研修はありません</div>}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:12}}>
        {(trainings||[]).map(t=>{const st=getStatus(t);const active=cur?.id===t.id;return(
          <button key={t.id} onClick={()=>onSelect(t)} style={{minWidth:130,padding:"8px 12px",borderRadius:10,border:"1.5px solid",borderColor:active?"#C89A55":"#e5e7eb",background:active?"#C89A55":"#fff",color:active?"#fff":"#374151",fontSize:12,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontWeight:600,marginBottom:3}}>{t.title}</div>
            <div>{st.video==="視聴済"?"✅ 視聴済":"○ 未視聴"}</div>
          </button>);
        })}
      </div>
      {cur?.videoUrl&&<>
        <div style={{fontWeight:700,color:"#4A3020",marginBottom:8}}>{cur.title}</div>
        <div style={{position:"relative",paddingBottom:"56.25%",borderRadius:12,overflow:"hidden",background:"#000"}}>
          <iframe style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}} src={cur.videoUrl} allowFullScreen title={cur.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
        </div>
        <div style={{marginTop:12}}>
          {s?.video==="視聴済"
            ?<div style={{padding:"10px 14px",background:"#f0fdf4",borderRadius:10,color:"#15803d",fontSize:13,fontWeight:600,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              ✅ 視聴済み
              {!readonly&&<button onClick={()=>onMarkWatched(cur,"未視聴")} style={{fontSize:11,color:"#6b7280",background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>未視聴に戻す</button>}
            </div>
            :readonly?<div style={{padding:"10px 14px",background:"#f9fafb",borderRadius:10,color:"#9ca3af",fontSize:13,textAlign:"center"}}>○ 未視聴</div>
            :<button onClick={()=>onMarkWatched(cur,"視聴済")} style={{width:"100%",padding:"12px",background:"#16a34a",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>
              ✅ 視聴完了！　視聴済みにする
            </button>}
        </div>
      </>}
    </div>
  );
}

function SPill({color,bg,border,children}){return <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:bg,color,fontSize:13,fontWeight:600,border:`1.5px solid ${border}`}}>{children}</div>;}
function ToggleChip({label,active,color,onClick}){return <button onClick={onClick} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",borderColor:active?color:"#e5e7eb",background:active?color:"#fff",color:active?"#fff":"#6b7280",fontSize:12,fontWeight:active?700:400,cursor:"pointer"}}>{label}</button>;}

function PdfModal({ext,onClose}){
  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal,maxWidth:700,width:"95vw",height:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><div style={{fontWeight:800,fontSize:16,color:"#4A3020"}}>📄 研修要綱</div><div style={{fontSize:13,color:"#6b7280"}}>{ext.title}</div></div>
          <button style={S.logoutBtn} onClick={onClose}>✕ 閉じる</button>
        </div>
        <div style={{flex:1,borderRadius:10,overflow:"hidden",border:"1px solid #e5e7eb"}}>
          <iframe src={`data:application/pdf;base64,${ext.pdfData}`} style={{width:"100%",height:"100%",border:"none"}} title="PDF"/>
        </div>
      </div>
    </div>
  );
}

function AdminScreen({employees,setEmployees,internals,setInternals,externals,setExternals,deleteInternal,deleteExternal,getIS,setIS,getXS,setXS,fiscalYear,setFiscalYear,getCount,onLogout}){
  const [tab,setTab]=useState("ranking");
  const [qrT,setQrT]=useState(null);
  return(
    <div style={S.page}>
      {qrT&&<QRModal training={qrT} onClose={()=>setQrT(null)}/>}
      <div style={{...S.appWrap,maxWidth:960}}>
        <div style={S.header}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div><div style={S.headerName}>🛡 管理者ダッシュボード</div><div style={S.headerSub}>{ORG_NAME}</div></div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select value={fiscalYear} onChange={e=>setFiscalYear(Number(e.target.value))} style={{padding:"4px 8px",borderRadius:8,border:"1px solid #E8D5B0",fontSize:12,cursor:"pointer",background:"#fff"}}>
              {[currentFY()-1,currentFY(),currentFY()+1].map(y=><option key={y} value={y}>{y}年度</option>)}
            </select>
            <button style={{...S.logoutBtn,background:"#C89A55",color:"#fff",borderColor:"#C89A55"}} onClick={()=>window.print()}>🖨 印刷</button>
            <button style={S.logoutBtn} onClick={onLogout}>ログアウト</button>
          </div>
        </div>
        <div style={{...S.tabBar,overflowX:"auto"}}>
          {[["ranking","🏅 ランキング"],["iProgress","📊 内部"],["iManage","📚 内部管理"],["xProgress","🌐 外部"],["xManage","✏️ 外部管理"],["empManage","👥 職員管理"]].map(([k,l])=>(
            <button key={k} style={{...S.tab,...(tab===k?S.tabOn:{}),fontSize:11,padding:"10px 6px",whiteSpace:"nowrap"}} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{...S.scroll,maxHeight:"calc(100vh - 185px)"}}>
          {tab==="ranking"   &&<RankingTab employees={employees} fiscalYear={fiscalYear} getCount={getCount}/>}
          {tab==="iProgress" &&<InternalProgressTab employees={employees} internals={internals} getIS={getIS} setIS={setIS} onQR={setQrT} fiscalYear={fiscalYear}/>}
          {tab==="iManage"   &&<InternalManageTab internals={internals} setInternals={setInternals} deleteInternal={deleteInternal}/>}
          {tab==="xProgress" &&<ExternalProgressTab employees={employees} externals={externals} getXS={getXS} setXS={setXS} fiscalYear={fiscalYear}/>}
          {tab==="xManage"   &&<ExternalManageTab employees={employees} externals={externals} setExternals={setExternals} deleteExternal={deleteExternal}/>}
          {tab==="empManage" &&<EmployeeManageTab employees={employees} setEmployees={setEmployees} internals={internals} getIS={getIS} getXS={getXS} externals={externals} fiscalYear={fiscalYear}/>}
       </div>
      <div style={{textAlign:"center",padding:"10px 0 8px",borderTop:"1px solid #F0D9B0",background:"#fff"}}>
        <img src={LOGO_B64} alt="ロゴ" style={{height:32,objectFit:"contain",opacity:0.7}}/>
      </div>
      </div>
    </div>
  );
}

function EmployeeManageTab({employees,setEmployees,internals,getIS,getXS,externals,fiscalYear}){
  const [showAdd,setShowAdd]=useState(false);
  const [editEmp,setEditEmp]=useState(null);
  const [newE,setNewE]=useState({id:"",password:"",name:"",dept:"",joinDate:"",qualifications:"",certTrainings:"",isManager:false});
  const [importMsg,setImportMsg]=useState("");

  const saveEmp=async(emp)=>{
    const e={
      id:emp.id.trim(),password:emp.password.trim(),name:emp.name.trim(),dept:emp.dept.trim(),
      joinDate:emp.joinDate||"",
      qualifications:(emp.qualifications||"").split(",").map(s=>s.trim()).filter(Boolean),
      certTrainings:(emp.certTrainings||"").split(",").map(s=>s.trim()).filter(Boolean),
      isManager:emp.isManager||false,
    };
    if(!e.id||!e.password||!e.name||!e.dept)return;
    await db.upsertEmployee(e);
    setEmployees(p=>{const idx=p.findIndex(x=>x.id===e.id);return idx>=0?p.map(x=>x.id===e.id?e:x):[...p,e];});
    setShowAdd(false); setEditEmp(null);
    setNewE({id:"",password:"",name:"",dept:"",joinDate:"",qualifications:"",certTrainings:"",isManager:false});
  };

  const delEmp=async(id)=>{
    if(!window.confirm(`${id}を削除しますか？`))return;
    await db.deleteEmployee(id);
    setEmployees(p=>p.filter(e=>e.id!==id));
  };

  const handleCSV=e=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=async ev=>{
      const text=ev.target.result;
      const lines=text.split("\n").filter(l=>l.trim());
      let count=0;
      for(const line of lines.slice(1)){
        const cols=line.split(",").map(s=>s.replace(/^"|"$/g,"").trim());
        if(cols.length<4||!cols[0])continue;
        const emp={
          id:cols[0],password:cols[1]||"pass001",name:cols[2],dept:cols[3],
          joinDate:cols[4]||"",
          qualifications:cols[5]?cols[5].split("|").map(s=>s.trim()).filter(Boolean):[],
          certTrainings:cols[6]?cols[6].split("|").map(s=>s.trim()).filter(Boolean):[],
          isManager:cols[7]==="1"||cols[7]==="true",
        };
        await db.upsertEmployee(emp);
        setEmployees(p=>{const idx=p.findIndex(x=>x.id===emp.id);return idx>=0?p.map(x=>x.id===emp.id?emp:x):[...p,emp];});
        count++;
      }
      setImportMsg(`✅ ${count}名のデータを取り込みました`);
      setTimeout(()=>setImportMsg(""),4000);
    };
    reader.readAsText(file,"UTF-8");
    e.target.value="";
  };

  const downloadCSV=()=>{
    const header="職員ID,パスワード,氏名,部署,入社年月日,保有資格,受講済み認定研修,部署長(1=YES)\n";
    const rows=employees.map(e=>`${e.id},${e.password},${e.name},${e.dept},${e.joinDate||""},${(e.qualifications||[]).join("|")},${(e.certTrainings||[]).join("|")},${e.isManager?1:0}`).join("\n");
    const blob=new Blob(["\uFEFF"+header+rows],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="職員名簿.csv";a.click();
    URL.revokeObjectURL(url);
  };

  const exportHTML=()=>{
    const today=new Date().toLocaleDateString("ja-JP");
    const depts=[...new Set(employees.map(e=>e.dept))];
    let html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${ORG_NAME} 職員研修履歴</title>
    <style>body{font-family:'游ゴシック',sans-serif;margin:0;padding:20px;color:#222;}
    h1{background:#C89A55;color:#fff;padding:12px 20px;margin:0 0 4px;font-size:18px;}
    h2{background:#A07840;color:#fff;padding:8px 16px;margin:20px 0 0;font-size:14px;}
    .sub{background:#FDF6EC;padding:4px 16px;font-size:11px;color:#A07840;margin-bottom:12px;}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:24px;}
    th{background:#C89A55;color:#fff;padding:8px 10px;text-align:left;font-weight:600;}
    td{padding:6px 10px;border-bottom:1px solid #E8D5B0;}
    tr:nth-child(even) td{background:#FDF6EC;}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;margin:1px;}
    .q{background:#dbeafe;color:#1e40af;}.c{background:#ede9fe;color:#7c3aed;}.t{background:#dcfce7;color:#15803d;}
    @media print{h2{page-break-before:always;}}</style></head><body>
    <h1>${ORG_NAME}　職員研修履歴　${fiscalYear}年度</h1>
    <div class="sub">出力日：${today}　　対象人数：${employees.length}名</div>`;

    const makeTable=(emps,title)=>{
      const rows=emps.map((emp,i)=>{
        const yrs=calcYears(emp.joinDate);
        const iT=internals.filter(t=>inFiscalYear(t.date,fiscalYear)&&getIS(emp.id,t.id).attendance==="参加済");
        const xT=externals.filter(x=>inFiscalYear(x.date,fiscalYear)&&x.targetEmpIds.includes(emp.id)&&getXS(emp.id,x.id).attended);
        const all=[...iT.map(t=>t.title),...xT.map(x=>x.title)];
        return `<tr><td>${i+1}</td><td>${emp.id}</td><td><strong>${emp.name}</strong>${emp.isManager?' <span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:10px;">部署長</span>':''}</td><td>${emp.dept}</td><td>${yrs||"─"}</td>
        <td>${(emp.qualifications||[]).map(q=>`<span class="badge q">${q}</span>`).join("")||"─"}</td>
        <td>${(emp.certTrainings||[]).map(c=>`<span class="badge c">${c}</span>`).join("")||"─"}</td>
        <td>${all.map(t=>`<span class="badge t">${t}</span>`).join("")||"─"}</td></tr>`;
      }).join("");
      return `<h2>${title}（${emps.length}名）</h2>
      <table><thead><tr><th>No.</th><th>ID</th><th>氏名</th><th>部署</th><th>勤続年数</th><th>保有資格</th><th>認定研修</th><th>参加済み研修（${fiscalYear}年度）</th></tr></thead><tbody>${rows}</tbody></table>`;
    };

    html+=makeTable(employees,"全員一覧");
    depts.forEach(dept=>{ html+=makeTable(employees.filter(e=>e.dept===dept),dept); });
    html+="</body></html>";
    const blob=new Blob([html],{type:"text/html;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`職員研修履歴_${fiscalYear}年度.html`;a.click();
    URL.revokeObjectURL(url);
  };

  const EmpForm=({data,onChange,onSave,onCancel,isEdit})=>(
    <div style={S.formBox}>
      <div style={{fontWeight:700,color:"#A07840",marginBottom:12}}>{isEdit?"職員情報を編集":"新しい職員を追加"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        {[{key:"id",label:"職員ID",ph:"E001"},{key:"password",label:"パスワード",ph:"pass001"},{key:"name",label:"氏名",ph:"山田 太郎"},{key:"dept",label:"部署",ph:"総務部"},{key:"joinDate",label:"入社年月日",type:"date"},{key:"qualifications",label:"保有資格（カンマ区切り）",ph:"社会福祉士,介護福祉士"}].map(f=>(
          <div key={f.key}>
            <label style={S.label}>{f.label}</label>
            <input type={f.type||"text"} style={S.input} placeholder={f.ph||""} value={data[f.key]||""}
              disabled={isEdit&&f.key==="id"}
              onChange={e=>onChange({...data,[f.key]:e.target.value})}/>
          </div>
        ))}
      </div>
      <div style={{marginBottom:10}}>
        <label style={S.label}>受講済み認定研修（カンマ区切り）</label>
        <input style={S.input} placeholder="認知症ケア専門士,実務者研修修了" value={data.certTrainings||""} onChange={e=>onChange({...data,certTrainings:e.target.value})}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{...S.label,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <input type="checkbox" checked={data.isManager||false} onChange={e=>onChange({...data,isManager:e.target.checked})} style={{width:16,height:16,accentColor:"#C89A55"}}/>
          🏢 この職員を部署長にする（自部署の進捗確認・復命書確認が可能）
        </label>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={{...S.btn,flex:1}} onClick={()=>onSave(data)}>保存する</button>
        <button style={{...S.btn,flex:1,background:"#6b7280"}} onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );

  return(
    <div style={{padding:4}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        <button style={{...S.btn,width:"auto",padding:"8px 16px"}} onClick={()=>setShowAdd(true)}>＋ 職員を追加</button>
        <label style={{...S.btn,width:"auto",padding:"8px 16px",cursor:"pointer",background:"#059669"}}>
          <input type="file" accept=".csv" style={{display:"none"}} onChange={handleCSV}/>📥 CSVインポート
        </label>
        <button style={{...S.btn,width:"auto",padding:"8px 16px",background:"#d97706"}} onClick={downloadCSV}>📤 CSV出力</button>
        <button style={{...S.btn,width:"auto",padding:"8px 16px",background:"#7c3aed"}} onClick={exportHTML}>📊 研修履歴出力</button>
      </div>
      {importMsg&&<div style={{padding:"8px 14px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,color:"#15803d",marginBottom:12,fontSize:13}}>{importMsg}</div>}
      {showAdd&&<EmpForm data={newE} onChange={setNewE} onSave={saveEmp} onCancel={()=>setShowAdd(false)} isEdit={false}/>}
      {editEmp&&<EmpForm data={editEmp} onChange={d=>setEditEmp(d)} onSave={saveEmp} onCancel={()=>setEditEmp(null)} isEdit={true}/>}
      <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>登録済み職員：{employees.length}名　（うち部署長：{employees.filter(e=>e.isManager).length}名）</div>
      {employees.length===0&&<div style={S.empty}>職員が登録されていません。CSVインポートまたは手動で追加してください。</div>}
      {[...new Set(employees.map(e=>e.dept))].map(dept=>(
        <div key={dept} style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#4A3020",padding:"6px 12px",background:"#FDF6EC",borderRadius:8,marginBottom:6,border:"1px solid #E8D5B0"}}>
            🏢 {dept}（{employees.filter(e=>e.dept===dept).length}名）
          </div>
          {employees.filter(e=>e.dept===dept).map(emp=>(
            <div key={emp.id} style={{...S.card,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:700,color:"#4A3020"}}>{emp.name}</span>
                  {emp.isManager&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#fef3c7",color:"#92400e"}}>🏢 部署長</span>}
                  <span style={{fontSize:11,color:"#6b7280"}}>{emp.id} / {emp.password}</span>
                </div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>
                  {emp.joinDate&&`入社:${emp.joinDate}　`}
                  {(emp.qualifications||[]).length>0&&`資格:${emp.qualifications.join("・")}`}
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={S.qrBtn} onClick={()=>setEditEmp({...emp,qualifications:(emp.qualifications||[]).join(","),certTrainings:(emp.certTrainings||[]).join(",")})}>編集</button>
                <button style={S.delBtn} onClick={()=>delEmp(emp.id)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function RankingTab({employees,fiscalYear,getCount}){
  const ranked=[...employees].map(e=>({...e,count:getCount(e.id,fiscalYear),points:calcPoints(getCount(e.id,fiscalYear))})).sort((a,b)=>b.count-a.count);
  const maxCount=Math.max(...ranked.map(r=>r.count),1);
  const avg=ranked.length>0?(ranked.reduce((s,r)=>s+r.count,0)/ranked.length).toFixed(1):"0";
  const reach5=ranked.filter(r=>r.count>=5).length; const reach10=ranked.filter(r=>r.count>=10).length;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
        {[{label:"全体平均",value:`${avg}件`,color:"#C89A55",sub:"提出/人"},{label:"平均加点",value:`+${ranked.length>0?(ranked.reduce((s,r)=>s+r.points,0)/ranked.length).toFixed(1):0}点`,color:"#7c3aed",sub:"人事考課"},{label:"+1点以上",value:`${reach5}名`,color:"#d97706",sub:"5件達成"},{label:"+2点達成",value:`${reach10}名`,color:"#16a34a",sub:"10件達成"}]
          .map(c=><div key={c.label} style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:12,padding:"12px 10px",textAlign:"center"}}><div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>{c.label}</div><div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.value}</div><div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{c.sub}</div></div>)}
      </div>
      <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,overflow:"hidden"}}>
        <div style={{background:"#C89A55",color:"#fff",padding:"12px 16px",fontWeight:700,fontSize:14}}>🏅 {fiscalYear}年度 復命書提出ランキング</div>
        {ranked.map((emp,i)=>{const rank=i+1;const rs=rankStyle(rank);const badge=getBadge(emp.count);const bc=emp.count>=10?"#7c3aed":emp.count>=5?"#d97706":"#C89A55";
          return(
            <div key={emp.id} style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",background:rank===1?"#fffbeb":rank<=3?"#fdf6ec":"#fff"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{minWidth:32,textAlign:"center",fontSize:rank<=3?20:14,fontWeight:800,color:rs.color}}>{rs.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:700,fontSize:14,color:"#4A3020"}}>{emp.name}</span><span style={{fontSize:11,color:"#6b7280"}}>{emp.dept}</span>{badge&&<span style={{fontSize:16}}>{badge.icon}</span>}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
                    <div style={{flex:1,height:8,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(emp.count/maxCount)*100}%`,background:bc,borderRadius:4}}/>
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
    </div>
  );
}

function InternalProgressTab({employees,internals,getIS,setIS,onQR,fiscalYear}){
  const fyInternals=internals.filter(t=>inFiscalYear(t.date,fiscalYear));
  return(
    <div>
      <div style={{display:"flex",gap:10,overflowX:"auto",padding:"12px 0 16px"}}>
        {fyInternals.map(t=>{
          const n=employees.length;
          const s1=employees.filter(e=>{const s=getIS(e.id,t.id);return s.attendance==="参加済"||s.video==="視聴済";}).length;
          const s2=employees.filter(e=>getIS(e.id,t.id).report==="提出済").length;
          const s3=employees.filter(e=>getIS(e.id,t.id).reportConfirmed===true).length;
          return(
            <div key={t.id} style={S.sCard}>
              {t.required&&<span style={S.reqBadge}>必須</span>}
              <div style={{fontSize:11,fontWeight:700,color:"#4A3020",margin:"4px 0 6px",lineHeight:1.3}}>{t.title}</div>
              <MiniBar label="参加/動画" v={s1} n={n} color="#16a34a"/>
              <MiniBar label="復命書" v={s2} n={n} color="#C89A55"/>
              <MiniBar label="確認済" v={s3} n={n} color="#7c3aed"/>
              <button style={{...S.qrBtn,marginTop:8,width:"100%"}} onClick={()=>onQR(t)}>QR生成</button>
            </div>
          );
        })}
      </div>
      {fyInternals.length===0&&<div style={S.empty}>{fiscalYear}年度の内部研修はありません</div>}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#C89A55",color:"#fff"}}>
            <th style={S.th}>従業員</th><th style={S.th}>部署</th>
            {fyInternals.map(t=><th key={t.id} style={{...S.th,minWidth:140}}>{t.required?"【必】":""}{t.title}</th>)}
          </tr></thead>
          <tbody>{employees.map((emp,i)=>(
            <tr key={emp.id} style={{background:i%2===0?"#fff":"#FDF6EC"}}>
              <td style={S.td}>{emp.name}</td><td style={S.td}>{emp.dept}</td>
              {fyInternals.map(t=>{
                const s=getIS(emp.id,t.id); const [d1,d2,d3]=internalStepsDone(s);
                const done=[d1,d2,d3].filter(Boolean).length; const bc=done===3?"#16a34a":done===0?"#e5e7eb":"#C89A55";
                return(
                  <td key={t.id} style={{...S.td,minWidth:140}}>
                    <div style={{height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${Math.round(done/3*100)}%`,background:bc,borderRadius:2}}/></div>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      {[["参/動",d1,"#16a34a"],["復命書",d2,"#2563eb"],["確認",d3,"#7c3aed"]].map(([l,ok,c])=>(
                        <span key={l} style={{fontSize:9,padding:"1px 4px",borderRadius:4,background:ok?c:"#f3f4f6",color:ok?"#fff":"#9ca3af",fontWeight:ok?700:400}}>{l}</span>
                      ))}
                      {d2&&!d3&&<button style={{fontSize:9,padding:"2px 6px",borderRadius:4,border:"1px solid #C89A55",background:"#FDF6EC",color:"#A07840",cursor:"pointer",marginLeft:2,fontWeight:600}} onClick={()=>setIS(emp.id,t.id,"reportConfirmed",true)}>確認✓</button>}
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
          <div style={{fontWeight:700,color:"#A07840",marginBottom:12}}>新しい内部研修を登録</div>
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

function ExternalProgressTab({employees,externals,getXS,setXS,fiscalYear}){
  const fyExternals=externals.filter(x=>inFiscalYear(x.date,fiscalYear));
  return(
    <div>
      {fyExternals.length===0&&<div style={S.empty}>{fiscalYear}年度の外部研修はありません</div>}
      {fyExternals.map(x=>{const targets=employees.filter(e=>x.targetEmpIds.includes(e.id));return(
        <div key={x.id} style={{marginBottom:24}}>
          <div style={{fontWeight:700,color:"#4A3020",fontSize:14,marginBottom:4}}><span style={S.extBadge}>外部</span> {x.title}</div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:10}}>📅 {x.date} ｜ 🏢 {x.organizer} ｜ 📍 {x.location}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#C89A55",color:"#fff"}}><th style={S.th}>従業員</th><th style={S.th}>部署</th><th style={S.th}>進捗</th><th style={S.th}>受講</th><th style={S.th}>復命書</th><th style={S.th}>管理者確認</th></tr></thead>
            <tbody>{targets.map((emp,i)=>{const s=getXS(emp.id,x.id);return(
              <tr key={emp.id} style={{background:i%2===0?"#fff":"#FDF6EC"}}>
                <td style={S.td}>{emp.name}</td><td style={S.td}>{emp.dept}</td>
                <td style={{...S.td,minWidth:140}}><ExternalProgress status={s}/></td>
                <td style={S.td}>{s.attended?"✅":"○"}</td>
                <td style={S.td}>{s.reportSubmitted?"📄":"─"}</td>
                <td style={S.td}>{s.reportConfirmed?<span style={{color:"#15803d",fontWeight:600}}>✅確認済</span>
                  :s.reportSubmitted?<button style={{...S.qrBtn,fontSize:11,borderColor:"#C89A55",color:"#A07840",background:"#FDF6EC"}} onClick={()=>setXS(emp.id,x.id,{reportConfirmed:true})}>確認済にする</button>
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
          <div style={{fontWeight:700,color:"#A07840",marginBottom:12}}>外部研修を登録</div>
          {[{key:"title",label:"研修名",placeholder:"例：DXセミナー"},{key:"date",label:"実施日",type:"date"},{key:"organizer",label:"主催団体",placeholder:"例：総務省"},{key:"location",label:"場所",placeholder:"例：東京"}]
            .map(f=><div key={f.key} style={{marginBottom:10}}><label style={S.label}>{f.label}</label><input type={f.type||"text"} style={S.input} placeholder={f.placeholder||""} value={newX[f.key]} onChange={e=>setNewX(p=>({...p,[f.key]:e.target.value}))}/></div>)}
          <div style={{marginBottom:14}}>
            <label style={S.label}>研修要綱PDF（任意）</label>
            <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1.5px dashed #E8D5B0",background:"#FDF6EC",cursor:"pointer"}}>
              <input type="file" accept="application/pdf" style={{display:"none"}} onChange={handlePdf}/>
              <span style={{fontSize:20}}>📄</span>
              <div><div style={{fontSize:13,fontWeight:600,color:"#A07840"}}>{newX.pdfName?"✅ "+newX.pdfName:"クリックしてPDFをアップロード"}</div></div>
            </label>
          </div>
          <div style={{marginBottom:14}}>
            <label style={S.label}>対象者を選択</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {employees.map(e=>(
                <label key={e.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,cursor:"pointer",padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:newX.targetEmpIds.includes(e.id)?"#C89A55":"#e5e7eb",background:newX.targetEmpIds.includes(e.id)?"#FDF6EC":"#fff",color:newX.targetEmpIds.includes(e.id)?"#A07840":"#374151"}}>
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
                {x.pdfData?<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:"#15803d",fontWeight:600}}>📄 {x.pdfName}</span>
                  <label style={{fontSize:11,color:"#A07840",cursor:"pointer",textDecoration:"underline"}}><input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>handleExistPdf(x.id,e)}/>差し替え</label></div>
                :<label style={{fontSize:12,color:"#A07840",cursor:"pointer",textDecoration:"underline"}}><input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>handleExistPdf(x.id,e)}/>📄 PDFをアップロード</label>}
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
        <div style={{fontWeight:800,fontSize:17,color:"#4A3020",marginBottom:4}}>QRコード</div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>{training.title}</div>
        <div id="qr-canvas-area" style={{display:"flex",justifyContent:"center",marginBottom:12}}/>
        <div style={{background:"#FDF6EC",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#A07840",wordBreak:"break-all",marginBottom:12}}>{url}</div>
        <div style={{display:"flex",gap:8}}>
          <button style={{...S.btn,flex:1}} onClick={()=>navigator.clipboard?.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);})}>{copied?"✅ コピー済":"URLをコピー"}</button>
          <button style={{...S.btn,flex:1,background:"#059669"}} onClick={()=>window.print()}>🖨 印刷</button>
        </div>
        <div style={{marginTop:12,padding:"8px 12px",background:"#FDF6EC",borderRadius:8,fontSize:12,color:"#A07840"}}>💡 研修会場に掲示してください。</div>
        <button style={{width:"100%",marginTop:12,padding:"10px",background:"#f3f4f6",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600}} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

const S={
  page:{minHeight:"100vh",background:"linear-gradient(135deg,#F5EDD8 0%,#FDF6EC 60%,#F5EDD8 100%)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 8px",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif"},
  appWrap:{width:"100%",maxWidth:700,background:"#fff",borderRadius:20,boxShadow:"0 24px 60px rgba(200,154,85,.2)",overflow:"hidden",border:"1px solid #E8D5B0"},
  header:{background:"#C89A55",color:"#fff",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  headerName:{fontSize:16,fontWeight:700,color:"#fff"},
  headerSub:{fontSize:11,color:"rgba(255,255,255,.8)",marginTop:2},
  logoutBtn:{padding:"5px 12px",borderRadius:8,border:"1px solid #E8D5B0",background:"#fff",color:"#4A3020",cursor:"pointer",fontSize:12,fontWeight:600},
  tabBar:{display:"flex",borderBottom:"1px solid #E8D5B0"},
  tab:{flex:1,padding:"11px 4px",border:"none",background:"transparent",fontSize:13,fontWeight:600,color:"#A07840",cursor:"pointer"},
  tabOn:{color:"#C89A55",borderBottom:"2.5px solid #C89A55"},
  scroll:{padding:14,overflowY:"auto",maxHeight:"calc(100vh - 200px)"},
  card:{border:"1px solid #E8D5B0",borderRadius:12,marginBottom:10,overflow:"hidden"},
  cardHead:{padding:"11px 14px",display:"flex",alignItems:"flex-start",cursor:"pointer",gap:8},
  cardTitle:{fontWeight:700,color:"#4A3020",fontSize:14,marginTop:4},
  cardDate:{fontSize:11,color:"#6b7280",marginTop:2},
  cardBody:{padding:"0 14px 14px",borderTop:"1px solid #F0D9B0"},
  sBlock:{marginBottom:14},
  sLabel:{fontSize:12,fontWeight:600,color:"#374151",marginBottom:6,display:"flex",alignItems:"center",gap:6},
  stepNum:{display:"inline-flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:"50%",background:"#C89A55",color:"#fff",fontSize:10,fontWeight:700,flexShrink:0},
  watchBtn:{width:"100%",padding:"10px",background:"#C89A55",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"},
  actionBtn:{padding:"8px 20px",background:"#16a34a",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"},
  reqBadge:{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,display:"inline-block",background:"#fef2f2",color:"#dc2626"},
  extBadge:{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,display:"inline-block",background:"#fef9c3",color:"#854d0e"},
  sCard:{minWidth:150,background:"#FDF6EC",borderRadius:12,padding:"12px 14px",border:"1px solid #E8D5B0",flexShrink:0},
  qrBtn:{padding:"5px 12px",borderRadius:8,border:"1px solid #E8D5B0",background:"#FDF6EC",color:"#A07840",cursor:"pointer",fontSize:12,fontWeight:600},
  delBtn:{padding:"6px 12px",borderRadius:8,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontSize:12},
  th:{padding:"10px 12px",textAlign:"left",fontWeight:600,fontSize:12,whiteSpace:"nowrap"},
  td:{padding:"8px 12px",borderBottom:"1px solid #f3f4f6",verticalAlign:"middle",fontSize:12},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16},
  modal:{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,.4)"},
  toast:{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#C89A55",color:"#fff",padding:"10px 20px",borderRadius:20,fontSize:13,fontWeight:600,zIndex:2000,boxShadow:"0 4px 20px rgba(200,154,85,.4)"},
  empty:{textAlign:"center",color:"#9ca3af",fontSize:14,padding:"40px 0"},
  formBox:{background:"#FDF6EC",border:"1px solid #E8D5B0",borderRadius:12,padding:16,marginBottom:16},
  profileSection:{marginBottom:16,paddingBottom:14,borderBottom:"1px solid #F0D9B0"},
  profileLabel:{fontSize:11,fontWeight:700,color:"#A07840",marginBottom:6},
  profileValue:{fontSize:15,fontWeight:600,color:"#4A3020"},
  qBadge:{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:"#FDF6EC",color:"#A07840",border:"1px solid #E8D5B0"},
  btn:{width:"100%",padding:"11px",background:"#C89A55",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"},
  input:{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #E8D5B0",fontSize:14,outline:"none",boxSizing:"border-box"},
  label:{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5},
  fGroup:{marginBottom:14},
};

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nncousuugjntzovtmkvt.supabase.co",
  "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
);

const ADMIN = { id:"ADMIN", password:"admin123" };
const ORG_NAME = "社会福祉法人　ザ・ハート・クラブ";
const LOGO_B64 = "/title-_2_-removebg-preview.png";
const MANUAL_ENABLED = false; // trueにするとマニュアル管理が開放される

const INIT_COMMITTEES = [
  { id:"C001", name:"感染対策委員会",           description:"院内感染予防・対策の立案および実施",             chairEmpId:"", color:"#dc2626" },
  { id:"C002", name:"褥瘡対策委員会",           description:"褥瘡の予防・早期発見・治療方針の検討",           chairEmpId:"", color:"#7c3aed" },
  { id:"C003", name:"身体拘束廃止・虐待防止委員会", description:"身体拘束の適正化と虐待防止の取組み",        chairEmpId:"", color:"#0369a1" },
  { id:"C004", name:"事故防止委員会",           description:"ヒヤリハット・事故の分析と再発防止策の検討",     chairEmpId:"", color:"#d97706" },
  { id:"C005", name:"栄養委員会",               description:"利用者の栄養管理・食事提供の改善",               chairEmpId:"", color:"#16a34a" },
  { id:"C006", name:"研修委員会",               description:"職員研修計画の立案・実施・評価",                 chairEmpId:"", color:"#C89A55" },
  { id:"C007", name:"安全衛生委員会",           description:"職員の労働安全衛生・職場環境改善",               chairEmpId:"", color:"#0891b2" },
  { id:"C008", name:"BCP委員会",               description:"事業継続計画の策定・見直し・訓練の実施",          chairEmpId:"", color:"#6b7280" },
  { id:"C009", name:"倫理委員会",               description:"ケアの倫理的課題の検討と職員への啓発",           chairEmpId:"", color:"#9333ea" },
  { id:"C010", name:"ケアの質向上委員会",       description:"サービスの質評価・改善計画の立案",               chairEmpId:"", color:"#059669" },
];


const inFiscalYear = (dateStr,fy) => { if(!dateStr)return false; const d=new Date(dateStr),s=new Date(fy,3,1),e=new Date(fy+1,2,31,23,59,59); return d>=s&&d<=e; };
const currentFY = () => { const n=new Date(); return n.getMonth()>=3?n.getFullYear():n.getFullYear()-1; };
const calcPoints = c => c>=10?2:c>=5?1:0;
const BADGES = [
  {id:"b1",min:1, max:4, icon:"🌱",label:"5件まで",  color:"#6b7280",bg:"#f9fafb"},
  {id:"b2",min:5, max:9, icon:"⭐",label:"5件達成",  color:"#d97706",bg:"#fef3c7"},
  {id:"b3",min:10,max:14,icon:"🏆",label:"10件達成", color:"#7c3aed",bg:"#ede9fe"},
  {id:"b4",min:15,max:19,icon:"💎",label:"15件達成", color:"#0369a1",bg:"#e0f2fe"},
  {id:"b5",min:20,max:99,icon:"👑",label:"20件達成", color:"#b45309",bg:"#fef3c7"},
];
const getBadge = c => c===0?null:BADGES.find(b=>c>=b.min&&c<=b.max)||BADGES[BADGES.length-1];
const rankStyle = r => r===1?{icon:"🥇",color:"#d97706"}:r===2?{icon:"🥈",color:"#6b7280"}:r===3?{icon:"🥉",color:"#b45309"}:{icon:`${r}`,color:"#374151"};
const isPast = ds => { if(!ds)return false; const t=new Date();t.setHours(0,0,0,0);const d=new Date(ds);d.setHours(0,0,0,0);return t>d; };
const formatDate = ds => { if(!ds)return ""; const d=new Date(ds+"T00:00:00"); const w=["日","月","火","水","木","金","土"][d.getDay()]; return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}（${w}）`; };
const calcYears = jd => { if(!jd)return ""; const j=new Date(jd),n=new Date();let y=n.getFullYear()-j.getFullYear(),m=n.getMonth()-j.getMonth();if(m<0){y--;m+=12;}return `${y}年${m}ヶ月`; };
const makeAttendUrl = tid => `${window.location.href.split("?")[0]}?attend=${tid}`;
// セミナーの月別視聴用ユーティリティ（"2026-06" 形式）
const currentYM = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const ymLabel = ym => `${Number(ym.split("-")[1])}月`;
const fyMonths = fy => Array.from({length:12},(_,i)=>{ const m=(i+3)%12+1; const y=i<9?fy:fy+1; return {ym:`${y}-${String(m).padStart(2,"0")}`,label:`${m}月`}; });
const ymOf = d => d ? String(d).slice(0,7) : "";
// 内部研修の表示対象判定：指定なし＝用務を除く全職員、指定あり＝選択された職員のみ
const isTargetedFor = (t,e) => ((t.targetEmpIds||[]).length>0 ? t.targetEmpIds.includes(e.id) : (e.dept||"")!=="用務");
// 部署の表示順（この順に並べ、リストにない部署は後ろに付く）
const DEPT_ORDER = ["ホーム新館","ホーム3F","ホーム4F","医務","サムフォット","小規模サイタ","D/Sサイタ","相談室","居宅ポム","総務","用務"];
const sortDepts = ds => [...ds].sort((a,b)=>{ const ia=DEPT_ORDER.indexOf(a),ib=DEPT_ORDER.indexOf(b); return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b,"ja"); });

const db = {
  async getEmployees() {
    const {data} = await supabase.from("employees").select("*").order("sort_order").order("id");
    return (data||[]).map(r=>({id:r.id,password:r.password,name:r.name,dept:r.dept||"",joinDate:r.join_date||"",qualifications:r.qualifications||[],certTrainings:r.cert_trainings||[],isManager:r.is_manager||false,isActive:r.is_active!==false,managedDepts:r.managed_depts||[],roleTitle:r.role_title||"",retireDate:r.retire_date||"",jobCategory:r.job_category||"",lineUserId:r.line_user_id||""}));
  },
  async upsertEmployee(emp) {
    // 既存レコードのline_user_idを誤って消さないよう先に取得
    const {data:existing} = await supabase.from("employees").select("line_user_id").eq("id",emp.id).single();
    await supabase.from("employees").upsert({
      id:emp.id,password:emp.password,name:emp.name,dept:emp.dept||"",
      join_date:emp.joinDate||null,qualifications:emp.qualifications||[],
      cert_trainings:emp.certTrainings||[],is_manager:emp.isManager||false,
      is_active:emp.isActive!==false,managed_depts:emp.managedDepts||[],role_title:emp.roleTitle||"",retire_date:emp.retireDate||null,
      job_category:emp.jobCategory||"",
      line_user_id:existing?.line_user_id||null,
      updated_at:new Date().toISOString()
    },{onConflict:"id"});
  },
  async setEmployeeActive(id,isActive) {
    await supabase.from("employees").update({is_active:isActive,updated_at:new Date().toISOString()}).eq("id",id);
  },
  async deleteEmployee(id) { await supabase.from("employees").delete().eq("id",id); },
  async deleteAllEmployees() { await supabase.from("employees").delete().neq("id","__dummy__"); },
  async getIStatuses() {
    const {data} = await supabase.from("i_statuses").select("*");
    const map = {};
    (data||[]).forEach(r => { if(!map[r.emp_id])map[r.emp_id]={}; map[r.emp_id][r.training_id]={attendance:r.attendance,report:r.report,video:r.video,reportConfirmed:r.report_confirmed,attendedSession:r.attended_session||""}; });
    return map;
  },
  async setIStatus(empId,tid,fields) {
    await supabase.from("i_statuses").upsert({emp_id:empId,training_id:tid,attendance:fields.attendance,report:fields.report,video:fields.video,report_confirmed:fields.reportConfirmed,attended_session:fields.attendedSession||"",updated_at:new Date().toISOString()},{onConflict:"emp_id,training_id"});
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
    return (data||[]).map(r=>({id:r.id,title:r.title,date:r.date,date2:r.date2||"",required:r.required,requiredEmpIds:r.required_emp_ids||[],targetEmpIds:r.target_emp_ids||[],videoUrl:r.video_url,description:r.description,location:r.location||"",startTime:r.start_time||"",endTime:r.end_time||"",noReport:r.no_report===true}));
  },
  async upsertInternal(t) { await supabase.from("internals").upsert({id:t.id,title:t.title,date:t.date,date2:t.date2||"",required:t.required,required_emp_ids:t.requiredEmpIds||[],target_emp_ids:t.targetEmpIds||[],video_url:toEmbedUrl(t.videoUrl),description:t.description,location:t.location||"",start_time:t.startTime||"",end_time:t.endTime||"",no_report:t.noReport===true},{onConflict:"id"}); },
  async deleteInternal(id) { await supabase.from("internals").delete().eq("id",id); },
  async getExternals() {
    const {data} = await supabase.from("externals").select("*").order("date");
    if(!data||data.length===0)return [];
    const oneYearAgo=new Date(Date.now()-365*24*60*60*1000);
    for(const r of data){
      if(r.file_path && r.date && new Date(r.date)<oneYearAgo){
        await supabase.storage.from("training-files").remove([r.file_path]);
        await supabase.from("externals").update({file_url:null,file_path:null,pdf_name:null}).eq("id",r.id);
        r.file_url=null; r.file_path=null; r.pdf_name=null;
      }
    }
    return data.map(r=>({id:r.id,title:r.title,date:r.date,organizer:r.organizer,location:r.location,startTime:r.start_time||"",endTime:r.end_time||"",targetEmpIds:r.target_emp_ids||[],pdfUrl:r.file_url||null,pdfPath:r.file_path||null,pdfName:r.pdf_name,noticePdfUrl:r.notice_file_url||null,noticePdfPath:r.notice_file_path||null,noticePdfName:r.notice_file_name||null}));
  },
  async upsertExternal(x) { await supabase.from("externals").upsert({id:x.id,title:x.title,date:x.date,organizer:x.organizer,location:x.location,start_time:x.startTime||"",end_time:x.endTime||"",target_emp_ids:x.targetEmpIds,pdf_name:x.pdfName,file_url:x.pdfUrl,file_path:x.pdfPath,notice_file_url:x.noticePdfUrl||null,notice_file_path:x.noticePdfPath||null,notice_file_name:x.noticePdfName||null},{onConflict:"id"}); },
  async uploadExternalPdf(xId,file) {
    const MAX=20*1024*1024;
    if(file.size>MAX)throw new Error("20MBを超えるファイルはアップロードできません");
    const path=`${xId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._\-]/g,"_")}`;
    const {error:upErr} = await supabase.storage.from("training-files").upload(path,file,{upsert:true});
    if(upErr)throw upErr;
    const {data:{publicUrl}} = supabase.storage.from("training-files").getPublicUrl(path);
    await supabase.from("externals").update({file_url:publicUrl,file_path:path,pdf_name:file.name}).eq("id",xId);
    return {pdfUrl:publicUrl,pdfPath:path,pdfName:file.name};
  },
  async deleteExternalPdf(filePath) { await supabase.storage.from("training-files").remove([filePath]); },
  async uploadExternalNoticePdf(xId,file) {
    const MAX=20*1024*1024;
    if(file.size>MAX)throw new Error("20MBを超えるファイルはアップロードできません");
    const path=`notice_${xId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._\-]/g,"_")}`;
    const {error:upErr} = await supabase.storage.from("training-files").upload(path,file,{upsert:true});
    if(upErr)throw upErr;
    const {data:{publicUrl}} = supabase.storage.from("training-files").getPublicUrl(path);
    await supabase.from("externals").update({notice_file_url:publicUrl,notice_file_path:path,notice_file_name:file.name}).eq("id",xId);
    return {noticePdfUrl:publicUrl,noticePdfPath:path,noticePdfName:file.name};
  },
  async deleteExternal(id,filePath) {
    if(filePath) await supabase.storage.from("training-files").remove([filePath]);
    await supabase.from("externals").delete().eq("id",id);
  },
  async getManuals() {
    const {data} = await supabase.from("manuals").select("*").order("created_at",{ascending:false});
    return data||[];
  },
  async uploadManual(file,category,title) {
    const MAX=20*1024*1024;
    if(file.size>MAX)throw new Error("20MBを超えるファイルはアップロードできません");
    const safeName=file.name.replace(/[^a-zA-Z0-9._\-぀-ヿ一-鿿]/g,"_");
    const path=`${Date.now()}_${safeName}`;
    const {error:upErr} = await supabase.storage.from("manuals").upload(path,file);
    if(upErr)throw upErr;
    const {data:{publicUrl}} = supabase.storage.from("manuals").getPublicUrl(path);
    await supabase.from("manuals").insert({title,category,file_name:file.name,file_path:path,file_url:publicUrl,file_type:file.name.split(".").pop().toLowerCase()});
  },
  async deleteManual(id,filePath) {
    await supabase.storage.from("manuals").remove([filePath]);
    await supabase.from("manuals").delete().eq("id",id);
  },
  async getCommittees() {
    const {data} = await supabase.from("committees").select("*").order("id");
    if(!data||data.length===0){
      for(const c of INIT_COMMITTEES) await supabase.from("committees").upsert({id:c.id,name:c.name,description:c.description,chair_emp_id:c.chairEmpId,color:c.color},{onConflict:"id"});
      return INIT_COMMITTEES;
    }
    return data.map(r=>({id:r.id,name:r.name,description:r.description||"",chairEmpId:r.chair_emp_id||"",color:r.color||"#C89A55"}));
  },
  async upsertCommittee(c) {
    await supabase.from("committees").upsert({id:c.id,name:c.name,description:c.description||"",chair_emp_id:c.chairEmpId||"",color:c.color||"#C89A55",updated_at:new Date().toISOString()},{onConflict:"id"});
  },
  async deleteCommittee(id) {
    await supabase.from("committee_members").delete().eq("committee_id",id);
    await supabase.from("committee_meetings").delete().eq("committee_id",id);
    await supabase.from("committee_notices").delete().eq("committee_id",id);
    await supabase.from("committees").delete().eq("id",id);
  },
  async getCommitteeNotices() {
    const {data} = await supabase.from("committee_notices").select("*").order("created_at",{ascending:false});
    return (data||[]).map(r=>({id:r.id,committeeId:r.committee_id,title:r.title,body:r.body||"",postedBy:r.posted_by||"",isPublic:r.is_public||false,createdAt:r.created_at}));
  },
  async upsertCommitteeNotice(n) {
    await supabase.from("committee_notices").upsert({id:n.id,committee_id:n.committeeId,title:n.title,body:n.body||"",posted_by:n.postedBy||"",is_public:n.isPublic||false,updated_at:new Date().toISOString()},{onConflict:"id"});
  },
  async deleteCommitteeNotice(id) {
    await supabase.from("committee_notices").delete().eq("id",id);
  },
  async getCommitteeMembers() {
    const {data} = await supabase.from("committee_members").select("*");
    const map = {};
    (data||[]).forEach(r=>{ if(!map[r.committee_id])map[r.committee_id]=[]; map[r.committee_id].push(r.emp_id); });
    return map;
  },
  async setCommitteeMembers(committeeId, empIds) {
    await supabase.from("committee_members").delete().eq("committee_id",committeeId);
    if(empIds.length>0) await supabase.from("committee_members").insert(empIds.map(eid=>({committee_id:committeeId,emp_id:eid})));
  },
  async getCommitteeMeetings() {
    const {data} = await supabase.from("committee_meetings").select("*").order("scheduled_date",{ascending:true});
    return (data||[]).map(r=>({id:r.id,committeeId:r.committee_id,scheduledDate:r.scheduled_date,startTime:r.start_time||"",endTime:r.end_time||"",location:r.location||"",agenda:r.agenda||"",notes:r.notes||"",createdAt:r.created_at}));
  },
  async upsertCommitteeMeeting(m) {
    await supabase.from("committee_meetings").upsert({id:m.id,committee_id:m.committeeId,scheduled_date:m.scheduledDate,start_time:m.startTime||"",end_time:m.endTime||"",location:m.location||"",agenda:m.agenda||"",notes:m.notes||"",updated_at:new Date().toISOString()},{onConflict:"id"});
  },
  async deleteCommitteeMeeting(id) {
    await supabase.from("committee_meeting_reads").delete().eq("meeting_id",id);
    await supabase.from("committee_meetings").delete().eq("id",id);
  },
  async getMeetingReads() {
    const {data} = await supabase.from("committee_meeting_reads").select("*");
    const map = {};
    (data||[]).forEach(r=>{ if(!map[r.meeting_id])map[r.meeting_id]=[]; map[r.meeting_id].push(r.emp_id); });
    return map;
  },
  async markMeetingRead(meetingId, empId) {
    await supabase.from("committee_meeting_reads").upsert({meeting_id:meetingId,emp_id:empId,read_at:new Date().toISOString()},{onConflict:"meeting_id,emp_id"});
  },
  async getGeneralNotices() {
    const {data} = await supabase.from("general_notices").select("*").order("created_at",{ascending:false});
    return (data||[]).map(r=>({id:r.id,category:r.category||"各種お知らせ",title:r.title,body:r.body||"",fileUrl:r.file_url||null,filePath:r.file_path||null,fileName:r.file_name||null,targetEmpIds:r.target_emp_ids||[],postedBy:r.posted_by||"",createdAt:r.created_at}));
  },
  async upsertGeneralNotice(n) {
    await supabase.from("general_notices").upsert({id:n.id,category:n.category||"各種お知らせ",title:n.title,body:n.body||"",file_url:n.fileUrl||null,file_path:n.filePath||null,file_name:n.fileName||null,target_emp_ids:n.targetEmpIds||[],posted_by:n.postedBy||"ADMIN",updated_at:new Date().toISOString()},{onConflict:"id"});
  },
  async uploadGeneralNoticePdf(id,file) {
    const MAX=20*1024*1024;
    if(file.size>MAX)throw new Error("20MBを超えるファイルはアップロードできません");
    const path=`gn_${id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._\-]/g,"_")}`;
    const {error:upErr} = await supabase.storage.from("training-files").upload(path,file,{upsert:true});
    if(upErr)throw upErr;
    const {data:{publicUrl}} = supabase.storage.from("training-files").getPublicUrl(path);
    return {fileUrl:publicUrl,filePath:path,fileName:file.name};
  },
  async deleteGeneralNotice(id,filePath) {
    if(filePath) await supabase.storage.from("training-files").remove([filePath]);
    await supabase.from("general_notices").delete().eq("id",id);
  },
  async getSeminars() {
    const {data} = await supabase.from("seminars").select("*").order("date");
    return (data||[]).map(r=>({id:r.id,title:r.title,date:r.date,videoUrl:r.video_url||"",description:r.description||"",organizer:r.organizer||"リブドゥ",isPortal:r.is_portal===true}));
  },
  async upsertSeminar(s) { await supabase.from("seminars").upsert({id:s.id,title:s.title,date:s.date,video_url:s.videoUrl||"",description:s.description||"",organizer:s.organizer||"リブドゥ",is_portal:s.isPortal===true,updated_at:new Date().toISOString()},{onConflict:"id"}); },
  async deleteSeminar(id) {
    await supabase.from("seminar_monthly_views").delete().eq("seminar_id",id);
    await supabase.from("seminars").delete().eq("id",id);
  },
  async getSeminarMonthly() {
    const {data} = await supabase.from("seminar_monthly_views").select("*");
    const map = {};
    (data||[]).forEach(r => { map[`${r.emp_id}|${r.seminar_id}|${r.ym}`]={watched:r.watched===true,reportSubmitted:r.report_submitted===true}; });
    return map;
  },
  async setSeminarMonthly(empId,sid,ym,fields) {
    await supabase.from("seminar_monthly_views").upsert({emp_id:empId,seminar_id:sid,ym,watched:fields.watched===true,report_submitted:fields.reportSubmitted===true,updated_at:new Date().toISOString()},{onConflict:"emp_id,seminar_id,ym"});
  },
};

export default function App() {
  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`
      *{box-sizing:border-box;}
      body{margin:0;padding:0;overflow-x:hidden;}
      /* スマホ（768px以下） */
      @media(max-width:768px){
        .rsp-page{padding:0 !important;}
        .rsp-wrap{border-radius:0 !important;box-shadow:none !important;border:none !important;min-height:100vh;}
        .app-content-grid{display:block !important;}
        table{font-size:11px !important;}
        td,th{padding:4px 6px !important;}
        .btn-col-sp{flex-direction:column !important;align-items:flex-end !important;}
        .btn-col-sp button{width:100% !important;text-align:center !important;}
        input[type="date"]{-webkit-appearance:none;appearance:none;min-height:44px;padding:10px 14px !important;}
        /* iOSの自動ズーム防止：input/selectは16px以上にする */
        input,select,textarea{font-size:16px !important;}
      }
      /* PC（769px以上） */
      @media(min-width:769px){
        .rsp-page{padding:24px 32px !important;align-items:flex-start;}
        .rsp-wrap{border-radius:16px !important;box-shadow:0 24px 60px rgba(200,154,85,.2) !important;border:1px solid #E8D5B0 !important;margin-top:16px;}
        .app-content-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      }
    `;
    document.head.appendChild(style);
    return()=>document.head.removeChild(style);
  },[]);

  const [employees,setEmployees] = useState([]);
  const [internals,setInternals] = useState([]);
  const [externals,setExternals] = useState([]);
  const [iStatuses,setIStatuses] = useState({});
  const [xStatuses,setXStatuses] = useState({});
  const [fiscalYear,setFiscalYear] = useState(currentFY());
  const [session,setSession]         = useState(null);
  const [manualSession,setManualSession] = useState(null);
  const [loading,setLoading]         = useState(true);
  const [pendingAttend,setPendingAttend] = useState(null);
  const [committees,setCommittees] = useState(INIT_COMMITTEES);
  const [committeeMembers,setCommitteeMembers] = useState({});
  const [committeeMeetings,setCommitteeMeetings] = useState([]);
  const [meetingReads,setMeetingReads] = useState({});
  const [committeeNotices,setCommitteeNotices] = useState([]);
  const [generalNotices,setGeneralNotices] = useState([]);
  const [seminars,setSeminars] = useState([]);
  const [semMonthly,setSemMonthly] = useState({});

  useEffect(()=>{ const p=new URLSearchParams(window.location.search);const a=p.get("attend");if(a)setPendingAttend(a); },[]);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      // 職員・研修データは必須 → 先に確実に読み込む
      const [emps,iS,xS,int,ext] = await Promise.all([
        db.getEmployees(),db.getIStatuses(),db.getXStatuses(),db.getInternals(),db.getExternals()
      ]);
      setEmployees(emps); setIStatuses(iS); setXStatuses(xS); setInternals(int); setExternals(ext);
      setLoading(false);
      // 委員会データは別で読み込む（失敗しても職員データに影響しない）
      try {
        const [cmts,cmems,cmeets,mreads,notices] = await Promise.all([
          db.getCommittees(),db.getCommitteeMembers(),db.getCommitteeMeetings(),db.getMeetingReads(),db.getCommitteeNotices()
        ]);
        setCommittees(cmts); setCommitteeMembers(cmems); setCommitteeMeetings(cmeets); setMeetingReads(mreads); setCommitteeNotices(notices);
      } catch(e){ console.warn("委員会データ読み込みエラー（テーブル未作成の可能性）:",e); }
      try {
        setGeneralNotices(await db.getGeneralNotices());
      } catch(e){ console.warn("お知らせデータ読み込みエラー（テーブル未作成の可能性）:",e); }
      // セミナーデータも別で読み込む（テーブル未作成でも職員データに影響しない）
      try {
        const [sems,smv] = await Promise.all([db.getSeminars(),db.getSeminarMonthly()]);
        setSeminars(sems); setSemMonthly(smv);
      } catch(e){ console.warn("セミナーデータ読み込みエラー（テーブル未作成の可能性）:",e); }
    })();
  },[]);

  useEffect(()=>{
    if(loading||employees.length===0)return;
    internals.forEach(t=>{
      // 2回開催の場合は遅い方の日程が過ぎるまで「未参加（確定）」にしない
      if(!isPast(t.date2&&t.date2>t.date?t.date2:t.date))return;
      employees.forEach(emp=>{
        if(!isTargetedFor(t,emp))return; // 対象外の職員は欠席扱いにしない
        const cur=iStatuses[emp.id]?.[t.id];
        if(!cur||(cur.attendance!=="参加済"&&cur.attendance!=="未参加（確定）")){
          const next={attendance:"未参加（確定）",report:(cur?.report||"未提出"),video:(cur?.video||"未視聴"),reportConfirmed:(cur?.reportConfirmed||false),attendedSession:(cur?.attendedSession||"")};
          setIStatuses(p=>({...p,[emp.id]:{...p[emp.id],[t.id]:next}}));
          db.setIStatus(emp.id,t.id,next);
        }
      });
    });
  },[internals,loading,employees]);// eslint-disable-line

  const getIS = (empId,tid) => iStatuses[empId]?.[tid]||{attendance:"未参加",report:"未提出",video:"未視聴",reportConfirmed:false,attendedSession:""};
  const setIS = async(empId,tid,field,val) => {
    // field にオブジェクトを渡すと複数フィールドを同時更新できる
    const patch=typeof field==="object"?field:{[field]:val};
    const next={...getIS(empId,tid),...patch};
    setIStatuses(p=>({...p,[empId]:{...p[empId],[tid]:next}}));
    await db.setIStatus(empId,tid,next);
  };
  const getXS = (empId,xid) => xStatuses[empId]?.[xid]||{attended:false,reportSubmitted:false,reportConfirmed:false};
  const setXS = async(empId,xid,patch) => {
    const next={...getXS(empId,xid),...patch};
    setXStatuses(p=>({...p,[empId]:{...p[empId],[xid]:next}}));
    await db.setXStatus(empId,xid,next);
  };
  const getSMV = (empId,sid,ym) => semMonthly[`${empId}|${sid}|${ym}`]||{watched:false,reportSubmitted:false};
  const setSMV = async(empId,sid,ym,patch) => {
    const next={...getSMV(empId,sid,ym),...patch};
    setSemMonthly(p=>({...p,[`${empId}|${sid}|${ym}`]:next}));
    await db.setSeminarMonthly(empId,sid,ym,next);
  };
  const getCount = (empId,fy) => {
    const iC=internals.filter(t=>inFiscalYear(t.date,fy)&&getIS(empId,t.id).reportConfirmed===true).length;
    const xC=externals.filter(x=>inFiscalYear(x.date,fy)&&x.targetEmpIds.includes(empId)&&getXS(empId,x.id).reportConfirmed).length;
    return iC+xC;
  };

  const handleLogin=(empId,isAdmin,isManager,dept)=>{
    setSession({empId,isAdmin,isManager,dept});
    if(pendingAttend&&!isAdmin){ setIS(empId,pendingAttend,"attendance","参加済"); setPendingAttend(null); }
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

  if(manualSession) return <ManualScreen session={manualSession} employees={employees} onLogout={()=>setManualSession(null)}/>;

  if(!session) return <DualLoginScreen pendingAttend={pendingAttend} internals={internals} employees={employees} onLogin={handleLogin} onManualLogin={(empId,isAdmin)=>setManualSession({empId,isAdmin})}/>;

  const committeeProps = {
    committees, setCommittees,
    committeeMembers, setCommitteeMembers,
    committeeMeetings, setCommitteeMeetings,
    meetingReads, setMeetingReads,
    committeeNotices, setCommitteeNotices,
    employees,
    upsertCommittee: async c => { await db.upsertCommittee(c); setCommittees(p=>p.map(x=>x.id===c.id?c:x).concat(p.find(x=>x.id===c.id)?[]:[c])); },
    deleteCommittee: async id => { await db.deleteCommittee(id); setCommittees(p=>p.filter(c=>c.id!==id)); setCommitteeMembers(p=>{const n={...p};delete n[id];return n;}); setCommitteeMeetings(p=>p.filter(m=>m.committeeId!==id)); setCommitteeNotices(p=>p.filter(n=>n.committeeId!==id)); },
    setMembersFor: async (cid, empIds) => { await db.setCommitteeMembers(cid,empIds); setCommitteeMembers(p=>({...p,[cid]:empIds})); },
    upsertMeeting: async m => {
      const isNew = !committeeMeetings.find(x=>x.id===m.id);
      await db.upsertCommitteeMeeting(m);
      setCommitteeMeetings(p=>{ const n=p.filter(x=>x.id!==m.id); return [...n,m].sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate)); });
      // 新規登録時のみ、委員メンバーにLINE通知（10:00〜17:00以外はキューに保存され翌日送信）
      if(isNew){
        try {
          const committee = committees.find(c=>c.id===m.committeeId);
          const memberIds = committeeMembers[m.committeeId]||[];
          const targets = employees.filter(e=>memberIds.includes(e.id)&&e.lineUserId);
          if(targets.length>0&&committee){
            const msg = `📅 【${committee.name}】開催のお知らせ\n\n日時：${formatDate(m.scheduledDate)}${m.startTime?` ${m.startTime}〜`:""}${m.endTime?`${m.endTime}`:""}\n${m.location?`場所：${m.location}\n`:""}${m.agenda?`議題：${m.agenda}\n`:""}\n詳細は研修管理システムの委員会タブをご確認ください。`;
            await fetch("https://nncousuugjntzovtmkvt.supabase.co/functions/v1/line-notify",{
              method:"POST",
              headers:{"Content-Type":"application/json"},
              body:JSON.stringify({notifications:targets.map(t=>({lineUserId:t.lineUserId,message:msg}))})
            });
          }
        } catch(e){ console.warn("LINE通知エラー:",e); }
      }
    },
    deleteMeeting: async id => { await db.deleteCommitteeMeeting(id); setCommitteeMeetings(p=>p.filter(m=>m.id!==id)); },
    markRead: async (meetingId, empId) => { await db.markMeetingRead(meetingId,empId); setMeetingReads(p=>({...p,[meetingId]:[...(p[meetingId]||[]).filter(x=>x!==empId),empId]})); },
    upsertNotice: async n => { await db.upsertCommitteeNotice(n); setCommitteeNotices(p=>{const f=p.filter(x=>x.id!==n.id);return [n,...f];}); },
    generalNotices,
    upsertGeneralNotice: async n => { await db.upsertGeneralNotice(n); setGeneralNotices(p=>{const f=p.filter(x=>x.id!==n.id);return [n,...f];}); },
    deleteGeneralNotice: async id => { const n=generalNotices.find(x=>x.id===id); await db.deleteGeneralNotice(id,n?.filePath||null); setGeneralNotices(p=>p.filter(x=>x.id!==id)); },
    uploadGeneralNoticePdf: db.uploadGeneralNoticePdf,
    deleteNotice: async id => { await db.deleteCommitteeNotice(id); setCommitteeNotices(p=>p.filter(n=>n.id!==id)); },
  };

  if(session.isAdmin) return(
    <AdminScreen employees={employees} setEmployees={setEmployees}
      internals={internals} setInternals={async fn=>{ const n=typeof fn==="function"?fn(internals):fn; setInternals(n); for(const t of n) await db.upsertInternal(t); }}
      externals={externals} setExternals={async fn=>{ const n=typeof fn==="function"?fn(externals):fn; setExternals(n); for(const x of n) await db.upsertExternal(x); }}
      deleteInternal={async id=>{ setInternals(p=>p.filter(t=>t.id!==id)); await db.deleteInternal(id); }}
      deleteExternal={async id=>{ const x=externals.find(ex=>ex.id===id); setExternals(p=>p.filter(x=>x.id!==id)); await db.deleteExternal(id,x?.pdfPath||null); }}
      seminars={seminars}
      upsertSeminar={async s=>{ setSeminars(p=>{const i=p.findIndex(x=>x.id===s.id);return i>=0?p.map(x=>x.id===s.id?s:x):[...p,s].sort((a,b)=>new Date(a.date)-new Date(b.date));}); await db.upsertSeminar(s); }}
      deleteSeminar={async id=>{ setSeminars(p=>p.filter(s=>s.id!==id)); await db.deleteSeminar(id); }}
      getSMV={getSMV}
      getIS={getIS} setIS={setIS} getXS={getXS} setXS={setXS}
      fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
      getCount={getCount} onLogout={handleLogout}
      committeeProps={committeeProps}/>
  );

  if(session.isManager){
    const mgr=employees.find(e=>e.id===session.empId);
    if(!mgr){handleLogout();return null;}
    const managedDepts=mgr.managedDepts&&mgr.managedDepts.length>0?mgr.managedDepts:[session.dept];
    return(
      <EmployeeScreen emp={mgr}
        internals={internals} getIS={getIS} setIS={setIS}
        externals={externals} getXS={getXS} setXS={setXS}
        seminars={seminars} getSMV={getSMV} setSMV={setSMV}
        fiscalYear={fiscalYear} getCount={getCount}
        onLogout={handleLogout}
        isManager={true}
        deptEmployees={employees.filter(e=>managedDepts.includes(e.dept))}
        managedDepts={managedDepts}
        setFiscalYear={setFiscalYear}
        committeeProps={committeeProps}/>
    );
  }

  const emp=employees.find(e=>e.id===session.empId);
  if(!emp){ handleLogout(); return null; }
  return(
    <EmployeeScreen emp={emp}
      internals={internals} getIS={getIS} setIS={setIS}
      externals={externals} getXS={getXS} setXS={setXS}
      seminars={seminars} getSMV={getSMV} setSMV={setSMV}
      fiscalYear={fiscalYear} getCount={getCount}
      onLogout={handleLogout}
      committeeProps={committeeProps}/>
  );
}

function LoginCard({title,icon,accentColor,pendingAttend,internals,employees,onLogin,isManual}){
  const [id,setId]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState("");
  const training=internals&&internals.find(t=>t.id===pendingAttend);
  const submit=()=>{
    setErr("");
    if(id===ADMIN.id&&pw===ADMIN.password){onLogin(ADMIN.id,true);return;}
    if(employees){
      const emp=employees.find(e=>e.id===id&&e.password===pw);
      if(emp){
        if(emp.isActive===false||(emp.retireDate&&new Date(emp.retireDate)<=new Date())){setErr("このアカウントは無効です。管理者にお問い合わせください。");return;}
        onLogin(emp.id,false,emp.isManager||false,emp.dept);return;
      }
    }
    setErr("IDまたはパスワードが正しくありません");
  };
  return(
    <div style={{width:"100%",background:"#fff",borderRadius:20,padding:"24px",boxShadow:`0 12px 40px ${accentColor}33`,border:`1px solid ${accentColor}44`}}>
      {training&&<div style={{display:"flex",alignItems:"center",gap:10,background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:10,padding:"10px 14px",marginBottom:16}}><span style={{fontSize:20}}>📋</span><div><div style={{fontWeight:600,fontSize:13}}>研修QRを読み取りました</div><div style={{fontSize:12,color:"#15803d"}}>「{training.title}」の参加が自動登録されます</div></div></div>}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <span style={{fontSize:28}}>{icon}</span>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:"#4A3020"}}>{title}</div>
          <div style={{fontSize:11,color:accentColor}}>ログインしてください</div>
        </div>
      </div>
      <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>従業員ID</label>
        <input style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${accentColor}66`,fontSize:13,outline:"none",boxSizing:"border-box"}} placeholder="例: E001" value={id} onChange={e=>{setId(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
      <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>パスワード</label>
        <input style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${accentColor}66`,fontSize:13,outline:"none",boxSizing:"border-box"}} type="password" placeholder="パスワード" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
      {err&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",color:"#dc2626",borderRadius:8,padding:"7px 12px",fontSize:12,marginBottom:10}}>{err}</div>}
      <button style={{width:"100%",padding:"10px",background:accentColor,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={submit}>ログイン</button>
    </div>
  );
}

function DualLoginScreen({pendingAttend,internals,employees,onLogin,onManualLogin}){
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#F5EDD8 0%,#FDF6EC 60%,#F5EDD8 100%)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 8px",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif"}}>
      <div style={{width:"100%",maxWidth:420,marginTop:32}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <img src={LOGO_B64} alt={ORG_NAME} style={{height:60,objectFit:"contain",marginBottom:10}}/>
          <div style={{fontSize:13,color:"#9ca3af"}}>{ORG_NAME}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <LoginCard title="研修管理システム" icon="📚" accentColor="#C89A55"
            pendingAttend={pendingAttend} internals={internals} employees={employees}
            onLogin={(empId,isAdmin,isManager,dept)=>onLogin(empId,isAdmin,isManager||false,dept||"")}/>
          {MANUAL_ENABLED&&<ManualLoginCard employees={employees} onManualLogin={onManualLogin}/>}
        </div>
      </div>
    </div>
  );
}

function ManualLoginCard({employees,onManualLogin}){
  const [id,setId]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [showForm,setShowForm]=useState(false);
  const submit=()=>{
    setErr("");
    if(id===ADMIN.id&&pw===ADMIN.password){onManualLogin(ADMIN.id,true);return;}
    if(MANUAL_ENABLED){
      const emp=employees.find(e=>e.id===id&&e.password===pw);
      if(emp){onManualLogin(emp.id,false);return;}
    }
    setErr("IDまたはパスワードが正しくありません");
  };
  return(
    <div style={{width:"100%",background:"#fff",borderRadius:20,padding:"24px",boxShadow:"0 12px 40px #2f6db533",border:"1px solid #2f6db544",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:12,right:12,background:"#f59e0b",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,letterSpacing:1}}>COMING SOON</div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:28}}>📋</span>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:"#9ca3af"}}>マニュアル管理</div>
          <div style={{fontSize:11,color:"#2f6db5"}}>準備中です</div>
        </div>
      </div>
      {!showForm
        ? <div style={{background:"#f3f4f6",borderRadius:12,padding:"14px",textAlign:"center",cursor:"pointer"}} onClick={()=>setShowForm(true)}>
            <div style={{fontSize:22,marginBottom:6}}>🚧</div>
            <div style={{fontSize:13,fontWeight:600,color:"#6b7280"}}>現在準備中です</div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>公開までしばらくお待ちください</div>
          </div>
        : <>
            <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>従業員ID</label>
              <input style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #2f6db566",fontSize:13,outline:"none",boxSizing:"border-box"}} placeholder="例: E001" value={id} onChange={e=>{setId(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
            <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>パスワード</label>
              <input style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #2f6db566",fontSize:13,outline:"none",boxSizing:"border-box"}} type="password" placeholder="パスワード" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
            {err&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",color:"#dc2626",borderRadius:8,padding:"7px 12px",fontSize:12,marginBottom:10}}>{err}</div>}
            <button style={{width:"100%",padding:"10px",background:"#2f6db5",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={submit}>ログイン</button>
          </>
      }
    </div>
  );
}

const MANUAL_CATEGORIES = ["基本業務","感染対策","緊急時対応","倫理・人権","記録・報告","勤務ルール","その他"];

function ManualScreen({session,employees,onLogout}){
  const [manuals,setManuals]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selCat,setSelCat]=useState("すべて");
  const [uploading,setUploading]=useState(false);
  const [upTitle,setUpTitle]=useState("");
  const [upCat,setUpCat]=useState(MANUAL_CATEGORIES[0]);
  const [upFile,setUpFile]=useState(null);
  const [upErr,setUpErr]=useState("");
  const [tab,setTab]=useState("list");

  const emp=employees.find(e=>e.id===session.empId);
  const dispName=session.isAdmin?"管理者":(emp?emp.name:session.empId);

  useEffect(()=>{
    (async()=>{ setLoading(true); const m=await db.getManuals(); setManuals(m); setLoading(false); })();
  },[]);

  const filtered=selCat==="すべて"?manuals:manuals.filter(m=>m.category===selCat);

  const handleUpload=async()=>{
    if(!upTitle.trim()||!upFile){setUpErr("タイトルとファイルを入力してください");return;}
    setUpErr(""); setUploading(true);
    try{
      await db.uploadManual(upFile,upCat,upTitle.trim());
      const m=await db.getManuals(); setManuals(m);
      setUpTitle(""); setUpFile(null); setUpCat(MANUAL_CATEGORIES[0]); setTab("list");
    }catch(e){setUpErr("アップロードに失敗しました: "+e.message);}
    setUploading(false);
  };

  const handleDelete=async(id,filePath)=>{
    if(!window.confirm("このマニュアルを削除しますか？"))return;
    await db.deleteManual(id,filePath);
    setManuals(p=>p.filter(m=>m.id!==id));
  };

  const fileIcon=ft=>ft==="pdf"?"📄":ft==="xlsx"||ft==="xls"?"📊":ft==="docx"||ft==="doc"?"📝":"📎";

  return(
    <div style={{minHeight:"100vh",background:"#f0f4fa",fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif"}}>
      {/* ヘッダー */}
      <div style={{background:"linear-gradient(135deg,#1e3a5f,#2f6db5)",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 12px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>📋</span>
          <div>
            <div style={{color:"#fff",fontWeight:800,fontSize:16}}>マニュアル管理</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:11}}>{ORG_NAME}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:"rgba(255,255,255,.8)",fontSize:12}}>{dispName}</span>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,.2)",color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer"}}>ログアウト</button>
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"16px"}}>
        {/* タブ（管理者のみアップロードタブ表示） */}
        {session.isAdmin&&(
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {["list","upload"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 18px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:600,fontSize:13,background:tab===t?"#2f6db5":"#fff",color:tab===t?"#fff":"#374151",boxShadow:tab===t?"0 2px 8px rgba(47,109,181,.3)":"0 1px 4px rgba(0,0,0,.1)"}}>
                {t==="list"?"📋 マニュアル一覧":"📤 アップロード"}
              </button>
            ))}
          </div>
        )}

        {/* アップロード画面 */}
        {tab==="upload"&&session.isAdmin&&(
          <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 2px 12px rgba(0,0,0,.08)",marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:"#1e3a5f"}}>📤 マニュアルをアップロード</div>
            <div style={{marginBottom:12}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>タイトル</label>
              <input style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #ddd",fontSize:13,outline:"none",boxSizing:"border-box"}} placeholder="例: 感染対策マニュアル 2025年版" value={upTitle} onChange={e=>setUpTitle(e.target.value)}/></div>
            <div style={{marginBottom:12}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>カテゴリ</label>
              <select style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #ddd",fontSize:13,outline:"none",boxSizing:"border-box"}} value={upCat} onChange={e=>setUpCat(e.target.value)}>
                {MANUAL_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select></div>
            <div style={{marginBottom:16}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>ファイル（PDF・Excel・Word）</label>
              <input type="file" accept=".pdf,.xlsx,.xls,.docx,.doc" onChange={e=>setUpFile(e.target.files[0]||null)} style={{width:"100%",fontSize:13}}/>
              {upFile&&<div style={{marginTop:6,fontSize:12,color:"#6b7280"}}>選択: {upFile.name} ({(upFile.size/1024/1024).toFixed(1)}MB)</div>}
            </div>
            {upErr&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",color:"#dc2626",borderRadius:8,padding:"8px 12px",fontSize:12,marginBottom:12}}>{upErr}</div>}
            <button onClick={handleUpload} disabled={uploading} style={{width:"100%",padding:"11px",background:uploading?"#9ca3af":"#2f6db5",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:uploading?"not-allowed":"pointer"}}>
              {uploading?"アップロード中...":"アップロードする"}
            </button>
          </div>
        )}

        {/* マニュアル一覧 */}
        {tab==="list"&&(
          <>
            {/* カテゴリフィルター */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {["すべて",...MANUAL_CATEGORIES].map(c=>(
                <button key={c} onClick={()=>setSelCat(c)} style={{padding:"5px 12px",borderRadius:16,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:selCat===c?"#2f6db5":"#fff",color:selCat===c?"#fff":"#374151",boxShadow:"0 1px 4px rgba(0,0,0,.1)"}}>
                  {c}
                </button>
              ))}
            </div>

            {loading?(
              <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>読み込み中...</div>
            ):filtered.length===0?(
              <div style={{textAlign:"center",padding:40,color:"#9ca3af",background:"#fff",borderRadius:16}}>
                <div style={{fontSize:32,marginBottom:8}}>📭</div>
                <div>マニュアルがまだありません</div>
                {session.isAdmin&&<div style={{fontSize:12,marginTop:4}}>「アップロード」タブからファイルを追加してください</div>}
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {filtered.map(m=>(
                  <div key={m.id} style={{background:"#fff",borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,.07)",display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:28,flexShrink:0}}>{fileIcon(m.file_type)}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{background:"#e8f0fb",color:"#2f6db5",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{m.category}</span>
                        <span style={{fontSize:11,color:"#9ca3af"}}>{m.file_name}</span>
                        <span style={{fontSize:11,color:"#9ca3af"}}>{new Date(m.created_at).toLocaleDateString("ja-JP")}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <a href={m.file_url} target="_blank" rel="noreferrer" style={{padding:"6px 14px",background:"#2f6db5",color:"#fff",borderRadius:8,fontSize:12,fontWeight:600,textDecoration:"none"}}>開く</a>
                      {session.isAdmin&&<button onClick={()=>handleDelete(m.id,m.file_path)} style={{padding:"6px 10px",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:8,fontSize:12,cursor:"pointer"}}>削除</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PointCard({count,fiscalYear}){
  const points=calcPoints(count); const badge=getBadge(count);
  const pct=Math.min(count/20*100,100); const bc=count>=20?"#b45309":count>=15?"#0369a1":count>=10?"#7c3aed":count>=5?"#d97706":"#C89A55";
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
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:4}}><span>今年度の復命書提出状況</span><span>{count}/20件</span></div>
        <div style={{position:"relative",height:10,background:"rgba(255,255,255,.25)",borderRadius:5,overflow:"visible"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"#fff",borderRadius:5,transition:"width .5s"}}/>
          <div style={{position:"absolute",left:"50%",top:-3,width:2,height:16,background:"rgba(255,255,255,.6)",borderRadius:1}}/>
        </div>
      </div>
      <div style={{marginTop:16,padding:"8px 12px",background:"rgba(255,255,255,.15)",borderRadius:10,fontSize:12}}>
        {count>=20?"👑 20件達成！すばらしい学習意欲です！":count>=15?`💎 15件達成！あと${20-count}件で👑`:count>=10?`🏆 +2点獲得中！あと${15-count}件で💎`:count>=5?`⭐ +1点獲得中！あと${10-count}件で🏆 +2点`:`🌱 あと${5-count}件で⭐ +1点、${10-count}件で🏆 +2点`}
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
  const [jsqrReady,setJsqrReady]=useState(!!window.jsQR);
  useEffect(()=>{
    // jsQRを先に非同期で読み込む
    if(!window.jsQR){
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
      s.onload=()=>setJsqrReady(true);
      s.onerror=()=>setError("QRライブラリの読み込みに失敗しました。通信環境を確認してください。");
      document.head.appendChild(s);
    }
  },[]);
  useEffect(()=>{
    let stream=null; let animFrame=null;
    const canvas=document.createElement("canvas"); const ctx=canvas.getContext("2d");
    const scanLoop=()=>{
      if(!videoRef.current)return;
      const v=videoRef.current;
      if(v.readyState===v.HAVE_ENOUGH_DATA){
        canvas.width=v.videoWidth;canvas.height=v.videoHeight;ctx.drawImage(v,0,0);
        const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
        if(window.jsQR){
          const code=window.jsQR(imageData.data,imageData.width,imageData.height);
          if(code){const p=new URLSearchParams(code.data.split("?")[1]||"");const tid=p.get("attend");
            if(tid){if(stream)stream.getTracks().forEach(t=>t.stop());onScan(tid);return;}}
        }
      }
      animFrame=requestAnimationFrame(scanLoop);
    };
    const startCamera=async()=>{
      try{
        // まず背面カメラで試みる
        try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}); }
        catch{ stream=await navigator.mediaDevices.getUserMedia({video:true}); }
        if(videoRef.current){
          videoRef.current.srcObject=stream;
          videoRef.current.play().catch(()=>{});
          setScanning(true);
          scanLoop();
        }
      }catch(e){
        if(e.name==="NotAllowedError"||e.name==="PermissionDeniedError"){
          setError("カメラが許可されていません。ブラウザのアドレスバー左のアイコンからカメラを許可してください。");
        }else if(e.name==="NotFoundError"){
          setError("カメラが見つかりません。端末にカメラが搭載されているか確認してください。");
        }else{
          setError(`カメラを起動できませんでした。(${e.name})`);
        }
      }
    };
    startCamera();
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

function EmployeeScreen({emp,internals,getIS,setIS,externals,getXS,setXS,seminars,getSMV,setSMV,fiscalYear,getCount,onLogout,isManager,deptEmployees,managedDepts,setFiscalYear,committeeProps}){
  const [tab,setTab]=useState("training");
  const [videoT,setVideoT]=useState(null);
  const [showVideoModal,setShowVideoModal]=useState(false);
  const [toast,setToast]=useState(null);
  const [pdfExt,setPdfExt]=useState(null);
  const [showProfile,setShowProfile]=useState(false);
  const [showQRScan,setShowQRScan]=useState(false);
  const [showScore,setShowScore]=useState(false);
  const [viewFY,setViewFY]=useState(fiscalYear);
  // お知らせ既読管理（localStorage）
  const [readIds,setReadIds]=useState(()=>{ try{return JSON.parse(localStorage.getItem(`nread_${emp.id}`)||"[]");}catch{return[];} });
  const isCurrentFY=viewFY===fiscalYear;
  const fyInternals=internals.filter(t=>inFiscalYear(t.date,viewFY)&&isTargetedFor(t,emp)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const fyExternals=externals.filter(x=>x.targetEmpIds.includes(emp.id)&&inFiscalYear(x.date,viewFY)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const fySeminars=(seminars||[]).filter(s=>inFiscalYear(s.date,viewFY)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2500);};
  const count=getCount(emp.id,viewFY);
  const monthCounts=Array.from({length:12},(_,i)=>{
    const month=(i+4)%12||12; const year=i<9?viewFY:viewFY+1;
    const iC=internals.filter(t=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()+1===month&&getIS(emp.id,t.id).reportConfirmed===true;}).length;
    const xC=externals.filter(x=>{const d=new Date(x.date);return d.getFullYear()===year&&d.getMonth()+1===month&&x.targetEmpIds.includes(emp.id)&&getXS(emp.id,x.id).reportSubmitted;}).length;
    return{label:`${month}月`,count:iC+xC};
  });
  const maxM=Math.max(...monthCounts.map(m=>m.count),1);
  // お知らせ：全体公開 or 自分が所属する委員会のもの
  const visibleNotices=(committeeProps?.committeeNotices||[]).filter(n=>
    n.isPublic||(committeeProps?.committeeMembers[n.committeeId]||[]).includes(emp.id)
  );
  const unreadCount=visibleNotices.filter(n=>!readIds.includes(n.id)).length;
  const switchTab=k=>{
    setTab(k);
    if(k==="notices"){
      const allIds=visibleNotices.map(n=>n.id);
      const next=[...new Set([...readIds,...allIds])];
      setReadIds(next);
      localStorage.setItem(`nread_${emp.id}`,JSON.stringify(next));
    }
  };
  return(
    <div className="rsp-page" style={S.page}>
      {toast&&<div style={S.toast}>{toast}</div>}
      {pdfExt&&<PdfModal ext={pdfExt} onClose={()=>setPdfExt(null)}/>}
      {showProfile&&<ProfileModal emp={emp} onClose={()=>setShowProfile(false)}/>}
      {/* 動画モーダル（浮動ボタンから開く） */}
      {showVideoModal&&(
        <div style={S.overlay} onClick={()=>setShowVideoModal(false)}>
          <div style={{...S.modal,maxWidth:640,maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:16,color:"#4A3020"}}>▶ 研修動画</div>
              <button style={S.logoutBtn} onClick={()=>setShowVideoModal(false)}>✕ 閉じる</button>
            </div>
            <VideoTab trainings={fyInternals.filter(t=>t.videoUrl)} selected={videoT||fyInternals.find(t=>t.videoUrl)}
              onSelect={t=>setVideoT(t)}
              onMarkWatched={(t,val)=>{ if(isCurrentFY){setIS(emp.id,t.id,"video",val);showToast(val==="視聴済"?"「視聴済」にしました":"未視聴に戻しました");} }}
              getStatus={t=>getIS(emp.id,t.id)} readonly={!isCurrentFY}/>
          </div>
        </div>
      )}
      {/* 動画浮動ボタン */}
      {!showVideoModal&&fyInternals.some(t=>t.videoUrl)&&(
        <button onClick={()=>setShowVideoModal(true)}
          style={{position:"fixed",right:18,bottom:22,zIndex:900,width:58,height:58,borderRadius:"50%",border:"none",cursor:"pointer",background:"#C89A55",color:"#fff",boxShadow:"0 6px 20px rgba(200,154,85,.5)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
          <span style={{fontSize:20,lineHeight:1}}>▶</span>
          <span style={{fontSize:9,fontWeight:700}}>動画</span>
        </button>
      )}
      {showQRScan&&<QRScanModal onScan={tid=>{setIS(emp.id,tid,"attendance","参加済");setShowQRScan(false);showToast("✅ 参加済に登録しました！");}} onClose={()=>setShowQRScan(false)}/>}
      {/* 実績モーダル */}
      {showScore&&(
        <div style={S.overlay} onClick={()=>setShowScore(false)}>
          <div style={{...S.modal,maxWidth:480,maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:16,color:"#4A3020"}}>🏅 研修実績</div>
              <button style={S.logoutBtn} onClick={()=>setShowScore(false)}>✕</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"6px 10px",background:"#FDF6EC",borderRadius:8,border:"1px solid #E8D5B0"}}>
              <span style={{fontSize:12,color:"#A07840",fontWeight:600}}>📅</span>
              <select value={viewFY} onChange={e=>setViewFY(Number(e.target.value))} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #E8D5B0",fontSize:13,fontWeight:600,color:"#4A3020",cursor:"pointer",background:"#fff"}}>
                {[fiscalYear-2,fiscalYear-1,fiscalYear].map(y=><option key={y} value={y}>{y}年度{y===fiscalYear?"（今年度）":""}</option>)}
              </select>
            </div>
            <PointCard count={count} fiscalYear={viewFY}/>
            <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,padding:16,marginTop:14}}>
              <div style={{fontWeight:700,fontSize:13,color:"#4A3020",marginBottom:10}}>📊 月別復命書提出状況（{viewFY}年度）</div>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:72}}>
                {monthCounts.map((m,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{fontSize:9,color:m.count>0?"#C89A55":"#9ca3af",fontWeight:700}}>{m.count>0?m.count:""}</div>
                    <div style={{width:"100%",height:`${(m.count/maxM)*56}px`,minHeight:m.count>0?4:0,background:m.count>=3?"#7c3aed":m.count>=2?"#C89A55":m.count>=1?"#D4AA70":"#e5e7eb",borderRadius:"3px 3px 0 0"}}/>
                    <div style={{fontSize:9,color:"#9ca3af"}}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,padding:16,marginTop:14}}>
              <SeminarStampRow fy={viewFY} empId={emp.id} seminars={seminars} getSMV={getSMV}/>
            </div>
            <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,padding:16,marginTop:14}}>
              <div style={{fontWeight:700,fontSize:13,color:"#4A3020",marginBottom:10}}>🎖 バッジコレクション</div>
              <div style={{display:"flex",gap:8}}>
                {BADGES.map(b=>{const earned=count>=b.min;return(
                  <div key={b.id} style={{flex:1,textAlign:"center",padding:"10px 4px",borderRadius:10,background:earned?b.bg:"#f9fafb",border:`1.5px solid ${earned?b.color:"#e5e7eb"}`,opacity:earned?1:0.45}}>
                    <div style={{fontSize:22,marginBottom:3}}>{b.icon}</div>
                    <div style={{fontSize:10,fontWeight:700,color:earned?b.color:"#9ca3af"}}>{b.label}</div>
                  </div>
                );})}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="rsp-wrap" style={S.appWrap}>
        {/* ヘッダー */}
        <div style={S.header}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
            <button onClick={()=>setShowProfile(true)} style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,.25)",border:"1.5px solid rgba(255,255,255,.4)",color:"#4A3020",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>👤</button>
            <div style={{minWidth:0}}>
              <div style={{...S.headerName,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</span>
                {emp.roleTitle&&<span style={{fontSize:11,fontWeight:700,background:"rgba(255,255,255,.25)",borderRadius:10,padding:"2px 8px",flexShrink:0}}>{emp.roleTitle}</span>}
              </div>
              <div style={S.headerSub}>{emp.dept} · {emp.id}</div>
            </div>
          </div>
          {/* 実績ボタン */}
          <button onClick={()=>setShowScore(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"rgba(255,255,255,.2)",border:"1.5px solid rgba(255,255,255,.6)",borderRadius:12,cursor:"pointer",flexShrink:0}}>
            <span style={{fontSize:22}}>{count>=20?"👑":count>=15?"💎":count>=10?"🏆":count>=5?"⭐":"🌱"}</span>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.8)",fontWeight:600,lineHeight:1.2}}>実績</div>
              <div style={{fontSize:15,color:"#fff",fontWeight:800,lineHeight:1.2}}>{count}<span style={{fontSize:11,fontWeight:400}}>件</span></div>
            </div>
          </button>
        </div>
        {/* 年度バー */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"8px 16px",background:"#FDF6EC",borderBottom:"1px solid #E8D5B0"}}>
          <span style={{fontSize:12,color:"#A07840",fontWeight:600}}>年度</span>
          <select value={viewFY} onChange={e=>setViewFY(Number(e.target.value))} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #E8D5B0",fontSize:13,fontWeight:600,color:"#4A3020",cursor:"pointer",background:"#fff"}}>
            {[fiscalYear-2,fiscalYear-1,fiscalYear].map(y=><option key={y} value={y}>{y}年度{y===fiscalYear?"（今年度）":""}</option>)}
          </select>
          {!isCurrentFY&&<span style={{fontSize:11,color:"#d97706",fontWeight:600,background:"#fef3c7",padding:"2px 8px",borderRadius:20}}>過去年度閲覧中</span>}
        </div>
        {/* タブバー */}
        <div style={S.tabBar}>
          {[["training","📚 研修"],["seminar","📺 セミナー"],
            ...(isManager?[["mgr","📋 部署管理"]]:[]),
            ["chair","🏛 委員会"],
            ["notices","📢 お知らせ"]]
            .map(([k,l])=>{
              const isLocked=k==="notices"||k==="chair";
              return(
              <button key={k}
                disabled={isLocked}
                style={{...S.tab,...(tab===k?S.tabOn:{}),...(k==="mgr"?{background:tab===k?"#1e3a5f":undefined,color:tab===k?"#fff":"#1e3a5f"}:{}),...(isLocked?{color:"#9ca3af",background:"#f3f4f6",borderBottom:"none",cursor:"not-allowed",opacity:.7}:{}),position:"relative"}}
                onClick={()=>!isLocked&&switchTab(k)}>
                {l}
                {isLocked&&<span style={{fontSize:9,background:"#e5e7eb",color:"#6b7280",borderRadius:6,padding:"1px 5px",fontWeight:700,marginLeft:3,verticalAlign:"middle"}}>準備中</span>}
              </button>
              );
            })}
        </div>
        {/* コンテンツ */}
        <div style={S.scroll}>
          {tab==="training"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* 外部研修 */}
              {fyExternals.length>0&&(
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#4A3020",padding:"6px 12px",background:"#FDF6EC",borderRadius:8,marginBottom:8,border:"1px solid #E8D5B0"}}>🌐 外部研修（{fyExternals.length}件）</div>
                  {fyExternals.map(x=>(
                    <ExternalCard key={x.id} ext={x} status={getXS(emp.id,x.id)} readonly={!isCurrentFY}
                      onAttend={()=>{ if(isCurrentFY){setXS(emp.id,x.id,{attended:true});showToast("受講済にしました");} }}
                      onReport={()=>{ if(isCurrentFY){setXS(emp.id,x.id,{reportSubmitted:true});showToast("復命書を提出しました");} }}
                      onCancelReport={()=>{ if(isCurrentFY){setXS(emp.id,x.id,{reportSubmitted:false});showToast("提出を取り消しました");} }}
                      onViewPdf={type=>setPdfExt({...x,_pdfType:type})}/>
                  ))}
                </div>
              )}
              {/* 内部研修 */}
              {fyInternals.length>0&&(
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#4A3020",padding:"6px 12px",background:"#FDF6EC",borderRadius:8,marginBottom:8,border:"1px solid #E8D5B0"}}>🏢 内部研修（{fyInternals.length}件）</div>
                  <div className="app-content-grid">
                    {fyInternals.map(t=>(
                      <InternalCard key={t.id} training={t} status={getIS(emp.id,t.id)} empId={emp.id} readonly={!isCurrentFY}
                        onReport={()=>{ if(isCurrentFY){setIS(emp.id,t.id,"report","提出済");showToast("復命書を提出しました");} }}
                        onCancelReport={()=>{ if(isCurrentFY){setIS(emp.id,t.id,"report","未提出");showToast("提出を取り消しました");} }}
                        onVideo={v=>{ if(isCurrentFY){setIS(emp.id,t.id,"video",v);} }}
                        onWatchVideo={()=>{setVideoT(t);setShowVideoModal(true);}}
                        onAttendSession={async s=>{ if(isCurrentFY){ await setIS(emp.id,t.id,{attendance:"参加済",attendedSession:s}); showToast(`✅ ${s==="1"?"①":"②"}に参加で記録しました`); } }}/>
                    ))}
                  </div>
                </div>
              )}
              {fyInternals.length===0&&fyExternals.length===0&&<div style={S.empty}>{viewFY}年度の研修はありません</div>}
            </div>
          )}
          {tab==="seminar"&&(
            <SeminarTab seminars={fySeminars} empId={emp.id} getSMV={getSMV} setSMV={setSMV}
              readonly={!isCurrentFY} fiscalYear={viewFY} showToast={showToast}/>
          )}
          {tab==="mgr"&&isManager&&deptEmployees&&(
            <ManagerTabContent
              dept={(managedDepts&&managedDepts.length>1)?managedDepts.join("・"):emp.dept}
              employees={deptEmployees}
              internals={internals} getIS={getIS} setIS={setIS}
              externals={externals} getXS={getXS} setXS={setXS}
              seminars={seminars} getSMV={getSMV}
              fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
              managedDepts={managedDepts||[emp.dept]}/>
          )}
          {tab==="chair"&&committeeProps&&(
            <ChairCommitteeView emp={emp} {...committeeProps}/>
          )}
          {tab==="notices"&&(
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f",marginBottom:14}}>📢 お知らせ</div>
              <div style={{textAlign:"center",padding:"48px 24px",color:"#9ca3af"}}>
                <div style={{fontSize:40,marginBottom:12}}>🚧</div>
                <div style={{fontSize:15,fontWeight:700,color:"#6b7280",marginBottom:6}}>このタブは現在準備中です</div>
                <div style={{fontSize:13,color:"#9ca3af"}}>近日公開予定です。しばらくお待ちください。</div>
              </div>
              {false&&visibleNotices.length===0&&<div style={{textAlign:"center",padding:40,color:"#9ca3af",fontSize:13}}>現在お知らせはありません</div>}
              {false&&visibleNotices.map(n=>{
                const c=committeeProps?.committees?.find(x=>x.id===n.committeeId);
                const isUnread=!readIds.includes(n.id);
                return(
                  <div key={n.id} style={{background:"#fff",border:`1.5px solid ${isUnread?"#fcd34d":"#e5e7eb"}`,borderRadius:12,padding:"12px 14px",marginBottom:8,position:"relative"}}>
                    {isUnread&&<span style={{position:"absolute",top:10,right:12,width:8,height:8,borderRadius:"50%",background:"#ef4444",display:"block"}}/>}
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      {c&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${c.color||"#7c3aed"}20`,color:c.color||"#7c3aed"}}>{c.name}</span>}
                      <span style={{fontWeight:700,fontSize:14,color:"#1e3a5f"}}>{n.title}</span>
                      {n.isPublic&&<span style={{fontSize:10,background:"#dcfce7",color:"#15803d",borderRadius:10,padding:"1px 8px",fontWeight:700}}>全体</span>}
                    </div>
                    {n.body&&<div style={{fontSize:13,color:"#374151",whiteSpace:"pre-wrap",lineHeight:1.7,marginBottom:6}}>{n.body}</div>}
                    <div style={{fontSize:11,color:"#9ca3af"}}>{n.createdAt?new Date(n.createdAt).toLocaleDateString("ja-JP"):""}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* スティッキーログアウトバー */}
        <div style={{position:"sticky",bottom:0,background:"linear-gradient(to top,#fff 80%,rgba(255,255,255,0))",padding:"12px 16px 16px",display:"flex",justifyContent:"center",zIndex:10}}>
          <button onClick={onLogout} style={{padding:"10px 32px",background:"#4A3020",color:"#fff",border:"none",borderRadius:24,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(74,48,32,.3)",letterSpacing:.5}}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 部署長コンテンツ（ダッシュボード型）─────────────────────────
function ManagerTabContent({dept,employees,internals,getIS,setIS,externals,getXS,setXS,seminars,getSMV,fiscalYear,setFiscalYear}){
  const fyInternals=internals.filter(t=>inFiscalYear(t.date,fiscalYear)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const fyExternals=externals.filter(x=>inFiscalYear(x.date,fiscalYear)&&x.targetEmpIds.some(id=>employees.map(e=>e.id).includes(id)));
  const [selTraining,setSelTraining]=useState(null);
  const [mode,setMode]=useState("i"); // "i"=内部 "x"=外部
  const [filterPending,setFilterPending]=useState(true);

  // 選択中の研修（初期値は最初の内部研修）
  const curT=selTraining||fyInternals[0]||null;

  // 復命書必須の職員かどうか判定
  const isReportRequired=(emp,t)=>{
    if(t.noReport)return false;
    const s=getIS(emp.id,t.id);
    return (t.requiredEmpIds||[]).includes(emp.id)||s.attendance==="参加済";
  };

  // 未提出バッジ数（復命書必須なのに未提出）
  const unreportedCount=(t)=>employees.filter(e=>{
    if(!isTargetedFor(t,e))return false;
    const s=getIS(e.id,t.id);
    return isReportRequired(e,t)&&s.report!=="提出済"&&!s.reportConfirmed;
  }).length;

  // 対象職員の状態分類
  const getEmpStatus=(emp,t)=>{
    const s=getIS(emp.id,t.id);
    const req=isReportRequired(emp,t);
    if(s.reportConfirmed) return "done";
    if(s.report==="提出済") return "waitConfirm";
    if(req&&s.report!=="提出済") return "pending";
    return "noReq";
  };

  // 名前順で固定ソート（操作してもリストが入れ替わらないように）
  const curTargets=curT?employees.filter(e=>isTargetedFor(curT,e)):[];
  const empList=curT?[...curTargets].sort((a,b)=>a.name.localeCompare(b.name,"ja")):[];
  const displayList=filterPending&&curT?empList.filter(e=>getEmpStatus(e,curT)!=="done"):empList;

  const reqCount=curT?curTargets.filter(e=>isReportRequired(e,curT)).length:0;
  const unreported=curT?curTargets.filter(e=>isReportRequired(e,curT)&&getIS(e.id,curT.id).report!=="提出済"&&!getIS(e.id,curT.id).reportConfirmed).length:0;
  const waitConfirm=curT?curTargets.filter(e=>{const s=getIS(e.id,curT.id);return s.report==="提出済"&&!s.reportConfirmed;}).length:0;

  const initials=name=>name?name.charAt(0):"?";
  const avatarColor=i=>[["#E6F1FB","#185FA5"],["#EAF3DE","#3B6D11"],["#FAEEDA","#854F0B"],["#FCEBEB","#A32D2D"],["#F1EFE8","#5F5E5A"]][i%5];

  return(
    <div style={{padding:"8px 0"}}>
      {/* ヘッダー */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#1e3a5f"}}>🏢 {dept}</div>
        {setFiscalYear&&<select value={fiscalYear} onChange={e=>setFiscalYear(Number(e.target.value))} style={{padding:"3px 8px",borderRadius:8,border:"1px solid #E8D5B0",fontSize:12,cursor:"pointer",background:"#fff"}}>
          {[currentFY()-1,currentFY(),currentFY()+1].map(y=><option key={y} value={y}>{y}年度</option>)}
        </select>}
      </div>

      {/* 内部/外部/セミナー切り替え */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["i","📊 内部研修"],["x","🌐 外部研修"],...(getSMV?[["s","📺 セミナー"]]:[])].map(([k,l])=>(
          <button key={k} onClick={()=>setMode(k)} style={{padding:"6px 16px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:mode===k?"#1e3a5f":"#f3f4f6",color:mode===k?"#fff":"#374151"}}>
            {l}
          </button>
        ))}
      </div>

      {mode==="i"&&(
        <>
          {fyInternals.length===0?<div style={S.empty}>{fiscalYear}年度の内部研修はありません</div>:<>
            {/* 研修セレクター */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {fyInternals.map(t=>{
                const cnt=unreportedCount(t);
                const isActive=(curT&&curT.id===t.id)||(!selTraining&&fyInternals[0]?.id===t.id);
                return(
                  <div key={t.id} style={{position:"relative",display:"inline-block"}}>
                    <button onClick={()=>setSelTraining(t)} style={{padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:isActive?"#1e3a5f":"#f3f4f6",color:isActive?"#fff":"#374151",whiteSpace:"nowrap",lineHeight:1.3}}>
                      <div>{t.title}</div>
                      <div style={{fontSize:10,fontWeight:400,opacity:0.8}}>{formatDate(t.date)}</div>
                    </button>
                    {cnt>0&&<span style={{position:"absolute",top:-5,right:-5,minWidth:16,height:16,borderRadius:8,background:"#E24B4A",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:"1.5px solid #fff"}}>{cnt}</span>}
                  </div>
                );
              })}
            </div>

            {curT&&<>
              {/* サマリーカード */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{padding:"10px 12px",background:"#fef2f2",borderRadius:12,textAlign:"center",border:"1px solid #fca5a5"}}>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>復命書 未提出</div>
                  <div style={{fontSize:22,fontWeight:700,color:"#dc2626"}}>{unreported}<span style={{fontSize:12,fontWeight:400,color:"#9ca3af"}}>/{reqCount}名</span></div>
                </div>
                <div style={{padding:"10px 12px",background:"#fffbeb",borderRadius:12,textAlign:"center",border:"1px solid #fcd34d"}}>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>確認待ち</div>
                  <div style={{fontSize:22,fontWeight:700,color:"#d97706"}}>{waitConfirm}<span style={{fontSize:12,fontWeight:400,color:"#9ca3af"}}>名</span></div>
                </div>
              </div>

              {/* フィルター */}
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {[["要対応のみ",true],["全員",false]].map(([l,v])=>(
                  <button key={l} onClick={()=>setFilterPending(v)} style={{padding:"4px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:filterPending===v?"#374151":"#f3f4f6",color:filterPending===v?"#fff":"#6b7280"}}>
                    {l}
                  </button>
                ))}
              </div>

              {/* 職員リスト */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {displayList.length===0&&<div style={{textAlign:"center",padding:20,color:"#9ca3af",fontSize:13}}>全員対応済みです ✅</div>}
                {displayList.map((emp,i)=>{
                  const s=getIS(emp.id,curT.id);
                  const status=getEmpStatus(emp,curT);
                  const req=isReportRequired(emp,curT);
                  const [bg,fg]=avatarColor(i);
                  const isDone=status==="done";
                  return(
                    <div key={emp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:isDone?"#f9fafb":"#fff",borderRadius:12,border:`1px solid ${isDone?"#e5e7eb":"#E8D5B0"}`,opacity:isDone?0.6:1}}>
                      <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,flexShrink:0,background:bg,color:fg}}>{initials(emp.name)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:600,color:"#4A3020"}}>{emp.name}</div>
                        <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                          {s.attendance==="参加済"?<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#dcfce7",color:"#15803d",fontWeight:600}}>参加済{s.attendedSession==="1"?"①":s.attendedSession==="2"?"②":""}</span>
                            :<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#f3f4f6",color:"#6b7280",fontWeight:600}}>欠席</span>}
                          {req&&(status==="done"?<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#dcfce7",color:"#15803d",fontWeight:600}}>確認済</span>
                            :status==="waitConfirm"?<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#fef3c7",color:"#92400e",fontWeight:600}}>提出済</span>
                            :<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#fee2e2",color:"#dc2626",fontWeight:600}}>未提出</span>)}
                          {!req&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#f3f4f6",color:"#9ca3af"}}>必須外</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:5,flexShrink:0}}>
                        {s.attendance!=="参加済"&&<button style={{fontSize:11,padding:"5px 10px",borderRadius:20,border:"1px solid #16a34a",background:"#f0fdf4",color:"#15803d",cursor:"pointer",fontWeight:600}} onClick={()=>setIS(emp.id,curT.id,"attendance","参加済")}>参加✓</button>}
                        {s.attendance==="参加済"&&status!=="done"&&s.report!=="提出済"&&<button style={{fontSize:11,padding:"5px 10px",borderRadius:20,border:"1px solid #e5e7eb",background:"#f9fafb",color:"#9ca3af",cursor:"pointer"}} onClick={()=>setIS(emp.id,curT.id,"attendance","未参加")}>取消</button>}
                        {status==="waitConfirm"&&<button style={{fontSize:11,padding:"5px 10px",borderRadius:20,border:"1px solid #d97706",background:"#fef3c7",color:"#92400e",cursor:"pointer",fontWeight:600}} onClick={()=>setIS(emp.id,curT.id,"reportConfirmed",true)}>確認✓</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>}
          </>}
        </>
      )}

      {mode==="x"&&(
        <>
          {fyExternals.length===0?<div style={S.empty}>{fiscalYear}年度の外部研修はありません</div>
          :fyExternals.map(x=>{
            const targets=employees.filter(e=>x.targetEmpIds.includes(e.id));
            const waitX=targets.filter(e=>getXS(e.id,x.id).reportSubmitted&&!getXS(e.id,x.id).reportConfirmed).length;
            return(
              <div key={x.id} style={{marginBottom:16,background:"#fff",borderRadius:12,border:"1px solid #E8D5B0",overflow:"hidden"}}>
                <div style={{padding:"10px 14px",background:"#FDF6EC",borderBottom:"1px solid #E8D5B0"}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#4A3020"}}>{x.title}</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>📅 {formatDate(x.date)}　{waitX>0&&<span style={{color:"#d97706",fontWeight:600}}>確認待ち {waitX}名</span>}</div>
                </div>
                {targets.map((emp,i)=>{const s=getXS(emp.id,x.id);const [bg,fg]=avatarColor(i);return(
                  <div key={emp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:"0.5px solid #f3f4f6"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,flexShrink:0,background:bg,color:fg}}>{initials(emp.name)}</div>
                    <div style={{flex:1,fontSize:13,fontWeight:600,color:"#4A3020"}}>{emp.name}</div>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      {s.reportConfirmed?<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#dcfce7",color:"#15803d",fontWeight:600}}>確認済</span>
                        :s.reportSubmitted?<button style={{fontSize:11,padding:"4px 10px",borderRadius:20,border:"1px solid #d97706",background:"#fef3c7",color:"#92400e",cursor:"pointer",fontWeight:600}} onClick={()=>setXS(emp.id,x.id,{reportConfirmed:true})}>確認✓</button>
                        :<span style={{fontSize:11,color:"#9ca3af"}}>未提出</span>}
                    </div>
                  </div>
                );})}
              </div>
            );
          })}
        </>
      )}

      {mode==="s"&&getSMV&&(
        <SeminarStatusBoard key={fiscalYear} employees={employees} seminars={seminars} getSMV={getSMV} fiscalYear={fiscalYear}/>
      )}
    </div>
  );
}

// ── 後方互換のためManagerScreenは残す（現在は未使用）─────────────
function ManagerScreen({dept,employees,internals,getIS,setIS,externals,getXS,setXS,fiscalYear,setFiscalYear,onLogout}){
  return(
    <div className="rsp-page" style={S.page}><div style={{...S.appWrap,maxWidth:1200}}>
      <div style={S.header}>
        <div><div style={S.headerName}>🏢 {dept}</div><div style={S.headerSub}>{ORG_NAME}</div></div>
        <button style={S.logoutBtn} onClick={onLogout}>ログアウト</button>
      </div>
      <div style={{padding:16}}>
        <ManagerTabContent dept={dept} employees={employees} internals={internals} getIS={getIS} setIS={setIS} externals={externals} getXS={getXS} setXS={setXS} fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}/>
      </div>
    </div></div>
  );
}

function internalStepsDone(status){
  const s1=status.attendance==="参加済"||status.video==="視聴済";
  const s2=s1&&status.report==="提出済";
  const s3=s2&&status.reportConfirmed===true;
  return[s1,s2,s3];
}

function InternalProgress({status,noReport}){
  const [s1,s2,s3]=internalStepsDone(status);
  const steps=noReport
    ?[{label:"参加/動画",done:s1,active:!s1,color:"#16a34a",bg:"#dcfce7"}]
    :[{label:"参加/動画",done:s1,active:!s1,color:"#16a34a",bg:"#dcfce7"},{label:"復命書",done:s2,active:s1&&!s2,color:"#2563eb",bg:"#dbeafe"},{label:"確認",done:s3,active:s2&&!s3,color:"#7c3aed",bg:"#ede9fe"}];
  const dc=steps.filter(s=>s.done).length; const pct=Math.round(dc/steps.length*100);
  const bc=dc===steps.length?"#16a34a":dc===0?"#e5e7eb":"#C89A55";
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

function InternalCard({training,status,empId,onReport,onCancelReport,onVideo,onWatchVideo,onAttendSession,readonly}){
  const [open,setOpen]=useState(false);
  const attended=status.attendance==="参加済";
  const hasTwoDates=!!training.date2;
  const sessionMark=status.attendedSession==="1"?"①":status.attendedSession==="2"?"②":"";
  const absentFix=status.attendance==="未参加（確定）";
  const showVideo=!attended;
  // 復命書にアクセスできる条件：参加済み OR 動画視聴済み
  const canAccessReport=attended||status.video==="視聴済";
  // 復命書必須の表示条件：training.required=true OR 参加済み（復命書不要の研修では出さない）
  const showReqBadge=!training.noReport&&((training.requiredEmpIds||[]).includes(empId)||attended||canAccessReport);
  return(
    <div style={S.card}>
      <div style={S.cardHead} onClick={()=>setOpen(!open)}>
        <div style={{flex:1}}>
          {showReqBadge&&<span style={S.reqBadge}>復命書必須</span>}
          {readonly&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,display:"inline-block",background:"#f3f4f6",color:"#6b7280",marginLeft:4}}>閲覧のみ</span>}
          <div style={S.cardTitle}>{training.title}</div>
          <div style={S.cardDate}>
            📅 {hasTwoDates?<>① {formatDate(training.date)}　② {formatDate(training.date2)}</>:formatDate(training.date)}
            {training.startTime&&<span style={{marginLeft:8}}>🕐 {training.startTime}{training.endTime&&`〜${training.endTime}`}</span>}
            {training.location&&<span style={{marginLeft:8}}>📍 {training.location}</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}><InternalProgress status={status} noReport={training.noReport}/><span style={{color:"#d1d5db",fontSize:14}}>{open?"▲":"▼"}</span></div>
      </div>
      {open&&(
        <div style={S.cardBody}>
          <p style={{color:"#6b7280",fontSize:13,marginBottom:14}}>{training.description}</p>
          <div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>1</span> 研修参加 または 動画視聴</div>
            {attended?<SPill color="#15803d" bg="#f0fdf4" border="#86efac">✅ 参加済{hasTwoDates&&sessionMark?`（${sessionMark}に参加）`:"（QR認証済）"}</SPill>
              :absentFix&&status.video==="視聴済"?<SPill color="#15803d" bg="#f0fdf4" border="#86efac">✅ 動画視聴済み</SPill>
              :absentFix?<SPill color="#7c6a00" bg="#fefce8" border="#fde68a">📹 当日欠席 ─ 動画でフォローできます</SPill>
              :<SPill color="#6b7280" bg="#f9fafb" border="#e5e7eb">🔲 未参加 ─ 当日QRをスキャン</SPill>}
            {/* 2回開催：どちらに参加したかの記録 */}
            {hasTwoDates&&!readonly&&onAttendSession&&(!attended||!sessionMark)&&!absentFix&&(
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>{attended?"どちらの日程に参加しましたか？":"参加した日程を選んでください："}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button style={{fontSize:12,padding:"7px 14px",borderRadius:20,border:"1.5px solid #16a34a",background:"#f0fdf4",color:"#15803d",cursor:"pointer",fontWeight:600}} onClick={()=>onAttendSession("1")}>① {formatDate(training.date)}に参加</button>
                  <button style={{fontSize:12,padding:"7px 14px",borderRadius:20,border:"1.5px solid #16a34a",background:"#f0fdf4",color:"#15803d",cursor:"pointer",fontWeight:600}} onClick={()=>onAttendSession("2")}>② {formatDate(training.date2)}に参加</button>
                </div>
              </div>
            )}
            {showVideo&&!readonly&&(
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>{absentFix?"研修動画を視聴して内容をフォローしましょう：":"または研修動画を視聴:"}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["視聴済","未視聴"].map(v=><ToggleChip key={v} label={v} active={status.video===v} color={v==="視聴済"?"#16a34a":"#6b7280"} onClick={()=>onVideo(v)}/>)}
                </div>
                {training.videoUrl&&<button style={{...S.watchBtn,marginTop:8}} onClick={onWatchVideo}>▶ 動画を視聴する</button>}
              </div>
            )}
          </div>
          {!training.noReport&&<div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>2</span> 復命書提出</div>
            {!canAccessReport
              ? <SPill color="#9ca3af" bg="#f9fafb" border="#e5e7eb">🔒 参加または動画視聴後に提出できます</SPill>
              : status.reportConfirmed
                ? <SPill color="#15803d" bg="#f0fdf4" border="#86efac">✅ 提出済（管理者確認済）</SPill>
                : status.report==="提出済"
                  ? <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <SPill color="#92400e" bg="#fffbeb" border="#fcd34d">⏳ 提出済 ─ 管理者確認待ち</SPill>
                      {!readonly&&<button style={{fontSize:12,color:"#6b7280",background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"3px 10px",cursor:"pointer"}} onClick={onCancelReport}>取り消す</button>}
                    </div>
                  : readonly
                    ? <SPill color="#9ca3af" bg="#f9fafb" border="#e5e7eb">未提出</SPill>
                    : <button style={{...S.actionBtn,background:"#2563eb"}} onClick={onReport}>復命書を提出する</button>
            }
          </div>}
          {training.noReport&&<div style={{fontSize:12,color:"#15803d",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"8px 12px"}}>📋 この研修は復命書の提出は不要です（参加記録のみ）</div>}
        </div>
      )}
    </div>
  );
}

function ExternalCard({ext,status,onAttend,onReport,onCancelReport,onViewPdf,readonly}){
  const [open,setOpen]=useState(false);
  const {attended,reportSubmitted,reportConfirmed}=status;
  return(
    <div style={S.card}>
      <div style={S.cardHead} onClick={()=>setOpen(!open)}>
        <div style={{flex:1}}>
          <span style={S.extBadge}>外部</span>
          {readonly&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,display:"inline-block",background:"#f3f4f6",color:"#6b7280",marginLeft:4}}>閲覧のみ</span>}
          <div style={S.cardTitle}>{ext.title}</div>
          <div style={S.cardDate}>📅 {formatDate(ext.date)} ｜ 🏢 {ext.organizer} ｜ 📍 {ext.location}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}><ExternalProgress status={status}/><span style={{color:"#d1d5db",fontSize:14}}>{open?"▲":"▼"}</span></div>
      </div>
      {open&&(
        <div style={S.cardBody}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            {ext.pdfUrl
              ?<button style={{...S.watchBtn,background:"#dc2626"}} onClick={e=>{e.stopPropagation();onViewPdf('guide');}}>📄 研修案内を見る</button>
              :<div style={{padding:"8px 12px",background:"#f9fafb",borderRadius:8,fontSize:12,color:"#9ca3af"}}>📄 研修案内は未添付</div>}
            {ext.noticePdfUrl
              ?<button style={{...S.watchBtn,background:"#2563eb"}} onClick={e=>{e.stopPropagation();onViewPdf('notice');}}>📋 受講決定通知を見る</button>
              :<div style={{padding:"8px 12px",background:"#f9fafb",borderRadius:8,fontSize:12,color:"#9ca3af"}}>📋 受講決定通知は未添付</div>}
          </div>
          <div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>1</span> 受講状況</div>
            {attended?<SPill color="#16a34a" bg="#f0fdf4" border="#86efac">✅ 受講済</SPill>
              :readonly?<SPill color="#9ca3af" bg="#f9fafb" border="#e5e7eb">未受講</SPill>
              :<button style={S.actionBtn} onClick={onAttend}>受講済にする</button>}
          </div>
          {attended&&<div style={S.sBlock}>
            <div style={S.sLabel}><span style={S.stepNum}>2</span> 復命書</div>
            {reportConfirmed?<SPill color="#15803d" bg="#f0fdf4" border="#86efac">✅ 提出済（管理者確認済）</SPill>
              :reportSubmitted?<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <SPill color="#92400e" bg="#fffbeb" border="#fcd34d">⏳ 提出済 ─ 管理者確認待ち</SPill>
                {!readonly&&<button style={{fontSize:12,color:"#6b7280",background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"3px 10px",cursor:"pointer"}} onClick={onCancelReport}>取り消す</button>}
              </div>
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
          <iframe style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}} src={toEmbedUrl(cur.videoUrl)} allowFullScreen title={cur.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
        </div>
        {s?.video==="視聴済"&&(
          <div style={{marginTop:12,padding:"10px 14px",background:"#f0fdf4",borderRadius:10,color:"#15803d",fontSize:13,fontWeight:600,textAlign:"center"}}>
            ✅ 視聴済み
          </div>
        )}
      </>}
    </div>
  );
}

const isEmbedUrl = u => /youtube\.com\/embed|youtube-nocookie\.com\/embed|player\.vimeo\.com/.test(u||"");
// YouTubeの通常URL（watch?v= / youtu.be / shorts / live）を埋め込みURLに自動変換
const toEmbedUrl = u => {
  if(!u) return u;
  const m = String(u).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if(m) return `https://www.youtube.com/embed/${m[1]}`;
  const v = String(u).match(/vimeo\.com\/(\d+)/);
  if(v && !String(u).includes("player.vimeo")) return `https://player.vimeo.com/video/${v[1]}`;
  return u;
};

// 📺 セミナー視聴スタンプ（年度の12ヶ月分・視聴した月にスタンプ）
function SeminarStampRow({fy,empId,seminars,getSMV}){
  const months=fyMonths(fy);
  const nowYM=currentYM();
  const watchedOf=ym=>{ const ms=(seminars||[]).filter(s=>!s.isPortal&&ymOf(s.date)===ym); return ms.length>0&&ms.every(s=>getSMV(empId,s.id,ym).watched); };
  const n=months.filter(m=>watchedOf(m.ym)).length;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:13,color:"#4A3020"}}>📺 セミナー視聴スタンプ（{fy}年度）</div>
        <span style={{fontSize:13,fontWeight:800,color:"#0e7490"}}>{n}<span style={{fontSize:10,fontWeight:400,color:"#9ca3af"}}>/12ヶ月</span></span>
      </div>
      <div style={{display:"flex",gap:4}}>
        {months.map(m=>{
          const on=watchedOf(m.ym);
          const future=m.ym>nowYM;
          return(
            <div key={m.ym} style={{flex:1,textAlign:"center",minWidth:0}}>
              <div style={{width:"100%",maxWidth:34,aspectRatio:"1",margin:"0 auto",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,background:on?"#ecfeff":"#f9fafb",border:`1.5px solid ${on?"#0e7490":"#e5e7eb"}`,opacity:future?0.4:1}}>{on?"📺":""}</div>
              <div style={{fontSize:9,color:on?"#0e7490":"#9ca3af",marginTop:3,fontWeight:on?700:400}}>{m.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:11,color:n>=12?"#b45309":n>=6?"#0e7490":"#9ca3af",marginTop:8,fontWeight:n>=6?700:400}}>
        {n>=12?"👑 全月視聴達成！すばらしい学習意欲です！":n>=6?`⭐ ${n}ヶ月視聴！この調子！`:"※ 視聴チェックを付けた月にスタンプが付きます（復命書ポイントとは別の参考実績です）"}
      </div>
    </div>
  );
}

// 📊 所属長・管理者向け：月ごとの視聴・復命書提出状況
function SeminarStatusBoard({employees,seminars,getSMV,fiscalYear}){
  const fySems=(seminars||[]).filter(s=>inFiscalYear(s.date,fiscalYear));
  const nowYM=currentYM();
  const allMonths=fyMonths(fiscalYear);
  const months=allMonths.filter(m=>m.ym<=nowYM);
  const [selYM,setSelYM]=useState(months.length?months[months.length-1].ym:allMonths[0].ym);
  if(fySems.length===0) return <div style={S.empty}>{fiscalYear}年度のオンラインセミナーは登録されていません</div>;
  const monthSems=fySems.filter(s=>!s.isPortal&&ymOf(s.date)===selYM);
  const agg=eid=>{
    const wCnt=monthSems.filter(s=>getSMV(eid,s.id,selYM).watched).length;
    const rCnt=monthSems.filter(s=>getSMV(eid,s.id,selYM).reportSubmitted).length;
    return {wCnt,rCnt,watched:monthSems.length>0&&wCnt===monthSems.length,report:rCnt>0};
  };
  const list=[...employees].sort((a,b)=>a.name.localeCompare(b.name,"ja"));
  const wN=list.filter(e=>agg(e.id).watched).length;
  const rN=list.filter(e=>agg(e.id).report).length;
  const avatarColor=i=>[["#E6F1FB","#185FA5"],["#EAF3DE","#3B6D11"],["#FAEEDA","#854F0B"],["#FCEBEB","#A32D2D"],["#F1EFE8","#5F5E5A"]][i%5];
  return(
    <div>
      {/* 月セレクター */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {(months.length?months:allMonths.slice(0,1)).map(m=>(
          <button key={m.ym} onClick={()=>setSelYM(m.ym)} style={{padding:"5px 12px",borderRadius:16,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:selYM===m.ym?"#0e7490":"#f3f4f6",color:selYM===m.ym?"#fff":"#374151"}}>
            {m.label}
          </button>
        ))}
      </div>
      {/* サマリー */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div style={{padding:"10px 12px",background:"#ecfeff",borderRadius:12,textAlign:"center",border:"1px solid #67e8f9"}}>
          <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>{ymLabel(selYM)}分（全{monthSems.length}本）視聴完了</div>
          <div style={{fontSize:22,fontWeight:700,color:"#0e7490"}}>{wN}<span style={{fontSize:12,fontWeight:400,color:"#9ca3af"}}>/{list.length}名</span></div>
        </div>
        <div style={{padding:"10px 12px",background:"#eff6ff",borderRadius:12,textAlign:"center",border:"1px solid #bfdbfe"}}>
          <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>復命書 提出（任意）</div>
          <div style={{fontSize:22,fontWeight:700,color:"#2563eb"}}>{rN}<span style={{fontSize:12,fontWeight:400,color:"#9ca3af"}}>名</span></div>
        </div>
      </div>
      {/* 職員リスト */}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {list.map((emp,i)=>{
          const st=agg(emp.id);
          const [bg,fg]=avatarColor(i);
          return(
            <div key={emp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#fff",borderRadius:12,border:"1px solid #E8D5B0"}}>
              <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,flexShrink:0,background:bg,color:fg}}>{emp.name?emp.name.charAt(0):"?"}</div>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontSize:13,fontWeight:600,color:"#4A3020"}}>{emp.name}</span>
                <span style={{fontSize:11,color:"#9ca3af",marginLeft:6}}>{emp.dept}</span>
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}}>
                {monthSems.length===0
                  ?<span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#f3f4f6",color:"#9ca3af"}}>動画なし</span>
                  :st.watched
                    ?<span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#ecfeff",color:"#0e7490",fontWeight:600}}>📺 全{monthSems.length}本視聴済</span>
                    :<span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:st.wCnt>0?"#fef3c7":"#f3f4f6",color:st.wCnt>0?"#92400e":"#9ca3af",fontWeight:st.wCnt>0?600:400}}>{st.wCnt}/{monthSems.length}本視聴</span>}
                {st.report&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"#dbeafe",color:"#2563eb",fontWeight:600}}>📄 復命書{st.rCnt}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:11,color:"#9ca3af",marginTop:10}}>※ セミナーの復命書は任意（提出ポイント対象外）です。視聴チェック・提出チェックは職員本人が付けます。</div>
    </div>
  );
}

// 🔥 連続視聴記録（案D：ストリーク表示）
function SeminarStreak({fy,empId,seminars,getSMV}){
  const months=fyMonths(fy);
  const nowYM=currentYM();
  const past=months.filter(m=>m.ym<=nowYM);
  const watchedOf=ym=>{ const ms=(seminars||[]).filter(s=>!s.isPortal&&ymOf(s.date)===ym); return ms.length>0&&ms.every(s=>getSMV(empId,s.id,ym).watched); };
  const total=months.filter(m=>watchedOf(m.ym)).length;
  // 連続記録：今月から遡って数える（今月が未視聴でも先月までの連続は維持）
  let streak=0;
  for(let i=past.length-1;i>=0;i--){
    if(watchedOf(past[i].ym)){streak++;}
    else if(i===past.length-1){continue;}
    else{break;}
  }
  const curWatched=past.length>0&&watchedOf(past[past.length-1].ym);
  // 今月の進み具合（1本見るごとにコメントが変わる）
  const curMonthSems=(seminars||[]).filter(s=>!s.isPortal&&ymOf(s.date)===nowYM);
  const curWCnt=curMonthSems.filter(s=>getSMV(empId,s.id,nowYM).watched).length;
  const curTotal=curMonthSems.length;
  const remaining=curTotal-curWCnt;
  const msg=
    curTotal>0&&curWCnt===curTotal?(streak>=2?`🎉 今月コンプリート！🔥 ${streak}ヶ月連続視聴中！`:"🎉 今月の動画コンプリート！すばらしい！")
    :curWCnt>0?`🔥 今月 ${curWCnt}/${curTotal}本視聴！あと${remaining}本でコンプリート！`
    :streak>=2?`🔥 ${streak}ヶ月連続視聴中！今月もつなげよう！`
    :total>0?"📺 今月の動画を見て記録をつなげよう！"
    :"📺 まずは1本、見てみましょう！";
  const sub=curWatched?`今年度合計 ${total}ヶ月`
    :curWCnt>0?`いい調子！今年度合計 ${total}ヶ月 ・ 全部見るとスタンプが付きます`
    :`今年度合計 ${total}ヶ月 ・ 1本見るだけでもOK！まず再生してみよう`;
  return(
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:streak>=2?"#ffedd5":"#ecfeff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1.5px solid ${streak>=2?"#fdba74":"#67e8f9"}`}}>
        <span style={{fontSize:20,lineHeight:1}}>{streak>=2?"🔥":"📺"}</span>
        <span style={{fontSize:15,fontWeight:800,color:streak>=2?"#c2410c":"#0e7490"}}>{streak}</span>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,fontWeight:700,color:"#4A3020",marginBottom:2}}>{msg}</div>
        <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>{sub}（復命書ポイントとは別の参考実績です）</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {past.map(m=>{
            const on=watchedOf(m.ym);
            return <span key={m.ym} style={{fontSize:11,padding:"2px 10px",borderRadius:10,background:on?"#ecfeff":"#f3f4f6",color:on?"#0e7490":"#9ca3af",fontWeight:on?700:400,border:`1px solid ${on?"#67e8f9":"#e5e7eb"}`}}>{m.label}{on?" ✓":""}</span>;
          })}
        </div>
      </div>
    </div>
  );
}

function SeminarTab({seminars,empId,getSMV,setSMV,readonly,fiscalYear,showToast}){
  const nowYM=currentYM();
  const portal=seminars.find(s=>s.isPortal)||seminars.find(s=>s.videoUrl);
  const monthVideos=seminars.filter(s=>!s.isPortal&&ymOf(s.date)===nowYM);
  const innerBox={background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #a5f3fc",marginBottom:8};
  if(seminars.length===0) return <div style={S.empty}>{fiscalYear}年度のオンラインセミナーはまだ登録されていません</div>;
  return(
    <div>
      <div style={{background:"#ecfeff",border:"1.5px solid #67e8f9",borderRadius:14,padding:16,marginBottom:16}}>
        {/* ヘッダー */}
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12}}>
          <span style={{fontSize:26}}>📺</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:15,color:"#0e7490"}}>{portal?portal.title:"オンラインセミナー"}</div>
            <div style={{fontSize:11,color:"#155e75",marginTop:2}}>🏢 {portal?.organizer||"リブドゥ"} ｜ 動画は毎月更新されます</div>
          </div>
        </div>
        {/* 視聴ページボタン */}
        {portal&&portal.videoUrl&&(
          <div style={{marginBottom:10}}>
            <a href={portal.videoUrl} target="_blank" rel="noreferrer" style={{...S.watchBtn,display:"block",textAlign:"center",textDecoration:"none",background:"#0e7490",boxSizing:"border-box"}}>▶ 視聴ページを開く</a>
            <div style={{fontSize:11,color:"#155e75",marginTop:6,textAlign:"center"}}>🔖 視聴ページはブックマークできません。視聴のたびにこのボタンから開いてください。</div>
          </div>
        )}
        {/* 今月の動画リスト */}
        <div style={{fontWeight:700,fontSize:13,color:"#0e7490",margin:"12px 0 8px"}}>🎬 今月（{ymLabel(nowYM)}）の配信動画{monthVideos.length>0?`（${monthVideos.length}本）`:""}</div>
        {monthVideos.length===0&&<div style={{...innerBox,color:"#9ca3af",fontSize:13,marginBottom:0}}>今月の動画はまだ登録されていません</div>}
        {monthVideos.map(v=>{
          const st=getSMV(empId,v.id,nowYM);
          return(
            <div key={v.id} style={innerBox}>
              <div style={{fontWeight:700,fontSize:13,color:"#374151",lineHeight:1.5,marginBottom:4}}>{v.title}</div>
              {v.description&&<div style={{fontSize:11,color:"#6b7280",marginBottom:8,lineHeight:1.6}}>{v.description}</div>}
              {!readonly&&(
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <ToggleChip label={st.watched?"📺 視聴済み ✓":"📺 視聴済みにする"} active={st.watched} color="#0e7490"
                    onClick={()=>{setSMV(empId,v.id,nowYM,{watched:!st.watched});showToast(!st.watched?"📺 視聴済にしました！":"未視聴に戻しました");}}/>
                  <ToggleChip label={st.reportSubmitted?"📄 復命書 提出済 ✓":"📄 復命書を提出した"} active={st.reportSubmitted} color="#2563eb"
                    onClick={()=>{setSMV(empId,v.id,nowYM,{reportSubmitted:!st.reportSubmitted});showToast(!st.reportSubmitted?"📄 復命書を提出済にしました":"提出を取り消しました");}}/>
                </div>
              )}
              {readonly&&(
                <div style={{display:"flex",gap:6}}>
                  {st.watched&&<SPill color="#0e7490" bg="#ecfeff" border="#67e8f9">📺 視聴済み</SPill>}
                  {st.reportSubmitted&&<SPill color="#2563eb" bg="#eff6ff" border="#bfdbfe">📄 提出済み</SPill>}
                  {!st.watched&&!st.reportSubmitted&&<span style={{fontSize:12,color:"#9ca3af"}}>未視聴</span>}
                </div>
              )}
            </div>
          );
        })}
        <div style={{fontSize:11,color:"#155e75",marginTop:4}}>※ 復命書の提出は任意です（ポイント対象外）</div>
      </div>
      <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,padding:16}}>
        <SeminarStreak fy={fiscalYear} empId={empId} seminars={seminars} getSMV={getSMV}/>
      </div>
    </div>
  );
}

function SPill({color,bg,border,children}){return <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:bg,color,fontSize:13,fontWeight:600,border:`1.5px solid ${border}`}}>{children}</div>;}
function ToggleChip({label,active,color,onClick}){return <button onClick={onClick} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",borderColor:active?color:"#e5e7eb",background:active?color:"#fff",color:active?"#fff":"#6b7280",fontSize:12,fontWeight:active?700:400,cursor:"pointer"}}>{label}</button>;}

function PdfModal({ext,onClose}){
  const url=ext._pdfType==="notice"?ext.noticePdfUrl:ext.pdfUrl;
  return(
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.modal,maxWidth:700,width:"100vw",height:"100dvh",borderRadius:0,display:"flex",flexDirection:"column",padding:"12px 12px 0"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexShrink:0}}>
          <div><div style={{fontWeight:800,fontSize:16,color:"#4A3020"}}>📄 研修要綱</div><div style={{fontSize:13,color:"#6b7280"}}>{ext.title}</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <a href={url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#2563eb",textDecoration:"underline",whiteSpace:"nowrap"}}>外部で開く</a>
            <button style={S.logoutBtn} onClick={onClose}>✕ 閉じる</button>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",WebkitOverflowScrolling:"touch",borderRadius:"10px 10px 0 0",border:"1px solid #e5e7eb",borderBottom:"none"}}>
          <object data={url} type="application/pdf" style={{width:"100%",height:"100%",minHeight:"75vh",border:"none",display:"block"}}>
            <div style={{padding:24,textAlign:"center",color:"#6b7280"}}>
              <p style={{marginBottom:12}}>PDFの表示に対応していません。</p>
              <a href={url} target="_blank" rel="noreferrer" style={{color:"#2563eb",fontWeight:600}}>PDFを開く →</a>
            </div>
          </object>
        </div>
      </div>
    </div>
  );
}

function AdminScreen({employees,setEmployees,internals,setInternals,externals,setExternals,deleteInternal,deleteExternal,seminars,upsertSeminar,deleteSeminar,getSMV,getIS,setIS,getXS,setXS,fiscalYear,setFiscalYear,getCount,onLogout,committeeProps}){
  const [tab,setTab]=useState("ranking");
  const [qrT,setQrT]=useState(null);
  return(
    <div className="rsp-page" style={S.page}>
      {qrT&&<QRModal training={qrT} onClose={()=>setQrT(null)}/>}
      <div style={{...S.appWrap,maxWidth:1200}}>
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
          {[["ranking","🏅 ランキング"],["adminNotices","📢 お知らせ"],["iProgress","📊 内部"],["iManage","📚 内部管理"],["xProgress","🌐 外部"],["xManage","✏️ 外部管理"],["semManage","📺 セミナー"],["empManage","👥 職員管理"],["committeeManage","🏛 委員会管理"]].map(([k,l])=>(
            <button key={k} style={{...S.tab,...(tab===k?S.tabOn:{}),fontSize:11,padding:"10px 6px",whiteSpace:"nowrap"}} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{...S.scroll,maxHeight:"calc(100vh - 185px)"}}>
          {tab==="ranking"   &&<RankingTab employees={employees} fiscalYear={fiscalYear} getCount={getCount}/>}
          {tab==="adminNotices"&&committeeProps&&<AdminNoticesTab {...committeeProps}/>}
          {tab==="iProgress" &&<InternalProgressTab employees={employees} internals={internals} getIS={getIS} setIS={setIS} onQR={setQrT} fiscalYear={fiscalYear}/>}
          {tab==="iManage"   &&<InternalManageTab internals={internals} setInternals={setInternals} deleteInternal={deleteInternal} employees={employees}/>}
          {tab==="xProgress" &&<ExternalProgressTab employees={employees} externals={externals} getXS={getXS} setXS={setXS} fiscalYear={fiscalYear}/>}
          {tab==="xManage"   &&<ExternalManageTab employees={employees} externals={externals} setExternals={setExternals} deleteExternal={deleteExternal}/>}
          {tab==="semManage" &&<SeminarManageTab seminars={seminars} upsertSeminar={upsertSeminar} deleteSeminar={deleteSeminar} employees={employees} getSMV={getSMV} fiscalYear={fiscalYear}/>}
          {tab==="empManage" &&<EmployeeManageTab employees={employees} setEmployees={setEmployees} internals={internals} getIS={getIS} getXS={getXS} externals={externals} fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}/>}
          {tab==="committeeManage"&&committeeProps&&<CommitteeManageTab {...committeeProps}/>}
        </div>
      </div>
    </div>
  );
}

function EmpForm({data,onChange,onSave,onCancel,isEdit,allEmployees}){
  return(
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
      <div style={{marginBottom:10}}>
        <label style={S.label}>退職日（入力すると退職日以降ログイン不可）</label>
        <input type="date" style={S.input} value={data.retireDate||""} onChange={e=>onChange({...data,retireDate:e.target.value})}/>
        {data.retireDate&&<div style={{fontSize:11,color:"#d97706",marginTop:4}}>⚠ {data.retireDate} 以降ログインできなくなります</div>}
      </div>
      <div style={{marginBottom:14}}>
        <label style={{...S.label,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <input type="checkbox" checked={data.isManager||false} onChange={e=>onChange({...data,isManager:e.target.checked})} style={{width:16,height:16,accentColor:"#C89A55"}}/>
          🏢 この職員を部署長にする（自部署の進捗確認・復命書確認が可能）
        </label>
      </div>
      {data.isManager&&(
        <div style={{marginBottom:10}}>
          <label style={S.label}>役職名（例：副主任・管理者・主任）</label>
          <input style={S.input} placeholder="例: 副主任" value={data.roleTitle||""} onChange={e=>onChange({...data,roleTitle:e.target.value})}/>
        </div>
      )}
      {data.isManager&&(
        <div style={{marginBottom:14,padding:"12px",background:"#fffbeb",borderRadius:10,border:"1px solid #fcd34d"}}>
          <div style={{fontSize:12,fontWeight:600,color:"#92400e",marginBottom:8}}>📋 管理対象部署（複数選択可・未選択は自部署のみ）</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {[...new Set((allEmployees||[]).map(e=>e.dept).filter(Boolean))].sort().map(dept=>{
              const selected=(data.managedDepts||[]).includes(dept);
              return(
                <button key={dept} type="button"
                  onClick={()=>{const cur=data.managedDepts||[];onChange({...data,managedDepts:selected?cur.filter(d=>d!==dept):[...cur,dept]});}}
                  style={{padding:"4px 12px",borderRadius:16,border:"1.5px solid",borderColor:selected?"#d97706":"#e5e7eb",background:selected?"#fef3c7":"#fff",color:selected?"#92400e":"#374151",fontSize:12,fontWeight:selected?700:400,cursor:"pointer"}}>
                  {dept}
                </button>
              );
            })}
          </div>
          {(data.managedDepts||[]).length>0&&(
            <div style={{marginTop:8,fontSize:11,color:"#92400e"}}>選択中: {(data.managedDepts||[]).join("・")}</div>
          )}
        </div>
      )}
      <div style={{display:"flex",gap:8}}>
        <button style={{...S.btn,flex:1}} onClick={()=>onSave(data)}>保存する</button>
        <button style={{...S.btn,flex:1,background:"#6b7280"}} onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}

function EmployeeManageTab({employees,setEmployees,internals,getIS,getXS,externals,fiscalYear,setFiscalYear}){
  // 年度の開始・終了日
  const fyStart=new Date(fiscalYear,3,1); // 4月1日
  const fyEnd=new Date(fiscalYear+1,2,31,23,59,59); // 翌3月31日

  // 在籍中：退職日なし or 退職日が年度終了より後
  const activeEmps=employees.filter(e=>!e.retireDate||new Date(e.retireDate)>fyEnd);
  // 今年度退職者：退職日が年度内
  const retiredThisYearEmps=employees.filter(e=>e.retireDate&&new Date(e.retireDate)>=fyStart&&new Date(e.retireDate)<=fyEnd);
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
      roleTitle:emp.roleTitle||"",
      managedDepts:emp.managedDepts||[],
      isActive:emp.isActive!==false,
      retireDate:emp.retireDate||"",
    };
    if(!e.id||!e.password||!e.name||!e.dept)return;
    await db.upsertEmployee(e);
    setEmployees(p=>{const idx=p.findIndex(x=>x.id===e.id);return idx>=0?p.map(x=>x.id===e.id?e:x):[...p,e];});
    setShowAdd(false); setEditEmp(null);
    setNewE({id:"",password:"",name:"",dept:"",joinDate:"",qualifications:"",certTrainings:"",isManager:false,roleTitle:"",managedDepts:[],isActive:true});
  };

  const delEmp=async(id)=>{
    if(!window.confirm(`${id}を削除しますか？`))return;
    await db.deleteEmployee(id);
    setEmployees(p=>p.filter(e=>e.id!==id));
  };


  const parseCSVRows=text=>{
    const rows=[]; let row=[]; let field=""; let inQ=false;
    for(let i=0;i<text.length;i++){
      const c=text[i],n=text[i+1];
      if(inQ){
        if(c==='"'&&n==='"'){field+='"';i++;}
        else if(c==='"'){inQ=false;}
        else{field+=c;}
      }else{
        if(c==='"'){inQ=true;}
        else if(c===','){row.push(field.trim());field="";}
        else if(c==='\r'&&n==='\n'){row.push(field.trim());if(row.some(f=>f))rows.push(row);row=[];field="";i++;}
        else if(c==='\n'||c==='\r'){row.push(field.trim());if(row.some(f=>f))rows.push(row);row=[];field="";}
        else{field+=c;}
      }
    }
    if(field||row.length){row.push(field.trim());if(row.some(f=>f))rows.push(row);}
    return rows;
  };

  const handleCSV=e=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=async ev=>{
      const rows=parseCSVRows(ev.target.result);
      let count=0;
      for(const cols of rows.slice(4)){
        if(cols.length<4||!cols[0])continue;
        // 例示行・ヘッダー行をスキップ
        if(cols[0].includes("例")||cols[0].includes("ID")||cols[0].includes("職員"))continue;
        if((cols[2]||"").includes("例")||(cols[3]||"").includes("例"))continue;
        // 列順: 職員ID,パスワード,姓,名前,入社日,役職名,職員区分,所属,管理部署,保有資格,認定研修,部署長,在籍状態
        const emp={
          id:cols[0], password:cols[1]||"pass001",
          name:(cols[2].trim()+" "+cols[3].trim()).trim(),
          joinDate:cols[4]||"",
          roleTitle:cols[5]||"",
          jobCategory:cols[6]||"",
          dept:cols[7]||"",
          managedDepts:cols[8]?cols[8].split("|").map(s=>s.trim()).filter(Boolean):[],
          qualifications:cols[9]?cols[9].split("|").map(s=>s.trim()).filter(Boolean):[],
          certTrainings:cols[10]?cols[10].split("|").map(s=>s.trim()).filter(Boolean):[],
          isManager:cols[11]==="1"||cols[11]==="true",
          isActive:cols[12]!=="0"&&cols[12]!=="退職",
          retireDate:"",
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
    const header="職員ID,パスワード,氏名,部署,入社年月日,保有資格,受講済み認定研修,部署長(1=YES),管理部署(|区切り),在籍状態(0=退職),役職\n";
    const rows=employees.map(e=>`${e.id},${e.password},${e.name},${e.dept},${e.joinDate||""},${(e.qualifications||[]).join("|")},${(e.certTrainings||[]).join("|")},${e.isManager?1:0},${(e.managedDepts||[]).join("|")},${e.isActive===false?0:1},${e.roleTitle||""}`).join("\n");
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
      {showAdd&&<EmpForm data={newE} onChange={setNewE} onSave={saveEmp} onCancel={()=>setShowAdd(false)} isEdit={false} allEmployees={employees}/>}
      {editEmp&&<EmpForm data={editEmp} onChange={d=>setEditEmp(d)} onSave={saveEmp} onCancel={()=>setEditEmp(null)} isEdit={true} allEmployees={employees}/>}
      {/* 年度切り替え */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"#6b7280"}}>表示年度：</span>
        <select value={fiscalYear} onChange={e=>setFiscalYear&&setFiscalYear(Number(e.target.value))} style={{padding:"3px 8px",borderRadius:8,border:"1px solid #E8D5B0",fontSize:12,cursor:"pointer"}}>
          {[currentFY()-2,currentFY()-1,currentFY(),currentFY()+1].map(y=><option key={y} value={y}>{y}年度{y===currentFY()?"（今年度）":""}</option>)}
        </select>
        <span style={{fontSize:11,color:"#6b7280"}}>在籍：{activeEmps.length}名　今年度退職：{retiredThisYearEmps.length}名</span>
      </div>

      {/* 在籍職員 */}
      {activeEmps.length===0&&<div style={S.empty}>職員が登録されていません。</div>}
      {[...new Set(activeEmps.map(e=>e.dept).filter(Boolean))].sort().map(dept=>{
        const deptEmps=activeEmps.filter(e=>e.dept===dept);
        return(
          <div key={dept} style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,color:"#4A3020",padding:"7px 14px",background:"#FDF6EC",borderRadius:"8px 8px 0 0",border:"1px solid #E8D5B0",borderBottom:"none"}}>
              🏢 {dept}　<span style={{fontWeight:400,fontSize:12,color:"#A07840"}}>{deptEmps.length}名</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",border:"1px solid #E8D5B0",borderRadius:"0 0 8px 8px",overflow:"hidden",fontSize:13}}>
              <thead>
                <tr style={{background:"#FAF3E6"}}>
                  <th style={{padding:"6px 12px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #E8D5B0",width:80}}>ID</th>
                  <th style={{padding:"6px 12px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #E8D5B0"}}>氏名</th>
                  <th style={{padding:"6px 12px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #E8D5B0",width:110}}>役職名</th>
                  <th style={{padding:"6px 12px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #E8D5B0",width:110}}>職員区分</th>
                  <th style={{padding:"6px 12px",textAlign:"center",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #E8D5B0",width:60}}></th>
                </tr>
              </thead>
              <tbody>
                {deptEmps.map((emp,i)=>(
                  <tr key={emp.id} style={{background:i%2===0?"#fff":"#FDFAF5"}}>
                    <td style={{padding:"8px 12px",color:"#9ca3af",fontSize:12,borderBottom:"1px solid #F0E8D8",whiteSpace:"nowrap"}}>{emp.id}</td>
                    <td style={{padding:"8px 12px",fontWeight:700,color:"#4A3020",borderBottom:"1px solid #F0E8D8",whiteSpace:"nowrap"}}>{emp.name}</td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #F0E8D8"}}>
                      {emp.roleTitle
                        ? <span style={{fontSize:12,fontWeight:600,color:"#92400e"}}>{emp.roleTitle}</span>
                        : <span style={{fontSize:12,color:"#d1d5db"}}>─</span>}
                    </td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #F0E8D8"}}>
                      {emp.jobCategory
                        ? <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#e0f2fe",color:"#0369a1"}}>{emp.jobCategory}</span>
                        : <span style={{fontSize:12,color:"#d1d5db"}}>─</span>}
                    </td>
                    <td style={{padding:"8px 12px",textAlign:"center",borderBottom:"1px solid #F0E8D8"}}>
                      <button style={S.qrBtn} onClick={()=>setEditEmp({...emp,qualifications:(emp.qualifications||[]).join(","),certTrainings:(emp.certTrainings||[]).join(",")})}>編集</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* 今年度退職者 */}
      {retiredThisYearEmps.length>0&&(
        <div style={{marginTop:20}}>
          <div style={{fontSize:13,fontWeight:700,color:"#6b7280",padding:"7px 14px",background:"#f3f4f6",borderRadius:"8px 8px 0 0",border:"1px solid #e5e7eb",borderBottom:"none"}}>
            🚪 {fiscalYear}年度退職者　<span style={{fontWeight:400,fontSize:12}}>{retiredThisYearEmps.length}名</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",border:"1px solid #e5e7eb",borderRadius:"0 0 8px 8px",overflow:"hidden",fontSize:13,opacity:0.7}}>
            <thead>
              <tr style={{background:"#f9fafb"}}>
                <th style={{padding:"6px 12px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #e5e7eb",width:80}}>ID</th>
                <th style={{padding:"6px 12px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #e5e7eb"}}>氏名</th>
                <th style={{padding:"6px 12px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #e5e7eb"}}>部署</th>
                <th style={{padding:"6px 12px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #e5e7eb",width:120}}>退職日</th>
                <th style={{padding:"6px 12px",textAlign:"center",fontWeight:600,color:"#6b7280",fontSize:12,borderBottom:"1px solid #e5e7eb",width:60}}></th>
              </tr>
            </thead>
            <tbody>
              {retiredThisYearEmps.map((emp,i)=>(
                <tr key={emp.id} style={{background:i%2===0?"#fff":"#f9fafb"}}>
                  <td style={{padding:"8px 12px",color:"#9ca3af",fontSize:12,borderBottom:"1px solid #f0f0f0"}}>{emp.id}</td>
                  <td style={{padding:"8px 12px",fontWeight:700,color:"#9ca3af",textDecoration:"line-through",borderBottom:"1px solid #f0f0f0",whiteSpace:"nowrap"}}>{emp.name}</td>
                  <td style={{padding:"8px 12px",color:"#9ca3af",fontSize:12,borderBottom:"1px solid #f0f0f0"}}>{emp.dept}</td>
                  <td style={{padding:"8px 12px",color:"#9ca3af",fontSize:12,borderBottom:"1px solid #f0f0f0"}}>{emp.retireDate}</td>
                  <td style={{padding:"8px 12px",textAlign:"center",borderBottom:"1px solid #f0f0f0"}}>
                    <button style={S.qrBtn} onClick={()=>setEditEmp({...emp,qualifications:(emp.qualifications||[]).join(","),certTrainings:(emp.certTrainings||[]).join(",")})}>編集</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
        {[{label:"全体平均",value:`${avg}件`,color:"#C89A55",sub:"提出/人"},{label:"平均加点",value:`+${ranked.length>0?(ranked.reduce((s,r)=>s+r.points,0)/ranked.length).toFixed(1):0}点`,color:"#7c3aed",sub:"人事考課"},{label:"⭐5件以上",value:`${reach5}名`,color:"#d97706",sub:"+1点達成"},{label:"🏆10件以上",value:`${reach10}名`,color:"#16a34a",sub:"+2点達成"}]
          .map(c=><div key={c.label} style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:12,padding:"12px 10px",textAlign:"center"}}><div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>{c.label}</div><div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.value}</div><div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{c.sub}</div></div>)}
      </div>
      <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,overflow:"hidden"}}>
        <div style={{background:"#C89A55",color:"#fff",padding:"12px 16px",fontWeight:700,fontSize:14}}>🏅 {fiscalYear}年度 復命書提出ランキング</div>
        {ranked.map((emp,i)=>{const rank=i+1;const rs=rankStyle(rank);const badge=getBadge(emp.count);const bc=emp.count>=20?"#b45309":emp.count>=15?"#0369a1":emp.count>=10?"#7c3aed":emp.count>=5?"#d97706":"#C89A55";
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
  const fyInternals=internals.filter(t=>inFiscalYear(t.date,fiscalYear)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const [selT,setSelT]=useState(null);
  const [filterPending,setFilterPending]=useState(true);
  const [bulkMode,setBulkMode]=useState(false);
  const [bulkIds,setBulkIds]=useState([]);
  const [bulkBusy,setBulkBusy]=useState(false);
  const curT=selT||fyInternals[0]||null;
  const toggleBulk=id=>setBulkIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const applyBulk=async patch=>{
    if(bulkIds.length===0){alert("職員を選択してください");return;}
    setBulkBusy(true);
    for(const id of bulkIds){ await setIS(id,curT.id,patch); }
    setBulkBusy(false); setBulkIds([]);
  };

  const isReportRequired=(emp,t)=>{ if(t.noReport)return false; const s=getIS(emp.id,t.id); return (t.requiredEmpIds||[]).includes(emp.id)||s.attendance==="参加済"; };
  const getEmpStatus=(emp,t)=>{ const s=getIS(emp.id,t.id); if(s.reportConfirmed) return "done"; if(s.report==="提出済") return "waitConfirm"; if(isReportRequired(emp,t)) return "pending"; return "noReq"; };
  const targetEmps=t=>employees.filter(e=>isTargetedFor(t,e));
  const unreportedCount=t=>targetEmps(t).filter(e=>{ const s=getIS(e.id,t.id); return isReportRequired(e,t)&&s.report!=="提出済"&&!s.reportConfirmed; }).length;
  const avatarColor=i=>[["#E6F1FB","#185FA5"],["#EAF3DE","#3B6D11"],["#FAEEDA","#854F0B"],["#FCEBEB","#A32D2D"],["#F1EFE8","#5F5E5A"]][i%5];
  const initials=name=>name?name.charAt(0):"?";

  const curTargets=curT?targetEmps(curT):[];
  const reqCount=curT?curTargets.filter(e=>isReportRequired(e,curT)).length:0;
  const unreported=curT?curTargets.filter(e=>isReportRequired(e,curT)&&getIS(e.id,curT.id).report!=="提出済"&&!getIS(e.id,curT.id).reportConfirmed).length:0;
  const waitConfirm=curT?curTargets.filter(e=>{ const s=getIS(e.id,curT.id); return s.report==="提出済"&&!s.reportConfirmed; }).length:0;

  const empList=curT?[...curTargets].sort((a,b)=>a.name.localeCompare(b.name,"ja")):[];
  // 復命書不要の研修・一括登録モードは常に全員表示
  const displayList=(bulkMode||(curT&&curT.noReport))?empList:(filterPending&&curT?empList.filter(e=>getEmpStatus(e,curT)==="pending"):empList);

  return(
    <div>
      {/* 上部サマリーカード（既存のまま） */}
      <div style={{display:"flex",gap:10,overflowX:"auto",padding:"12px 0 16px"}}>
        {fyInternals.map(t=>{
          const tgt=targetEmps(t);
          const n=tgt.length;
          const attended=tgt.filter(e=>getIS(e.id,t.id).attendance==="参加済").length;
          const watched=tgt.filter(e=>getIS(e.id,t.id).video==="視聴済").length;
          const confirmed=tgt.filter(e=>getIS(e.id,t.id).reportConfirmed===true).length;
          return(
            <div key={t.id} style={S.sCard}>
              {t.required&&<span style={S.reqBadge}>必須</span>}
              <div style={{fontSize:11,fontWeight:700,color:"#4A3020",margin:"4px 0 2px",lineHeight:1.3}}>{t.title}</div>
              <div style={{fontSize:10,color:"#9ca3af",marginBottom:8}}>📅 {formatDate(t.date)}</div>
              <MiniBar label="👥 当日参加" v={attended} n={n} color="#16a34a"/>
              <MiniBar label="▶ 動画視聴" v={watched} n={n} color="#7c3aed"/>
              <MiniBar label="✅ 確認済" v={confirmed} n={n} color="#C89A55"/>
              <button style={{...S.qrBtn,marginTop:8,width:"100%"}} onClick={()=>onQR(t)}>QR生成</button>
            </div>
          );
        })}
      </div>
      {fyInternals.length===0&&<div style={S.empty}>{fiscalYear}年度の内部研修はありません</div>}

      {/* 下部：カード形式の職員一覧 */}
      {fyInternals.length>0&&curT&&<>
        {/* 研修セレクター */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {fyInternals.map(t=>{
            const cnt=unreportedCount(t);
            const isActive=curT.id===t.id;
            return(
              <div key={t.id} style={{position:"relative",display:"inline-block"}}>
                <button onClick={()=>setSelT(t)} style={{padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:isActive?"#4A3020":"#f3f4f6",color:isActive?"#fff":"#374151",whiteSpace:"nowrap",lineHeight:1.3}}>
                  <div>{t.title}</div>
                  <div style={{fontSize:10,fontWeight:400,opacity:0.8}}>{formatDate(t.date)}</div>
                </button>
                {cnt>0&&<span style={{position:"absolute",top:-5,right:-5,minWidth:16,height:16,borderRadius:8,background:"#E24B4A",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:"1.5px solid #fff"}}>{cnt}</span>}
              </div>
            );
          })}
        </div>

        {/* サマリー */}
        <div style={{marginBottom:12}}>
          <div style={{padding:"10px 12px",background:"#fef2f2",borderRadius:12,textAlign:"center",border:"1px solid #fca5a5"}}>
            <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>復命書 未提出</div>
            <div style={{fontSize:22,fontWeight:700,color:"#dc2626"}}>{unreported}<span style={{fontSize:12,fontWeight:400,color:"#9ca3af"}}>/{reqCount}名</span></div>
          </div>
        </div>

        {/* 表示切り替え・一括登録モード */}
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
          {!curT.noReport&&!bulkMode&&[["未対応のみ",true],["全員表示",false]].map(([l,v])=>(
            <button key={l} onClick={()=>setFilterPending(v)} style={{padding:"4px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:filterPending===v?"#374151":"#f3f4f6",color:filterPending===v?"#fff":"#6b7280"}}>
              {l}
            </button>
          ))}
          <button onClick={()=>{setBulkMode(v=>!v);setBulkIds([]);}} style={{padding:"4px 14px",borderRadius:20,border:"1.5px solid #7c3aed",cursor:"pointer",fontSize:12,fontWeight:700,background:bulkMode?"#7c3aed":"#fff",color:bulkMode?"#fff":"#7c3aed"}}>
            {bulkMode?"✕ 一括登録を終了":"☑ 一括登録モード"}
          </button>
        </div>
        {/* 一括操作バー */}
        {bulkMode&&(
          <div style={{position:"sticky",top:0,zIndex:10,background:"#f5f3ff",border:"1.5px solid #c4b5fd",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"#7c3aed",marginBottom:8}}>
              ☑ {bulkIds.length}名選択中 ─ 職員をタップして選択し、下のボタンで一括登録
              {bulkIds.length>0&&<button onClick={()=>setBulkIds([])} style={{marginLeft:8,fontSize:11,padding:"2px 8px",borderRadius:8,border:"1px solid #c4b5fd",background:"#fff",color:"#7c3aed",cursor:"pointer"}}>選択クリア</button>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button disabled={bulkBusy} onClick={()=>applyBulk({attendance:"参加済"})} style={{fontSize:12,padding:"7px 12px",borderRadius:20,border:"none",background:"#16a34a",color:"#fff",fontWeight:700,cursor:"pointer"}}>✅ 参加済にする</button>
              <button disabled={bulkBusy} onClick={()=>applyBulk({video:"視聴済"})} style={{fontSize:12,padding:"7px 12px",borderRadius:20,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,cursor:"pointer"}}>▶ 視聴済にする</button>
              {!curT.noReport&&<button disabled={bulkBusy} onClick={()=>applyBulk({report:"提出済",reportConfirmed:true})} style={{fontSize:12,padding:"7px 12px",borderRadius:20,border:"none",background:"#C89A55",color:"#fff",fontWeight:700,cursor:"pointer"}}>📋 復命書確認済にする</button>}
              {bulkBusy&&<span style={{fontSize:12,color:"#7c3aed",fontWeight:600,alignSelf:"center"}}>登録中…</span>}
            </div>
          </div>
        )}
        {/* 職員カードリスト */}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {displayList.length===0&&<div style={{textAlign:"center",padding:20,color:"#9ca3af",fontSize:13}}>全員対応済みです ✅</div>}
          {displayList.map((emp,i)=>{
            const s=getIS(emp.id,curT.id);
            const status=getEmpStatus(emp,curT);
            const req=isReportRequired(emp,curT);
            const [bg,fg]=avatarColor(i);
            const isDone=status==="done";
            const bulkSel=bulkIds.includes(emp.id);
            return(
              <div key={emp.id}
                onClick={bulkMode?()=>toggleBulk(emp.id):undefined}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:bulkMode&&bulkSel?"#ede9fe":isDone?"#f9fafb":"#fff",borderRadius:12,border:bulkMode&&bulkSel?"2px solid #7c3aed":`1px solid ${isDone?"#e5e7eb":"#E8D5B0"}`,opacity:bulkMode?1:isDone?0.6:1,cursor:bulkMode?"pointer":"default"}}>
                {bulkMode&&<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${bulkSel?"#7c3aed":"#d1d5db"}`,background:bulkSel?"#7c3aed":"#fff",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0}}>{bulkSel?"✓":""}</div>}
                <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,flexShrink:0,background:bg,color:fg}}>{initials(emp.name)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"#4A3020"}}>{emp.name}</span>
                    <span style={{fontSize:11,color:"#9ca3af"}}>{emp.dept}</span>
                  </div>
                  <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                    {s.attendance==="参加済"?<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#dcfce7",color:"#15803d",fontWeight:600}}>参加済{s.attendedSession==="1"?"①":s.attendedSession==="2"?"②":""}</span>
                      :<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#f3f4f6",color:"#6b7280",fontWeight:600}}>欠席</span>}
                    {req&&(isDone?<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#dcfce7",color:"#15803d",fontWeight:600}}>確認済</span>
                      :status==="waitConfirm"?<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#fef3c7",color:"#92400e",fontWeight:600}}>提出済</span>
                      :<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#fee2e2",color:"#dc2626",fontWeight:600}}>未提出</span>)}
                    {!req&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:"#f3f4f6",color:"#9ca3af"}}>必須外</span>}
                  </div>
                </div>
                {!bulkMode&&<div style={{display:"flex",gap:5,flexShrink:0}}>
                  {s.attendance!=="参加済"&&<button style={{fontSize:11,padding:"5px 10px",borderRadius:20,border:"1px solid #16a34a",background:"#f0fdf4",color:"#15803d",cursor:"pointer",fontWeight:600}} onClick={()=>setIS(emp.id,curT.id,"attendance","参加済")}>参加✓</button>}
                  {s.attendance==="参加済"&&s.report!=="提出済"&&status!=="done"&&<button style={{fontSize:11,padding:"5px 10px",borderRadius:20,border:"1px solid #e5e7eb",background:"#f9fafb",color:"#9ca3af",cursor:"pointer"}} onClick={()=>setIS(emp.id,curT.id,"attendance","未参加")}>取消</button>}
                </div>}
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}

const LOCATIONS=["本館２階 ホール","新館３階 会議室","サイタ１階 地域交流ルーム","その他"];
function LocationSelect({value,onChange,accentColor="#C89A55"}){
  return(
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {LOCATIONS.map(l=>{
        const sel=value===l;
        return(
          <button key={l} type="button" onClick={()=>onChange(sel?"":l)}
            style={{padding:"8px 14px",borderRadius:20,border:`2px solid ${sel?accentColor:"#e5e7eb"}`,background:sel?accentColor:"#fff",color:sel?"#fff":"#374151",fontWeight:sel?700:500,fontSize:12,cursor:"pointer"}}>
            {sel?"✓ ":""}{l}
          </button>
        );
      })}
    </div>
  );
}

function InternalTrainingForm({data,onChange,onSave,onCancel,title,allEmployees}){
  const [selDept,setSelDept]=useState("すべて");
  const [showReqSel,setShowReqSel]=useState((data.requiredEmpIds||[]).length>0);
  const [showTargetSel,setShowTargetSel]=useState((data.targetEmpIds||[]).length>0);
  const [selDeptT,setSelDeptT]=useState("すべて");
  const depts=["すべて",...sortDepts(Array.from(new Set((allEmployees||[]).map(e=>e.dept).filter(Boolean))))];
  const filteredEmps=selDept==="すべて"?(allEmployees||[]):(allEmployees||[]).filter(e=>e.dept===selDept);
  const toggle=id=>{ const cur=data.requiredEmpIds||[]; onChange(p=>({...p,requiredEmpIds:cur.includes(id)?cur.filter(x=>x!==id):[...cur,id]})); };
  const toggleDept=()=>{ const ids=filteredEmps.map(e=>e.id); const allSel=ids.every(id=>(data.requiredEmpIds||[]).includes(id)); onChange(p=>({...p,requiredEmpIds:allSel?(p.requiredEmpIds||[]).filter(id=>!ids.includes(id)):[...new Set([...(p.requiredEmpIds||[]),...ids])]})); };
  const filteredEmpsT=selDeptT==="すべて"?(allEmployees||[]):(allEmployees||[]).filter(e=>e.dept===selDeptT);
  const toggleTarget=id=>{ const cur=data.targetEmpIds||[]; onChange(p=>({...p,targetEmpIds:cur.includes(id)?cur.filter(x=>x!==id):[...cur,id]})); };
  const toggleDeptT=()=>{ const ids=filteredEmpsT.map(e=>e.id); const allSel=ids.every(id=>(data.targetEmpIds||[]).includes(id)); onChange(p=>({...p,targetEmpIds:allSel?(p.targetEmpIds||[]).filter(id=>!ids.includes(id)):[...new Set([...(p.targetEmpIds||[]),...ids])]})); };
  const toggleGroupT=ids=>{ const allSel=ids.every(id=>(data.targetEmpIds||[]).includes(id)); onChange(p=>({...p,targetEmpIds:allSel?(p.targetEmpIds||[]).filter(id=>!ids.includes(id)):[...new Set([...(p.targetEmpIds||[]),...ids])]})); };
  const seishainIdsT=(allEmployees||[]).filter(e=>(e.jobCategory||"")==="正職員").map(e=>e.id);
  const otherIdsT=(allEmployees||[]).filter(e=>(e.jobCategory||"")!=="正職員").map(e=>e.id);
  return(
    <div style={S.formBox}>
      <div style={{fontWeight:700,color:"#A07840",marginBottom:12}}>{title}</div>
      {[{key:"title",label:"研修名",placeholder:"例：コンプライアンス研修"}]
        .map(f=>(
          <div key={f.key} style={{marginBottom:10}}>
            <label style={S.label}>{f.label}</label>
            <input type={f.type||"text"} style={S.input} placeholder={f.placeholder||""} value={data[f.key]||""} onChange={e=>onChange(p=>({...p,[f.key]:e.target.value}))}/>
          </div>
        ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <label style={S.label}>開催日①</label>
          <input type="date" style={S.input} value={data.date||""} onChange={e=>onChange(p=>({...p,date:e.target.value}))}/>
        </div>
        <div>
          <label style={S.label}>開催日②（同内容で2回開催する場合）</label>
          <input type="date" style={S.input} value={data.date2||""} onChange={e=>onChange(p=>({...p,date2:e.target.value}))}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <label style={S.label}>開始時間</label>
          <input type="time" style={S.input} value={data.startTime||""} onChange={e=>onChange(p=>({...p,startTime:e.target.value}))}/>
        </div>
        <div>
          <label style={S.label}>終了時間</label>
          <input type="time" style={S.input} value={data.endTime||""} onChange={e=>onChange(p=>({...p,endTime:e.target.value}))}/>
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <label style={S.label}>場所</label>
        <LocationSelect value={data.location||""} onChange={v=>onChange(p=>({...p,location:v}))}/>
      </div>
      {[{key:"videoUrl",label:"動画URL（後から追加可）",placeholder:"https://www.youtube.com/embed/..."},{key:"description",label:"説明",placeholder:"研修の概要"}]
        .map(f=>(
          <div key={f.key} style={{marginBottom:10}}>
            <label style={S.label}>{f.label}</label>
            <input type={f.type||"text"} style={S.input} placeholder={f.placeholder||""} value={data[f.key]||""} onChange={e=>onChange(p=>({...p,[f.key]:e.target.value}))}/>
          </div>
        ))}
      {/* 参加者の指定（指定なし＝用務を除く全職員に表示） */}
      <div style={{marginBottom:12,padding:"10px 12px",background:"#eff6ff",borderRadius:10,border:"1px solid #93c5fd"}}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:"#2563eb"}}>
          <input type="checkbox" checked={showTargetSel} onChange={e=>{setShowTargetSel(e.target.checked); if(!e.target.checked)onChange(p=>({...p,targetEmpIds:[]}));}} style={{width:16,height:16,accentColor:"#2563eb"}}/>
          👥 参加者を指定{(data.targetEmpIds||[]).length>0&&`（${(data.targetEmpIds||[]).length}名選択中）`}
        </label>
        <div style={{fontSize:11,color:"#6b7280",marginTop:4}}>※ 指定しない場合は用務を除く全職員の研修タブに表示されます</div>
        {showTargetSel&&<div style={{marginTop:10}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
            {depts.map(d=>(
              <button key={d} type="button" onClick={()=>setSelDeptT(d)} style={{padding:"3px 10px",borderRadius:14,border:"1.5px solid",borderColor:selDeptT===d?"#2563eb":"#e5e7eb",background:selDeptT===d?"#dbeafe":"#fff",color:selDeptT===d?"#2563eb":"#374151",fontSize:11,fontWeight:selDeptT===d?700:400,cursor:"pointer"}}>{d}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            <button type="button" onClick={toggleDeptT} style={{fontSize:11,color:"#2563eb",background:"#dbeafe",border:"1px solid #93c5fd",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>
              {filteredEmpsT.every(e=>(data.targetEmpIds||[]).includes(e.id))?"✓ "+selDeptT+"の選択を解除":"＋ "+selDeptT+"を全員選択"}
            </button>
            <button type="button" onClick={()=>toggleGroupT(seishainIdsT)} style={{fontSize:11,color:"#7c3aed",background:"#ede9fe",border:"1px solid #c4b5fd",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>
              {seishainIdsT.length>0&&seishainIdsT.every(id=>(data.targetEmpIds||[]).includes(id))?"✓ 正職員の選択を解除":"＋ 正職員を一括選択"}
            </button>
            <button type="button" onClick={()=>toggleGroupT(otherIdsT)} style={{fontSize:11,color:"#d97706",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>
              {otherIdsT.length>0&&otherIdsT.every(id=>(data.targetEmpIds||[]).includes(id))?"✓ 正職員以外の選択を解除":"＋ 正職員以外を一括選択"}
            </button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:150,overflowY:"auto",padding:"6px",background:"#fff",borderRadius:8,border:"1px solid #93c5fd"}}>
            {filteredEmpsT.map(e=>{
              const sel=(data.targetEmpIds||[]).includes(e.id);
              return(<label key={e.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,cursor:"pointer",padding:"3px 8px",borderRadius:16,border:"1.5px solid",borderColor:sel?"#2563eb":"#e5e7eb",background:sel?"#dbeafe":"#fff",color:sel?"#2563eb":"#374151"}}>
                <input type="checkbox" checked={sel} onChange={()=>toggleTarget(e.id)} style={{display:"none"}}/>{e.name}
              </label>);
            })}
            {filteredEmpsT.length===0&&<div style={{fontSize:11,color:"#9ca3af"}}>この部署の職員はいません</div>}
          </div>
        </div>}
      </div>
      {/* 復命書不要（説明会など） */}
      <div style={{marginBottom:12,padding:"10px 12px",background:"#f0fdf4",borderRadius:10,border:"1px solid #86efac"}}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:"#15803d"}}>
          <input type="checkbox" checked={data.noReport||false} onChange={e=>onChange(p=>({...p,noReport:e.target.checked}))} style={{width:16,height:16,accentColor:"#16a34a"}}/>
          📋 復命書不要（参加のみ記録する説明会など）
        </label>
      </div>
      {/* 復命書必須対象者（チェックで選択画面を表示） */}
      {!data.noReport&&<div style={{marginBottom:12,padding:"10px 12px",background:"#fef2f2",borderRadius:10,border:"1px solid #fca5a5"}}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:"#dc2626"}}>
          <input type="checkbox" checked={showReqSel} onChange={e=>{setShowReqSel(e.target.checked); if(!e.target.checked)onChange(p=>({...p,requiredEmpIds:[]}));}} style={{width:16,height:16,accentColor:"#dc2626"}}/>
          📋 復命書必須の対象者を指定{(data.requiredEmpIds||[]).length>0&&`（${(data.requiredEmpIds||[]).length}名選択中）`}
        </label>
        {showReqSel&&<div style={{marginTop:10}}>
        <div style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>※ 参加済みの職員には自動で必須になります</div>
        {/* 部署フィルター */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
          {depts.map(d=>(
            <button key={d} type="button" onClick={()=>setSelDept(d)} style={{padding:"3px 10px",borderRadius:14,border:"1.5px solid",borderColor:selDept===d?"#dc2626":"#e5e7eb",background:selDept===d?"#fee2e2":"#fff",color:selDept===d?"#dc2626":"#374151",fontSize:11,fontWeight:selDept===d?700:400,cursor:"pointer"}}>{d}</button>
          ))}
        </div>
        {/* 一括選択 */}
        <button type="button" onClick={toggleDept} style={{fontSize:11,color:"#dc2626",background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:8,padding:"3px 10px",cursor:"pointer",marginBottom:8}}>
          {filteredEmps.every(e=>(data.requiredEmpIds||[]).includes(e.id))?"✓ "+selDept+"の選択を解除":"＋ "+selDept+"を全員選択"}
        </button>
        {/* 職員一覧 */}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:150,overflowY:"auto",padding:"6px",background:"#fff",borderRadius:8,border:"1px solid #fca5a5"}}>
          {filteredEmps.map(e=>{
            const sel=(data.requiredEmpIds||[]).includes(e.id);
            return(<label key={e.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,cursor:"pointer",padding:"3px 8px",borderRadius:16,border:"1.5px solid",borderColor:sel?"#dc2626":"#e5e7eb",background:sel?"#fee2e2":"#fff",color:sel?"#dc2626":"#374151"}}>
              <input type="checkbox" checked={sel} onChange={()=>toggle(e.id)} style={{display:"none"}}/>{e.name}
            </label>);
          })}
          {filteredEmps.length===0&&<div style={{fontSize:11,color:"#9ca3af"}}>この部署の職員はいません</div>}
        </div>
        </div>}
      </div>}
      <div style={{display:"flex",gap:8}}>
        <button style={S.btn} onClick={onSave}>保存する</button>
        <button style={{...S.btn,background:"#f3f4f6",color:"#374151"}} onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}

function InternalManageTab({internals,setInternals,deleteInternal,employees}){
  const [showAdd,setShowAdd]=useState(false);
  const [editId,setEditId]=useState(null);
  const [newT,setNewT]=useState({title:"",date:"",startTime:"17:30",endTime:"18:30",location:"",required:false,requiredEmpIds:[],videoUrl:"",description:""});
  const [editT,setEditT]=useState(null);

  const add=async()=>{
    if(!newT.title||!newT.date)return;
    const t={...newT,id:"T"+String(Date.now()).slice(-6)};
    await setInternals(p=>[...p,t]);
    setNewT({title:"",date:"",startTime:"17:30",endTime:"18:30",location:"",required:false,requiredEmpIds:[],videoUrl:"",description:""});setShowAdd(false);
  };
  const startEdit=t=>{ setEditId(t.id); setEditT({...t,requiredEmpIds:t.requiredEmpIds||[]}); };
  const saveEdit=async()=>{
    if(!editT.title||!editT.date)return;
    await setInternals(p=>p.map(t=>t.id===editId?{...editT}:t));
    setEditId(null); setEditT(null);
  };

  return(
    <div style={{padding:4}}>
      <button style={{...S.btn,marginBottom:16}} onClick={()=>{setShowAdd(!showAdd);setEditId(null);}}>＋ 研修を追加</button>
      {showAdd&&<InternalTrainingForm data={newT} onChange={setNewT} onSave={add} onCancel={()=>setShowAdd(false)} title="新しい内部研修を登録" allEmployees={employees}/>}
      {internals.map(t=>(
        <div key={t.id}>
          <div style={{...S.card,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={S.cardTitle}>{t.title}</div>
              <div style={S.cardDate}>📅 {t.date2?<>① {formatDate(t.date)}　② {formatDate(t.date2)}</>:formatDate(t.date)}
                {(t.requiredEmpIds||[]).length>0&&<span style={{marginLeft:8,fontSize:11,color:"#dc2626",fontWeight:600}}>復命書必須 {(t.requiredEmpIds||[]).length}名</span>}
                {t.videoUrl?<span style={{marginLeft:8,color:"#7c3aed",fontSize:11}}>▶ 動画あり</span>:<span style={{marginLeft:8,color:"#9ca3af",fontSize:11}}>動画未設定</span>}
              </div>
            </div>
            <div className="btn-col-sp" style={{display:"flex",gap:6,flexShrink:0}}>
              <button style={{...S.qrBtn,background:"#eff6ff",borderColor:"#bfdbfe",color:"#2563eb"}} onClick={()=>editId===t.id?setEditId(null):startEdit(t)}>
                {editId===t.id?"閉じる":"編集"}
              </button>
              <button style={S.delBtn} onClick={()=>{if(window.confirm("削除しますか？"))deleteInternal(t.id);}}>削除</button>
            </div>
          </div>
          {editId===t.id&&editT&&(
            <div style={{marginTop:-8,marginBottom:8}}>
              <InternalTrainingForm data={editT} onChange={setEditT} onSave={saveEdit} onCancel={()=>{setEditId(null);setEditT(null);}} title="研修を編集" allEmployees={employees}/>
            </div>
          )}
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
          <div style={{fontSize:12,color:"#6b7280",marginBottom:10}}>📅 {formatDate(x.date)} ｜ 🏢 {x.organizer} ｜ 📍 {x.location}</div>
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
  const [newX,setNewX]=useState({title:"",date:"",organizer:"",location:"",targetEmpIds:[],pdfUrl:null,pdfPath:null,pdfName:null});
  const [selDept,setSelDept]=useState("すべて");
  const depts=["すべて",...sortDepts(Array.from(new Set(employees.map(e=>e.dept).filter(Boolean))))];
  const filteredEmps=selDept==="すべて"?employees:employees.filter(e=>e.dept===selDept);
  const toggleEmp=id=>setNewX(p=>({...p,targetEmpIds:p.targetEmpIds.includes(id)?p.targetEmpIds.filter(x=>x!==id):[...p.targetEmpIds,id]}));
  const toggleDeptAll=()=>{
    const ids=filteredEmps.map(e=>e.id);
    const allSelected=ids.every(id=>newX.targetEmpIds.includes(id));
    setNewX(p=>({...p,targetEmpIds:allSelected?p.targetEmpIds.filter(id=>!ids.includes(id)):[...new Set([...p.targetEmpIds,...ids])]}));
  };
  const handlePdf=e=>{const f=e.target.files[0];if(!f)return;if(f.size>20*1024*1024){alert("20MBを超えるファイルはアップロードできません");return;}setNewX(p=>({...p,_pendingFile:f,pdfName:f.name}));};
  const handleExistPdf=async(xId,e)=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size>20*1024*1024){alert("20MBを超えるファイルはアップロードできません");return;}
    try{
      const result=await db.uploadExternalPdf(xId,f);
      setExternals(p=>p.map(x=>x.id===xId?{...x,...result}:x));
    }catch(err){alert("アップロードに失敗しました: "+err.message);}
  };
  const handleExistNoticePdf=async(xId,e)=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size>20*1024*1024){alert("20MBを超えるファイルはアップロードできません");return;}
    try{
      const result=await db.uploadExternalNoticePdf(xId,f);
      setExternals(p=>p.map(x=>x.id===xId?{...x,...result}:x));
    }catch(err){alert("アップロードに失敗しました: "+err.message);}
  };
  const add=async()=>{
    if(!newX.title||!newX.date||newX.targetEmpIds.length===0)return;
    const xId="X"+String(Date.now()).slice(-6);
    let pdfUrl=null,pdfPath=null,pdfName=newX.pdfName||null;
    // まず研修をDBに保存してからPDFをアップロード
    const x={...newX,id:xId,pdfUrl,pdfPath,pdfName};
    await setExternals(p=>[...p,x]);
    if(newX._pendingFile){
      try{
        const result=await db.uploadExternalPdf(xId,newX._pendingFile);
        setExternals(p=>p.map(ex=>ex.id===xId?{...ex,...result}:ex));
      }catch(err){alert("PDF アップロードに失敗しました: "+err.message);}
    }
    setNewX({title:"",date:"",organizer:"",location:"",targetEmpIds:[],pdfUrl:null,pdfPath:null,pdfName:null});setShowAdd(false);
  };
  return(
    <div style={{padding:4}}>
      <button style={{...S.btn,marginBottom:16}} onClick={()=>setShowAdd(!showAdd)}>＋ 外部研修を申し込み登録</button>
      {showAdd&&(
        <div style={S.formBox}>
          <div style={{fontWeight:700,color:"#A07840",marginBottom:12}}>外部研修を登録</div>
          {[{key:"title",label:"研修名",placeholder:"例：DXセミナー"},{key:"date",label:"実施日",type:"date"},{key:"organizer",label:"主催団体",placeholder:"例：総務省"},{key:"location",label:"場所",placeholder:"例：東京"}]
            .map(f=><div key={f.key} style={{marginBottom:10}}><label style={S.label}>{f.label}</label><input type={f.type||"text"} style={S.input} placeholder={f.placeholder||""} value={newX[f.key]} onChange={e=>setNewX(p=>({...p,[f.key]:e.target.value}))}/></div>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={S.label}>開始時間（任意）</label><input type="time" style={S.input} value={newX.startTime||""} onChange={e=>setNewX(p=>({...p,startTime:e.target.value}))}/></div>
            <div><label style={S.label}>終了時間（任意）</label><input type="time" style={S.input} value={newX.endTime||""} onChange={e=>setNewX(p=>({...p,endTime:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={S.label}>研修要綱PDF（任意）</label>
            <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1.5px dashed #E8D5B0",background:"#FDF6EC",cursor:"pointer"}}>
              <input type="file" accept="application/pdf" style={{display:"none"}} onChange={handlePdf}/>
              <span style={{fontSize:20}}>📄</span>
              <div><div style={{fontSize:13,fontWeight:600,color:"#A07840"}}>{newX.pdfName?"✅ "+newX.pdfName:"クリックしてPDFをアップロード"}</div></div>
            </label>
          </div>
          <div style={{marginBottom:14}}>
            <label style={S.label}>対象者を選択（{newX.targetEmpIds.length}名選択中）</label>
            {newX.targetEmpIds.length>0&&(
              <div style={{marginBottom:8,padding:"8px 10px",background:"#FDF6EC",borderRadius:10,border:"1px solid #E8D5B0"}}>
                <div style={{fontSize:11,color:"#A07840",fontWeight:600,marginBottom:4}}>選択中の職員：</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {newX.targetEmpIds.map(id=>{const emp=employees.find(e=>e.id===id);return emp?(
                    <span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,padding:"2px 8px",background:"#fff",border:"1px solid #C89A55",borderRadius:16,color:"#4A3020"}}>
                      {emp.name}
                      <button onClick={()=>toggleEmp(id)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:12,padding:0,lineHeight:1}}>×</button>
                    </span>
                  ):null;})}
                </div>
              </div>
            )}
            {/* 部署フィルター */}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {depts.map(d=>(
                <button key={d} onClick={()=>setSelDept(d)} style={{padding:"4px 12px",borderRadius:16,border:"1.5px solid",borderColor:selDept===d?"#C89A55":"#e5e7eb",background:selDept===d?"#FDF6EC":"#fff",color:selDept===d?"#A07840":"#374151",fontSize:12,fontWeight:selDept===d?700:400,cursor:"pointer"}}>
                  {d}
                </button>
              ))}
            </div>
            {/* 一括選択ボタン */}
            <div style={{marginBottom:8}}>
              <button onClick={toggleDeptAll} style={{fontSize:12,color:"#A07840",background:"#FDF6EC",border:"1px solid #E8D5B0",borderRadius:8,padding:"4px 12px",cursor:"pointer"}}>
                {filteredEmps.every(e=>newX.targetEmpIds.includes(e.id))?"✓ "+selDept+"の選択を解除":"＋ "+selDept+"を全員選択"}
              </button>
            </div>
            {/* 職員一覧 */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,maxHeight:200,overflowY:"auto",padding:"8px",background:"#f9fafb",borderRadius:10,border:"1px solid #e5e7eb"}}>
              {filteredEmps.map(e=>(
                <label key={e.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,cursor:"pointer",padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:newX.targetEmpIds.includes(e.id)?"#C89A55":"#e5e7eb",background:newX.targetEmpIds.includes(e.id)?"#FDF6EC":"#fff",color:newX.targetEmpIds.includes(e.id)?"#A07840":"#374151"}}>
                  <input type="checkbox" checked={newX.targetEmpIds.includes(e.id)} onChange={()=>toggleEmp(e.id)} style={{display:"none"}}/>{e.name}
                </label>
              ))}
              {filteredEmps.length===0&&<div style={{fontSize:12,color:"#9ca3af",padding:"8px"}}>この部署の職員はいません</div>}
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
              <div style={S.cardDate}>📅 {formatDate(x.date)} ｜ 🏢 {x.organizer} ｜ 📍 {x.location}</div>
              <div style={{marginTop:6,fontSize:12,color:"#6b7280"}}>対象: {targets.map(e=>e.name).join("、")}</div>
              <div style={{marginTop:8}}>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {x.pdfUrl
                    ?<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:"#15803d",fontWeight:600}}>📄 研修案内: {x.pdfName}</span><label style={{fontSize:11,color:"#A07840",cursor:"pointer",textDecoration:"underline"}}><input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>handleExistPdf(x.id,e)}/>差替</label></div>
                    :<label style={{fontSize:12,color:"#A07840",cursor:"pointer",textDecoration:"underline"}}><input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>handleExistPdf(x.id,e)}/>📄 研修案内をアップロード</label>}
                  {x.noticePdfUrl
                    ?<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:"#2563eb",fontWeight:600}}>📋 受講決定通知: {x.noticePdfName}</span><label style={{fontSize:11,color:"#2563eb",cursor:"pointer",textDecoration:"underline"}}><input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>handleExistNoticePdf(x.id,e)}/>差替</label></div>
                    :<label style={{fontSize:12,color:"#2563eb",cursor:"pointer",textDecoration:"underline"}}><input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>handleExistNoticePdf(x.id,e)}/>📋 受講決定通知をアップロード</label>}
                </div>
              </div>
            </div>
            <button style={S.delBtn} onClick={()=>{if(window.confirm("削除しますか？"))deleteExternal(x.id);}}>削除</button>
          </div>
        </div>
      );})}
    </div>
  );
}

function SeminarForm({data,onChange,onSave,onCancel,title}){
  return(
    <div style={S.formBox}>
      <div style={{fontWeight:700,color:"#A07840",marginBottom:12}}>{title}</div>
      {[{key:"title",label:"セミナー名",placeholder:"例：リブドゥ オンラインセミナー（年間視聴）"},{key:"date",label:"配信開始日（視聴できるようになる日）",type:"date"},{key:"organizer",label:"提供元",placeholder:"リブドゥ"},{key:"videoUrl",label:"視聴URL（入口URL または 埋め込みURL）",placeholder:"https://..."},{key:"description",label:"説明・視聴手順（任意）",placeholder:"例：ボタンを押すとログイン画面が開きます。\nメールアドレス：通達記載のもの\nパスワード：通達記載のもの\n動画は毎月更新されます。",multi:true}]
        .map(f=>(
          <div key={f.key} style={{marginBottom:10}}>
            <label style={S.label}>{f.label}</label>
            {f.multi
              ?<textarea rows={4} style={{...S.input,resize:"vertical",fontFamily:"inherit"}} placeholder={f.placeholder||""} value={data[f.key]||""} onChange={e=>onChange(p=>({...p,[f.key]:e.target.value}))}/>
              :<input type={f.type||"text"} style={S.input} placeholder={f.placeholder||""} value={data[f.key]||""} onChange={e=>onChange(p=>({...p,[f.key]:e.target.value}))}/>}
          </div>
        ))}
      <div style={{marginBottom:12,padding:"10px 12px",background:"#ecfeff",borderRadius:10,border:"1px solid #67e8f9"}}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:"#0e7490"}}>
          <input type="checkbox" checked={data.isPortal||false} onChange={e=>onChange(p=>({...p,isPortal:e.target.checked}))} style={{width:16,height:16,accentColor:"#0e7490"}}/>
          🚪 視聴ページの入口として登録（リブドゥのトップページ等・月の動画リストには表示されません）
        </label>
      </div>
      <div style={{fontSize:11,color:"#9ca3af",marginBottom:12,lineHeight:1.7}}>💡 入口は1件だけ登録し、毎月の動画はタイトル＋配信月（例: 6月配信→6/1）で1本ずつ登録してください。<br/>💡 リブドゥはログインが必要なため、説明欄にログイン方法を書いておくと職員が迷いません。</div>
      <div style={{display:"flex",gap:8}}>
        <button style={S.btn} onClick={onSave}>保存する</button>
        <button style={{...S.btn,background:"#f3f4f6",color:"#374151"}} onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}

function SeminarManageTab({seminars,upsertSeminar,deleteSeminar,employees,getSMV,fiscalYear}){
  const [showAdd,setShowAdd]=useState(false);
  const [editId,setEditId]=useState(null);
  const emptySem={title:"",date:"",organizer:"リブドゥ",videoUrl:"",description:"",isPortal:false};
  const [newS,setNewS]=useState(emptySem);
  const [editS,setEditS]=useState(null);
  const activeEmps=(employees||[]).filter(e=>e.isActive!==false&&(!e.retireDate||new Date(e.retireDate)>new Date()));

  const clean=s=>({...s,title:(s.title||"").trim(),organizer:(s.organizer||"リブドゥ").trim()||"リブドゥ",videoUrl:(s.videoUrl||"").trim()});
  const add=async()=>{
    if(!newS.title.trim()||!newS.date)return;
    await upsertSeminar({...clean(newS),id:"S"+String(Date.now()).slice(-6)});
    setNewS(emptySem); setShowAdd(false);
  };
  const saveEdit=async()=>{
    if(!editS.title.trim()||!editS.date)return;
    await upsertSeminar(clean(editS));
    setEditId(null); setEditS(null);
  };

  return(
    <div style={{padding:4}}>
      <div style={{display:"flex",alignItems:"center",gap:10,background:"#ecfeff",border:"1.5px solid #67e8f9",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
        <span style={{fontSize:24}}>📺</span>
        <div style={{fontSize:12,color:"#155e75"}}>リブドゥ オンラインセミナーの動画を<b>1本ずつ</b>登録します。「実施日」にはその動画の配信月（例: 5月配信なら 5/1）を設定してください。同じ月に複数本あればその数だけ登録します。職員の「📺 セミナー」タブに月ごとの動画一覧と視聴チェックが表示されます。</div>
      </div>
      <button style={{...S.btn,marginBottom:16}} onClick={()=>{setShowAdd(!showAdd);setEditId(null);}}>＋ セミナーを追加</button>
      {showAdd&&<SeminarForm data={newS} onChange={setNewS} onSave={add} onCancel={()=>setShowAdd(false)} title="新しいオンラインセミナーを登録"/>}
      {seminars.length===0&&<div style={S.empty}>オンラインセミナーはまだ登録されていません</div>}
      {[...seminars].sort((a,b)=>(b.isPortal?1:0)-(a.isPortal?1:0)||String(a.date).localeCompare(String(b.date))).map((s,i,arr)=>{
        const showMonthHeader=!s.isPortal&&(i===0||arr[i-1].isPortal||ymOf(arr[i-1].date)!==ymOf(s.date));
        return(
          <div key={s.id}>
            {showMonthHeader&&<div style={{fontWeight:800,fontSize:13,color:"#0e7490",margin:"14px 0 6px",borderBottom:"2px solid #67e8f9",paddingBottom:4}}>📅 {ymOf(s.date).replace("-","年")}月（{arr.filter(x=>!x.isPortal&&ymOf(x.date)===ymOf(s.date)).length}本）</div>}
            <div style={{...S.card,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={S.cardTitle}>{s.isPortal&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,background:"#ecfeff",color:"#0e7490",marginRight:6,border:"1px solid #67e8f9"}}>🚪 入口</span>}{s.title}</div>
                <div style={S.cardDate}>📅 {s.isPortal?"通年":`${ymLabel(ymOf(s.date))}配信`} ｜ 🏢 {s.organizer}
                  {s.videoUrl?<span style={{marginLeft:8,color:"#0e7490",fontSize:11}}>▶ URLあり</span>:<span style={{marginLeft:8,color:"#dc2626",fontSize:11}}>URL未設定</span>}
                </div>
              </div>
              <div className="btn-col-sp" style={{display:"flex",gap:6,flexShrink:0}}>
                <button style={{...S.qrBtn,background:"#eff6ff",borderColor:"#bfdbfe",color:"#2563eb"}} onClick={()=>{if(editId===s.id){setEditId(null);setEditS(null);}else{setEditId(s.id);setEditS({...s});setShowAdd(false);}}}>
                  {editId===s.id?"閉じる":"編集"}
                </button>
                <button style={S.delBtn} onClick={()=>{if(window.confirm("削除しますか？"))deleteSeminar(s.id);}}>削除</button>
              </div>
            </div>
            {editId===s.id&&editS&&(
              <div style={{marginTop:-8,marginBottom:8}}>
                <SeminarForm data={editS} onChange={setEditS} onSave={saveEdit} onCancel={()=>{setEditId(null);setEditS(null);}} title="セミナーを編集"/>
              </div>
            )}
          </div>
        );
      })}
      {getSMV&&seminars.length>0&&(
        <div style={{marginTop:24}}>
          <div style={{fontWeight:700,fontSize:14,color:"#4A3020",marginBottom:10}}>📊 視聴・復命書 提出状況（{fiscalYear}年度）</div>
          <SeminarStatusBoard key={fiscalYear} employees={activeEmps} seminars={seminars} getSMV={getSMV} fiscalYear={fiscalYear}/>
        </div>
      )}
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

// ─── 委員会タブ（一般職員・委員長共通） ──────────────────────────────────────
function CommitteeTab({emp,committees,committeeMembers,committeeMeetings,meetingReads,employees,upsertMeeting,deleteMeeting,setMembersFor,upsertCommittee,markRead}){
  const myCommittees = committees.filter(c=>{
    const members = committeeMembers[c.id]||[];
    return members.includes(emp.id)||c.chairEmpId===emp.id;
  });
  const [selectedId,setSelectedId] = useState(myCommittees[0]?.id||null);
  const [editMeeting,setEditMeeting] = useState(null);
  const [showMeetingForm,setShowMeetingForm] = useState(false);
  const [editChairMode,setEditChairMode] = useState(false);
  const [memberInput,setMemberInput] = useState("");
  const [saving,setSaving] = useState(false);

  const selected = committees.find(c=>c.id===selectedId);
  const isChair = selected&&selected.chairEmpId===emp.id;
  const members = selected?(committeeMembers[selected.id]||[]):[];
  const meetings = selected
    ? committeeMeetings.filter(m=>m.committeeId===selected.id).sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate))
    : [];
  const nextMeeting = meetings.find(m=>m.scheduledDate>=new Date().toISOString().slice(0,10));

  useEffect(()=>{
    if(selectedId&&nextMeeting&&members.includes(emp.id)){
      const already=(meetingReads[nextMeeting.id]||[]).includes(emp.id);
      if(!already) markRead(nextMeeting.id,emp.id);
    }
  },[selectedId]);// eslint-disable-line

  const emptyMeeting=()=>({id:`M${Date.now()}`,committeeId:selected?.id||"",scheduledDate:"",startTime:"",location:"",agenda:"",notes:""});

  const handleSaveMeeting=async m=>{
    if(!m.scheduledDate){alert("開催日を入力してください");return;}
    setSaving(true);
    await upsertMeeting(m);
    setSaving(false);
    setShowMeetingForm(false);
    setEditMeeting(null);
  };

  const handleSaveMembers=async()=>{
    if(!selected)return;
    const ids=memberInput.split(/[\n,　 ]+/).map(s=>s.trim()).filter(Boolean);
    setSaving(true);
    await setMembersFor(selected.id,ids);
    setSaving(false);
    setEditChairMode(false);
  };

  if(myCommittees.length===0) return(
    <div style={{textAlign:"center",padding:"40px 16px",color:"#9ca3af"}}>
      <div style={{fontSize:40,marginBottom:12}}>🏛</div>
      <div style={{fontSize:15,fontWeight:700,color:"#6b7280"}}>所属している委員会はありません</div>
      <div style={{fontSize:12,marginTop:8}}>管理者に委員会メンバーへの追加をお申し出ください</div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* 委員会選択 */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {myCommittees.map(c=>(
          <button key={c.id} onClick={()=>{setSelectedId(c.id);setShowMeetingForm(false);setEditChairMode(false);}}
            style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${c.color}`,background:selectedId===c.id?c.color:"#fff",color:selectedId===c.id?"#fff":c.color,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            {c.chairEmpId===emp.id&&<span title="委員長">👑</span>}
            {c.name}
          </button>
        ))}
      </div>

      {selected&&(
        <div style={{background:"#fff",border:`1.5px solid ${selected.color}22`,borderRadius:14,overflow:"hidden"}}>
          {/* ヘッダー */}
          <div style={{background:`${selected.color}18`,borderBottom:`1.5px solid ${selected.color}33`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:selected.color}}>{selected.name}</div>
              {selected.description&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{selected.description}</div>}
              {isChair&&<div style={{marginTop:4,fontSize:11,fontWeight:700,background:selected.color,color:"#fff",display:"inline-block",padding:"2px 10px",borderRadius:20}}>👑 委員長</div>}
            </div>
            {isChair&&(
              <button onClick={()=>{setEditChairMode(v=>!v);setShowMeetingForm(false);}}
                style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${selected.color}`,background:editChairMode?"#fff":selected.color,color:editChairMode?selected.color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                {editChairMode?"キャンセル":"⚙ 委員管理"}
              </button>
            )}
          </div>

          <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:14}}>
            {/* 委員長モード：メンバー編集 */}
            {isChair&&editChairMode&&(
              <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:14}}>
                <div style={{fontWeight:700,fontSize:13,color:"#92400e",marginBottom:8}}>👥 委員メンバー管理</div>
                <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>職員ID を改行またはカンマ区切りで入力してください</div>
                <textarea rows={4} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #fcd34d",fontSize:13,boxSizing:"border-box",resize:"vertical"}}
                  value={memberInput}
                  placeholder="例: E001&#10;E002&#10;E003"
                  onChange={e=>setMemberInput(e.target.value)}
                  onFocus={()=>{ if(!memberInput) setMemberInput(members.join("\n")); }}
                />
                <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                  {members.map(eid=>{const e2=employees.find(e=>e.id===eid);return e2?(
                    <span key={eid} style={{fontSize:11,background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:20,padding:"2px 10px",color:"#92400e",fontWeight:600}}>{e2.name}（{eid}）</span>
                  ):(
                    <span key={eid} style={{fontSize:11,background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:20,padding:"2px 10px",color:"#dc2626",fontWeight:600}}>{eid}（未登録）</span>
                  );})}
                  {members.length===0&&<span style={{fontSize:12,color:"#9ca3af"}}>メンバー未設定</span>}
                </div>
                <button onClick={handleSaveMembers} disabled={saving}
                  style={{marginTop:10,padding:"8px 20px",background:"#d97706",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  {saving?"保存中…":"メンバーを保存"}
                </button>
              </div>
            )}

            {/* 次回開催予定 */}
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"#374151",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                📅 次回開催予定
                {isChair&&!editChairMode&&(
                  <button onClick={()=>{setShowMeetingForm(true);setEditMeeting(emptyMeeting());setEditChairMode(false);}}
                    style={{padding:"4px 12px",borderRadius:20,border:`1.5px solid ${selected.color}`,background:"#fff",color:selected.color,fontWeight:700,fontSize:11,cursor:"pointer"}}>
                    ＋ 追加
                  </button>
                )}
              </div>

              {/* 開催予定フォーム（委員長のみ） */}
              {isChair&&showMeetingForm&&editMeeting&&(
                <MeetingForm form={editMeeting} saving={saving}
                  onChange={m=>setEditMeeting(m)}
                  onSave={()=>handleSaveMeeting(editMeeting)}
                  onCancel={()=>{setShowMeetingForm(false);setEditMeeting(null);}}/>
              )}

              {/* 開催予定一覧 */}
              {meetings.length===0&&!showMeetingForm&&(
                <div style={{fontSize:13,color:"#9ca3af",padding:"12px",background:"#f9fafb",borderRadius:10,textAlign:"center"}}>開催予定が登録されていません</div>
              )}
              {meetings.map(m=>{
                const isPastMtg=m.scheduledDate<new Date().toISOString().slice(0,10);
                const readList=meetingReads[m.id]||[];
                const isRead=readList.includes(emp.id);
                const isEditing=editMeeting&&editMeeting.id===m.id&&showMeetingForm;
                return(
                  <div key={m.id} style={{border:`1.5px solid ${isPastMtg?"#e5e7eb":selected.color+"44"}`,borderRadius:12,marginBottom:8,overflow:"hidden",opacity:isPastMtg?0.65:1}}>
                    <div style={{padding:"10px 14px",background:isPastMtg?"#f9fafb":`${selected.color}0d`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:14,color:isPastMtg?"#9ca3af":selected.color}}>{formatDate(m.scheduledDate)}</span>
                          {m.startTime&&<span style={{fontSize:12,color:"#6b7280"}}>🕐 {m.startTime}</span>}
                          {m.location&&<span style={{fontSize:12,color:"#6b7280"}}>📍 {m.location}</span>}
                          {!isPastMtg&&(
                            <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:isRead?"#dcfce7":"#fef3c7",color:isRead?"#15803d":"#92400e",border:`1px solid ${isRead?"#86efac":"#fcd34d"}`}}>
                              {isRead?"✅ 確認済":"👁 未確認"}
                            </span>
                          )}
                        </div>
                        {m.agenda&&<div style={{fontSize:12,color:"#374151",marginTop:6,whiteSpace:"pre-wrap"}}>📋 {m.agenda}</div>}
                        {m.notes&&<div style={{fontSize:12,color:"#6b7280",marginTop:4,whiteSpace:"pre-wrap"}}>📝 {m.notes}</div>}
                      </div>
                      {isChair&&!isPastMtg&&(
                        <div style={{display:"flex",gap:6,flexShrink:0}}>
                          <button onClick={()=>{setEditMeeting({...m});setShowMeetingForm(true);}} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${selected.color}`,background:"#fff",color:selected.color,fontSize:11,fontWeight:600,cursor:"pointer"}}>編集</button>
                          <button onClick={async()=>{ if(window.confirm("この予定を削除しますか？")){await deleteMeeting(m.id);}}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #fca5a5",background:"#fff",color:"#dc2626",fontSize:11,fontWeight:600,cursor:"pointer"}}>削除</button>
                        </div>
                      )}
                    </div>
                    {isChair&&!isPastMtg&&isEditing&&(
                      <div style={{padding:"12px 14px",borderTop:"1px solid #e5e7eb"}}>
                        <MeetingForm form={editMeeting} saving={saving}
                          onChange={m=>setEditMeeting(m)}
                          onSave={()=>handleSaveMeeting(editMeeting)}
                          onCancel={()=>{setShowMeetingForm(false);setEditMeeting(null);}}/>
                      </div>
                    )}
                    {/* 既読リスト（委員長のみ） */}
                    {isChair&&!isPastMtg&&(
                      <div style={{padding:"6px 14px 10px",background:"#f9fafb",borderTop:"1px solid #f3f4f6"}}>
                        <div style={{fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:600}}>既読状況（{readList.length}/{members.length}名）</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {members.map(eid=>{
                            const e2=employees.find(e=>e.id===eid);
                            const read=readList.includes(eid);
                            return(
                              <span key={eid} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:read?"#dcfce7":"#f3f4f6",color:read?"#15803d":"#9ca3af",border:`1px solid ${read?"#86efac":"#e5e7eb"}`,fontWeight:600}}>
                                {read?"✅":"⬜"} {e2?.name||eid}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── 委員会管理タブ（管理者専用） ───────────────────────────────────────────
function CommitteeManageTab({committees,committeeMembers,committeeMeetings,meetingReads,committeeNotices,employees,upsertCommittee,deleteCommittee,setMembersFor,upsertMeeting,deleteMeeting,upsertNotice,deleteNotice,setCommittees}){
  const [selectedId,setSelectedId] = useState(committees[0]?.id||null);
  const [editForm,setEditForm] = useState(null);
  const [showAddForm,setShowAddForm] = useState(false);
  const [saving,setSaving] = useState(false);
  const [selectedMembers,setSelectedMembers] = useState([]);
  const [innerTab,setInnerTab] = useState("meetings");
  const [showMeetingForm,setShowMeetingForm] = useState(false);
  const [meetingForm,setMeetingForm] = useState({id:"",scheduledDate:"",startTime:"17:00",endTime:"17:30",location:"",agenda:""});
  const [showNoticeForm,setShowNoticeForm] = useState(false);
  const [noticeForm,setNoticeForm] = useState({id:"",title:"",body:"",isPublic:false});

  const selected = committees.find(c=>c.id===selectedId);
  const members = selected?(committeeMembers[selected.id]||[]):[];

  useEffect(()=>{ if(selected) setSelectedMembers(committeeMembers[selected.id]||[]); },[selectedId,committeeMembers]);// eslint-disable-line

  const emptyCommittee=()=>({id:`C${String(Date.now()).slice(-4)}`,name:"",description:"",chairEmpId:"",color:"#C89A55"});

  const handleSaveCommittee=async c=>{
    if(!c.name){alert("委員会名を入力してください");return;}
    setSaving(true); await upsertCommittee(c); setSaving(false);
    setEditForm(null); setShowAddForm(false);
    if(!selectedId) setSelectedId(c.id);
  };

  const handleSaveMembers=async()=>{
    if(!selected)return;
    setSaving(true); await setMembersFor(selected.id,selectedMembers); setSaving(false);
    alert("メンバーを保存しました");
  };

  const handleSaveMeeting=async()=>{
    if(!meetingForm.scheduledDate){alert("開催日を入力してください");return;}
    setSaving(true);
    await upsertMeeting({...meetingForm,id:meetingForm.id||`M${Date.now()}`,committeeId:selected.id});
    setSaving(false); setShowMeetingForm(false); setMeetingForm({id:"",scheduledDate:"",startTime:"17:00",endTime:"17:30",location:"",agenda:""});
  };

  const handleSaveNotice=async()=>{
    if(!noticeForm.title.trim()){alert("タイトルを入力してください");return;}
    setSaving(true);
    await upsertNotice({...noticeForm,id:noticeForm.id||`N${Date.now()}`,committeeId:selected.id,postedBy:"ADMIN"});
    setSaving(false); setShowNoticeForm(false); setNoticeForm({id:"",title:"",body:"",isPublic:false});
  };

  const COLORS=["#dc2626","#7c3aed","#0369a1","#d97706","#16a34a","#C89A55","#0891b2","#6b7280","#9333ea","#059669","#db2777","#ea580c"];
  const myMeetings=(selected?committeeMeetings.filter(m=>m.committeeId===selected.id):[]).sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate));
  const myNotices=(selected?(committeeNotices||[]).filter(n=>n.committeeId===selected.id):[]);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* 委員会リスト */}
      <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:800,fontSize:14,color:"#4A3020"}}>🏛 委員会一覧</div>
          <button onClick={()=>{setShowAddForm(true);setEditForm(emptyCommittee());}} style={{padding:"6px 14px",borderRadius:20,background:"#7c3aed",color:"#fff",border:"none",fontWeight:700,fontSize:12,cursor:"pointer"}}>＋ 新規追加</button>
        </div>
        {showAddForm&&editForm&&(
          <CommitteeForm c={editForm} employees={employees} colors={COLORS} saving={saving}
            onChange={c=>setEditForm(c)} onSave={()=>handleSaveCommittee(editForm)}
            onCancel={()=>{setShowAddForm(false);setEditForm(null);}}/>
        )}
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {committees.map(c=>(
            <button key={c.id} onClick={()=>{setSelectedId(c.id);setEditForm(null);setInnerTab("meetings");}}
              style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${c.color}`,background:selectedId===c.id?c.color:"#fff",color:selectedId===c.id?"#fff":c.color,fontWeight:700,fontSize:12,cursor:"pointer"}}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {selected&&(
        <div style={{background:"#fff",border:`1.5px solid ${selected.color}33`,borderRadius:14,overflow:"hidden"}}>
          {/* 委員会ヘッダー */}
          <div style={{background:`${selected.color}18`,borderBottom:`1.5px solid ${selected.color}33`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:selected.color}}>{selected.name}</div>
              {selected.description&&<div style={{fontSize:12,color:"#6b7280"}}>{selected.description}</div>}
              {selected.chairEmpId&&(()=>{const ch=employees.find(e=>e.id===selected.chairEmpId);return ch?<div style={{fontSize:12,color:selected.color,fontWeight:700,marginTop:2}}>👑 委員長: {ch.name}</div>:null;})()}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setEditForm({...selected});setShowAddForm(false);}} style={{padding:"6px 12px",borderRadius:10,border:`1.5px solid ${selected.color}`,background:"#fff",color:selected.color,fontWeight:700,fontSize:12,cursor:"pointer"}}>編集</button>
              <button onClick={async()=>{if(window.confirm(`「${selected.name}」を削除しますか？`)){await deleteCommittee(selected.id);setSelectedId(committees.filter(c=>c.id!==selected.id)[0]?.id||null);}}} style={{padding:"6px 12px",borderRadius:10,border:"1px solid #fca5a5",background:"#fff",color:"#dc2626",fontWeight:700,fontSize:12,cursor:"pointer"}}>削除</button>
            </div>
          </div>

          <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:14}}>
            {editForm&&editForm.id===selected.id&&(
              <CommitteeForm c={editForm} employees={employees} colors={COLORS} saving={saving}
                onChange={c=>setEditForm(c)} onSave={()=>handleSaveCommittee(editForm)}
                onCancel={()=>setEditForm(null)}/>
            )}

            {/* インナータブ */}
            <div style={{display:"flex",gap:0,borderBottom:"2px solid #e5e7eb"}}>
              {[["meetings","📅 開催予定"],["notices","📢 お知らせ"],["members","👥 メンバー"]].map(([k,l])=>(
                <button key={k} onClick={()=>setInnerTab(k)}
                  style={{padding:"9px 16px",border:"none",background:"transparent",fontWeight:700,fontSize:12,color:innerTab===k?selected.color:"#9ca3af",borderBottom:innerTab===k?`2.5px solid ${selected.color}`:"2.5px solid transparent",cursor:"pointer",marginBottom:-2}}>
                  {l}
                </button>
              ))}
            </div>

            {/* メンバー管理 */}
            {innerTab==="members"&&(
              <div>
                <MemberSelector employees={employees} selected={selectedMembers} onChange={setSelectedMembers}/>
                <button onClick={handleSaveMembers} disabled={saving}
                  style={{marginTop:14,padding:"10px",background:selected.color,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",width:"100%"}}>
                  {saving?"保存中…":"メンバーを保存する"}
                </button>
              </div>
            )}

            {/* 開催予定 */}
            {innerTab==="meetings"&&(
              <div>
                <button onClick={()=>{setShowMeetingForm(true);setMeetingForm({id:"",scheduledDate:"",startTime:"17:00",endTime:"17:30",location:"",agenda:"",committeeId:selected.id});}}
                  style={{padding:"7px 16px",background:selected.color,color:"#fff",border:"none",borderRadius:20,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:12}}>
                  ＋ 開催予定を追加
                </button>
                {showMeetingForm&&<MeetingForm form={meetingForm} onChange={setMeetingForm} onSave={handleSaveMeeting} onCancel={()=>setShowMeetingForm(false)} saving={saving}/>}
                {myMeetings.length===0&&!showMeetingForm&&<div style={{textAlign:"center",padding:24,color:"#9ca3af",fontSize:13}}>開催予定なし</div>}
                {myMeetings.map(m=><MeetingCard key={m.id} m={m} color={selected.color} readList={meetingReads[m.id]||[]} memberCount={members.length} onDelete={async()=>{if(window.confirm("削除しますか？"))await deleteMeeting(m.id);}}/>)}
              </div>
            )}

            {/* お知らせ */}
            {innerTab==="notices"&&(
              <div>
                <button onClick={()=>{setShowNoticeForm(true);setNoticeForm({id:"",title:"",body:"",isPublic:false});}}
                  style={{padding:"7px 16px",background:"#16a34a",color:"#fff",border:"none",borderRadius:20,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:12}}>
                  ＋ お知らせを投稿
                </button>
                {showNoticeForm&&<NoticeForm form={noticeForm} onChange={setNoticeForm} onSave={handleSaveNotice} onCancel={()=>setShowNoticeForm(false)} saving={saving}/>}
                {myNotices.length===0&&!showNoticeForm&&<div style={{textAlign:"center",padding:24,color:"#9ca3af",fontSize:13}}>お知らせなし</div>}
                {myNotices.map(n=><NoticeCard key={n.id} n={n} canDelete={true} onDelete={async()=>{if(window.confirm("削除しますか？"))await deleteNotice(n.id);}}/>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 管理者：お知らせ管理タブ（事務連絡・研修・アンケート・各種・委員会） =====
const NOTICE_CATEGORIES=[["事務連絡","📋","#0369a1"],["研修のお知らせ","📚","#C89A55"],["アンケート","📝","#16a34a"],["各種お知らせ","📢","#7c3aed"]];
function AdminNoticesTab({committees,committeeNotices,upsertNotice,deleteNotice,employees,generalNotices,upsertGeneralNotice,deleteGeneralNotice,uploadGeneralNoticePdf}){
  const [cat,setCat]=useState("事務連絡");           // 選択中カテゴリ or "committee"
  const [selectedId,setSelectedId]=useState(committees[0]?.id||null); // 委員会用
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({id:"",title:"",body:"",isPublic:false});
  const [gForm,setGForm]=useState({id:"",title:"",body:"",fileUrl:null,filePath:null,fileName:null,targetEmpIds:[],lineDate:"",lineTime:""});
  const [pdfFile,setPdfFile]=useState(null);
  const [showTargetSel,setShowTargetSel]=useState(false);
  const [selDept,setSelDept]=useState("すべて");
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const showToast=(msg,isError)=>{setToast({msg,isError});setTimeout(()=>setToast(null),5000);};

  const activeEmps=(employees||[]).filter(e=>e.isActive!==false);
  const depts=["すべて",...sortDepts(Array.from(new Set(activeEmps.map(e=>e.dept).filter(Boolean))))];
  const filteredEmps=selDept==="すべて"?activeEmps:activeEmps.filter(e=>e.dept===selDept);

  const catInfo=NOTICE_CATEGORIES.find(c=>c[0]===cat);
  const catColor=catInfo?catInfo[2]:"#7c3aed";
  const myGeneral=(generalNotices||[]).filter(n=>n.category===cat);
  const selected=committees.find(c=>c.id===selectedId);
  const myCommNotices=(committeeNotices||[]).filter(n=>n.committeeId===selectedId);

  const resetGForm=()=>{setGForm({id:"",title:"",body:"",fileUrl:null,filePath:null,fileName:null,targetEmpIds:[],lineDate:"",lineTime:""});setPdfFile(null);setShowTargetSel(false);setSelDept("すべて");};

  const handleSaveGeneral=async()=>{
    if(!gForm.title.trim()){showToast("タイトルを入力してください",true);return;}
    if(!gForm.lineDate||!gForm.lineTime){
      showToast("⚠ LINE配信日時が指定されていません。即時配信は行われません。必ず配信したい日時を指定してください（配信は10:00〜17:00）",true);
      return;
    }
    setSaving(true);
    try{
      const id=gForm.id||`GN${Date.now()}`;
      let fileMeta={fileUrl:gForm.fileUrl,filePath:gForm.filePath,fileName:gForm.fileName};
      if(pdfFile) fileMeta=await uploadGeneralNoticePdf(id,pdfFile);
      const targetIds=showTargetSel?(gForm.targetEmpIds||[]):[];
      await upsertGeneralNotice({...gForm,...fileMeta,id,category:cat,targetEmpIds:targetIds,postedBy:"ADMIN"});
      // LINE配信を予約（対象：指定職員 or 全職員のうちLINE紐づけ済みの人）
      const lineTargets=(targetIds.length>0?activeEmps.filter(e=>targetIds.includes(e.id)):activeEmps).filter(e=>e.lineUserId);
      if(lineTargets.length>0){
        const sendAfter=new Date(`${gForm.lineDate}T${gForm.lineTime}:00`).toISOString();
        const msg=`📢【${cat}】${gForm.title}\n\n${gForm.body?gForm.body+"\n\n":""}${fileMeta.fileUrl?`📄 添付資料：\n${fileMeta.fileUrl}\n\n`:""}詳細は研修管理システムをご確認ください。`;
        await fetch("https://nncousuugjntzovtmkvt.supabase.co/functions/v1/line-notify",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({notifications:lineTargets.map(t=>({lineUserId:t.lineUserId,message:msg})),sendAfter})
        });
        showToast(`✅ 投稿しました。LINEは ${gForm.lineDate} ${gForm.lineTime} 以降に ${lineTargets.length}名へ配信されます`);
      } else {
        showToast("✅ 投稿しました（LINE紐づけ済みの対象職員がいないためLINE配信はありません）");
      }
      setShowForm(false); resetGForm();
    }catch(e){ showToast("保存に失敗しました: "+(e.message||e),true); }
    setSaving(false);
  };
  const handleSaveCommittee=async()=>{
    if(!form.title.trim()){alert("タイトルを入力してください");return;}
    setSaving(true);
    await upsertNotice({...form,id:form.id||`N${Date.now()}`,committeeId:selectedId,postedBy:"ADMIN"});
    setSaving(false); setShowForm(false); setForm({id:"",title:"",body:"",isPublic:false});
  };
  const toggleTarget=id=>setGForm(p=>({...p,targetEmpIds:(p.targetEmpIds||[]).includes(id)?p.targetEmpIds.filter(x=>x!==id):[...(p.targetEmpIds||[]),id]}));
  const toggleDeptAll=()=>{ const ids=filteredEmps.map(e=>e.id); const all=ids.every(id=>(gForm.targetEmpIds||[]).includes(id)); setGForm(p=>({...p,targetEmpIds:all?(p.targetEmpIds||[]).filter(id=>!ids.includes(id)):[...new Set([...(p.targetEmpIds||[]),...ids])]})); };
  const toggleGroup=ids=>{ const all=ids.every(id=>(gForm.targetEmpIds||[]).includes(id)); setGForm(p=>({...p,targetEmpIds:all?(p.targetEmpIds||[]).filter(id=>!ids.includes(id)):[...new Set([...(p.targetEmpIds||[]),...ids])]})); };
  const seishainIds=activeEmps.filter(e=>(e.jobCategory||"")==="正職員").map(e=>e.id);
  const otherIds=activeEmps.filter(e=>(e.jobCategory||"")!=="正職員").map(e=>e.id);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* トースト通知 */}
      {toast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:2000,maxWidth:"90vw",padding:"12px 20px",borderRadius:12,background:toast.isError?"#dc2626":"#15803d",color:"#fff",fontSize:13,fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,.25)",lineHeight:1.6}}>
          {toast.msg}
        </div>
      )}
      {/* カテゴリ選択 */}
      <div style={{background:"#fff",border:"1px solid #E8D5B0",borderRadius:14,padding:14}}>
        <div style={{fontWeight:800,fontSize:14,color:"#4A3020",marginBottom:10}}>📢 お知らせ管理</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {NOTICE_CATEGORIES.map(([name,icon,color])=>(
            <button key={name} onClick={()=>{setCat(name);setShowForm(false);resetGForm();}}
              style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${color}`,background:cat===name?color:"#fff",color:cat===name?"#fff":color,fontWeight:700,fontSize:12,cursor:"pointer"}}>
              {icon} {name}
            </button>
          ))}
          <button onClick={()=>{setCat("committee");setShowForm(false);}}
            style={{padding:"7px 14px",borderRadius:20,border:"2px solid #1e3a5f",background:cat==="committee"?"#1e3a5f":"#fff",color:cat==="committee"?"#fff":"#1e3a5f",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            🏛 委員会
          </button>
        </div>
        {/* 委員会選択（委員会カテゴリのとき展開） */}
        {cat==="committee"&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10,paddingTop:10,borderTop:"1px dashed #e5e7eb"}}>
            {committees.map(c=>(
              <button key={c.id} onClick={()=>{setSelectedId(c.id);setShowForm(false);}}
                style={{padding:"6px 12px",borderRadius:20,border:`2px solid ${c.color}`,background:selectedId===c.id?c.color:"#fff",color:selectedId===c.id?"#fff":c.color,fontWeight:700,fontSize:11,cursor:"pointer"}}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 一般お知らせ（事務連絡・研修・アンケート・各種） */}
      {cat!=="committee"&&(
        <div style={{background:"#fff",border:`1.5px solid ${catColor}33`,borderRadius:14,padding:16}}>
          <div style={{fontWeight:800,fontSize:14,color:catColor,marginBottom:12}}>{catInfo?.[1]} {cat}</div>
          <button onClick={()=>{setShowForm(true);resetGForm();}}
            style={{padding:"7px 16px",background:catColor,color:"#fff",border:"none",borderRadius:20,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:12}}>
            ＋ お知らせを投稿
          </button>
          {showForm&&(
            <div style={{background:"#f8fafc",border:`1.5px solid ${catColor}55`,borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{marginBottom:10}}>
                <label style={S.label}>タイトル <span style={{color:"#dc2626"}}>*</span></label>
                <input style={S.input} placeholder="例: 年末調整書類の提出について" value={gForm.title} onChange={e=>setGForm(p=>({...p,title:e.target.value}))}/>
              </div>
              <div style={{marginBottom:10}}>
                <label style={S.label}>内容</label>
                <textarea rows={4} style={{...S.input,resize:"vertical",fontFamily:"inherit"}} placeholder="お知らせの内容" value={gForm.body} onChange={e=>setGForm(p=>({...p,body:e.target.value}))}/>
              </div>
              <div style={{marginBottom:10}}>
                <label style={S.label}>添付PDF（任意）</label>
                <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1.5px dashed #cbd5e1",background:"#fff",cursor:"pointer"}}>
                  <input type="file" accept="application/pdf" style={{display:"none"}} onChange={e=>setPdfFile(e.target.files[0]||null)}/>
                  <span style={{fontSize:20}}>📄</span>
                  <span style={{fontSize:13,fontWeight:600,color:"#475569"}}>{pdfFile?"✅ "+pdfFile.name:gForm.fileName?"✅ "+gForm.fileName:"クリックしてPDFをアップロード"}</span>
                </label>
              </div>
              {/* LINE配信日時（必須） */}
              <div style={{marginBottom:12,padding:"10px 12px",background:"#f0fdf4",borderRadius:10,border:"1.5px solid #4ade80"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#15803d",marginBottom:8}}>📱 LINE配信日時 <span style={{color:"#dc2626"}}>*必須</span></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <input type="date" style={{...S.input,borderColor:"#86efac"}} value={gForm.lineDate||""} onChange={e=>setGForm(p=>({...p,lineDate:e.target.value}))}/>
                  <input type="time" style={{...S.input,borderColor:"#86efac"}} value={gForm.lineTime||""} onChange={e=>setGForm(p=>({...p,lineTime:e.target.value}))}/>
                </div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:6}}>※ 指定日時以降の10:00〜17:00の間に配信されます（約15分間隔で配信チェック）</div>
              </div>
              {/* 職員の指定 */}
              <div style={{marginBottom:12,padding:"10px 12px",background:"#eff6ff",borderRadius:10,border:"1px solid #93c5fd"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:"#2563eb"}}>
                  <input type="checkbox" checked={showTargetSel} onChange={e=>{setShowTargetSel(e.target.checked); if(!e.target.checked)setGForm(p=>({...p,targetEmpIds:[]}));}} style={{width:16,height:16,accentColor:"#2563eb"}}/>
                  👥 職員を指定{(gForm.targetEmpIds||[]).length>0&&`（${gForm.targetEmpIds.length}名選択中）`}
                </label>
                <div style={{fontSize:11,color:"#6b7280",marginTop:4}}>※ 指定しない場合は全職員に配信されます</div>
                {showTargetSel&&<div style={{marginTop:10}}>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                    {depts.map(d=>(
                      <button key={d} type="button" onClick={()=>setSelDept(d)} style={{padding:"3px 10px",borderRadius:14,border:"1.5px solid",borderColor:selDept===d?"#2563eb":"#e5e7eb",background:selDept===d?"#dbeafe":"#fff",color:selDept===d?"#2563eb":"#374151",fontSize:11,fontWeight:selDept===d?700:400,cursor:"pointer"}}>{d}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    <button type="button" onClick={toggleDeptAll} style={{fontSize:11,color:"#2563eb",background:"#dbeafe",border:"1px solid #93c5fd",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>
                      {filteredEmps.every(e=>(gForm.targetEmpIds||[]).includes(e.id))?"✓ "+selDept+"の選択を解除":"＋ "+selDept+"を全員選択"}
                    </button>
                    <button type="button" onClick={()=>toggleGroup(seishainIds)} style={{fontSize:11,color:"#7c3aed",background:"#ede9fe",border:"1px solid #c4b5fd",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>
                      {seishainIds.length>0&&seishainIds.every(id=>(gForm.targetEmpIds||[]).includes(id))?"✓ 正職員の選択を解除":"＋ 正職員を一括選択"}
                    </button>
                    <button type="button" onClick={()=>toggleGroup(otherIds)} style={{fontSize:11,color:"#d97706",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>
                      {otherIds.length>0&&otherIds.every(id=>(gForm.targetEmpIds||[]).includes(id))?"✓ 正職員以外の選択を解除":"＋ 正職員以外を一括選択"}
                    </button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:150,overflowY:"auto",padding:"6px",background:"#fff",borderRadius:8,border:"1px solid #93c5fd"}}>
                    {filteredEmps.map(e=>{
                      const sel=(gForm.targetEmpIds||[]).includes(e.id);
                      return(<label key={e.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,cursor:"pointer",padding:"3px 8px",borderRadius:16,border:"1.5px solid",borderColor:sel?"#2563eb":"#e5e7eb",background:sel?"#dbeafe":"#fff",color:sel?"#2563eb":"#374151"}}>
                        <input type="checkbox" checked={sel} onChange={()=>toggleTarget(e.id)} style={{display:"none"}}/>{e.name}
                      </label>);
                    })}
                  </div>
                </div>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleSaveGeneral} disabled={saving} style={{flex:1,padding:"9px",background:catColor,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>{saving?"保存中…":"投稿する"}</button>
                <button onClick={()=>{setShowForm(false);resetGForm();}} style={{flex:1,padding:"9px",background:"#f3f4f6",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>キャンセル</button>
              </div>
            </div>
          )}
          {myGeneral.length===0&&!showForm&&<div style={{textAlign:"center",padding:24,color:"#9ca3af",fontSize:13}}>お知らせなし</div>}
          {myGeneral.map(n=>(
            <div key={n.id} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:"11px 14px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#374151"}}>{n.title}</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>
                    {n.createdAt&&new Date(n.createdAt).toLocaleDateString("ja-JP")}
                    {(n.targetEmpIds||[]).length>0?` ｜ 👥 ${n.targetEmpIds.length}名宛て`:" ｜ 👥 全職員宛て"}
                  </div>
                  {n.body&&<div style={{fontSize:12,color:"#6b7280",marginTop:6,whiteSpace:"pre-wrap"}}>{n.body}</div>}
                  {n.fileUrl&&<a href={n.fileUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:6,fontSize:12,color:"#2563eb",fontWeight:600,textDecoration:"underline"}}>📄 {n.fileName||"添付PDF"}</a>}
                </div>
                <button onClick={async()=>{if(window.confirm("削除しますか？"))await deleteGeneralNotice(n.id);}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #fca5a5",background:"#fff",color:"#dc2626",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 委員会お知らせ */}
      {cat==="committee"&&selected&&(
        <div style={{background:"#fff",border:`1.5px solid ${selected.color}33`,borderRadius:14,padding:16}}>
          <div style={{fontWeight:800,fontSize:14,color:selected.color,marginBottom:12}}>{selected.name} のお知らせ</div>
          <button onClick={()=>{setShowForm(true);setForm({id:"",title:"",body:"",isPublic:false});}}
            style={{padding:"7px 16px",background:"#16a34a",color:"#fff",border:"none",borderRadius:20,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:12}}>
            ＋ お知らせを投稿
          </button>
          {showForm&&<NoticeForm form={form} onChange={setForm} onSave={handleSaveCommittee} onCancel={()=>setShowForm(false)} saving={saving}/>}
          {myCommNotices.length===0&&!showForm&&<div style={{textAlign:"center",padding:24,color:"#9ca3af",fontSize:13}}>お知らせなし</div>}
          {myCommNotices.map(n=><NoticeCard key={n.id} n={n} canDelete={true} onDelete={async()=>{if(window.confirm("削除しますか？"))await deleteNotice(n.id);}}/>)}
        </div>
      )}
    </div>
  );
}

// ===== 部署選択→職員チェックボックス式メンバー選択 =====
function MemberSelector({employees,selected,onChange}){
  const depts=[...new Set(employees.filter(e=>e.isActive!==false).map(e=>e.dept).filter(Boolean))].sort();
  const [selDept,setSelDept]=useState(depts[0]||"");
  const deptEmps=employees.filter(e=>e.dept===selDept&&e.isActive!==false);
  const toggleEmp=id=>{ if(selected.includes(id))onChange(selected.filter(x=>x!==id));else onChange([...selected,id]); };
  const toggleDept=()=>{ const ids=deptEmps.map(e=>e.id); const all=ids.every(id=>selected.includes(id)); if(all)onChange(selected.filter(id=>!ids.includes(id)));else onChange([...new Set([...selected,...ids])]); };
  return(
    <div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:6}}>選択済みメンバー（{selected.length}名）</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,minHeight:36,padding:"8px 10px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0"}}>
          {selected.map(id=>{const e=employees.find(x=>x.id===id);return e?(
            <span key={id} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,background:"#dbeafe",color:"#1e40af",borderRadius:20,padding:"3px 10px",fontWeight:600}}>
              {e.name}
              <button onClick={()=>toggleEmp(id)} style={{background:"none",border:"none",color:"#1e40af",cursor:"pointer",padding:0,fontSize:15,lineHeight:1,marginLeft:2}}>×</button>
            </span>
          ):null;})}
          {selected.length===0&&<span style={{fontSize:12,color:"#9ca3af",alignSelf:"center"}}>未選択</span>}
        </div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
        {depts.map(d=>(
          <button key={d} onClick={()=>setSelDept(d)}
            style={{padding:"5px 12px",borderRadius:16,border:"1.5px solid",borderColor:selDept===d?"#7c3aed":"#e5e7eb",background:selDept===d?"#7c3aed":"#fff",color:selDept===d?"#fff":"#374151",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            {d}（{employees.filter(e=>e.dept===d&&e.isActive!==false).length}）
          </button>
        ))}
      </div>
      {selDept&&(
        <div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"7px 14px",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #e5e7eb"}}>
            <span style={{fontSize:12,fontWeight:700,color:"#374151"}}>🏢 {selDept}</span>
            <button onClick={toggleDept} style={{fontSize:11,padding:"3px 10px",borderRadius:12,border:"1px solid #7c3aed",background:"#fff",color:"#7c3aed",cursor:"pointer",fontWeight:600}}>
              {deptEmps.every(e=>selected.includes(e.id))?"全解除":"全選択"}
            </button>
          </div>
          {deptEmps.map((e,i)=>{
            const checked=selected.includes(e.id);
            return(
              <label key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",background:i%2===0?"#fff":"#fafafa",borderBottom:"1px solid #f0f0f0"}}>
                <input type="checkbox" checked={checked} onChange={()=>toggleEmp(e.id)} style={{width:16,height:16,accentColor:"#7c3aed",flexShrink:0}}/>
                <span style={{fontWeight:checked?700:400,color:checked?"#7c3aed":"#374151",fontSize:13}}>{e.name}</span>
                {e.roleTitle&&<span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>{e.roleTitle}</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== 開催予定フォーム =====
function MeetingForm({form,onChange,onSave,onCancel,saving}){
  return(
    <div style={{background:"#f8f5ff",border:"1.5px solid #c4b5fd",borderRadius:12,padding:14,marginBottom:12}}>
      <div style={{fontWeight:700,fontSize:13,color:"#7c3aed",marginBottom:10}}>📅 開催予定を登録</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>開催日 <span style={{color:"#dc2626"}}>*</span></label>
          <input type="date" style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #c4b5fd",fontSize:13,boxSizing:"border-box"}} value={form.scheduledDate} onChange={e=>onChange({...form,scheduledDate:e.target.value})}/></div>
        <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>開始時刻</label>
          <input type="time" style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #c4b5fd",fontSize:13,boxSizing:"border-box"}} value={form.startTime||""} onChange={e=>onChange({...form,startTime:e.target.value})}/></div>
        <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>終了時刻</label>
          <input type="time" style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #c4b5fd",fontSize:13,boxSizing:"border-box"}} value={form.endTime||""} onChange={e=>onChange({...form,endTime:e.target.value})}/></div>
      </div>
      <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>開催場所</label>
        <LocationSelect value={form.location||""} onChange={v=>onChange({...form,location:v})} accentColor="#7c3aed"/></div>
      <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>議題・内容</label>
        <textarea rows={3} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #c4b5fd",fontSize:13,boxSizing:"border-box",resize:"vertical"}} placeholder="例: ・令和7年度活動計画の審議" value={form.agenda||""} onChange={e=>onChange({...form,agenda:e.target.value})}/></div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onSave} disabled={saving} style={{flex:1,padding:"9px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>{saving?"保存中…":"保存する"}</button>
        <button onClick={onCancel} style={{flex:1,padding:"9px",background:"#f3f4f6",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>キャンセル</button>
      </div>
    </div>
  );
}

// ===== 開催予定カード =====
function MeetingCard({m,color,readList,memberCount,onDelete}){
  const isPast=m.scheduledDate<new Date().toISOString().slice(0,10);
  return(
    <div style={{border:"1px solid #e5e7eb",borderRadius:10,padding:"11px 14px",marginBottom:8,opacity:isPast?0.65:1,background:isPast?"#f9fafb":"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:isPast?"#9ca3af":color}}>{formatDate(m.scheduledDate)}{m.startTime&&` ${m.startTime}〜`}{m.endTime&&`${m.endTime}`}</div>
          {m.location&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>📍 {m.location}</div>}
          {m.agenda&&<div style={{fontSize:12,color:"#374151",marginTop:4,whiteSpace:"pre-wrap"}}>📋 {m.agenda}</div>}
          {!isPast&&<div style={{fontSize:11,color:"#6b7280",marginTop:4}}>既読: {readList.length}/{memberCount}名</div>}
        </div>
        <button onClick={onDelete} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #fca5a5",background:"#fff",color:"#dc2626",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>削除</button>
      </div>
    </div>
  );
}

// ===== お知らせフォーム =====
function NoticeForm({form,onChange,onSave,onCancel,saving}){
  return(
    <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:12,padding:14,marginBottom:12}}>
      <div style={{fontWeight:700,fontSize:13,color:"#15803d",marginBottom:10}}>📢 お知らせを投稿</div>
      <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>タイトル <span style={{color:"#dc2626"}}>*</span></label>
        <input style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #86efac",fontSize:13,boxSizing:"border-box"}} placeholder="例: 5月の委員会開催のお知らせ" value={form.title} onChange={e=>onChange({...form,title:e.target.value})}/></div>
      <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>内容</label>
        <textarea rows={4} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #86efac",fontSize:13,boxSizing:"border-box",resize:"vertical"}} placeholder="お知らせの詳細内容を入力してください" value={form.body} onChange={e=>onChange({...form,body:e.target.value})}/></div>
      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151",marginBottom:12}}>
        <input type="checkbox" checked={form.isPublic} onChange={e=>onChange({...form,isPublic:e.target.checked})} style={{width:16,height:16,accentColor:"#16a34a"}}/>
        全職員に公開する（未チェックは委員会メンバーのみ）
      </label>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onSave} disabled={saving} style={{flex:1,padding:"9px",background:"#16a34a",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>{saving?"投稿中…":"投稿する"}</button>
        <button onClick={onCancel} style={{flex:1,padding:"9px",background:"#f3f4f6",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>キャンセル</button>
      </div>
    </div>
  );
}

// ===== お知らせカード =====
function NoticeCard({n,canDelete,onDelete,committeeName,color}){
  return(
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
            {committeeName&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${color||"#7c3aed"}20`,color:color||"#7c3aed"}}>{committeeName}</span>}
            <span style={{fontWeight:700,fontSize:14,color:"#1e3a5f"}}>{n.title}</span>
            {n.isPublic&&<span style={{fontSize:10,background:"#dcfce7",color:"#15803d",borderRadius:10,padding:"1px 8px",fontWeight:700}}>全体公開</span>}
          </div>
          {n.body&&<div style={{fontSize:13,color:"#374151",whiteSpace:"pre-wrap",lineHeight:1.7,marginBottom:6}}>{n.body}</div>}
          <div style={{fontSize:11,color:"#9ca3af"}}>{n.createdAt?new Date(n.createdAt).toLocaleDateString("ja-JP"):""}</div>
        </div>
        {canDelete&&<button onClick={onDelete} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #fca5a5",background:"#fff",color:"#dc2626",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>削除</button>}
      </div>
    </div>
  );
}

// ===== 委員長専用ビュー（職員画面の委員会タブ）=====
function ChairCommitteeView({emp,committees,committeeMembers,committeeMeetings,meetingReads,committeeNotices,employees,setMembersFor,upsertMeeting,deleteMeeting,upsertNotice,deleteNotice}){
  const myCommittee=committees.find(c=>c.chairEmpId===emp.id);
  const [innerTab,setInnerTab]=useState("members");
  const [selectedMembers,setSelectedMembers]=useState([]);
  const [saving,setSaving]=useState(false);
  const [showMeetingForm,setShowMeetingForm]=useState(false);
  const [meetingForm,setMeetingForm]=useState({id:"",scheduledDate:"",startTime:"17:00",endTime:"17:30",location:"",agenda:""});
  const [showNoticeForm,setShowNoticeForm]=useState(false);
  const [noticeForm,setNoticeForm]=useState({id:"",title:"",body:"",isPublic:false});

  const {useEffect:ue}=require("react");
  ue(()=>{ if(myCommittee) setSelectedMembers(committeeMembers[myCommittee.id]||[]); },[myCommittee?.id,committeeMembers]);

  if(!myCommittee) return <div style={{padding:40,textAlign:"center",color:"#9ca3af",fontSize:13}}>委員長に設定されている委員会がありません<br/><span style={{fontSize:11}}>管理者に委員長設定を依頼してください</span></div>;

  const color=myCommittee.color||"#7c3aed";
  const myMeetings=committeeMeetings.filter(m=>m.committeeId===myCommittee.id).sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate));
  const myNotices=(committeeNotices||[]).filter(n=>n.committeeId===myCommittee.id);
  const currentMembers=committeeMembers[myCommittee.id]||[];

  const handleSaveMembers=async()=>{ setSaving(true); await setMembersFor(myCommittee.id,selectedMembers); setSaving(false); alert("メンバーを保存しました"); };
  const handleSaveMeeting=async()=>{ if(!meetingForm.scheduledDate){alert("開催日を入力してください");return;} setSaving(true); await upsertMeeting({...meetingForm,id:meetingForm.id||`M${Date.now()}`,committeeId:myCommittee.id}); setSaving(false); setShowMeetingForm(false); setMeetingForm({id:"",scheduledDate:"",startTime:"17:00",endTime:"17:30",location:"",agenda:""}); };
  const handleSaveNotice=async()=>{ if(!noticeForm.title.trim()){alert("タイトルを入力してください");return;} setSaving(true); await upsertNotice({...noticeForm,id:noticeForm.id||`N${Date.now()}`,committeeId:myCommittee.id,postedBy:emp.id}); setSaving(false); setShowNoticeForm(false); setNoticeForm({id:"",title:"",body:"",isPublic:false}); };

  return(
    <div>
      <div style={{background:`${color}18`,border:`1.5px solid ${color}33`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:16,color}}>🏛 {myCommittee.name}</div>
        {myCommittee.description&&<div style={{fontSize:12,color:"#6b7280",marginTop:4}}>{myCommittee.description}</div>}
        <div style={{fontSize:12,color,fontWeight:700,marginTop:4}}>👑 委員長: {emp.name}　メンバー: {currentMembers.length}名</div>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:"2px solid #e5e7eb",marginBottom:16}}>
        {[["members","👥 メンバー"],["meetings","📅 開催予定"],["notices","📢 お知らせ"]].map(([k,l])=>(
          <button key={k} onClick={()=>setInnerTab(k)}
            style={{padding:"10px 18px",border:"none",background:"transparent",fontWeight:700,fontSize:13,color:innerTab===k?color:"#9ca3af",borderBottom:innerTab===k?`2.5px solid ${color}`:"2.5px solid transparent",cursor:"pointer",marginBottom:-2}}>
            {l}
          </button>
        ))}
      </div>
      {innerTab==="members"&&(
        <div>
          <MemberSelector employees={employees} selected={selectedMembers} onChange={setSelectedMembers}/>
          <button onClick={handleSaveMembers} disabled={saving} style={{marginTop:14,padding:"10px",background:color,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",width:"100%"}}>{saving?"保存中…":"メンバーを保存する"}</button>
        </div>
      )}
      {innerTab==="meetings"&&(
        <div>
          <button onClick={()=>{setShowMeetingForm(true);setMeetingForm({id:"",scheduledDate:"",startTime:"17:00",endTime:"17:30",location:"",agenda:"",committeeId:myCommittee.id});}}
            style={{padding:"7px 16px",background:color,color:"#fff",border:"none",borderRadius:20,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:12}}>
            ＋ 開催予定を追加
          </button>
          {showMeetingForm&&<MeetingForm form={meetingForm} onChange={setMeetingForm} onSave={handleSaveMeeting} onCancel={()=>setShowMeetingForm(false)} saving={saving}/>}
          {myMeetings.length===0&&!showMeetingForm&&<div style={{textAlign:"center",padding:32,color:"#9ca3af",fontSize:13}}>開催予定はまだありません</div>}
          {myMeetings.map(m=><MeetingCard key={m.id} m={m} color={color} readList={meetingReads[m.id]||[]} memberCount={currentMembers.length} onDelete={async()=>{if(window.confirm("この予定を削除しますか？"))await deleteMeeting(m.id);}}/>)}
        </div>
      )}
      {innerTab==="notices"&&(
        <div>
          <button onClick={()=>{setShowNoticeForm(true);setNoticeForm({id:"",title:"",body:"",isPublic:false});}}
            style={{padding:"7px 16px",background:"#16a34a",color:"#fff",border:"none",borderRadius:20,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:12}}>
            ＋ お知らせを投稿
          </button>
          {showNoticeForm&&<NoticeForm form={noticeForm} onChange={setNoticeForm} onSave={handleSaveNotice} onCancel={()=>setShowNoticeForm(false)} saving={saving}/>}
          {myNotices.length===0&&!showNoticeForm&&<div style={{textAlign:"center",padding:32,color:"#9ca3af",fontSize:13}}>お知らせはまだありません</div>}
          {myNotices.map(n=><NoticeCard key={n.id} n={n} canDelete={true} onDelete={async()=>{if(window.confirm("削除しますか？"))await deleteNotice(n.id);}}/>)}
        </div>
      )}
    </div>
  );
}

// ===== 一般職員向けお知らせ一覧 =====
function NoticeBoard({emp,committees,committeeMembers,committeeNotices}){
  const myCommitteeIds=committees.filter(c=>(committeeMembers[c.id]||[]).includes(emp.id)).map(c=>c.id);
  const visible=(committeeNotices||[]).filter(n=>n.isPublic||myCommitteeIds.includes(n.committeeId));
  return(
    <div>
      <div style={{fontWeight:700,fontSize:14,color:"#1e3a5f",marginBottom:14}}>📢 お知らせ</div>
      {visible.length===0&&<div style={{textAlign:"center",padding:40,color:"#9ca3af",fontSize:13}}>現在お知らせはありません</div>}
      {visible.map(n=>{
        const c=committees.find(x=>x.id===n.committeeId);
        return <NoticeCard key={n.id} n={n} canDelete={false} committeeName={c?.name} color={c?.color}/>;
      })}
    </div>
  );
}

function CommitteeForm({c,employees,colors,saving,onChange,onSave,onCancel}){
  return(
    <div style={{background:"#f8f5ff",border:"1.5px solid #c4b5fd",borderRadius:12,padding:14,marginBottom:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>委員会名 <span style={{color:"#dc2626"}}>*</span></label>
          <input style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #c4b5fd",fontSize:13,boxSizing:"border-box"}}
            placeholder="例: 感染対策委員会" value={c.name} onChange={e=>onChange({...c,name:e.target.value})}/>
        </div>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>委員長（職員ID）</label>
          <select style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #c4b5fd",fontSize:13,boxSizing:"border-box"}}
            value={c.chairEmpId} onChange={e=>onChange({...c,chairEmpId:e.target.value})}>
            <option value="">── 未設定 ──</option>
            {employees.filter(e=>e.isActive!==false).map(e=><option key={e.id} value={e.id}>{e.name}（{e.id}）</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>説明</label>
        <input style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #c4b5fd",fontSize:13,boxSizing:"border-box"}}
          placeholder="委員会の目的・活動内容" value={c.description} onChange={e=>onChange({...c,description:e.target.value})}/>
      </div>
      <div style={{marginBottom:12}}>
        <label style={{display:"block",fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>テーマカラー</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {colors.map(col=>(
            <button key={col} onClick={()=>onChange({...c,color:col})}
              style={{width:28,height:28,borderRadius:"50%",background:col,border:c.color===col?"3px solid #1f2937":"2px solid transparent",cursor:"pointer"}}/>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onSave} disabled={saving} style={{flex:1,padding:"9px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>{saving?"保存中…":"保存"}</button>
        <button onClick={onCancel} style={{flex:1,padding:"9px",background:"#f3f4f6",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>キャンセル</button>
      </div>
    </div>
  );
}

const S={
  page:{minHeight:"100vh",background:"linear-gradient(135deg,#F5EDD8 0%,#FDF6EC 60%,#F5EDD8 100%)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:0,fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif"},
  appWrap:{width:"100%",maxWidth:1200,background:"#fff",borderRadius:0,boxShadow:"none",overflow:"hidden",border:"none"},
  header:{background:"#C89A55",color:"#fff",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  headerName:{fontSize:16,fontWeight:700,color:"#fff"},
  headerSub:{fontSize:11,color:"rgba(255,255,255,.8)",marginTop:2},
  logoutBtn:{padding:"5px 12px",borderRadius:8,border:"1px solid #E8D5B0",background:"#fff",color:"#4A3020",cursor:"pointer",fontSize:12,fontWeight:600},
  tabBar:{display:"flex",borderBottom:"1px solid #E8D5B0"},
  tab:{flex:1,padding:"11px 8px",border:"none",background:"transparent",fontSize:13,fontWeight:600,color:"#A07840",cursor:"pointer",whiteSpace:"nowrap"},
  tabOn:{color:"#C89A55",borderBottom:"2.5px solid #C89A55"},
  scroll:{padding:"clamp(12px,2vw,24px)",overflowY:"auto",maxHeight:"calc(100vh - 180px)"},
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
  formBox:{background:"#FDF6EC",border:"1px solid #E8D5B0",borderRadius:12,padding:16,marginBottom:16,overflow:"hidden"},
  profileSection:{marginBottom:16,paddingBottom:14,borderBottom:"1px solid #F0D9B0"},
  profileLabel:{fontSize:11,fontWeight:700,color:"#A07840",marginBottom:6},
  profileValue:{fontSize:15,fontWeight:600,color:"#4A3020"},
  qBadge:{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:"#FDF6EC",color:"#A07840",border:"1px solid #E8D5B0"},
  btn:{width:"100%",padding:"11px",background:"#C89A55",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer"},
  input:{width:"100%",maxWidth:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #E8D5B0",fontSize:14,outline:"none",boxSizing:"border-box",display:"block"},
  label:{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5},
  fGroup:{marginBottom:14},
};

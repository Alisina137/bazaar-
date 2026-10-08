"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Operator = {id:string; roles:string[]; displayName:string|null};
type Row = Record<string,unknown>;
type Tab = "overview"|"users"|"stores"|"products"|"orders"|"payments"|"subscriptions"|"reviews"|"reports"|"tickets"|"categories"|"promotions"|"coupons"|"audit"|"prices"|"settings";
const menu: {key:Tab;label:string;section:string}[] = [
  {key:"overview",label:"Overview",section:"Operations"},
  {key:"users",label:"Users",section:"Management"},
  {key:"stores",label:"Stores",section:"Management"},
  {key:"products",label:"Products",section:"Management"},
  {key:"orders",label:"Orders",section:"Commerce"},
  {key:"payments",label:"Payments / refunds",section:"Commerce"},
  {key:"subscriptions",label:"Subscriptions",section:"Commerce"},
  {key:"reviews",label:"Reviews",section:"Moderation"},
  {key:"reports",label:"Reports",section:"Moderation"},
  {key:"tickets",label:"Support tickets",section:"Moderation"},
  {key:"categories",label:"Categories",section:"Catalog"},
  {key:"promotions",label:"Promotions",section:"Catalog"},
  {key:"coupons",label:"Coupons",section:"Catalog"},
  {key:"audit",label:"Audit trail",section:"System"},
  {key:"prices",label:"Plan prices",section:"System"},
  {key:"settings",label:"Configuration",section:"System"}
];
const choices: Partial<Record<Tab,string[]>> = {
  users:["active","suspended","disabled"],
  stores:["suspended","draft"],
  products:["draft","archived"],
  subscriptions:["active","grace_period","expired","canceled"],
  reviews:["published","hidden","removed"],
  reports:["resolved","dismissed"]
};
const headlines:Record<string,string> = {
  overview:"Platform overview",users:"Registered users",stores:"Seller stores",products:"Marketplace products",
  orders:"Orders",payments:"Payment and refund visibility",subscriptions:"Merchant subscriptions",
  reviews:"Review moderation",reports:"Reported reviews",tickets:"Support desk",
  categories:"Merchant categories",promotions:"Promotions",coupons:"Coupons",audit:"Immutable audit history",
  prices:"Subscription pricing",settings:"Platform configuration"
};
async function api(path:string, options:RequestInit={}) {
  const response = await fetch(path,{...options,cache:"no-store",headers:options.body?{"content-type":"application/json"}:undefined});
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error?.code ?? "Request failed");
  return data;
}
function cell(value:unknown):string {
  if (value===null || value===undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value==="object") return JSON.stringify(value);
  return String(value);
}
function shortCell(value:unknown) {const valueStr=cell(value);return valueStr.length>95?valueStr.slice(0,92)+"…":valueStr;}
const columns:Partial<Record<Tab,string[]>>={
  users:["id","name","status","roles","created_at"],
  stores:["id","name","handle","status","plan","subscription_status"],
  products:["id","name","store_id","status","price"],
  orders:["id","name","status","total","store_id","created_at"],
  payments:["id","status","amount","currency","refund_state","refunded_amount","store_id"],
  subscriptions:["id","store_id","plan","status","current_period_end"],
  reviews:["id","rating","text","status","store_id"],
  reports:["id","review_id","reason","details","status"],
  tickets:["id","name","category","status","user_id"],
  categories:["id","name","status","store_id"],
  promotions:["id","name","active","promotional_price","store_id"],
  coupons:["id","name","active","value","type"],
  audit:["created_at","actor_user_id","action","resource","target_id","reason","before","after"]
};
export default function AdminHome() {
  const [user,setUser]=useState<Operator|null>(null);
  const [pendingSession,setPendingSession]=useState(true);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState<Tab>("overview");
  const [rows,setRows]=useState<Row[]>([]);
  const [overview,setOverview]=useState<Row>({});
  const [offset,setOffset]=useState(0);
  const [filter,setFilter]=useState("");
  const [prices,setPrices]=useState<Row[]>([]);
  const [settings,setSettings]=useState<Row[]>([]);
  const [currencyValue,setCurrencyValue]=useState("");
  const [settingValue,setSettingValue]=useState("");
  const [settingKey,setSettingKey]=useState("support_email");
  const [plan,setPlan]=useState("pro");
  const isSuper=Boolean(user?.roles.includes("super_admin"));
  const canManage=isSuper||Boolean(user?.roles.includes("platform_admin"));
  const tabs=useMemo(()=>menu.filter(item => (item.key!=="audit"&&item.key!=="settings" || isSuper) && (item.key!=="users" || canManage) && (item.key!=="prices" || canManage)),[isSuper,canManage]);
  useEffect(()=>{void api("/api/session").then(data=>setUser(data.user)).catch(()=>undefined).finally(()=>setPendingSession(false));},[]);
  const load=useCallback(async (section:Tab, pageOffset:number)=>{
    setLoading(true);setError("");setRows([]);
    try {
      if(section==="overview") {const data=await api("/api/platform/overview");setOverview(data.overview??{});}
      else if(section==="prices") {const data=await api("/api/platform/prices");setPrices(data.prices??[]);}
      else if(section==="settings") {const data=await api("/api/platform/settings");setSettings(data.settings??[]);}
      else {const data=await api("/api/platform/records/"+section+"?offset="+pageOffset+"&limit=25");setRows(data.items??[]);}
    } catch(e) {setError(e instanceof Error?e.message:"Service unavailable");}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{if(user)void load(tab,offset);},[user,tab,offset,load]);
  function switchTab(next:Tab){setTab(next);setOffset(0);setFilter("");setMessage("");}
  async function login(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError("");
    try {const data=await api("/api/session",{method:"POST",body:JSON.stringify({email,password})});setPassword("");setUser(data.user);}
    catch(e){setError(e instanceof Error?e.message:"Login failed");}
    finally{setLoading(false);}
  }
  async function logout(){await api("/api/session",{method:"DELETE"}).catch(()=>undefined);setUser(null);setPassword("");setRows([]);setTab("overview");}
  async function changeStatus(row:Row,action:string) {
    if(!canManage && !["reviews","reports"].includes(tab)) return;
    const reason=window.prompt("Reason for this action (minimum 10 characters):","");
    if(!reason || reason.trim().length<10) return;
    if(!window.confirm("Confirm "+action+" for record "+row.id+"? This will be audited."))return;
    setLoading(true);setError("");setMessage("");
    try{await api("/api/platform/actions/"+tab+"/"+row.id,{method:"POST",body:JSON.stringify({action,reason})});setMessage("Saved and recorded in audit trail.");await load(tab,offset);}
    catch(e){setError(e instanceof Error?e.message:"Unable to update");}
    finally {setLoading(false);}
  }
  async function updateRole(row:Row,role:"platform_admin"|"platform_support",enabled:boolean){
    if(!isSuper) return;
    const reason=window.prompt("Reason for "+(enabled?"granting":"revoking")+" "+role+":","");
    if(!reason || reason.trim().length<10)return;
    setLoading(true);setError("");
    try {await api("/api/platform/operator-roles/"+row.id,{method:"POST",body:JSON.stringify({role,enabled,reason})});setMessage("Role updated and audited");await load(tab,offset);}
    catch(e){setError(e instanceof Error?e.message:"Unable to change role");}finally{setLoading(false);}
  }
  async function savePrice(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const amount=Number(currencyValue);
    if(!Number.isFinite(amount)||amount<0)return;
    setLoading(true);setError("");
    try{await api("/api/platform/prices/"+plan,{method:"PUT",body:JSON.stringify({monthlyAfn:amount})});setMessage("Price setting saved. This does not collect merchant payments.");await load("prices",0);}
    catch(e){setError(e instanceof Error?e.message:"Unable to save price");}finally{setLoading(false);}
  }
  async function saveSetting(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const reason=window.prompt("Reason for configuration change (minimum 10 characters):","");
    if(!reason||reason.trim().length<10)return;
    setLoading(true);setError("");
    try{await api("/api/platform/settings/"+settingKey,{method:"PUT",body:JSON.stringify({value:settingValue,reason})});setMessage("Configuration value saved and audited.");await load("settings",0);}
    catch(e){setError(e instanceof Error?e.message:"Unable to save setting");}finally{setLoading(false);}
  }
  const visibleRows=rows.filter(row=>Object.values(row).some(value=>cell(value).toLowerCase().includes(filter.toLowerCase())));
  if(pendingSession)return <main className="login"><div className="loading">Restoring administrator session…</div></main>;
  if(!user)return <main className="login"><div className="auth-card"><div className="brand-mark">B</div><p className="eyebrow">BAZAARLINK / PLATFORM</p><h1>Operator sign in</h1><p>Access is restricted to approved support and platform operators.</p><form onSubmit={login}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={loading} type="submit">{loading?"Checking…":"Sign in securely"}</button></form>{error&&<p role="alert" className="error">{error}</p>}</div></main>;
  return <div className="console"><aside className="sidebar"><div className="brand"><span className="brand-mark">B</span><span>BazaarLink<small>Platform operations</small></span></div><div className="navigation">{tabs.map((item,index)=><div key={item.key}>{(index===0||tabs[index-1]?.section!==item.section)&&<p className="nav-section">{item.section}</p>}<button className={tab===item.key?"nav-active":""} onClick={()=>switchTab(item.key)}>{item.label}</button></div>)}</div><div className="sidebar-footer"><p className="eyebrow">Signed in</p><p>{user.displayName||user.id.slice(0,8)}</p><small>{user.roles.filter(role=>role.startsWith("platform_")||role==="super_admin").join(" · ")}</small><button className="signout" onClick={()=>void logout()}>Sign out</button></div></aside>
    <main className="workspace"><header className="topbar"><div><p className="eyebrow">OPERATIONS CENTER · 2026</p><h1>{headlines[tab]}</h1><p>Controlled platform actions, clear accountability, and scoped access.</p></div><div className="pill">● Secure session</div></header>
    {error&&<div role="alert" className="banner danger">{error}</div>}{message&&<div role="status" className="banner success">{message}</div>}
    {tab==="overview"&&<div className="metrics">{Object.entries(overview).map(([key,value])=><article className="metric" key={key}><span>{key.replaceAll("_"," ")}</span><strong>{cell(value)}</strong></article>)}{loading&&<p>Loading live metrics…</p>}</div>}
    {tab==="prices"&&<section className="panel"><h2>Configured monthly prices (AFN)</h2><p>Pricing metadata for Pro and Business. Billing activation and payment collection remain separate from this configuration.</p><div className="metrics">{prices.map(row=><div className="metric" key={cell(row.plan)}><span>{cell(row.plan)}</span><strong>{cell(row.monthlyAfn)} AFN</strong></div>)}</div><form className="inline-form" onSubmit={savePrice}><label>Plan<select value={plan} onChange={e=>setPlan(e.target.value)}><option value="pro">Pro</option><option value="business">Business</option></select></label><label>Monthly AFN<input type="number" min="0" step=".01" value={currencyValue} onChange={e=>setCurrencyValue(e.target.value)} required/></label><button disabled={loading||!canManage}>Save price</button></form></section>}
    {tab==="settings"&&<section className="panel"><h2>Operator configuration</h2><p>Manage approved informational settings. Each change requires a written reason.</p><div className="settings-list">{settings.map(row=><article key={cell(row.key)}><strong>{cell(row.key)}</strong><p>{cell(row.value)}</p></article>)}</div><form className="inline-form" onSubmit={saveSetting}><label>Setting<select value={settingKey} onChange={e=>setSettingKey(e.target.value)}><option value="support_email">Support email</option><option value="moderation_policy">Moderation policy</option><option value="maintenance_message">Maintenance message</option></select></label><label>Value<input value={settingValue} onChange={e=>setSettingValue(e.target.value)} maxLength={2000}/></label><button disabled={loading||!isSuper}>Save configuration</button></form></section>}
    {!["overview","prices","settings"].includes(tab)&&<section className="panel"><div className="panel-head"><div><h2>{headlines[tab]}</h2><p>Read-only lists except authorized, individually audited actions. Page size 25.</p></div><div className="toolbar"><input aria-label="Filter displayed rows" placeholder="Filter current page…" value={filter} onChange={e=>setFilter(e.target.value)}/><button className="secondary" onClick={()=>void load(tab,offset)} disabled={loading}>↻ Refresh</button></div></div><div className="table-container"><table><thead><tr>{(columns[tab]??["id"]).map(key=><th key={key}>{key.replaceAll("_"," ")}</th>)}{choices[tab]&&<th>Actions</th>}{tab==="users"&&isSuper&&<th>Operator access</th>}</tr></thead><tbody>{visibleRows.map(row=><tr key={cell(row.id)}>{(columns[tab]??["id"]).map(key=><td key={key} title={cell(row[key])}>{shortCell(row[key])}</td>)}{choices[tab]&&<td><div className="actions">{(choices[tab]??[]).map(action=><button key={action} className="mini" disabled={loading || (!canManage && !["reviews","reports"].includes(tab)) || cell(row.status)===action} onClick={()=>void changeStatus(row,action)}>{action}</button>)}</div></td>}{tab==="users"&&isSuper&&<td><div className="actions">{(["platform_support","platform_admin"] as const).map(role=><button key={role} className="mini" disabled={loading} onClick={()=>void updateRole(row,role,!cell(row.roles).includes(role))}>{cell(row.roles).includes(role)?"Revoke ":"Grant "}{role}</button>)}</div></td>}</tr>)}{visibleRows.length===0&&<tr><td className="empty" colSpan={10}>{loading?"Loading records…":"No records on this page."}</td></tr>}</tbody></table></div><div className="pagination"><span>Offset {offset} · Showing {rows.length} records</span><div><button className="secondary" disabled={loading||offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}>← Previous</button><button className="secondary" disabled={loading||rows.length<25} onClick={()=>setOffset(offset+25)}>Next →</button></div></div></section>}
    <footer className="footer">BazaarLink · Platform administration · Changes require permission and are recorded with actor, reason and time.</footer>
    </main></div>;
}

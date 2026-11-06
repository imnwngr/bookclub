import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, errorMessage } from "../lib/supabase";
import { ErrorState, Loading } from "../components/Feedback";
import { Confirm } from "../components/Confirm";
interface Account {user_id:string;email:string;role:'admin'|'editor';status:string}
export default function RoleDirectory(){
 const [search,setSearch]=useState(''),[filter,setFilter]=useState(''),[dialog,setDialog]=useState(false),[email,setEmail]=useState(''),[action,setAction]=useState('invite'),[busy,setBusy]=useState(false),[target,setTarget]=useState<Account|null>(null);
 const modal=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(dialog){modal.current?.showModal();}else modal.current?.close();},[dialog]);
 const directory=useQuery({queryKey:['roles'],queryFn:async()=>{const r=await db().rpc('role_directory');if(r.error)throw r.error;return r.data as Account[];}});
 const role=useQuery({queryKey:['effective-role'],queryFn:async()=>{const r=await db().rpc('effective_role');if(r.error)throw r.error;return r.data as string|null;}});
 async function mutate(body:object){if(busy)return;setBusy(true);try{const r=await db().functions.invoke('manage-editors',{body:{...body,role:'editor'}});if(r.error){let message=errorMessage(r.error);if(r.error.context instanceof Response){const detail=await r.error.context.json().catch(()=>null);if(detail?.error)message=detail.error;}throw Error(message)}if(!r.data?.ok)throw Error(r.data?.error??'Không thể cập nhật vai trò');toast.success('Đã cập nhật vai trò');setDialog(false);setTarget(null);await directory.refetch();}catch(e){toast.error(errorMessage(e))}finally{setBusy(false)}}
 if(directory.isPending||role.isPending)return <Loading/>;if(directory.error||role.error)return <ErrorState error={directory.error||role.error}/>;
 const admin=role.data==='admin';const rows=(directory.data??[]).filter(r=>r.email?.toLowerCase().includes(search.toLowerCase())&&(!filter||r.role===filter));
 return <section className="admin"><div className="section-head"><h1>Quản lý vai trò</h1>{admin&&<button onClick={()=>setDialog(true)}>Thêm tài khoản</button>}</div><div className="toolbar"><label>Tìm email<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Vai trò<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Tất cả</option><option value="admin">Admin</option><option value="editor">Editor</option></select></label></div>{!admin&&<p>Danh sách chỉ đọc.</p>}{rows.length?rows.map(r=><div className="panel" key={r.user_id}><strong>{r.email}</strong><p>{r.role==='admin'?'Admin · Được bảo vệ':'Editor'} · {r.status==='invited'?'Đã mời':r.status==='confirmed'?'Đã xác nhận':'Chưa xác nhận'}</p>{admin&&r.role==='editor'&&<button className="secondary" onClick={()=>setTarget(r)}>Thu hồi Editor</button>}</div>):<p>Không có tài khoản phù hợp.</p>}
 {dialog&&<dialog ref={modal} onCancel={e=>{e.preventDefault();if(!busy)setDialog(false)}} aria-label="Thêm tài khoản Editor"><form className="panel" onSubmit={e=>{e.preventDefault();void mutate({action,email})}}><h2>Thêm tài khoản</h2><label>Email<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Vai trò<select value="editor" disabled><option value="editor">Editor</option></select></label><label>Thao tác<select value={action} onChange={e=>setAction(e.target.value)}><option value="invite">Mời tài khoản mới</option><option value="grant">Cấp quyền cho tài khoản có sẵn</option></select></label><div className="actions"><button disabled={busy}>{busy?'Đang xử lý…':'Xác nhận'}</button><button type="button" disabled={busy} onClick={()=>setDialog(false)}>Hủy</button></div></form></dialog>}
 {target&&<Confirm title="Thu hồi quyền Editor?" busy={busy} onClose={()=>setTarget(null)} onConfirm={()=>void mutate({action:'revoke',user_id:target.user_id})}>Tài khoản {target.email} sẽ mất quyền quản trị nội dung. Tài khoản đăng nhập vẫn được giữ.</Confirm>}
 </section>;
}

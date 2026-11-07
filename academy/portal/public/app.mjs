// No user IDs or account permissions are stored in browser state.
const el = id => document.getElementById(id);
const show = (id, visible) => { el(id).hidden = !visible; };
const message = value => { el('message').textContent = value; };
let currentLesson;
async function api(path, options={}) {
  const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || data.message || `Request returned ${r.status}`);
  return data;
}
async function post(path,data){return api(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});}
async function loadCatalog(){
  const items=(await api('/api/catalog')).courses;
  el('catalog').replaceChildren();
  if (!items.length){ el('catalog').textContent='No publicly released courses yet.';return; }
  for(const course of items){
    const box=document.createElement('article');box.className='course';
    const h=document.createElement('h3');h.textContent=course.title;
    const p=document.createElement('p');p.textContent=course.summary;
    box.append(h,p);el('catalog').append(box);
  }
}
async function loadAccount(){
  try{
    const {user}=await api('/api/me');
    el('account-status').textContent=`Signed in as ${user.name} (${user.email}).`;
    show('auth-actions',false);show('sign-out',true);show('my-learning',true);
    const {courses}=await api('/api/my/courses');
    const root=el('enrollments');root.replaceChildren();
    if(!courses.length){root.textContent='No active enrollments. Course purchases are not yet available.';return;}
    for(const course of courses){
      const button=document.createElement('button');button.textContent=`Open ${course.title} (v${course.version_number})`;
      button.addEventListener('click',()=>loadProgress(course.version_id).catch(e=>message(e.message)));
      root.append(button);
    }
  }catch{
    show('auth-actions',true);show('sign-out',false);show('my-learning',false);
    el('account-status').textContent='Sign in to view your enrolled courses.';
  }
}
async function loadProgress(versionId){
  const data=await api(`/api/my/courses/${encodeURIComponent(versionId)}/progress`);
  currentLesson=undefined;show('lesson-content',false);
  const root=el('lesson-list');root.replaceChildren();
  const h=document.createElement('h3');h.textContent=`${data.title} — Course version ${data.version}`;root.append(h);
  for(const lesson of data.lessons){
    const button=document.createElement('button');button.className='lesson-link';
    button.textContent=`${lesson.position}. ${lesson.title} (${lesson.completed_at ? 'Acknowledged' : 'Not acknowledged'})`;
    button.addEventListener('click',()=>openLesson(versionId,lesson.id).catch(e=>message(e.message)));
    root.append(button);
  }
}
async function openLesson(versionId,lessonId){
  const {lesson}=await api(`/api/my/courses/${encodeURIComponent(versionId)}/lessons/${encodeURIComponent(lessonId)}`);
  currentLesson={versionId,lessonId};el('lesson-title').textContent=lesson.title;
  el('lesson-body').textContent=lesson.body_text || '';
  show('lesson-content',true);message('');
}
el('acknowledge').addEventListener('click',async()=>{
  if(!currentLesson)return;
  try{
    const {versionId,lessonId}=currentLesson;
    const res=await post(`/api/my/courses/${encodeURIComponent(versionId)}/lessons/${encodeURIComponent(lessonId)}/acknowledge`,{});
    message(res.warning);await loadProgress(versionId);
  }catch(e){message(e.message);}
});
function handleForm(id,path,createBody,after){
  el(id).addEventListener('submit',async event=>{
    event.preventDefault();const button=event.currentTarget.querySelector('[type=submit]');
    if(button.disabled)return;button.disabled=true;
    try{
      await post(path,createBody(new FormData(event.currentTarget)));
      await after();
    }catch(e){message(`Could not complete that request: ${e.message}`);}
    finally{button.disabled=false;}
  });
}
handleForm('signin','/api/auth/sign-in/email',f=>({email:f.get('email'),password:f.get('password')}),async()=>{message('Signed in.');await loadAccount();});
handleForm('signup','/api/auth/sign-up/email',f=>({name:f.get('name'),email:f.get('email'),password:f.get('password')}),async()=>{
  message('Account requested. Check your email and follow the verification link before signing in.');
});
handleForm('forgot','/api/auth/request-password-reset',f=>({email:f.get('email'),redirectTo:`${location.origin}/reset-password.html`}),async()=>{
  message('If the address belongs to an account, a password-reset message will be sent.');
});
el('sign-out').addEventListener('click',async()=>{
  try{await post('/api/auth/sign-out',{});await loadAccount();message('Signed out.');}
  catch(e){message(e.message);}
});
(async()=>{
  try{
    const status=await api('/api/status');
    if(!status.accounts_enabled){
      el('system-status').textContent='Development preview: learner registration, sign-in, and enrollments are not activated.';
      show('auth-actions',false);return;
    }
    el('system-status').textContent='Development environment enabled. This is not a CE approval or a public launch.';
    await loadCatalog();await loadAccount();
  }catch{el('system-status').textContent='The Academy service is not available.';show('auth-actions',false);}
})();

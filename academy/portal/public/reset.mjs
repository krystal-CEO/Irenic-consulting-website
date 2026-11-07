const form=document.getElementById('reset-form');
const status=document.getElementById('message');
const token=new URLSearchParams(location.search).get('token');
if(!token){form.hidden=true;status.textContent='This reset link is invalid or expired. Request another link from the learner portal.';}
form.addEventListener('submit',async e=>{
  e.preventDefault();
  const button=form.querySelector('button');button.disabled=true;
  try{
    const resp=await fetch('/api/auth/reset-password',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({newPassword:document.getElementById('password').value,token})});
    if(!resp.ok)throw new Error('Reset link expired or request could not be completed.');
    form.hidden=true;status.textContent='Password reset confirmed. Return to the learner portal and sign in.';
    history.replaceState(null,'','/reset-password.html');
  }catch(err){status.textContent=err.message;}finally{button.disabled=false;}
});

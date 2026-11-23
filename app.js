const $=id=>document.getElementById(id);
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isoDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur'}).format(date);
const today=()=>isoDate(new Date());
function nextSaturday(){const d=new Date();d.setDate(d.getDate()+((6-d.getDay()+7)%7||7));return isoDate(d)}
function initial(){
 const date=nextSaturday();
 const available={0:[],1:[],2:[],3:[],4:[],5:[['17:00','22:00']],6:[['08:00','23:00']]};
 return {people:{amy:{name:'Amy Tan',school:'Crescendo International College',location:'Johor Bahru',contact:'amy@example.com',buffer:30,blocked:[],availability:structuredClone(available)},dan:{name:'Daniel Lee',school:'UTM',location:'Johor Bahru',contact:'daniel@example.com',buffer:30,blocked:[],availability:structuredClone(available)},employer:{name:'Bloom Collective',location:'Johor Bahru',contact:'hiring@example.com'}},shifts:[
 {id:'event',title:'Weekend Event Assistant',type:'Events',date,start:'10:00',end:'16:00',location:'Johor Bahru',address:'Main entrance, City Square',rate:12,capacity:1,description:'Welcome guests, support event setup and help at the registration desk.',closed:false},
 {id:'cafe',title:'Cafe Crew',type:'Food & Beverage',date,start:'15:00',end:'21:00',location:'Skudai',address:'Bloom Cafe, front counter',rate:10,capacity:3,description:'Take orders, serve drinks and keep the counter tidy.',closed:false},
 {id:'promo',title:'Brand Promoter',type:'Retail',date,start:'08:00',end:'14:00',location:'Johor Bahru',address:'Information desk, Mid Valley Southkey',rate:15,capacity:2,description:'Introduce products to shoppers and assist with the pop-up booth.',closed:false}],applications:[]}
}
let data;try{data=JSON.parse(localStorage.getItem('campusshift-v1'))||initial()}catch{data=initial()}
let user='amy',page='home',filters={location:'',query:'',date:'',type:'',rate:'',compatible:false};
const normalizeLocation=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
function locationOptions(){return [...new Map([...data.shifts.flatMap(s=>[s.location,s.address]),data.people.employer.location].filter(v=>String(v||'').trim()).map(v=>[normalizeLocation(v),String(v).trim()])).values()].sort((a,b)=>a.localeCompare(b))}
const save=()=>localStorage.setItem('campusshift-v1',JSON.stringify(data));
const minutes=time=>Number(time.split(':')[0])*60+Number(time.split(':')[1]);
const format=date=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
const confirmed=id=>data.applications.filter(a=>a.shift===id&&a.status==='Confirmed');
const remaining=s=>s.capacity-confirmed(s.id).length;
function match(s,uid=user){
 const p=data.people[uid], day=new Date(s.date+'T12:00:00').getDay();
 if(p.blocked.includes(s.date))return 'Unavailable on this date';
 const slots=p.availability[day]||[];
 if(!slots.length)return 'No availability on this day';
 const fits=slots.some(([start,end])=>minutes(s.start)>=minutes(start)+Number(p.buffer)&&minutes(s.end)<=minutes(end));
 if(!fits){
  if(slots.some(([start,end])=>minutes(s.start)>=minutes(start)&&minutes(s.start)<minutes(start)+Number(p.buffer)&&minutes(s.end)<=minutes(end)))return 'Insufficient arrival buffer';
  if(slots.some(([start,end])=>minutes(s.start)>=minutes(start)+Number(p.buffer)&&minutes(s.start)<minutes(end)&&minutes(s.end)>minutes(end)))return 'Ends after your availability';
  return 'Outside your available hours';
 }
 const clash=data.applications.some(a=>{
  const other=data.shifts.find(x=>x.id===a.shift);
  return a.student===uid&&a.status==='Confirmed'&&other&&other.id!==s.id&&other.date===s.date&&minutes(s.start)<minutes(other.end)+Number(p.buffer)&&minutes(other.start)<minutes(s.end)+Number(p.buffer);
 });
 return clash?'Conflicts with a confirmed shift':'Fits your schedule';
}
function notify(message){$('notice').textContent=message}
function stats(){
 const employer=user==='employer';
 const mine=data.applications.filter(a=>employer||a.student===user);
 const values=employer?[[data.shifts.filter(s=>!s.closed&&s.date>=today()).length,'Open shifts'],[mine.filter(a=>a.status==='Pending').length,'Pending applicants'],[mine.filter(a=>a.status==='Confirmed').length,'Confirmed workers']]:[[data.shifts.filter(s=>!s.closed&&s.date>=today()&&remaining(s)>0&&match(s)==='Fits your schedule').length,'Matching shifts'],[mine.filter(a=>a.status==='Pending').length,'Pending applications'],[mine.filter(a=>a.status==='Confirmed').length,'Confirmed shifts']];
 $('stats').innerHTML=values.map(([n,t])=>'<div class="stat">'+t+'<strong>'+n+'</strong></div>').join('');
}
function render(){
 const employer=user==='employer';
 const tabs=employer?[['manage','Manage shifts'],['review','Applicant review'],['schedule','Confirmed schedule']]:[['home','Overview'],['find','Find shifts'],['availability','My availability'],['applications','My applications'],['schedule','My schedule']];
 if(!tabs.some(([id])=>id===page))page=tabs[0][0];
 $('nav').innerHTML=tabs.map(([id,label])=>'<button data-page="'+id+'" class="'+(id===page?'active':'')+'">'+label+'</button>').join('');
 $('context').textContent=(employer?'Employer':'Student')+' workspace · '+data.people[user].name;
 $('eyebrow').textContent=employer?'BUILD YOUR NEXT TEAM':'WORK AROUND YOUR CLASSES';
 $('title').textContent=employer?'Great shifts. Great people.':({home:'Find your next shift.',find:'Make your free time count.',availability:'Your time, your terms.',applications:'Keep track of every shift.',schedule:'Your next working days.'}[page]);
 $('subtitle').textContent=employer?'Publish shifts and meet students who can make it.':'A little extra income. A schedule that fits.';
 stats();
 if(page==='availability')renderAvailability();
 else if(page==='applications'||page==='schedule'||page==='review')renderApplications();
 else renderShifts();
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;notify('');render()});
}
function shiftCard(s){
 const employer=user==='employer',status=employer?'':match(s),app=data.applications.find(a=>a.student===user&&a.shift===s.id);
 const canApply=!s.closed&&s.date>=today()&&remaining(s)>0&&status==='Fits your schedule'&&(!app||app.status==='Cancelled');
 return '<article class="card"><div class="row"><span class="pill">'+esc(s.type)+'</span><span class="money">RM'+s.rate+'<small> / hr</small></span></div><div><h3>'+esc(s.title)+'</h3><small>'+esc(data.people.employer.name)+' · '+esc(s.location)+'</small></div><p>'+format(s.date)+' · '+s.start+'–'+s.end+'</p><p class="muted">'+esc(s.description)+'</p><p class="muted">Meet at '+esc(s.address)+'</p><div class="row"><span class="pill '+(status==='Fits your schedule'?'good':'warn')+'">'+esc(employer?(s.closed?'Closed':'Open'):status)+'</span><small>'+remaining(s)+' of '+s.capacity+' slots left</small></div><div class="actions">'+(employer?'<button data-edit="'+s.id+'">Edit shift</button><button data-close="'+s.id+'">'+(s.closed?'Reopen':'Close')+'</button>':'<button class="primary" data-apply="'+s.id+'" '+(!canApply?'disabled':'')+'>'+esc(app&&app.status!=='Cancelled'?app.status:s.closed?'Closed':s.date<today()?'Ended':remaining(s)<=0?'Full':'Apply for shift')+'</button>')+'</div></article>';
}
function renderShifts(){
 const employer=user==='employer';
 let shifts=data.shifts.filter(s=>employer||(!s.closed&&s.date>=today()));
 if(!employer)shifts=shifts.filter(s=>(!filters.location||[s.location,s.address].some(v=>normalizeLocation(v)===normalizeLocation(filters.location)))&&(!filters.date||s.date===filters.date)&&(!filters.type||s.type===filters.type)&&(!filters.rate||s.rate>=Number(filters.rate))&&(!filters.compatible||match(s)==='Fits your schedule'));
 const locations=locationOptions(),types=[...new Set(data.shifts.map(s=>s.type))];
 $('view').innerHTML='<div class="row"><h2>'+ (employer?'Your shifts':page==='home'?'Explore available shifts':'Available shifts')+'</h2>'+(employer?'<button class="primary" id="newShift">＋ Post a shift</button>':'')+'</div>'+(!employer?'<div class="filters"><label>Location<select id="location"><option value="">All locations</option>'+locations.map(l=>'<option '+(filters.location===l?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label><label>Date<input id="date" type="date" value="'+filters.date+'"></label><label>Job type<select id="type"><option value="">All types</option>'+types.map(t=>'<option '+(filters.type===t?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label><label>Min. RM / hr<input id="rate" type="number" min="0" value="'+filters.rate+'"></label><button id="compatible" aria-pressed="'+filters.compatible+'">'+(filters.compatible?'✓ ':'')+'Fits my schedule</button><button id="resetFilters">Reset</button></div>':'')+'<div class="cards">'+(shifts.map(shiftCard).join('')||'<div class="panel empty">No open, upcoming shifts match your filters. Try Reset. Employers must set the area on the shift itself; updating a company profile does not move existing shifts.</div>')+'</div>';
 if(employer){
  $('newShift').onclick=()=>editShift();
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editShift(data.shifts.find(s=>s.id===b.dataset.edit)));
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{const s=data.shifts.find(s=>s.id===b.dataset.close);s.closed=!s.closed;save();render()});
 }else{
  for(const key of ['location','date','type','rate'])$(key).onchange=e=>{filters[key]=e.target.value;render()};
  $('compatible').onclick=()=>{filters.compatible=!filters.compatible;render()};
  $('resetFilters').onclick=()=>{filters={location:'',query:'',date:'',type:'',rate:'',compatible:false};render()};
  document.querySelectorAll('[data-apply]').forEach(b=>b.onclick=()=>{
   const s=data.shifts.find(s=>s.id===b.dataset.apply);
   if(match(s)!=='Fits your schedule'||remaining(s)<1||s.closed)return;
   let a=data.applications.find(a=>a.student===user&&a.shift===s.id);
   if(a&&a.status!=='Cancelled')return;
   if(a)a.status='Pending';else data.applications.push({id:crypto.randomUUID(),shift:s.id,student:user,status:'Pending'});
   save();render();notify('Application submitted. Switch to the employer workspace to review it.');
  });
 }
}
function openForm(title,html,submit){
 $('dialogtitle').textContent=title;$('fields').innerHTML=html;$('error').textContent='';
 $('form').onsubmit=e=>{e.preventDefault();try{submit(new FormData(e.target));$('dialog').close();save();render()}catch(error){$('error').textContent=error.message}};
 $('dialog').showModal();
}
function field(name,label,value='',type='text',required=true){return '<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>'}
function editShift(s){
 openForm(s?'Edit shift':'Post a shift',field('title','Position',s?.title)+field('type','Job type',s?.type||'Events')+field('date','Date',s?.date||nextSaturday(),'date')+field('start','Starts',s?.start||'10:00','time')+field('end','Ends',s?.end||'16:00','time')+field('location','Area',s?.location||data.people.employer.location||'Johor Bahru')+field('address','Reporting location',s?.address)+field('rate','Hourly pay (RM)',s?.rate||12,'number')+field('capacity','Total slots',s?.capacity||1,'number')+'<label>Job duties<textarea name="description" required>'+esc(s?.description)+'</textarea></label>',f=>{
  const value=Object.fromEntries(f);for(const key of ['title','type','location','address','description'])value[key]=value[key].trim();if(!value.location||!value.address)throw Error('Enter an area and reporting location.');value.rate=Number(value.rate);value.capacity=Number(value.capacity);
  if(value.date<today())throw Error('Choose today or a future date.');
  if(minutes(value.end)<=minutes(value.start))throw Error('End time must be later than start time on the same day.');
  if(value.rate<=0||!Number.isInteger(value.capacity)||value.capacity<1)throw Error('Enter positive pay and a whole number of slots.');
  if(s&&confirmed(s.id).length){
   if(['date','start','end','location','address'].some(k=>value[k]!==s[k]))throw Error('Confirmed workers are assigned. Close this shift and post a new shift to change its schedule or reporting location.');
   if(value.capacity<confirmed(s.id).length)throw Error('Slots cannot be lower than the confirmed worker count.');
  }
  if(s)Object.assign(s,value);else data.shifts.push({id:crypto.randomUUID(),...value,closed:false});
 });
}
function renderAvailability(){
 const p=data.people[user];
 $('view').innerHTML='<section class="panel"><h2>Weekly availability</h2><p class="muted">Add the hours you are free. Your arrival buffer is added after the start of each available period.</p>'+[1,2,3,4,5,6,0].map(day=>'<div class="day"><div class="row"><strong>'+days[day]+'</strong><button data-add="'+day+'">＋ Add time</button></div>'+p.availability[day].map(([start,end],i)=>'<div class="time-row"><input aria-label="'+days[day]+' start" type="time" data-day="'+day+'" data-index="'+i+'" data-part="0" value="'+start+'"><span>to</span><input aria-label="'+days[day]+' end" type="time" data-day="'+day+'" data-index="'+i+'" data-part="1" value="'+end+'"><button data-remove="'+day+':'+i+'">Remove</button></div>').join('')+'</div>').join('')+'<label style="margin-top:18px">Arrival / between-shift buffer (minutes)<input id="buffer" type="number" min="0" max="240" value="'+p.buffer+'"></label><h3>Unavailable dates</h3><div class="filters"><label>Add an exam or personal day<input type="date" id="blocked"></label><button id="block">Block date</button></div><div class="actions">'+p.blocked.map(date=>'<button data-unblock="'+date+'">'+date+' ×</button>').join('')+'</div><p class="muted">Availability changes are saved automatically. Existing confirmed bookings stay on your schedule.</p></section>';
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{p.availability[b.dataset.add].push(['09:00','17:00']);save();render()});
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const [day,i]=b.dataset.remove.split(':');p.availability[day].splice(i,1);save();render()});
 document.querySelectorAll('[data-part]').forEach(input=>input.onchange=()=>{
  const slot=p.availability[input.dataset.day][input.dataset.index],copy=[...slot];copy[input.dataset.part]=input.value;
  if(!input.value||minutes(copy[1])<=minutes(copy[0])){notify('Choose an end time after the start time.');input.value=slot[input.dataset.part];return}
  p.availability[input.dataset.day][input.dataset.index]=copy;save();notify('Availability saved.');
 });
 $('buffer').onchange=e=>{const n=Number(e.target.value);if(n<0||n>240){e.target.value=p.buffer;return}p.buffer=n;save();notify('Buffer saved.')};
 $('block').onclick=()=>{const date=$('blocked').value;if(date&&!p.blocked.includes(date)){p.blocked.push(date);save();render()}};
 document.querySelectorAll('[data-unblock]').forEach(b=>b.onclick=()=>{p.blocked=p.blocked.filter(d=>d!==b.dataset.unblock);save();render()});
}
function renderApplications(){
 const employer=user==='employer',schedule=page==='schedule';
 const apps=data.applications.filter(a=>(employer||a.student===user)&&(!schedule||a.status==='Confirmed')).sort((a,b)=>data.shifts.find(s=>s.id===a.shift).date.localeCompare(data.shifts.find(s=>s.id===b.shift).date));
 $('view').innerHTML='<h2>'+(schedule?'Confirmed schedule':employer?'Applicant review':'My applications')+'</h2><div class="cards">'+(apps.map(a=>{
  const s=data.shifts.find(s=>s.id===a.shift),p=data.people[a.student];
  return '<article class="card"><div class="row"><h3>'+esc(s.title)+'</h3><span class="pill '+(a.status==='Confirmed'?'good':'')+'">'+a.status+'</span></div><p>'+format(s.date)+' · '+s.start+'–'+s.end+'</p><p>'+esc(s.location)+' · '+esc(s.address)+'</p>'+(employer?'<p><strong>'+esc(p.name)+'</strong><br><span class="muted">'+esc(p.school)+'<br>'+esc(p.contact)+'</span></p>':'<p class="money">RM'+s.rate+'<small> / hr</small></p>')+'<div class="actions">'+(employer&&a.status==='Pending'?'<button class="primary" data-confirm="'+a.id+'">Confirm applicant</button><button data-reject="'+a.id+'">Decline</button>':'')+(!employer&&['Pending','Confirmed'].includes(a.status)?'<button data-cancel="'+a.id+'">Cancel application</button>':'')+'</div></article>';
 }).join('')||'<div class="panel empty">'+(employer?'Applications will appear here when students apply.':'No '+(schedule?'confirmed shifts':'applications')+' yet. Browse available shifts to get started.')+'</div>')+'</div>';
 document.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>{
  const a=data.applications.find(x=>x.id===b.dataset.confirm),s=data.shifts.find(x=>x.id===a.shift);
  if(a.status!=='Pending')return;
  if(s.closed||s.date<today()||remaining(s)<=0){notify('This shift is closed, ended or full.');return}
  const reason=match(s,a.student);if(reason!=='Fits your schedule'){notify('Cannot confirm: '+reason);return}
  a.status='Confirmed';save();render();notify('Applicant confirmed. The remaining slot count has been updated.');
 });
 document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>{data.applications.find(a=>a.id===b.dataset.reject).status='Unsuccessful';save();render()});
 document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{if(confirm('Cancel this application?')){data.applications.find(a=>a.id===b.dataset.cancel).status='Cancelled';save();render()}});
}
$('profile').onclick=()=>{
 const p=data.people[user];
 openForm('Edit profile',(user==='employer'?'<p class="muted">Company area is the default for new shifts. To update a published job location, use Manage shifts → Edit shift and change its Area or Reporting location. Existing shifts keep their own locations.</p>':'')+field('name',user==='employer'?'Company name':'Full name',p.name)+(user==='employer'?'':field('school','University / college',p.school))+field('location','Area',p.location)+field('contact','Contact email',p.contact,'email'),f=>{const value=Object.fromEntries(f);value.location=value.location.trim();if(!value.location)throw Error('Enter an area.');Object.assign(p,value)});
};
window.addEventListener('storage',e=>{if(e.key==='campusshift-v1'&&e.newValue){try{data=JSON.parse(e.newValue);render();notify('Updated records loaded from another tab.')}catch{}}});
$('close').onclick=()=>$('dialog').close();
$('user').onchange=e=>{user=e.target.value;page=user==='employer'?'manage':'home';filters={location:'',query:'',date:'',type:'',rate:'',compatible:false};notify('');render()};
render();

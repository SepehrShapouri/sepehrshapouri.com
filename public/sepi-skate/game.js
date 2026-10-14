(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),stage=$('stage');
const sound=window.SkateAudio?new window.SkateAudio():null;
const themeMedia=matchMedia('(prefers-color-scheme: dark)');
let night=themeMedia.matches;
let W=560,H=176,G=139,mode='ready',time=0,scroll=0,speed=83,score=0,best=0,combo=0,obstacles=[],particles=[],nextSpawn=160,down=false,last=0,raf=0,toastTime=0,flipTime=0,flipDone=false,pending=0,grinding=false,distance=0;
const player={x:115,y:139,vy:0,ground:true,support:null};
let obstacleCount=0,shuvTime=0,shuvDone=false,airComboIndex=-1,comboTricks=[],comboTime=0;
let manual=false,manualKey=false,manualTouch=false,manualTime=0,manualScored=false,landingTime=0;
let grindObstacle=null,grindStyle='50-50',grindStyleTime=0,grindStyleScored=false,grindYaw=0,grindTilt=0;
let grindPointerId=null,grindPointerStart=0,grindTouchStyle='50-50';
const grindKeys=new Set(),comboGrindStyles=new Set();
const GRIND_SETTLE=.18, GRIND_DRAG_THRESHOLD=18;
const GRIND_STYLES={
 '50-50':{label:'50–50',points:100,rate:22},
 boardslide:{label:'Boardslide',points:120,rate:26},
 '5-0':{label:'5–0',points:140,rate:30}
};
const FLIP_DURATION=.5, FLIP_CATCH=.09;
const SHUV_DURATION=.44, COMBO_GRACE=.8, MANUAL_LIMIT=3, MANUAL_MIN=.25, LANDING_DURATION=.18;
const PUSH_SETUP=.28, PUSH_STROKE=.60, PUSH_RETURN=.32, MAX_BOOST=68;
let pushTime=0, pushMode='idle', pushExitFrom=null, boost=0, pushTouch=false, pushDust=false;
const pushKeys=new Set();
function clearPush(){pushKeys.clear();pushTouch=false;pushTime=0;pushMode='idle';pushExitFrom=null}
function startPush(){pushMode='setup';pushTime=PUSH_SETUP;pushDust=false}
function beginPush(source){
 if(mode==='ready'||mode==='over')start();
 if(mode!=='playing')return;
 if(source==='touch')pushTouch=true;else pushKeys.add(source);
 if(player.ground&&!grinding&&!down&&!manualHeld()&&pushTime<=0)startPush();
}
function cruiseSpeed(){return Math.min(145,83+distance*.025)}
function updatePushing(dt){
 boost=Math.max(0,boost*Math.exp(-.32*dt));if(boost<.05)boost=0;
 const held=pushTouch||pushKeys.size>0;
 if(!player.ground||grinding||down||manual||manualHeld()||player.support?.type==='ramp'){pushTime=0;pushMode='idle'}
 else{
 if(pushTime<=0&&held)startPush();
 // Release captures the current pose, so returning to the deck never snaps.
 if(pushTime>0&&!held&&pushMode!=='return'){
 pushExitFrom=pushPose();pushMode='return';pushTime=PUSH_RETURN;
 }
 if(pushTime>0){
 const u=1-pushTime/PUSH_STROKE;
 if(pushMode==='stroke'&&u<.48){boost=Math.min(MAX_BOOST,boost+115*dt);if(!pushDust){burst(player.x-8,G+5,5,palette().paving);pushDust=true}}
 pushTime=Math.max(0,pushTime-dt);
 if(pushTime<=0){
 if(pushMode!=='return'&&held){pushMode='stroke';pushTime=PUSH_STROKE;pushDust=false}
 else{pushMode='idle';pushExitFrom=null}
 }
 }
 }
 speed=cruiseSpeed()+boost;
}
try{best=Number(localStorage.getItem('sepi-skate-best')||0)}catch{}if(!Number.isFinite(best))best=0;
const NIGHT_PALETTE={
 sky:'#111b2c',horizon:'#24334b',dot:'#61718b',far:'#28374e',farShade:'#202d41',edge:'#536270',
 leaf:'#34554f',leafLight:'#4c7064',leafShade:'#29453f',leafDeep:'#1e3435',leafGlint:'#789383',bark:'#49464b',barkLight:'#6b6561',
 ground:'#424d59',paving:'#35414e',line:'#75818d',accent:'#e9bd77',road:'#263442',roof:'#506175',glass:'#253e51',glassLight:'#42627a',
 faces:['#4a485b','#575362','#3c5264','#3c5558','#5d4d59'],shades:['#38394b','#434250','#2d4053','#2c424a','#483b4b'],
 awnings:['#43645f','#7f5c61','#535f7b'],metal:'#7e96a6',wood:'#92785f',sun:'#e2e4c5',cloud:'#2b3b52',car:'#52697f',
 trim:'#788396',sill:'#778593',awningStripe:'#929083',planter:'#3c4c52',planterEdge:'#65747c',roadMark:'#60707b',pavementEdge:'#73808b',pavementGlint:'#637381',
 windowLit:'#d9ad73',windowHighlight:'#f4d6a0',windowShade:'#9c785c',headlight:'#f7dda0',taillight:'#b76e70',chrome:'#879ca7',wheel:'#202e3c',wheelHub:'#798c9b',
 woodLight:'#c6af87',woodShade:'#6e5b53',concrete:'#67727a',concreteFace:'#7d8789',concreteTop:'#b2bdb8',cone:'#c48b68',paint:'#b88376',paintLight:'#bcb9a4',shadow:'#273340',
 water:'#496f82',waterDark:'#355565',waterLight:'#a3b6b5',pause:'#0b152875'
};
const DAY_PALETTE={
 sky:'#eaf1ef',horizon:'#f2efdf',dot:'#e0e9e4',far:'#cddadb',farShade:'#bacbce',mid:'#bac5b5',edge:'#9ca894',
 leaf:'#668e5c',leafLight:'#8eac69',leafShade:'#4c7454',leafDeep:'#3f6050',leafGlint:'#b1c783',bark:'#806951',barkLight:'#b29770',
 ground:'#d7d0bb',paving:'#c2bba7',line:'#9e9787',accent:'#d9b761',road:'#a5afae',roof:'#77817e',glass:'#77949b',glassLight:'#bdd1cd',
 faces:['#cda18a','#e1c999','#a9c0c3','#b9c4a9','#ddc3ab'],shades:['#b48879','#c6ae82','#8ba6ae','#9aa98f','#bca58f'],
 awnings:['#6c9586','#bb8272','#8c9aaf'],metal:'#627a7d',wood:'#b78e63',sun:'#eddaad',cloud:'#f7f7ed',car:'#89a5b2',
 trim:'#f0dfbb',sill:'#eee0c2',awningStripe:'#eee7d2',planter:'#b1b69b',planterEdge:'#d0d0b6',roadMark:'#d6d5c2',pavementEdge:'#f1e9d5',pavementGlint:'#e8e0cb',
 windowLit:'#77949b',windowHighlight:'#bdd1cd',windowShade:'#77949b',headlight:'#f2ddac',taillight:'#c6816c',chrome:'#c7d5d5',wheel:'#465157',wheelHub:'#b5c4c6',
 woodLight:'#e9ce9a',woodShade:'#9a785d',concrete:'#aaa896',concreteFace:'#c0beaa',concreteTop:'#eee5cd',cone:'#cb8d60',paint:'#b87e69',paintLight:'#e3d4b7',shadow:'#aaa58e',
 water:'#a5c4c7',waterDark:'#94b8be',waterLight:'#e0eddf',pause:'#f1f3ea99'
};
const palette=()=>night?NIGHT_PALETTE:DAY_PALETTE;
function resize(){W=Math.max(320,Math.round(stage.clientWidth/2));H=Math.round(stage.clientHeight/2);G=H-37;canvas.width=W;canvas.height=H;player.x=Math.min(115,W*.23);if(player.ground)player.y=player.support?surfaceY(player.support):G}new ResizeObserver(resize).observe(stage);
function fmt(n){return Math.floor(n).toString().padStart(5,'0')}
function hud(){
 $('score').textContent=fmt(score);$('best').textContent=fmt(best);$('pace').textContent=(speed/cruiseSpeed()).toFixed(1)+'×';$('pace-label').textContent=grinding?GRIND_STYLES[grindStyle].label.toUpperCase():manual?'MANUAL':pushTime>0&&pushMode!=='return'?'PUSHING':boost>4?'COASTING':'CRUISE';$('pace-meter').style.setProperty('--pace',String(Math.round(boost/MAX_BOOST*100))+'%');$('pace-meter').classList.toggle('is-fast',boost>20);
 const active=pending>0||manual,panel=$('combo-panel');
 panel.classList.toggle('hidden',!active);$('callout').classList.toggle('hidden',active);
 if(active){
  $('combo-tricks').textContent=comboTricks.slice(-3).join(' → ')||'Manual';
  $('combo-tricks').title=comboTricks.join(' → ');
  $('combo-value').textContent='+'+comboValue();$('combo-multiplier').textContent=comboMultiplier()+'×';
  $('combo-status').textContent=grinding&&!grindStyleScored?'Locking in':manual?'Release to bank':player.ground&&!grinding?'Landing…':'At risk';
  panel.classList.toggle('is-manual',manual);panel.classList.toggle('is-critical',manual&&manualTime>MANUAL_LIMIT*.75);
  panel.style.setProperty('--combo-progress',String(100*(manual?manualTime/MANUAL_LIMIT:comboTime/COMBO_GRACE))+'%');
 }
 $('manual').setAttribute('aria-pressed',String(manualHeld()));
 $('grind').setAttribute('aria-pressed',String(down));
 $('grind-label').textContent=down?GRIND_STYLES[selectedGrindStyle()].label:'HOLD + SLIDE';
}hud();
function audioState(){return {playing:mode==='playing'&&!document.hidden,grounded:player.ground,grinding,manual,speed,style:grindStyle,surface:grindObstacle?.type}}
function toast(label,points=0,multiplier=1){
 const callout=$('callout'),name=document.createElement('span');
 name.textContent=label.charAt(0)+label.slice(1).toLowerCase();
 callout.replaceChildren(name);
 if(points){const value=document.createElement('strong');value.textContent='+'+points;callout.append(' ',value)}
 if(multiplier>1){const comboLabel=document.createElement('span');comboLabel.className='callout-combo';comboLabel.textContent='· '+multiplier+'×';callout.append(' ',comboLabel)}
 toastTime=1.5;
}
function burst(x,y,n=10,c){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*65,vy:-Math.random()*55,life:.3+Math.random()*.35,c:c||palette().accent})}
function overlay(show,title,copy,label){$('overlay').classList.toggle('hidden',!show);$('overlay').classList.toggle('is-ready',mode==='ready');$('overlay').classList.toggle('is-over',mode==='over');if(title!==undefined)$('overlay-title').innerHTML=title;if(copy!==undefined)$('overlay-copy').textContent=copy;if(label)$('play').textContent=label}
function comboMultiplier(){return Math.max(1,Math.min(combo,4))}
function comboValue(){return Math.floor(pending*comboMultiplier())}
function clearCombo(){pending=0;combo=0;comboTime=0;comboTricks=[];airComboIndex=-1;comboGrindStyles.clear()}
function addComboTrick(label,points){pending+=points;combo++;comboTime=0;comboTricks.push(label)}
function bankCombo(){
 if(pending<=0)return;
 const earned=comboValue();score+=earned;clearCombo();toast('Banked',earned);
}
function beginAirTrick(label,points){
 manual=false;manualTime=0;manualScored=false;landingTime=0;
 flipTime=0;flipDone=false;shuvTime=0;shuvDone=false;
 airComboIndex=comboTricks.length;addComboTrick(label,points);
}
function upgradeAirTrick(label,points){
 if(airComboIndex<0){airComboIndex=comboTricks.length;addComboTrick(label,points)}
 else{pending+=points;comboTricks[airComboIndex]=label}
}
function manualHeld(){return manualKey||manualTouch}
function clearManualInput(){manualKey=false;manualTouch=false}
function beginManual(source){
 if(mode==='ready'||mode==='over')start();
 if(mode!=='playing')return;
 if(source==='touch')manualTouch=true;else manualKey=true;
}
function updateManual(dt){
 const canBalance=player.ground&&!grinding&&!down&&player.support?.type!=='ramp';
 if(manualHeld()&&canBalance){
  if(!manual){manual=true;manualTime=0;manualScored=false;pushTime=0;pushMode='idle'}
  manualTime+=dt;
  if(manualTime>=MANUAL_LIMIT){end();return}
  if(!manualScored&&manualTime>=MANUAL_MIN){addComboTrick('Manual',25);manualScored=true}
  if(manualScored)pending+=12*dt;
 }else if(manual){
  manual=false;manualTime=0;manualScored=false;
  if(canBalance&&!manualHeld())bankCombo();
 }
}
function updateCombo(dt){
 if(pending<=0)return;
 if(!player.ground||grinding||manual||player.support?.type==='ramp'){comboTime=0;return}
 comboTime+=dt;
 if(comboTime>=COMBO_GRACE)bankCombo();
}
function syncGrindInput(){down=grindKeys.has('arrowdown')||grindPointerId!==null}
function selectedGrindStyle(){
 if(grindPointerId!==null)return grindTouchStyle;
 const left=grindKeys.has('arrowleft'),right=grindKeys.has('arrowright');
 return left!==right?(left?'boardslide':'5-0'):'50-50';
}
function clearGrindInput(){grindKeys.clear();grindPointerId=null;grindTouchStyle='50-50';syncGrindInput()}
function clearGrindContact(){grindObstacle=null;grindStyleTime=0;grindStyleScored=false}
function grindPose(){
 return {yaw:grindYaw,tilt:grindTilt,lift:-2*(1-Math.sin(grindYaw))};
}
function updateGrindPose(dt){
 const blend=1-Math.exp(-20*dt);
 grindYaw+=((grinding&&grindStyle==='boardslide'?Math.PI/2:0)-grindYaw)*blend;
 grindTilt+=((grinding&&grindStyle==='5-0'?-.19:0)-grindTilt)*blend;
}
function start(){
 sound?.stop();void sound?.unlock();
 mode='playing';score=0;clearCombo();distance=0;speed=83;boost=0;clearPush();clearManualInput();clearGrindInput();clearGrindContact();grindStyle='50-50';grindYaw=0;grindTilt=0;
 obstacles=[];particles=[];nextSpawn=45;player.y=G;player.vy=0;player.ground=true;player.support=null;obstacleCount=0;
 flipTime=0;flipDone=false;shuvTime=0;shuvDone=false;down=false;grinding=false;manual=false;manualTime=0;manualScored=false;landingTime=0;
 $('callout').textContent='';overlay(false);canvas.focus({preventScroll:true});hud();sound?.update(audioState());
}
function jump(){
 if(mode==='ready'||mode==='over'){start();return}
 if(mode==='paused'){pause();return}
 if(mode!=='playing')return;
 if(player.ground||grinding){
  pushTime=0;player.support=null;player.vy=-171;player.ground=false;grinding=false;clearGrindContact();
  beginAirTrick('Ollie',10);burst(player.x,player.y,5);sound?.play('pop',.8);
 }
}
function flip(){
 if(mode!=='playing'||player.ground||grinding||flipDone||shuvDone)return;
 flipTime=FLIP_DURATION;flipDone=true;upgradeAirTrick('Kickflip',75);sound?.play('flip',.32,1.08);
}
function shuvit(){
 if(mode!=='playing'||player.ground||grinding||flipDone||shuvDone)return;
 shuvTime=SHUV_DURATION;shuvDone=true;upgradeAirTrick('Shuv-it',60);sound?.play('shuvit',.42);
}
function pause(){
 if(mode==='playing'){
  mode='paused';sound?.stop();clearGrindInput();clearPush();clearManualInput();manual=false;manualTime=0;manualScored=false;
  overlay(true,'Catch your<br>breath.','Your session will be right here.','Keep rolling');
 }else if(mode==='paused'){mode='playing';void sound?.unlock();sound?.update(audioState());overlay(false);canvas.focus({preventScroll:true})}
 hud();
}
function end(){
 const lost=comboValue();mode='over';clearPush();clearManualInput();clearGrindInput();clearGrindContact();manual=false;manualTime=0;manualScored=false;
 burst(player.x,player.y-7,22,'#7d8a67');sound?.stop();sound?.play('bail',.85,.88);
 if(score>best){best=Math.floor(score);try{localStorage.setItem('sepi-skate-best',String(best))}catch{}}
 clearCombo();grinding=false;down=false;
 overlay(true,'',`Score: ${Math.floor(score)}${lost?' · '+lost+' lost':''}`, 'Play again');$('callout').textContent='';hud();
}
function catchBoard(){
 if(Math.max(flipTime,shuvTime)>FLIP_CATCH){end();return false}
 flipTime=0;shuvTime=0;return true;
}
function land(surface=G){
 if(!catchBoard())return;
 const impact=player.vy;player.ground=true;player.vy=0;player.y=surface;comboTime=0;airComboIndex=-1;
 flipDone=false;shuvDone=false;landingTime=LANDING_DURATION;
 sound?.play('land',Math.min(.85,.4+impact/450));burst(player.x,surface+3,5,palette().paving);
}
function surfaceY(o){return o.type==='ramp'?G-o.h*clamp01((player.x-o.x)/o.w):G-o.h}
function spawn(){
 const opening=['ramp','curb','rail','puddle','bench','ramp','cone'];
 let type;if(obstacleCount<opening.length)type=opening[obstacleCount];
 else{const r=Math.random();type=r<.24?'ramp':r<.50?'curb':r<.68?'rail':r<.83?'bench':r<.92?'puddle':'cone';
 if(type==='cone'&&obstacles.at(-1)?.type==='cone')type='ramp'}
 const sizes={ramp:[52,24],curb:[64,12],rail:[112,18],bench:[43,19],puddle:[34,0],cone:[9,12]};
 const w=type==='rail'?Math.ceil(Math.max(sizes[type][0],speed*1.1))+Math.floor(Math.random()*25):sizes[type][0],h=sizes[type][1];
 obstacles.push({x:W+25,w,h,type,passed:false,splashed:false});obstacleCount++;
 nextSpawn=w+Math.max(145+Math.random()*70,speed*1.35+35);
}
function launchRamp(){
 player.support=null;player.ground=false;player.vy=-176-boost*.12;pushTime=0;
 beginAirTrick('Ramp air',35);burst(player.x,player.y,6);sound?.play('pop',.55,.95);
}
function grindOn(o,dt){
 if(grindObstacle!==o)sound?.play('land',.28,1.12);
 player.y=G-o.h+2;player.vy=0;grinding=true;player.ground=false;player.support=null;airComboIndex=-1;
 const style=selectedGrindStyle();
 if(grindObstacle!==o||grindStyle!==style){grindObstacle=o;grindStyle=style;grindStyleTime=0;grindStyleScored=false}
 grindStyleTime+=dt;
 const trick=GRIND_STYLES[style],label=style==='50-50'?(o.type==='bench'?'Bench grind':o.type==='curb'?'Curb grind':'50–50 grind'):trick.label;
 if(!grindStyleScored&&grindStyleTime>=GRIND_SETTLE){
  // A surface awards each style once; tapping through poses cannot farm a combo.
  o.grindAwards??=new Set();
  if(!o.grindAwards.has(style)){
   const base=o.type==='curb'?trick.points*.7:trick.points;
   const entry=comboGrindStyles.has(style)?Math.floor(base*.5):base;
   addComboTrick(label,entry+(o.grindAwards.size>0?35:0));
   o.grindAwards.add(style);comboGrindStyles.add(style);
  }else if(!combo){addComboTrick(label,0);comboGrindStyles.add(style)}
  grindStyleScored=true;
 }
 if(grindStyleScored)pending+=trick.rate*dt;
 const sparkX=player.x+(style==='boardslide'?0:style==='5-0'?-10:-8);
 if(Math.random()<.3)burst(sparkX,player.y,1,'#e4b557');
}
function update(dt){
 time+=dt;toastTime-=dt;if(toastTime<=0)$('callout').textContent='';
 if(mode==='playing'){
 updatePushing(dt);scroll+=speed*dt;distance+=speed*dt*.12;score+=dt*2;nextSpawn-=speed*dt;if(nextSpawn<=0)spawn();
 for(const o of obstacles)o.x-=speed*dt;
 flipTime=Math.max(0,flipTime-dt);shuvTime=Math.max(0,shuvTime-dt);landingTime=Math.max(0,landingTime-dt);
 // Flat surfaces carry the rider; a ramp releases them upward at its lip.
 if(player.ground&&player.support){
 const o=player.support;if(player.x>o.x+o.w){if(o.type==='ramp')launchRamp();else{player.support=null;player.ground=false;player.vy=0;airComboIndex=-1}}
 else player.y=surfaceY(o);
 }
 const oldY=player.y;grinding=false;
 if(!player.ground){player.vy+=400*dt;player.y+=player.vy*dt}
 for(const o of obstacles){
 const overlaps=player.x+6>o.x&&player.x-6<o.x+o.w,top=surfaceY(o);
 if(o.type==='ramp'&&overlaps){
 if(player.ground){player.support=o;player.y=top;pushTime=0}
 else if(player.vy>=0&&oldY<=top+5&&player.y>=top-2){land(top);if(mode==='playing')player.support=o}
 }else if((o.type==='curb'||o.type==='bench'||o.type==='rail')&&overlaps){
 const contact=player.vy>=0&&oldY<=top+5&&player.y>=top-2;
 if(contact&&down){if(!catchBoard())break;grindOn(o,dt)}
 else if(contact&&o.type!=='rail'){if(!player.ground)land(top);player.support=o;player.y=top}
 else if(player.y>top+6){end();break}
 }else if(o.type==='cone'&&Math.abs(player.x-(o.x+o.w/2))<10&&player.y>G-o.h+3){end();break}
 else if(o.type==='puddle'&&overlaps&&player.ground&&player.y>=G-2&&!o.splashed){
 o.splashed=true;boost*=.35;pushTime=0;burst(player.x,G+2,17,'#8db7c1');toast('SPLASH!');
 }
 if(mode!=='playing')break;
 if(!o.passed&&o.x+o.w<player.x-10){o.passed=true;score+=o.type==='ramp'?10:20}
 }
 obstacles=obstacles.filter(o=>o.x+o.w>-20);
 if(!grinding)clearGrindContact();
 updateGrindPose(dt);
 if(mode==='playing'&&player.y>=G&&!player.ground){player.support=null;land()}
 if(mode==='playing')updateManual(dt);
 if(mode==='playing')updateCombo(dt);
 hud();
 }else if(mode==='ready'){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)scroll+=dt*12}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=130*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);sound?.update(audioState())
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function line(x1,y1,x2,y2,c,width=1){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);ctx.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);ctx.stroke()}
// Asymmetric, stepped clusters give every tree a real pixel silhouette.
function crown(x,y,w,h,base,light){
 rect(x+5,y,w-12,3,base);rect(x+2,y+3,w-5,4,base);rect(x,y+7,w,h-13,base);
 rect(x+3,y+h-6,w-7,4,base);rect(x+8,y+h-2,w-17,2,base);
 rect(x+6,y+3,w-17,3,light);rect(x+3,y+6,7,4,light);rect(x+10,y+5,4,3,light);
}
function tree(x,y,p,variant=0){
 const tall=variant%2===0?0:6;const gold=variant%5===4;
 const leaves=gold&&!night?['#a79d5c','#c0b675','#857e51']: [p.leaf,p.leafLight,p.leafShade];
 rect(x-13,y+1,30,2,p.edge);rect(x-1,y-37-tall,5,37+tall,p.bark);
 rect(x,y-30-tall,2,30+tall,p.barkLight);rect(x-6,y-31-tall,3,15,p.bark);rect(x-9,y-34-tall,4,5,p.bark);
 rect(x+4,y-26-tall,3,10,p.bark);rect(x+7,y-32-tall,3,8,p.bark);
 crown(x-18,y-42-tall,26,25,p.leafDeep,leaves[2]);crown(x-5,y-44-tall,26,25,leaves[2],leaves[0]);
 crown(x-14,y-54-tall,30,27,leaves[0],leaves[1]);crown(x-22,y-43-tall,25,22,leaves[0],leaves[1]);
 crown(x+1,y-41-tall,22,23,leaves[2],leaves[0]);
 rect(x-8,y-50-tall,4,2,p.leafGlint);rect(x-18,y-36-tall,3,2,p.leafGlint);rect(x+4,y-46-tall,3,2,leaves[1]);
 rect(x-10,y-24-tall,4,3,leaves[2]);rect(x+12,y-21-tall,3,2,leaves[2]);
 // Low planting beds keep the trees rooted in the street.
 rect(x-15,y-1,33,4,p.planter);rect(x-15,y-1,33,1,p.planterEdge);
 for(let i=0;i<5;i++){rect(x-12+i*6,y-4-(i%2),2,4,leaves[2]);rect(x-11+i*6,y-5-(i%2),3,2,leaves[0])}
}
function building(x,y,w,h,p,k){
 if(night)h=Math.round(h*.82);
 const face=p.faces[k%5],shade=p.shades[k%5];
 rect(x,y-h,w,h,face);rect(x+w-7,y-h,7,h,shade);rect(x-1,y-h-2,w+2,3,p.roof);
 rect(x+2,y-h+1,w-11,2,p.trim);rect(x+5,y-h-7,7,5,shade);
 if(k%3===0){rect(x+w-12,y-h-15,1,12,p.roof);line(x+w-17,y-h-11,x+w-7,y-h-11,p.roof)}
 const floors=Math.max(1,Math.floor((h-17)/15));
 for(let f=0;f<floors;f++)for(let xx=6;xx<w-12;xx+=13){let yy=y-h+8+f*15;
 // Stable window patterns keep the skyline from flickering as it scrolls.
 const lit=night&&(k*3+f*5+Math.floor(xx/13))%5<3;
 rect(x+xx-1,yy-1,8,11,shade);rect(x+xx,yy,6,8,lit?p.windowLit:p.glass);rect(x+xx,yy,2,5,lit?p.windowHighlight:p.glassLight);
 if(lit){rect(x+xx,yy+5,6,3,p.windowShade);rect(x+xx-1,yy-1,8,1,'#e3b97b24')}
 rect(x+xx+3,yy,1,8,face);rect(x+xx-1,yy+8,8,2,p.sill);
 if((k+f)%3===0){rect(x+xx-2,yy+10,10,1,p.roof);for(let q=0;q<3;q++)rect(x+xx-1+q*4,yy+7,1,3,p.roof)}
 }
 // Ground-floor shopfronts, striped awnings and a narrow door.
 const shopLit=night&&k%3!==2;
 rect(x+4,y-13,w-15,12,p.roof);rect(x+6,y-11,11,9,shopLit?p.windowLit:p.glass);rect(x+7,y-10,2,6,shopLit?p.windowHighlight:p.glassLight);
 rect(x+w-18,y-11,8,11,shade);rect(x+w-16,y-10,4,6,shopLit?p.windowShade:p.glass);rect(x+w-12,y-4,1,1,p.windowHighlight);
 rect(x+3,y-16,w-13,3,p.awnings[k%3]);for(let i=0;i<w-13;i+=8)rect(x+3+i,y-16,4,3,p.awningStripe);
 rect(x+3,y-13,w-13,1,shade);rect(x,y-1,w,2,shade);
 if(k%2===0){for(let i=0;i<5;i++)rect(x+2+(i%2)*9,y-h+23+i*5,4,1,shade)}
}
function cloud(x,y,p){rect(x+8,y,18,3,p.cloud);rect(x+3,y+3,32,4,p.cloud);rect(x,y+7,41,3,p.cloud);rect(x+7,y+10,27,1,p.dot)}
function lamp(x,y,p){
 if(night){
  pixelPoly([[x+7,y-40],[x+12,y-40],[x+32,y+4],[x-13,y+4]],'#f3cd8110');
  rect(x+3,y-46,13,9,'#f3cd810c');rect(x+5,y-44,9,6,'#f3cd8124');
 }
 rect(x,y-43,2,43,p.metal);rect(x-2,y-2,6,2,p.metal);rect(x-1,y-45,11,2,p.metal);rect(x+7,y-43,5,3,p.metal);rect(x+8,y-42,3,2,night?p.windowHighlight:'#dfd8b3');
}
function bench(x,y,p){rect(x,y-9,29,2,p.wood);rect(x,y-6,29,2,p.wood);rect(x-1,y-3,31,2,p.wood);rect(x+3,y-1,2,5,p.metal);rect(x+25,y-1,2,5,p.metal);rect(x+3,y-8,1,5,p.metal);rect(x+25,y-8,1,5,p.metal)}
function car(x,y,p){
 rect(x+3,y+1,45,2,p.edge);rect(x+1,y-11,49,9,p.car);rect(x+5,y-15,38,5,p.car);rect(x+13,y-22,23,7,p.car);
 rect(x+12,y-19,3,5,p.glass);rect(x+16,y-20,8,6,p.glass);rect(x+26,y-20,8,6,p.glass);rect(x+17,y-19,6,1,p.glassLight);
 rect(x+8,y-14,34,1,p.chrome);rect(x+25,y-13,1,9,p.glass);rect(x+27,y-11,3,1,p.roof);
 if(night){pixelPoly([[x+2,y-9],[x+2,y-6],[x-19,y-2],[x-19,y-12]],'#f7dda011');rect(x+47,y-10,5,5,'#b76e7024')}
 rect(x,y-9,4,3,p.headlight);rect(x+47,y-9,3,3,p.taillight);rect(x,y-3,50,2,p.roof);
 for(const w of [9,37]){rect(x+w-1,y-4,8,6,p.wheel);rect(x+w,y-5,6,8,p.wheel);rect(x+w+1,y-3,4,4,p.wheelHub);rect(x+w+2,y-2,2,2,p.roof)}
}
function nightSky(p){
 // Decorative positions are deterministic and never consume gameplay randomness.
 const skyHeight=Math.max(28,G-62);
 for(let i=0;i<Math.ceil(W/13);i++){
  const x=(i*73+19)%W,y=5+(i*i*11+i*7)%skyHeight;
  rect(x,y,1,1,i%4===0?'#bac6cf':'#73849e');
  if(i%11===0){rect(x-1,y,3,1,'#9cabc3');rect(x,y-1,1,3,'#9cabc3')}
 }
 const x=Math.round(W*.72),y=15;
 rect(x-3,y-3,21,22,'#c8d5de05');rect(x-1,y-1,17,18,'#c8d5de0b');
 rect(x+4,y,7,2,p.sun);rect(x+1,y+2,13,3,p.sun);rect(x,y+5,15,7,p.sun);rect(x+2,y+12,11,3,p.sun);rect(x+5,y+15,5,1,p.sun);
 rect(x+7,y,7,3,p.sky);rect(x+6,y+3,9,6,p.sky);rect(x+8,y+9,7,3,p.sky);
 rect(x+2,y+7,2,3,'#b9c6b3');rect(x+5,y+12,2,1,'#b9c6b3');
}
function scenery(p){
 rect(0,0,W,H,p.sky);rect(0,G-61,W,61,p.horizon);
 // The dotted canvas remains a subtle nod to the original portfolio signature.
 if(night)nightSky(p);
 else{
  for(let x=5;x<W;x+=8)for(let y=4;y<G-64;y+=8)rect(x,y,1,1,p.dot);
  rect(W-71,36,15,18,p.sun);rect(W-74,39,21,12,p.sun);
  const cloudOffset=(scroll*.035)%390;for(let i=-1;i<Math.ceil(W/390)+1;i++){cloud(i*390+40-cloudOffset,40,p);cloud(i*390+253-cloudOffset,24,p)}
 }
 // Cool, quiet silhouettes establish a separate distant city layer.
 let far=scroll*.09%370;for(let i=-1;i<Math.ceil(W/370)+1;i++){let b=i*370-far;for(let j=0;j<7;j++){let hh=Math.round([42,65,53,81,46,59,35][j]*(night?.7:1));let xx=b+j*54;rect(xx,G-21-hh,39,hh,p.far);rect(xx+31,G-21-hh,8,hh,p.farShade);rect(xx+5,G-25-hh,25,4,p.far);for(let r=0;r<Math.floor(hh/10)-1;r++)for(let c=0;c<3;c++)rect(xx+6+c*9,G-16-hh+r*10,3,5,night&&(j+r*3+c)%7===0?'#8a7c72':p.sky)}}
 const block=560,phase=(scroll*.24)%block;
 for(let i=-1;i<Math.ceil(W/block)+1;i++){let b=i*block-phase;
 building(b+8,G-15,47,54,p,0);building(b+59,G-15,43,66,p,1);building(b+107,G-15,54,48,p,2);
 building(b+211,G-15,42,62,p,3);building(b+257,G-15,50,73,p,4);building(b+311,G-15,47,51,p,0);
 building(b+419,G-15,53,59,p,1);building(b+476,G-15,49,45,p,2);
 }
 rect(0,G-14,W,9,p.road);rect(0,G-14,W,1,p.roof);
 for(let i=-1;i<W/90+1;i++)rect(i*90-(scroll*.45)%90,G-8,27,1,p.roadMark);
 // Street furniture travels faster than the buildings for gentle parallax.
 for(let i=-1;i<Math.ceil(W/420)+1;i++){let x=i*420-(scroll*.43)%420;car(x+248,G-6,p)}
 rect(0,G-4,W,4,p.paving);rect(0,G-4,W,1,p.pavementEdge);
 for(let i=-1;i<Math.ceil(W/380)+1;i++){let x=i*380-(scroll*.52)%380;tree(x+31,G-5,p,0);tree(x+210,G-5,p,1);lamp(x+104,G-4,p);bench(x+139,G-7,p);
 rect(x+312,G-15,9,11,p.awnings[0]);rect(x+311,G-16,11,2,p.metal);rect(x+314,G-13,1,7,p.glassLight);
 // Two little flowers, a warm note rather than a whole rainbow.
 rect(x+181,G-8,1,4,p.leafShade);rect(x+179,G-10,4,3,'#c98a77');rect(x+187,G-7,1,3,p.leafShade);rect(x+186,G-9,3,2,'#d4ba79');
 }
 rect(0,G,W,H-G,p.ground);rect(0,G,W,2,p.line);rect(0,G+2,W,2,p.pavementEdge);rect(0,G+22,W,2,p.paving);
 for(let i=-1;i<W/55+2;i++){let x=i*55-scroll%55;rect(x,G+5,1,16,p.paving);rect(x+22,G+29,17,1,p.paving);rect(x+47,G+12,3,1,p.line);rect(x+11,G+9,2,1,p.pavementGlint)}
 if(night){
  for(let i=-1;i<Math.ceil(W/380)+1;i++){
   const x=i*380-(scroll*.52)%380+113;
   rect(x-25,G+4,50,4,'#f4ce8310');rect(x-19,G+3,38,6,'#f4ce8314');rect(x-11,G+4,22,4,'#f4ce8315');
  }
 }else for(let i=0;i<3;i++){let x=((W*.63+i*17-time*2)%(W+30)+W+30)%(W+30),y=43+i%2*7;line(x,y,x+2,y+1,p.roof);line(x+2,y+1,x+4,y,p.roof)}
}
function clamp01(n){return Math.max(0,Math.min(1,n))}
function smooth(n){n=clamp01(n);return n*n*(3-2*n)}
function trickPose(){
 const shuv=shuvTime>0,active=flipTime>0||shuv;
 const u=active?1-(shuv?shuvTime/SHUV_DURATION:flipTime/FLIP_DURATION):1;
 const rotation=clamp01((u-.12)/.70);
 const tuck=active?smooth(u/.23)*(1-smooth((u-.78)/.22)):0;
 const flick=active&&!shuv?Math.sin(Math.PI*clamp01(u/.48)):0;
 const scoop=shuv?Math.sin(Math.PI*clamp01(u/.55)):0;
 return {active,u,roll:shuv?0:-Math.PI*2*rotation,yaw:shuv?Math.PI*smooth(rotation):0,tuck,flick,scoop,gap:(shuv?5:7)*tuck};
}
// Scanline rasterization keeps projected geometry on the same crisp pixel grid.
function pixelPoly(points,color){
 const lo=Math.floor(Math.min(...points.map(p=>p[1]))),hi=Math.ceil(Math.max(...points.map(p=>p[1])));
 for(let y=lo;y<hi;y++){
 const cross=[];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))cross.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]))}
 cross.sort((a,b)=>a-b);for(let i=0;i+1<cross.length;i+=2)rect(Math.ceil(cross[i]),y,Math.max(1,Math.floor(cross[i+1])-Math.ceil(cross[i])+1),1,color);
 }
}
function skateboard(x,y,roll=0,pitch=0,yaw=0){
 // Shuv-its rotate in the deck plane; kickflips roll across its width.
 const co=Math.cos(roll),si=Math.sin(roll),yc=Math.cos(yaw),ys=Math.sin(yaw),faces=[];
 const project=(x,z,v)=>{const rx=x*yc-z*ys,depth=x*ys+z*yc,rz=depth*co-v*si,rv=depth*si+v*co;return [rx,rz*.48+rv*.88+rx*pitch,rz*.88-rv*.48]};
 const add=(points,color)=>{const p=points.map(v=>project(...v));faces.push({p,color,depth:p.reduce((sum,v)=>sum+v[2],0)/p.length})};
 const outline=[[-17,-1],[-15,-3],[-11,-3.6],[11,-3.6],[15,-3],[17,-1],[17,1],[15,3],[11,3.6],[-11,3.6],[-15,3],[-17,1]];
 const deck=(height)=>outline.map(([x,z])=>[x,z,height-Math.max(0,Math.abs(x)-12)*.34]);
 const top=deck(-.6),bottom=deck(.6);
 add(top,'#34464a');add(bottom,'#d2a459');
 for(let i=0;i<top.length;i++){let n=(i+1)%top.length;add([top[i],top[n],bottom[n],bottom[i]],i<6?'#d9bf83':'#ae8a57')}
 // An underside stripe makes the half-turn easy to read at this tiny scale.
 add([[-5,-3.4,.65],[1,-3.4,.65],[1,3.4,.65],[-5,3.4,.65]],'#af6f58');
 for(const ax of [-10,10]){
 add([[ax-1,-3,1.2],[ax+1,-3,1.2],[ax+1,3,1.2],[ax-1,3,1.2]],'#9cabaa');
 for(const z of [-3.5,3.5]){const p=project(ax,z,2.8);faces.push({wheel:true,p,depth:p[2],color:'#ece3cb'})}
 for(const z of [-1.5,1.5]){const p=project(ax,z,-.7);faces.push({bolt:true,p,depth:p[2],color:'#97a3a0'})}
 }
 faces.sort((a,b)=>a.depth-b.depth);ctx.save();ctx.translate(Math.round(x),Math.round(y));
 for(const f of faces){if(f.wheel){rect(f.p[0]-2,f.p[1]-2,4,4,'#536164');rect(f.p[0]-1,f.p[1]-1,2,2,f.color)}else if(f.bolt){rect(f.p[0],f.p[1],1,1,f.color)}else pixelPoly(f.p,f.color)}ctx.restore();
}
function pixelLimb(points,color,width=4){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),1);for(let j=0;j<=steps;j++){const q=j/steps;rect(a[0]+(b[0]-a[0])*q-width/2,a[1]+(b[1]-a[1])*q-width/2,width,width,color)}}}
function pushPose(){
 const idle={active:false,x:-8,y:-1,turn:0,load:0,frontYaw:Math.PI/2,rearYaw:Math.PI/2};
 if(pushTime<=0||!player.ground||down||manual)return idle;
 if(pushMode==='return'){
 const from=pushExitFrom||idle,u=clamp01(1-pushTime/PUSH_RETURN);
 const foot=smooth(u/.65),stance=smooth((u-.65)/.35);
 return {active:true,x:from.x+(-8-from.x)*foot,y:from.y+(-1-from.y)*foot,
 turn:from.turn*(1-stance),load:from.load*(1-smooth(u)),
 frontYaw:from.frontYaw+(Math.PI/2-from.frontYaw)*stance,rearYaw:from.rearYaw+(Math.PI/2-from.rearYaw)*stance};
 }
 if(pushMode==='setup'){
 const u=clamp01(1-pushTime/PUSH_SETUP),front=smooth(u/.56),body=smooth((u-.22)/.65),step=smooth((u-.56)/.44);
 return {active:true,x:-8+7*step,y:-1+4*step-Math.sin(Math.PI*step)*4,
 turn:body,load:step,frontYaw:Math.PI/2*(1-front),rearYaw:Math.PI/2*(1-step)};
 }
 // Held input loops only the rear leg: drive backward, lift, swing forward.
 // Both torso and planted front foot stay aligned with the board throughout.
 const u=clamp01(1-pushTime/PUSH_STROKE);
 const keys=[[0,-1,3],[.48,-12,3],[.65,-12,-5],[.87,-1,-4],[1,-1,3]];
 let a=keys[0],b=keys[1];for(let i=1;i<keys.length;i++)if(u<=keys[i][0]){a=keys[i-1];b=keys[i];break}
 const t=smooth((u-a[0])/(b[0]-a[0]));
 return {active:true,u,x:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t,turn:1,load:1,frontYaw:0,rearYaw:0};
}
function skateShoe(x,y,yaw){
 // A shoe pivots on the deck's horizontal X/Z plane, rather than just changing
 // its screen-space length. Sideways feet are foreshortened from this camera.
 const co=Math.cos(yaw),si=Math.sin(yaw);
 const plan=[[-3.5,-1.6],[2.5,-1.6],[4,-.6],[4,1],[-3.5,1.6]];
 const top=plan.map(([a,b])=>[x+a*co-b*si,y+(a*si+b*co)*.48-1.8]);
 const sole=top.map(([a,b])=>[a,b+2]);
 pixelPoly(sole,'#a9aaa1');pixelPoly(top,'#f1e9d8');
 rect(x-1,y-2,2,1,'#c7c5b8');
}
function curlyHair(x,y){
 const shadow=night?'#29282f':'#2b2422',body=night?'#443b39':'#46372e',highlight=night?'#6f6961':'#6b5240';
 rect(x-5,y-3,10,5,shadow);rect(x-4,y+1,2,4,shadow);
 // Stepped tufts and small highlights keep curls legible on the pixel grid.
 for(const [dx,dy] of [[-6,-3],[-4,-6],[-1,-7],[2,-5],[3,-2],[-6,0],[-3,-2],[0,-3]]){
  rect(x+dx+1,y+dy,2,1,body);rect(x+dx,y+dy+1,4,2,shadow);rect(x+dx+1,y+dy+3,2,1,shadow);
  rect(x+dx+1,y+dy+1,2,1,highlight);rect(x+dx+2,y+dy+2,1,1,body);
 }
}
function skater(x,y){
 const ink=night?'#607687':'#364952',skin=night?'#b68a70':'#b1815e',skinShadow=night?'#916a57':'#936749',shirt=night?'#dce5e7':'#f7f7ef',shirtShadow=night?'#9cafba':'#c8d1cf',light=night?'#cad5cf':'#f4ebd5';
 const pushing=pushPose(),pose=trickPose(),railPose=grindPose(),air=!player.ground&&!grinding&&mode==='playing',bail=mode==='over',balancing=manual&&player.ground;
 const compression=player.ground?Math.sin(Math.PI*landingTime/LANDING_DURATION)*3:0;
 const turn=pushing.turn+(grinding?Math.sin(railPose.yaw)*.45:0),load=pushing.load,crouch=(down&&player.ground?4:0)+load*3+compression+(balancing?1:0)+(grinding?2:0);
 const hipX=turn*5,hipY=-14+crouch,shoulderX=hipX+load*4,shoulderY=-26+crouch,halfShoulder=6-turn*2,halfHip=4-turn;
 rect(x-14,G+5,28,2,palette().shadow);ctx.save();ctx.translate(Math.round(x),Math.round(y));
 if(bail){ctx.translate(0,-6);ctx.rotate(-.85)}
 if(player.ground&&player.support?.type==='ramp')ctx.rotate(-Math.atan(player.support.h/player.support.w));
 if(balancing){ctx.translate(-10,5);ctx.rotate(-.12-.06*manualTime/MANUAL_LIMIT+Math.sin(time*5)*.015);ctx.translate(10,-5)}
 if(grinding){ctx.translate(0,railPose.lift);ctx.translate(-10,5);ctx.rotate(railPose.tilt);ctx.translate(10,-5)}
 skateboard(0,2+pose.gap,pose.roll,air?-.045*(1-pose.u):0,grinding?railPose.yaw:pose.yaw);
 if(air){
 const lift=pose.tuck*6,front=8+pose.flick*10,frontY=-3-lift-pose.flick*2,backY=-3-lift;
 const rear=-7-pose.scoop*4;
 pixelLimb([[-4,-15],[-9,-10-lift*.5],[rear,backY-1]],ink,4);pixelLimb([[3,-15],[6,-10-lift*.5],[front-3,frontY-1]],ink,4);
 rect(rear-4,backY,8,3,light);rect(front-5,frontY,9,3,light);rect(rear-4,backY+2,8,1,'#b8b6a8');rect(front-5,frontY+2,9,1,'#b8b6a8');
 }else if(grinding){
  const rearX=-8*Math.cos(railPose.yaw),rearY=-1-8*Math.sin(railPose.yaw)*.48;
  const frontX=8*Math.cos(railPose.yaw),frontY=-1+8*Math.sin(railPose.yaw)*.48;
  pixelLimb([[hipX-2,hipY],[rearX-3,-7+crouch],[rearX,rearY-2]],ink,4);skateShoe(rearX,rearY,Math.PI/2+railPose.yaw);
  pixelLimb([[hipX+2,hipY],[frontX+3,-8+crouch],[frontX,frontY-2]],ink,4);skateShoe(frontX,frontY,Math.PI/2+railPose.yaw);
 }else{
 // Back leg steps beside the deck; front foot remains anchored over the bolts.
 const rearX=pushing.x,rearY=pushing.y;
 const kneeX=(hipX-2+rearX)*.5-1,kneeY=-7+load;
 pixelLimb([[hipX-2,hipY],[kneeX,kneeY],[rearX,rearY-2]],ink,4);
 skateShoe(rearX,rearY,pushing.rearYaw);
 // Knee compresses over the planted front foot as weight shifts forward.
 pixelLimb([[hipX+2,hipY],[5+turn*6,-8+crouch*.5],[8,-3]],ink,4);
 skateShoe(8,-1,pushing.frontYaw);
 }
 // Shoulder width and shirt side panel make the torso rotation visible.
 const left=shoulderX-halfShoulder,right=shoulderX+halfShoulder;
 const leftHip=hipX-halfHip,rightHip=hipX+halfHip;
 if(!air&&!grinding&&turn>.1){pixelLimb([[right-1,shoulderY+3],[right+4,shoulderY+8],[right+7,shoulderY+7]],skinShadow,3)}
 pixelPoly([[left,shoulderY],[right,shoulderY],[rightHip,hipY+1],[leftHip,hipY+1]],shirt);
 pixelPoly([[left,shoulderY+3],[left+2+turn,shoulderY+4],[leftHip+2,hipY],[leftHip,hipY]],shirtShadow);
 rect(leftHip,hipY,halfHip*2,2,shirtShadow);
 rect(shoulderX-2,shoulderY,4,2,shirtShadow);
 if(air||balancing||grinding){
 pixelLimb([[-6,-24],[-11,-22-pose.tuck*3],[-14,-23-pose.tuck*3]],skin,3);pixelLimb([[6,-24],[10,-22-pose.tuck*4],[15,-25-pose.tuck*3]],skin,3);rect(-8,-25,4,5,shirt);rect(5,-25,4,4,shirt);
 }else{
 const elbowX=left-1+turn*4,elbowY=shoulderY+9;
 pixelLimb([[left+1,shoulderY+3],[elbowX,elbowY],[elbowX+1+turn*4,elbowY+3-turn*2]],skin,3);
 rect(left-1,shoulderY+2,4,6,shirt);
 if(turn<.8){pixelLimb([[right-1,shoulderY+3],[right+2,shoulderY+8],[right+5,shoulderY+8]],skin,3);rect(right-2,shoulderY+2,4,5,shirt)}
 }
 const headX=shoulderX+load,headY=shoulderY-6;
 rect(headX-3,headY,8,8,skin);rect(headX+4,headY+2,2,3,skin);rect(headX-3,headY+3,2,4,skinShadow);
 curlyHair(headX,headY);rect(headX+3,headY+2,1,1,'#302b2a');rect(headX-2,headY+2,2,2,skin);
 ctx.restore();
}
function drawObstacle(o,p){
 const x=o.x,y=G+5;
 if(o.type==='cone'){
 rect(x-2,y-2,13,2,p.metal);rect(x+1,y-8,7,6,p.cone);rect(x+3,y-13,3,6,p.cone);rect(x+2,y-7,5,2,p.concreteTop);
 }else if(o.type==='ramp'){
 pixelPoly([[x,y],[x+o.w,y-o.h],[x+o.w,y]],night?p.woodShade:'#ac825e');
 pixelPoly([[x+6,y-1],[x+o.w-4,y-o.h+5],[x+o.w-4,y-1]],night?p.wood:'#c3a17a');
 for(let t=9;t<o.w;t+=10){const h=t/o.w*o.h;rect(x+t,y-h+4,2,Math.max(1,h-4),p.woodShade)}
 line(x,y-1,x+o.w,y-o.h-1,p.woodLight,2);rect(x+o.w-2,y-o.h,3,o.h,p.metal);
 rect(x+o.w-15,y-8,8,3,p.awnings[0]);rect(x+o.w-13,y-8,2,2,p.concreteTop);
 }else if(o.type==='curb'){
 rect(x,y-o.h,o.w,o.h,p.concrete);rect(x+2,y-o.h+3,o.w-4,o.h-3,p.concreteFace);rect(x,y-o.h,o.w,2,p.concreteTop);
 rect(x,y-o.h+2,o.w,1,p.edge);for(let q=0;q<o.w;q+=16){rect(x+q,y-o.h+4,10,2,q%32===0?p.paint:p.paintLight);rect(x+q+14,y-o.h+3,1,o.h-3,p.concrete)}
 rect(x+3,y-2,o.w-4,2,p.edge);
 }else if(o.type==='puddle'){
 rect(x+5,y+3,o.w-10,5,p.water);rect(x+1,y+5,o.w-2,3,p.waterDark);rect(x+8,y+8,o.w-17,2,p.water);
 rect(x+5,y+4,12,1,p.waterLight);rect(x+20,y+6,8,1,night?p.windowLit:'#c9dfd7');
 }else if(o.type==='bench'){
 rect(x,y-o.h,o.w,3,p.woodLight);rect(x,y-o.h+3,o.w,3,p.wood);rect(x+2,y-o.h+1,o.w-4,1,p.concreteTop);
 rect(x+5,y-o.h+6,3,o.h-6,p.metal);rect(x+o.w-8,y-o.h+6,3,o.h-6,p.metal);rect(x+6,y-7,o.w-12,2,p.metal);
 rect(x+2,y-2,9,2,p.metal);rect(x+o.w-11,y-2,9,2,p.metal);
 }else{
 rect(x,y-o.h,o.w,3,night?p.edge:'#576f76');rect(x+1,y-o.h,o.w-2,1,p.concreteTop);
 const spans=Math.ceil(o.w/48);
 for(let i=0;i<=spans;i++){
  const post=x+6+i*(o.w-15)/spans;
  rect(post,y-o.h+3,3,o.h-3,p.metal);rect(post-3,y-2,9,2,p.line);
 }
 }
}
function draw(){const p=palette();scenery(p);for(const o of obstacles)drawObstacle(o,p);
if(mode==='playing'&&boost>18){for(let i=0;i<3;i++){let sx=player.x-27-((time*speed*.65+i*17)%36);rect(sx,G-8-i*6,5+boost*.07,1,p.edge)}}
const displayX=mode==='ready'?Math.max(40,W*.19):player.x;skater(displayX,mode==='ready'?G:player.y);for(const p of particles)rect(p.x,p.y,2,2,p.c);if(mode==='playing'&&grinding){rect(player.x+(grindStyle==='boardslide'?-3:-13),player.y+2,5,1,'#e6c96a')}if(mode==='paused'){rect(0,0,W,H,p.pause)}
}
function frame(ts){const dt=Math.min((ts-last)/1000||0,.033);last=ts;update(dt);draw();raf=requestAnimationFrame(frame)}
$('play').onclick=()=>mode==='paused'?pause():start();
window.addEventListener('pagehide',()=>sound?.destroy());
// Standalone previews follow the device; embedded play follows the site's override.
function syncTheme(){night=themeMedia.matches;document.body.classList.toggle('night',night)}
syncTheme();
if(window.parent===window)themeMedia.addEventListener('change',syncTheme);
window.addEventListener('message',event=>{
 if(event.source!==window.parent||event.origin!==window.location.origin)return;
 const data=event.data;
 if(data?.type!=='sepi-skate:theme'||(data.theme!=='light'&&data.theme!=='dark'))return;
 night=data.theme==='dark';document.body.classList.toggle('night',night);
});
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement||e.metaKey||e.ctrlKey||e.altKey)return;
 const key=e.key.toLowerCase();
 if(![' ','arrowup','arrowdown','arrowleft','arrowright','d','x','z','c','p','escape'].includes(key))return;
 if(key==='escape'){if(mode==='playing')pause();return}
 e.preventDefault();if(e.repeat)return;
 if(key===' '||key==='arrowup')jump();
 if(key==='x')flip();if(key==='z')shuvit();if(key==='c')beginManual('key');
 if(key==='arrowright'||key==='d')beginPush(key);
 if(['arrowdown','arrowleft','arrowright'].includes(key)){grindKeys.add(key);syncGrindInput()}
 if(key==='p')pause();
});
window.addEventListener('keyup',e=>{
 const key=e.key.toLowerCase();
 grindKeys.delete(key);syncGrindInput();
 if(key==='c')manualKey=false;
 pushKeys.delete(key);
});
window.addEventListener('blur',()=>{sound?.stop();clearPush();clearManualInput();clearGrindInput();if(mode==='playing')pause()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){sound?.stop();if(mode==='playing')pause()}});
function touch(id,fn,release){
 const el=$(id);
 el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);fn()});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>release?.());
}
touch('push',()=>beginPush('touch'),()=>pushTouch=false);
touch('jump',jump);touch('flip',flip);touch('shuvit',shuvit);
touch('manual',()=>beginManual('touch'),()=>manualTouch=false);
const grindControl=$('grind');
grindControl.addEventListener('pointerdown',e=>{
 e.preventDefault();
 if(mode!=='playing'||grindPointerId!==null)return;
 grindControl.setPointerCapture(e.pointerId);
 grindPointerId=e.pointerId;grindPointerStart=e.clientX;grindTouchStyle='50-50';syncGrindInput();
});
grindControl.addEventListener('pointermove',e=>{
 if(e.pointerId!==grindPointerId)return;
 const delta=e.clientX-grindPointerStart;
 grindTouchStyle=delta<-GRIND_DRAG_THRESHOLD?'boardslide':delta>GRIND_DRAG_THRESHOLD?'5-0':'50-50';
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])grindControl.addEventListener(event,e=>{
 if(e.pointerId!==grindPointerId)return;
 grindPointerId=null;grindTouchStyle='50-50';syncGrindInput();
});
canvas.addEventListener('pointerdown',()=>jump());
resize();raf=requestAnimationFrame(frame);
})();

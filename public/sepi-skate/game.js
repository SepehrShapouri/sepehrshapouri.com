(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),stage=$('stage');
let W=560,H=176,G=139,mode='ready',time=0,scroll=0,speed=83,score=0,best=0,combo=0,obstacles=[],particles=[],nextSpawn=160,down=false,muted=true,sunset=false,audio=null,last=0,raf=0,toastTime=0,flipTime=0,flipDone=false,pending=0,grinding=false,grindScored=false,distance=0,crashTime=0;
const player={x:115,y:139,vy:0,ground:true,support:null};
let obstacleCount=0,airborneLabel="OLLIE";
const FLIP_DURATION=.5, FLIP_CATCH=.09;
const PUSH_SETUP=.28, PUSH_STROKE=.60, PUSH_RETURN=.32, MAX_BOOST=68;
let pushTime=0, pushMode='idle', pushExitFrom=null, boost=0, pushTouch=false, pushDust=false;
const pushKeys=new Set();
function clearPush(){pushKeys.clear();pushTouch=false;pushTime=0;pushMode='idle';pushExitFrom=null}
function startPush(){pushMode='setup';pushTime=PUSH_SETUP;pushDust=false}
function beginPush(source){
 if(mode==='ready'||mode==='over')start();
 if(mode!=='playing')return;
 if(source==='touch')pushTouch=true;else pushKeys.add(source);
 if(player.ground&&!grinding&&!down&&pushTime<=0)startPush();
}
function cruiseSpeed(){return Math.min(145,83+distance*.025)}
function updatePushing(dt){
 boost=Math.max(0,boost*Math.exp(-.32*dt));if(boost<.05)boost=0;
 const held=pushTouch||pushKeys.size>0;
 if(!player.ground||grinding||down||player.support?.type==='ramp'){pushTime=0;pushMode='idle'}
 else{
 if(pushTime<=0&&held)startPush();
 // Release captures the current pose, so returning to the deck never snaps.
 if(pushTime>0&&!held&&pushMode!=='return'){
 pushExitFrom=pushPose();pushMode='return';pushTime=PUSH_RETURN;
 }
 if(pushTime>0){
 const u=1-pushTime/PUSH_STROKE;
 if(pushMode==='stroke'&&u<.48){boost=Math.min(MAX_BOOST,boost+115*dt);if(!pushDust){burst(player.x-8,G+5,5,palette().paving);tone(120,.045,'triangle',.018);pushDust=true}}
 pushTime=Math.max(0,pushTime-dt);
 if(pushTime<=0){
 if(pushMode!=='return'&&held){pushMode='stroke';pushTime=PUSH_STROKE;pushDust=false}
 else{pushMode='idle';pushExitFrom=null}
 }
 }
 }
 speed=cruiseSpeed()+boost;
}
try{best=Number(localStorage.getItem('sepi-skate-best')||0);sunset=localStorage.getItem('sepi-skate-theme')==='sunset'}catch{}if(!Number.isFinite(best))best=0;
const palette=()=>sunset?{
 sky:'#eee3e0',horizon:'#f5dfc8',dot:'#e4d6d2',far:'#c6bdc9',farShade:'#b3acbd',mid:'#b6ad9e',edge:'#958b80',
 leaf:'#779263',leafLight:'#a8ae70',leafShade:'#526e58',leafDeep:'#435f52',leafGlint:'#c2bf83',bark:'#806653',barkLight:'#a68a68',
 ground:'#d2c1ad',paving:'#beaa98',line:'#927e71',accent:'#dcab66',road:'#a9a2a0',roof:'#8b7775',glass:'#7c879c',glassLight:'#bec3c9',
 faces:['#cf9985','#ddbd8e','#acb4ba','#b0b498','#d7b29c'],shades:['#b88073','#c4a276','#909ca7','#949a82','#ba9486'],
 awnings:['#698c80','#b57465','#87869f'],metal:'#6a7179',wood:'#ab7e58',sun:'#ecc18b',cloud:'#f8ede3',car:'#94a6b0'
}:{
 sky:'#eaf1ef',horizon:'#f2efdf',dot:'#e0e9e4',far:'#cddadb',farShade:'#bacbce',mid:'#bac5b5',edge:'#9ca894',
 leaf:'#668e5c',leafLight:'#8eac69',leafShade:'#4c7454',leafDeep:'#3f6050',leafGlint:'#b1c783',bark:'#806951',barkLight:'#b29770',
 ground:'#d7d0bb',paving:'#c2bba7',line:'#9e9787',accent:'#d9b761',road:'#a5afae',roof:'#77817e',glass:'#77949b',glassLight:'#bdd1cd',
 faces:['#cda18a','#e1c999','#a9c0c3','#b9c4a9','#ddc3ab'],shades:['#b48879','#c6ae82','#8ba6ae','#9aa98f','#bca58f'],
 awnings:['#6c9586','#bb8272','#8c9aaf'],metal:'#627a7d',wood:'#b78e63',sun:'#eddaad',cloud:'#f7f7ed',car:'#89a5b2'
};
function resize(){W=Math.max(320,Math.round(stage.clientWidth/2));H=Math.round(stage.clientHeight/2);G=H-37;canvas.width=W;canvas.height=H;player.x=Math.min(115,W*.23);if(player.ground)player.y=player.support?surfaceY(player.support):G}new ResizeObserver(resize).observe(stage);
function fmt(n){return Math.floor(n).toString().padStart(5,'0')}function hud(){$('score').textContent=fmt(score);$('best').textContent=fmt(best);$('pace').textContent=(speed/cruiseSpeed()).toFixed(1)+'×';$('pace-label').textContent=pushTime>0&&pushMode!=='return'?'PUSHING':boost>4?'COASTING':'CRUISE';$('pace-meter').style.setProperty('--pace',String(Math.round(boost/MAX_BOOST*100))+'%');$('pace-meter').classList.toggle('is-fast',boost>20)}hud();
function tone(freq,dur=.07,type='square',volume=.025){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.65,audio.currentTime+dur);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch{}}
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
function start(){mode='playing';score=0;combo=0;pending=0;distance=0;speed=83;boost=0;clearPush();obstacles=[];particles=[];nextSpawn=45;player.y=G;player.vy=0;player.ground=true;player.support=null;obstacleCount=0;airborneLabel="OLLIE";flipTime=0;flipDone=false;down=false;grinding=false;grindScored=false;$('callout').textContent='';overlay(false);canvas.focus({preventScroll:true});hud();tone(400)}
function jump(){if(mode==='ready'||mode==='over'){start();return}if(mode==='paused'){pause();return}if(mode!=='playing')return;if(player.ground||grinding){pushTime=0;player.support=null;airborneLabel="OLLIE";player.vy=-171;player.ground=false;grinding=false;flipDone=false;grindScored=false;pending=10;burst(player.x,G,5);tone(360,.10)}}
function flip(){if(mode!=='playing'||player.ground||grinding||flipDone)return;flipTime=FLIP_DURATION;flipDone=true;pending+=75;toast('KICKFLIP');tone(700,.12)}
function pause(){if(mode==='playing'){mode='paused';down=false;clearPush();overlay(true,'Catch your<br>breath.','Your session will be right here.','Keep rolling');}else if(mode==='paused'){mode='playing';overlay(false);canvas.focus({preventScroll:true})}}
function end(){mode='over';clearPush();crashTime=.6;burst(player.x,player.y-7,22,'#7d8a67');tone(100,.22,'sawtooth');const isBest=score>best;if(isBest){best=Math.floor(score);try{localStorage.setItem('sepi-skate-best',String(best))}catch{}}pending=0;grinding=false;down=false;overlay(true,'',`Score: ${Math.floor(score)}`, 'Play again');$('callout').textContent='';hud()}
function land(surface=G){if(flipTime>FLIP_CATCH){end();return}flipTime=0;player.ground=true;player.vy=0;player.y=surface;if(pending){combo++;let earned=pending*Math.min(combo,4);score+=earned;toast(grindScored?'50–50 GRIND':flipDone?'KICKFLIP':airborneLabel,earned,Math.min(combo,4));tone(520,.07);burst(player.x,G,7);pending=0}flipDone=false}
function surfaceY(o){return o.type==='ramp'?G-o.h*clamp01((player.x-o.x)/o.w):G-o.h}
function spawn(){
 const opening=['ramp','curb','rail','puddle','bench','ramp','cone'];
 let type;if(obstacleCount<opening.length)type=opening[obstacleCount];
 else{const r=Math.random();type=r<.24?'ramp':r<.50?'curb':r<.68?'rail':r<.83?'bench':r<.92?'puddle':'cone';
 if(type==='cone'&&obstacles.at(-1)?.type==='cone')type='ramp'}
 const sizes={ramp:[52,24],curb:[64,12],rail:[48,18],bench:[43,19],puddle:[34,0],cone:[9,12]};
 const [w,h]=sizes[type];obstacles.push({x:W+25,w,h,type,passed:false,splashed:false});obstacleCount++;
 nextSpawn=w+Math.max(145+Math.random()*70,speed*1.35+35);
}
function launchRamp(){
 player.support=null;player.ground=false;player.vy=-176-boost*.12;pushTime=0;flipDone=false;grindScored=false;
 airborneLabel='RAMP AIR';pending=35;burst(player.x,player.y,6);tone(480,.12);toast('SEND IT ↗');
}
function grindOn(o,dt){
 player.y=G-o.h+2;player.vy=0;grinding=true;player.ground=false;player.support=null;
 if(!grindScored){pending+=o.type==='curb'?70:100;grindScored=true;toast(o.type==='bench'?'BENCH GRIND':o.type==='curb'?'CURB GRIND':'50–50 GRIND');tone(230,.1,'sawtooth')}
 score+=22*dt;if(Math.random()<.55)burst(player.x-8,player.y,2,'#e4b557');
}
function update(dt){
 time+=dt;toastTime-=dt;if(toastTime<=0)$('callout').textContent='';
 if(mode==='playing'){
 updatePushing(dt);scroll+=speed*dt;distance+=speed*dt*.12;score+=dt*2;nextSpawn-=speed*dt;if(nextSpawn<=0)spawn();
 for(const o of obstacles)o.x-=speed*dt;
 flipTime=Math.max(0,flipTime-dt);
 // Flat surfaces carry the rider; a ramp releases them upward at its lip.
 if(player.ground&&player.support){
 const o=player.support;if(player.x>o.x+o.w){if(o.type==='ramp')launchRamp();else{player.support=null;player.ground=false;player.vy=0}}
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
 if(contact&&down&&flipTime===0){grindOn(o,dt)}
 else if(contact&&o.type!=='rail'){if(!player.ground)land(top);player.support=o;player.y=top}
 else if(player.y>top+6){end();break}
 }else if(o.type==='cone'&&Math.abs(player.x-(o.x+o.w/2))<10&&player.y>G-o.h+3){end();break}
 else if(o.type==='puddle'&&overlaps&&player.ground&&player.y>=G-2&&!o.splashed){
 o.splashed=true;boost*=.35;pushTime=0;burst(player.x,G+2,17,'#8db7c1');tone(160,.12,'triangle');toast('SPLASH!');
 }
 if(mode!=='playing')break;
 if(!o.passed&&o.x+o.w<player.x-10){o.passed=true;score+=o.type==='ramp'?10:20}
 }
 obstacles=obstacles.filter(o=>o.x>-90);
 if(mode==='playing'&&player.y>=G&&!player.ground){player.support=null;land()}
 hud();
 }else if(mode==='ready'){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)scroll+=dt*12}
 else if(mode==='over')crashTime-=dt;
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=130*dt;p.life-=dt}particles=particles.filter(p=>p.life>0)
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
 const leaves=gold?['#a79d5c','#c0b675','#857e51']: [p.leaf,p.leafLight,p.leafShade];
 rect(x-13,y+1,30,2,p.edge);rect(x-1,y-37-tall,5,37+tall,p.bark);
 rect(x,y-30-tall,2,30+tall,p.barkLight);rect(x-6,y-31-tall,3,15,p.bark);rect(x-9,y-34-tall,4,5,p.bark);
 rect(x+4,y-26-tall,3,10,p.bark);rect(x+7,y-32-tall,3,8,p.bark);
 crown(x-18,y-42-tall,26,25,p.leafDeep,leaves[2]);crown(x-5,y-44-tall,26,25,leaves[2],leaves[0]);
 crown(x-14,y-54-tall,30,27,leaves[0],leaves[1]);crown(x-22,y-43-tall,25,22,leaves[0],leaves[1]);
 crown(x+1,y-41-tall,22,23,leaves[2],leaves[0]);
 rect(x-8,y-50-tall,4,2,p.leafGlint);rect(x-18,y-36-tall,3,2,p.leafGlint);rect(x+4,y-46-tall,3,2,leaves[1]);
 rect(x-10,y-24-tall,4,3,leaves[2]);rect(x+12,y-21-tall,3,2,leaves[2]);
 // Low planting beds keep the trees rooted in the street.
 rect(x-15,y-1,33,4,sunset?'#ad9c87':'#b1b69b');rect(x-15,y-1,33,1,sunset?'#d0b99c':'#d0d0b6');
 for(let i=0;i<5;i++){rect(x-12+i*6,y-4-(i%2),2,4,leaves[2]);rect(x-11+i*6,y-5-(i%2),3,2,leaves[0])}
}
function building(x,y,w,h,p,k){
 const face=p.faces[k%5],shade=p.shades[k%5];
 rect(x,y-h,w,h,face);rect(x+w-7,y-h,7,h,shade);rect(x-1,y-h-2,w+2,3,p.roof);
 rect(x+2,y-h+1,w-11,2,sunset?'#e7c8a4':'#f0dfbb');rect(x+5,y-h-7,7,5,shade);
 if(k%3===0){rect(x+w-12,y-h-15,1,12,p.roof);line(x+w-17,y-h-11,x+w-7,y-h-11,p.roof)}
 const floors=Math.max(1,Math.floor((h-17)/15));
 for(let f=0;f<floors;f++)for(let xx=6;xx<w-12;xx+=13){let yy=y-h+8+f*15;
 rect(x+xx-1,yy-1,8,11,shade);rect(x+xx,yy,6,8,p.glass);rect(x+xx,yy,2,5,p.glassLight);
 rect(x+xx+3,yy,1,8,face);rect(x+xx-1,yy+8,8,2,sunset?'#dfc2a4':'#eee0c2');
 if((k+f)%3===0){rect(x+xx-2,yy+10,10,1,p.roof);for(let q=0;q<3;q++)rect(x+xx-1+q*4,yy+7,1,3,p.roof)}
 }
 // Ground-floor shopfronts, striped awnings and a narrow door.
 rect(x+4,y-13,w-15,12,p.roof);rect(x+6,y-11,11,9,p.glass);rect(x+7,y-10,2,6,p.glassLight);
 rect(x+w-18,y-11,8,11,shade);rect(x+w-16,y-10,4,6,p.glass);rect(x+w-12,y-4,1,1,'#ead8ac');
 rect(x+3,y-16,w-13,3,p.awnings[k%3]);for(let i=0;i<w-13;i+=8)rect(x+3+i,y-16,4,3,'#eee7d2');
 rect(x+3,y-13,w-13,1,shade);rect(x,y-1,w,2,shade);
 if(k%2===0){for(let i=0;i<5;i++)rect(x+2+(i%2)*9,y-h+23+i*5,4,1,shade)}
}
function cloud(x,y,p){rect(x+8,y,18,3,p.cloud);rect(x+3,y+3,32,4,p.cloud);rect(x,y+7,41,3,p.cloud);rect(x+7,y+10,27,1,p.dot)}
function lamp(x,y,p){rect(x,y-43,2,43,p.metal);rect(x-2,y-2,6,2,p.metal);rect(x-1,y-45,11,2,p.metal);rect(x+7,y-43,5,3,p.metal);rect(x+8,y-42,3,2,sunset?'#f4d296':'#dfd8b3')}
function bench(x,y,p){rect(x,y-9,29,2,p.wood);rect(x,y-6,29,2,p.wood);rect(x-1,y-3,31,2,p.wood);rect(x+3,y-1,2,5,p.metal);rect(x+25,y-1,2,5,p.metal);rect(x+3,y-8,1,5,p.metal);rect(x+25,y-8,1,5,p.metal)}
function car(x,y,p){
 rect(x+3,y+1,45,2,p.edge);rect(x+1,y-11,49,9,p.car);rect(x+5,y-15,38,5,p.car);rect(x+13,y-22,23,7,p.car);
 rect(x+12,y-19,3,5,p.glass);rect(x+16,y-20,8,6,p.glass);rect(x+26,y-20,8,6,p.glass);rect(x+17,y-19,6,1,p.glassLight);
 rect(x+8,y-14,34,1,'#c7d5d5');rect(x+25,y-13,1,9,p.glass);rect(x+27,y-11,3,1,p.roof);
 rect(x,y-9,4,3,'#f2ddac');rect(x+47,y-9,3,3,'#c6816c');rect(x,y-3,50,2,p.roof);
 for(const w of [9,37]){rect(x+w-1,y-4,8,6,'#465157');rect(x+w,y-5,6,8,'#465157');rect(x+w+1,y-3,4,4,'#b5c4c6');rect(x+w+2,y-2,2,2,p.roof)}
}
function scenery(p){
 rect(0,0,W,H,p.sky);rect(0,G-61,W,61,p.horizon);
 // The dotted canvas remains a subtle nod to the original portfolio signature.
 for(let x=5;x<W;x+=8)for(let y=4;y<G-64;y+=8)rect(x,y,1,1,p.dot);
 rect(W-71,36,15,18,p.sun);rect(W-74,39,21,12,p.sun);
 const cloudOffset=(scroll*.035)%390;for(let i=-1;i<Math.ceil(W/390)+1;i++){cloud(i*390+40-cloudOffset,40,p);cloud(i*390+253-cloudOffset,24,p)}
 // Cool, quiet silhouettes establish a separate distant city layer.
 let far=scroll*.09%370;for(let i=-1;i<Math.ceil(W/370)+1;i++){let b=i*370-far;for(let j=0;j<7;j++){let hh=[42,65,53,81,46,59,35][j];let xx=b+j*54;rect(xx,G-21-hh,39,hh,p.far);rect(xx+31,G-21-hh,8,hh,p.farShade);rect(xx+5,G-25-hh,25,4,p.far);for(let r=0;r<Math.floor(hh/10)-1;r++)for(let c=0;c<3;c++)rect(xx+6+c*9,G-16-hh+r*10,3,5,p.sky)}}
 const block=560,phase=(scroll*.24)%block;
 for(let i=-1;i<Math.ceil(W/block)+1;i++){let b=i*block-phase;
 building(b+8,G-15,47,54,p,0);building(b+59,G-15,43,66,p,1);building(b+107,G-15,54,48,p,2);
 building(b+211,G-15,42,62,p,3);building(b+257,G-15,50,73,p,4);building(b+311,G-15,47,51,p,0);
 building(b+419,G-15,53,59,p,1);building(b+476,G-15,49,45,p,2);
 }
 rect(0,G-14,W,9,p.road);rect(0,G-14,W,1,p.roof);
 for(let i=-1;i<W/90+1;i++)rect(i*90-(scroll*.45)%90,G-8,27,1,'#d6d5c2');
 // Street furniture travels faster than the buildings for gentle parallax.
 for(let i=-1;i<Math.ceil(W/420)+1;i++){let x=i*420-(scroll*.43)%420;car(x+248,G-6,p)}
 rect(0,G-4,W,4,p.paving);rect(0,G-4,W,1,'#eee4cf');
 for(let i=-1;i<Math.ceil(W/380)+1;i++){let x=i*380-(scroll*.52)%380;tree(x+31,G-5,p,0);tree(x+210,G-5,p,1);lamp(x+104,G-4,p);bench(x+139,G-7,p);
 rect(x+312,G-15,9,11,p.awnings[0]);rect(x+311,G-16,11,2,p.metal);rect(x+314,G-13,1,7,p.glassLight);
 // Two little flowers, a warm note rather than a whole rainbow.
 rect(x+181,G-8,1,4,p.leafShade);rect(x+179,G-10,4,3,'#c98a77');rect(x+187,G-7,1,3,p.leafShade);rect(x+186,G-9,3,2,'#d4ba79');
 }
 rect(0,G,W,H-G,p.ground);rect(0,G,W,2,p.line);rect(0,G+2,W,2,'#f1e9d5');rect(0,G+22,W,2,p.paving);
 for(let i=-1;i<W/55+2;i++){let x=i*55-scroll%55;rect(x,G+5,1,16,p.paving);rect(x+22,G+29,17,1,p.paving);rect(x+47,G+12,3,1,p.line);rect(x+11,G+9,2,1,'#e8e0cb')}
 for(let i=0;i<3;i++){let x=((W*.63+i*17-time*2)%(W+30)+W+30)%(W+30),y=43+i%2*7;line(x,y,x+2,y+1,p.roof);line(x+2,y+1,x+4,y,p.roof)}
}
function clamp01(n){return Math.max(0,Math.min(1,n))}
function smooth(n){n=clamp01(n);return n*n*(3-2*n)}
function kickPose(){
 const active=flipTime>0,u=active?1-flipTime/FLIP_DURATION:1;
 const rotation=clamp01((u-.12)/.70);
 const tuck=active?smooth(u/.23)*(1-smooth((u-.78)/.22)):0;
 const flick=active?Math.sin(Math.PI*clamp01(u/.48)):0;
 return {active,u,roll:-Math.PI*2*rotation,tuck,flick,gap:7*tuck};
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
function skateboard(x,y,roll=0,pitch=0){
 // The longitudinal X coordinate never rotates into screen Y. Only deck width
 // and vertical depth rotate, so the board rolls grip -> underside -> grip.
 const co=Math.cos(roll),si=Math.sin(roll),faces=[];
 const project=(x,z,v)=>{const rz=z*co-v*si,rv=z*si+v*co;return [x,rz*.48+rv*.88+x*pitch,rz*.88-rv*.48]};
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
 if(pushTime<=0||!player.ground||down)return idle;
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
function skater(x,y){
 const ink='#364952',skin='#c99f7b',shirt=sunset?'#b96f58':'#b77d64',shirtShadow=sunset?'#995b4c':'#956652',light='#f4ebd5';
 const pushing=pushPose(),pose=kickPose(),air=!player.ground&&mode==='playing',bail=mode==='over';
 const turn=pushing.turn,load=pushing.load,crouch=(down&&player.ground?4:0)+load*3;
 const hipX=turn*5,hipY=-14+crouch,shoulderX=hipX+load*4,shoulderY=-26+crouch,halfShoulder=6-turn*2,halfHip=4-turn;
 rect(x-14,G+5,28,2,'#aaa58e');ctx.save();ctx.translate(Math.round(x),Math.round(y));
 if(bail){ctx.translate(0,-6);ctx.rotate(-.85)}
 if(player.ground&&player.support?.type==='ramp')ctx.rotate(-Math.atan(player.support.h/player.support.w));
 skateboard(0,2+pose.gap,pose.roll,air?-.045*(1-pose.u):0);
 if(air){
 const lift=pose.tuck*6,front=8+pose.flick*10,frontY=-3-lift-pose.flick*2,backY=-3-lift;
 pixelLimb([[-4,-15],[-9,-10-lift*.5],[-7,backY-1]],ink,4);pixelLimb([[3,-15],[6,-10-lift*.5],[front-3,frontY-1]],ink,4);
 rect(-11,backY,8,3,light);rect(front-5,frontY,9,3,light);rect(-11,backY+2,8,1,'#b8b6a8');rect(front-5,frontY+2,9,1,'#b8b6a8');
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
 if(!air&&turn>.1){pixelLimb([[right-1,shoulderY+3],[right+4,shoulderY+8],[right+7,shoulderY+7]],'#b18a68',3)}
 pixelPoly([[left,shoulderY],[right,shoulderY],[rightHip,hipY+1],[leftHip,hipY+1]],shirt);
 pixelPoly([[left,shoulderY+3],[left+2+turn,shoulderY+4],[leftHip+2,hipY],[leftHip,hipY]],shirtShadow);
 rect(leftHip,hipY,halfHip*2,2,shirtShadow);
 if(air){
 pixelLimb([[-6,-24],[-11,-22-pose.tuck*3],[-14,-23-pose.tuck*3]],skin,3);pixelLimb([[6,-24],[10,-22-pose.tuck*4],[15,-25-pose.tuck*3]],skin,3);rect(-8,-25,4,5,shirt);rect(5,-25,4,4,shirt);
 }else{
 const elbowX=left-1+turn*4,elbowY=shoulderY+9;
 pixelLimb([[left+1,shoulderY+3],[elbowX,elbowY],[elbowX+1+turn*4,elbowY+3-turn*2]],skin,3);
 rect(left-1,shoulderY+2,4,6,shirt);
 if(turn<.8){pixelLimb([[right-1,shoulderY+3],[right+2,shoulderY+8],[right+5,shoulderY+8]],skin,3);rect(right-2,shoulderY+2,4,5,shirt)}
 }
 const headX=shoulderX+load,headY=shoulderY-6;
 rect(headX-3,headY,8,8,skin);rect(headX+4,headY+2,2,3,skin);rect(headX-5,headY-3,10,4,ink);rect(headX+3,headY-1,6,2,ink);rect(headX+3,headY+2,1,1,ink);rect(headX-4,headY+1,2,5,ink);
 ctx.restore();
}
function drawObstacle(o,p){
 const x=o.x,y=G+5;
 if(o.type==='cone'){
 rect(x-2,y-2,13,2,'#657577');rect(x+1,y-8,7,6,'#cb8d60');rect(x+3,y-13,3,6,'#cb8d60');rect(x+2,y-7,5,2,'#f1edcf');
 }else if(o.type==='ramp'){
 pixelPoly([[x,y],[x+o.w,y-o.h],[x+o.w,y]],'#ac825e');
 pixelPoly([[x+6,y-1],[x+o.w-4,y-o.h+5],[x+o.w-4,y-1]],'#c3a17a');
 for(let t=9;t<o.w;t+=10){const h=t/o.w*o.h;rect(x+t,y-h+4,2,Math.max(1,h-4),'#9a785d')}
 line(x,y-1,x+o.w,y-o.h-1,'#e9ce9a',2);rect(x+o.w-2,y-o.h,3,o.h,'#80796a');
 rect(x+o.w-15,y-8,8,3,'#708b77');rect(x+o.w-13,y-8,2,2,'#d8dab7');
 }else if(o.type==='curb'){
 rect(x,y-o.h,o.w,o.h,'#aaa896');rect(x+2,y-o.h+3,o.w-4,o.h-3,'#c0beaa');rect(x,y-o.h,o.w,2,'#eee5cd');
 rect(x,y-o.h+2,o.w,1,'#777e71');for(let q=0;q<o.w;q+=16){rect(x+q,y-o.h+4,10,2,q%32===0?'#b87e69':'#e3d4b7');rect(x+q+14,y-o.h+3,1,o.h-3,'#a7a794')}
 rect(x+3,y-2,o.w-4,2,'#8e9282');
 }else if(o.type==='puddle'){
 rect(x+5,y+3,o.w-10,5,'#a5c4c7');rect(x+1,y+5,o.w-2,3,'#94b8be');rect(x+8,y+8,o.w-17,2,'#a5c4c7');
 rect(x+5,y+4,12,1,'#e0eddf');rect(x+20,y+6,8,1,'#c9dfd7');
 }else if(o.type==='bench'){
 rect(x,y-o.h,o.w,3,'#e0bc89');rect(x,y-o.h+3,o.w,3,'#b58a61');rect(x+2,y-o.h+1,o.w-4,1,'#f0d7a5');
 rect(x+5,y-o.h+6,3,o.h-6,p.metal);rect(x+o.w-8,y-o.h+6,3,o.h-6,p.metal);rect(x+6,y-7,o.w-12,2,p.metal);
 rect(x+2,y-2,9,2,p.metal);rect(x+o.w-11,y-2,9,2,p.metal);
 }else{
 rect(x,y-o.h,o.w,3,'#576f76');rect(x+1,y-o.h,o.w-2,1,'#eef1e5');rect(x+6,y-o.h+3,3,o.h-3,'#849b9d');rect(x+o.w-9,y-o.h+3,3,o.h-3,'#849b9d');rect(x+3,y-2,9,2,p.line);rect(x+o.w-12,y-2,9,2,p.line);
 }
}
function draw(){const p=palette();scenery(p);for(const o of obstacles)drawObstacle(o,p);
if(mode==='playing'&&boost>18){for(let i=0;i<3;i++){let sx=player.x-27-((time*speed*.65+i*17)%36);rect(sx,G-8-i*6,5+boost*.07,1,p.edge)}}
const displayX=mode==='ready'?Math.max(40,W*.19):player.x;skater(displayX,mode==='ready'?G:player.y);for(const p of particles)rect(p.x,p.y,2,2,p.c);if(mode==='playing'&&grinding){rect(player.x-19,player.y+2,5,1,'#e6c96a')}if(mode==='paused'){rect(0,0,W,H,'#f1f3ea99')}
}
function frame(ts){const dt=Math.min((ts-last)/1000||0,.033);last=ts;update(dt);draw();raf=requestAnimationFrame(frame)}
$('play').onclick=()=>mode==='paused'?pause():start();
document.body.classList.toggle('sunset',sunset);
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement)return;const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowright','d','x','p','escape'].includes(key)){if(key==='escape'){if(mode==='playing')pause();return}e.preventDefault();if(e.repeat)return;if(key===' '||key==='arrowup')jump();if(key==='x')flip();if(key==='arrowdown')down=true;if(key==='arrowright'||key==='d')beginPush(key);if(key==='p')pause()}});window.addEventListener('keyup',e=>{if(e.key==='ArrowDown')down=false;pushKeys.delete(e.key.toLowerCase())});window.addEventListener('blur',()=>{clearPush();down=false;if(mode==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause()});
function touch(id,fn,release){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);fn()});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>release?.())}touch('push',()=>beginPush('touch'),()=>pushTouch=false);touch('jump',jump);touch('flip',flip);touch('grind',()=>down=true,()=>down=false);canvas.addEventListener('pointerdown',()=>jump());resize();raf=requestAnimationFrame(frame);
})();

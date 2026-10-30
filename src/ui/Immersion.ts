import type { World } from '../world/World';
import type { GameStore } from '../saves/GameStore';
import { MaritimeAudio } from '../audio/MaritimeAudio';
import { TourGuide,validateComment } from '../excursions/comments';
import type { TourComment } from '../excursions/comments';
import { icon } from './icons';

export class Immersion {
  readonly panel=document.createElement('section');
  readonly guide=new TourGuide();
  readonly audio=new MaritimeAudio();
  private abort=new AbortController();
  private tools=document.createElement('div');
  private button=document.createElement('button');
  private soundButton=document.createElement('button');
  private hornButton=document.createElement('button');
  private hornClickTimer:ReturnType<typeof setTimeout>|undefined;
  private status=document.createElement('output');
  private caption=document.createElement('p');
  private notice=document.createElement('details');
  private saveTimer:ReturnType<typeof setTimeout>|undefined;
  private announcementSeconds=0;
  private pendingNarration:string|undefined;
  constructor(private world:World,private store:GameStore,open:()=>void){
    const options={signal:this.abort.signal},prefs=store.data.immersion;
    this.guide.comments=structuredClone(prefs.comments);this.guide.automatic=prefs.automatic;this.guide.manual=prefs.manual;this.guide.muted=prefs.muted;
    this.audio.apply(prefs.audio);world.traffic.enabled=prefs.traffic;
    this.panel.className='immersion-panel';
    this.panel.innerHTML=`<h3>Trafic et annonces</h3>
      <label class="check"><input id="traffic-enabled" type="checkbox">Trafic maritime autonome</label>
      <label class="check"><input id="tour-automatic" type="checkbox">Proposer les commentaires aux lieux pertinents</label>
      <label class="check"><input id="tour-manual" type="checkbox">Valider manuellement la lecture vocale</label>
      <label class="check"><input id="tour-muted" type="checkbox">Couper les annonces touristiques</label>
      <h3>Commentaire touristique</h3><label for="tour-select">Lieu ou commentaire</label><select id="tour-select"></select>
      <div class="game-buttons"><button id="tour-play">Lire en français</button><button id="tour-stop">Arrêter la voix</button><button id="tour-dismiss">Commentaire suivant</button></div>
      <p id="voice-status" role="status"></p><p id="tour-full-text"></p><a id="tour-source" target="_blank" rel="noopener noreferrer">Source touristique</a>
      <details class="tour-editor"><summary>Modifier ou créer un commentaire</summary>
      <label for="tour-title">Titre</label><input id="tour-title" maxlength="100">
      <label for="tour-text">Texte français</label><textarea id="tour-text" maxlength="1500" rows="5"></textarea>
      <div class="tour-coordinates"><label>Est (m)<input id="tour-x" type="number" min="-5200" max="5200"></label><label>Sud (m)<input id="tour-z" type="number" min="-5200" max="5200"></label><label>Rayon (m)<input id="tour-radius" type="number" min="30" max="1500"></label></div>
      <div class="game-buttons"><button id="tour-save">Enregistrer</button><button id="tour-new">Nouveau à ma position</button></div><p id="tour-editor-status" role="status"></p></details>
      <h3>Ambiance sonore</h3><label class="check"><input id="audio-enabled" type="checkbox">Activer les sons</label>
      ${[['master','Volume général'],['engines','Moteurs'],['waves','Vagues'],['wind','Vent'],['port','Port et oiseaux'],['alerts','Avertissements maritimes'],['horn','Corne de brume'],['voice','Voix des annonces']].map(([key,label])=>`<label class="volume-control" for="volume-${key}">${label}<output id="volume-${key}-value"></output><input id="volume-${key}" data-volume="${key}" type="range" min="0" max="100" step="1"></label>`).join('')}
      <p>Sons originaux synthétisés dans le navigateur, sans fichier externe. Les voix dépendent de votre appareil ; le texte reste disponible en l’absence de voix française.</p><a href="./assets/AUDIO-CREDITS.md" target="_blank" rel="noopener noreferrer">Crédits audio et touristiques</a>`;
    const get=<T extends HTMLElement>(id:string)=>this.panel.querySelector<T>(`#${id}`)!;
    for(const id of ['traffic-enabled','tour-automatic','tour-manual','tour-muted','audio-enabled'])get(id).addEventListener('change',()=>{
      world.traffic.enabled=get<HTMLInputElement>('traffic-enabled').checked;this.guide.automatic=get<HTMLInputElement>('tour-automatic').checked;this.guide.manual=get<HTMLInputElement>('tour-manual').checked;this.guide.muted=get<HTMLInputElement>('tour-muted').checked;
      if(!world.traffic.enabled){world.traffic.risk=undefined;if(world.vessel.marine.warning.startsWith('Trafic :'))world.vessel.marine.warning='';}
      this.audio.apply({...this.audio.settings,enabled:get<HTMLInputElement>('audio-enabled').checked});
      if(this.guide.muted)this.audio.stopSpeech();this.audio.unlock();this.persist();this.render();
    },options);
    this.panel.querySelectorAll<HTMLInputElement>('[data-volume]').forEach(input=>input.addEventListener('input',()=>{
      const key=input.dataset.volume as 'master'|'engines'|'waves'|'wind'|'port'|'alerts'|'horn'|'voice';
      this.audio.apply({...this.audio.settings,[key]:Number(input.value)/100});get(`volume-${key}-value`).textContent=`${input.value} %`;this.persist();
    },options));
    get('tour-select').addEventListener('change',()=>this.fillEditor(),options);
    get('tour-play').addEventListener('click',()=>{
      const c=this.guide.choose(get<HTMLSelectElement>('tour-select').value);if(c){this.showComment(c);if(!this.guide.muted)this.audio.speak(c.text,true);this.render();}
    },options);
    get('tour-stop').addEventListener('click',()=>{this.pendingNarration=undefined;this.audio.stopSpeech();this.render();},options);
    get('tour-dismiss').addEventListener('click',()=>{this.pendingNarration=undefined;this.audio.stopSpeech();this.guide.dismiss();this.notice.hidden=true;this.notice.open=false;this.render();},options);
    get('tour-save').addEventListener('click',()=>this.saveComment(),options);
    get('tour-new').addEventListener('click',()=>{
      const select=get<HTMLSelectElement>('tour-select'),option=document.createElement('option');option.value='new';option.textContent='Nouveau commentaire';select.append(option);select.value='new';
      const s=world.vessel.dynamics.state;get<HTMLInputElement>('tour-title').value='Mon commentaire';get<HTMLTextAreaElement>('tour-text').value='';
      for(const [id,value] of [['tour-x',Math.round(s.x)],['tour-z',Math.round(s.z)],['tour-radius',200]] as const)get<HTMLInputElement>(id).value=String(value);
      this.panel.querySelector<HTMLDetailsElement>('.tour-editor')!.open=true;get('tour-title').focus();
    },options);
    // Secondary actions live in a compact overlay at the lower edge.
    const footer=document.querySelector('footer')!,summary=footer.firstElementChild!;
    this.tools.className='footer-tools';this.button.id='excursion-toggle';this.button.innerHTML=`${icon('tour')}<span>Excursion</span>`;this.button.addEventListener('click',open,options);
    this.button.setAttribute('aria-label','Ouvrir les excursions et l’ambiance sonore');
    this.soundButton.id='sound-toggle';this.soundButton.addEventListener('click',()=>{this.audio.apply({...this.audio.settings,enabled:!this.audio.settings.enabled});this.audio.unlock();this.persist();this.render();},options);
    this.tools.append(footer.querySelector('.helm-help')!,this.button,this.soundButton,document.getElementById('pause')!);footer.append(this.tools);
    this.hornButton.id='fog-horn';this.hornButton.innerHTML=`${icon('horn')}<span>Corne de brume</span>`;this.hornButton.title='Maintenir pour sonner (8 secondes maximum)';this.hornButton.setAttribute('aria-label','Corne de brume : maintenir pour sonner');this.hornButton.setAttribute('aria-pressed','false');
    document.querySelector('.helm-actions')!.append(this.hornButton);
    const startHorn=()=>{
      clearTimeout(this.hornClickTimer);
      if(!this.audio.settings.enabled){this.audio.apply({...this.audio.settings,enabled:true});this.persist();}
      this.hornButton.setAttribute('aria-pressed',String(this.audio.startHorn()));this.render();
    };
    const stopHorn=()=>{clearTimeout(this.hornClickTimer);this.audio.stopHorn();this.hornButton.setAttribute('aria-pressed','false');};
    this.hornButton.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();this.hornButton.setPointerCapture(e.pointerId);startHorn();},options);
    for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])this.hornButton.addEventListener(event,stopHorn,options);
    this.hornButton.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)startHorn();}},options);
    this.hornButton.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();stopHorn();}},options);
    this.hornButton.addEventListener('click',e=>{if(e.detail===0){startHorn();this.hornClickTimer=setTimeout(stopHorn,900);}},options);
    window.addEventListener('blur',stopHorn,options);
    this.status.id='passenger-status';this.status.setAttribute('aria-live','off');summary.append(this.status);
    this.notice.className='tour-notice';this.notice.hidden=true;this.notice.innerHTML=`<summary>${icon('tour')}<span id="tour-notice-title" aria-live="polite">Annonce touristique</span><span class="tour-read">Lire</span></summary>`;
    this.caption.id='tour-caption';this.notice.append(this.caption);
    this.notice.insertAdjacentHTML('beforeend',`<div class="tour-caption-actions"><button id="tour-notice-play">${icon('sound')}<span>Écouter le commentaire</span></button><button id="tour-notice-stop">Arrêter</button></div><p id="tour-notice-voice-status" role="status" hidden></p>`);
    this.notice.querySelector('#tour-notice-play')!.addEventListener('click',()=>{
      const text=this.caption.textContent;if(!text||this.guide.muted)return;
      this.pendingNarration=undefined;this.announcementSeconds=0;
      if(!this.audio.settings.enabled){this.audio.apply({...this.audio.settings,enabled:true});this.persist();}
      this.audio.unlock();this.audio.speak(text,true);
      this.notice.querySelector<HTMLElement>('#tour-notice-voice-status')!.hidden=false;this.render();
    },options);
    this.notice.querySelector('#tour-notice-stop')!.addEventListener('click',()=>{this.pendingNarration=undefined;this.audio.stopSpeech();this.render();},options);
    document.querySelector('.voyage-overlays')!.prepend(this.notice);
    document.getElementById('app')!.classList.add('immersion-ready');
    window.addEventListener('pointerdown',()=>this.audio.unlock(),options);window.addEventListener('keydown',()=>this.audio.unlock(),options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.audio.setPaused(true);},options);
    this.sync();this.render();
  }
  sync():void {
    const check=(id:string,value:boolean)=>{this.panel.querySelector<HTMLInputElement>(`#${id}`)!.checked=value;};
    check('traffic-enabled',this.world.traffic.enabled);check('tour-automatic',this.guide.automatic);check('tour-manual',this.guide.manual);check('tour-muted',this.guide.muted);check('audio-enabled',this.audio.settings.enabled);
    this.panel.querySelectorAll<HTMLInputElement>('[data-volume]').forEach(input=>{const key=input.dataset.volume as 'master';input.value=String(Math.round(this.audio.settings[key]*100));this.panel.querySelector(`#${input.id}-value`)!.textContent=`${input.value} %`;});
    const select=this.panel.querySelector<HTMLSelectElement>('#tour-select')!,previous=this.guide.selected?.id??select.value;select.replaceChildren();
    for(const c of this.guide.comments){const option=document.createElement('option');option.value=c.id;option.textContent=c.title;select.append(option);}
    if(this.guide.comments.some(c=>c.id===previous))select.value=previous;this.fillEditor();
  }
  private fillEditor():void {
    const id=this.panel.querySelector<HTMLSelectElement>('#tour-select')!.value,c=this.guide.comments.find(c=>c.id===id);if(!c)return;
    for(const [key,value] of [['title',c.title],['text',c.text],['x',c.x],['z',c.z],['radius',c.radius]] as const)(this.panel.querySelector(`#tour-${key}`) as HTMLInputElement).value=String(value);
    this.panel.querySelector('#tour-full-text')!.textContent=c.text;
    const source=this.panel.querySelector<HTMLAnchorElement>('#tour-source')!;source.hidden=!c.source;source.href=c.source||'#';
  }
  private saveComment():void {
    const get=(id:string)=>(this.panel.querySelector(`#tour-${id}`) as HTMLInputElement).value;
    const id=get('select'),old=this.guide.comments.find(c=>c.id===id);
    const comment=validateComment({id:id==='new'?`custom-${crypto.randomUUID()}`:id,title:get('title'),text:get('text'),x:Number(get('x')),z:Number(get('z')),radius:Number(get('radius')),source:old?.text===get('text')&&old.title===get('title')?old.source:''});
    const status=this.panel.querySelector('#tour-editor-status')!;
    if(!comment){status.textContent='Vérifiez le titre, le texte et les coordonnées. Rayon autorisé : 30 à 1 500 m.';return;}
    if(!old&&this.guide.comments.length>=50){status.textContent='La limite est de 50 commentaires.';return;}
    if(old)this.guide.comments[this.guide.comments.indexOf(old)]=comment;else this.guide.comments.push(comment);
    this.guide.choose(comment.id);this.showComment(comment);this.persist();this.sync();status.textContent='Commentaire enregistré sur cet appareil.';
  }
  private persist():void {
    this.store.data.immersion={audio:{...this.audio.settings},traffic:this.world.traffic.enabled,automatic:this.guide.automatic,manual:this.guide.manual,muted:this.guide.muted,comments:structuredClone(this.guide.comments)};
    clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>{void this.store.save();},250);
  }
  setPaused(paused:boolean):void {clearTimeout(this.hornClickTimer);this.audio.setPaused(paused);this.hornButton.disabled=paused;this.hornButton.setAttribute('aria-pressed','false');}
  reset(visited:string[]=[]):void {this.audio.stopSpeech();this.pendingNarration=undefined;this.announcementSeconds=0;this.guide.reset();this.guide.visited=new Set(visited.filter(id=>this.guide.comments.some(c=>c.id===id)));this.caption.textContent='';this.notice.hidden=true;this.notice.open=false;}
  announce(text:string):void {if(!this.guide.muted)this.announcementSeconds=this.audio.speak(text)?Math.min(20,Math.max(3,text.length/12+1)):0;}
  update(dt:number):void {
    this.announcementSeconds=Math.max(0,this.announcementSeconds-dt);
    const s=this.world.vessel.dynamics.state,c=this.guide.update(dt,s.x,s.z);
    if(c){this.showComment(c);if(!this.guide.manual&&!this.guide.muted){if(this.announcementSeconds>0)this.pendingNarration=c.text;else this.audio.speak(c.text);}}
    if(this.pendingNarration&&this.announcementSeconds===0){if(!this.guide.manual&&!this.guide.muted)this.audio.speak(this.pendingNarration);this.pendingNarration=undefined;}
  }
  private showComment(c:TourComment):void {this.caption.textContent=c.text;this.notice.querySelector('#tour-notice-title')!.textContent=c.title;this.notice.querySelector<HTMLElement>('#tour-notice-voice-status')!.hidden=true;this.notice.hidden=false;}
  render():void {
    const p=this.world.passengers,status=`${p.count} passagers · satisfaction ${Math.round(p.satisfaction)} %`;
    if(this.status.textContent!==status)this.status.textContent=status;
    const enabled=this.audio.settings.enabled;
    if(this.soundButton.getAttribute('aria-pressed')!==String(enabled))this.soundButton.innerHTML=`${icon(enabled?'sound':'muted')}<span>${enabled?'Son actif':'Son coupé'}</span>`;
    this.soundButton.setAttribute('aria-pressed',String(enabled));this.soundButton.setAttribute('aria-label',enabled?'Couper le son':'Activer le son');
    this.hornButton.setAttribute('aria-pressed',String(this.audio.hornActive));
    const voiceStatus=this.panel.querySelector('#voice-status')!;if(voiceStatus.textContent!==this.audio.voiceStatus)voiceStatus.textContent=this.audio.voiceStatus;
    this.panel.querySelector<HTMLButtonElement>('#tour-play')!.disabled=this.guide.muted;
    const noticePlay=this.notice.querySelector<HTMLButtonElement>('#tour-notice-play')!;
    noticePlay.disabled=this.guide.muted;noticePlay.title=this.guide.muted?'Réactivez les annonces dans Excursion pour écouter.':'Lire à voix haute le commentaire affiché';
    const noticeStatus=this.notice.querySelector<HTMLElement>('#tour-notice-voice-status')!;
    if(!noticeStatus.hidden&&noticeStatus.textContent!==this.audio.voiceStatus)noticeStatus.textContent=this.audio.voiceStatus;
    this.panel.querySelector<HTMLInputElement>('#audio-enabled')!.checked=this.audio.settings.enabled;
    this.audio.update(this.world.vessel.dynamics.state,this.world.vessel.marine,!!this.world.traffic.risk);
  }
  dispose():void {
    clearTimeout(this.saveTimer);clearTimeout(this.hornClickTimer);this.abort.abort();this.audio.dispose();this.hornButton.remove();this.panel.remove();
    const footer=document.querySelector('footer')!;footer.append(this.tools.querySelector('.helm-help')!,document.getElementById('pause')!);this.tools.remove();this.notice.remove();this.status.remove();document.getElementById('app')!.classList.remove('immersion-ready');
  }
}

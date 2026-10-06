const profileMeta = {
  receipt80: ['Cupom térmico 80 mm', 'Cupons e comprovantes'],
  receipt58: ['Cupom térmico 58 mm', 'Cupons e comprovantes'],
  label: ['Etiquetas térmicas', 'Etiquetas de produtos e códigos'],
  a4: ['Folha A4', 'Relatórios e documentos']
};
let state;

const $ = (s) => document.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500)}
function options(selected){return `<option value="">Selecione uma impressora</option>` + state.printers.map(p=>`<option value="${esc(p.name)}" ${p.name===selected?'selected':''}>${esc(p.displayName)}${p.isDefault?' (padrão)':''}</option>`).join('')}
function profileRows(editable=true){return `<div class="profiles">${Object.entries(profileMeta).map(([key,[title,sub]])=>{const p=state.config.profiles[key];const installed=state.printers.find(x=>x.name===p.printer);return `<div class="profile"><div class="profile-title"><strong>${title}</strong><small>${sub}</small></div><select data-profile="${key}" ${editable?'':'disabled'}>${options(p.printer)}</select><span class="available">${installed?'● Disponível':'○ Não configurada'}</span><button class="test" data-test="${key}" ${installed?'':'disabled'}>Imprimir teste</button></div>`}).join('')}</div>`}
function jobsHtml(items){if(!items.length)return '<div class="empty">Nenhum trabalho registrado.</div>';return items.map(j=>`<div class="job"><div><strong>${esc(j.kind||'Impressão')}</strong><small>${esc(j.printer||'Sem impressora')} · ${esc(j.time||'')}</small></div><span class="${j.ok?'ok':'error'}">${j.ok?'Concluído':esc(j.error||'Falhou')}</span></div>`).join('')}
function applyTheme(){const t=state.config.appearance.theme;document.body.classList.toggle('light',t==='light'||(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches));document.documentElement.style.setProperty('--accent',state.config.appearance.accent)}
function render(){
  applyTheme();
  $('#version').textContent=`v${state.version}`;$('#serverAddress').textContent=state.address;$('#printerCount').textContent=`${state.printers.length} detectadas`;$('#queueCount').textContent=`${state.queue.length} trabalhos`;
  $('#systemPill').textContent=state.config.apiBaseUrl?'○ Integração preparada':'○ Sistema não configurado';
  $('#overviewProfiles').innerHTML='<div class="section-title"><h2>Impressoras configuradas</h2><small>Detecção local</small></div>'+profileRows(false);
  $('#printerProfiles').innerHTML=profileRows(true);
  $('#queueList').innerHTML=jobsHtml(state.queue);$('#jobsList').innerHTML=jobsHtml(state.queue);$('#recentList').innerHTML=jobsHtml(state.jobs.slice(0,4));$('#historyList').innerHTML=jobsHtml(state.jobs);
  ['theme','accent'].forEach(k=>$('#'+k).value=k==='theme'?state.config.appearance.theme:state.config.appearance.accent);
  ['autostart','autoDetect','silentPrinting','fallbackToBrowser'].forEach(k=>$('#'+k).checked=!!state.config[k]);
  document.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>testProfile(b.dataset.test));
}
async function reload(){state=await window.dmfv.getState();render()}
async function testProfile(key){try{toast('Enviando teste…');await window.dmfv.testProfile(key);await reload();toast('Teste enviado à impressora')}catch(e){toast(e.message||'Falha no teste')}}
document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>{document.querySelectorAll('.nav,.page').forEach(x=>x.classList.remove('active'));n.classList.add('active');$('#'+n.dataset.section).classList.add('active')});
$('#refresh').onclick=async()=>{await window.dmfv.refreshPrinters();await reload();toast('Dispositivos atualizados')};
$('#printerProfiles').onchange=async(e)=>{if(!e.target.dataset.profile)return;const profiles=structuredClone(state.config.profiles);profiles[e.target.dataset.profile].printer=e.target.value;state=await window.dmfv.saveConfig({profiles});render();toast('Associação salva')};
$('#saveSettings').onclick=async()=>{state=await window.dmfv.saveConfig({autostart:$('#autostart').checked,autoDetect:$('#autoDetect').checked,silentPrinting:$('#silentPrinting').checked,fallbackToBrowser:$('#fallbackToBrowser').checked,appearance:{theme:$('#theme').value,accent:$('#accent').value}});render();toast('Configurações salvas')};
$('#openConfig').onclick=()=>window.dmfv.openConfigFolder();
window.dmfv.onChanged(()=>reload().catch(()=>{}));
reload().catch(e=>toast(e.message||'Falha ao carregar o painel'));

const presetAccents={dmfv:'#FFC107',purple:'#8B5CF6',green:'#22C55E',red:'#EF4444',graphite:'#7A7A7A'};document.querySelectorAll('[data-theme-preset]').forEach(b=>b.onclick=async()=>{const accent=presetAccents[b.dataset.themePreset];state=await window.dmfv.saveConfig({appearance:{theme:'dark',accent}});render();toast('Tema aplicado')});

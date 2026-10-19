/* ===================== DADOS DE DEMONSTRAÇÃO ===================== */
// Lista os tipos de ocorrência e a cor usada nos ícones e gráficos.
const CATEGORIES =  {
  'Buracos na rua':  {
    color: '#ff4d5a',
    icon: '⚠'
  },
  'Iluminação pública':  {
    color: '#ffcf35',
    icon: '☼'
  },
  'Árvores caídas':  {
    color: '#10bd83',
    icon: '♣'
  },
  'Alagamentos':  {
    color: '#168dff',
    icon: '♦'
  },
  'Outras ocorrências':  {
    color: '#8d50ff',
    icon: '•••'
  }
};
// Define bairros iniciais para os filtros e para os dados de exemplo.
const NEIGHBORHOODS = ['Centro','Zona 7','Jardim Alvorada','Jardim das Flores','Vila Nova','São Pedro','Zona 2','Maringá Velho','Parque Industrial','Jardim América','Santa Felicidade','Mandacaru'];
// Exemplos de ocorrências. Os dados são fictícios e ficam salvos neste navegador.
const SEED = [
 {
  id:1248,type:'Buracos na rua',description:'Buraco grande na via',address:'Av. Brasil, 1234',neighborhood:'Centro',date:'2026-09-21T16:32',status:'Pendente',lat:-23.4205,lng:-51.9332
},
 {
  id:1247,type:'Alagamentos',description:'Ponto com acúmulo de água',address:'Rua das Flores, 56',neighborhood:'Vila Nova',date:'2026-09-21T15:47',status:'Em andamento',lat:-23.4270,lng:-51.9270
},
 {
  id:1246,type:'Árvores caídas',description:'Árvore obstruindo a via',address:'Av. Central, 789',neighborhood:'Jardim das Flores',date:'2026-09-20T18:42',status:'Resolvido',lat:-23.4140,lng:-51.9470
},
 {
  id:1245,type:'Iluminação pública',description:'Poste sem iluminação',address:'Rua do Sol, 10',neighborhood:'São Pedro',date:'2026-09-20T16:31',status:'Pendente',lat:-23.4110,lng:-51.9210
},
 {
  id:1244,type:'Buracos na rua',description:'Múltiplos buracos na via',address:'Av. das Nações, 455',neighborhood:'Centro',date:'2026-09-20T14:05',status:'Em andamento',lat:-23.4230,lng:-51.9390
},
 {
  id:1243,type:'Árvores caídas',description:'Galhos caídos na calçada',address:'Rua das Palmeiras, 77',neighborhood:'Jardim das Flores',date:'2026-09-19T11:20',status:'Resolvido',lat:-23.4160,lng:-51.9510
},
 {
  id:1242,type:'Iluminação pública',description:'Lâmpada apagada',address:'Rua Santa Luzia, 100',neighborhood:'Zona 7',date:'2026-09-19T09:17',status:'Pendente',lat:-23.4080,lng:-51.9350
},
 {
  id:1241,type:'Alagamentos',description:'Água acumulada após chuva',address:'Rua 7 de Setembro, 230',neighborhood:'Centro',date:'2026-09-18T22:03',status:'Em andamento',lat:-23.4250,lng:-51.9300
},
 {
  id:1240,type:'Buracos na rua',description:'Desnível no asfalto',address:'Rua das Acácias, 312',neighborhood:'Vila Nova',date:'2026-09-18T16:48',status:'Resolvido',lat:-23.4310,lng:-51.9420
},
 {
  id:1239,type:'Iluminação pública',description:'Poste precisa de manutenção',address:'Av. Paulo VI, 890',neighborhood:'São Pedro',date:'2026-09-18T13:26',status:'Pendente',lat:-23.4090,lng:-51.9160
}
];
// Lê dados salvos anteriormente ou cria a lista inicial no primeiro acesso.
let reports = loadReports();
function loadReports() {
  try  {
    const saved = localStorage.getItem('radarReports');
    return saved ? JSON.parse(saved) : [...SEED];
  }
  catch  {
    return [...SEED];
  }
}
// Grava alterações para que os dados continuem após atualizar a página.
function saveReports() {
  localStorage.setItem('radarReports', JSON.stringify(reports));
}
// Guarda preferências simples da interface.
let settings = JSON.parse(localStorage.getItem('radarSettings') || '{"theme":"dark","notifications":true,"weekly":true,"reminders":true,"font":"normal"}');
// Mantém a tela atual e os filtros selecionados.
let currentScreen = location.hash.replace('#','') || 'inicio';
let activeFilters =  {
  category:'Todas as categorias',
  status:'Todos os status',
  neighborhood:'Todos os bairros',
  period:'Últimos 30 dias'
};
let mapInstances = [];
let charts = [];
let toastTimer;
/* ===================== FUNÇÕES UTILITÁRIAS ===================== */
// Escapa texto antes de inserir conteúdo informado pelo usuário no HTML.
function esc(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  // Converte data ISO em formato brasileiro legível.
  function dateLabel(value){ return new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  // Retorna a classe CSS correta para um status.
  function statusClass(status){ return status === 'Resolvido' ? 'Resolvido' : status === 'Pendente' ? 'Pendente' : 'Andamento'; }
  // Cria uma etiqueta colorida de status.
  function statusBadge(status){ return `<span class="status ${statusClass(status)}">${esc(status)}</span>`; }
  // Conta ocorrências que correspondem aos filtros globais e locais.
  function filteredReports(filters=activeFilters){
    const q = (document.getElementById('globalSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
    return reports.filter(r => (filters.category==='Todas as categorias' || r.type===filters.category) && (filters.status==='Todos os status' || r.status===filters.status) && (filters.neighborhood==='Todos os bairros' || r.neighborhood===filters.neighborhood) && (!q || `${r.id} ${r.type} ${r.description} ${r.address} ${r.neighborhood}`.toLocaleLowerCase('pt-BR').includes(q)));
  }
  // Mostra uma notificação breve no canto da tela.
  function notify(message){ const el=document.getElementById('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2800); }
  // Gera opções para os campos de seleção.
  function options(items, selected){ return items.map(item=>`<option ${item===selected?'selected':''}>${esc(item)}</option>`).join(''); }
  // Cria o cabeçalho padronizado de uma tela.
  function heading(title, subtitle, action=''){ return `<div class="page-heading">
    <div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    </div>${action}</div>`; }
  // Calcula os totais para os cartões e gráficos.
  function counts(list=reports){ return {total:list.length,resolved:list.filter(r=>r.status==='Resolvido').length,pending:list.filter(r=>r.status==='Pendente').length,progress:list.filter(r=>r.status==='Em andamento').length}; }
  // Retorna um cartão de estatística pronto para renderizar.
  function statCard(label,value,icon,color,detail='Dados registrados no sistema'){ return `<article class="stat-card">
    <span class="stat-icon ${color}">${icon}</span>
    <div>
    <div class="label">${label}</div>
    <strong>${value.toLocaleString('pt-BR')}</strong>
    <small>${detail}</small>
    </div>
    </article>`; }
  // Monta uma linha de categoria com ícone e contagem.
  function categoryRow(type,list=reports){ const info=CATEGORIES[type]; const count=list.filter(r=>r.type===type).length; return `<div class="category-row">
    <span class="category-symbol" style="background:${info.color}">${info.icon}</span>
    <span>${esc(type)}</span>
    <strong class="count">${count}</strong>
    </div>`; }
  // Gera linhas de dados para uma tabela de ocorrências.
  function reportRows(list){ if(!list.length) return `<tr>
    <td colspan="7" class="empty">Nenhuma ocorrência encontrada para os filtros selecionados.</td>
    </tr>`; return list.map(r=>`<tr>
    <td>#${r.id}</td>
    <td>
    <span class="category-symbol" style="display:inline-grid;background:${CATEGORIES[r.type]?.color||'#888'};vertical-align:middle;margin-right:6px">${CATEGORIES[r.type]?.icon||'•'}</span>${esc(r.type)}</td>
    <td>${esc(r.description)}</td>
    <td>${esc(r.address)}</td>
    <td>${esc(r.neighborhood)}</td>
    <td>${dateLabel(r.date)}</td>
    <td>${statusBadge(r.status)} <button class="small-btn" data-action="view" data-id="${r.id}" title="Ver detalhes">⋯</button>
    </td>
    </tr>`).join(''); }
  // Constrói a tabela completa usada nas telas de ocorrências e relatórios.
  function reportTable(list){ return `<div class="table-wrap">
    <table>
    <thead>
    <tr>
    <th>ID</th>
    <th>Tipo</th>
    <th>Descrição</th>
    <th>Endereço</th>
    <th>Bairro</th>
    <th>Data</th>
    <th>Status / ações</th>
    </tr>
    </thead>
    <tbody>${reportRows(list)}</tbody>
    </table>
    </div>`; }
  // Prepara a lista de filtros para reutilizar em telas diferentes.
  function filtersPanel(title='Filtros',buttonText='Aplicar filtros'){
    return `<section class="panel">
    <div class="panel-heading">
    <h2>⚑ ${title}</h2>
    </div>
    <form class="filters" id="filterForm">
    <div class="field">
    <label for="filterCategory">Categoria</label>
    <select id="filterCategory">${options(['Todas as categorias',...Object.keys(CATEGORIES)],activeFilters.category)}</select>
    </div>
    <div class="field">
    <label for="filterStatus">Status</label>
    <select id="filterStatus">${options(['Todos os status','Pendente','Em andamento','Resolvido'],activeFilters.status)}</select>
    </div>
    <div class="field">
    <label for="filterNeighborhood">Bairro</label>
    <select id="filterNeighborhood">${options(['Todos os bairros',...NEIGHBORHOODS],activeFilters.neighborhood)}</select>
    </div>
    <div class="field">
    <label for="filterPeriod">Período</label>
    <select id="filterPeriod">${options(['Últimos 7 dias','Últimos 30 dias','Últimos 90 dias','Todo o período'],activeFilters.period)}</select>
    </div>
    <button class="btn primary" type="submit">☷ ${buttonText}</button>
    <button class="btn" type="button" id="clearFilters">↻ Limpar filtros</button>
    </form>
    </section>`;
  }
  /* ===================== MAPAS ===================== */
  // Define um único centro para TODOS os mapas do Radar Urbano: Maringá, Paraná.
  const MARINGA_CENTER = [-23.4205, -51.9333];
  // Limites aproximados de visualização para manter o mapa focado na região de Maringá.
  // Estes limites servem apenas para navegação e NÃO representam a divisa municipal oficial.
  const MARINGA_VIEW_BOUNDS = L.latLngBounds([-23.55, -52.10], [-23.30, -51.80]);
  // Cria o mapa real de Maringá usado nas telas Início, Mapa de Calor e Análises.
  function createMap(elementId, large=false){
    const element=document.getElementById(elementId); if(!element || !window.L) return;
    // Inicializa o mapa sempre na mesma cidade e limita o deslocamento para a região de Maringá.
    const map=L.map(elementId,{zoomControl:true,scrollWheelZoom:false,maxBounds:MARINGA_VIEW_BOUNDS,maxBoundsViscosity:0.75})
      .setView(MARINGA_CENTER, large ? 12 : 12);
    // Usa ruas e quadras reais do OpenStreetMap; é necessário ter internet para carregar o mapa.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'&copy; OpenStreetMap contributors',
      maxZoom:19
    }).addTo(map);
    // Mantém o enquadramento na região selecionada, sem alegar que é a fronteira oficial do município.
    map.fitBounds(MARINGA_VIEW_BOUNDS, { padding:[8,8], maxZoom:12 });
    map.setView(MARINGA_CENTER, 12);
    // Agrupa marcadores em um círculo visual colorido para sugerir a concentração de ocorrências.
    reports.forEach(r=>{
      const color=CATEGORIES[r.type]?.color||'#10bd83';
      L.circleMarker([r.lat,r.lng],{radius:large?8:7,color,fillColor:color,fillOpacity:.85,weight:2}).addTo(map).bindPopup(`<strong>${esc(r.type)}</strong>
    <br>${esc(r.address)}<br>${esc(r.neighborhood)}<br>${statusBadge(r.status)}`);
    });
    // Adiciona uma camada de calor simplificada com círculos translúcidos; não é uma análise geográfica oficial.
    reports.filter(r=>r.status!=='Resolvido').forEach(r=>L.circle([r.lat,r.lng],{radius:large?230:170,color:'#ff8a00',weight:0,fillColor:'#ff5c24',fillOpacity:.12}).addTo(map));
    mapInstances.push(map); setTimeout(()=>map.invalidateSize(),80);
  }
  // Destrói mapas antigos para evitar duplicação ao trocar de tela.
  function clearMaps(){ mapInstances.forEach(m=>m.remove()); mapInstances=[]; }
  /* ===================== GRÁFICOS ===================== */
  // Limpa gráficos antigos antes de redesenhar a tela.
  function clearCharts(){ charts.forEach(c=>c.destroy()); charts=[]; }
  // Cria um gráfico de rosca com os status das ocorrências.
  function doughnutChart(id,list=reports){ if(!window.Chart||!document.getElementById(id))return; const c=counts(list); const chart=new Chart(document.getElementById(id),{type:'doughnut',data:{labels:['Resolvidas','Pendentes','Em andamento'],datasets:[{data:[c.resolved,c.pending,c.progress],backgroundColor:['#10bd83','#ffcf35','#168dff'],borderWidth:0}]},options:{maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{color:'#cfe7e5',padding:15}}}}});charts.push(chart); }
  // Cria gráfico de barras com totais por categoria.
  function barChart(id,list=reports){ if(!window.Chart||!document.getElementById(id))return; const labels=Object.keys(CATEGORIES).filter(t=>t!=='Outras ocorrências'); const data=labels.map(t=>list.filter(r=>r.type===t).length); const chart=new Chart(document.getElementById(id),{type:'bar',data:{labels,datasets:[{label:'Ocorrências',data,backgroundColor:['#ff4d5a','#ffcf35','#10bd83','#168dff'],borderRadius:6}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#cfe7e5'},grid:{color:'#164747'}},y:{beginAtZero:true,ticks:{color:'#cfe7e5',precision:0},grid:{color:'#164747'}}}}});charts.push(chart); }
  // Cria gráfico de linha demonstrativo para a evolução temporal.
  function lineChart(id,list=reports){ if(!window.Chart||!document.getElementById(id))return; const types=['Buracos na rua','Iluminação pública','Árvores caídas','Alagamentos']; const labels=['Semana 1','Semana 2','Semana 3','Semana 4']; const colors=['#ff4d5a','#ffcf35','#10bd83','#168dff']; const datasets=types.map((type,i)=>({label:type,data:labels.map((_,j)=>Math.max(0,list.filter(r=>r.type===type).length+j*(i%2?1:2)-i)),borderColor:colors[i],backgroundColor:colors[i],tension:.35})); const chart=new Chart(document.getElementById(id),{type:'line',data:{labels,datasets},options:{maintainAspectRatio:false,plugins:{legend:{labels:{color:'#cfe7e5'}}},scales:{x:{ticks:{color:'#cfe7e5'},grid:{color:'#164747'}},y:{beginAtZero:true,ticks:{color:'#cfe7e5',precision:0},grid:{color:'#164747'}}}}});charts.push(chart); }
  /* ===================== TELAS ===================== */
  // Tela inicial com resumo, mapa, categorias, lista recente e assistente.
  function renderHome(){
    const c=counts();
    return heading('Olá, <span>Prefeitura!</span>','Acompanhe as ocorrências e o status das demandas da cidade.')+
    `<div class="stats">${statCard('Total de ocorrências',c.total,'▤','blue','Todos os registros')}${statCard('Resolvidas',c.resolved,'✓','','Concluídas')}${statCard('Pendentes',c.pending,'◷','yellow','Aguardando atendimento')}${statCard('Em andamento',c.progress,'▶','purple','Em atendimento')}</div>
    <div class="grid-3">
    <section class="panel">
    <div class="panel-heading">
    <h2>◈ Mapa de calor — Maringá</h2>
    <button class="small-btn" data-screen="mapa">Ver mapa completo ↗</button>
    </div>
    <div class="map-wrap">
    <div class="map" id="homeMap">
    </div>
    <div class="map-legend">${Object.entries(CATEGORIES).map(([t,v])=>`<span><i class="legend-dot" style="background:${v.color}"></i>${t}</span>`).join('')}</div>
    </div>
    </section>
    <section class="panel">
    <div class="panel-heading">
    <h2>Ocorrências por categoria</h2>
    <button class="small-btn" data-screen="ocorrencias">Ver todas</button>
    </div>
    <div class="category-list">${Object.keys(CATEGORIES).map(t=>categoryRow(t)).join('')}</div>
    <div class="panel-heading" style="margin-top:18px">
    <h3>Ocorrências por bairro</h3>
    </div>${NEIGHBORHOODS.slice(0,5).map((n,i)=>{const num=reports.filter(r=>r.neighborhood===n).length;return `<div class="bar-row"><span>${n}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(5,num/reports.length*100)}%"></div></div><strong>${num}</strong></div>`}).join('')}</section>
    <section class="panel">
    <div class="panel-heading">
    <h2>Status das solicitações</h2>
    </div>
    <div class="chart-box">
    <canvas id="homeStatusChart">
    </canvas>
    </div>
    <div class="panel-heading">
    <h3>Últimas ocorrências</h3>
    <button class="small-btn" data-screen="ocorrencias">Ver todas</button>
    </div>
    <div class="recent-list">${reports.slice(0,4).map(recentItem).join('')}</div>
    </section>
    </div>
    <div class="grid-2">
    <section class="panel">
    <div class="panel-heading">
    <h2>◷ Ocorrências recentes</h2>
    <button class="small-btn" data-screen="relatorios">Ver relatório completo →</button>
    </div>${reportTable(reports.slice(0,5))}</section>
    <section class="panel">
    <div class="panel-heading">
    <h2>🤖 Assistente de IA</h2>
    <span class="status Resolvido">● Online</span>
    </div>
    <div class="chat-box" id="chatMessages">
    <div class="chat-message">Olá! Sou o assistente demonstrativo do Radar Urbano. Posso resumir os dados desta tela e ajudar a localizar ocorrências.</div>
    </div>
    <form class="chat-form" id="chatForm">
    <input class="chat-input" id="chatInput" placeholder="Digite sua pergunta..." aria-label="Pergunta para o assistente">
    <button type="submit" aria-label="Enviar pergunta">➤</button>
    </form>
    <small class="muted">Este assistente usa regras locais de demonstração, não um serviço de IA conectado.</small>
    </section>
    </div>`;
  }
  // Linha compacta usada no painel de últimas ocorrências.
  function recentItem(r){const info=CATEGORIES[r.type]||CATEGORIES['Outras ocorrências'];return `<div class="recent-row">
    <span class="category-symbol" style="background:${info.color}">${info.icon}</span>
    <div style="flex:1;min-width:0">
    <strong>${esc(r.type)}</strong>
    <div class="muted">${esc(r.address)} · ${esc(r.neighborhood)}</div>
    </div>${statusBadge(r.status)}</div>`;}
  // Tela do mapa de calor com filtros de categoria e status.
  function renderMap(){return heading('<span>◈ Mapa de Calor</span> — Ocorrências','Visualize a localização dos registros em Maringá, Paraná.')+`<div class="stats">${statCard('Total de ocorrências',reports.length,'⚑','red')}${statCard('Resolvidas',counts().resolved,'✓','')}${statCard('Pendentes',counts().pending,'◷','yellow')}${statCard('Em andamento',counts().progress,'▶','purple')}</div>
    <div class="grid-map-side">
    <section class="panel">
    <div class="panel-heading">
    <h2>◈ Mapa de calor — Maringá, PR</h2>
    <button class="small-btn" id="centerMap">◎ Centralizar no mapa</button>
    </div>
    <div class="map-wrap">
    <div class="map large" id="largeMap">
    </div>
    <div class="map-legend">${Object.entries(CATEGORIES).map(([t,v])=>`<span><i class="legend-dot" style="background:${v.color}"></i>${t}</span>`).join('')}</div>
    </div>
    <p class="muted">Os marcadores são dados de demonstração. O mapa base é fornecido pelo OpenStreetMap.</p>
    </section>
    <aside>${filtersPanel('Filtrar mapa')}<section class="panel">
    <div class="panel-heading">
    <h3>Legenda de concentração</h3>
    </div>
    <p>
    <i class="legend-dot" style="background:#ff4d5a">
    </i>Alta concentração</p>
    <p>
    <i class="legend-dot" style="background:#ffcf35">
    </i>Média concentração</p>
    <p>
    <i class="legend-dot" style="background:#10bd83">
    </i>Baixa concentração</p>
    </section>
    </aside>
    </div>`;}
  // Tela de listagem, resumo e filtros de ocorrências.
  function renderOccurrences(){const list=filteredReports();return heading('<span>● Ocorrências</span>','Acompanhe os registros da cidade, categoria, endereço e status.',`<button class="btn primary" data-action="new-report">＋ Nova ocorrência</button>`)+`<div class="stats">${Object.keys(CATEGORIES).filter(t=>t!=='Outras ocorrências').map((t,i)=>statCard(t,reports.filter(r=>r.type===t).length,CATEGORIES[t].icon,['red','yellow','','blue'][i]||'')).join('')}</div>
    <div class="grid-map-side">
    <section class="panel">
    <div class="panel-heading">
    <h2>Lista de ocorrências</h2>
    <span class="muted">${list.length} registro(s)</span>
    </div>${reportTable(list)}</section>
    <aside>${filtersPanel()}<section class="panel">
    <div class="panel-heading">
    <h2>Resumo por categoria</h2>
    </div>${Object.keys(CATEGORIES).map(t=>categoryRow(t,list)).join('')}</section>
    </aside>
    </div>`;}
  // Tela de manutenções concentra os registros que ainda exigem acompanhamento.
  function renderMaintenance(){const list=filteredReports().filter(r=>r.status!=='Resolvido');const c=counts(list);return heading('<span>🔧 Manutenções</span>','Acompanhe as demandas que precisam de manutenção.')+`<div class="stats">${statCard('Demandas abertas',list.length,'🔧','yellow')}${statCard('Resolvidas',counts().resolved,'✓','')}${statCard('Pendentes',c.pending,'◷','yellow')}${statCard('Em andamento',c.progress,'▶','blue')}</div>
    <div class="grid-map-side">
    <section class="panel">
    <div class="panel-heading">
    <h2>Fila de manutenção</h2>
    <span class="muted">${list.length} demanda(s) abertas</span>
    </div>
    <div class="table-wrap">
    <table>
    <thead>
    <tr>
    <th>ID</th>
    <th>Tipo</th>
    <th>Local</th>
    <th>Bairro</th>
    <th>Status</th>
    <th>Atualizar</th>
    </tr>
    </thead>
    <tbody>${list.length?list.map(r=>`<tr><td>#${r.id}</td><td>${esc(r.type)}</td><td>${esc(r.address)}</td><td>${esc(r.neighborhood)}</td><td>${statusBadge(r.status)}</td><td><select aria-label="Atualizar status" data-action="status" data-id="${r.id}">${options(['Pendente','Em andamento','Resolvido'],r.status)}</select></td></tr>`).join(''):`<tr><td colspan="6" class="empty">Nenhuma manutenção aberta.</td></tr>`}</tbody>
    </table>
    </div>
    </section>
    <aside>
    <section class="panel">
    <div class="panel-heading">
    <h2>Status das manutenções</h2>
    </div>
    <div class="chart-box">
    <canvas id="maintenanceChart">
    </canvas>
    </div>
    </section>${filtersPanel('Filtros de manutenção')}</aside>
    </div>`;}
  // Tela de relatórios com gráfico temporal, filtros e opção de exportar CSV.
  function renderReports(){const list=filteredReports();return heading('<span>▤ Relatórios</span>','Consulte e exporte os registros e os resultados das equipes.',`<button class="btn primary" data-action="export">⇩ Exportar CSV</button>`)+`<div class="stats">${statCard('Total de ocorrências',list.length,'▤','blue')}${statCard('Resolvidas',list.filter(r=>r.status==='Resolvido').length,'✓','')}${statCard('Pendentes',list.filter(r=>r.status==='Pendente').length,'◷','yellow')}${statCard('Em andamento',list.filter(r=>r.status==='Em andamento').length,'▶','purple')}</div>
    <div class="grid-2">
    <section class="panel">
    <div class="panel-heading">
    <h2>Evolução das ocorrências</h2>
    <small>Comparação por categoria</small>
    </div>
    <div class="chart-box">
    <canvas id="reportLineChart">
    </canvas>
    </div>
    </section>
    <section class="panel">
    <div class="panel-heading">
    <h2>Status por categoria</h2>
    </div>
    <div class="chart-box">
    <canvas id="reportDonut">
    </canvas>
    </div>
    </section>
    </div>
    <div class="grid-map-side">
    <section class="panel">
    <div class="panel-heading">
    <h2>Relatório de ocorrências</h2>
    <span class="muted">${list.length} registro(s)</span>
    </div>${reportTable(list)}</section>
    <aside>${filtersPanel('Filtros do relatório')}<section class="panel">
    <h3>Resumo do relatório</h3>
    <p>Resolvidas: <strong>${list.filter(r=>r.status==='Resolvido').length}</strong>
    </p>
    <p>Pendentes: <strong>${list.filter(r=>r.status==='Pendente').length}</strong>
    </p>
    <p>Em andamento: <strong>${list.filter(r=>r.status==='Em andamento').length}</strong>
    </p>
    </section>
    </aside>
    </div>`;}
  // Tela de análises com gráficos e observações calculadas com os dados locais.
  function renderAnalytics(){const byType=Object.keys(CATEGORIES).filter(t=>t!=='Outras ocorrências').map(t=>({type:t,n:reports.filter(r=>r.type===t).length})).sort((a,b)=>b.n-a.n);const top=byType[0];const topNeighborhood=NEIGHBORHOODS.map(n=>({name:n,n:reports.filter(r=>r.neighborhood===n).length})).sort((a,b)=>b.n-a.n)[0];return heading('<span>▥ Análises</span>','Observe padrões e acompanhe os indicadores da cidade.')+`<div class="stats">${byType.map((x,i)=>statCard(x.type,x.n,CATEGORIES[x.type].icon,['red','yellow','','blue'][i]||'')).join('')}</div>
    <div class="grid-2">
    <section class="panel">
    <div class="panel-heading">
    <h2>Ocorrências por tipo</h2>
    </div>
    <div class="chart-box">
    <canvas id="analyticsBars">
    </canvas>
    </div>
    </section>
    <section class="panel">
    <div class="panel-heading">
    <h2>Status das solicitações</h2>
    </div>
    <div class="chart-box">
    <canvas id="analyticsDonut">
    </canvas>
    </div>
    </section>
    </div>
    <div class="grid-map-side">
    <section class="panel">
    <div class="panel-heading">
    <h2>Mapa de calor das ocorrências</h2>
    <button class="small-btn" data-screen="mapa">Ver mapa completo ↗</button>
    </div>
    <div class="map" id="analyticsMap">
    </div>
    </section>
    <section class="panel">
    <div class="panel-heading">
    <h2>Principais insights</h2>
    </div>
    <div class="insight-list">
    <div class="insight-row">
    <span class="category-symbol" style="background:${CATEGORIES[top.type].color}">${CATEGORIES[top.type].icon}</span>
    <div>
    <strong>${esc(top.type)}</strong>
    <p class="muted">Categoria com mais registros no conjunto atual: ${top.n}.</p>
    </div>
    </div>
    <div class="insight-row">
    <span class="category-symbol" style="background:#168dff">⌖</span>
    <div>
    <strong>Bairro com mais registros</strong>
    <p class="muted">${topNeighborhood?.name||'Sem dados'}: ${topNeighborhood?.n||0} ocorrência(s).</p>
    </div>
    </div>
    <div class="insight-row">
    <span class="category-symbol" style="background:#10bd83">✓</span>
    <div>
    <strong>Taxa de resolução</strong>
    <p class="muted">${reports.length?Math.round(counts().resolved/reports.length*100):0}% dos registros estão resolvidos.</p>
    </div>
    </div>
    </div>
    </section>
    </div>`;}
    // Tela de preferências; as opções são salvas no armazenamento local do navegador.
  function renderSettings(){return heading('<span>⚙ Configurações</span>','Gerencie as preferências do sistema.')+`<div class="settings-grid">
    <section class="panel settings-card">
    <h3>♟ Perfil da conta</h3>
    <p>Informações do administrador local.</p>
    <form id="profileForm">
    <div class="field">
    <label for="profileName">Nome</label>
    <input id="profileName" value="Prefeitura Municipal" required>
    </div>
    <div class="field">
    <label for="profileEmail">E-mail</label>
    <input id="profileEmail" type="email" value="prefeitura@maringa.pr.gov.br" required>
    </div>
    <div class="field">
    <label for="profileRole">Cargo</label>
    <input id="profileRole" value="Administrador">
    </div>
    <button class="btn primary">Salvar perfil</button>
    </form>
    </section>
    <section class="panel settings-card">
    <h3>◉ Aparência</h3>
    <p>Personalize a experiência de uso.</p>
    <div class="field">
    <label for="themeSelect">Tema</label>
    <select id="themeSelect">${options(['Escuro','Claro'],settings.theme==='light'?'Claro':'Escuro')}</select>
    </div>
    <div class="field">
    <label for="fontSelect">Tamanho da fonte</label>
    <select id="fontSelect">${options(['Padrão','Grande','Muito grande'],settings.font==='large'?'Grande':settings.font==='xlarge'?'Muito grande':'Padrão')}</select>
    </div>
    <button class="btn primary" id="saveAppearance">Salvar aparência</button>
    </section>
    <section class="panel settings-card">
    <h3>♧ Notificações</h3>
    <p>Escolha os avisos que deseja receber.</p>${[['notifications','Novas ocorrências'],['weekly','Relatórios semanais'],['reminders','Lembretes e prazos']].map(([key,label])=>`<div class="setting-row"><span>${label}</span><input class="switch setting-switch" type="checkbox" data-setting="${key}" ${settings[key]?'checked':''} aria-label="${label}"></div>`).join('')}</section>
    <section class="panel settings-card">
    <h3>♙ Segurança</h3>
    <p>Opções de segurança da conta.</p>
    <button class="btn" data-action="security">Alterar senha</button>
    <div class="setting-row">
    <span>Autenticação em duas etapas</span>
    <input class="switch" type="checkbox" id="twoFactor">
    </div>
    <div class="setting-row">
    <span>Sessões ativas</span>
    <button class="small-btn" data-action="sessions">Ver sessões</button>
    </div>
    </section>
    <section class="panel settings-card">
    <h3>⇄ Integrações</h3>
    <p>Serviços conectados ao Radar Urbano.</p>
    <div class="setting-row">
    <span>Mapa OpenStreetMap</span>
    <span class="status Resolvido">Disponível</span>
    </div>
    <div class="setting-row">
    <span>Banco de dados remoto</span>
    <span class="status Pendente">Não conectado</span>
    </div>
    <p>Esta versão funciona localmente. Integrações de produção precisam de servidor e credenciais.</p>
    </section>
    <section class="panel settings-card">
    <h3>▣ Dados e privacidade</h3>
    <p>Gerencie os dados guardados neste navegador.</p>
    <button class="btn" data-action="export">Exportar dados CSV</button>
    <div style="height:9px">
    </div>
    <button class="btn" data-action="reset">Restaurar dados de demonstração</button>
    <p>Restaurar substitui as alterações locais pelos dados iniciais.</p>
    </section>
    </div>
    <div class="panel" style="margin-top:15px">
    <strong>ⓘ Última atualização</strong>
    <p class="muted">Os dados são armazenados neste navegador. Não são enviados para a prefeitura nem compartilhados com outros dispositivos.</p>
    </div>`;}
  /* ===================== NAVEGAÇÃO E EVENTOS ===================== */
  // Desenha a tela atual e inicializa mapas e gráficos que existirem nela.
  function render(){
    clearMaps(); clearCharts();
    const screens={inicio:renderHome,mapa:renderMap,ocorrencias:renderOccurrences,manutencoes:renderMaintenance,relatorios:renderReports,analises:renderAnalytics,configuracoes:renderSettings};
    if(!screens[currentScreen]) currentScreen='inicio';
    document.getElementById('appContent').innerHTML=screens[currentScreen]();
    document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.screen===currentScreen));
    location.hash=currentScreen;
    if(currentScreen==='inicio'){createMap('homeMap');doughnutChart('homeStatusChart');}
    if(currentScreen==='mapa'){createMap('largeMap',true);}
    if(currentScreen==='ocorrencias'){/* A lista já foi renderizada com os filtros ativos. */}
    if(currentScreen==='manutencoes')doughnutChart('maintenanceChart',reports.filter(r=>r.status!=='Resolvido'));
    if(currentScreen==='relatorios'){lineChart('reportLineChart',filteredReports());doughnutChart('reportDonut',filteredReports());}
    if(currentScreen==='analises'){barChart('analyticsBars');doughnutChart('analyticsDonut');createMap('analyticsMap');}
    if(settings.theme==='light')document.body.classList.add('light-theme');else document.body.classList.remove('light-theme');
    if(settings.font==='large')document.body.style.fontSize='16px';else if(settings.font==='xlarge')document.body.style.fontSize='18px';else document.body.style.fontSize='14px';
  }
  // Navegação acionada pela barra lateral ou pelos botões de atalho.
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-screen]'); if(nav){currentScreen=nav.dataset.screen;document.getElementById('sidebar').classList.remove('open');render();return;}
    const action=event.target.closest('[data-action]'); if(!action)return;
    const kind=action.dataset.action; const id=Number(action.dataset.id);
    if(kind==='new-report'){openReportDialog();}
    if(kind==='view'){const r=reports.find(x=>x.id===id);if(r)openDetails(r);}
    if(kind==='export')exportCSV();
    if(kind==='reset'){if(confirm('Restaurar os dados de demonstração? Suas alterações locais serão substituídas.')){reports=[...SEED];saveReports();notify('Dados de demonstração restaurados.');render();}}
    if(kind==='security')notify('Demonstração: conecte um sistema de autenticação para alterar a senha com segurança.');
    if(kind==='sessions')notify('Esta demonstração não mantém sessões remotas.');
  });
  // O formulário de filtros altera a lista exibida.
  document.addEventListener('submit',event=>{
    if(event.target.id==='filterForm'){event.preventDefault();activeFilters={category:document.getElementById('filterCategory').value,status:document.getElementById('filterStatus').value,neighborhood:document.getElementById('filterNeighborhood').value,period:document.getElementById('filterPeriod').value};render();notify('Filtros aplicados.');}
    if(event.target.id==='profileForm'){event.preventDefault();localStorage.setItem('radarProfile',JSON.stringify({name:document.getElementById('profileName').value,email:document.getElementById('profileEmail').value,role:document.getElementById('profileRole').value}));notify('Perfil salvo neste navegador.');}
    if(event.target.id==='chatForm'){event.preventDefault();sendChat();}
    if(event.target.id==='newReportForm'){event.preventDefault();createReportFromForm();}
  });
  // Limpa todos os filtros e volta a exibir os registros.
  document.addEventListener('click',event=>{if(event.target.id==='clearFilters'){activeFilters={category:'Todas as categorias',status:'Todos os status',neighborhood:'Todos os bairros',period:'Últimos 30 dias'};render();notify('Filtros limpos.');}});
  // Atualiza o status de uma demanda diretamente pela tabela de manutenções.
  document.addEventListener('change',event=>{
    if(event.target.matches('[data-action="status"]')){const r=reports.find(x=>x.id===Number(event.target.dataset.id));if(r){r.status=event.target.value;saveReports();render();notify(`Status da ocorrência #${r.id} atualizado.`);}}
    if(event.target.matches('.setting-switch')){settings[event.target.dataset.setting]=event.target.checked;localStorage.setItem('radarSettings',JSON.stringify(settings));notify('Preferência de notificação salva.');}
  });
  // Pesquisa global atualiza a tela depois de uma pequena pausa para digitação.
  let searchDebounce;document.getElementById('globalSearch').addEventListener('input',()=>{clearTimeout(searchDebounce);searchDebounce=setTimeout(()=>render(),250);});
  // Alterna a barra lateral em dispositivos pequenos.
  document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  // Mostra um resumo simples das notificações de exemplo.
  document.getElementById('notificationButton').addEventListener('click',()=>notify(`${reports.filter(r=>r.status==='Pendente').length} ocorrência(s) pendente(s).`));
  // Abre um aviso demonstrativo ao clicar no perfil do administrador.
  document.getElementById('profileButton').addEventListener('click',()=>notify('Perfil local: Administrador da Prefeitura.'));
  // Centraliza o mapa maior novamente na cidade de Maringá.
  document.addEventListener('click',event=>{if(event.target.id==='centerMap'){const map=mapInstances.find(m=>m.getContainer().id==='largeMap') || mapInstances[0];if(map)map.setView(MARINGA_CENTER,12);}});
  // Salva tema e tamanho de fonte escolhidos na tela de configurações.
  document.addEventListener('click',event=>{if(event.target.id==='saveAppearance'){settings.theme=document.getElementById('themeSelect').value==='Claro'?'light':'dark';const font=document.getElementById('fontSelect').value;settings.font=font==='Grande'?'large':font==='Muito grande'?'xlarge':'normal';localStorage.setItem('radarSettings',JSON.stringify(settings));render();notify('Aparência salva.');}});
  /* ===================== CADASTRO E DETALHES ===================== */
  // Abre um formulário simples para cadastrar uma nova ocorrência.
  function openReportDialog(){
    const old=document.getElementById('dialogOverlay');if(old)old.remove();
    const overlay=document.createElement('div');overlay.id='dialogOverlay';overlay.style.cssText='position:fixed;inset:0;z-index:100;background:#001817cc;display:grid;place-items:center;padding:18px';
    overlay.innerHTML=`<section class="panel" style="width:min(600px,100%);max-height:90vh;overflow:auto">
    <div class="panel-heading">
    <h2>＋ Nova ocorrência</h2>
    <button class="small-btn" type="button" id="closeDialog">Fechar ✕</button>
    </div>
    <form id="newReportForm">
    <div class="field">
    <label for="newType">Categoria</label>
    <select id="newType" required>${options(Object.keys(CATEGORIES),'Buracos na rua')}</select>
    </div>
    <div class="field">
    <label for="newDescription">Descrição</label>
    <input id="newDescription" required maxlength="140" placeholder="Descreva o problema">
    </div>
    <div class="field">
    <label for="newAddress">Endereço</label>
    <input id="newAddress" required placeholder="Rua, número ou referência">
    </div>
    <div class="field">
    <label for="newNeighborhood">Bairro</label>
    <select id="newNeighborhood" required>${options(NEIGHBORHOODS,'Centro')}</select>
    </div>
    <div class="field">
    <label for="newStatus">Status</label>
    <select id="newStatus">${options(['Pendente','Em andamento','Resolvido'],'Pendente')}</select>
    </div>
    <button class="btn primary" type="submit">Salvar ocorrência</button>
    </form>
    </section>`;
    document.body.appendChild(overlay);document.getElementById('closeDialog').onclick=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  }
  // Valida o formulário e cria um registro com coordenadas próximas ao centro da cidade.
  function createReportFromForm(){
    const type=document.getElementById('newType').value;const neighborhood=document.getElementById('newNeighborhood').value;
    const r={id:Math.max(0,...reports.map(x=>x.id))+1,type,description:document.getElementById('newDescription').value.trim(),address:document.getElementById('newAddress').value.trim(),neighborhood,date:new Date().toISOString().slice(0,16),status:document.getElementById('newStatus').value,lat:-23.4205+(Math.random()-.5)*.035,lng:-51.9333+(Math.random()-.5)*.045};
    reports.unshift(r);saveReports();document.getElementById('dialogOverlay')?.remove();currentScreen='ocorrencias';render();notify(`Ocorrência #${r.id} cadastrada.`);
  }
  // Abre os detalhes do registro e permite atualizar o status.
  function openDetails(r){
    const next=prompt(`Ocorrência #${r.id}\n${r.type}\n${r.description}\n${r.address} — ${r.neighborhood}\nStatus atual: ${r.status}\n\nDigite: Pendente, Em andamento ou Resolvido para alterar o status.`,r.status);
    if(!next)return;const valid=['Pendente','Em andamento','Resolvido'];if(!valid.includes(next)){notify('Status não reconhecido. Nenhuma alteração feita.');return;}r.status=next;saveReports();render();notify(`Ocorrência #${r.id} atualizada.`);
  }
  // Responde com informações calculadas localmente, sem fingir que existe uma IA remota.
  function sendChat(){const input=document.getElementById('chatInput');const box=document.getElementById('chatMessages');const q=input.value.trim();if(!q)return;const user=document.createElement('div');user.className='chat-message';user.style.alignSelf='flex-end';user.textContent=q;box.appendChild(user);const answer=chatAnswer(q);const bot=document.createElement('div');bot.className='chat-message';bot.textContent=answer;box.appendChild(bot);input.value='';box.scrollTop=box.scrollHeight;}
  // Produz respostas de exemplo sobre os dados atuais.
  function chatAnswer(q){const s=q.toLocaleLowerCase('pt-BR');const c=counts();if(s.includes('pendente'))return `Existem ${c.pending} ocorrência(s) pendente(s) no conjunto de demonstração.`;if(s.includes('resolvid'))return `${c.resolved} ocorrência(s) estão marcadas como resolvidas.`;if(s.includes('bairro')){const top=NEIGHBORHOODS.map(n=>({n,total:reports.filter(r=>r.neighborhood===n).length})).sort((a,b)=>b.total-a.total)[0];return `O bairro com mais registros no conjunto atual é ${top.n}, com ${top.total} ocorrência(s).`; }if(s.includes('buraco'))return `Há ${reports.filter(r=>r.type==='Buracos na rua').length} registro(s) de buracos nas ruas.`;if(s.includes('alag'))return `Há ${reports.filter(r=>r.type==='Alagamentos').length} registro(s) de alagamentos.`;if(s.includes('árvore')||s.includes('arvore'))return `Há ${reports.filter(r=>r.type==='Árvores caídas').length} registro(s) de árvores caídas.`;return `No momento há ${c.total} registro(s): ${c.resolved} resolvido(s), ${c.pending} pendente(s) e ${c.progress} em andamento. Pergunte sobre pendências, bairros, buracos ou alagamentos.`;}
  // Exporta os registros atuais como arquivo CSV que abre em planilhas.
  function exportCSV(){const headers=['ID','Categoria','Descrição','Endereço','Bairro','Data','Status','Latitude','Longitude'];const rows=reports.map(r=>[r.id,r.type,r.description,r.address,r.neighborhood,dateLabel(r.date),r.status,r.lat,r.lng]);const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='radar-urbano-relatorio.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);notify('Exportação CSV iniciada.');}
  // Inicia a aplicação na tela de início.
  render();
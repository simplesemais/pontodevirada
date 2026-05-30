async function fetchJson(file) {
  const response = await fetch(file);
  if (!response.ok) throw new Error(`Arquivo não encontrado: ${file}`);
  return response.json();
}

async function loadSeason(file) {
  try {
    document.body.classList.remove('episode-active', 'episode-reading-active');
    const season = await fetchJson(file);

    setSeason(season);
    document.getElementById('seasonTitle').textContent = season.title || 'Temporada';
    buildEpisodeList();
    updateSeasonCTA();
    showOnly('season-view');
  } catch (error) {
    console.error('Erro ao carregar temporada:', error);
    showAppMessage('Não foi possível carregar a temporada. Verifique se os arquivos estão no lugar correto.');
  }
}

function buildEpisodeList() {
  const container = document.getElementById('episodeList');
  const season = AppState.season;

  if (!container || !season) return;

  container.innerHTML = season.episodes.map(ep => `
    <div
      class="episode-card ${ep.status === 'coming-soon' ? 'coming-soon' : ''}"
      onclick="${ep.status === 'coming-soon' ? 'openComingSoonEpisode()' : `openEpisode(${ep.id})`}"
      data-id="${ep.id}"
    >
      ${ep.status === 'coming-soon' ? '<div class="coming-soon-badge">em breve</div>' : ''}
      ${isEpisodeCompleted(ep.id) ? '<div class="episode-completed">concluído</div>' : ''}
      <img src="${ep.img}" class="episode-image" alt="Episódio ${ep.id} — ${ep.title}" loading="lazy" />
      <div class="episode-card-content">
        <div class="episode-number">EPISÓDIO ${ep.id}</div>
        <h3>${ep.title}</h3>
        <p>${ep.subtitle}</p>
      </div>
    </div>
  `).join('');
}

async function openEpisode(id) {
  const season = AppState.season;
  if (!season) return;

  const epMeta = season.episodes.find(ep => Number(ep.id) === Number(id));

  if (!epMeta) {
    showAppMessage('Episódio não encontrado.');
    return;
  }

  if (epMeta.status === 'coming-soon') {
    openComingSoonEpisode();
    return;
  }

  try {
    const episode = await fetchJson(epMeta.file);
    episode.blocks = buildSearchBlocksFromEpisode(episode);

    setEpisode(episode);
    setScripture(episode.scriptureHighlight);

    document.body.classList.add('episode-active');
    document.body.classList.remove('episode-reading-active');

    const title = document.getElementById('episodeTitle');
    const subtitle = document.getElementById('episodeSubtitle');
    if (title) title.textContent = '';
    if (subtitle) subtitle.textContent = '';

    renderEpisodeHome(episode);

    showOnly('episode-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    markBlockAsRead(0);
  } catch (error) {
    console.error('Erro ao abrir episódio:', error);
    showAppMessage('Não foi possível abrir este episódio agora.');
  }
}

function buildSearchBlocksFromEpisode(episode) {
  const prepare = episode.prepare || [];
  const conduct = episode.conduct || [];
  return [...prepare, ...conduct].map((item, index) => ({
    label: index < prepare.length ? 'Prepare-se' : 'Conduza a célula',
    title: item.title,
    type: item.type,
    content: item.content || []
  }));
}

function renderEpisodeHome(episode) {
  const container = document.getElementById('episodeContent');
  if (!container) return;

  document.body.classList.add('episode-active');
  document.body.classList.remove('episode-reading-active');
  clearEpisodeScrollProgress();

  container.innerHTML = `
    ${renderEpisodeHero(episode)}
    ${renderScriptureHighlight(episode.scriptureHighlight)}
    ${renderEpisodeHub(episode)}
    ${renderLeaderLaunchers(episode.id)}
    ${renderEpisodeActions(episode.id)}
    ${renderEpisodeBottomLinks()}
  `;
}

function renderEpisodeHero(ep) {
  return `
    <section class="episode-cinematic-hero" style="background-image:url('${ep.img}')">
      <div class="episode-cinematic-overlay"></div>
      <div class="episode-hero-nav">
        <button class="episode-nav-pill" onclick="exitEpisodeToSeason()">← Temporada</button>
        <button class="episode-nav-pill" onclick="openNextEpisode()">Próximo →</button>
      </div>
      <div class="episode-cinematic-content">
        <div class="episode-kicker">EPISÓDIO ${ep.id}</div>
        <h1>${ep.title}</h1>
        <p class="episode-hero-subtitle">${ep.subtitle}</p>
        ${ep.summary ? `<p class="episode-hero-summary">${ep.summary}</p>` : ''}
      </div>
    </section>
  `;
}

function renderScriptureHighlight(scripture) {
  if (!scripture) return '';

  setScripture(scripture);

  return `
    <section class="scripture-feature scripture-feature-static">
      <div class="scripture-feature-label">VERSÍCULO DE DESTAQUE</div>
      <blockquote>“${scripture.verse}”</blockquote>
      <div class="scripture-feature-ref">${scripture.highlightVerse}</div>
    </section>
  `;
}

function renderEpisodeHub(ep) {
  const prepareCount = ep.prepare?.length || 0;
  const conductCount = ep.conduct?.length || 0;

  return `
    <section class="episode-hub compact-hub">
      <div class="episode-hub-label">NESTE EPISÓDIO</div>

      <button class="episode-hub-card prepare" onclick="openEpisodeSection('prepare')">
        <span class="episode-hub-icon" aria-hidden="true">✦</span>
        <span>
          <strong>Prepare-se</strong>
          <small>${prepareCount} momentos para estudar, refletir e chegar com clareza antes da célula.</small>
        </span>
        <em>›</em>
      </button>

      <button class="episode-hub-card conduct" onclick="openEpisodeSection('conduct')">
        <span class="episode-hub-icon" aria-hidden="true">◈</span>
        <span>
          <strong>Conduza a célula</strong>
          <small>Leia antes do encontro para saber como abrir, conduzir e encerrar a célula.</small>
        </span>
        <em>›</em>
      </button>
    </section>
  `;
}

function renderLeaderLaunchers(id) {
  return `
    <section class="leader-launchers" aria-label="Ferramentas do líder">
      <div class="episode-hub-label">FERRAMENTAS DO LÍDER</div>
      <div class="leader-launcher-grid">
        <button class="leader-launcher" onclick="openLeaderTool('notes', ${id})">
          <span>Notas do líder</span>
          <small>registrar ideias e direcionamentos</small>
        </button>
        <button class="leader-launcher" onclick="openLeaderTool('prayers', ${id})">
          <span>Pedidos de oração</span>
          <small>adicionar e revisar pedidos</small>
        </button>
      </div>
    </section>
  `;
}

function renderEpisodeActions(id) {
  return `
    <section class="episode-home-actions">
      <button class="episode-action-secondary share-episode-btn" onclick="exportEpisodeSummary(${id})">Compartilhar episódio</button>
      <button class="episode-action-primary complete-episode-btn ${isEpisodeCompleted(id) ? 'completed' : ''}" onclick="toggleEpisodeCompleted(${id})">
        ${isEpisodeCompleted(id) ? 'Concluído ✓' : 'Concluir'}
      </button>
    </section>
  `;
}

function renderEpisodeBottomLinks() {
  return `
    <div class="episode-bottom-links episode-bottom-links-clean">
      <button onclick="exitEpisodeToSeason()">← voltar para temporada</button>
      <button onclick="openNextEpisode()">próximo episódio →</button>
    </div>
  `;
}

function openEpisodeSection(sectionType = 'prepare') {
  const episode = AppState.episode;
  if (!episode) return;

  const container = document.getElementById('episodeContent');
  if (!container) return;

  document.body.classList.add('episode-active', 'episode-reading-active');

  container.innerHTML = `
    <section class="episode-reading episode-reference-layout" data-reading-type="reference">
      <button class="reading-reference-close" onclick="renderEpisodeHome(AppState.episode)" aria-label="Voltar ao episódio">×</button>

      <div class="reading-reference-timeline">
        ${renderReferenceStepScripture(episode)}
        ${renderReferenceStepMessage(episode)}
        ${renderReferenceStepVisualTriggers(episode)}
        ${renderReferenceStepConduct(episode)}
        ${renderReferenceStepTools(episode)}
      </div>

      <div class="reading-reference-progress" id="readingReferenceProgress" aria-label="Progresso de leitura">
        <span id="readingSectionLabel">Prepare-se</span>
        <div class="reading-progress-track" aria-hidden="true">
          <div class="reading-progress-fill" id="readingProgressFill"></div>
        </div>
        <span>passo <b id="readingCurrentStep">1</b>/5</span>
      </div>
    </section>
  `;

  window.scrollTo({ top: 0, behavior: 'smooth' });
  initEpisodeScrollProgress();
  initReferenceStepObserver();
  markSectionProgress('combined', 5);

  setTimeout(() => {
    loadLeaderToolNotes(episode.id);
    loadLeaderToolPrayers(episode.id);
  }, 80);

  if (sectionType === 'conduct') {
    setTimeout(() => {
      document.getElementById('step-conduct')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }
}

function renderReferenceStepScripture(episode) {
  const scripture = episode.scriptureHighlight || {};
  return `
    <article class="reference-step reference-step-scripture" data-reference-step="1">
      <div class="reference-dot"></div>
      <div class="reference-step-body no-card">
        <div class="reference-step-label">Passo 1 • texto bíblico</div>
        <h2>Preparação individual <span>${scripture.reference || 'Marcos 1:1–15'}</span></h2>
        <blockquote>“${scripture.verse || ''}”</blockquote>
        <button class="reference-read-all-button" onclick="openScriptureModal()">abrir texto bíblico completo</button>
      </div>
    </article>
  `;
}

function renderReferenceStepMessage(episode) {
  const manifesto = findEpisodeItem(episode, 'prepare', 'manifesto');
  const teaching = findEpisodeItem(episode, 'prepare', 'teaching');
  const content = [...(manifesto?.content || []), ...(teaching?.content || [])];
  const intro = content.slice(0, 8).map(text => renderInlineEmphasis(text)).join('');
  const rest = content.slice(8).map(text => renderTextLine(text, 'teaching')).join('');

  return `
    <article class="reference-step reference-step-message" data-reference-step="2">
      <div class="reference-dot"></div>
      <div class="reference-step-body no-card">
        <div class="reference-step-label">Passo 2 • contexto e ideia principal</div>
        <h2>Entenda a mensagem</h2>
        <div class="reference-editorial-text">${intro}</div>
        ${rest ? `<details class="reference-details"><summary>ver aprofundamento</summary><div>${rest}</div></details>` : ''}
      </div>
    </article>
  `;
}

function renderReferenceStepVisualTriggers(episode) {
  const reflection = findEpisodeItem(episode, 'prepare', 'reflection');
  const story = findEpisodeItem(episode, 'prepare', 'story');
  const chips = extractTriggerChips([...(reflection?.content || []), ...(story?.content || [])]);
  const question = 'Quem está sentado no trono do coração?';
  const carousel = [
    { text: 'Percebeu ansiedade?', tag: 'ansiedade', img: 'assets/images/episodio-2-trono.jpg' },
    { text: 'Tentou controlar tudo?', tag: 'controle', img: 'assets/images/episodio-1-trono.jpg' },
    { text: 'Agradou alguém?', tag: 'aprovação', img: 'assets/images/episodio-4-trono.jpg' },
    { text: 'Mudou a direção?', tag: 'decisão', img: 'assets/images/episodio-3-trono.jpg' }
  ];

  return `
    <article class="reference-step reference-step-visual" data-reference-step="3">
      <div class="reference-dot"></div>
      <div class="reference-step-body">
        <div class="reference-step-label">Passo 3 • reflexão do líder</div>
        <h2>Gatilhos para pensar antes de conduzir</h2>
        <div class="visual-trigger-panel">
          <div class="visual-trigger-question">
            <p>${question}</p>
            <div class="visual-trigger-tags">
              ${chips.slice(0, 5).map(chip => `<span>#${chip}</span>`).join('')}
            </div>
          </div>

          <div class="visual-mini-carousel">
            <div class="visual-card-row">
              ${carousel.map((card, index) => `
                <div class="visual-card" style="--visual-bg:url('${card.img}')">
                  <span>${String(index + 1).padStart(2, '0')}</span>
                  <small>${card.tag}</small>
                  <strong>${card.text}</strong>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <details class="reference-details visual-details">
          <summary>ver reflexão completa</summary>
          <div>${[...(reflection?.content || []), ...(story?.content || [])].map(text => renderTextLine(text, 'reflection')).join('')}</div>
          ${renderInlineStoryNotes(episode.id)}
        </details>
      </div>
    </article>
  `;
}

function renderReferenceStepConduct(episode) {
  const conduct = episode.conduct || [];
  const open = findEpisodeItem(episode, 'conduct', 'story') || conduct[1];
  const dynamic = findEpisodeItem(episode, 'conduct', 'dynamic');
  const challenge = findEpisodeItem(episode, 'conduct', 'challenge');
  const scripture = findEpisodeItem(episode, 'conduct', 'scripture');
  const reflection = findEpisodeItem(episode, 'conduct', 'reflection');
  const silence = findEpisodeItem(episode, 'conduct', 'silence');

  return `
    <article class="reference-step reference-step-conduct" id="step-conduct" data-reference-step="4">
      <div class="reference-dot"></div>
      <div class="reference-step-body no-card">
        <div class="reference-step-label">Passo 4 • conduza a célula</div>
        <h2>Ritmo do encontro</h2>
        <div class="conduct-showcase-grid">
          <section class="conduct-showcase-card">
            <h3>1. ORE & QUEBRE O GELO</h3>
            <p>${open?.content?.[0] || 'Ore, quebre o gelo, acolha a todos.'}</p>
            <small>${open?.content?.[2] || ''}</small>
          </section>

          <section class="conduct-showcase-card dynamic-card">
            <h3>2. CONDUZA A DISCUSSÃO</h3>
            <p>Interativo dinâmico <strong>“ESCOLHA UM LADO”</strong></p>
            ${renderReferenceDynamic(dynamic?.content || [])}
          </section>

          <section class="conduct-showcase-card compact">
            <h3>3. LEIA & APROFUNDE</h3>
            <p>${scripture?.content?.[0] || ''}</p>
            <p>${reflection?.content?.[0] || ''}</p>
          </section>

          <section class="conduct-showcase-card compact gold-soft">
            <h3>4. SILÊNCIO & DESAFIO</h3>
            <p>${silence?.content?.[1] || ''}</p>
            <p>${challenge?.content?.join(' ') || ''}</p>
          </section>
        </div>

        <details class="reference-details">
          <summary>ver roteiro completo de condução</summary>
          <div>${conduct.map(item => `
            <section class="reference-script-block">
              <h4>${item.title}</h4>
              ${item.content?.length ? item.content.map(text => renderTextLine(text, item.type)).join('') : '<p>Conduza este momento com simplicidade e presença.</p>'}
            </section>
          `).join('')}</div>
        </details>
      </div>
    </article>
  `;
}

function renderReferenceDynamic(content = []) {
  const optionA = content.find(text => String(text).toLowerCase().includes('outros pensam')) || 'o que os outros pensam';
  const optionB = content.find(text => String(text).toLowerCase().includes('ansiedade')) || 'ansiedade';

  return `
    <div class="reference-dynamic-choice">
      <div><b>A</b><span>${optionA}</span></div>
      <div><b>B</b><span>${optionB}</span></div>
    </div>
    <ol class="reference-dynamic-steps">
      <li>Peça para o grupo escolher um lado.</li>
      <li>Convide algumas pessoas a explicarem suas escolhas.</li>
    </ol>
  `;
}

function renderReferenceStepTools(episode) {
  return `
    <article class="reference-step reference-step-tools" data-reference-step="5">
      <div class="reference-dot"></div>
      <div class="reference-step-body no-card">
        <div class="reference-step-label">Passo 5 • ferramentas do líder</div>
        <h2>Prepare o cuidado final</h2>
        <p class="reference-sendoff">Antes de conduzir, registre o que precisa lembrar e quem precisa ser cuidado em oração.</p>
        <div class="reference-tools-grid">
          <section class="reference-tool-card">
            <h3>Notas salvas</h3>
            <p>Use este espaço para registrar observações, ideias e direcionamentos para a célula.</p>
            ${renderNotesTool(episode.id)}
          </section>
          <section class="reference-tool-card">
            <h3>Pedidos de oração</h3>
            ${renderPrayerTool(episode.id)}
          </section>
        </div>
      </div>
    </article>
  `;
}

function findEpisodeItem(episode, section, type) {
  return (episode?.[section] || []).find(item => item.type === type);
}

function extractTriggerChips(lines = []) {
  return lines
    .map(line => String(line || '').trim().replace(/;$/, '').replace(/^ou\s+/i, ''))
    .filter(line => line && line.length <= 42)
    .filter(line => !['Pode ser:', 'Pode ser um momento em que:', 'OU'].includes(line))
    .slice(0, 8);
}

function renderInlineEmphasis(text) {
  const strongWords = ['salvador', 'Rei', 'Reino', 'entrega', 'governando', 'governa'];
  let safe = String(text || '').trim();
  strongWords.forEach(word => {
    safe = safe.replace(new RegExp(`\\b${word}\\b`, 'gi'), match => `<strong>${match}</strong>`);
  });
  return `<p>${safe}</p>`;
}

function initReferenceStepObserver() {
  const stepLabel = document.getElementById('readingCurrentStep');
  const sectionLabel = document.getElementById('readingSectionLabel');
  const progress = document.getElementById('readingReferenceProgress');
  const steps = Array.from(document.querySelectorAll('[data-reference-step]'));
  if (!stepLabel || !steps.length || !('IntersectionObserver' in window)) return;

  const updateLabels = step => {
    const number = Number(step || 1);
    stepLabel.textContent = String(number);
    const isConduct = number >= 4;
    if (sectionLabel) sectionLabel.textContent = isConduct ? 'Conduza' : 'Prepare-se';
    if (progress) progress.classList.toggle('is-conduct', isConduct);
  };

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) updateLabels(visible.target.dataset.referenceStep || '1');
  }, { threshold: [0.30, 0.50, 0.70] });

  steps.forEach(step => observer.observe(step));
  updateLabels(1);
}

function renderReadingSectionBlock({ type, title, eyebrow, subtitle, items, episode, stepOffset = 0 }) {
  return `
    <section class="reading-section-block reading-section-${type}" id="reading-section-${type}" data-section-block="${type}">
      <header class="reading-header reading-section-header ${type === 'conduct' ? 'conduct-header' : 'prepare-header'}">
        <div class="episode-section-label">${eyebrow}</div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </header>

      <div class="reading-flow">
        ${items.map((item, index) => renderReadingItem(item, index, type, episode, stepOffset)).join('')}
      </div>
    </section>
  `;
}

function renderReadingItem(item, index, sectionType, episode, stepOffset = 0) {
  const optional = item.optional ? '<span class="reading-optional">opcional</span>' : '';
  const content = renderReadingContent(item, sectionType, episode, index);
  const canExpand = hasExpandableContent(item, sectionType);
  const preview = canExpand ? renderReadingPreview(item, sectionType, episode) : '';
  const stepNumber = stepOffset + index + 1;

  return `
    <article class="reading-scene reading-${item.type || 'default'} ${canExpand ? 'is-collapsible' : 'is-simple'}" data-step="${index + 1}" data-section="${sectionType}">
      <div class="reading-scene-marker">${stepNumber}</div>
      <div class="reading-scene-content">
        <div class="reading-scene-meta">${optional}</div>
        <h2>${item.title}</h2>
        ${preview}
        <div class="reading-scene-body" id="scene-body-${sectionType}-${index}">
          ${content}
        </div>
        ${canExpand ? `
          <div class="reading-more-row">
            <button class="scene-expand-button" onclick="toggleReadingScene('${sectionType}', ${index})" aria-expanded="false" aria-label="Abrir ou fechar trecho">
              <span>mais</span>
            </button>
          </div>
        ` : ''}
      </div>
    </article>
  `;
}

function hasExpandableContent(item, sectionType) {
  if (sectionType === 'prepare' && item.type === 'scripture') return false;
  return (item.content || []).length > 1;
}

function renderReadingPreview(item, sectionType, episode) {
  if (sectionType === 'prepare' && item.type === 'scripture') return '';
  const lines = (item.content || []).filter(Boolean).slice(0, 2);
  if (!lines.length) return '';
  return `<div class="reading-scene-preview">${lines.map(text => renderTextLine(text, item.type, true)).join('')}</div>`;
}

function renderReadingContent(item, sectionType, episode, index = 0) {
  const content = item.content || [];

  if (sectionType === 'prepare' && item.type === 'scripture') {
    return `
      <button class="scripture-reference-link" onclick="openScriptureModal()">
        <span>Marcos 1:1–15</span>
        <small>abrir texto completo</small>
      </button>
      <div class="key-verse-card">
        <span>Versículo-chave</span>
        <p>“${episode.scriptureHighlight?.verse || ''}” <strong>${episode.scriptureHighlight?.highlightVerse || ''}</strong></p>
      </div>
    `;
  }

  if (item.type === 'dynamic') {
    return renderDynamicMoment(content);
  }

  let html = content.length
    ? content.map(text => renderTextLine(text, item.type)).join('')
    : '';

  if (sectionType === 'prepare' && item.type === 'story') {
    html += renderInlineStoryNotes(episode.id);
  }

  if (!html && item.type !== 'prayer') {
    html = '<p class="scene-muted">Conduza este momento com simplicidade e presença.</p>';
  }

  return html;
}

function renderDynamicMoment(content = []) {
  return `
    <div class="dynamic-infographic">
      <h3>Escolha um lado</h3>
      <p>O que mais controla você hoje?</p>
      <div class="dynamic-choice-grid">
        <div class="dynamic-choice-card"><span>A</span><strong>o que os outros pensam</strong></div>
        <div class="dynamic-choice-divider">OU</div>
        <div class="dynamic-choice-card"><span>B</span><strong>ansiedade</strong></div>
      </div>
      <div class="dynamic-steps">
        <div><b>1</b><span>Peça para o grupo escolher um lado.</span></div>
        <div><b>2</b><span>Convide algumas pessoas a explicarem suas escolhas.</span></div>
        <div><b>3</b><span>Use esse momento para aprofundar a conversa.</span></div>
      </div>
    </div>
  `;
}

function renderInlineStoryNotes(id) {
  return `
    <div class="inline-note-box">
      <label for="story-note-${id}">Anote sua história de abertura</label>
      <textarea id="story-note-${id}" placeholder="Escreva aqui a situação real que você pode contar na célula..."></textarea>
      <button onclick="saveStoryNoteToEpisode(${id})">Salvar nas notas do episódio</button>
      <small id="story-note-feedback-${id}" aria-live="polite"></small>
    </div>
  `;
}

function saveStoryNoteToEpisode(id) {
  const textarea = document.getElementById(`story-note-${id}`);
  const feedback = document.getElementById(`story-note-feedback-${id}`);
  if (!textarea || !textarea.value.trim()) return;

  const notes = Storage.getNotes(id);
  notes.unshift({ text: `História de abertura: ${textarea.value.trim()}`, date: new Date().toLocaleString() });
  Storage.saveNotes(id, notes);

  textarea.value = '';
  if (feedback) {
    feedback.textContent = 'Salvo nas notas do episódio.';
    setTimeout(() => { feedback.textContent = ''; }, 2200);
  }
}

function renderTextLine(text, type, isPreview = false) {
  const normalized = String(text || '').trim();
  if (!normalized) return '';
  if (normalized === 'OU') return '<div class="scene-or">OU</div>';

  const chipLines = new Set([
    'aprovação;', 'ansiedade;', 'medo;', 'comparação;', 'orgulho;', 'controle;', 'necessidade de aceitação.',
    'você tentou controlar tudo;', 'tomou uma decisão apenas para agradar alguém;',
    'percebeu ansiedade dominando suas escolhas;', 'ou viu pequenas decisões mudarem sua direção aos poucos.'
  ]);

  if (chipLines.has(normalized) || normalized.endsWith(';')) {
    return `<span class="scene-chip">${normalized.replace(/;$/, '')}</span>`;
  }

  const highlightLines = new Set(['Uma resposta.', 'Um hábito.', 'Uma conversa.', 'Uma decisão feita apenas para agradar alguém.']);
  if (highlightLines.has(normalized)) return `<p class="scene-highlight-line">${normalized}</p>`;
  if (normalized.startsWith('—')) return `<p class="scene-reference">${normalized}</p>`;

  if (normalized.startsWith('“') || normalized.startsWith('Quem está') || normalized.startsWith('Existe alguma') || normalized.startsWith('Se alguém') || normalized.startsWith('O que mais')) {
    return `<p class="scene-question">${normalized}</p>`;
  }

  if (type === 'manifesto' && normalized.length < 70 && !isPreview) return `<p class="manifesto-line">${normalized}</p>`;
  return `<p>${normalized}</p>`;
}

function toggleReadingScene(sectionType, index) {
  const scene = document.querySelector(`.reading-scene[data-section="${sectionType}"][data-step="${index + 1}"]`);
  if (!scene) return;

  const willOpen = !scene.classList.contains('open');

  document.querySelectorAll('.reading-scene.open').forEach(openScene => {
    openScene.classList.remove('open');
    const button = openScene.querySelector('.scene-expand-button');
    if (button) {
      button.setAttribute('aria-expanded', 'false');
      button.querySelector('span').textContent = 'mais';
    }
  });

  if (willOpen) {
    scene.classList.add('open');
    const button = scene.querySelector('.scene-expand-button');
    if (button) {
      button.setAttribute('aria-expanded', 'true');
      button.querySelector('span').textContent = 'menos';
    }
    scrollReadingSceneIntoView(scene);
  }
}

function openNextReadingScene(sectionType, currentIndex) {
  const next = document.querySelector(`.reading-scene[data-section="${sectionType}"][data-step="${currentIndex + 2}"]`);
  if (!next) return;
  toggleReadingScene(sectionType, currentIndex + 1);
}

function scrollReadingSceneIntoView(scene) {
  if (!scene) return;
  const offset = 96;
  const top = scene.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
}

function openLeaderTool(type, id) {
  closeLeaderTool();

  const title = type === 'notes' ? 'Notas do líder' : 'Pedidos de oração';
  const description = type === 'notes'
    ? 'Use este espaço para registrar observações, ideias e direcionamentos para a célula.'
    : 'Adicione pedidos para lembrar durante a oração e no compartilhamento.';

  const modal = document.createElement('div');
  modal.className = 'leader-tool-modal open';
  modal.innerHTML = `
    <div class="leader-tool-overlay" onclick="closeLeaderTool()"></div>
    <section class="leader-tool-sheet" role="dialog" aria-modal="true" aria-label="${title}">
      <button class="leader-tool-close" onclick="closeLeaderTool()" aria-label="Fechar">×</button>
      <div class="leader-tool-label">FERRAMENTA</div>
      <h2>${title}</h2>
      <p>${description}</p>
      ${type === 'notes' ? renderNotesTool(id) : renderPrayerTool(id)}
    </section>
  `;

  document.body.appendChild(modal);

  if (type === 'notes') {
    loadLeaderToolNotes(id);
    setTimeout(() => document.getElementById(`leader-notes-${id}`)?.focus(), 80);
  } else {
    loadLeaderToolPrayers(id);
    setTimeout(() => document.getElementById(`prayer-input-${id}`)?.focus(), 80);
  }
}

function renderNotesTool(id) {
  return `
    <div class="leader-tool-form">
      <textarea id="leader-notes-${id}" class="leader-tool-textarea" placeholder="Escreva uma nota para lembrar depois..."></textarea>
      <button class="leader-tool-primary" onclick="saveLeaderToolNote(${id})">Salvar nota</button>
    </div>
    <div id="leader-history-${id}" class="leader-tool-list"></div>
  `;
}

function renderPrayerTool(id) {
  return `
    <div class="leader-tool-form prayer-form-row">
      <input id="prayer-input-${id}" class="leader-tool-input" placeholder="Adicionar pedido..." />
      <button class="leader-tool-primary" onclick="addLeaderToolPrayer(${id})">Adicionar</button>
    </div>
    <div id="prayer-list-${id}" class="leader-tool-list"></div>
  `;
}

function closeLeaderTool() {
  document.querySelector('.leader-tool-modal')?.remove();
}

function saveLeaderToolNote(id) {
  const textarea = document.getElementById(`leader-notes-${id}`);
  if (!textarea) return;

  const value = textarea.value.trim();
  if (!value) return;

  const notes = Storage.getNotes(id);
  notes.unshift({ text: value, date: new Date().toLocaleString() });
  Storage.saveNotes(id, notes);

  textarea.value = '';
  loadLeaderToolNotes(id);
}

function loadLeaderToolNotes(id) {
  const container = document.getElementById(`leader-history-${id}`);
  if (!container) return;

  const notes = Storage.getNotes(id);

  container.innerHTML = notes.length ? notes.map((note, index) => `
    <article class="leader-tool-item">
      <button class="leader-tool-remove" onclick="removeLeaderToolNote(${id}, ${index})">×</button>
      <small>${note.date}</small>
      <p>${note.text}</p>
    </article>
  `).join('') : '<div class="leader-tool-empty">Nenhuma nota salva ainda.</div>';
}

function removeLeaderToolNote(id, index) {
  const notes = Storage.getNotes(id);
  notes.splice(index, 1);
  Storage.saveNotes(id, notes);
  loadLeaderToolNotes(id);
}

function addLeaderToolPrayer(id) {
  const input = document.getElementById(`prayer-input-${id}`);
  if (!input || !input.value.trim()) return;

  const prayers = Storage.getPrayers(id);
  prayers.push(input.value.trim());
  Storage.savePrayers(id, prayers);

  input.value = '';
  loadLeaderToolPrayers(id);
}

function loadLeaderToolPrayers(id) {
  const container = document.getElementById(`prayer-list-${id}`);
  if (!container) return;

  const prayers = Storage.getPrayers(id);

  container.innerHTML = prayers.length ? prayers.map((prayer, index) => `
    <article class="leader-tool-item prayer-item-clean">
      <p>${prayer}</p>
      <button class="leader-tool-remove" onclick="removeLeaderToolPrayer(${id}, ${index})">×</button>
    </article>
  `).join('') : '<div class="leader-tool-empty">Nenhum pedido salvo ainda.</div>';
}

function removeLeaderToolPrayer(id, index) {
  const prayers = Storage.getPrayers(id);
  prayers.splice(index, 1);
  Storage.savePrayers(id, prayers);
  loadLeaderToolPrayers(id);
}

function initEpisodeScrollProgress() {
  clearEpisodeScrollProgress();
  window.__episodeProgressHandler = updateEpisodeScrollProgress;
  window.addEventListener('scroll', window.__episodeProgressHandler, { passive: true });
  updateEpisodeScrollProgress();
}

function clearEpisodeScrollProgress() {
  if (window.__episodeProgressHandler) {
    window.removeEventListener('scroll', window.__episodeProgressHandler);
    window.__episodeProgressHandler = null;
  }
}

function updateEpisodeScrollProgress() {
  const fill = document.getElementById('readingProgressFill');
  const reading = document.querySelector('.episode-reading');
  if (!fill || !reading) return;

  const rect = reading.getBoundingClientRect();
  const total = Math.max(reading.offsetHeight - window.innerHeight, 1);
  const current = Math.min(Math.max(-rect.top, 0), total);
  const percent = Math.round((current / total) * 100);

  fill.style.width = `${percent}%`;
}

function markSectionProgress(sectionType, itemCount) {
  if (sectionType === 'combined') {
    markBlockAsRead(Math.max(itemCount - 1, 0));
    return;
  }

  const offset = sectionType === 'conduct' ? (AppState.episode?.prepare?.length || 0) : 0;
  const readIndex = offset + Math.max(itemCount - 1, 0);
  markBlockAsRead(readIndex);
}

function toggleScene() {
  return;
}

function renderEpisodeSection() {
  return '';
}

function renderSceneItem(item, index) {
  return renderReadingItem(item, index, 'prepare', AppState.episode || {});
}

function renderSceneContent(item) {
  return renderReadingContent(item, 'prepare', AppState.episode || {});
}

function renderEpisodeSummary() {
  return '';
}

function renderEpisodeNavigation() {
  return renderEpisodeBottomLinks();
}

function renderBlock(block, index) {
  return renderSceneItem(block, index);
}

function getLoadedEpisodes() {
  return AppState.season ? AppState.season.episodes : [];
}

function getSavedEpisodeIndex(id) {
  const progress = Storage.getProgress();
  const savedIndex = Number(progress[id]?.lastIndex || 1) - 1;
  const total = getEpisodeStepTotal() || 1;

  return Math.max(0, Math.min(savedIndex, total - 1));
}

function isEpisodeCompleted(id) {
  const progress = Storage.getProgress();
  return Boolean(progress[id]?.completed);
}

function updateSeasonCTA() {
  const button = document.getElementById('seasonCTA');
  if (!button) return;

  const progress = Storage.getProgress();
  const hasProgress = Object.values(progress).some(item => item?.completed || item?.lastIndex > 0);

  button.textContent = hasProgress ? 'próximo episódio' : 'entrar na temporada';
}

function getEpisodeStepTotal() {
  const episode = AppState.episode;
  if (!episode) return 0;
  if (episode.blocks?.length) return episode.blocks.length;
  return (episode.prepare?.length || 0) + (episode.conduct?.length || 0);
}

function markBlockAsRead(index) {
  const episode = AppState.episode;
  if (!episode) return;

  const progress = Storage.getProgress();
  const current = progress[episode.id] || { completed: false, lastIndex: 0 };
  const lastIndex = Math.max(current.lastIndex || 0, index + 1);
  const total = getEpisodeStepTotal();

  progress[episode.id] = {
    completed: current.completed || (total > 0 && lastIndex >= total),
    lastIndex
  };

  Storage.saveProgress(progress);
  updateSeasonCTA();
}

function markEpisodeAsCompleted(id) {
  if (!id) return;

  const progress = Storage.getProgress();
  const totalBlocks = getEpisodeStepTotal();

  progress[id] = {
    completed: true,
    lastIndex: totalBlocks
  };

  Storage.saveProgress(progress);
  updateSeasonCTA();
}

function toggleEpisodeCompleted(id) {
  const progress = Storage.getProgress();
  const totalBlocks = getEpisodeStepTotal();
  const nextCompleted = !progress[id]?.completed;

  progress[id] = {
    completed: nextCompleted,
    lastIndex: nextCompleted ? totalBlocks : 0
  };

  Storage.saveProgress(progress);
  updateSeasonCTA();
  buildEpisodeList();

  document.querySelectorAll('.complete-episode-btn').forEach(button => {
    button.textContent = nextCompleted ? 'Concluído ✓' : 'Concluir';
    button.classList.toggle('completed', nextCompleted);
  });
}

function openNextEpisode() {
  const season = AppState.season;
  const episode = AppState.episode;
  if (!season || !episode) return;

  const currentIndex = season.episodes.findIndex(ep => Number(ep.id) === Number(episode.id));
  const next = season.episodes[currentIndex + 1];

  if (!next) {
    showAppMessage('Você chegou ao fim dos episódios disponíveis.');
    return;
  }

  if (next.status === 'coming-soon') {
    openComingSoonEpisode();
    return;
  }

  openEpisode(next.id);
}

function exitEpisodeToSeason() {
  document.body.classList.remove('episode-active', 'episode-reading-active');
  clearEpisodeScrollProgress();
  backToSeason();
}

window.loadSeason = loadSeason;
window.openEpisode = openEpisode;
window.buildEpisodeList = buildEpisodeList;
window.isEpisodeCompleted = isEpisodeCompleted;
window.markEpisodeAsCompleted = markEpisodeAsCompleted;
window.toggleEpisodeCompleted = toggleEpisodeCompleted;
window.openNextEpisode = openNextEpisode;
window.toggleScene = toggleScene;
window.openEpisodeSection = openEpisodeSection;
window.renderEpisodeHome = renderEpisodeHome;
window.openLeaderTool = openLeaderTool;
window.closeLeaderTool = closeLeaderTool;
window.saveLeaderToolNote = saveLeaderToolNote;
window.removeLeaderToolNote = removeLeaderToolNote;
window.addLeaderToolPrayer = addLeaderToolPrayer;
window.removeLeaderToolPrayer = removeLeaderToolPrayer;
window.saveStoryNoteToEpisode = saveStoryNoteToEpisode;
window.exitEpisodeToSeason = exitEpisodeToSeason;
window.toggleReadingScene = toggleReadingScene;
window.openNextReadingScene = openNextReadingScene;

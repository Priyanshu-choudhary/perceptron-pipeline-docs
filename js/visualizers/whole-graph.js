const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function findPort(stage, edge, type) {
  const list = type === 'input' ? stage.inputs || [] : stage.outputs || [];
  const topic = edge.topic.toLowerCase();
  let index = list.findIndex(item => {
    const label = String(item.topic || item.name || '').toLowerCase();
    return label && (topic.includes(label) || label.includes(topic));
  });
  if (index < 0 && type === 'input') {
    const shortTopic = topic.split(/\s|\(|,/)[0];
    index = list.findIndex(item => item.topic && shortTopic === item.topic.toLowerCase());
  }
  return Math.max(0, index);
}

function findNode(stage, hint) {
  const nodes = stage.nodes || [];
  const hintNorm = norm(hint);
  const match = nodes.find(node => hintNorm && (hintNorm.includes(norm(node.name)) || norm(node.name).includes(hintNorm)));
  if (match) return match.name;
  const tokens = hintNorm.split(' ').filter(token => token.length > 3);
  return nodes.find(node => tokens.some(token => norm(node.name).includes(token)))?.name || nodes[0]?.name || 'external source';
}

function exactNodeAnchor(canvas, stage, hint) {
  const alternatives = String(hint || '').split(/\s+\/\s+/).map(norm).filter(Boolean);
  if (alternatives.length !== 1) return null;
  const node = (stage.nodes || []).find(item => alternatives.includes(norm(item.name)));
  return node ? [...canvas.querySelectorAll(`[data-node-stage="${stage.num}"]`)].find(item => item.dataset.nodeName === node.name) : null;
}

function renderPort(item, index, kind, stage) {
  const label = item.topic || item.name || item.type || 'Unlabeled data';
  const owner = kind === 'input' ? item.source || 'Source not mapped' : item.publisher || 'Publisher not mapped';
  const details = kind === 'input' ? item.type || 'Type not listed' : `${item.type || 'Type not listed'} · ${item.rate || 'Rate not listed'}`;
  return `<button class="graph-port graph-${kind}" type="button" data-port="${kind}" data-stage="${stage.num}" data-index="${index}" title="${escapeHtml(`${label} · ${details} · ${kind === 'input' ? 'from' : 'published by'} ${owner}`)}">
    <span class="port-jack" aria-hidden="true"></span><span class="port-content"><code>${escapeHtml(label)}</code><small>${escapeHtml(owner)}</small></span><span class="port-type">${escapeHtml(details)}</span>
  </button>`;
}

function renderStage(stage) {
  const inputs = stage.inputs?.length ? stage.inputs.map((item, i) => renderPort(item, i, 'input', stage)).join('') : '<span class="graph-empty">Source stage · no ROS input</span>';
  const nodes = stage.nodes?.length ? stage.nodes.map((node, i) => `<button type="button" class="graph-node" data-stage-select="${stage.id}" data-node-stage="${stage.num}" data-node-name="${escapeHtml(node.name)}" data-node-index="${i}" title="Open stage details for ${escapeHtml(node.name)}"><span class="node-state" aria-hidden="true"></span><span><b>${escapeHtml(node.name)}</b><small>${escapeHtml(node.type || 'ROS node')}</small></span><span class="node-open">↗</span></button>`).join('') : '<span class="graph-empty">No node mapped</span>';
  const outputs = stage.outputs?.length ? stage.outputs.map((item, i) => renderPort(item, i, 'output', stage)).join('') : '<span class="graph-empty">No output mapped</span>';
  return `<article class="whole-stage" data-stage-column="${stage.num}" style="--stage-accent:${stage.color}">
    <header class="whole-stage-head"><span class="whole-stage-index">${String(stage.num).padStart(2,'0')}</span><div><small>${escapeHtml(stage.badge)}</small><h3>${escapeHtml(stage.title)}</h3></div><button type="button" class="stage-jump" data-stage-select="${stage.id}" aria-label="Open details for stage ${stage.num}">↗</button></header>
    <section class="graph-port-group"><h4><span>IN</span> DATA INPUTS</h4>${inputs}</section>
    <section class="graph-node-group"><h4><span>NODE</span> PROCESSING</h4>${nodes}</section>
    <section class="graph-port-group graph-outputs"><h4><span>OUT</span> PUBLISHED DATA</h4>${outputs}</section>
  </article>`;
}

export function mountWholeGraph(container, stages, connections, onSelectStage) {
  if (!container) return null;
  const graphWidth = (stages.length - 1) * 445 + 410;
  const graphHeight = 1180;
  const graphConnections = connections.flatMap(edge => edge.topic.split(/\s+(?:and|&)\s+/i).map((topic, index) => ({ ...edge, topic: topic.trim(), type: edge.type.split(/,\s+/)[index] || edge.type })));
  const stageByNum = new Map(stages.map(stage => [stage.num, stage]));
  const linkDetails = new Map();
  let resizeObserver;
  container.innerHTML = `<section class="whole-graph-panel">
    <header class="whole-graph-toolbar"><div><span class="whole-graph-kicker">ROS 2 MESSAGE MAP · ALL NODES</span><h3>One graph, source to actuators</h3><p>Follow the animated topic wires left to right. Select a wire for its publisher, consumer, and message type.</p></div><div class="whole-graph-actions"><button type="button" data-graph-action="motion" aria-pressed="true">Ⅱ &nbsp; Pause flow</button><button type="button" data-graph-action="start">⟵ &nbsp; Start</button><button type="button" data-graph-action="end">End &nbsp; ⟶</button></div></header>
    <div class="whole-graph-detail" aria-live="polite"><span class="graph-detail-dot"></span><span class="graph-detail-copy">Select an animated connection to inspect the exact data handoff.</span><button type="button" data-graph-action="dismiss" aria-label="Dismiss connection details">×</button></div>
    <div class="whole-graph-scroll" tabindex="0" aria-label="Scrollable left-to-right ROS node graph"><div class="whole-graph-canvas" style="width:${graphWidth}px;height:${graphHeight}px"><svg class="whole-graph-wires" viewBox="0 0 ${graphWidth} ${graphHeight}" preserveAspectRatio="none" aria-label="Animated ROS topic connections"></svg><div class="whole-graph-columns">${stages.map(renderStage).join('')}</div></div></div>
    <footer class="whole-graph-legend"><span><i class="legend-node"></i> Node / process</span><span><i class="legend-in"></i> Input subscription</span><span><i class="legend-out"></i> Published output</span><span><i class="legend-flow"></i> Documented topic handoff</span><small>Layout is horizontally scrollable · node and topic names come from the referenced code map</small></footer>
  </section>`;

  const scroll = container.querySelector('.whole-graph-scroll');
  const canvas = container.querySelector('.whole-graph-canvas');
  const svg = container.querySelector('.whole-graph-wires');
  const detailCopy = container.querySelector('.graph-detail-copy');

  const draw = () => {
    const base = canvas.getBoundingClientRect();
    const paths = graphConnections.map((edge, i) => {
      const from = stageByNum.get(edge.fromStage), to = stageByNum.get(edge.toStage);
      if (!from || !to) return '';
      const outIndex = Number.isInteger(edge.fromOutputIndex) ? edge.fromOutputIndex : findPort(from, edge, 'output');
      const inIndex = Number.isInteger(edge.toInputIndex) ? edge.toInputIndex : findPort(to, edge, 'input');
      const sourcePort = canvas.querySelector(`[data-port="output"][data-stage="${from.num}"][data-index="${outIndex}"]`);
      const targetPort = canvas.querySelector(`[data-port="input"][data-stage="${to.num}"][data-index="${inIndex}"]`);
      const sourceAnchor = exactNodeAnchor(canvas, from, edge.fromNode) || sourcePort;
      const targetAnchor = exactNodeAnchor(canvas, to, edge.toNode) || targetPort;
      if (!sourceAnchor || !targetAnchor) return '';
      const sourceRect = sourceAnchor.getBoundingClientRect(), targetRect = targetAnchor.getBoundingClientRect();
      const x1 = sourceRect.right - base.left, y1 = sourceRect.top + sourceRect.height/2 - base.top;
      const x2 = targetRect.left - base.left, y2 = targetRect.top + targetRect.height/2 - base.top;
      const reach = Math.max(48, Math.min(170, (x2 - x1) * .42));
      const d = `M ${x1} ${y1} C ${x1 + reach} ${y1}, ${x2 - reach} ${y2}, ${x2} ${y2}`;
      const output = from.outputs?.[outIndex] || {};
      const input = to.inputs?.[inIndex] || {};
      const pubNode = edge.fromNode || output.publisher || findNode(from, '');
      const subNode = edge.toNode || input.source || findNode(to, '');
      const messageType = edge.type || output.type || input.type || 'Message type not listed';
      const description = `<b>${escapeHtml(edge.topic)}</b><span>${escapeHtml(pubNode)} → ${escapeHtml(subNode)}</span><small>${escapeHtml(messageType)}</small>`;
      linkDetails.set(`wire-${i}`, description);
      return `<g class="topic-wire" data-wire="wire-${i}" style="--wire-color:${from.color}" tabindex="0" role="button" aria-label="${escapeHtml(`${edge.topic}: ${pubNode} to ${subNode}, ${messageType}`)}"><path class="wire-path" d="${d}" marker-end="url(#wireArrow)"/><path class="wire-hit-area" d="${d}"/><circle class="wire-source" cx="${x1}" cy="${y1}" r="4"/><circle class="wire-target" cx="${x2}" cy="${y2}" r="4"/><circle class="wire-packet" r="4"><animateMotion dur="${Math.max(3, Math.min(8, 3 + (edge.toStage-edge.fromStage)*.42))}s" repeatCount="indefinite" path="${d}"/></circle></g>`;
    }).join('');
    svg.innerHTML = `<defs><filter id="wireGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><marker id="wireArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#78dace"/></marker></defs>${paths}`;
  };

  const chooseWire = wire => {
    const description = linkDetails.get(wire);
    if (description) detailCopy.innerHTML = description;
    container.querySelectorAll('.topic-wire.is-selected').forEach(item => item.classList.remove('is-selected'));
    svg.querySelector(`[data-wire="${wire}"]`)?.classList.add('is-selected');
  };
  svg.addEventListener('click', event => { const wire = event.target.closest('[data-wire]')?.dataset.wire; if (wire) chooseWire(wire); });
  svg.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { const wire = event.target.closest('[data-wire]')?.dataset.wire; if (wire) { event.preventDefault(); chooseWire(wire); } } });
  container.addEventListener('click', event => {
    const stageButton = event.target.closest('[data-stage-select]');
    if (stageButton) { const stage = stages.find(item => item.id === stageButton.dataset.stageSelect); if (stage) onSelectStage?.(stage); return; }
    const action = event.target.closest('[data-graph-action]')?.dataset.graphAction;
    if (action === 'motion') {
      const paused = canvas.classList.toggle('flow-paused');
      if (paused) svg.pauseAnimations?.(); else svg.unpauseAnimations?.();
      const button = container.querySelector('[data-graph-action="motion"]');
      button.setAttribute('aria-pressed', String(!paused)); button.innerHTML = paused ? '▶ &nbsp; Play flow' : 'Ⅱ &nbsp; Pause flow';
    }
    if (action === 'start') scroll.scrollTo({left:0, behavior:'smooth'});
    if (action === 'end') scroll.scrollTo({left:scroll.scrollWidth, behavior:'smooth'});
    if (action === 'dismiss') { detailCopy.textContent='Select an animated connection to inspect the exact data handoff.'; svg.querySelectorAll('.is-selected').forEach(item=>item.classList.remove('is-selected')); }
  });
  resizeObserver = new ResizeObserver(draw);
  resizeObserver.observe(canvas);
  container.querySelectorAll('.graph-port').forEach(port => resizeObserver.observe(port));
  draw();
  return {
    setActiveStage(id) {
      container.querySelectorAll('.whole-stage.is-active').forEach(item => item.classList.remove('is-active'));
      const stage = stages.find(item => item.id === id);
      if (stage) container.querySelector(`[data-stage-column="${stage.num}"]`)?.classList.add('is-active');
    },
    destroy() { resizeObserver?.disconnect(); container.innerHTML=''; }
  };
}

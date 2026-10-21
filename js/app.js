/** Interactive, graph-first documentation for the Perceptron data pipeline. */

import { PIPELINE_STAGES, PIPELINE_TOPIC_CONNECTIONS } from './pipeline-data.js';
import { mountStageStory } from './visualizers/stage-story.js';
import { mountWholeGraph } from './visualizers/whole-graph.js';

const REPOSITORY = 'https://github.com/Priyanshu-choudhary/Perceptron_Ros2_Jetson_local';

class PipelineDocsApp {
  constructor() {
    this.activeStage = PIPELINE_STAGES[0];
    this.activeStory = null;
    this.wholeGraph = mountWholeGraph(document.getElementById('whole-pipeline-graph'), PIPELINE_STAGES, PIPELINE_TOPIC_CONNECTIONS, stage => this.selectStageById(stage.id, false));
    this.wholeGraph?.setActiveStage(this.activeStage.id);
    this.renderPipelineTrack();
    this.setupScrollControls();
    this.renderStageDetail(this.activeStage);
  }

  renderPipelineTrack() {
    const track = document.getElementById('pipeline-track');
    const count = document.getElementById('pipeline-stage-count');
    if (!track) return;
    if (count) count.textContent = `· ${PIPELINE_STAGES.length} stages`;

    track.innerHTML = PIPELINE_STAGES.map((stage, index) => {
      const outgoing = PIPELINE_TOPIC_CONNECTIONS.filter(edge => edge.fromStage === stage.num);
      const connectsToNext = outgoing.some(edge => edge.toStage === stage.num + 1);
      const primaryTopic = stage.outputs?.[0];
      return `
        <div class="stage-stop ${stage.id === this.activeStage.id ? 'is-selected' : ''}" style="--stage-accent:${stage.color}; --stage-glow:${stage.bgGlow}">
          <button class="stage-card" id="card-${stage.id}" type="button" aria-pressed="${stage.id === this.activeStage.id}" aria-controls="stage-detail-container" onclick="window.app.selectStageById('${stage.id}')">
            <span class="stage-card-top"><span class="stage-index">${String(stage.num).padStart(2, '0')}</span><span class="stage-category">${stage.badge}</span></span>
            <span class="stage-title">${stage.title}</span>
            <span class="stage-meta">${stage.nodes.length} node${stage.nodes.length === 1 ? '' : 's'} <i></i> ${stage.subSteps.length} steps</span>
            ${primaryTopic ? `<span class="stage-output-preview"><span>OUTPUT</span><code>${primaryTopic.topic}</code></span>` : ''}
            <span class="stage-open">${stage.id === this.activeStage.id ? 'Expanded ↓' : 'Open stage →'}</span>
          </button>
          <div class="stage-wire ${connectsToNext ? 'is-wired' : 'is-gap'}" aria-hidden="true">${connectsToNext ? '<span></span><b>›</b>' : '<span></span>'}</div>
          ${outgoing.length ? `<div class="stage-links" aria-label="Documented connections from stage ${stage.num}">${outgoing.map(edge => `<span><b>${String(edge.toStage).padStart(2, '0')}</b><code>${edge.topic}</code></span>`).join('')}</div>` : '<div class="stage-links stage-links-empty">No outgoing connection listed</div>'}
          ${index === PIPELINE_STAGES.length - 1 ? '<div class="pipeline-end">END OF DOCUMENTED FLOW</div>' : ''}
        </div>`;
    }).join('');
  }

  setupScrollControls() {
    const track = document.getElementById('pipeline-track');
    document.getElementById('scroll-left')?.addEventListener('click', () => track?.scrollBy({ left: -520, behavior: 'smooth' }));
    document.getElementById('scroll-right')?.addEventListener('click', () => track?.scrollBy({ left: 520, behavior: 'smooth' }));
  }

  selectStageById(id, scrollToCard = true) {
    const stage = PIPELINE_STAGES.find(item => item.id === id);
    if (!stage) return;
    this.activeStage = stage;
    this.wholeGraph?.setActiveStage(stage.id);
    this.renderPipelineTrack();
    this.renderStageDetail(stage);
    if (scrollToCard) document.getElementById(`card-${stage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  renderStageDetail(stage) {
    const container = document.getElementById('stage-detail-container');
    if (!container) return;
    this.activeStory?.destroy();
    this.activeStory = null;

    const inputs = stage.inputs?.length ? stage.inputs.map(input => `
      <article class="flow-item source-item"><span class="flow-item-kind">${input.type || 'Input'}</span><h5>${input.name || input.topic || 'Input data'}</h5><p>From ${input.source || 'source not specified'}</p></article>`).join('') : '<p class="flow-empty">No inputs listed for this stage.</p>';
    const nodes = stage.nodes?.length ? stage.nodes.map(node => `
      <article class="flow-item node-item"><span class="flow-item-kind">${node.type || 'Processing node'}</span><h5>${node.name}</h5><p>${node.role || ''}</p>${node.file ? `<a href="${REPOSITORY}/blob/feature/carla-sim-perception/${node.file}" target="_blank" rel="noreferrer">Open source file ↗</a>` : ''}</article>`).join('') : '<p class="flow-empty">No nodes listed for this stage.</p>';
    const outputs = stage.outputs?.length ? stage.outputs.map(output => `
      <article class="flow-item output-item"><span class="flow-item-kind">PUBLISHED DATA</span><h5><code>${output.topic}</code></h5><p>${output.type || 'Message type not listed'}</p><div class="output-meta"><span>FROM · ${output.publisher || 'Publisher not mapped'}</span><span>RATE · ${output.rate || 'Not listed'}</span><span>TO · ${output.target || 'Receiver not mapped'}</span></div></article>`).join('') : '<p class="flow-empty">No outputs listed for this stage.</p>';
    const steps = stage.subSteps?.map((step, index) => `
      <article class="step-node"><span class="step-number">${step.step}</span><div><h5>${step.title}</h5><p>${step.desc}</p><div class="step-foot"><span>FRAME <b>${step.frame || 'Not listed'}</b></span><span>RATE <b>${step.rate || 'Not listed'}</b></span></div></div>${index < stage.subSteps.length - 1 ? '<span class="step-arrow" aria-hidden="true">→</span>' : ''}</article>`).join('') || '<p class="flow-empty">No processing steps listed.</p>';
    const connections = PIPELINE_TOPIC_CONNECTIONS.filter(edge => edge.fromStage === stage.num || edge.toStage === stage.num);
    const edges = connections.map(edge => `<span class="connection-chip"><b>${String(edge.fromStage).padStart(2, '0')} → ${String(edge.toStage).padStart(2, '0')}</b><code>${edge.topic}</code><small>${edge.type}</small></span>`).join('') || '<span class="flow-empty">No stage-to-stage topic connection listed.</span>';

    container.innerHTML = `
      <div class="expanded-stage" style="--stage-accent:${stage.color};--stage-glow:${stage.bgGlow}">
        <header class="expanded-header"><div><div class="expanded-kicker">STAGE ${String(stage.num).padStart(2, '0')} <span>·</span> ${stage.badge}</div><h2>${stage.title}</h2><p>${stage.summary}</p></div></header>
        <div class="stage-story-mount" id="stage-story-mount"></div>
        <div class="flow-graph" aria-label="Inputs flow through nodes to outputs">
          <section class="flow-lane"><div class="lane-heading"><span>01</span><div><b>INPUTS</b><small>What enters this stage</small></div></div><div class="lane-items">${inputs}</div></section>
          <div class="lane-connector" aria-hidden="true"><span></span><b>›</b></div>
          <section class="flow-lane"><div class="lane-heading"><span>02</span><div><b>NODES / MODULES</b><small>Who handles the data</small></div></div><div class="lane-items">${nodes}</div></section>
          <div class="lane-connector" aria-hidden="true"><span></span><b>›</b></div>
          <section class="flow-lane"><div class="lane-heading"><span>03</span><div><b>OUTPUTS</b><small>Topic · type · rate · target</small></div></div><div class="lane-items">${outputs}</div></section>
        </div>
        <section class="substeps-section"><div class="section-heading"><div><span class="section-index">04</span><h3>Inside this stage</h3></div><span>${stage.subSteps.length} documented steps</span></div><div class="steps-flow">${steps}</div></section>
        <details class="connections-details"><summary>Show connected stage handoffs <span>${connections.length} listed links</span></summary><div class="connections-list">${edges}</div></details>
        ${stage.codeSnippet ? `<details class="code-details"><summary>Inspect implementation snippet <span>from the documented stage notes</span></summary><pre class="code-container"><code>${this.escapeHtml(stage.codeSnippet)}</code></pre></details>` : ''}
        <footer class="stage-disclaimer">This view reflects the stage inputs, outputs, nodes, and links recorded in this documentation. Open a source link to inspect implementation details.</footer>
      </div>`;
    this.activeStory = mountStageStory(document.getElementById('stage-story-mount'), stage);
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new PipelineDocsApp();
});

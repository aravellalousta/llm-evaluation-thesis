/**
 * Evaluation Results tab — Layer 1: Model Comparison
 */

let resultsInitialized = false;
let radarChartInstance = null;

const DIMENSIONS = ['H1a', 'H1b', 'H2', 'H3a', 'H3b'];
const DIMENSION_LABELS = {
    H1a: 'Socratic Restraint',
    H1b: 'Pedagogical Adaptability',
    H2: 'Technical Accuracy',
    H3a: 'Psychological Safety',
    H3b: 'Pedagogical Safety'
};

const SUMMARY_KEYS = ['socratic_consistency', 'adaptability_arc', 'overall_impression'];
const SUMMARY_LABELS = {
    socratic_consistency: 'Socratic Consistency',
    adaptability_arc: 'Adaptability Arc',
    overall_impression: 'Overall Impression'
};

const MODEL_COLORS = {
    'OpenAI GPT-4o':    { border: '#1e5ba8', bg: 'rgba(30, 91, 168, 0.12)' },
    'Gemini 2.5 Flash': { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' }
};

async function initResultsTab() {
    if (resultsInitialized) return;
    resultsInitialized = true;

    const container = document.getElementById('tab-results');
    container.innerHTML = `
        <div class="section-title">Evaluation Results</div>

        <div class="results-layer">
            <div class="layer-header">Layer 1 — Model Comparison</div>
            <div class="layer-description">
                Mean scores per sub-dimension (H1a–H3b) and conversation-level summary metrics,
                averaged across all LLM judge evaluations and split by model.
            </div>
            <div id="results-loading" class="results-loading">Loading evaluation data…</div>
            <div id="results-content" style="display:none;">
                <div class="results-grid">
                    <div class="chart-card">
                        <div class="chart-card-title">Sub-dimension Radar</div>
                        <div class="radar-chart-wrapper">
                            <canvas id="radarChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="chart-card-title">Means &amp; Standard Deviations</div>
                        <div id="statsTableContainer"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        const sessionModelMap = await buildSessionModelMap();
        const evaluations = await loadAllLlmEvaluations(sessionModelMap);
        const stats = aggregateByModel(evaluations);

        renderModelComparisonChart(stats);
        renderModelComparisonTable(stats);

        document.getElementById('results-loading').style.display = 'none';
        document.getElementById('results-content').style.display = '';
    } catch (err) {
        console.error('Failed to load evaluation results:', err);
        document.getElementById('results-loading').textContent = 'Failed to load evaluation data.';
    }
}

async function buildSessionModelMap() {
    const map = {};
    await Promise.all(CONVERSATION_FILES.map(async (file) => {
        try {
            const response = await fetch(`conversations/${file}`);
            if (!response.ok) return;
            const data = await response.json();
            map[data.session_id] = extractModelFromFilename(file);
        } catch { /* skip */ }
    }));
    return map;
}

async function loadAllLlmEvaluations(sessionModelMap) {
    const evaluations = [];
    await Promise.all(Object.keys(sessionModelMap).map(async (sid) => {
        try {
            const response = await fetch(`evaluations-completed/${sid}_llm_judge.json`);
            if (!response.ok) return;
            const data = await response.json();
            data._model = sessionModelMap[sid];
            evaluations.push(data);
        } catch { /* skip */ }
    }));
    return evaluations;
}

function aggregateByModel(evaluations) {
    const models = ['OpenAI GPT-4o', 'Gemini 2.5 Flash'];
    const stats = {};

    for (const model of models) {
        const modelEvals = evaluations.filter(e => e._model === model);

        const dimScores = Object.fromEntries(DIMENSIONS.map(d => [d, []]));
        const summaryScores = Object.fromEntries(SUMMARY_KEYS.map(k => [k, []]));

        for (const ev of modelEvals) {
            for (const turnData of Object.values(ev.turn_evaluations || {})) {
                for (const dim of DIMENSIONS) {
                    if (turnData[dim] != null) dimScores[dim].push(turnData[dim]);
                }
            }
            if (ev.conversation_summary) {
                for (const key of SUMMARY_KEYS) {
                    if (ev.conversation_summary[key] != null) summaryScores[key].push(ev.conversation_summary[key]);
                }
            }
        }

        const dimStats = Object.fromEntries(DIMENSIONS.map(d => [d, computeStats(dimScores[d])]));
        const summaryStats = Object.fromEntries(SUMMARY_KEYS.map(k => [k, computeStats(summaryScores[k])]));
        const allScores = DIMENSIONS.flatMap(d => dimScores[d]);
        const totalMean = computeStats(allScores).mean;

        stats[model] = { dimStats, summaryStats, totalMean, count: modelEvals.length };
    }

    return stats;
}

function computeStats(values) {
    if (!values.length) return { mean: null, sd: null, n: 0 };
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    return { mean: +mean.toFixed(2), sd: +Math.sqrt(variance).toFixed(2), n };
}

function renderModelComparisonChart(stats) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();

    const models = ['OpenAI GPT-4o', 'Gemini 2.5 Flash'];

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: DIMENSIONS.map(d => DIMENSION_LABELS[d]),
            datasets: models.map(model => ({
                label: model,
                data: DIMENSIONS.map(d => stats[model]?.dimStats[d]?.mean ?? 0),
                borderColor: MODEL_COLORS[model].border,
                backgroundColor: MODEL_COLORS[model].bg,
                borderWidth: 2,
                pointBackgroundColor: MODEL_COLORS[model].border,
                pointRadius: 4,
                pointHoverRadius: 6
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    min: 0,
                    max: 5,
                    ticks: { stepSize: 1, font: { size: 11 }, backdropColor: 'transparent' },
                    pointLabels: { font: { size: 12, weight: '600' } },
                    grid: { color: 'rgba(0,0,0,0.08)' },
                    angleLines: { color: 'rgba(0,0,0,0.08)' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 12 }, padding: 20, usePointStyle: true }
                }
            }
        }
    });
}

function renderModelComparisonTable(stats) {
    const container = document.getElementById('statsTableContainer');
    const models = ['OpenAI GPT-4o', 'Gemini 2.5 Flash'];

    // Renders mean+sd cells for a row, colouring the best value green and worst red.
    function meanCells(statsList) {
        const means = statsList.map(s => s?.mean ?? null);
        const valid = means.filter(m => m != null);
        const max = valid.length ? Math.max(...valid) : null;
        const min = valid.length ? Math.min(...valid) : null;
        return statsList.map(s => {
            if (s?.mean == null) return `<td class="mean-cell">—</td><td class="sd-cell">—</td>`;
            let cls = 'mean-cell';
            if (max !== min) {
                if (s.mean === max) cls += ' mean-best';
                else if (s.mean === min) cls += ' mean-worst';
            }
            return `<td class="${cls}">${s.mean}</td><td class="sd-cell">± ${s.sd}</td>`;
        }).join('');
    }

    function totalMeanCells(modelList) {
        const vals = modelList.map(m => stats[m]?.totalMean ?? null);
        const valid = vals.filter(v => v != null);
        const max = valid.length ? Math.max(...valid) : null;
        const min = valid.length ? Math.min(...valid) : null;
        return modelList.map((m, i) => {
            const v = vals[i];
            if (v == null) return `<td class="mean-cell">—</td><td class="sd-cell"></td>`;
            let cls = 'mean-cell';
            if (max !== min) {
                if (v === max) cls += ' mean-best';
                else if (v === min) cls += ' mean-worst';
            }
            return `<td class="${cls}">${v}</td><td class="sd-cell"></td>`;
        }).join('');
    }

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th rowspan="2" class="metric-col">Metric</th>
                    ${models.map(m => `<th colspan="2">${m} <span class="eval-count">(n=${stats[m]?.count ?? 0})</span></th>`).join('')}
                </tr>
                <tr>
                    ${models.map(() => '<th>Mean</th><th>SD</th>').join('')}
                </tr>
            </thead>
            <tbody>
                <tr class="stats-section-row">
                    <td colspan="${1 + models.length * 2}">Sub-dimensions &nbsp;<span class="section-note">turn-level scores</span></td>
                </tr>
    `;

    for (const dim of DIMENSIONS) {
        html += `
            <tr>
                <td><span class="dim-badge">${dim}</span> ${DIMENSION_LABELS[dim]}</td>
                ${meanCells(models.map(m => stats[m]?.dimStats[dim]))}
            </tr>`;
    }

    html += `
        <tr class="stats-section-row">
            <td colspan="${1 + models.length * 2}">Conversation Summary &nbsp;<span class="section-note">conversation-level scores</span></td>
        </tr>`;

    for (const key of SUMMARY_KEYS) {
        html += `
            <tr>
                <td>${SUMMARY_LABELS[key]}</td>
                ${meanCells(models.map(m => stats[m]?.summaryStats[key]))}
            </tr>`;
    }

    html += `
        <tr class="stats-total-row">
            <td>Total Mean <span class="section-note">all sub-dimensions</span></td>
            ${totalMeanCells(models)}
        </tr>
    </tbody></table>`;

    container.innerHTML = html;
}

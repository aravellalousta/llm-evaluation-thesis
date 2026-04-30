/**
 * Evaluation Results tab — Layer 1: Model Comparison
 */

let resultsInitialized = false;
let radarChartInstance = null;
const barChartInstances = {};
const lineChartInstances = {};

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
    'Gemini 2.5 Flash': { border: '#F18F01', bg: 'rgba(241, 143, 1, 0.12)' }
};

async function initResultsTab() {
    if (resultsInitialized) return;
    resultsInitialized = true;

    const container = document.getElementById('tab-results');
    container.innerHTML = `
        <div class="section-title">Evaluation Results</div>

        <div class="results-layer">
            <div class="layer-header">1. Model Comparison (LLM Judge)</div>
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

        <div class="results-layer" id="layer2-section" style="display:none;">
            <div class="layer-header">2. Persona Analysis (LLM Judge)</div>
            <div class="layer-description">
                Mean sub-dimension scores broken down by student persona, compared across both models.
                Each chart shows how GPT-4o and Gemini 2.5 Flash performed for each of the 4 student profiles.
            </div>
            <div class="persona-charts-grid">
                ${['H1a','H1b','H2','H3a','H3b'].map((d, i) => `
                <div class="chart-card">
                    <div class="chart-card-title"><span class="dim-badge">${d}</span> ${{"H1a":"Socratic Restraint","H1b":"Pedagogical Adaptability","H2":"Technical Accuracy","H3a":"Psychological Safety","H3b":"Pedagogical Safety"}[d]}</div>
                    <canvas id="barChart_${d}"></canvas>
                </div>`).join('')}
            </div>
        </div>

        <div class="results-layer" id="layer3-section" style="display:none;">
            <div class="layer-header">3. Scenario Analysis</div>
            <div class="layer-description">
                Mean sub-dimension scores per scenario (1 = Introductory → 4 = Advanced), split by model.
                A declining line as difficulty increases suggests the model struggles to maintain Socratic
                restraint or adaptability under harder content.
            </div>
            <div class="persona-charts-grid">
                ${['H1a','H1b','H2','H3a','H3b'].map(d => `
                <div class="chart-card">
                    <div class="chart-card-title"><span class="dim-badge">${d}</span> ${{"H1a":"Socratic Restraint","H1b":"Pedagogical Adaptability","H2":"Technical Accuracy","H3a":"Psychological Safety","H3b":"Pedagogical Safety"}[d]}</div>
                    <canvas id="lineChart_${d}"></canvas>
                </div>`).join('')}
            </div>
        </div>

        <div class="results-layer" id="layer4-section" style="display:none;">
            <div class="layer-header">4. Human vs. LLM Judge Agreement</div>
            <div class="layer-description">
                Methodological validation: Cohen's Kappa and percentage agreement between human scores
                and LLM judge scores, computed on the 8-conversation human evaluation subset (turn level).
            </div>
            <div id="agreementTableContainer"></div>
            
            <div class="agreement-insight">
                <span class="agreement-insight-icon">&#128270;</span>
                <p>
                    The LLM judge and human evaluator agreed on the same score in roughly half of all cases
                    for most dimensions. For technical accuracy, agreement was very high (89%) but
                    statistically this was expected, since both raters consistently assigned high scores to
                    technically correct responses. These results suggest that automated evaluation is
                    reliable for <strong>objective criteria</strong> but less so for
                    <strong>subjective pedagogical judgements</strong>, which require human interpretation.
                </p>
            </div>
            <div id="agreementBreakdownContainer"></div>
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

        const personaStats = aggregateByModelAndPersona(evaluations);
        renderPersonaAnalysis(personaStats);
        document.getElementById('layer2-section').style.display = '';

        const scenarioStats = aggregateByModelAndScenario(evaluations);
        renderScenarioAnalysis(scenarioStats);
        document.getElementById('layer3-section').style.display = '';

        const agreementData = await fetchAgreementStats();
        renderAgreementTable(agreementData);
        renderAgreementBreakdown(agreementData);
        document.getElementById('layer4-section').style.display = '';
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
            data._scenario = data.scenario_number ?? null;
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

// ── Layer 2: Persona Analysis ──────────────────────────────────────────────

function aggregateByModelAndPersona(evaluations) {
    const models = ['OpenAI GPT-4o', 'Gemini 2.5 Flash'];
    const personas = [1, 2, 3, 4];
    const result = {};

    for (const model of models) {
        result[model] = {};
        for (const persona of personas) {
            const subset = evaluations.filter(e => e._model === model && e.persona_number === persona);
            const dimScores = Object.fromEntries(DIMENSIONS.map(d => [d, []]));

            for (const ev of subset) {
                for (const turnData of Object.values(ev.turn_evaluations || {})) {
                    for (const dim of DIMENSIONS) {
                        if (turnData[dim] != null) dimScores[dim].push(turnData[dim]);
                    }
                }
            }

            result[model][persona] = Object.fromEntries(
                DIMENSIONS.map(d => [d, computeStats(dimScores[d])])
            );
        }
    }

    return result;
}

function renderPersonaAnalysis(personaStats) {
    const models = ['OpenAI GPT-4o', 'Gemini 2.5 Flash'];
    const personas = [1, 2, 3, 4];
    const personaLabels = personas.map(p => PERSONA_NAMES[p] || `Persona ${p}`);

    for (const dim of DIMENSIONS) {
        const canvasId = `barChart_${dim}`;
        const canvas = document.getElementById(canvasId);
        if (!canvas) continue;

        if (barChartInstances[canvasId]) barChartInstances[canvasId].destroy();

        barChartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: personaLabels,
                datasets: models.map(model => ({
                    label: model,
                    data: personas.map(p => personaStats[model]?.[p]?.[dim]?.mean ?? 0),
                    backgroundColor: MODEL_COLORS[model].bg.replace('0.12', '0.75'),
                    borderColor: MODEL_COLORS[model].border,
                    borderWidth: 1.5,
                    borderRadius: 4
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        min: 0,
                        max: 5,
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: {
                        ticks: { font: { size: 11 } },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, padding: 16, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
                        }
                    }
                }
            }
        });
    }
}

// ── Layer 3: Scenario Analysis ─────────────────────────────────────────────

function aggregateByModelAndScenario(evaluations) {
    const models = ['OpenAI GPT-4o', 'Gemini 2.5 Flash'];
    const scenarios = [1, 2, 3, 4];
    const result = {};

    for (const model of models) {
        result[model] = {};
        for (const scenario of scenarios) {
            const subset = evaluations.filter(e => e._model === model && e._scenario === scenario);
            const dimScores = Object.fromEntries(DIMENSIONS.map(d => [d, []]));

            for (const ev of subset) {
                for (const turnData of Object.values(ev.turn_evaluations || {})) {
                    for (const dim of DIMENSIONS) {
                        if (turnData[dim] != null) dimScores[dim].push(turnData[dim]);
                    }
                }
            }

            result[model][scenario] = Object.fromEntries(
                DIMENSIONS.map(d => [d, computeStats(dimScores[d])])
            );
        }
    }

    return result;
}

function renderScenarioAnalysis(scenarioStats) {
    const models = ['OpenAI GPT-4o', 'Gemini 2.5 Flash'];
    const scenarios = [1, 2, 3, 4];
    const scenarioLabels = ['Scenario 1\n(Introductory)', 'Scenario 2\n(Easy)', 'Scenario 3\n(Intermediate)', 'Scenario 4\n(Advanced)'];

    for (const dim of DIMENSIONS) {
        const canvasId = `lineChart_${dim}`;
        const canvas = document.getElementById(canvasId);
        if (!canvas) continue;

        if (lineChartInstances[canvasId]) lineChartInstances[canvasId].destroy();

        lineChartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: scenarioLabels,
                datasets: models.map(model => ({
                    label: model,
                    data: scenarios.map(s => scenarioStats[model]?.[s]?.[dim]?.mean ?? null),
                    borderColor: MODEL_COLORS[model].border,
                    backgroundColor: MODEL_COLORS[model].bg,
                    borderWidth: 2.5,
                    pointBackgroundColor: MODEL_COLORS[model].border,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.3,
                    fill: true
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        min: 3,
                        max: 5,
                        ticks: { stepSize: 0.5, font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: {
                        ticks: { font: { size: 10 } },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, padding: 16, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
                        }
                    }
                }
            }
        });
    }
}

// ── Layer 4: Human vs. LLM Judge Agreement ────────────────────────────────
// Pre-computed by src/core/compute_agreement.py (sklearn quadratic kappa).
// Re-run that script whenever new human evaluations are added.

async function fetchAgreementStats() {
    const res = await fetch('evaluations-completed/agreement_stats.json');
    if (!res.ok) throw new Error('Could not load agreement_stats.json');
    return res.json();
}

function renderAgreementTable(agreementData) {
    const rows = DIMENSIONS.map(dim => {
        const { n, kappa, agreement } = agreementData[dim];
        const kappaStr = kappa !== null ? kappa.toFixed(3) : '—';
        const agreeStr = agreement !== null ? `${agreement}%` : '—';
        return `
        <tr>
            <td><span class="dim-badge">${dim}</span> ${DIMENSION_LABELS[dim]}</td>
            <td class="mean-cell">${n}</td>
            <td class="mean-cell">${kappaStr}</td>
            <td class="mean-cell">${agreeStr}</td>
        </tr>`;
    }).join('');

    document.getElementById('agreementTableContainer').innerHTML = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Sub-dimension</th>
                    <th>Paired turns (n)</th>
                    <th>Cohen's κ (quadratic)</th>
                    <th>% Agreement</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderAgreementBreakdown(agreementData) {
    const seg = (pct, cls) => {
        if (pct <= 0) return '';
        return `<div class="bd-seg ${cls}" style="flex:${pct}">${pct.toFixed(2)}%</div>`;
    };

    const rows = DIMENSIONS.map(dim => {
        const bd = agreementData[dim]?.agreement_breakdown;
        if (!bd) return '';
        const total = bd.exact + bd.off_by_1 + bd.off_by_2_plus;
        const exact = bd.exact / total * 100;
        const off1  = bd.off_by_1 / total * 100;
        const off2  = bd.off_by_2_plus / total * 100;
        return `
        <div class="bd-row">
            <div class="bd-label"><span class="dim-badge">${dim}</span> ${DIMENSION_LABELS[dim]}</div>
            <div class="bd-bar">
                ${seg(exact, 'bd-exact')}
                ${seg(off1,  'bd-off1')}
                ${seg(off2,  'bd-off2')}
            </div>
        </div>`;
    }).join('');

    document.getElementById('agreementBreakdownContainer').innerHTML = `
        <div class="bd-section-title">Score Agreement Breakdown</div>
        <div class="bd-legend">
            <span class="bd-swatch bd-exact"></span>Exact match
            <span class="bd-swatch bd-off1"></span>Off by 1
            <span class="bd-swatch bd-off2"></span>Off by 2 or more
        </div>
        <div class="bd-chart">${rows}</div>`;
}
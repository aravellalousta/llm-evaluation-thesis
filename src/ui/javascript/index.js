/**
 * Switch between homepage tabs
 * @param {'conversations'|'results'} tab
 */
function switchTab(tab) {
    document.getElementById('tab-conversations').style.display = tab === 'conversations' ? '' : 'none';
    document.getElementById('tab-results').style.display = tab === 'results' ? '' : 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add('active');
    if (tab === 'results') initResultsTab();
}

/**
 * Index page JavaScript - Conversation list management and filtering
 */

// Global variable to store all loaded conversations
let allConversations = [];

/**
 * Load all conversations from conversation files
 */
async function loadConversations() {
    try {
        const conversations = [];
        console.log("Attempting to load conversations from files:", CONVERSATION_FILES);
        for (const file of CONVERSATION_FILES) {
            try {
                const response = await fetch(`conversations/${file}`);
                if (!response.ok) continue;

                const data = await response.json();
                const personaNum = data.persona_number || "N/A";
                
                // Extract model from filename
                const model = extractModelFromFilename(file);
                
                conversations.push({
                    persona_number: personaNum,
                    persona_name: PERSONA_NAMES[personaNum] || "Unknown",
                    scenario_number: data.scenario_number || "N/A",
                    session_id: data.session_id || "N/A",
                    model: model
                });
            } catch (err) {
                // File doesn't exist, continue
            }
        }

        if (conversations.length > 0) {
            allConversations = conversations;
            applyFilters();
        } else {
            showEmptyState();
        }
    } catch (err) {
        console.error("Error loading conversations:", err);
        showEmptyState();
    }
}

/**
 * Display conversations in the table
 * @param {Array} conversations - Array of conversation objects to display
 */
async function displayConversations(conversations) {
    const tableBody = document.getElementById("conversations-table");
    
    tableBody.innerHTML = '';
    
    if (conversations.length === 0) {
        showEmptyState();
        return;
    }
    
    for (const conv of conversations) {
        const isEvaluated = await isConversationEvaluated(conv.session_id);
        const isLlmEvaluated = await isLlmConversationEvaluated(conv.session_id);

        const statusBadge = isEvaluated 
            ? '<span class="badge badge-evaluated">Evaluated</span>'
            : '<span class="badge badge-pending">Pending</span>';
        
        const actionButton = isEvaluated
            ? `<button class="btn btn-view-human-evaluation bi bi-person-fill-check" onclick="viewEvaluation('${conv.session_id}', 'human'); return false;">Human Evaluation</button>`
            : `<a href="evaluation_form.html?sessionId=${encodeURIComponent(conv.session_id)}" class="btn btn-view-evaluation bi bi-vector-pen">Evaluate</a>`;

        const llmActionButton = isLlmEvaluated
            ? `<button class="btn btn-view-llm-evaluation bi bi-stars" onclick="viewEvaluation('${conv.session_id}', 'llm'); return false;">LLM Evaluation</button>`
            : `<button class="btn btn-view-llm-evaluation bi bi-stars" disabled>LLM Evaluation</button>`;

        const viewConvButton = `<a href="conversation_viewer.html?session=${encodeURIComponent(conv.session_id)}" class="btn btn-view bi bi-eye">View</a>`;
        
        const row = `
            <tr>
                <td>${conv.session_id}</td>
                <td>${conv.persona_name}</td>
                <td>${conv.scenario_number}</td>
                <td>${conv.model}</td>
                <td>${statusBadge}</td>
                <td>
                    ${viewConvButton}
                </td>
                <td>
                    ${actionButton}
                </td>
                <td>
                    ${llmActionButton}
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    }
}

/**
 * Apply current filter selections to the conversations list
 */
function applyFilters() {
    const personaFilter = document.getElementById('persona-filter').value;
    const scenarioFilter = document.getElementById('scenario-filter').value;
    const modelFilter = document.getElementById('model-filter').value;

    let filteredConversations = allConversations;

    // Apply persona filter
    if (personaFilter) {
        filteredConversations = filteredConversations.filter(conv => 
            conv.persona_number === parseInt(personaFilter)
        );
    }

    // Apply scenario filter
    if (scenarioFilter) {
        filteredConversations = filteredConversations.filter(conv => 
            conv.scenario_number === parseInt(scenarioFilter)
        );
    }

    // Apply model filter
    if (modelFilter) {
        filteredConversations = filteredConversations.filter(conv => 
            conv.model === modelFilter
        );
    }

    displayConversations(filteredConversations);
}

/**
 * Reset all filters to default values
 */
function resetFilters() {
    document.getElementById('persona-filter').value = '';
    document.getElementById('scenario-filter').value = '';
    document.getElementById('model-filter').value = '';
    applyFilters();
}

/**
 * Display empty state message
 */
function showEmptyState() {
    const tableBody = document.getElementById("conversations-table");
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">
                No conversations found. Run simulations to generate conversations.
            </td>
        </tr>
    `;
}

/**
 * Check if a conversation has been evaluated (human)
 * @param {string} sessionId - The session ID to check
 * @returns {boolean} True if evaluated, false otherwise
 */
async function isConversationEvaluated(sessionId) {
    if (localStorage.getItem(`evaluation_${sessionId}`) !== null) return true;
    try {
        const response = await fetch(`evaluations-completed/evaluation_${sessionId}.json`, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Check if a conversation has been evaluated by the LLM judge
 * @param {string} sessionId - The session ID to check
 * @returns {boolean} True if an LLM evaluation file exists, false otherwise
 */
async function isLlmConversationEvaluated(sessionId) {
    try {
        const response = await fetch(`evaluations-completed/${sessionId}_llm_judge.json`, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Load and display evaluation in a modal
 * @param {string} sessionId - The session ID for the evaluation
 * @param {'human'|'llm'} type - Which evaluation to load
 */
async function viewEvaluation(sessionId, type = 'human') {
    try {
        let evaluationData = null;

        if (type === 'llm') {
            const response = await fetch(`evaluations-completed/${sessionId}_llm_judge.json`);
            if (!response.ok) {
                alert('LLM evaluation file not found for this session.');
                return;
            }
            evaluationData = await response.json();
            evaluationData.evaluator = 'Claude Sonnet 4.6';
        } else {
            // First try localStorage
            const storageKey = `evaluation_${sessionId}`;
            const cachedData = localStorage.getItem(storageKey);
            if (cachedData) {
                evaluationData = JSON.parse(cachedData);
                evaluationData.evaluator = 'Aravella Lousta';   
            } else {
                // Try to load from file
                const response = await fetch(`evaluations-completed/evaluation_${sessionId}.json`);
                if (!response.ok) {
                    alert('Evaluation file not found for this session.');
                    return;
                }
                evaluationData = await response.json();
                evaluationData.evaluator = 'Aravella Lousta';
            }
        }

        // Load conversation data for this session
        const conversationData = await loadConversationBySessionId(sessionId);

        displayEvaluationModal(evaluationData, conversationData);
    } catch (error) {
        console.error('Error loading evaluation:', error);
        alert('Failed to load evaluation data.');
    }
}

/**
 * Load conversation by session ID from the conversation files
 * @param {string} sessionId - The session ID to search for
 * @returns {Object|null} The conversation data or null if not found
 */
async function loadConversationBySessionId(sessionId) {
    for (const file of CONVERSATION_FILES) {
        try {
            const response = await fetch(`conversations/${file}`);
            if (!response.ok) continue;

            const data = await response.json();
            if (data.session_id === sessionId) {
                return data;
            }
        } catch (err) {
            continue;
        }
    }

    return null;
}

/**
 * Display evaluation in a read-only modal
 * @param {Object} evaluationData - The evaluation data
 * @param {Object} conversationData - The conversation data
 */
function displayEvaluationModal(evaluationData, conversationData) {
    // Create modal HTML
    const modalHtml = `
        <div id="evaluationModal" class="eval-modal" onclick="closeEvaluationModal(event)">
            <div class="eval-modal-content" onclick="event.stopPropagation()">
                <div class="eval-modal-header">
                    <h2>Evaluation Details</h2>
                    <button class="eval-modal-close" onclick="closeEvaluationModal()">×</button>
                </div>
                <div class="eval-modal-body">
                    <div class="eval-info-section">
                        <div class="eval-info-item">
                            <strong>Session ID:</strong>
                            <span>${evaluationData.session_id}</span>
                        </div>
                        <div class="eval-info-item">
                            <strong>Evaluated At:</strong>
                            <span>${new Date(evaluationData.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="eval-info-item">
                            <strong>Evaluated By:</strong>
                            <span>${evaluationData.evaluator}</span>
                        </div>
                    </div>
                    
                    <div id="evaluationTurnsContainer" class="eval-turns-container"></div>
                </div>
                <div class="eval-modal-footer">
                    <button class="btn btn-primary" onclick="closeEvaluationModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if present
    const existingModal = document.getElementById('evaluationModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Load rubric data to display dimension names
    loadRubricForDisplay(evaluationData, conversationData);
}

/**
 * Load rubric data and prepare for display
 * @param {Object} evaluationData - The evaluation data
 * @param {Object} conversationData - The conversation data
 */
async function loadRubricForDisplay(evaluationData, conversationData) {
    try {
        const response = await fetch('rubric/evaluation_rubric.json');
        if (!response.ok) {
            console.error('Failed to load rubric');
            return;
        }

        const rubricFile = await response.json();
        const dimensions = rubricFile.rubric.dimensions || [];

        const rubricMap = {};
        dimensions.forEach(dim => {
            rubricMap[dim.id] = {
                category: dim.category,
                name: dim.name,
                question: dim.question
            };
        });

        renderEvaluationTurns(evaluationData, rubricMap, conversationData);
    } catch (error) {
        console.error('Error loading rubric:', error);
    }
}

function renderConversationSummary(container, summary) {
    const section = document.createElement('div');
    section.className = 'eval-summary-section';

    const heading = document.createElement('div');
    heading.className = 'eval-summary-heading';
    heading.textContent = 'Conversation Summary';
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'eval-summary-grid';

    Object.entries(SUMMARY_META).forEach(([key, meta]) => {
        const score = summary[key];
        const description = meta.descriptions[score] || '';

        const card = document.createElement('div');
        card.className = 'eval-summary-card';
        card.innerHTML = `
            <div class="eval-summary-title">${meta.title}</div>
            <div class="eval-summary-score">${score}</div>
            <div class="eval-summary-description">${description}</div>
        `;
        grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
}

/**
 * Render evaluation turns in the modal
 * @param {Object} evaluationData - The evaluation data
 * @param {Object} rubricMap - Map of dimension IDs to dimension data
 * @param {Object} conversationData - The conversation data
 */
function renderEvaluationTurns(evaluationData, rubricMap, conversationData) {
    const container = document.getElementById('evaluationTurnsContainer');
    container.innerHTML = '';

    // Render conversation summary at the top for LLM evaluations
    if (evaluationData.conversation_summary) {
        renderConversationSummary(container, evaluationData.conversation_summary);
    }

    const turnEvaluations = evaluationData.turn_evaluations || {};
    const turns = conversationData && conversationData.turns ? conversationData.turns : [];

    Object.entries(turnEvaluations).forEach(([turnIndex, turnData]) => {
        const turnNumber = parseInt(turnIndex) + 1;
        const turnHtml = document.createElement('div');
        turnHtml.className = 'eval-turn-section';
        turnHtml.innerHTML = `<h3>Turn ${turnNumber}</h3>`;

        // Add conversation text if available
        const studentIndex = turnIndex * 2;
        const tutorIndex = turnIndex * 2 + 1;

        const studentTurn = turns[studentIndex] || {};
        const tutorTurn = turns[tutorIndex] || {};

        if (studentTurn.text || tutorTurn.text) {
            const conversationDiv = document.createElement('div');
            conversationDiv.className = 'eval-conversation-display';

            if (studentTurn.text) {
                const studentMsg = document.createElement('div');
                studentMsg.className = 'eval-message student-message';
                studentMsg.innerHTML = `
                    <div class="eval-message-header">Student</div>
                    <div class="eval-message-text">${escapeHtml(studentTurn.text)}</div>
                `;
                conversationDiv.appendChild(studentMsg);
            }

            if (tutorTurn.text) {
                const tutorMsg = document.createElement('div');
                tutorMsg.className = 'eval-message tutor-message';
                tutorMsg.innerHTML = `
                    <div class="eval-message-header">Tutor</div>
                    <div class="eval-message-text">${escapeHtml(tutorTurn.text)}</div>
                `;
                conversationDiv.appendChild(tutorMsg);
            }

            turnHtml.appendChild(conversationDiv);
        }

        // Add a divider between conversation and dimensions
        if (studentTurn.text || tutorTurn.text) {
            const divider = document.createElement('div');
            divider.className = 'eval-section-divider';
            turnHtml.appendChild(divider);
        }

        // Add dimension scores
        Object.entries(turnData).forEach(([dimensionId, score]) => {
            const dimension = rubricMap[dimensionId];
            const scoreLabels = {
                '1': 'Poor',
                '2': 'Fair',
                '3': 'Good',
                '4': 'Very Good',
                '5': 'Excellent'
            };

            const row = document.createElement('div');
            row.className = 'eval-dimension-row';
            row.innerHTML = `
                <div class="eval-dimension-info">
                    <div class="eval-dim-header">
                        <span class="eval-dim-id">${dimensionId}</span>
                        <span class="eval-dim-category">${dimension ? dimension.category : 'N/A'}</span>
                    </div>
                    <div class="eval-dim-name">${dimension ? dimension.name : 'Unknown Dimension'}</div>
                </div>
                <div class="eval-score">
                    <span class="eval-score-number">${score}</span>
                    <span class="eval-score-label">${scoreLabels[score] || 'N/A'}</span>
                </div>
            `;
            turnHtml.appendChild(row);
        });

        container.appendChild(turnHtml);
    });
}

/**
 * Escape HTML special characters
 * @param {string} text - The text to escape
 * @returns {string} The escaped HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Close the evaluation modal
 * @param {Event} event - The click event
 */
function closeEvaluationModal(event) {
    // Close if clicking outside or on close button
    if (!event || event.target.id === 'evaluationModal' || event.target.classList.contains('eval-modal-close')) {
        const modal = document.getElementById('evaluationModal');
        if (modal) {
            modal.remove();
        }
    }
}

/**
 * Initialize when page loads
 */
window.addEventListener("DOMContentLoaded", loadConversations);

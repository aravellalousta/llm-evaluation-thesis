// State management
let rubricData = null;
let conversationData = null;
let currentTurnIndex = 0;
let evaluations = {}; // Store evaluations for all turns
let sessionId = null;

// Load rubric data from JSON file
async function loadRubricData() {
    try {
        const response = await fetch('rubric/evaluation_rubric.json');
        if (!response.ok) {
            throw new Error('Failed to load rubric file');
        }

        const rubricFile = await response.json();
        const dimensions = rubricFile.rubric.dimensions || [];

        // Convert dimensions array to object format
        rubricData = {};
        dimensions.forEach(dim => {
            rubricData[dim.id] = {
                category: dim.category,
                name: dim.name,
                question: dim.question,
                anchors: dim.anchors
            };
        });

        return true;
    } catch (error) {
        console.error('Error loading rubric:', error);
        return false;
    }
}

// Get Session ID from URL parameters
function getSessionId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('sessionId');
    
    if (!id) {
        throw new Error('Session ID is required. Please access this page from the evaluation link.');
    }
    
    return id.trim();
}

// Initialize the page
async function initialize() {
    try {
        // Check if we just completed an evaluation and the page reloaded
        if (sessionStorage.getItem('justCompletedEvaluation')) {
            sessionStorage.removeItem('justCompletedEvaluation');
            // Redirect to homepage immediately
            window.location.replace('index.html');
            return;
        }

        // Load rubric data first
        const rubricLoaded = await loadRubricData();
        if (!rubricLoaded) {
            displayError('Failed to load rubric data. Please refresh the page.');
            return;
        }

        sessionId = getSessionId();
        document.getElementById('sessionId').textContent = sessionId;

        // Load conversation
        conversationData = await loadConversation(sessionId);
        
        if (!conversationData) {
            displayError('Conversation not found. Please check the Session ID.');
            return;
        }

        // Update header info
        const personaNum = conversationData.persona_number || "N/A";
        const personaNames = {
            1: "Persona 1 (Disengaged Student)",
            2: "Persona 2 (Motivated Student)",
            3: "Persona 3 (Frustrated Student)",
            4: "Persona 4 (Wrong Answers)"
        };
        document.getElementById('personaName').textContent = personaNames[personaNum] || "Unknown";

        // Calculate turns (each turn = student + tutor pair)
        const turns = conversationData.turns || [];
        const totalTurns = Math.floor(turns.length / 2);
        document.getElementById('totalTurns').textContent = totalTurns;

        // Initialize evaluations object
        for (let i = 0; i < totalTurns; i++) {
            evaluations[i] = {};
        }

        // Create form sections
        createFormSections();

        // Display first turn
        displayTurn(0);

        // Setup event listeners
        document.getElementById('btnPrev').addEventListener('click', previousTurn);
        document.getElementById('btnNext').addEventListener('click', nextTurn);
        document.getElementById('btnSubmit').addEventListener('click', submitAllEvaluations);
        document.getElementById('evaluationForm').addEventListener('submit', (e) => e.preventDefault());

    } catch (error) {
        displayError('Failed to initialize: ' + error.message);
    }
}

// Load conversation JSON
async function loadConversation(sessionId) {
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

// Create form sections for each dimension
function createFormSections() {
    const form = document.getElementById('evaluationForm');
    form.innerHTML = '';

    Object.entries(rubricData).forEach(([dimensionId, dimension]) => {
        const section = createDimensionSection(dimensionId, dimension);
        form.appendChild(section);
    });
}

// Create HTML for a dimension section
function createDimensionSection(dimensionId, dimension) {
    const section = document.createElement('div');
    section.className = 'dimension-section';

    let anchorsHtml = '<div class="anchors">';
    Object.entries(dimension.anchors).forEach(([score, text]) => {
        anchorsHtml += `
            <div class="anchor-item">
                <span class="anchor-score">${score}</span>
                <span class="anchor-text">${text}</span>
            </div>
        `;
    });
    anchorsHtml += '</div>';

    let selectedValue = '';
    if (evaluations[currentTurnIndex] && evaluations[currentTurnIndex][dimensionId]) {
        selectedValue = evaluations[currentTurnIndex][dimensionId];
    }

    section.innerHTML = `
        <div class="dimension-header">
            <div class="dimension-id">${dimensionId}</div>
            <div class="dimension-category">${dimension.category}</div>
            <div class="dimension-name">${dimension.name}</div>
            <div class="dimension-question">${dimension.question}</div>
        </div>

        <div class="scale-container">
            <label class="scale-label">Rating:</label>
            <div class="scale-options">
                <div class="scale-option">
                    <input type="radio" id="${dimensionId}_1" name="${dimensionId}" value="1" ${selectedValue === '1' ? 'checked' : ''}>
                    <label for="${dimensionId}_1">1<br><small>Poor</small></label>
                </div>
                <div class="scale-option">
                    <input type="radio" id="${dimensionId}_2" name="${dimensionId}" value="2" ${selectedValue === '2' ? 'checked' : ''}>
                    <label for="${dimensionId}_2">2<br><small>Fair</small></label>
                </div>
                <div class="scale-option">
                    <input type="radio" id="${dimensionId}_3" name="${dimensionId}" value="3" ${selectedValue === '3' ? 'checked' : ''}>
                    <label for="${dimensionId}_3">3<br><small>Good</small></label>
                </div>
                <div class="scale-option">
                    <input type="radio" id="${dimensionId}_4" name="${dimensionId}" value="4" ${selectedValue === '4' ? 'checked' : ''}>
                    <label for="${dimensionId}_4">4<br><small>Very Good</small></label>
                </div>
                <div class="scale-option">
                    <input type="radio" id="${dimensionId}_5" name="${dimensionId}" value="5" ${selectedValue === '5' ? 'checked' : ''}>
                    <label for="${dimensionId}_5">5<br><small>Excellent</small></label>
                </div>
            </div>
        </div>

        ${anchorsHtml}
    `;

    return section;
}

// Display a specific turn
function displayTurn(turnIndex) {
    currentTurnIndex = turnIndex;
    const turns = conversationData.turns || [];
    const totalTurns = Math.floor(turns.length / 2);

    // Update turn counter
    document.getElementById('currentTurn').textContent = turnIndex + 1;
    const progress = Math.round(((turnIndex + 1) / totalTurns) * 100);
    document.getElementById('progressText').textContent = progress + '%';

    // Get student and tutor messages for this turn
    const studentIndex = turnIndex * 2;
    const tutorIndex = turnIndex * 2 + 1;

    const studentTurn = turns[studentIndex] || {};
    const tutorTurn = turns[tutorIndex] || {};

    // Build conversation display
    let html = '';
    
    if (studentTurn.text) {
        html += `
            <div class="message student-message">
                <div class="message-header">Student</div>
                <div class="message-text">${escapeHtml(studentTurn.text)}</div>
            </div>
        `;
    }

    if (tutorTurn.text) {
        html += `
            <div class="message tutor-message">
                <div class="message-header">Tutor</div>
                <div class="message-text">${escapeHtml(tutorTurn.text)}</div>
            </div>
        `;
    }

    document.getElementById('conversationDisplay').innerHTML = html || '<div class="loading">No messages found for this turn.</div>';

    // Recreate form with saved values
    createFormSections();

    // Update button states
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnSubmit = document.getElementById('btnSubmit');

    btnPrev.disabled = turnIndex === 0;

    if (turnIndex === totalTurns - 1) {
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'block';
    } else {
        btnNext.style.display = 'block';
        btnSubmit.style.display = 'none';
    }

    // Clear messages
    document.getElementById('errorMessage').classList.remove('show');
}

// Save current turn evaluations
function saveCurrentEvaluation() {
    const formData = new FormData(document.getElementById('evaluationForm'));
    const evals = evaluations[currentTurnIndex];

    Object.keys(rubricData).forEach(dimensionId => {
        const value = formData.get(dimensionId);
        if (value) {
            evals[dimensionId] = value;
        }
    });

    return Object.keys(rubricData).every(dim => evals[dim]);
}

// Navigate to previous turn
function previousTurn() {
    if (currentTurnIndex > 0) {
        if (saveCurrentEvaluation()) {
            displayTurn(currentTurnIndex - 1);
        } else {
            displayError('Please complete all dimensions before moving to the previous turn.');
        }
    }
}

// Navigate to next turn
function nextTurn() {
    if (saveCurrentEvaluation()) {
        const totalTurns = Math.floor((conversationData.turns || []).length / 2);
        if (currentTurnIndex < totalTurns - 1) {
            displayTurn(currentTurnIndex + 1);
        }
    } else {
        displayError('Please complete all dimensions before moving to the next turn.');
    }
}

// Submit all evaluations
function submitAllEvaluations() {
    if (!saveCurrentEvaluation()) {
        displayError('Please complete all dimensions before submitting.');
        return;
    }

    const responseData = {
        session_id: sessionId,
        persona_number: conversationData.persona_number,
        turn_evaluations: evaluations
    };

    // Download evaluation as JSON file
    downloadEvaluation(responseData);
}

// Download evaluation as JSON file
function downloadEvaluation(responseData) {
    try {
        // Create JSON string
        const jsonString = JSON.stringify(responseData, null, 2);
        
        // Create Blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create temporary download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generate filename using session ID instead of timestamp
        const filename = `evaluation_${sessionId}.json`;
        
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        // Also save to sessionStorage/localStorage for immediate access in the evaluation view
        saveEvaluationData(responseData);
        
        // Show completion modal
        showCompletionModal(responseData);
        
    } catch (error) {
        console.error('Error downloading evaluation:', error);
        displayError('Failed to download evaluation: ' + error.message);
    }
}

// Save evaluation data for retrieval
function saveEvaluationData(responseData) {
    try {
        // Save with session ID as key
        const storageKey = `evaluation_${sessionId}`;
        localStorage.setItem(storageKey, JSON.stringify(responseData));
    } catch (error) {
        console.error('Error saving evaluation to localStorage:', error);
        // Silently fail - download is already saving the file
    }
}

// Show completion modal
function showCompletionModal(responseData) {
    const modal = document.getElementById('completionModal');
    const totalTurns = Math.floor((conversationData.turns || []).length / 2);
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    document.getElementById('modalSessionId').textContent = sessionId;
    document.getElementById('modalTotalTurns').textContent = totalTurns;
    document.getElementById('modalTimestamp').textContent = timeString;

    modal.style.display = 'flex';

    // Save to localStorage to track completion status
    const evaluatedSessions = JSON.parse(localStorage.getItem('evaluatedSessions') || '{}');
    evaluatedSessions[sessionId] = {
        completedAt: new Date().toISOString()
    };
    localStorage.setItem('evaluatedSessions', JSON.stringify(evaluatedSessions));

    // Mark that we just completed so if page reloads, we redirect immediately
    sessionStorage.setItem('justCompletedEvaluation', 'true');

    // Try to automatically redirect to homepage after 3 seconds (fallback to manual button)
    setTimeout(() => {
        try {
            window.location.replace('index.html');
        } catch (e) {
            console.error('Auto-redirect failed:', e);
        }
    }, 3000);
}

// Utility: escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility: display error
function displayError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initialize);
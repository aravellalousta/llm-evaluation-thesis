function getSessionIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("session");
}

async function loadConversation() {
    const sessionId = getSessionIdFromURL();
    
    if (!sessionId) {
        showError("No session ID provided in URL");
        return;
    }

    try {
        // Try to load conversation from conversations folder
        // Since we don't know the exact filename, try loading all and match by session_id
        const conversationData = await findConversationBySessionId(sessionId);
        
        if (!conversationData) {
            showError("Conversation not found");
            return;
        }
        displayConversation(conversationData);
    } catch (err) {
        console.error("Error loading conversation:", err);
        showError("Error loading conversation. Check console for details.");
    }
}

async function findConversationBySessionId(sessionId) {
    for (const file of CONVERSATION_FILES) {
        try {
            const response = await fetch(`conversations/${file}`);
            if (!response.ok) continue;

            const data = await response.json();
            if (data.session_id === sessionId) {
                return data;
            }
        } catch (err) {
            // File doesn't exist or can't be read, continue
        }
    }

    return null;
}

function displayConversation(conversation) {
    const personaNum = conversation.persona_number || "N/A";
    const personaName = PERSONA_NAMES[personaNum] || "Unknown";
    const sessionId = conversation.session_id || "N/A";
    const turns = conversation.turns || [];
    const modelName = conversation.model_used || "Unknown";

    // Update header
    document.getElementById("persona-name").textContent = personaName;
    document.getElementById("session-id").textContent = sessionId;
    document.getElementById("model-name").textContent = modelName;
    
    // Calculate number of turns (divide by 2 since each turn has student + tutor)
    const turnCount = Math.floor(turns.length / 2);
    document.getElementById("total-turns").textContent = turnCount;

    // Build conversation HTML
    let conversationHTML = "";
    let turnNumber = 1;

    for (const turn of turns) {
        const role = turn.role || "unknown";
        const text = turn.text || "";

        if (role.toLowerCase() === "student") {
            conversationHTML += `
                <div class="turn">
                    <div class="turn-number">Turn ${turnNumber}</div>
                    <div class="message student-message">
                        <div class="message-header">Student</div>
                        <div class="message-text">${escapeHtml(text)}</div>
                    </div>
            `;
        } else if (role.toLowerCase() === "tutor") {
            conversationHTML += `
                    <div class="message tutor-message">
                        <div class="message-header">Tutor</div>
                        <div class="message-text">${escapeHtml(text)}</div>
                    </div>
                </div>
            `;
            turnNumber++;
        }
    }

    // Close any unclosed turn div
    if (turns.length > 0 && turns[turns.length - 1].role.toLowerCase() === "student") {
        conversationHTML += "</div>";
    }

    document.getElementById("conversation-content").innerHTML = conversationHTML;
}

function showError(message) {
    document.getElementById("conversation-content").innerHTML = `
        <div class="error-message">
            <strong>Error:</strong> ${escapeHtml(message)}
        </div>
    `;
    document.getElementById("persona-name").textContent = "Error";
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Load conversation when page loads
window.addEventListener("DOMContentLoaded", loadConversation);
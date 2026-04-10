/**
 * Shared configuration and utilities for conversation management
 */

// List of all conversation files
const CONVERSATION_FILES = [
    "conversation_per_1_sc_1_gemini.json",
    "conversation_per_2_sc_1_gemini.json",
    "conversation_per_3_sc_1_gemini.json",
    "conversation_per_4_sc_1_gemini.json",
    "conversation_per_1_sc_2_gemini.json",
    "conversation_per_2_sc_2_gemini.json",
    "conversation_per_3_sc_2_gemini.json",
    "conversation_per_4_sc_2_gemini.json",
    "conversation_per_1_sc_3_gemini.json",
    "conversation_per_2_sc_3_gemini.json",
    "conversation_per_3_sc_3_gemini.json",
    "conversation_per_4_sc_3_gemini.json",
    "conversation_per_1_sc_4_gemini.json",
    "conversation_per_2_sc_4_gemini.json",
    "conversation_per_3_sc_4_gemini.json",
    "conversation_per_4_sc_4_gemini.json",
    "conversation_per_1_sc_1_openai.json",
    "conversation_per_1_sc_2_openai.json",
    "conversation_per_1_sc_3_openai.json",
    "conversation_per_1_sc_4_openai.json",
    "conversation_per_2_sc_1_openai.json",
    "conversation_per_2_sc_2_openai.json",
    "conversation_per_2_sc_3_openai.json",
    "conversation_per_2_sc_4_openai.json",
    "conversation_per_3_sc_1_openai.json",
    "conversation_per_3_sc_2_openai.json",
    "conversation_per_3_sc_3_openai.json",
    "conversation_per_3_sc_4_openai.json",
    "conversation_per_4_sc_1_openai.json",
    "conversation_per_4_sc_2_openai.json",
    "conversation_per_4_sc_3_openai.json",
    "conversation_per_4_sc_4_openai.json"
];

// Persona name mapping
const PERSONA_NAMES = {
    1: "Disengaged",
    2: "Motivated",
    3: "Frustrated",
    4: "Wrong Answers"
};

/**
 * Extract model type from filename
 * @param {string} filename - The conversation filename
 * @returns {string} The model name
 */
function extractModelFromFilename(filename) {
    if (filename.includes('_openai')) return 'OpenAI GPT-4o';
    if (filename.includes('_gemini')) return 'Gemini 2.5 Flash';
    return 'Unknown';
}

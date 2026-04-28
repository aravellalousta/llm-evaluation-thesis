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

// Conversation summary dimension metadata for LLM judge evaluations
const SUMMARY_META = {
    socratic_consistency: {
        title: 'Socratic Consistency',
        descriptions: {
            1: 'The tutor consistently failed to maintain restraint across the conversation. Direct answers or explanations dominated.',
            2: 'The tutor frequently struggled to maintain restraint, with multiple turns where the Socratic method was partially or fully broken.',
            3: 'The tutor maintained restraint in most turns but had one or two noticeable lapses where answers or strong hints were provided.',
            4: 'The tutor maintained restraint in almost all turns with one minor lapse that did not significantly compromise the method.',
            5: 'The tutor never revealed an answer, sub-answer, or leading hint across any turn. Restraint was airtight throughout.'
        }
    },
    adaptability_arc: {
        title: 'Adaptability Arc',
        descriptions: {
            1: "The tutor showed no meaningful adaptation. The same style of question was repeated across turns with no evidence of reading or responding to the student's state.",
            2: "The tutor showed minimal adaptation. Questions followed a similar pattern regardless of how the student responded or what state they were in.",
            3: 'The tutor showed some adaptation but it was inconsistent or surface-level — for example, adjusting tone without meaningfully changing the depth or angle of questioning.',
            4: "The tutor showed clear adaptation in most turns but was occasionally one beat behind the student's state or repeated a similar approach where a change was warranted.",
            5: "The tutor demonstrably adjusted its questioning style, depth, and tone across turns in direct response to the student's evolving state. The arc of the conversation reflects genuine pedagogical sensitivity."
        }
    },
    overall_impression: {
        title: 'Overall Impression',
        descriptions: {
            1: 'An ineffective tutoring conversation. The tutor failed to uphold the core principles of Socratic teaching in this interaction.',
            2: 'A weak tutoring conversation. The tutor struggled to maintain the Socratic method or adapt to the student in a way that would have supported meaningful learning.',
            3: 'An acceptable tutoring conversation. The tutor followed the Socratic method in general but with inconsistencies in restraint, adaptability, or tone that limited its effectiveness.',
            4: 'A strong tutoring conversation with minor gaps. The tutor performed well overall but had isolated moments where a better response was possible.',
            5: 'An exemplary Socratic tutoring conversation. The tutor guided effectively without revealing, adapted sensitively to the student, and maintained appropriate tone and accuracy throughout.'
        }
    }
};

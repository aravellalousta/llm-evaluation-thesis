"""
Simulates tutoring conversations between a Socratic tutor and all student personas.
Saves conversations to JSON files and visualizes them.
"""

import json
import uuid
import webbrowser
from pathlib import Path
from config import (
    MODEL_NAME,
    TUTOR_SYSTEM_PROMPT,
    PERSONA_1_PROMPT,
    PERSONA_2_PROMPT,
    PERSONA_3_PROMPT,
    PERSONA_4_PROMPT,
    SCENARIOS,
)
from conversation_manager import ConversationManager

# Mapping of persona numbers to prompts and names
PERSONAS = {
    1: {"prompt": PERSONA_1_PROMPT, "name": "Persona 1"},
    2: {"prompt": PERSONA_2_PROMPT, "name": "Persona 2"},
    3: {"prompt": PERSONA_3_PROMPT, "name": "Persona 3"},
    4: {"prompt": PERSONA_4_PROMPT, "name": "Persona 4"},
}


def simulate_tutoring_session(
    persona_num: int, num_turns: int = 8, scenario_num: int = 1
) -> dict:
    """
    Simulate a tutoring conversation between a tutor and a student persona.

    Args:
        persona_num: The persona number (1-4)
        num_turns: Number of conversation turns (default: 8)
        scenario_num: Which scenario opening to use (1-4)

    Returns:
        Dictionary with conversation data
    """
    persona_data = PERSONAS.get(persona_num)
    if not persona_data:
        raise ValueError(f"Invalid persona number: {persona_num}")

    # Initialize the two conversation managers
    tutor = ConversationManager(MODEL_NAME, TUTOR_SYSTEM_PROMPT)
    student = ConversationManager(MODEL_NAME, persona_data["prompt"])

    # Get the opening message from the scenario
    opening_message = SCENARIOS.get(scenario_num, SCENARIOS[1])

    # List to store the full conversation
    conversation = []

    # First message from student (opening)
    conversation.append({"role": "student", "text": opening_message})

    # Run the conversation for the specified number of turns
    for turn in range(num_turns):
        # TUTOR responds to the student
        tutor_response = tutor.send_message(
            opening_message if turn == 0 else student_response
        )
        conversation.append({"role": "tutor", "text": tutor_response})

        # STUDENT responds to the tutor
        student_response = student.send_message(tutor_response)
        conversation.append({"role": "student", "text": student_response})

    return {
        "session_id": str(uuid.uuid4()),
        "persona_number": persona_num,
        "persona_name": persona_data["name"],
        "scenario_number": scenario_num,
        "tutor_system_prompt": TUTOR_SYSTEM_PROMPT,
        "student_system_prompt": persona_data["prompt"],
        "turns": conversation,
    }


def save_conversation_to_json(data: dict, persona_num: int, scenario_num: int) -> Path:
    """
    Save the conversation to a JSON file with proper naming.

    Args:
        data: Conversation data dictionary
        persona_num: The persona number
        scenario_num: The scenario number

    Returns:
        Path to the saved file
    """
    # Create conversations folder if it doesn't exist
    conversations_dir = Path("conversations")
    conversations_dir.mkdir(exist_ok=True)

    # Create filename with convention: conversation_per_[persona]_sc_[scenario].json
    filename = f"conversation_per_{persona_num}_sc_{scenario_num}.json"
    output_path = conversations_dir / filename

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    return output_path


def main():
    """Run all tutoring session simulations for Scenario 1 with all personas."""
    print("Starting tutoring session simulations...")
    print()

    all_conversations = []
    saved_files = []

    # Run simulations for all personas with Scenario 1
    for persona_num in [1, 2, 3, 4]:
        print(f"Running simulation for {PERSONAS[persona_num]['name']}...")

        # Simulate the session
        conversation_data = simulate_tutoring_session(
            persona_num=persona_num, num_turns=8, scenario_num=1
        )

        # Save to JSON
        saved_path = save_conversation_to_json(
            conversation_data, persona_num, scenario_num=1
        )
        print(f"  ✓ Saved to {saved_path}")

        all_conversations.append(conversation_data)
        saved_files.append(saved_path)

    print()
    print(f"All {len(all_conversations)} conversations completed!")
    print("Opening conversation viewer...")
    print()

    # Create HTML visualization with all conversations
    create_multi_conversation_viewer(all_conversations)


def create_multi_conversation_viewer(conversations: list):
    """
    Create an HTML viewer with tabs for each conversation.

    Args:
        conversations: List of conversation data dictionaries
    """
    # Build tabs HTML
    tabs_html = ""
    tab_content_html = ""

    for idx, conv in enumerate(conversations):
        persona_name = conv.get("persona_name", "Unknown")
        persona_num = conv.get("persona_number", idx + 1)
        tab_id = f"tab-{persona_num}"

        # Tab button
        active_class = "active" if idx == 0 else ""
        tabs_html += f'<button class="tab-button {active_class}" data-tab="{tab_id}">{persona_name}</button>'

        # Tab content
        turns = conv.get("turns", [])
        turns_html = ""
        turn_number = 1

        for turn in turns:
            role = turn.get("role", "unknown").lower()
            text = turn.get("text", "")

            if role == "student":
                turns_html += f"""
            <div class="turn">
                <div class="turn-number">Turn {turn_number}</div>
                <div class="message student-message">
                    <div class="message-header">📚 Student</div>
                    <div class="message-text">{text}</div>
                </div>
            """

            elif role == "tutor":
                turns_html += f"""
                <div class="message tutor-message">
                    <div class="message-header">🎓 Tutor</div>
                    <div class="message-text">{text}</div>
                </div>
            </div>
            """
                turn_number += 1

        tab_content_html += f"""
        <div class="tab-content {active_class}" id="{tab_id}">
            <div class="tab-header">
                <h2>{persona_name}</h2>
                <div class="tab-meta">
                    <div><strong>Session ID:</strong> {conv.get('session_id', 'N/A')}</div>
                    <div><strong>Total Turns:</strong> {turn_number - 1}</div>
                </div>
            </div>
            <div class="conversation">
                {turns_html}
            </div>
        </div>
        """

    # Create HTML document
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conversation Visualization - All Personas</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}

        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }}

        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}

        .header h1 {{
            font-size: 32px;
            margin-bottom: 10px;
        }}

        .tabs {{
            display: flex;
            background: #f5f5f5;
            border-bottom: 2px solid #ddd;
            flex-wrap: wrap;
        }}

        .tab-button {{
            flex: 1;
            padding: 15px 20px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
            min-width: 150px;
        }}

        .tab-button:hover {{
            background: #f0f0f0;
            color: #667eea;
        }}

        .tab-button.active {{
            color: #667eea;
            border-bottom-color: #667eea;
            background: white;
        }}

        .tab-content {{
            display: none;
            animation: fadeIn 0.3s ease-out;
        }}

        .tab-content.active {{
            display: block;
        }}

        @keyframes fadeIn {{
            from {{
                opacity: 0;
            }}
            to {{
                opacity: 1;
            }}
        }}

        .tab-header {{
            padding: 30px 40px 20px;
            border-bottom: 2px solid #f0f0f0;
        }}

        .tab-header h2 {{
            font-size: 24px;
            color: #333;
            margin-bottom: 15px;
        }}

        .tab-meta {{
            display: flex;
            gap: 30px;
            font-size: 13px;
            color: #666;
        }}

        .conversation {{
            padding: 40px;
        }}

        .turn {{
            margin-bottom: 30px;
        }}

        .turn-number {{
            font-size: 18px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}

        .message {{
            margin-bottom: 15px;
            padding: 20px;
            border-radius: 8px;
            animation: slideIn 0.3s ease-out;
        }}

        @keyframes slideIn {{
            from {{
                opacity: 0;
                transform: translateY(10px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}

        .student-message {{
            background: #f0f4ff;
            border-left: 4px solid #667eea;
        }}

        .tutor-message {{
            background: #fff8f0;
            border-left: 4px solid #ff9800;
        }}

        .message-header {{
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .student-message .message-header {{
            color: #667eea;
        }}

        .tutor-message .message-header {{
            color: #ff9800;
        }}

        .message-text {{
            font-size: 15px;
            line-height: 1.6;
            color: #333;
            word-wrap: break-word;
        }}

        .footer {{
            background: #f5f5f5;
            padding: 20px 40px;
            text-align: center;
            font-size: 13px;
            color: #666;
            border-top: 1px solid #ddd;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Tutoring Conversation Visualization</h1>
            <p>Scenario 1 - All Personas</p>
        </div>

        <div class="tabs">
            {tabs_html}
        </div>

        {tab_content_html}

        <div class="footer">
            Generated from conversation simulations
        </div>
    </div>

    <script>
        function switchTab(tabId) {{
            // Hide all tabs
            const allTabs = document.querySelectorAll('.tab-content');
            allTabs.forEach(tab => tab.classList.remove('active'));

            // Remove active from all buttons
            const allButtons = document.querySelectorAll('.tab-button');
            allButtons.forEach(btn => btn.classList.remove('active'));

            // Show selected tab
            document.getElementById(tabId).classList.add('active');
            document.querySelector(`[data-tab="${{tabId}}"]`).classList.add('active');
        }}

        // Add click handlers to tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {{
            button.addEventListener('click', (e) => {{
                const tabId = e.target.getAttribute('data-tab');
                switchTab(tabId);
            }});
        }});
    </script>
</body>
</html>"""

    # Write to HTML file
    output_path = Path("conversation_viewer.html")
    with open(output_path, "w") as f:
        f.write(html_content)

    print(f"✓ HTML viewer created at: {output_path.absolute()}")

    # Open in default browser
    webbrowser.open(f"file://{output_path.absolute()}")


if __name__ == "__main__":
    main()

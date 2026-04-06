"""
Visualizes conversation output JSON files as an HTML file with tabs.
Supports viewing single or multiple conversations.
"""

import json
import webbrowser
from pathlib import Path
from typing import List


def load_conversations(json_files: List[str] = None) -> List[dict]:
    """
    Load conversations from JSON files.

    Args:
        json_files: List of JSON file paths. If None, loads all from /conversations folder.

    Returns:
        List of conversation data dictionaries
    """
    conversations = []

    if json_files is None:
        # Load all conversations from /conversations folder
        conversations_dir = Path("conversations")
        if not conversations_dir.exists():
            print("No conversations folder found.")
            return []

        json_files = sorted(conversations_dir.glob("*.json"))

    for json_file in json_files:
        json_path = Path(json_file)

        if not json_path.exists():
            print(f"Warning: File not found: {json_file}")
            continue

        with open(json_path, "r") as f:
            data = json.load(f)
            conversations.append(data)

    return conversations


def create_html_visualization(
    conversations: List[dict], output_html: str = "conversation_viewer.html"
):
    """
    Create an HTML viewer with tabs for each conversation.

    Args:
        conversations: List of conversation data dictionaries
        output_html: Path to the output HTML file
    """
    if not conversations:
        print("No conversations to visualize.")
        return

    # Build tabs HTML
    tabs_html = ""
    tab_content_html = ""

    for idx, conv in enumerate(conversations):
        persona_name = conv.get("persona_name", f"Conversation {idx + 1}")
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

        # Close any unclosed turn div if the last message was from student
        if turns and turns[-1].get("role", "").lower() == "student":
            turns_html += "\n            </div>"

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
    <title>Conversation Visualization</title>
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
            <h1>Conversation Visualization</h1>
        </div>

        <div class="tabs">
            {tabs_html}
        </div>

        {tab_content_html}

        <div class="footer">
            Generated from conversation JSON files
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
    output_path = Path(output_html)
    with open(output_path, "w") as f:
        f.write(html_content)

    print(f"✓ HTML visualization created: {output_path.absolute()}")
    print(f"Opening in browser...")

    # Open in default browser
    webbrowser.open(f"file://{output_path.absolute()}")


def main():
    """Run the visualization."""
    conversations = load_conversations()
    if conversations:
        create_html_visualization(conversations)
    else:
        print("No conversations found to visualize.")


if __name__ == "__main__":
    main()

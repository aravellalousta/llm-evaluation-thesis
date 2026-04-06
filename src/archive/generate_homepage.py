"""
Generates a homepage listing all conversations with metadata.
"""

import json
import webbrowser
from pathlib import Path
from datetime import datetime


def load_all_conversations() -> list:
    """
    Load all conversations from the /conversations folder.

    Returns:
        List of conversation metadata dictionaries
    """
    conversations_dir = Path("conversations")
    if not conversations_dir.exists():
        return []

    conversations = []
    for json_file in sorted(conversations_dir.glob("*.json")):
        try:
            with open(json_file, "r") as f:
                data = json.load(f)
                # Extract metadata
                conversations.append(
                    {
                        "file": json_file.name,
                        "file_path": str(json_file),
                        "persona_number": data.get("persona_number", "N/A"),
                        "persona_name": data.get("persona_name", "Unknown"),
                        "scenario_number": data.get("scenario_number", "N/A"),
                        "session_id": data.get("session_id", "N/A"),
                        "turns_count": len(data.get("turns", []))
                        // 2,  # Divide by 2 since each turn has 2 messages
                    }
                )
        except (json.JSONDecodeError, IOError):
            continue

    return conversations


def create_homepage(output_html: str = "index.html"):
    """
    Create an HTML homepage listing all conversations.

    Args:
        output_html: Path to the output HTML file
    """
    conversations = load_all_conversations()

    # Build table rows
    table_rows = ""
    if conversations:
        for conv in conversations:
            persona_num = conv["persona_number"]
            scenario_num = conv["scenario_number"]
            file_name = conv["file"]

            table_rows += f"""
        <tr>
            <td>{conv["persona_name"]}</td>
            <td>{scenario_num}</td>
            <td>{conv["turns_count"]}</td>
            <td>{conv["session_id"][:8]}...</td>
            <td>
                <button class="btn btn-view" onclick="viewConversation('conversations/{file_name}')">
                    View
                </button>
            </td>
            <td>
                <button class="btn btn-evaluate" onclick="startEvaluation('{file_name}')">
                    Evaluate
                </button>
            </td>
        </tr>
            """
    else:
        table_rows = """
        <tr>
            <td colspan="6" class="empty-state">No conversations found. Run simulations to generate conversations.</td>
        </tr>
        """

    # Create HTML document
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Tutoring Evaluation - Conversations</title>
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
            max-width: 1200px;
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
            border-bottom: 4px solid #ff9800;
        }}

        .header h1 {{
            font-size: 36px;
            margin-bottom: 10px;
        }}

        .header p {{
            font-size: 16px;
            opacity: 0.9;
        }}

        .content {{
            padding: 40px;
        }}

        .section-title {{
            font-size: 24px;
            color: #333;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }}

        .section-subtitle {{
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
        }}

        .table-wrapper {{
            overflow-x: auto;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            background: white;
        }}

        thead {{
            background: #f5f5f5;
            border-bottom: 2px solid #ddd;
        }}

        th {{
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #333;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        td {{
            padding: 15px;
            border-bottom: 1px solid #eee;
            color: #555;
            font-size: 14px;
        }}

        tbody tr:hover {{
            background: #f9f9f9;
            transition: background 0.2s ease;
        }}

        .empty-state {{
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 30px !important;
        }}

        .btn {{
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .btn-view {{
            background: #667eea;
            color: white;
            margin-right: 8px;
        }}

        .btn-view:hover {{
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }}

        .btn-evaluate {{
            background: #ff9800;
            color: white;
        }}

        .btn-evaluate:hover {{
            background: #f57c00;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
        }}

        .btn:active {{
            transform: translateY(0);
        }}

        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}

        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}

        .stat-number {{
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 5px;
        }}

        .stat-label {{
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.9;
        }}

        .footer {{
            background: #f5f5f5;
            padding: 20px 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>LLM Python Tutoring Evaluation</h1>
            <p>Conversation Management & Analysis</p>
        </div>

        <div class="content">

            <div class="section-title">
                📋 Conversation List
            </div>
            <div class="section-subtitle">
                View and evaluate tutoring conversations. Click "View" to inspect a conversation or "Evaluate" to start the evaluation process.
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Student Type</th>
                            <th>Scenario</th>
                            <th>Turns</th>
                            <th>Session ID</th>
                            <th colspan="2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {table_rows}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            Aravella Lousta • LLM Evaluation System
        </div>
    </div>

    <script>
        function viewConversation(filePath) {{
            console.log('Would open conversation viewer with:', filePath);
            // Open the conversation viewer with this specific conversation
            window.open('conversation_viewer.html?file=' + encodeURIComponent(filePath), '_blank');
        }}

        function startEvaluation(fileName) {{
            console.log('Starting evaluation for:', fileName);
            // Placeholder for evaluation functionality
            alert('Evaluation process started for: ' + fileName);
        }}
    </script>
</body>
</html>"""

    # Write to HTML file
    output_path = Path(output_html)
    with open(output_path, "w") as f:
        f.write(html_content)

    print(f"✓ Homepage created: {output_path.absolute()}")
    print(f"Opening in browser...")

    # Open in default browser
    webbrowser.open(f"file://{output_path.absolute()}")


def main():
    """Run the homepage generation."""
    create_homepage()


if __name__ == "__main__":
    main()

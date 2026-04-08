"""
Simple Flask API for the LLM Evaluation System
"""

from flask import Flask, jsonify, send_from_directory
from pathlib import Path
import os

app = Flask(__name__, static_folder="ui", static_url_path="")

# Set up paths
BASE_DIR = Path(__file__).parent
UI_DIR = BASE_DIR / "ui"
CONVERSATIONS_DIR = UI_DIR / "conversations"


@app.route("/")
def index():
    """Serve the main index.html"""
    return send_from_directory(UI_DIR, "index.html")


@app.route("/api/conversations", methods=["GET"])
def get_conversations():
    """Return list of conversation files in the conversations directory"""
    try:
        # Check multiple possible locations for conversations
        directory = UI_DIR / "conversations"  # src/ui/conversations

        conversation_files = []
        conversations_dir = None

        # Find the first directory that exists with JSON files
        if directory.exists() and directory.is_dir():
            json_files = list(directory.glob("*.json"))
            if json_files:
                conversation_files = sorted([f.name for f in json_files])
                conversations_dir = directory

        # If no files found in any directory, just return empty list
        return jsonify(
            {
                "files": conversation_files,
                "count": len(conversation_files),
                "success": True,
                "directory": (
                    str(conversations_dir) if conversations_dir else "Not found"
                ),
            }
        )
    except Exception as e:
        return (
            jsonify({"files": [], "count": 0, "success": False, "error": str(e)}),
            500,
        )


@app.route("/<path:filename>")
def serve_file(filename):
    """Serve static files from the ui directory"""
    try:
        return send_from_directory(UI_DIR, filename)
    except:
        return "File not found", 404

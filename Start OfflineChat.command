#!/bin/zsh

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "Starting OfflineChat..."
echo "Project folder: $APP_DIR"
echo

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 was not found. Please install Python 3 first."
  read -r "?Press Enter to close this window."
  exit 1
fi

if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

if ! python -c "import streamlit, ollama" >/dev/null 2>&1; then
  echo "Installing required Python packages..."
  python -m pip install --upgrade pip
  python -m pip install -r requirements.txt
fi

echo
echo "Opening the app at http://localhost:8501"
echo "Keep this Terminal window open while using the chat UI."
echo

python -m streamlit run app.py --server.port 8501

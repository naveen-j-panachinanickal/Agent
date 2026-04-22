# OfflineChat

A local Streamlit web app for chatting with Ollama using `gemma4:e2b`.

## Easiest Way To Run

Double-click:

```text
Start OfflineChat.command
```

The launcher will:

- Create `.venv` if needed
- Install `streamlit` and `ollama` if missing
- Start the Streamlit web app
- Open the local browser URL

Keep the Terminal window open while using the app.

Use the `Model` selector in the sidebar to switch between installed Ollama models, or choose `Custom model...` to type another model name.
Open `Model Manager` in the sidebar to view installed models, pull new models, or delete models you no longer need.
The top-right sun/moon icon switches between Light and Dark mode.
Use `Stop app and Ollama` in the sidebar when you want to shut everything down.
Use `Attach files` above the chat box to send text, code, PDF, Word, Excel, XML, CSV, JSON, or image files with your next message.

## Manual Run

```bash
cd /Users/mantt/Documents/Agent
source .venv/bin/activate
python -m streamlit run app.py
```

## Saved Chats

Multiple chats are stored locally in:

```text
chats.json
```

App settings, including the selected theme, are stored locally in:

```text
settings.json
```

The older single-chat backup may still exist as:

```text
chat_history.json
```

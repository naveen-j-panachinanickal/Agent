import json
import os
import subprocess
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path

import ollama
import streamlit as st


DEFAULT_MODEL = "gemma4:e2b"
APP_DIR = Path(__file__).parent
CHAT_HISTORY_FILE = APP_DIR / "chat_history.json"
CHAT_STORE_FILE = APP_DIR / "chats.json"
SETTINGS_FILE = APP_DIR / "settings.json"
OLLAMA_LOG_FILE = APP_DIR / "ollama_server.log"
OLLAMA_PID_FILE = APP_DIR / "ollama_server.pid"


def read_field(item, field: str):
    if isinstance(item, dict):
        return item.get(field)
    return getattr(item, field, None)


def validate_messages(messages) -> list[dict[str, str]]:
    if not isinstance(messages, list):
        return []

    valid_messages = []
    for message in messages:
        if not isinstance(message, dict):
            continue

        role = message.get("role")
        content = message.get("content")
        if role in {"user", "assistant"} and isinstance(content, str):
            valid_messages.append({"role": role, "content": content})

    return valid_messages


def new_chat(title: str = "New chat", messages=None) -> dict:
    now = datetime.now().isoformat(timespec="seconds")
    return {
        "id": str(uuid.uuid4()),
        "title": title,
        "created_at": now,
        "updated_at": now,
        "messages": validate_messages(messages or []),
    }


def load_legacy_chat_history() -> list[dict[str, str]]:
    if not CHAT_HISTORY_FILE.exists():
        return []

    try:
        with CHAT_HISTORY_FILE.open("r", encoding="utf-8") as file:
            return validate_messages(json.load(file))

    except (OSError, json.JSONDecodeError):
        return []


def load_chat_store() -> dict:
    if CHAT_STORE_FILE.exists():
        try:
            with CHAT_STORE_FILE.open("r", encoding="utf-8") as file:
                store = json.load(file)

            chats = []
            for chat in store.get("chats", []):
                if not isinstance(chat, dict):
                    continue
                messages = validate_messages(chat.get("messages", []))
                chat_id = chat.get("id") or str(uuid.uuid4())
                title = chat.get("title") or "New chat"
                created_at = chat.get("created_at") or datetime.now().isoformat(timespec="seconds")
                updated_at = chat.get("updated_at") or created_at
                chats.append(
                    {
                        "id": chat_id,
                        "title": title,
                        "created_at": created_at,
                        "updated_at": updated_at,
                        "messages": messages,
                    }
                )

            if chats:
                active_chat_id = store.get("active_chat_id")
                if active_chat_id not in {chat["id"] for chat in chats}:
                    active_chat_id = chats[0]["id"]
                return {"active_chat_id": active_chat_id, "chats": chats}

        except (OSError, json.JSONDecodeError):
            pass

    legacy_messages = load_legacy_chat_history()
    first_chat = new_chat("First chat", legacy_messages)
    store = {"active_chat_id": first_chat["id"], "chats": [first_chat]}
    save_chat_store(store)
    return store


def save_chat_store(store: dict) -> None:
    with CHAT_STORE_FILE.open("w", encoding="utf-8") as file:
        json.dump(store, file, ensure_ascii=False, indent=2)


def load_settings() -> dict:
    defaults = {"theme": "Light"}
    if not SETTINGS_FILE.exists():
        return defaults

    try:
        with SETTINGS_FILE.open("r", encoding="utf-8") as file:
            settings = json.load(file)

        theme = settings.get("theme")
        if theme not in {"Light", "Dark"}:
            theme = defaults["theme"]

        return {"theme": theme}

    except (OSError, json.JSONDecodeError):
        return defaults


def save_settings(settings: dict) -> None:
    with SETTINGS_FILE.open("w", encoding="utf-8") as file:
        json.dump(settings, file, ensure_ascii=False, indent=2)


def sync_theme_from_query_params() -> None:
    theme = st.query_params.get("theme")
    if theme in {"Light", "Dark"} and theme != st.session_state.settings["theme"]:
        st.session_state.settings["theme"] = theme
        save_settings(st.session_state.settings)


def apply_theme(theme: str) -> None:
    if theme == "Dark":
        colors = {
            "bg": "#111318",
            "sidebar": "#181c23",
            "surface": "#202631",
            "border": "#3a4352",
            "text": "#f2f4f8",
            "muted": "#aab3c2",
            "primary": "#4ea8de",
            "user": "#214e63",
            "assistant": "#262b36",
            "input": "#151922",
            "toggle_bg": "#f7f5f0",
            "toggle_text": "#111318",
        }
    else:
        colors = {
            "bg": "#f7f5f0",
            "sidebar": "#eef3f6",
            "surface": "#ffffff",
            "border": "#d7dce2",
            "text": "#1f2933",
            "muted": "#64748b",
            "primary": "#247ba0",
            "user": "#d9edf7",
            "assistant": "#ffffff",
            "input": "#ffffff",
            "toggle_bg": "#111318",
            "toggle_text": "#ffffff",
        }

    next_theme = "Light" if theme == "Dark" else "Dark"
    toggle_icon = "☀" if theme == "Dark" else "☾"

    st.markdown(
        f"""
        <style>
            .stApp {{
                background: {colors["bg"]};
                color: {colors["text"]};
            }}

            [data-testid="stSidebar"] {{
                background: {colors["sidebar"]};
                border-right: 1px solid {colors["border"]};
            }}

            [data-testid="stSidebar"] *,
            [data-testid="stAppViewContainer"] * {{
                color: {colors["text"]};
            }}

            [data-testid="stHeader"] {{
                background: transparent;
            }}

            [data-testid="stChatMessage"] {{
                background: {colors["assistant"]};
                border: 1px solid {colors["border"]};
                border-radius: 8px;
                padding: 0.65rem;
                margin-bottom: 0.75rem;
            }}

            [data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) {{
                background: {colors["user"]};
            }}

            [data-testid="stTextInput"] input,
            [data-testid="stSelectbox"] div,
            [data-testid="stChatInput"] textarea {{
                background: {colors["input"]};
                color: {colors["text"]};
                border-color: {colors["border"]};
            }}

            [data-testid="stCaptionContainer"],
            .stMarkdown small {{
                color: {colors["muted"]};
            }}

            div.stButton > button,
            [data-testid="stFormSubmitButton"] button {{
                border-radius: 8px;
                border-color: {colors["border"]};
            }}

            div.stButton > button[kind="primary"],
            [data-testid="stFormSubmitButton"] button[kind="primary"] {{
                background: {colors["primary"]};
                border-color: {colors["primary"]};
                color: #ffffff;
            }}

            code {{
                background: {colors["surface"]};
                border: 1px solid {colors["border"]};
                border-radius: 6px;
            }}

            .theme-toggle {{
                position: fixed;
                top: 0.75rem;
                right: 1rem;
                z-index: 100000;
                width: 2.4rem;
                height: 2.4rem;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                background: {colors["toggle_bg"]};
                color: {colors["toggle_text"]} !important;
                border: 1px solid {colors["border"]};
                text-decoration: none;
                font-size: 1.2rem;
                line-height: 1;
                box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
            }}

            .theme-toggle:hover {{
                border-color: {colors["primary"]};
                transform: translateY(-1px);
            }}
        </style>
        <a class="theme-toggle" href="?theme={next_theme}" title="Switch theme">
            {toggle_icon}
        </a>
        """,
        unsafe_allow_html=True,
    )


def get_active_chat() -> dict:
    active_chat_id = st.session_state.chat_store["active_chat_id"]
    for chat in st.session_state.chat_store["chats"]:
        if chat["id"] == active_chat_id:
            return chat

    chat = st.session_state.chat_store["chats"][0]
    st.session_state.chat_store["active_chat_id"] = chat["id"]
    return chat


def save_current_store() -> None:
    save_chat_store(st.session_state.chat_store)


def create_chat() -> None:
    chat = new_chat()
    st.session_state.chat_store["chats"].insert(0, chat)
    st.session_state.chat_store["active_chat_id"] = chat["id"]
    save_current_store()


def delete_active_chat() -> None:
    active_chat_id = st.session_state.chat_store["active_chat_id"]
    chats = [
        chat
        for chat in st.session_state.chat_store["chats"]
        if chat["id"] != active_chat_id
    ]

    if not chats:
        chats = [new_chat()]

    st.session_state.chat_store["chats"] = chats
    st.session_state.chat_store["active_chat_id"] = chats[0]["id"]
    save_current_store()


def rename_active_chat(title: str) -> None:
    clean_title = title.strip() or "New chat"
    chat = get_active_chat()
    chat["title"] = clean_title
    chat["updated_at"] = datetime.now().isoformat(timespec="seconds")
    save_current_store()


def maybe_auto_title_chat(chat: dict, prompt: str) -> None:
    if chat["title"] != "New chat":
        return

    title = " ".join(prompt.strip().split())
    chat["title"] = title[:40] or "New chat"


def start_ollama_server() -> tuple[bool, str]:
    try:
        with OLLAMA_LOG_FILE.open("ab") as log_file:
            process = subprocess.Popen(
                ["ollama", "serve"],
                stdout=log_file,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        OLLAMA_PID_FILE.write_text(str(process.pid), encoding="utf-8")
        return True, "Starting Ollama..."

    except FileNotFoundError:
        return False, "The `ollama` command was not found. Install Ollama first."
    except Exception as exc:
        return False, f"Could not start Ollama: {exc}"


def stop_started_ollama_server() -> None:
    if OLLAMA_PID_FILE.exists():
        try:
            pid = int(OLLAMA_PID_FILE.read_text(encoding="utf-8").strip())
            os.kill(pid, 15)
        except (OSError, ValueError):
            pass
        finally:
            OLLAMA_PID_FILE.unlink(missing_ok=True)

    subprocess.run(
        ["pkill", "-f", "ollama serve"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )


def unload_model(model: str) -> None:
    try:
        ollama.generate(model=model, keep_alive=0)
    except Exception:
        pass


def stop_app_soon() -> None:
    def shutdown() -> None:
        time.sleep(1)
        os._exit(0)

    threading.Thread(target=shutdown, daemon=True).start()


@st.cache_data(ttl=5, show_spinner=False)
def get_ollama_status(model: str) -> tuple[bool, bool, str, list[str]]:
    try:
        models_response = ollama.list()
        model_items = read_field(models_response, "models") or []
        models = [
            read_field(item, "name") or read_field(item, "model")
            for item in model_items
        ]
        models = [name for name in models if name]
        return True, model in models, "Ollama is running", models

    except Exception as exc:
        return False, False, str(exc), []


def init_state() -> None:
    if "chat_store" not in st.session_state:
        st.session_state.chat_store = load_chat_store()
    if "settings" not in st.session_state:
        st.session_state.settings = load_settings()


def reset_chat() -> None:
    chat = get_active_chat()
    chat["messages"] = []
    chat["updated_at"] = datetime.now().isoformat(timespec="seconds")
    save_current_store()


def stream_response(model: str, messages: list[dict[str, str]]):
    try:
        response_stream = ollama.chat(
            model=model,
            messages=messages,
            stream=True,
        )

        for chunk in response_stream:
            text = chunk.get("message", {}).get("content", "")
            if text:
                yield text

    except ollama.ResponseError as exc:
        yield (
            f"\n\n**Ollama error:** {exc.error}\n\n"
            f"Make sure the `{model}` model is available with:\n\n"
            f"```bash\nollama pull {model}\n```"
        )
    except Exception as exc:
        yield (
            "\n\n**Connection error:** I could not reach Ollama.\n\n"
            "Make sure Ollama is running on your laptop, then try again:\n\n"
            "```bash\nollama serve\n```\n\n"
            f"Details: `{exc}`"
        )


def main() -> None:
    st.set_page_config(
        page_title="OfflineChat",
        page_icon=":material/chat:",
        layout="centered",
    )

    init_state()
    sync_theme_from_query_params()
    apply_theme(st.session_state.settings["theme"])

    with st.sidebar:
        st.title("OfflineChat")
        model = st.text_input("Model", value=DEFAULT_MODEL).strip() or DEFAULT_MODEL

        is_running, has_model, status_message, available_models = get_ollama_status(model)

        st.subheader("Status")
        if is_running:
            st.success("Ollama is running")
            if has_model:
                st.info(f"Model ready: `{model}`")
            else:
                st.warning(f"`{model}` was not found locally")
                if available_models:
                    st.caption("Available models:")
                    st.code("\n".join(available_models), language="text")
                st.code(f"ollama pull {model}", language="bash")
        else:
            st.error("Ollama is not reachable")
            st.caption(status_message)
            if st.button("Start Ollama", type="primary", use_container_width=True):
                started, message = start_ollama_server()
                if started:
                    st.success(message)
                    time.sleep(2)
                    get_ollama_status.clear()
                    st.rerun()
                else:
                    st.error(message)

        if st.button("Refresh status", use_container_width=True):
            get_ollama_status.clear()
            st.rerun()

        st.divider()
        st.subheader("Chats")

        if st.button("New chat", type="primary", use_container_width=True):
            create_chat()
            st.rerun()

        chats = st.session_state.chat_store["chats"]
        chat_ids = [chat["id"] for chat in chats]
        active_chat = get_active_chat()
        active_index = chat_ids.index(active_chat["id"])

        selected_chat_id = st.selectbox(
            "Open chat",
            options=chat_ids,
            index=active_index,
            format_func=lambda chat_id: next(
                chat["title"] for chat in chats if chat["id"] == chat_id
            ),
        )
        if selected_chat_id != st.session_state.chat_store["active_chat_id"]:
            st.session_state.chat_store["active_chat_id"] = selected_chat_id
            save_current_store()
            st.rerun()

        active_chat = get_active_chat()
        with st.form("rename_chat"):
            new_title = st.text_input("Chat name", value=active_chat["title"])
            rename_submitted = st.form_submit_button(
                "Rename chat",
                use_container_width=True,
            )
            if rename_submitted:
                rename_active_chat(new_title)
                st.rerun()

        st.button("Clear this chat", on_click=reset_chat, use_container_width=True)
        if st.button("Delete this chat", use_container_width=True):
            delete_active_chat()
            st.rerun()

        st.divider()
        st.caption(f"Chats saved to `{CHAT_STORE_FILE.name}`")
        st.caption("OfflineChat local AI chat")
        st.code("streamlit run app.py", language="bash")

        st.divider()
        if st.button("Stop app and Ollama", type="primary", use_container_width=True):
            save_current_store()
            unload_model(model)
            stop_started_ollama_server()
            st.success("Stopping the chat UI and Ollama now. You can close this tab.")
            stop_app_soon()
            st.stop()

    active_chat = get_active_chat()
    messages = active_chat["messages"]

    st.title("Chat")
    st.caption(f"`{active_chat['title']}` using local Ollama model: `{model}`")

    for message in messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    prompt = st.chat_input("Message your local model")

    if not prompt:
        return

    user_message = {"role": "user", "content": prompt}
    messages.append(user_message)
    maybe_auto_title_chat(active_chat, prompt)
    active_chat["updated_at"] = datetime.now().isoformat(timespec="seconds")
    save_current_store()

    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        placeholder = st.empty()
        full_response = ""

        for chunk in stream_response(model, messages):
            full_response += chunk
            placeholder.markdown(full_response + "▌")

        placeholder.markdown(full_response)

    messages.append({"role": "assistant", "content": full_response})
    active_chat["updated_at"] = datetime.now().isoformat(timespec="seconds")
    save_current_store()


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parent
DB_PATH = ROOT_DIR / "site.db"
HOST = "127.0.0.1"
PORT = 8000


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_contact(name: str, email: str, message: str) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO contacts (name, email, message, created_at) VALUES (?, ?, ?, ?)",
            (name, email, message, datetime.now(timezone.utc).isoformat(timespec="seconds")),
        )
        conn.commit()


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_POST(self) -> None:
        if self.path != "/api/contact":
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            self._send_json({"ok": False, "message": "Request body is required."}, status=HTTPStatus.BAD_REQUEST)
            return

        try:
            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json({"ok": False, "message": "Invalid JSON body."}, status=HTTPStatus.BAD_REQUEST)
            return

        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip()
        message = str(payload.get("message", "")).strip()

        if len(name) < 3:
            self._send_json({"ok": False, "message": "الاسم يجب أن يكون 3 أحرف أو أكثر."}, status=HTTPStatus.BAD_REQUEST)
            return
        if "@" not in email or "." not in email:
            self._send_json({"ok": False, "message": "البريد الإلكتروني غير صحيح."}, status=HTTPStatus.BAD_REQUEST)
            return
        if len(message) < 10:
            self._send_json({"ok": False, "message": "الرسالة قصيرة جدًا."}, status=HTTPStatus.BAD_REQUEST)
            return

        try:
            save_contact(name=name, email=email, message=message)
        except sqlite3.Error:
            self._send_json({"ok": False, "message": "حدث خطأ أثناء حفظ البيانات."}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        self._send_json({"ok": True, "message": "تم حفظ الرسالة بنجاح."}, status=HTTPStatus.CREATED)

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run() -> None:
    init_db()
    httpd = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Server running at http://{HOST}:{PORT}")
    httpd.serve_forever()


if __name__ == "__main__":
    run()

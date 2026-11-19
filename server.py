"""Small local proxy for the optional AnyModel/Nemotron connection.

The browser never receives AI_API_KEY. Run with environment variables from
.env (or your process manager), for example: python server.py.
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def load_local_env():
    """Load the ignored local .env without adding a dependency."""
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_file):
        return
    for line in open(env_file, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"\''))


load_local_env()


BASE_URL = os.getenv("AI_BASE_URL", "https://anymodel.org/v1").rstrip("/")
MODEL = os.getenv("AI_MODEL", "am/nemotron-3-ultra-550b-a55b")
API_KEY = os.getenv("AI_API_KEY", "")


class Handler(SimpleHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_json(404, {"error": "not found"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(size))
            messages = payload.get("messages", [])[-12:]
            if not API_KEY:
                self.send_json(200, {"content": "", "fallback": True})
                return
            request = Request(
                f"{BASE_URL}/chat/completions",
                data=json.dumps({"model": MODEL, "messages": messages, "temperature": 0.7}).encode(),
                headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(request, timeout=45) as response:
                result = json.loads(response.read())
            content = result["choices"][0]["message"]["content"]
            self.send_json(200, {"content": content, "model": MODEL})
        except (HTTPError, URLError, KeyError, ValueError, TimeoutError) as error:
            self.send_json(502, {"error": f"AI request failed: {error.__class__.__name__}"})


if __name__ == "__main__":
    print("PET CONNECT: http://localhost:4173")
    ThreadingHTTPServer(("127.0.0.1", 4173), Handler).serve_forever()

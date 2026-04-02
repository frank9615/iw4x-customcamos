import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = "iw4x-camo-web"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    if not os.path.exists(DIRECTORY):
        print(f"Error: Directory '{DIRECTORY}' not found.")
        return

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"[*] Server avviato su http://localhost:{PORT}")
        print(f"[*] Premere CTRL+C per fermare il server.")
        webbrowser.open(f"http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[!] Server fermato.")
            httpd.server_close()

if __name__ == "__main__":
    run()

"""
AgreBot Backend — Entry Point
Run on Raspberry Pi:
    python main.py

Prints the local IP and port so you can enter it in the frontend.
"""
import socket
import sys
import os

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


if __name__ == "__main__":
    from app import create_app
    from app.config import Config

    config = Config()

    local_ip = get_local_ip()
    port = config.PORT

    print("=" * 60)
    print("  AgreBot — Agricultural Inspection System")
    print("=" * 60)
    print(f"\n  ✅ Backend URL  :  http://{local_ip}:{port}")
    print(f"\n  Enter this URL in the laptop frontend to connect.")
    print("  After connecting you will be prompted for the IP Webcam URL.")
    print("\n" + "=" * 60)

    app = create_app(config)
    app.run(host=config.HOST, port=port, debug=config.DEBUG, threaded=True)

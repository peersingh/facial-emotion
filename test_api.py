import urllib.request

def test_root():
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/")
        with urllib.request.urlopen(req) as res:
            print("Status:", res.status)
            print("Response:", res.read().decode())
    except Exception as e:
        print("Root failed:", e)

def test_stream_http():
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/stream")
        with urllib.request.urlopen(req) as res:
            print("Stream Status:", res.status)
    except Exception as e:
        print("Stream HTTP failed:", e)

if __name__ == "__main__":
    test_root()
    test_stream_http()

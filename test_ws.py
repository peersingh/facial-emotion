import asyncio
import websockets
import base64
import json

async def test():
    try:
        async with websockets.connect("ws://127.0.0.1:8081/stream") as ws:
            print("Connected to port 8081!")
            
            with open(r"C:\Users\lakav\.gemini\antigravity\brain\dfacbf85-c422-44dd-a132-96c83c37ce85\output.jpg", "rb") as f:
                img_data = f.read()
            
            b64_str = base64.b64encode(img_data).decode('utf-8')
            payload = f"data:image/jpeg;base64,{b64_str}"
            
            await ws.send(payload)
            print("Sent real test image.")
            
            res = await asyncio.wait_for(ws.recv(), timeout=20.0)
            print("Received response:", res)
            
    except Exception as e:
        print("Error:", type(e).__name__, "-", e)

if __name__ == "__main__":
    asyncio.run(test())

import threading
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from starlette.datastructures import MutableHeaders

MAX_BODY_BYTES = 16*1024
MAX_CONCURRENT_PREDICTIONS = 8

prediction_slots = threading.BoundedSemaphore(MAX_CONCURRENT_PREDICTIONS)


class BodySizeLimitMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        

        content_length = None
        for name, value in scope["headers"]:
            if name == b"content-length":
                content_length = int(value)


        if content_length and content_length > MAX_BODY_BYTES:
            response = JSONResponse(status_code=413, content={"detail": "This packet is too large"})
            await response(scope, receive, send)
            return
            
        bytes_seen = 0
        
        async def counting_received_bytes():
            nonlocal bytes_seen
            message = await receive()
            if message["type"] == "http.request":
                bytes_seen += len(message.get("body", b""))
                if bytes_seen > MAX_BODY_BYTES:
                    raise HTTPException(413, "This packet is too large")
                
            return message
        
        await self.app(scope, counting_received_bytes, send)
        
        
        



class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
            await send(message)

        await self.app(scope, receive, send_with_headers)
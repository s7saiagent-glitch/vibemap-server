from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import json
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME_EN,
    description="Virtual Earth Kingdom University - AI-Powered University Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "ai_powered": "90%",
    }


@app.get("/")
async def root():
    return {
        "message": f"مرحباً بك في {settings.APP_NAME}",
        "message_en": f"Welcome to {settings.APP_NAME_EN}",
        "api_docs": "/api/docs",
        "status": "running",
    }


app.include_router(api_router, prefix=settings.API_V1_STR)


active_connections: dict = {}


@app.websocket("/ws/chat/{student_id}")
async def websocket_chat(websocket: WebSocket, student_id: int):
    await websocket.accept()
    active_connections[student_id] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await websocket.send_json({
                "type": "received",
                "message": "جاري معالجة رسالتك...",
                "status": "processing",
            })
    except WebSocketDisconnect:
        active_connections.pop(student_id, None)


@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "المورد المطلوب غير موجود", "detail_en": "Resource not found"},
    )


@app.exception_handler(500)
async def server_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "خطأ داخلي في الخادم", "detail_en": "Internal server error"},
    )

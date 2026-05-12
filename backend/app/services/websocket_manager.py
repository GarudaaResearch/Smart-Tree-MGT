"""TreeSense AI — WebSocket Connection Manager"""

from fastapi import WebSocket
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []
        self.channels: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: Optional[str] = None):
        await websocket.accept()
        self.active.append(websocket)
        if channel:
            self.channels.setdefault(channel, []).append(websocket)
        logger.info(f"WS connected (channel={channel}). Total: {len(self.active)}")

    def disconnect(self, websocket: WebSocket):
        self.active.discard(websocket) if hasattr(self.active, "discard") else None
        if websocket in self.active:
            self.active.remove(websocket)
        for ch in self.channels.values():
            if websocket in ch:
                ch.remove(websocket)

    async def subscribe(self, websocket: WebSocket, tree_id: Optional[str]):
        if tree_id:
            self.channels.setdefault(tree_id, []).append(websocket)

    async def broadcast(self, message: str):
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(ws)

    async def send_to_channel(self, channel: str, message: str):
        for ws in list(self.channels.get(channel, [])):
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(ws)

    def is_connected(self) -> bool:
        return len(self.active) > 0

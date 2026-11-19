from fastapi import WebSocket


class EventHub:
    def __init__(self):
        self.connections: set[WebSocket] = set()
        self.user_connections: dict[int, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.connections.discard(websocket)
        for connections in self.user_connections.values():
            connections.discard(websocket)

    async def connect_user(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.user_connections.setdefault(user_id, set()).add(websocket)

    async def publish(self, event: dict):
        await self._send(self.connections, event)

    async def publish_user(self, user_id: int, event: dict):
        await self._send(self.user_connections.get(user_id, set()), event)

    async def _send(self, connections: set[WebSocket], event: dict):
        dead = []
        for websocket in connections:
            try:
                await websocket.send_json(event)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.disconnect(websocket)


events = EventHub()

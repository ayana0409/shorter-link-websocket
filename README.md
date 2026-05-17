# 🔗 Shorter Link — WebSocket Service

> WebSocket service cho hệ thống thông báo real-time, xây dựng trên NestJS với Socket.IO Gateway.

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Kiến trúc](#-kiến-trúc)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Chức năng](#-chức-năng)
- [WebSocket Events](#-websocket-events)
- [HTTP API Endpoints](#-http-api-endpoints)
- [Related Repositories](#-related-repositories)

---

## 🔭 Tổng quan

**Shorter Link WebSocket** là service thông báo real-time, được xây dựng trên **NestJS** với **Socket.IO Gateway**. Service chạy độc lập, quản lý kết nối WebSocket với các client và hỗ trợ:

- **Gửi thông báo đến người dùng cụ thể** (theo `userId` hoặc `username`)
- **Broadcast** thông báo đến tất cả client đang kết nối
- **Gửi theo room/group** — hỗ trợ phân nhóm người nhận
- **Theo dõi trạng thái online** — kiểm tra user có đang kết nối không
- **HTTP API** để trigger notification từ backend service

---

## 🏗 Kiến trúc

```
shorter-link-websocket/
├── src/
│   ├── notification/
│   │   ├── notification.gateway.ts    # Socket.IO Gateway — quản lý kết nối & emit
│   │   ├── notification.controller.ts  # HTTP API để trigger notification
│   │   ├── notification.module.ts      # Module — global, export gateway
│   │   └── index.ts                    # Barrel export
│   ├── app.module.ts                   # Root module
│   ├── app.controller.ts               # Health check endpoint
│   ├── app.service.ts                  # App service
│   └── main.ts                         # Bootstrap — CORS, port config
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
└── eslint.config.mjs
```

### Luồng hoạt động

```
Client (FE)                          WebSocket Service
    │                                     │
    ├── connect (userId, username) ──────→ │  handleConnection()
    │                                     │  → Lưu socket vào userSockets Map
    │                                     │
    │  ←── connect event ─────────────────┤
    │                                     │
    │  ←── {event, payload} ─────────────┤  sendToUser() / broadcast()
    │                                     │
    ├── disconnect ──────────────────────→ │  handleDisconnect()
    │                                     │  → Xóa socket khỏi userSockets Map

Backend API                          WebSocket Service
    │                                     │
    ├── POST /notify/user ──────────────→ │  NotificationController
    │   { userId, event, payload }        │  → gateway.sendToUser()
    │                                     │
    ├── POST /notify/broadcast ─────────→ │  NotificationController
    │   { event, payload }                │  → gateway.broadcast()
    │                                     │
    ├── POST /notify/room ──────────────→ │  NotificationController
    │   { room, event, payload }          │  → gateway.sendToRoom()
    │                                     │
    └── POST /notify/status ────────────→ │  NotificationController
                                          │  → gateway.getConnectedUserCount()
```

---

## 🛠 Công nghệ sử dụng

| Công nghệ                      | Phiên bản                    | Mô tả                                 |
| ------------------------------ | ---------------------------- | ------------------------------------- |
| **NestJS**                     | ^11.0.1                      | Framework Node.js chính               |
| **TypeScript**                 | ^5.7.3                       | Ngôn ngữ lập trình                    |
| **Socket.IO**                  | ^4.8.3                       | Real-time bidirectional communication |
| **@nestjs/websockets**         | ^11.1.21                     | NestJS WebSocket gateway adapter      |
| **@nestjs/platform-socket.io** | ^11.1.21                     | Socket.IO platform integration        |
| **Express**                    | via @nestjs/platform-express | HTTP server                           |
| **rxjs**                       | ^7.8.1                       | Reactive programming                  |

### Kỹ thuật & Patterns

- **WebSocket Gateway** — `@WebSocketGateway` decorator với namespace `notifications`
- **In-memory Socket Tracking** — `Map<string, Set<string>>` theo dõi userId/username → socket ids
- **Dual Key Mapping** — Hỗ trợ cả `userId` (ObjectId) và `username` để tìm socket
- **Global Module** — `NotificationModule` đánh dấu `@Global()` để inject gateway ở bất kỳ đâu
  - **HTTP-to-WebSocket Bridge** — REST API để backend service trigger notification qua WebSocket

---

## 📦 Chức năng

### 🔔 Gửi thông báo đến người dùng cụ thể

- Gửi event + payload đến tất cả socket của một user (theo `userId` hoặc `username`)
- Trả về `false` nếu user không online
- Hỗ trợ nhiều socket đồng thời (nhiều tab / thiết bị)

### 📢 Broadcast

- Gửi event + payload đến **tất cả** client đang kết nối
- Không phân biệt user — áp dụng cho thông báo toàn hệ thống

### 🏠 Gửi theo Room

- Gửi event + payload đến một room/group cụ thể
- Client join room theo nhu cầu

### 📊 Theo dõi trạng thái

- **Kiểm tra user online** — `isUserOnline(userId)`
- **Đếm số user đang kết nối** — `getConnectedUserCount()`
- **Logging** — Log mọi kết nối / ngắt kết nối

---

## 🌐 HTTP API Endpoints

Service cung cấp REST API để backend trigger notification:

| Method | Endpoint            | Mô tả                | Body                         |
| ------ | ------------------- | -------------------- | ---------------------------- |
| POST   | `/notify/user`      | Gửi đến user cụ thể  | `{ userId, event, payload }` |
| POST   | `/notify/broadcast` | Broadcast đến tất cả | `{ event, payload }`         |
| POST   | `/notify/room`      | Gửi đến room         | `{ room, event, payload }`   |
| POST   | `/notify/status`    | Xem số user online   | —                            |
| GET    | `/`                 | Health check         | —                            |

**Ví dụ gửi notification:**

```bash
curl -X POST http://localhost:3002/notify/user \
  -H "Content-Type: application/json" \
  -d '{"userId": "64f...", "event": "link_created", "payload": {"shortUrl": "abc123"}}'
```

**Ví dụ broadcast:**

```bash
curl -X POST http://localhost:3002/notify/broadcast \
  -H "Content-Type: application/json" \
  -d '{"event": "system_maintenance", "payload": {"message": "Bảo trì lúc 2AM"}}'
```

---

## 🔗 Related Repositories

| Repository                 | Mô tả                                  | Link                                                |
| -------------------------- | -------------------------------------- | --------------------------------------------------- |
| **shorter-link-api**       | Backend REST API (NestJS)              | https://github.com/ayana0409/shorter-link-api       |
| **shorter-link-fe**        | Frontend (ReactJS)                     | https://github.com/ayana0409/shorter-link-fe        |
| **shorter-link-websocket** | WebSocket service (NestJS + Socket.IO) | https://github.com/ayana0409/shorter-link-websocket |

---

## 📄 License

UNLICENSED — Private project.

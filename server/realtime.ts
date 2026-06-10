import { createServer, type Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";

type RealtimeUser = {
  userId: string;
  organizationIds: string[];
};

type VerifySession = (token: string) => Promise<RealtimeUser | null>;

function room(organizationId: string) {
  return `org:${organizationId}`;
}

export function createRealtimeServer(httpServer: HttpServer, verifySession: VerifySession) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [], credentials: true },
  });

  io.use(async (socket, next) => {
    const token = String(socket.handshake.auth.token ?? "");
    const user = await verifySession(token);
    if (!user) return next(new Error("Unauthorized"));
    socket.data.user = user;
    return next();
  });

  io.on("connection", (socket: Socket) => {
    socket.on("presence:join", ({ organizationId }: { organizationId: string }) => {
      const user = socket.data.user as RealtimeUser;
      if (!user.organizationIds.includes(organizationId)) return;
      socket.join(room(organizationId));
      io.to(room(organizationId)).emit("presence:update", { userId: user.userId, online: true });
    });

    socket.on("task:moved", (payload: { organizationId: string; taskId: string; fromStatus: string; toStatus: string; order: number }) => {
      const user = socket.data.user as RealtimeUser;
      if (!user.organizationIds.includes(payload.organizationId)) return;
      socket.to(room(payload.organizationId)).emit("task:moved", payload);
    });

    socket.on("comment:created", (payload: { organizationId: string; taskId: string; commentId: string }) => {
      const user = socket.data.user as RealtimeUser;
      if (!user.organizationIds.includes(payload.organizationId)) return;
      socket.to(room(payload.organizationId)).emit("comment:created", payload);
    });

    socket.on("typing:start", (payload: { organizationId: string; taskId: string }) => {
      const user = socket.data.user as RealtimeUser;
      if (!user.organizationIds.includes(payload.organizationId)) return;
      socket.to(room(payload.organizationId)).emit("typing:start", { taskId: payload.taskId, userId: user.userId });
    });

    socket.on("typing:stop", (payload: { organizationId: string; taskId: string }) => {
      const user = socket.data.user as RealtimeUser;
      if (!user.organizationIds.includes(payload.organizationId)) return;
      socket.to(room(payload.organizationId)).emit("typing:stop", { taskId: payload.taskId, userId: user.userId });
    });
  });

  return io;
}

export function createStandaloneRealtimeServer(verifySession: VerifySession) {
  const httpServer = createServer();
  const io = createRealtimeServer(httpServer, verifySession);
  return { httpServer, io };
}
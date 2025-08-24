import { Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  RoomManager,
  JoinProject,
  LeaveProject
} from '@code-crow/shared';

export class SessionHandler {
  constructor(
    private broadcastToRoom: (roomName: string, event: string, data: unknown) => void
  ) {}

  setupWebHandlers(socket: Socket): void {
    // Project room management
    socket.on(SOCKET_EVENTS.JOIN_PROJECT, (data: JoinProject) => {
      this.handleJoinProject(socket, data);
    });

    socket.on(SOCKET_EVENTS.LEAVE_PROJECT, (data: LeaveProject) => {
      this.handleLeaveProject(socket, data);
    });

    // Session management for web clients
    socket.on('session:clear', (data: { sessionId: string }) => {
      this.handleSessionClear(data);
    });

    socket.on('session:status', (data: { sessionId: string }) => {
      this.handleSessionStatus(data);
    });
  }

  setupAgentHandlers(socket: Socket): void {
    // Session management handlers for agents
    socket.on('session:cleared', (data: { sessionId: string }) => {
      this.handleSessionCleared(socket, data);
    });

    socket.on('session:status', (data: { sessionId: string, exists: boolean, info: Record<string, unknown> }) => {
      this.handleAgentSessionStatus(socket, data);
    });

    socket.on('session:error', (data: { sessionId: string, error: string }) => {
      this.handleSessionError(socket, data);
    });
  }

  private handleJoinProject(socket: Socket, data: JoinProject): void {
    const projectRoom = RoomManager.getProjectRoom(data.projectId);
    socket.join(projectRoom);
    console.log(`📁 ${socket.id} joined project ${data.projectId}`);
  }

  private handleLeaveProject(socket: Socket, data: LeaveProject): void {
    const projectRoom = RoomManager.getProjectRoom(data.projectId);
    socket.leave(projectRoom);
    console.log(`📁 ${socket.id} left project ${data.projectId}`);
  }

  private handleSessionClear(data: { sessionId: string }): void {
    console.log(`🗑️ Session clear request: ${data.sessionId}`);
    // Forward to agents
    this.broadcastToRoom(RoomManager.getAgentRoom(), 'session:clear', data);
  }

  private handleSessionStatus(data: { sessionId: string }): void {
    console.log(`📊 Session status request: ${data.sessionId}`);
    // Forward to agents
    this.broadcastToRoom(RoomManager.getAgentRoom(), 'session:status', data);
  }

  private handleSessionCleared(socket: Socket, data: { sessionId: string }): void {
    console.log(`🗑️ Agent ${socket.id} cleared session: ${data.sessionId}`);
    // Forward to web clients
    this.broadcastToRoom(RoomManager.getWebRoom(), 'session:cleared', data);
  }

  private handleAgentSessionStatus(socket: Socket, data: { sessionId: string, exists: boolean, info: Record<string, unknown> }): void {
    console.log(`📊 Agent ${socket.id} session status: ${data.sessionId} (exists: ${data.exists})`);
    // Forward to web clients
    this.broadcastToRoom(RoomManager.getWebRoom(), 'session:status', data);
  }

  private handleSessionError(socket: Socket, data: { sessionId: string, error: string }): void {
    console.log(`❌ Agent ${socket.id} session error: ${data.sessionId} - ${data.error}`);
    // Forward to web clients
    this.broadcastToRoom(RoomManager.getWebRoom(), 'session:error', data);
  }
}
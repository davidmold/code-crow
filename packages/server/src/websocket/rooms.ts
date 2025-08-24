import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomManager } from '@code-crow/shared';

export class RoomManagerService {
  private io: SocketIOServer;
  private rooms = new Map<string, Set<string>>();
  private socketRooms = new Map<string, Set<string>>();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  joinRoom(socket: Socket, roomName: string): boolean {
    try {
      socket.join(roomName);
      
      // Track room membership
      if (!this.rooms.has(roomName)) {
        this.rooms.set(roomName, new Set());
      }
      this.rooms.get(roomName)!.add(socket.id);

      // Track socket's rooms
      if (!this.socketRooms.has(socket.id)) {
        this.socketRooms.set(socket.id, new Set());
      }
      this.socketRooms.get(socket.id)!.add(roomName);

      console.log(`🏠 Socket ${socket.id} joined room ${roomName}`);
      return true;
    } catch (error) {
      console.error(`Failed to join room ${roomName}:`, error);
      return false;
    }
  }

  leaveRoom(socket: Socket, roomName: string): boolean {
    try {
      socket.leave(roomName);

      // Update room membership
      const room = this.rooms.get(roomName);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          this.rooms.delete(roomName);
        }
      }

      // Update socket's rooms
      const socketRooms = this.socketRooms.get(socket.id);
      if (socketRooms) {
        socketRooms.delete(roomName);
      }

      console.log(`🏠 Socket ${socket.id} left room ${roomName}`);
      return true;
    } catch (error) {
      console.error(`Failed to leave room ${roomName}:`, error);
      return false;
    }
  }

  leaveAllRooms(socket: Socket): void {
    const socketRooms = this.socketRooms.get(socket.id);
    if (socketRooms) {
      for (const roomName of socketRooms) {
        this.leaveRoom(socket, roomName);
      }
    }
    this.socketRooms.delete(socket.id);
  }

  joinProjectRoom(socket: Socket, projectId: string): boolean {
    const roomName = RoomManager.getProjectRoom(projectId);
    return this.joinRoom(socket, roomName);
  }

  leaveProjectRoom(socket: Socket, projectId: string): boolean {
    const roomName = RoomManager.getProjectRoom(projectId);
    return this.leaveRoom(socket, roomName);
  }

  joinClientTypeRoom(socket: Socket, clientType: 'web' | 'agent'): boolean {
    const roomName = clientType === 'agent' 
      ? RoomManager.getAgentRoom() 
      : RoomManager.getWebRoom();
    return this.joinRoom(socket, roomName);
  }

  getRoomMembers(roomName: string): string[] {
    const room = this.rooms.get(roomName);
    return room ? Array.from(room) : [];
  }

  getSocketRooms(socketId: string): string[] {
    const rooms = this.socketRooms.get(socketId);
    return rooms ? Array.from(rooms) : [];
  }

  getRoomCount(roomName: string): number {
    const room = this.rooms.get(roomName);
    return room ? room.size : 0;
  }

  getAllRooms(): Array<{ name: string; members: number; type: 'project' | 'system' }> {
    return Array.from(this.rooms.entries()).map(([name, members]) => ({
      name,
      members: members.size,
      type: RoomManager.isProjectRoom(name) ? 'project' : 'system'
    }));
  }

  getProjectRooms(): Array<{ projectId: string; members: number; memberIds: string[] }> {
    return Array.from(this.rooms.entries())
      .filter(([name]) => RoomManager.isProjectRoom(name))
      .map(([name, members]) => ({
        projectId: RoomManager.extractProjectId(name)!,
        members: members.size,
        memberIds: Array.from(members)
      }));
  }

  broadcastToRoom(roomName: string, event: string, data: unknown): boolean {
    try {
      this.io.to(roomName).emit(event, data);
      console.log(`📢 Broadcasted ${event} to room ${roomName}`);
      return true;
    } catch (error) {
      console.error(`Failed to broadcast to room ${roomName}:`, error);
      return false;
    }
  }

  broadcastToProject(projectId: string, event: string, data: unknown): boolean {
    const roomName = RoomManager.getProjectRoom(projectId);
    return this.broadcastToRoom(roomName, event, data);
  }

  broadcastToWebClients(event: string, data: unknown): boolean {
    const roomName = RoomManager.getWebRoom();
    return this.broadcastToRoom(roomName, event, data);
  }

  broadcastToAgents(event: string, data: unknown): boolean {
    const roomName = RoomManager.getAgentRoom();
    return this.broadcastToRoom(roomName, event, data);
  }

  // Clean up empty rooms periodically
  cleanup(): void {
    for (const [roomName, members] of this.rooms.entries()) {
      if (members.size === 0) {
        this.rooms.delete(roomName);
        console.log(`🧹 Cleaned up empty room: ${roomName}`);
      }
    }
  }

  // Get statistics
  getStats() {
    const totalRooms = this.rooms.size;
    const projectRooms = Array.from(this.rooms.keys())
      .filter(name => RoomManager.isProjectRoom(name)).length;
    const systemRooms = totalRooms - projectRooms;
    const totalMembers = Array.from(this.rooms.values())
      .reduce((sum, members) => sum + members.size, 0);

    return {
      totalRooms,
      projectRooms,
      systemRooms,
      totalMembers,
      webClients: this.getRoomCount(RoomManager.getWebRoom()),
      agents: this.getRoomCount(RoomManager.getAgentRoom())
    };
  }
}
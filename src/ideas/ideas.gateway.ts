import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { IdeasService } from './ideas.service';
import * as Y from 'yjs';

@WebSocketGateway({
  namespace: '/ideas',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class IdeasGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // 문서별 Y.Doc 저장 (메모리 캐시)
  private docs: Map<string, Y.Doc> = new Map();

  constructor(private readonly ideasService: IdeasService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // 문서 접속
  @SubscribeMessage('join-document')
  async handleJoinDocument(
    @MessageBody() data: { docId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { docId } = data;
    client.join(docId);

    // Y.Doc 초기화 or 로드
    if (!this.docs.has(docId)) {
      const ydoc = new Y.Doc();

      // DB에서 최신 스냅샷 로드
      const snapshot = await this.ideasService.getLatestSnapshot(docId);
      if (snapshot && snapshot.ydoc_snapshot) {
        Y.applyUpdate(ydoc, snapshot.ydoc_snapshot);
      }

      this.docs.set(docId, ydoc);
    }

    const ydoc = this.docs.get(docId);
    if (!ydoc) return;

    const state = Y.encodeStateAsUpdate(ydoc);

    // 현재 상태를 클라이언트에 전송
    client.emit('document-state', { state: Array.from(state) });
  }

  // 문서 업데이트 (다른 클라이언트에 브로드캐스트)
  @SubscribeMessage('document-update')
  async handleUpdate(
    @MessageBody() data: { docId: string; update: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const { docId, update } = data;
    const updateArray = new Uint8Array(update);

    // 현재 Y.Doc에 업데이트 적용
    if (this.docs.has(docId)) {
      const ydoc = this.docs.get(docId);
      if (ydoc) {
        Y.applyUpdate(ydoc, updateArray);
      }
    }

    // 같은 room의 다른 클라이언트에게 브로드캐스트
    client.to(docId).emit('document-update', { update });
  }

  // 스냅샷 저장 (클라이언트 요청 or 주기적)
  @SubscribeMessage('save-snapshot')
  async handleSaveSnapshot(
    @MessageBody() data: { docId: string },
  ) {
    const { docId } = data;

    if (!this.docs.has(docId)) return;

    const ydoc = this.docs.get(docId);
    if (!ydoc) return;

    const snapshot = Y.encodeStateAsUpdate(ydoc);
    const version = Date.now();

    await this.ideasService.saveSnapshot(docId, Buffer.from(snapshot), version);

    return { success: true, version };
  }
}

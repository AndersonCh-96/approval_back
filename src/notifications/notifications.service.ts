import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { NotificationEvent } from './notification-event.interface';

interface MessageEvent {
  data: string;
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class NotificationsService {
  private userClients = new Map<string, Subject<MessageEvent>>();
  private roleClients = new Map<string, Subject<MessageEvent>>();

  subscribeByUser(userId: string): Observable<MessageEvent> {
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Subject<MessageEvent>());
    }
    return this.userClients.get(userId)!.asObservable();
  }

  subscribeByRole(roleId: string): Observable<MessageEvent> {
    if (!this.roleClients.has(roleId)) {
      this.roleClients.set(roleId, new Subject<MessageEvent>());
    }
    return this.roleClients.get(roleId)!.asObservable();
  }

  notifyUser(userId: string, event: NotificationEvent) {
    const client = this.userClients.get(userId);
    if (client) {
      client.next({ data: JSON.stringify(event) });
    }
  }

  notifyRole(roleId: string, event: NotificationEvent) {
    const client = this.roleClients.get(roleId);
    if (client) {
      client.next({ data: JSON.stringify(event) });
    }
  }
}
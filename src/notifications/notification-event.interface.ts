import { RequestType } from '../enums/request-type.enum';

export interface NotificationEvent {
  type: 'NEW_PENDING' | 'DEPARTMENT_PENDING' | 'APPROVED' | 'REJECTED' | 'SUBMITTED';
  title: string;
  message: string;
  requestId: string;
  requestType: RequestType;
  timestamp: string;
}
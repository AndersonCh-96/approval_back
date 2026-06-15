import { Controller, Sse, Query, UnauthorizedException } from '@nestjs/common';
import { Observable, merge } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { UsersService } from '../users/users.service';
import { Public } from '../auth/decorators/public.decorator';

interface MessageEvent {
  data: string;
  id?: string;
  type?: string;
  retry?: number;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Sse('stream')
  async stream(@Query('token') token: string): Promise<Observable<MessageEvent>> {
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    let userId: string;
    let roleId: string;

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      userId = user.id;
      roleId = user.roleId;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return merge(
      this.notificationsService.subscribeByUser(userId),
      this.notificationsService.subscribeByRole(roleId),
    );
  }
}
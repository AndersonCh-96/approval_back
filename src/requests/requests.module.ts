import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsService } from './requests.service';
import { VacationRequestsController } from './vacation-requests.controller';
import { MoneyAdvanceRequestsController } from './money-advance-requests.controller';
import { Request } from './entities/request.entity';
import { VacationDetail } from './entities/vacation-detail.entity';
import { MoneyAdvanceDetail } from './entities/money-advance-detail.entity';
import { RequestLog } from './entities/request-log.entity';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Request,
      VacationDetail,
      MoneyAdvanceDetail,
      RequestLog,
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => RolesModule),
    forwardRef(() => AuthModule),
    NotificationsModule,
  ],
  providers: [RequestsService],
  controllers: [VacationRequestsController, MoneyAdvanceRequestsController],
  exports: [RequestsService],
})
export class RequestsModule {}
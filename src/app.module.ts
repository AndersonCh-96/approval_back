import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { RequestsModule } from './requests/requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SeedsModule } from './seeds/seeds.module';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { Request } from './requests/entities/request.entity';
import { VacationDetail } from './requests/entities/vacation-detail.entity';
import { MoneyAdvanceDetail } from './requests/entities/money-advance-detail.entity';
import { RequestLog } from './requests/entities/request-log.entity';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'Admin_123',
      database: process.env.DB_NAME || 'approval',
      entities: [
        Role,
        User,
        Request,
        VacationDetail,
        MoneyAdvanceDetail,
        RequestLog,
      ],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    RequestsModule,
    NotificationsModule,
    SeedsModule,
  ],
  controllers: [],
  providers: [
     {
       provide: APP_GUARD,
       useClass: JwtAuthGuard,
   },
   ],
})
export class AppModule {}
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateMoneyAdvanceRequestDto } from './dto/create-money-advance-request.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { MoneyAdvanceFilterDto } from './dto/money-advance-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from '../enums/role-name.enum';
import { RequestType } from '../enums/request-type.enum';

@Controller('money-advance-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MoneyAdvanceRequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(
    @Body() createDto: CreateMoneyAdvanceRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.createMoneyAdvanceRequest(createDto, user.id);
  }

  @Get()
  @Roles(RoleName.ADMIN, RoleName.CONTADOR)
  findAll(@Query() filters: MoneyAdvanceFilterDto) {
    return this.requestsService.findAllMoneyAdvances(filters);
  }

  @Get('pending')
  @Roles(RoleName.GERENTE, RoleName.CONTADOR, RoleName.ADMIN)
  findPendingForApprover(
    @Query() filters: MoneyAdvanceFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.findPendingForApprover(
      user.id,
      RequestType.MONEY_ADVANCE,
      { page: filters.page ?? 1, limit: filters.limit ?? 10 },
    );
  }

  @Get('my-requests')
  findMyRequests(
    @Query() filters: MoneyAdvanceFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.findByUser(
      user.id,
      RequestType.MONEY_ADVANCE,
      { page: filters.page ?? 1, limit: filters.limit ?? 10 },
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestsService.findById(id);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string) {
    return this.requestsService.getLogs(id);
  }

  @Post(':id/approve')
  @Roles(RoleName.GERENTE, RoleName.CONTADOR, RoleName.ADMIN)
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.approve(id, user.id, dto);
  }

  @Post(':id/reject')
  @Roles(RoleName.GERENTE, RoleName.CONTADOR, RoleName.ADMIN)
  reject(
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.reject(id, user.id, dto);
  }
}
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.isAuthenticated()) return true;
    response.redirect('/web/index/empty');
    return false;
  }
}

@Injectable()
export class AuthenticatedApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // const response = context.switchToHttp().getResponse();
    if (request.isAuthenticated()) return true;
    throw new UnauthorizedException();
  }
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from '../auth.service';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    
    const authHeader = request.headers.authorization;
    const token = this.authService.extractTokenFromHeader(authHeader);
    
    const user = await this.authService.validateToken(token);
    request.user = user;
    
    return true;
  }
}

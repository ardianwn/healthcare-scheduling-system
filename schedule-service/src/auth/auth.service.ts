import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly authServiceUrl: string;

  constructor(private httpService: HttpService) {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001/graphql';
  }

  async validateToken(token: string): Promise<any> {
    try {
      const query = `
        query ValidateToken($token: String!) {
          validateToken(token: $token) {
            id
            email
            createdAt
            updatedAt
          }
        }
      `;

      const response = await firstValueFrom(
        this.httpService.post(this.authServiceUrl, {
          query,
          variables: { token },
        })
      );

      if (response.data.errors) {
        throw new UnauthorizedException('Invalid token');
      }

      return response.data.data.validateToken;
    } catch (error) {
      throw new UnauthorizedException('Token validation failed');
    }
  }

  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    return authHeader.split(' ')[1];
  }
}

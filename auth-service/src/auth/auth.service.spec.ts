import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerInput = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const hashedPassword = 'hashedPassword';
      const mockUser = {
        id: '123',
        email: registerInput.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(hashedPassword));

      const result = await service.register(registerInput);

      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerInput.email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerInput = {
        email: 'existing@example.com',
        password: 'Password123!',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '123',
        email: registerInput.email,
      });

      await expect(service.register(registerInput)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: '123',
        email: loginInput.email,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.login(loginInput);

      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with incorrect password', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: '123',
        email: loginInput.email,
        password: 'hashedPassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token', async () => {
      const token = 'valid-jwt-token';
      const decoded = { sub: '123', email: 'test@example.com' };
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue(decoded);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateToken(token);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const token = 'invalid-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const token = 'valid-jwt-token';
      const decoded = { sub: '123', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(decoded);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

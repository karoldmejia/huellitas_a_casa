import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { User, UserRole } from '../../src/modules/users/entities/user.entity';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { GoogleStrategy } from '../../src/modules/auth/strategies/google.strategy';
import { GoogleOAuthGuard } from '../../src/modules/auth/guards/google-oauth.guard';

// Mock de usuario
const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    displayName: 'Test User',
    googleId: 'test-google-id-123',
    photoUrl: 'https://example.com/photo.jpg',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
};

// Mock de ConfigService
const mockConfigService = {
    get: jest.fn((key: string) => {
        const config: Record<string, any> = {
            'jwt.secret': 'test-secret-key-for-jest-min-32-characters-here',
            'jwt.expiresIn': '7d',
            'google.clientId': 'mock-google-client-id',
            'google.clientSecret': 'mock-google-client-secret',
            'google.callbackUrl': 'http://localhost:3001/auth/google/callback',
            'frontend.url': 'http://localhost:5173',
            'port': 3001,
        };
        return config[key];
    }),
};

// Mock de AuthService - AHORA LANZA UnauthorizedException
const mockAuthService = {
    validateOAuthUser: jest.fn().mockResolvedValue(mockUser),
    login: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser,
    }),
    refreshToken: jest.fn().mockImplementation((token) => {
        if (!token || token === 'invalid-token-123') {
            throw new UnauthorizedException('Invalid refresh token');
        }
        return Promise.resolve({
            accessToken: 'new-mock-access-token',
        });
    }),
    validateToken: jest.fn().mockImplementation((token) => {
        if (!token || token === 'invalid-token') {
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }),
    getUserStats: jest.fn().mockResolvedValue({
        userId: mockUser.id,
        displayName: mockUser.displayName,
        email: mockUser.email,
        memberSince: mockUser.createdAt,
    }),
};

// Mock de JwtAuthGuard
class MockJwtAuthGuard {
    canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }
        
        const token = authHeader.split(' ')[1];
        if (token === 'invalid-token') {
            return false;
        }
        
        req.user = mockUser;
        return true;
    }
}

describe('AuthController (e2e)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let mockAccessToken: string;
    let mockRefreshToken: string;

    beforeAll(async () => {
        // Configurar variables de entorno
        process.env.JWT_SECRET = 'test-secret-key-for-jest-min-32-characters-here';
        process.env.JWT_EXPIRES_IN = '7d';
        process.env.GOOGLE_CLIENT_ID = 'mock-google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'mock-google-client-secret';
        process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3001/auth/google/callback';
        process.env.NODE_ENV = 'test';

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                PassportModule.register({ defaultStrategy: 'jwt' }),
                JwtModule.register({
                    secret: process.env.JWT_SECRET,
                    signOptions: { expiresIn: '7d' },
                }),
            ],
            controllers: [AuthController],
            providers: [
                // Servicios reales pero con mocks
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: UsersService,
                    useValue: {
                        findById: jest.fn().mockResolvedValue(mockUser),
                        findByEmail: jest.fn().mockResolvedValue(mockUser),
                        findByGoogleId: jest.fn().mockResolvedValue(mockUser),
                        create: jest.fn().mockResolvedValue(mockUser),
                        updateLastLogin: jest.fn().mockResolvedValue(undefined),
                        linkGoogleAccount: jest.fn().mockResolvedValue(mockUser),
                        save: jest.fn().mockResolvedValue(mockUser),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn().mockResolvedValue(mockUser),
                        save: jest.fn().mockResolvedValue(mockUser),
                        delete: jest.fn().mockResolvedValue({ affected: 1 }),
                    },
                },
                // Estrategias reales (necesarias para que passport funcione)
                JwtStrategy,
                GoogleStrategy,
                // Guards reales
                JwtAuthGuard,
                GoogleOAuthGuard,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
        }));

        jwtService = moduleFixture.get<JwtService>(JwtService);

        const payload = {
            sub: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
        };

        mockAccessToken = await jwtService.signAsync(payload, { expiresIn: '7d' });
        mockRefreshToken = await jwtService.signAsync(
            { ...payload, type: 'refresh' },
            { expiresIn: '30d' }
        );

        await app.init();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    describe('GET /auth/google', () => {
        it('should redirect to Google OAuth', () => {
            return request(app.getHttpServer())
                .get('/auth/google')
                .expect(302)
                .expect((res) => {
                    expect(res.header.location).toContain('accounts.google.com');
                });
        });
    });

    describe('POST /auth/refresh', () => {
        it('should return new access token with valid refresh token', async () => {
            return request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken: mockRefreshToken })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(typeof res.body.accessToken).toBe('string');
                });
        });

        it('should return 401 for invalid refresh token', async () => {
            return request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken: 'invalid-token-123' })
                .expect(401);
        });
    });

    describe('GET /auth/me', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .get('/auth/me')
                .expect(401);
        });

        it('should return 401 with invalid token', () => {
            return request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should return user profile with valid token', async () => {
            return request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${mockAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id', mockUser.id);
                    expect(res.body).toHaveProperty('email', mockUser.email);
                    expect(res.body).toHaveProperty('displayName', mockUser.displayName);
                });
        });
    });

    describe('GET /auth/validate', () => {
        it('should validate a valid token', () => {
            return request(app.getHttpServer())
                .get('/auth/validate')
                .set('Authorization', `Bearer ${mockAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('isValid');
                    expect(res.body.isValid).toBe(true);
                });
        });

        it('should reject an invalid token', () => {
            return request(app.getHttpServer())
                .get('/auth/validate')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should reject request without token', () => {
            return request(app.getHttpServer())
                .get('/auth/validate')
                .expect(401);
        });
    });

    describe('POST /auth/logout', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .post('/auth/logout')
                .expect(401);
        });

        it('should logout successfully with valid token', () => {
            return request(app.getHttpServer())
                .post('/auth/logout')
                .set('Authorization', `Bearer ${mockAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('message');
                    expect(res.body.message).toBe('Sesión cerrada exitosamente');
                });
        });
    });
});
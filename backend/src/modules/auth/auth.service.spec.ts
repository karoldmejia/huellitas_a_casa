import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
    let service: AuthService;
    let usersService: UsersService;
    let jwtService: JwtService;
    let userRepository: Repository<User>;

    const mockUser: User = {
        id: '123',
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: 'https://example.com/photo.jpg',
        role: UserRole.USER,
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    // Mock de UsersService con tipos correctos
    const mockUsersService = {
        findByGoogleId: jest.fn<Promise<User | null>, [string]>().mockResolvedValue(mockUser),
        findByEmail: jest.fn<Promise<User | null>, [string]>().mockResolvedValue(mockUser),
        create: jest.fn<Promise<User>, [any]>().mockResolvedValue(mockUser),
        linkGoogleAccount: jest.fn<Promise<User>, [string, any]>().mockResolvedValue(mockUser),
        updateLastLogin: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
        findById: jest.fn<Promise<User | null>, [string]>().mockResolvedValue(mockUser),
        save: jest.fn<Promise<User>, [User]>().mockResolvedValue(mockUser),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: jest.fn(),
                        verifyAsync: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-secret'),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
        jwtService = module.get<JwtService>(JwtService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateOAuthUser', () => {
        const googleUser = {
            googleId: 'google-123',
            email: 'test@example.com',
            displayName: 'Test User',
            photoUrl: 'https://example.com/photo.jpg',
        };

        it('should return existing user by googleId', async () => {
            // Configurar mocks específicos para este test
            mockUsersService.findByGoogleId.mockResolvedValueOnce(mockUser);
            mockUsersService.updateLastLogin.mockResolvedValueOnce(undefined);

            const result = await service.validateOAuthUser(googleUser);

            expect(result).toEqual(mockUser);
            expect(mockUsersService.findByGoogleId).toHaveBeenCalledWith(googleUser.googleId);
            expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
        });

        it('should link google account to existing user by email', async () => {
            // Configurar mocks: NO existe por googleId, SÍ existe por email
            mockUsersService.findByGoogleId.mockResolvedValueOnce(null);
            mockUsersService.findByEmail.mockResolvedValueOnce(mockUser);
            mockUsersService.linkGoogleAccount.mockResolvedValueOnce(mockUser);
            mockUsersService.updateLastLogin.mockResolvedValueOnce(undefined);

            const result = await service.validateOAuthUser(googleUser);

            expect(result).toEqual(mockUser);
            expect(mockUsersService.findByGoogleId).toHaveBeenCalledWith(googleUser.googleId);
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith(googleUser.email);
            expect(mockUsersService.linkGoogleAccount).toHaveBeenCalledWith(mockUser.id, {
                googleId: googleUser.googleId,
                displayName: googleUser.displayName,
                photoUrl: googleUser.photoUrl,
            });
            expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
        });

        it('should create new user if not exists', async () => {
            // Configurar mocks: NO existe por googleId, NO existe por email
            mockUsersService.findByGoogleId.mockResolvedValueOnce(null);
            mockUsersService.findByEmail.mockResolvedValueOnce(null);
            mockUsersService.create.mockResolvedValueOnce(mockUser);
            mockUsersService.updateLastLogin.mockResolvedValueOnce(undefined);

            const result = await service.validateOAuthUser(googleUser);

            expect(result).toEqual(mockUser);
            expect(mockUsersService.findByGoogleId).toHaveBeenCalledWith(googleUser.googleId);
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith(googleUser.email);
            expect(mockUsersService.create).toHaveBeenCalledWith({
                ...googleUser,
                role: UserRole.USER,
            });
            expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
        });
    });

    describe('login', () => {
        it('should return access token and refresh token', async () => {
            const mockAccessToken = 'mock-access-token';
            const mockRefreshToken = 'mock-refresh-token';

            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.signAsync
                .mockResolvedValueOnce(mockAccessToken)
                .mockResolvedValueOnce(mockRefreshToken);

            const result = await service.login(mockUser);

            expect(result).toEqual({
                accessToken: mockAccessToken,
                refreshToken: mockRefreshToken,
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    displayName: mockUser.displayName,
                    photoUrl: mockUser.photoUrl,
                    role: mockUser.role,
                    isActive: mockUser.isActive,
                    lastLogin: mockUser.lastLogin,
                    createdAt: mockUser.createdAt,
                },
            });
            expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(2);
        });
    });

    describe('refreshToken', () => {
        it('should refresh access token', async () => {
            const refreshToken = 'valid-refresh-token';
            const mockPayload = {
                sub: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
                type: 'refresh',
            };
            const newAccessToken = 'new-access-token';

            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.verifyAsync.mockResolvedValueOnce(mockPayload);
            mockUsersService.findById.mockResolvedValueOnce(mockUser);
            jwtServiceMock.signAsync.mockResolvedValueOnce(newAccessToken);

            const result = await service.refreshToken(refreshToken);

            expect(result).toEqual({ accessToken: newAccessToken });
            expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(refreshToken, expect.any(Object));
            expect(mockUsersService.findById).toHaveBeenCalledWith(mockUser.id);
            expect(jwtServiceMock.signAsync).toHaveBeenCalled();
        });

        it('should throw error for invalid refresh token', async () => {
            const refreshToken = 'invalid-token';

            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

            await expect(service.refreshToken(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw error if user not found', async () => {
            const refreshToken = 'valid-refresh-token';
            const mockPayload = {
                sub: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
                type: 'refresh',
            };

            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.verifyAsync.mockResolvedValueOnce(mockPayload);
            mockUsersService.findById.mockResolvedValueOnce(null);

            await expect(service.refreshToken(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw error if token is not a refresh token', async () => {
            const refreshToken = 'valid-token-but-not-refresh';
            const mockPayload = {
                sub: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
                type: 'access', // <-- No es refresh
            };

            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.verifyAsync.mockResolvedValueOnce(mockPayload);

            await expect(service.refreshToken(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });

    describe('validateToken', () => {
        it('should return true for valid token', async () => {
            const token = 'valid-token';
            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.verifyAsync.mockResolvedValueOnce({});

            const result = await service.validateToken(token);

            expect(result).toBe(true);
            expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(token);
        });

        it('should return false for invalid token', async () => {
            const token = 'invalid-token';
            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.verifyAsync.mockRejectedValueOnce(new Error());

            const result = await service.validateToken(token);

            expect(result).toBe(false);
        });
    });

    describe('getUserFromToken', () => {
        it('should return user from valid token', async () => {
            const token = 'valid-token';
            const mockPayload = { sub: mockUser.id };
            
            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.verifyAsync.mockResolvedValueOnce(mockPayload);
            mockUsersService.findById.mockResolvedValueOnce(mockUser);

            const result = await service.getUserFromToken(token);

            expect(result).toEqual(mockUser);
            expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(token);
            expect(mockUsersService.findById).toHaveBeenCalledWith(mockUser.id);
        });

        it('should return null for invalid token', async () => {
            const token = 'invalid-token';
            const jwtServiceMock = jest.mocked(jwtService);
            jwtServiceMock.verifyAsync.mockRejectedValueOnce(new Error());

            const result = await service.getUserFromToken(token);

            expect(result).toBeNull();
        });
    });

    describe('getUserStats', () => {
        it('should return user stats', async () => {
            mockUsersService.findById.mockResolvedValueOnce(mockUser);

            const result = await service.getUserStats(mockUser.id);

            expect(result).toEqual({
                userId: mockUser.id,
                displayName: mockUser.displayName,
                email: mockUser.email,
                memberSince: mockUser.createdAt,
            });
            expect(mockUsersService.findById).toHaveBeenCalledWith(mockUser.id);
        });

        it('should throw error if user not found', async () => {
            mockUsersService.findById.mockResolvedValueOnce(null);

            await expect(service.getUserStats('invalid-id')).rejects.toThrow(
                UnauthorizedException,
            );
            expect(mockUsersService.findById).toHaveBeenCalledWith('invalid-id');
        });
    });
});
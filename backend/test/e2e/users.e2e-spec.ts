// test/e2e/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { User, UserRole } from '../../src/modules/users/entities/user.entity';
import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';

// Mocks
const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    displayName: 'Admin User',
    googleId: 'admin-google-123',
    photoUrl: 'https://example.com/admin.jpg',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
};

const mockRegularUser = {
    id: 'user-456',
    email: 'user@example.com',
    displayName: 'Regular User',
    googleId: 'user-google-456',
    photoUrl: 'https://example.com/user.jpg',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
};

const mockUsersList = [mockAdminUser, mockRegularUser];

const mockConfigService = {
    get: jest.fn((key: string) => {
        const config: Record<string, any> = {
            'jwt.secret': 'test-secret-key-for-jest-min-32-characters-here',
            'jwt.expiresIn': '7d',
        };
        return config[key];
    }),
};

const mockUsersService = {
    findAll: jest.fn().mockResolvedValue({
        data: mockUsersList,
        total: mockUsersList.length,
        page: 1,
        limit: 10,
        totalPages: 1,
    }),
    findById: jest.fn().mockImplementation((id: string) => {
        if (id === mockAdminUser.id) return Promise.resolve(mockAdminUser);
        if (id === mockRegularUser.id) return Promise.resolve(mockRegularUser);
        if (id === 'non-existent-id') return Promise.resolve(null);
        // Para cualquier otro ID, devolver null (404)
        return Promise.resolve(null);
    }),
    update: jest.fn().mockImplementation((id: string, data: any) => {
        if (id !== mockAdminUser.id && id !== mockRegularUser.id) {
            return Promise.resolve(null);
        }
        const user = id === mockAdminUser.id ? mockAdminUser : mockRegularUser;
        return Promise.resolve({ ...user, ...data });
    }),
    deactivate: jest.fn().mockResolvedValue(undefined),
    reactivate: jest.fn().mockImplementation((id: string) => {
        if (id !== mockAdminUser.id && id !== mockRegularUser.id) {
            return Promise.resolve(null);
        }
        const user = id === mockAdminUser.id ? mockAdminUser : mockRegularUser;
        return Promise.resolve({ ...user, isActive: true });
    }),
};

const mockAuthService = {
    validateToken: jest.fn().mockResolvedValue(true),
};

describe('UsersController (e2e)', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let adminAccessToken: string;
    let userAccessToken: string;

    beforeAll(async () => {
        process.env.JWT_SECRET = 'test-secret-key-for-jest-min-32-characters-here';
        process.env.JWT_EXPIRES_IN = '7d';
        process.env.NODE_ENV = 'test';

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                PassportModule.register({ defaultStrategy: 'jwt' }),
                JwtModule.register({
                    secret: process.env.JWT_SECRET,
                    signOptions: { expiresIn: '7d' },
                }),
            ],
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn().mockResolvedValue(mockRegularUser),
                        save: jest.fn().mockResolvedValue(mockRegularUser),
                        delete: jest.fn().mockResolvedValue({ affected: 1 }),
                    },
                },
                JwtStrategy,
                JwtAuthGuard,
                RolesGuard,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
        }));

        jwtService = moduleFixture.get<JwtService>(JwtService);

        // Generar tokens para admin y usuario regular
        const adminPayload = {
            sub: mockAdminUser.id,
            email: mockAdminUser.email,
            role: mockAdminUser.role,
        };
        const userPayload = {
            sub: mockRegularUser.id,
            email: mockRegularUser.email,
            role: mockRegularUser.role,
        };

        adminAccessToken = await jwtService.signAsync(adminPayload, { expiresIn: '7d' });
        userAccessToken = await jwtService.signAsync(userPayload, { expiresIn: '7d' });

        await app.init();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    describe('GET /users', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .get('/users')
                .expect(401);
        });

        it('should return 403 for non-admin user', () => {
            return request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${userAccessToken}`)
                .expect(403);
        });

        it('should return users list for admin', () => {
            return request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('data');
                    expect(res.body).toHaveProperty('total');
                    expect(res.body).toHaveProperty('page');
                    expect(res.body).toHaveProperty('limit');
                    expect(res.body.data).toBeInstanceOf(Array);
                    expect(res.body.data.length).toBeGreaterThan(0);
                });
        });

        it('should filter users by role', () => {
            return request(app.getHttpServer())
                .get('/users?role=ADMIN')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('data');
                });
        });

        it('should filter users by isActive', () => {
            return request(app.getHttpServer())
                .get('/users?isActive=true')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('data');
                });
        });

        it('should search users by term', () => {
            return request(app.getHttpServer())
                .get('/users?search=admin')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('data');
                });
        });
    });

    describe('GET /users/:id', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .get(`/users/${mockAdminUser.id}`)
                .expect(401);
        });

        it('should return 403 for non-admin user', () => {
            return request(app.getHttpServer())
                .get(`/users/${mockAdminUser.id}`)
                .set('Authorization', `Bearer ${userAccessToken}`)
                .expect(403);
        });

        it('should return user for admin', () => {
            return request(app.getHttpServer())
                .get(`/users/${mockAdminUser.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id', mockAdminUser.id);
                    expect(res.body).toHaveProperty('email', mockAdminUser.email);
                    expect(res.body).toHaveProperty('displayName', mockAdminUser.displayName);
                });
        });

        it('should return 404 for non-existent user', () => {
            return request(app.getHttpServer())
                .get('/users/non-existent-id')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(404);
        });
    });

    describe('PUT /users/me', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .put('/users/me')
                .send({ displayName: 'Updated Name' })
                .expect(401);
        });

        it('should update own profile', () => {
            return request(app.getHttpServer())
                .put('/users/me')
                .set('Authorization', `Bearer ${userAccessToken}`)
                .send({ displayName: 'Updated Name' })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('displayName', 'Updated Name');
                });
        });

        it('should not allow non-admin to change role', () => {
            return request(app.getHttpServer())
                .put('/users/me')
                .set('Authorization', `Bearer ${userAccessToken}`)
                .send({ role: UserRole.ADMIN })
                .expect(403);
        });
    });

    describe('PUT /users/:id (admin only)', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .put(`/users/${mockRegularUser.id}`)
                .send({ displayName: 'Admin Updated' })
                .expect(401);
        });

        it('should return 403 for non-admin user', () => {
            return request(app.getHttpServer())
                .put(`/users/${mockRegularUser.id}`)
                .set('Authorization', `Bearer ${userAccessToken}`)
                .send({ displayName: 'Admin Updated' })
                .expect(403);
        });

        it('should update user for admin', () => {
            return request(app.getHttpServer())
                .put(`/users/${mockRegularUser.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send({ displayName: 'Admin Updated' })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('displayName', 'Admin Updated');
                });
        });

        // AGREGADO: Test para usuario no existente
        it('should return 404 for non-existent user', () => {
            return request(app.getHttpServer())
                .put('/users/non-existent-id')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send({ displayName: 'Admin Updated' })
                .expect(404);
        });
    });

    describe('DELETE /users/me', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .delete('/users/me')
                .expect(401);
        });

        it('should deactivate own account', () => {
            return request(app.getHttpServer())
                .delete('/users/me')
                .set('Authorization', `Bearer ${userAccessToken}`)
                .expect(204);
        });
    });

    describe('DELETE /users/:id (admin only)', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .delete(`/users/${mockRegularUser.id}`)
                .expect(401);
        });

        it('should return 403 for non-admin user', () => {
            return request(app.getHttpServer())
                .delete(`/users/${mockRegularUser.id}`)
                .set('Authorization', `Bearer ${userAccessToken}`)
                .expect(403);
        });

        it('should deactivate user for admin', () => {
            return request(app.getHttpServer())
                .delete(`/users/${mockRegularUser.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(204);
        });

        // AGREGADO: Test para usuario no existente
        it('should return 404 for non-existent user', () => {
            return request(app.getHttpServer())
                .delete('/users/non-existent-id')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(404);
        });
    });

    describe('POST /users/:id/reactivate (admin only)', () => {
        it('should return 401 without token', () => {
            return request(app.getHttpServer())
                .post(`/users/${mockRegularUser.id}/reactivate`)
                .expect(401);
        });

        it('should return 403 for non-admin user', () => {
            return request(app.getHttpServer())
                .post(`/users/${mockRegularUser.id}/reactivate`)
                .set('Authorization', `Bearer ${userAccessToken}`)
                .expect(403);
        });

        it('should reactivate user for admin', () => {
            return request(app.getHttpServer())
                .post(`/users/${mockRegularUser.id}/reactivate`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('isActive', true);
                });
        });

        it('should return 404 for non-existent user', () => {
            return request(app.getHttpServer())
                .post('/users/non-existent-id/reactivate')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(404);
        });
    });
});
import { config } from 'dotenv';
import { resolve } from 'path';

// Primero, cargar .env.test
const envPath = resolve(__dirname, '../.env.test');
console.log(`Cargando variables de entorno desde: ${envPath}`);
const result = config({ path: envPath });

if (result.error) {
    console.warn('No se pudo cargar .env.test, usando variables de entorno existentes');
}

// Establecer valores por defecto si no existen
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3001';

// JWT
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest-min-32-characters-here';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Google OAuth
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback';

// Database
process.env.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT || '5432';
process.env.DATABASE_USERNAME = process.env.DATABASE_USERNAME || 'test_user';
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'test_password';
process.env.DATABASE_NAME = process.env.DATABASE_NAME || 'test_db';

// Frontend
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Verificar variables críticas
const requiredVars = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'];
const missingVars = requiredVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
    console.warn(`Variables faltantes: ${missingVars.join(', ')}`);
    console.warn('Usando valores mock para pruebas');
}

console.log('Variables de entorno para pruebas cargadas');

// Configurar timeout global
jest.setTimeout(30000);

// Mock de console para reducir ruido en pruebas
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};
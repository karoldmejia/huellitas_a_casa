export default () => ({
    port: parseInt(process.env.PORT!, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT!, 10) || 5432,
        username: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'huellitas_db',
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
});
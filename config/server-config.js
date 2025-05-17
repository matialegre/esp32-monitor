// Configuración del servidor
const config = {
  // Configuración de la base de datos
  db: {
    dialect: 'sqlite',
    storage: './data/database.sqlite',
    logging: false
  },
  
  // Configuración del servidor web
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  
  // Configuración de autenticación
  auth: {
    jwtSecret: 'clave_secreta_para_jwt_en_desarrollo',
    jwtExpiresIn: '24h',
    adminUsername: 'admin',
    adminPassword: 'admin123'
  },
  
  // Configuración de WebSocket
  websocket: {
    path: '/ws',
    port: 3001
  },
  
  // Configuración de CORS
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};

module.exports = config;

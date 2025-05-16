export default {
  // Configuración del servidor
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // Configuración de sesión
  session: {
    secret: process.env.SESSION_SECRET || 'tu_secreto_muy_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  },
  
  // Configuración de JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'otro_secreto_muy_seguro',
    expiresIn: '24h'
  },
  
  // Configuración de la base de datos
  database: {
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  },
  
  // Configuración de WebSocket
  ws: {
    path: '/ws',
    port: process.env.WS_PORT || 8080
  },
  
  // Configuración de MQTT
  mqtt: {
    topic: 'bme280/data'
  }
};

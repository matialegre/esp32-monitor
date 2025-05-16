import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import WebSocket from 'ws';
import db from './models/index.js';
import apiRoutes from './routes/api.js';
import config from './config.js';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar la aplicación Express
const app = express();
const server = http.createServer(app);

// Configuración de WebSocket para sensores
const wss = new WebSocket.Server({ server, path: '/ws/sensors' });

// Configuración de Socket.IO para el chat
const io = new Server(server, {
  path: '/ws/chat',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión
app.use(session({
  secret: config.session.secret,
  resave: config.session.resave,
  saveUninitialized: config.session.saveUninitialized,
  cookie: config.session.cookie
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
app.use('/api', apiRoutes);

// Manejar rutas de la aplicación cliente (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Almacenar conexiones WebSocket de sensores
const sensorClients = new Set();

// Manejar conexiones WebSocket de sensores
wss.on('connection', (ws, req) => {
  console.log('Nuevo cliente de sensor conectado');
  sensorClients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Datos del sensor recibidos:', data);
      
      // Reenviar datos a todos los clientes de la interfaz web
      io.emit('sensor_data', data);
    } catch (error) {
      console.error('Error al procesar mensaje del sensor:', error);
    }
  });

  ws.on('close', () => {
    console.log('Cliente de sensor desconectado');
    sensorClients.delete(ws);
  });
});

// Manejar conexiones de Socket.IO para el chat
io.on('connection', (socket) => {
  console.log('Nuevo cliente de chat conectado:', socket.id);

  // Unirse a la sala global
  socket.join('global');

  // Manejar mensajes de chat
  socket.on('chat_message', async (data) => {
    try {
      // Aquí podrías guardar el mensaje en la base de datos
      console.log('Mensaje de chat recibido:', data);
      
      // Reenviar el mensaje a todos los clientes en la sala global
      io.to('global').emit('chat_message', {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error al procesar mensaje de chat:', error);
    }
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log('Cliente de chat desconectado:', socket.id);
  });
});

// Almacenar la instancia de io en la aplicación para usarla en los controladores
app.set('io', io);

// Inicializar la base de datos y luego iniciar el servidor
const initServer = async () => {
  try {
    // Sincronizar modelos con la base de datos
    await db.sequelize.sync();
    console.log('Base de datos sincronizada');
    
    // Iniciar el servidor
    const PORT = config.port || 3000;
    const HOST = config.host || '0.0.0.0';
    
    server.listen(PORT, HOST, () => {
      console.log(`Servidor iniciado en http://${HOST}:${PORT}`);
      console.log(`WebSocket de sensores disponible en ws://${HOST}:${PORT}/ws/sensors`);
      console.log(`WebSocket de chat disponible en ws://${HOST}:${PORT}/ws/chat`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no manejado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar el servidor
initServer();

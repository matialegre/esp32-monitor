const WebSocket = require('ws');
const http = require('http');

// Crear servidor HTTP
const server = http.createServer((req, res) => {
  // Manejar peticiones HTTP
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server Running');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Configurar WebSocket
const wss = new WebSocket.Server({
  server,
  path: '/ws',
  verifyClient: (info, callback) => {
    console.log('Verificando cliente:', info.origin);
    callback(true); // Permitir todas las conexiones
  }
});

// Manejar la conexión WebSocket
wss.on('connection', function connection(ws, req) {
  console.log('Cliente conectado desde:', req.connection.remoteAddress);
  
  ws.on('message', function incoming(message) {
    console.log('Mensaje recibido:', message);
    try {
      const data = JSON.parse(message);
      console.log('Procesando mensaje:', data);
      
      switch (data.action) {
        case 'join_room':
          handleJoinRoom(ws, data.room);
          break;
        case 'send_message':
          handleSendMessage(ws, data.room, data.message, data.sender);
          break;
        case 'subscribe':
          handleSubscribe(ws, data.topic);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
    // Eliminar cliente de todas las salas
    for (const [room, clients] of clientsByRoom.entries()) {
      const index = clients.indexOf(ws);
      if (index > -1) {
        clients.splice(index, 1);
      }
    }
  });
});

// Iniciar el servidor
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Servidor escuchando en puerto', port);
});

wss.on('connection', function connection(ws, req) {
  console.log('Cliente conectado desde:', req.connection.remoteAddress);
  
  ws.on('message', function incoming(message) {
    console.log('Mensaje recibido:', message);
    try {
      const data = JSON.parse(message);
      console.log('Procesando mensaje:', data);
      
      switch (data.action) {
        case 'join_room':
          handleJoinRoom(ws, data.room);
          break;
        case 'send_message':
          handleSendMessage(ws, data.room, data.message, data.sender);
          break;
        case 'subscribe':
          handleSubscribe(ws, data.topic);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
    // Eliminar cliente de todas las salas
    for (const [room, clients] of clientsByRoom.entries()) {
      const index = clients.indexOf(ws);
      if (index > -1) {
        clients.splice(index, 1);
      }
    }
  });
});

// Iniciar el servidor
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Servidor escuchando en puerto', port);
});

// Crear servidor WebSocket
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

// Manejar la conexión WebSocket
wss.on('connection', function connection(ws, req) {
  console.log('Cliente conectado');
  
  ws.on('message', function incoming(message) {
    console.log('Mensaje recibido:', message);
    try {
      const data = JSON.parse(message);
      console.log('Procesando mensaje:', data);
      
      switch (data.action) {
        case 'join_room':
          handleJoinRoom(ws, data.room);
          break;
        case 'send_message':
          handleSendMessage(ws, data.room, data.message, data.sender);
          break;
        case 'subscribe':
          handleSubscribe(ws, data.topic);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
    // Eliminar cliente de todas las salas
    for (const [room, clients] of clientsByRoom.entries()) {
      const index = clients.indexOf(ws);
      if (index > -1) {
        clients.splice(index, 1);
      }
    }
  });
});

// Iniciar el servidor
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Servidor HTTP escuchando en puerto', port);
});

// Habilitar CORS para permitir conexiones desde cualquier origen
wss.on('headers', (headers, req) => {
  headers.push('Access-Control-Allow-Origin: *');
  headers.push('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  headers.push('Access-Control-Allow-Headers: Content-Type');
});

// Manejar la ruta / para mostrar el archivo index.html
const http = require('http');
const path = require('path');
const fs = require('fs');

const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

httpServer.listen(process.env.PORT || 3000, () => {
  console.log('HTTP server listening on port ' + (process.env.PORT || 3000));
});

// Habilitar CORS para permitir conexiones desde cualquier origen
wss.on('headers', (headers, req) => {
  headers.push('Access-Control-Allow-Origin: *');
  headers.push('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  headers.push('Access-Control-Allow-Headers: Content-Type');
});

// Mantener un registro de clientes por sala
const clientsByRoom = new Map();

wss.on('connection', function connection(ws) {
  console.log('Cliente conectado');
  
  ws.on('message', function incoming(message) {
    console.log('Mensaje recibido:', message);
    try {
      const data = JSON.parse(message);
      console.log('Procesando mensaje:', data);
      
      switch (data.action) {
        case 'join_room':
          handleJoinRoom(ws, data.room);
          break;
        case 'send_message':
          handleSendMessage(ws, data.room, data.message, data.sender);
          break;
        case 'subscribe':
          handleSubscribe(ws, data.topic);
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
    // Eliminar cliente de todas las salas
    for (const [room, clients] of clientsByRoom.entries()) {
      const index = clients.indexOf(ws);
      if (index > -1) {
        clients.splice(index, 1);
      }
    }
  });
});

function handleJoinRoom(ws, room) {
  if (!clientsByRoom.has(room)) {
    clientsByRoom.set(room, []);
  }
  clientsByRoom.get(room).push(ws);
  console.log(`Cliente unido a la sala: ${room}`);
}

function handleSendMessage(ws, room, message, sender) {
  console.log(`Mensaje enviado en sala ${room}: ${message}`);
  
  if (clientsByRoom.has(room)) {
    const clients = clientsByRoom.get(room);
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'message',
          message: message,
          sender: sender
        }));
      }
    });
  }
}

function handleSubscribe(ws, topic) {
  console.log('Cliente suscrito al topic:', topic);
  
  // Simular datos de sensor
  const sensorData = {
    temperature: Math.random() * 30 + 20,  // Temperatura aleatoria entre 20 y 50
    humidity: Math.random() * 60 + 40,     // Humedad aleatoria entre 40 y 100
    pressure: Math.random() * 20 + 1000    // Presión aleatoria entre 1000 y 1020
  };
  
  // Enviar datos simulados
  ws.send(JSON.stringify({
    type: 'sensor_data',
    data: sensorData
  }));
}

// Simular datos de sensor cada 5 segundos
setInterval(() => {
  const sensorData = {
    temperature: Math.random() * 30 + 20,
    humidity: Math.random() * 60 + 40,
    pressure: Math.random() * 20 + 1000
  };
  
  // Enviar a todos los clientes suscritos
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'sensor_data',
        data: sensorData
      }));
    }
  });
}, 5000);

console.log('Servidor WebSocket escuchando en ws://localhost:8080');
console.log('Abrir en el navegador: http://localhost:8000/chat.html');
console.log('Compartir en WhatsApp: https://wa.me/?text=http://localhost:8000/chat.html');

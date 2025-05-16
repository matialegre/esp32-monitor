const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Crear servidor HTTP
const server = http.createServer((req, res) => {
  // Servir archivos estáticos
  let filePath = path.join(__dirname, req.url === '/' ? '/public/index.html' : '/public' + req.url);
  const extname = path.extname(filePath);
  
  // Mapear extensiones a tipos MIME
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

  // Configurar el tipo de contenido
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Leer el archivo
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Archivo no encontrado
        fs.readFile('./public/404.html', (error, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        // Error del servidor
        res.writeHead(500);
        res.end('Error del servidor: ' + error.code);
      }
    } else {
      // Archivo encontrado
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Configurar WebSocket
const wss = new WebSocket.Server({ server, path: '/ws' });

// Manejar conexiones WebSocket
wss.on('connection', (ws, req) => {
  console.log('Nueva conexión WebSocket');
  
  // Manejar mensajes del cliente
  ws.on('message', (message) => {
    console.log('Mensaje recibido:', message);
    // Reenviar el mensaje a todos los clientes conectados
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  
  // Manejar cierre de conexión
  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor HTTP y WebSocket iniciado en el puerto ${PORT}`);
  console.log(`WebSocket disponible en ws://localhost:${PORT}/ws`);
});

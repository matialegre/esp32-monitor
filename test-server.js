const WebSocket = require('ws');
const http = require('http');

// Crear servidor HTTP
const server = http.createServer((req, res) => {
  console.log('HTTP request:', req.url);
  
  // Mostrar los headers recibidos
  console.log('Headers:', req.headers);
  
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('WebSocket Server Running');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Crear servidor WebSocket
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

wss.on('connection', function connection(ws, req) {
  console.log('Cliente conectado');
  console.log('Headers de conexión:', req.headers);
  
  ws.on('message', function incoming(message) {
    console.log('Mensaje recibido:', message);
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciar el servidor
const port = 3000;
server.listen(port, () => {
  console.log('Servidor escuchando en puerto', port);
});

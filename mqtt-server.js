const express = require('express');
const WebSocket = require('ws');
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Manejar conexiones WebSocket
wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');
  
  ws.on('message', (message) => {
    console.log('Mensaje recibido:', message.toString());
    
    try {
      const data = JSON.parse(message.toString());
      console.log('Procesando mensaje:', data);
      
      if (data.action === 'subscribe') {
        console.log('Cliente suscrito al topic:', data.topic);
        // Aquí podríamos guardar el cliente en una lista de suscriptores
      }
      
      // Simular datos de sensor
      const sensorData = {
        temperature: Math.random() * 30 + 20,  // Temperatura aleatoria entre 20 y 50
        humidity: Math.random() * 60 + 40,     // Humedad aleatoria entre 40 y 100
        pressure: Math.random() * 20 + 1000    // Presión aleatoria entre 1000 y 1020
      };
      
      // Enviar datos simulados
      ws.send(JSON.stringify(sensorData));
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      ws.send(JSON.stringify({ error: error.message }));
    }
  });
});

// Configuración del servidor WebSocket
wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');
  
  ws.on('message', (message) => {
    console.log('Mensaje WebSocket recibido:', message.toString());
    
    // Publicar mensaje en MQTT
    const data = JSON.parse(message.toString());
    mqttBroker.publish(data.topic, data.message);
  });
});

// Configuración del servidor HTTP
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

// Configuración del servidor MQTT
mqttBroker.listen(1883, () => {
  console.log('Servidor MQTT escuchando en puerto 1883');
});

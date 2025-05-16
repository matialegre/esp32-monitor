// Replace with your actual VAPID public key
const publicVapidKey = '<TU_PUBLIC_VAPID_KEY>';

// WebSocket configuration
const wsUrl = 'ws://esp32-monitor-production.up.railway.app:3000/ws'; // Servidor Railway público
let socket = null;

// Constants for sensor cards
const temperatureCard = document.getElementById('temperatureCard');
const humidityCard = document.getElementById('humidityCard');
const pressureCard = document.getElementById('pressureCard');
const statusDiv = document.getElementById('status');

if ('serviceWorker' in navigator) {
  init();
}

async function init() {
  try {
    const reg = await navigator.serviceWorker.register('service-worker.js');
    console.log('Service Worker registrado');
    document.getElementById('subscribeBtn').addEventListener('click', () => subscribe(reg));
    
    // Initialize WebSocket connection
    connectWebSocket();
  } catch (err) {
    console.error('Error SW:', err);
    setStatus('Error al registrar el Service Worker', 'error');
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function subscribe(reg) {
  try {
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
    
    // Send subscription to backend (Node-RED)
    await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    
    setStatus('Notificaciones activadas', 'success');
  } catch (err) {
    console.error('Error subscribe:', err);
    setStatus('Error al activar notificaciones', 'error');
  }
}

function setStatus(message, type = 'success') {
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  
  // Clear status after 5 seconds
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status-message';
  }, 5000);
}

function connectWebSocket() {
  console.log('Intentando conectar a:', wsUrl);
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('WebSocket conectado exitosamente');
    console.log('Enviando suscripción al topic bme280/data');
    socket.send(JSON.stringify({
      topic: 'bme280/data',
      action: 'subscribe'
    }));
    setStatus('Conectado al servidor', 'success');
  };
  
  socket.onmessage = (event) => {
    console.log('Mensaje recibido:', event.data);
    try {
      const data = JSON.parse(event.data);
      console.log('Datos procesados:', data);
      
      // Actualizar cada sensor individualmente
      const tempValue = temperatureCard.querySelector('.sensor-value');
      if (tempValue) {
        tempValue.textContent = data.temperature.toFixed(1);
        console.log('Actualizando temperatura:', data.temperature);
      }
      
      const humidityValue = humidityCard.querySelector('.sensor-value');
      if (humidityValue) {
        humidityValue.textContent = data.humidity.toFixed(1);
        console.log('Actualizando humedad:', data.humidity);
      }
      
      const pressureValue = pressureCard.querySelector('.sensor-value');
      if (pressureValue) {
        pressureValue.textContent = data.pressure.toFixed(1);
        console.log('Actualizando presión:', data.pressure);
      }
      
      // Agregar animación
      [tempValue, humidityValue, pressureValue].forEach(value => {
        if (value) {
          value.classList.add('fade-in');
          setTimeout(() => value.classList.remove('fade-in'), 500);
        }
      });
    } catch (error) {
      console.error('Error al procesar datos:', error);
      setStatus('Error al procesar datos', 'error');
    }
  };
  
  socket.onclose = (event) => {
    console.log('WebSocket desconectado', event);
    console.log('Código:', event.code, 'Razón:', event.reason);
    setStatus('Desconectado del servidor', 'error');
    // Try to reconnect after 5 seconds
    setTimeout(connectWebSocket, 5000);
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    setStatus('Error en la conexión', 'error');
  };
}

function updateSensorData(data) {
  // Update temperature
  const tempValue = temperatureCard.querySelector('.sensor-value');
  tempValue.textContent = data.temperature.toFixed(1);
  
  // Update humidity
  const humidityValue = humidityCard.querySelector('.sensor-value');
  humidityValue.textContent = data.humidity.toFixed(1);
  
  // Update pressure
  const pressureValue = pressureCard.querySelector('.sensor-value');
  pressureValue.textContent = data.pressure.toFixed(1);
  
  // Add animation class
  [tempValue, humidityValue, pressureValue].forEach(value => {
    value.classList.add('fade-in');
    setTimeout(() => value.classList.remove('fade-in'), 500);
  });
}

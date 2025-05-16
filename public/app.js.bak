// Configuración de la aplicación
const CONFIG = {
  // Clave pública VAPID de ejemplo (reemplazar con la tuya en producción)
  publicVapidKey: 'BIz3mXNvzXjLdTQbQ7n8fX5qA1Xz2JhY4KpLmN9bVcXz3RtY6vBn8s7dFgT5yHjU8iK9oLp0oP',
  // URL del servidor WebSocket
  wsUrl: 'wss://esp32-monitor-production.up.railway.app/ws',
  // Tema MQTT
  mqttTopic: 'bme280/data',
  // Intervalo de actualización de datos en milisegundos
  updateInterval: 5000
};

// Variables globales
let socket = null;
let chart = null;
let isConnected = false;

// Elementos de la interfaz
const elements = {
  temperature: document.getElementById('temperature'),
  humidity: document.getElementById('humidity'),
  pressure: document.getElementById('pressure'),
  tempTime: document.getElementById('temp-time'),
  humidityTime: document.getElementById('humidity-time'),
  pressureTime: document.getElementById('pressure-time'),
  lastUpdate: document.getElementById('lastUpdate'),
  status: document.getElementById('status'),
  connectionStatus: document.getElementById('connectionStatus'),
  statusText: document.querySelector('.status-text'),
  statusDot: document.querySelector('.status-dot')
};

// Datos para el gráfico
const chartData = {
  labels: [],
  temperature: [],
  humidity: [],
  pressure: []
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
  
  // Inicializar con datos de ejemplo
  generateMockData();
  
  // Iniciar actualización periódica
  setInterval(updateMockData, CONFIG.updateInterval);
});

// Inicializar la aplicación
async function initApp() {
  // Registrar Service Worker para notificaciones push
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('ServiceWorker registrado con éxito:', registration.scope);
      setupPushNotifications(registration);
    } catch (error) {
      console.error('Error al registrar el Service Worker:', error);
      setStatus('Error al configurar notificaciones push', 'error');
    }
  } else {
    console.log('Service Workers no soportados en este navegador');
  }
  
  // Iniciar conexión WebSocket
  connectWebSocket();
  
  // Inicializar gráfico
  initChart();
}

// Configurar notificaciones push
async function setupPushNotifications(registration) {
  if (!('PushManager' in window)) {
    console.log('Push notifications no soportadas');
    return;
  }
  
  const subscribeBtn = document.getElementById('subscribeBtn');
  if (!subscribeBtn) return;
  
  subscribeBtn.addEventListener('click', async () => {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(CONFIG.publicVapidKey)
        });
        
        console.log('Suscripción exitosa:', subscription);
        setStatus('Notificaciones activadas', 'success');
        
        // Aquí deberías enviar la suscripción a tu servidor
        // await fetch('/api/subscribe', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(subscription)
        // });
        
      } else {
        setStatus('Se requieren permisos para notificaciones', 'warning');
      }
    } catch (error) {
      console.error('Error al suscribirse a notificaciones:', error);
      setStatus('Error al activar notificaciones', 'error');
    }
  });
}

// Convertir clave base64 a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  try {
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error('Error al decodificar la clave VAPID:', e);
    throw new Error('La clave VAPID no es válida');
  }
}

// Conectar al WebSocket
function connectWebSocket() {
  console.log('Conectando a WebSocket:', CONFIG.wsUrl);
  updateConnectionStatus('Conectando...', 'connecting');
  
  socket = new WebSocket(CONFIG.wsUrl);
  
  socket.onopen = () => {
    console.log('Conexión WebSocket establecida');
    isConnected = true;
    updateConnectionStatus('Conectado', 'connected');
    
    // Suscribirse al tema MQTT
    const subscribeMsg = JSON.stringify({
      type: 'subscribe',
      topic: CONFIG.mqttTopic
    });
    
    socket.send(subscribeMsg);
    console.log('Suscrito al tema:', CONFIG.mqttTopic);
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Datos recibidos:', data);
      updateSensorData(data);
    } catch (error) {
      console.error('Error al procesar datos:', error);
    }
  };
  
  socket.onerror = (error) => {
    console.error('Error en WebSocket:', error);
    updateConnectionStatus('Error de conexión', 'error');
    isConnected = false;
  };
  
  socket.onclose = () => {
    console.log('Conexión WebSocket cerrada');
    updateConnectionStatus('Desconectado', 'disconnected');
    isConnected = false;
    
    // Reconectar después de 5 segundos
    setTimeout(connectWebSocket, 5000);
  };
}

// Actualizar la interfaz con los datos del sensor
function updateSensorData(data) {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  
  // Actualizar temperatura
  if (data.temperature !== undefined) {
    elements.temperature.textContent = data.temperature.toFixed(1);
    elements.tempTime.textContent = timeString;
    updateChartData('temperature', data.temperature, now);
  }
  
  // Actualizar humedad
  if (data.humidity !== undefined) {
    elements.humidity.textContent = data.humidity.toFixed(1);
    elements.humidityTime.textContent = timeString;
    updateChartData('humidity', data.humidity, now);
  }
  
  // Actualizar presión (convertir de Pa a hPa)
  if (data.pressure !== undefined) {
    const pressureHpa = data.pressure / 100;
    elements.pressure.textContent = pressureHpa.toFixed(1);
    elements.pressureTime.textContent = timeString;
    updateChartData('pressure', pressureHpa, now);
  }
  
  // Actualizar última actualización
  elements.lastUpdate.textContent = `Última actualización: ${timeString}`;
  
  // Actualizar gráfico
  updateChart();
}

// Actualizar los datos del gráfico
function updateChartData(type, value, timestamp) {
  const timeLabel = timestamp.toLocaleTimeString();
  
  // Agregar nuevo dato
  chartData[type].push({
    x: timeLabel,
    y: value
  });
  
  // Mantener un máximo de 20 puntos de datos
  if (chartData[type].length > 20) {
    chartData[type].shift();
  }
  
  // Actualizar etiquetas (usamos la misma para todos los conjuntos de datos)
  if (type === 'temperature') {
    chartData.labels.push(timeLabel);
    if (chartData.labels.length > 20) {
      chartData.labels.shift();
    }
  }
}

// Inicializar el gráfico
function initChart() {
  const ctx = document.getElementById('sensorChart').getContext('2d');
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Temperatura (°C)',
          data: chartData.temperature,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Humedad (%)',
          data: chartData.humidity,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        },
        {
          label: 'Presión (hPa)',
          data: chartData.pressure,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          tension: 0.1,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false
        },
        x: {
          display: true,
          title: {
            display: true,
            text: 'Hora'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Tendencias de los Sensores'
        }
      },
      animation: {
        duration: 1000
      }
    }
  });
}

// Actualizar el gráfico
function updateChart() {
  if (!chart) return;
  
  chart.update();
}

// Generar datos de ejemplo para pruebas
function generateMockData() {
  const now = new Date();
  
  // Generar 10 puntos de datos iniciales
  for (let i = 0; i < 10; i++) {
    const time = new Date(now.getTime() - (10 - i) * 60000);
    const mockData = {
      temperature: 20 + Math.random() * 10, // 20-30°C
      humidity: 40 + Math.random() * 30,    // 40-70%
      pressure: 98000 + Math.random() * 5000 // 980-1030 hPa
    };
    
    updateChartData('temperature', mockData.temperature, time);
    updateChartData('humidity', mockData.humidity, time);
    updateChartData('pressure', mockData.pressure / 100, time);
  }
  
  // Actualizar la interfaz con el último punto de datos
  updateSensorData({
    temperature: 25 + Math.random() * 5,
    humidity: 50 + Math.random() * 20,
    pressure: 100000 + Math.random() * 3000
  });
}

// Actualizar datos de ejemplo periódicamente
function updateMockData() {
  if (!isConnected) {
    const mockData = {
      temperature: 25 + Math.random() * 5,
      humidity: 50 + Math.random() * 20,
      pressure: 100000 + Math.random() * 3000
    };
    updateSensorData(mockData);
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Botón de suscripción a notificaciones
  const subscribeBtn = document.getElementById('subscribeBtn');
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', () => {
      if (Notification.permission === 'granted') {
        setStatus('Ya estás suscrito a las notificaciones', 'success');
      } else if (Notification.permission !== 'denied') {
        setStatus('Por favor, acepta las notificaciones cuando se te solicite', 'info');
      }
    });
  }
  
  // Actualizar manualmente
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type: 'get_latest' });
        socket.send(message);
        setStatus('Solicitando datos actualizados...', 'info');
      } else {
        updateMockData();
        setStatus('Datos de ejemplo actualizados', 'info');
      }
    });
  }
}

// Actualizar el estado de la conexión
function updateConnectionStatus(message, status) {
  if (elements.statusText) elements.statusText.textContent = message;
  
  // Actualizar clases de estado
  const statusClasses = ['connected', 'disconnected', 'error', 'connecting'];
  if (elements.statusDot) {
    statusClasses.forEach(cls => elements.statusDot.classList.remove(cls));
    elements.statusDot.classList.add(status);
  }
  
  // Actualizar mensaje de estado
  setStatus(message, status);
}

// Mostrar mensaje de estado
function setStatus(message, type = 'info') {
  if (!elements.status) return;
  
  elements.status.textContent = message;
  
  // Actualizar clases de estado
  const statusClasses = ['info', 'success', 'warning', 'error'];
  statusClasses.forEach(cls => elements.status.classList.remove(cls));
  elements.status.classList.add(type);
  
  // Ocultar después de 5 segundos si no es un error
  if (type !== 'error') {
    setTimeout(() => {
      if (elements.status && elements.status.textContent === message) {
        elements.status.classList.remove('show');
      }
    }, 5000);
  } else {
    elements.status.classList.add('show');
  }
}

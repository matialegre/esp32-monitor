// Configuración de la aplicación
const CONFIG = {
  // Clave pública VAPID de ejemplo (reemplazar con la tuya en producción)
  publicVapidKey: 'BIz3mXNvzXjLdTQbQ7n8fX5qA1Xz2JhY4KpLmN9bVcXz3RtY6vBn8s7dFgT5yHjU8iK9oLp0oP',
  // URL base de la API
  apiUrl: window.location.origin,
  // URL del WebSocket para sensores
  wsSensorUrl: `ws://${window.location.host}/ws/sensors`,
  // URL del WebSocket para chat
  wsChatUrl: `ws://${window.location.host}/ws/chat`,
  // Tema MQTT
  mqttTopic: 'bme280/data',
  // Intervalo de actualización de datos en milisegundos
  updateInterval: 5000,
  // Tiempo de expiración del token (24 horas)
  tokenExpiration: 24 * 60 * 60 * 1000
};

// Variables globales
let socket = null;
let chatSocket = null;
let chart = null;
let isConnected = false;
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Elementos de la interfaz
const elements = {
  // Elementos de autenticación
  authContainer: document.getElementById('authContainer'),
  appContainer: document.getElementById('appContainer'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  toggleAuthBtn: document.getElementById('toggleAuthBtn'),
  authTitle: document.getElementById('authTitle'),
  logoutBtn: document.getElementById('logoutBtn'),
  
  // Elementos de sensores
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
  statusDot: document.querySelector('.status-dot'),
  
  // Elementos de chat
  chatMessages: document.getElementById('chatMessages'),
  chatForm: document.getElementById('chatForm'),
  messageInput: document.getElementById('messageInput')
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
  // Cargar Toastify para notificaciones
  const toastifyScript = document.createElement('script');
  toastifyScript.src = 'https://cdn.jsdelivr.net/npm/toastify-js';
  document.head.appendChild(toastifyScript);
  
  // Cargar Socket.IO
  const socketIoScript = document.createElement('script');
  socketIoScript.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
  document.head.appendChild(socketIoScript);
  
  // Esperar a que se carguen las dependencias
  Promise.all([
    new Promise(resolve => toastifyScript.onload = resolve),
    new Promise(resolve => socketIoScript.onload = resolve)
  ]).then(() => {
    // Inicializar la aplicación
    setupEventListeners();
    checkAuth();
    
    // Inicializar con datos de ejemplo si es necesario
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      generateMockData();
      setInterval(updateMockData, CONFIG.updateInterval);
    }
  });
});

// Verificar autenticación
function checkAuth() {
  const token = localStorage.getItem('authToken');
  
  if (token) {
    // Verificar si el token es válido
    const tokenData = parseJwt(token);
    const isExpired = tokenData.exp * 1000 < Date.now();
    
    if (isExpired) {
      // Token expirado, cerrar sesión
      logout();
    } else {
      // Token válido, cargar datos del usuario
      loadUserProfile(token);
    }
  } else {
    // No hay token, mostrar formulario de inicio de sesión
    showAuth();
  }
}

// Cargar perfil del usuario
async function loadUserProfile(token) {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      showApp();
      connectWebSockets();
    } else {
      throw new Error('Error al cargar el perfil del usuario');
    }
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    showToast('Error al cargar el perfil', 'error');
    logout();
  }
}

// Mostrar interfaz de autenticación
function showAuth() {
  elements.appContainer.style.display = 'none';
  elements.authContainer.style.display = 'flex';
  
  // Limpiar formularios
  if (elements.loginForm) elements.loginForm.reset();
  if (elements.registerForm) elements.registerForm.reset();
  
  // Mostrar formulario de inicio de sesión por defecto
  if (elements.loginForm) elements.loginForm.style.display = 'block';
  if (elements.registerForm) elements.registerForm.style.display = 'none';
  if (elements.authTitle) elements.authTitle.textContent = 'Iniciar Sesión';
}

// Mostrar aplicación
function showApp() {
  elements.authContainer.style.display = 'none';
  elements.appContainer.style.display = 'block';
  
  // Inicializar gráfico
  initChart();
  
  // Conectar WebSockets
  connectWebSockets();
}

// Cerrar sesión
function logout() {
  // Cerrar conexiones WebSocket
  if (socket) {
    socket.close();
    socket = null;
  }
  
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
  }
  
  // Eliminar token y datos de usuario
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  
  // Mostrar formulario de autenticación
  showAuth();
  
  // Mostrar mensaje de cierre de sesión
  showToast('Sesión cerrada correctamente', 'success');
}

// Conectar WebSockets
function connectWebSockets() {
  // Conectar WebSocket para sensores
  connectSensorWebSocket();
  
  // Conectar WebSocket para chat
  connectChatWebSocket();
}

// Conectar WebSocket para sensores
function connectSensorWebSocket() {
  if (socket) {
    socket.close();
  }
  
  socket = new WebSocket(CONFIG.wsSensorUrl);
  
  socket.onopen = () => {
    console.log('Conexión WebSocket de sensores establecida');
    updateConnectionStatus('Conectado', 'success');
    isConnected = true;
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      updateSensorData(data);
      updateChartData('all', data);
    } catch (error) {
      console.error('Error al procesar datos del sensor:', error);
    }
  };
  
  socket.onclose = () => {
    console.log('Conexión WebSocket de sensores cerrada');
    updateConnectionStatus('Desconectado', 'error');
    isConnected = false;
    
    // Intentar reconectar después de 5 segundos
    setTimeout(connectSensorWebSocket, 5000);
  };
  
  socket.onerror = (error) => {
    console.error('Error en la conexión WebSocket de sensores:', error);
    updateConnectionStatus('Error de conexión', 'error');
  };
}

// Conectar WebSocket para chat
function connectChatWebSocket() {
  if (!window.io) {
    console.error('Socket.IO no está cargado');
    return;
  }
  
  if (chatSocket) {
    chatSocket.disconnect();
  }
  
  // Configurar Socket.IO con el token de autenticación
  chatSocket = window.io({
    path: '/ws/chat',
    auth: {
      token: authToken
    }
  });
  
  // Manejar eventos de conexión
  chatSocket.on('connect', () => {
    console.log('Conectado al chat');
    loadChatMessages();
  });
  
  // Manejar mensajes entrantes
  chatSocket.on('chat_message', (message) => {
    addMessageToChat(message);
  });
  
  // Manejar errores de autenticación
  chatSocket.on('connect_error', (error) => {
    console.error('Error de conexión al chat:', error);
    if (error.message === 'Authentication error') {
      showToast('Error de autenticación. Por favor, inicia sesión nuevamente.', 'error');
      logout();
    }
  });
}

// Cargar mensajes del chat
async function loadChatMessages() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/messages`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const messages = await response.json();
      elements.chatMessages.innerHTML = ''; // Limpiar mensajes actuales
      messages.forEach(message => addMessageToChat(message));
      scrollChatToBottom();
    } else {
      throw new Error('Error al cargar los mensajes');
    }
  } catch (error) {
    console.error('Error al cargar mensajes:', error);
    showToast('Error al cargar los mensajes', 'error');
  }
}

// Enviar mensaje de chat
async function sendChatMessage(content) {
  if (!content.trim()) return;
  
  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      throw new Error('Error al enviar el mensaje');
    }
    
    // El mensaje se agregará al chat cuando llegue a través del WebSocket
    elements.messageInput.value = '';
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    showToast('Error al enviar el mensaje', 'error');
  }
}

// Agregar mensaje al chat
function addMessageToChat(message) {
  if (!elements.chatMessages) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = `message ${message.userId === currentUser?.id ? 'own-message' : ''}`;
  
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageElement.innerHTML = `
    <div class="message-header">
      <span class="message-username">${message.User?.username || 'Usuario'}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content">${escapeHtml(message.content)}</div>
  `;
  
  elements.chatMessages.appendChild(messageElement);
  scrollChatToBottom();
}

// Desplazar el chat hacia abajo
function scrollChatToBottom() {
  if (elements.chatMessages) {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }
}

// Escapar HTML para prevenir XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Mostrar notificación
function showToast(message, type = 'info') {
  if (!window.Toastify) {
    console.log(`[${type}] ${message}`);
    return;
  }
  
  Toastify({
    text: message,
    duration: 3000,
    gravity: 'top',
    position: 'right',
    className: `toastify-${type}`,
    stopOnFocus: true
  }).showToast();
}

// Analizar token JWT
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

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
  
  socket.onerror = (error) => {
    console.error('Error en la conexión WebSocket:', error);
    updateConnectionStatus('Error de conexión', 'error');
  };
}

// Actualizar la interfaz con los datos del sensor
function updateSensorData(data) {
  if (!data) return;
  
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  
  // Actualizar temperatura
  if (data.temperature !== undefined) {
    elements.temperature.textContent = `${data.temperature.toFixed(1)}°C`;
    elements.tempTime.textContent = `Actualizado: ${timeString}`;
  }
  
  // Actualizar humedad
  if (data.humidity !== undefined) {
    elements.humidity.textContent = `${data.humidity.toFixed(1)}%`;
    elements.humidityTime.textContent = `Actualizado: ${timeString}`;
  }
  
  // Actualizar presión
  if (data.pressure !== undefined) {
    // Convertir hPa a mmHg para mayor legibilidad
    const pressureMmHg = data.pressure * 0.750062;
    elements.pressure.textContent = `${pressureMmHg.toFixed(1)} mmHg`;
    elements.pressureTime.textContent = `Actualizado: ${timeString}`;
  }
  
  // Actualizar última actualización
  elements.lastUpdate.textContent = `Última actualización: ${now.toLocaleString()}`;
  
  // Actualizar estado de conexión
  updateConnectionStatus('Conectado', 'success');
}

// Actualizar los datos del gráfico
function updateChartData(type, data) {
  if (!chart) return;
  
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  
  // Limitar el número de puntos en el gráfico
  const maxPoints = 30;
  
  // Actualizar etiquetas
  chartData.labels.push(timeString);
  if (chartData.labels.length > maxPoints) {
    chartData.labels.shift();
  }
  
  // Actualizar datos según el tipo
  if (type === 'all' || type === 'temperature') {
    if (data.temperature !== undefined) {
      chartData.temperature.push(data.temperature);
      if (chartData.temperature.length > maxPoints) {
        chartData.temperature.shift();
      }
    }
  }
  
  if (type === 'all' || type === 'humidity') {
    if (data.humidity !== undefined) {
      chartData.humidity.push(data.humidity);
      if (chartData.humidity.length > maxPoints) {
        chartData.humidity.shift();
      }
    }
  }
  
  if (type === 'all' || type === 'pressure') {
    if (data.pressure !== undefined) {
      chartData.pressure.push(data.pressure);
      if (chartData.pressure.length > maxPoints) {
        chartData.pressure.shift();
      }
    }
  }
  
  // Actualizar el gráfico
  updateChart(type === 'all' ? null : type);
}

// Inicializar el gráfico
function initChart() {
  const ctx = document.getElementById('sensorChart').getContext('2d');
  
  // Configuración del gráfico
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temperatura (°C)',
          data: [],
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderWidth: 2,
          tension: 0.1,
          fill: false,
          yAxisID: 'y'
        },
        {
          label: 'Humedad (%)',
          data: [],
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderWidth: 2,
          tension: 0.1,
          fill: false,
          yAxisID: 'y1'
        },
        {
          label: 'Presión (hPa)',
          data: [],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          tension: 0.1,
          fill: false,
          yAxisID: 'y2',
          hidden: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Datos del Sensor en Tiempo Real',
          font: {
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.dataset.label.includes('Temperatura')) {
                  label += context.parsed.y.toFixed(1) + '°C';
                } else if (context.dataset.label.includes('Humedad')) {
                  label += context.parsed.y.toFixed(1) + '%';
                } else {
                  label += context.parsed.y.toFixed(2) + ' hPa';
                }
              }
              return label;
            }
          }
        },
        legend: {
          position: 'top',
          onClick: function(e, legendItem, legend) {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            const meta = ci.getDatasetMeta(index);
            
            // Solo permitir alternar la visibilidad para presión
            if (index === 2) { // Índice del conjunto de datos de presión
              meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
              ci.update();
            }
          }
        }
      },
      scales: {
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
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Temperatura (°C)'
          },
          min: 0,
          max: 40
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Humedad (%)'
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false
          }
        },
        y2: {
          type: 'linear',
          display: false,
          position: 'right',
          title: {
            display: true,
            text: 'Presión (hPa)'
          },
          min: 900,
          max: 1100,
          grid: {
            drawOnChartArea: false
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      elements: {
        point: {
          radius: 0,
          hitRadius: 10,
          hoverRadius: 5
        }
      },
      spanGaps: true
    }
  });
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
  // Controladores para los botones del gráfico
  const chartButtons = {
    'tempChartBtn': 'temperature',
    'humidityChartBtn': 'humidity',
    'pressureChartBtn': 'pressure'
  };

  // Agregar event listeners a los botones del gráfico
  Object.entries(chartButtons).forEach(([buttonId, chartType]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        updateChart(chartType);
      });
    }
  });

  // Manejar el botón de notificaciones push
  const subscribeBtn = document.getElementById('subscribeBtn');
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // La lógica de suscripción se maneja en setupPushNotifications
    });
  }

  // Manejar el formulario de inicio de sesión
  if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const response = await fetch(`${CONFIG.apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Guardar token y datos del usuario
          authToken = data.token;
          localStorage.setItem('authToken', authToken);
          currentUser = data.user;

          // Mostrar aplicación y conectar WebSockets
          showApp();
          connectWebSockets();

          // Mostrar mensaje de bienvenida
          showToast(`Bienvenido, ${currentUser.username}!`, 'success');
        } else {
          throw new Error(data.message || 'Error al iniciar sesión');
        }
      } catch (error) {
        console.error('Error al iniciar sesión:', error);
        showToast(error.message || 'Error al iniciar sesión', 'error');
      }
    });
  }

  // Manejar el formulario de registro
  if (elements.registerForm) {
    elements.registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('registerUsername').value;
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
      }

      try {
        const response = await fetch(`${CONFIG.apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Mostrar mensaje de éxito y cambiar a la vista de inicio de sesión
          showToast('¡Registro exitoso! Por favor inicia sesión', 'success');

          // Cambiar a la vista de inicio de sesión
          if (elements.toggleAuthBtn) {
            elements.toggleAuthBtn.click();
          }
        } else {
          throw new Error(data.message || 'Error al registrar el usuario');
        }
      } catch (error) {
        console.error('Error al registrar el usuario:', error);
        showToast(error.message || 'Error al registrar el usuario', 'error');
      }
    });
  }

  // Manejar el botón de alternar entre inicio de sesión y registro
  if (elements.toggleAuthBtn) {
    elements.toggleAuthBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isLogin = elements.loginForm.style.display !== 'none';

      if (isLogin) {
        // Cambiar a registro
        elements.loginForm.style.display = 'none';
        elements.registerForm.style.display = 'block';
        elements.authTitle.textContent = 'Crear Cuenta';
        elements.toggleAuthBtn.textContent = '¿Ya tienes cuenta? Inicia Sesión';
      } else {
        // Cambiar a inicio de sesión
        elements.loginForm.style.display = 'block';
        elements.registerForm.style.display = 'none';
        elements.authTitle.textContent = 'Iniciar Sesión';
        elements.toggleAuthBtn.textContent = '¿No tienes cuenta? Regístrate';
      }
    });
  }

  // Manejar el botón de cerrar sesión
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Manejar el envío de mensajes de chat
  if (elements.chatForm) {
    elements.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = elements.messageInput.value.trim();
      if (message) {
        sendChatMessage(message);
      }
    });
  }

  // Permitir enviar mensajes con Enter (sin enviar con Shift+Enter)
  if (elements.messageInput) {
    elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = elements.messageInput.value.trim();
        if (message) {
          sendChatMessage(message);
        }
      }
    });
  }

  // Manejar errores de conexión WebSocket
  if (socket) {
    socket.onerror = (error) => {
      console.error('Error en la conexión WebSocket:', error);
      updateConnectionStatus('Error de conexión', 'error');
    };
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
  const statusElement = document.getElementById('status');
  if (!statusElement) return;
  
  // Actualizar el texto y la clase CSS
  statusElement.textContent = message;
  statusElement.className = 'status';
  
  // Agregar clase según el tipo de mensaje
  switch (type) {
    case 'success':
      statusElement.classList.add('success');
      break;
    case 'error':
      statusElement.classList.add('error');
      break;
    case 'warning':
      statusElement.classList.add('warning');
      break;
    default:
      statusElement.classList.add('info');
  }
  
  // Ocultar el mensaje después de 5 segundos
  setTimeout(() => {
    statusElement.textContent = '';
    statusElement.className = 'status';
  }, 5000);
}

// Actualizar el gráfico según el tipo de datos seleccionado
function updateChart(type = null) {
  if (!chart) return;
  
  // Si no se especifica un tipo, usar los datos actuales
  if (!type) {
    // Actualizar las etiquetas
    chart.data.labels = chartData.labels;
    
    // Actualizar los conjuntos de datos
    chart.data.datasets[0].data = chartData.temperature;
    chart.data.datasets[1].data = chartData.humidity;
    chart.data.datasets[2].data = chartData.pressure;
    
    // Mostrar/ocultar series según corresponda
    chart.data.datasets[2].hidden = true; // Ocultar presión por defecto
    
  } else {
    // Mostrar solo el tipo de datos seleccionado
    const showTemperature = type === 'temperature';
    const showHumidity = type === 'humidity';
    const showPressure = type === 'pressure';
    
    // Actualizar visibilidad de las series
    chart.data.datasets[0].hidden = !showTemperature;
    chart.data.datasets[1].hidden = !showHumidity;
    chart.data.datasets[2].hidden = !showPressure;
    
    // Actualizar las etiquetas del eje Y según el tipo de datos
    const tempAxis = chart.options.scales.y;
    const humAxis = chart.options.scales.y1;
    const pressAxis = chart.options.scales.y2;
    
    if (showTemperature) {
      tempAxis.display = true;
      humAxis.display = false;
      pressAxis.display = false;
      tempAxis.position = 'left';
    } else if (showHumidity) {
      tempAxis.display = false;
      humAxis.display = true;
      pressAxis.display = false;
      humAxis.position = 'left';
    } else if (showPressure) {
      tempAxis.display = false;
      humAxis.display = false;
      pressAxis.display = true;
      pressAxis.position = 'left';
    }
  }
  
  // Actualizar el gráfico
  chart.update({
    duration: 800,
    easing: 'easeInOutQuart'
  });
  
  // Actualizar los botones de control
  updateChartButtons(type);
}

// Actualizar el estado de los botones del gráfico
function updateChartButtons(activeType) {
  const buttons = {
    'tempChartBtn': 'temperature',
    'humidityChartBtn': 'humidity',
    'pressureChartBtn': 'pressure',
    'allChartBtn': 'all'
  };
  
  Object.entries(buttons).forEach(([buttonId, chartType]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      if (chartType === activeType || (!activeType && chartType === 'all')) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
      
      // Agregar manejador de clic si no existe
      if (!button.dataset.hasClickHandler) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          updateChart(chartType === 'all' ? null : chartType);
        });
        button.dataset.hasClickHandler = 'true';
      }
    }
  });
}

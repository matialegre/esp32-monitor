class Chat {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    this.messageInput = document.getElementById('messageInput');
    this.chatMessages = document.getElementById('chatMessages');
    this.chatForm = document.getElementById('chatForm');
    this.loginForm = document.getElementById('loginForm');
    this.registerForm = document.getElementById('registerForm');
    this.chatContainer = document.getElementById('chatContainer');
    this.authContainer = document.getElementById('authContainer');
    this.toggleAuthBtn = document.getElementById('toggleAuthBtn');
    this.authTitle = document.getElementById('authTitle');
    this.isLoginView = true;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Toggle entre login y registro
    if (this.toggleAuthBtn) {
      this.toggleAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleAuthView();
      });
    }

    // Enviar mensaje
    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => this.handleSendMessage(e));
    }

    // Iniciar sesión
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Registrarse
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  }


  toggleAuthView() {
    this.isLoginView = !this.isLoginView;
    
    if (this.isLoginView) {
      this.loginForm.style.display = 'block';
      this.registerForm.style.display = 'none';
      this.authTitle.textContent = 'Iniciar Sesión';
      this.toggleAuthBtn.textContent = '¿No tienes cuenta? Regístrate';
    } else {
      this.loginForm.style.display = 'none';
      this.registerForm.style.display = 'block';
      this.authTitle.textContent = 'Crear Cuenta';
      this.toggleAuthBtn.textContent = '¿Ya tienes cuenta? Inicia Sesión';
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.currentUser = data.user;
        this.initializeSocket(data.token);
        this.showChat();
      } else {
        this.showMessage(data.error || 'Error al iniciar sesión', 'error');
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      this.showMessage('Error al conectar con el servidor', 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
      this.showMessage('Las contraseñas no coinciden', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.currentUser = data.user;
        this.initializeSocket(data.token);
        this.showChat();
      } else {
        this.showMessage(data.error || 'Error al registrar el usuario', 'error');
      }
    } catch (error) {
      console.error('Error al registrar el usuario:', error);
      this.showMessage('Error al conectar con el servidor', 'error');
    }
  }

  showChat() {
    this.authContainer.style.display = 'none';
    this.chatContainer.style.display = 'block';
    this.loadMessages();
  }

  showAuth() {
    this.authContainer.style.display = 'block';
    this.chatContainer.style.display = 'none';
  }

  initializeSocket(token) {
    // Cerrar conexión anterior si existe
    if (this.socket) {
      this.socket.disconnect();
    }
    
    // Conectar a Socket.IO con el token de autenticación
    this.socket = io({
      path: '/ws/chat',
      auth: { token }
    });
    
    // Escuchar nuevos mensajes
    this.socket.on('chat_message', (message) => {
      this.addMessage(message);
    });
    
    // Escuchar mensajes eliminados
    this.socket.on('delete_message', (data) => {
      const messageElement = document.getElementById(`message-${data.id}`);
      if (messageElement) {
        messageElement.remove();
      }
    });
    
    // Manejar errores de conexión
    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión con el servidor de chat:', error);
      this.showMessage('Error al conectar con el servidor de chat', 'error');
    });
  }

  async loadMessages() {
    try {
      const response = await fetch('/api/messages');
      const messages = await response.json();
      
      if (response.ok) {
        this.chatMessages.innerHTML = '';
        messages.forEach(message => this.addMessage(message));
        this.scrollToBottom();
      } else {
        this.showMessage('Error al cargar los mensajes', 'error');
      }
    } catch (error) {
      console.error('Error al cargar los mensajes:', error);
      this.showMessage('Error al cargar los mensajes', 'error');
    }
  }

  async handleSendMessage(e) {
    e.preventDefault();
    
    const content = this.messageInput.value.trim();
    
    if (!content) return;
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.socket.auth.token}`
        },
        body: JSON.stringify({ content })
      });
      
      if (response.ok) {
        this.messageInput.value = '';
      } else {
        const data = await response.json();
        this.showMessage(data.error || 'Error al enviar el mensaje', 'error');
      }
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      this.showMessage('Error al conectar con el servidor', 'error');
    }
  }

  addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.id = `message-${message.id}`;
    messageElement.className = `message ${message.userId === this.currentUser?.id ? 'own-message' : ''}`;
    
    const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-username">${message.User?.username || 'Usuario'}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-content">${this.escapeHtml(message.content)}</div>
    `;
    
    this.chatMessages.appendChild(messageElement);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  showMessage(message, type = 'info') {
    // Implementar un sistema de notificaciones
    console.log(`[${type}] ${message}`);
    // Aquí podrías mostrar un mensaje en la interfaz
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Inicializar el chat cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new Chat();
});

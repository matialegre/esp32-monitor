import db from '../models/index.js';

export const getMessages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const messages = await db.Message.findAll({
      include: [{
        model: db.User,
        attributes: ['id', 'username']
      }],
      order: [['createdAt', 'DESC']],
      limit: Math.min(limit, 100) // Limitar a 100 mensajes como máximo
    });
    
    // Ordenar por fecha ascendente para el cliente
    const sortedMessages = messages.reverse();
    
    res.json(sortedMessages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error al obtener los mensajes' });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }
    
    const message = await db.Message.create({
      content: content.trim(),
      userId
    });
    
    // Obtener el mensaje con la información del usuario
    const messageWithUser = await db.Message.findByPk(message.id, {
      include: [{
        model: db.User,
        attributes: ['id', 'username']
      }]
    });
    
    // Emitir el nuevo mensaje a través de WebSocket
    if (req.app.get('io')) {
      req.app.get('io').emit('new_message', messageWithUser);
    }
    
    res.status(201).json(messageWithUser);
  } catch (error) {
    console.error('Error al crear mensaje:', error);
    res.status(500).json({ error: 'Error al crear el mensaje' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const message = await db.Message.findByPk(id);
    
    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }
    
    // Solo el propietario puede eliminar el mensaje
    if (message.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este mensaje' });
    }
    
    await message.destroy();
    
    // Notificar a los clientes a través de WebSocket
    if (req.app.get('io')) {
      req.app.get('io').emit('delete_message', { id });
    }
    
    res.json({ message: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json({ error: 'Error al eliminar el mensaje' });
  }
};

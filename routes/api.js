import { Router } from 'express';
import { authenticateToken } from '../auth.js';
import * as authController from '../controllers/authController.js';
import * as messageController from '../controllers/messageController.js';

const router = Router();

// Rutas de autenticación
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getProfile);

// Rutas de mensajes
router.get('/messages', authenticateToken, messageController.getMessages);
router.post('/messages', authenticateToken, messageController.createMessage);
router.delete('/messages/:id', authenticateToken, messageController.deleteMessage);

export default router;

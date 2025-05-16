import jwt from 'jsonwebtoken';
import db from './models/index.js';
import config from './config.js';

// Middleware para verificar el token JWT
export const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    
    req.user = user;
    next();
  });
};

// Middleware para verificar si el usuario está autenticado
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'No autorizado' });
};

// Función para generar token JWT
export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Middleware para verificar credenciales de usuario
export const verifyUser = async (username, password, done) => {
  try {
    const user = await db.User.scope('withPassword').findOne({ where: { username } });
    
    if (!user) {
      return done(null, false, { message: 'Usuario no encontrado' });
    }
    
    const isValid = await user.validPassword(password);
    
    if (!isValid) {
      return done(null, false, { message: 'Contraseña incorrecta' });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
};

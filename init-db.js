import db from './models/index.js';
import bcrypt from 'bcryptjs';

const initDatabase = async () => {
  try {
    // Sincronizar modelos con la base de datos
    await db.sequelize.sync({ force: true });
    console.log('Base de datos sincronizada');
    
    // Crear un usuario de prueba
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.User.create({
      username: 'admin',
      password: hashedPassword
    });
    
    console.log('Usuario de prueba creado:');
    console.log('Usuario: admin');
    console.log('Contraseña: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
};

initDatabase();

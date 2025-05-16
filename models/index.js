import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './User.js';
import Message from './Message.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de la base de datos SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

// Inicializar modelos
const db = {
  User: User(sequelize, Sequelize.DataTypes),
  Message: Message(sequelize, Sequelize.DataTypes),
  sequelize,
  Sequelize
};

// Relaciones
db.Message.belongsTo(db.User, { foreignKey: 'userId' });
db.User.hasMany(db.Message, { foreignKey: 'userId' });

export default db;

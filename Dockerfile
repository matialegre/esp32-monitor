FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./


# Instalar dependencias
RUN npm install --production

# Copiar el resto de los archivos
COPY . .

# Puerto expuesto
EXPOSE 8080

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

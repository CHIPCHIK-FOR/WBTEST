# 1. Базовый образ Node.js
FROM node:20-alpine

# 2. Указываем рабочую директорию внутри контейнера
WORKDIR /usr/src/app

# 3. Копируем package.json и package-lock.json
COPY package*.json ./

# 4. Устанавливаем зависимости
RUN npm install

# 5. Копируем всё остальное
COPY . .

# 6. Открываем порт
EXPOSE 3001

# 7. Запускаем миграции и стартуем сервер
CMD ["sh", "-c", "npx knex migrate:latest --knexfile src/db/knexfile.js && node src/app.js"]

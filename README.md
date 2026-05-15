# 📱 Personal Planner - Telegram Web App

Полнофункциональное приложение для управления спринтами, неделями и ежедневными задачами в Telegram.

## ✨ Возможности

### 🎯 Спринты (90 дней)
- Создание 90-дневных спринтов
- Управление глобальными целями
- Отслеживание событий спринта
- Визуальный прогресс (%)

### 📅 Недели
- Еженедельное планирование
- Задачи с приоритизацией (высокий, средний, низкий)
- Автоматическое группирование по категориям
- Отслеживание выполнения

### 📝 Ежедневник
- 3-5 главных задач на день
- Управление привычками
- Отслеживание серий (streaks)
- Метрики: вода, шаги, калории
- Инсайты в конце дня

### 🤖 Уведомления
- ☀️ Утреннее напоминание (по умолчанию 7:00)
- 📊 Вечерний итог (по умолчанию 21:00)
- 💪 Мотивирующие сообщения
- 🔔 Уведомления в Telegram

## 🚀 Быстрый старт

### Требования
- Node.js 16+
- MongoDB Atlas (бесплатный tier)
- Telegram Bot Token (BotFather)

### Шаг 1: Подготовка Telegram Bot

1. Откройте @BotFather в Telegram
2. Команда: `/newbot`
3. Следуйте инструкциям, получите TOKEN
4. Сохраните TOKEN (нужен позже)

### Шаг 2: Подготовка MongoDB

1. Зайдите на https://mongodb.com/cloud/atlas
2. Создайте бесплатный аккаунт
3. Создайте новый проект
4. Создайте кластер (M0 - бесплатный)
5. Получите строку подключения (Connection String)
6. Скопируйте в безопасное место

### Шаг 3: Развертывание Backend

#### Вариант A: Railway (рекомендуется)

1. Зайдите на https://railway.app
2. Нажмите "Start New Project"
3. Выберите "Deploy from GitHub" или загрузите репозиторий
4. В Settings добавьте переменные окружения:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   MONGODB_URI=your_mongodb_connection_string
   WEBAPP_URL=https://your-deployed-app.vercel.app
   PORT=3000
   ```
5. Нажмите Deploy

#### Вариант B: Heroku (с платежной картой)

1. Создайте аккаунт на heroku.com
2. `heroku login`
3. `heroku create your-app-name`
4. `heroku config:set TELEGRAM_BOT_TOKEN=xxx`
5. `heroku config:set MONGODB_URI=xxx`
6. `git push heroku main`

#### Вариант C: Локально (для тестирования)

```bash
# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env
# Отредактируйте .env с вашими значениями

# Запуск
npm start
```

### Шаг 4: Развертывание Frontend

#### Вариант A: Vercel (рекомендуется)

```bash
# Установка Vercel CLI
npm i -g vercel

# Развертывание
vercel
```

Добавьте переменную окружения:
```
REACT_APP_API_URL=https://your-railway-app.up.railway.app
```

#### Вариант B: Netlify

```bash
# Установка зависимостей
npm install

# Build
npm run build

# Развертывание
netlify deploy --prod --dir=build
```

#### Вариант C: GitHub Pages

```bash
# В package.json добавьте:
"homepage": "https://yourusername.github.io/planner"

# Затем:
npm run build
npm run deploy
```

### Шаг 5: Настройка Telegram Bot

1. Откройте свой бот в Telegram
2. Отправьте команду `/start`
3. Нажмите на кнопку "Открыть приложение"
4. Приложение должно загрузиться в Web App

## 📋 Структура проекта

```
├── server.js              # Express backend
├── package.json           # Backend зависимости
├── src/
│   ├── App.jsx           # Главный компонент
│   ├── components/
│   │   ├── SprintView.jsx
│   │   ├── WeekView.jsx
│   │   └── DailyView.jsx
│   └── styles/
│       ├── App.css
│       ├── SprintView.css
│       ├── WeekView.css
│       └── DailyView.css
├── public/
│   ├── index.html
│   └── manifest.json
└── README.md
```

## 🔧 API Endpoints

### Sprint
- `POST /api/sprint` - Создать спринт
- `GET /api/sprint/:userId` - Получить спринт
- `POST /api/sprint/:sprintId/event` - Добавить событие

### Week
- `POST /api/week` - Создать неделю
- `GET /api/week/:weekId` - Получить неделю
- `GET /api/week/current/:userId` - Получить текущую неделю

### Daily Tasks
- `POST /api/daily-task` - Создать ежедневные задачи
- `GET /api/daily-task/:userId/:date` - Получить задачи на дату
- `PATCH /api/daily-task/:taskId` - Обновить задачу

### Stats & Motivation
- `GET /api/stats/:userId/:weekId` - Статистика недели
- `GET /api/motivation` - Получить мотивирующее сообщение

## 🛠️ Переменные окружения

Создайте `.env` файл в root папке:

```
# Telegram
TELEGRAM_BOT_TOKEN=xxx

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/planner

# Frontend
WEBAPP_URL=https://your-app.vercel.app

# Server
PORT=3000
NODE_ENV=production
```

## 📱 Использование приложения

### Спринт
1. Создайте спринт с целями
2. Добавляйте события и вехи
3. Отслеживайте прогресс (90 дней)

### Неделя
1. Создайте неделю с задачами
2. Расставляйте приоритеты
3. Группируйте по категориям
4. Отмечайте выполненные задачи

### Ежедневник
1. **Утром:** Заполните 3-5 главных задач на день
2. **В течение дня:** Отмечайте выполненные задачи и привычки
3. **Вечером:** Добавьте инсайт дня и метрики
4. **Перед сном:** Подведите итоги дня

## 🚨 Решение проблем

### Бот не отвечает
- Проверьте TELEGRAM_BOT_TOKEN
- Убедитесь, что сервер запущен
- Проверьте логи в консоли

### Web App не загружается
- Проверьте WEBAPP_URL в переменных окружения
- Убедитесь, что фронтенд развернут
- Откройте DevTools (F12) и проверьте ошибки

### Данные не сохраняются
- Проверьте MONGODB_URI
- Убедитесь, что MongoDB accessible
- Проверьте сетевые ошибки в консоли

### Напоминания не приходят
- Убедитесь, что сервер работает 24/7
- Проверьте часовой пояс (timezone)
- Измените время напоминаний в профиле

## 📚 Документация

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)

## 💡 Советы по использованию

1. **Начните маленьким:** 3-5 задач в день - идеально
2. **Будьте реалистичны:** Не переживайте, если не все выполнено
3. **Отслеживайте тренды:** Смотрите статистику еженедельно
4. **Используйте привычки:** Они помогают создать рутину
5. **Пишите инсайты:** Это помогает рефлексии и развитию

## 📞 Поддержка

Если у вас есть вопросы или проблемы:
1. Проверьте документацию выше
2. Проверьте логи (console.log)
3. Пересмотрите переменные окружения

## 📄 Лицензия

MIT

---

**Создано с ❤️ для вашей продуктивности!**

Помните: маленькие шаги каждый день ведут к большим результатам! 🚀

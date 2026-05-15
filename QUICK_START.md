# 🚀 БЫСТРЫЙ СТАРТ - Personal Planner Telegram Bot

Следуйте этому гайду, чтобы запустить приложение за 15 минут!

## Шаг 1️⃣: Подготовка (5 минут)

### 1.1 Создание Telegram Bot
```
1. Откройте Telegram → найдите @BotFather
2. Отправьте: /newbot
3. Выберите имя бота (например, "MyPlannerBot")
4. Выберите username (например, "my_planner_bot")
5. 🎉 Получите TOKEN вроде: 1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
```

### 1.2 Создание базы данных MongoDB
```
1. Зайдите на https://mongodb.com/cloud/atlas
2. Нажмите "Try Free" или войдите в аккаунт
3. Создайте новый проект (Project)
4. Создайте кластер (M0 - free tier)
5. Дождитесь создания (3-5 минут)
6. Нажмите "Connect"
7. Выберите "Connect your application"
8. Скопируйте строку: mongodb+srv://...
9. Замените <password> на ваш пароль БД
```

## Шаг 2️⃣: Развертывание Backend (5 минут)

### Вариант A: Railway (самый простой! 🎯)

```bash
# 1. Зайдите на https://railway.app
# 2. Нажмите "Start New Project"
# 3. Выберите "GitHub" (если используете GitHub)
#    или "Deploy from Repo"

# 4. Загрузьте файлы проекта или создайте репозиторий:
git init
git add .
git commit -m "Initial commit"
git push origin main

# 5. В Railway добавьте Variables:
TELEGRAM_BOT_TOKEN = ваш_токен_из_BotFather
MONGODB_URI = ваша_строка_из_MongoDB_Atlas
WEBAPP_URL = https://ваше-приложение.vercel.app (добавим позже)

# 6. Railway автоматически задеплоит
# 7. Скопируйте URL вашего приложения (выглядит как: https://...up.railway.app)
```

### Вариант B: Локальный запуск (для тестирования)

```bash
# 1. Установите зависимости
npm install

# 2. Создайте .env файл
cp .env.example .env

# 3. Отредактируйте .env:
nano .env
# Добавьте:
# TELEGRAM_BOT_TOKEN=ваш_токен
# MONGODB_URI=ваша_строка
# WEBAPP_URL=http://localhost:3000
# PORT=3000

# 4. Запустите сервер
npm start
# Должно вывести: "✅ Сервер запущен на http://localhost:3000"
# "🤖 Telegram Bot активен"
```

## Шаг 3️⃣: Развертывание Frontend (5 минут)

### Вариант A: Vercel (рекомендуется)

```bash
# 1. Зайдите на https://vercel.com
# 2. Нажмите "New Project"
# 3. Импортируйте репозиторий GitHub

# 4. В Environment Variables добавьте:
REACT_APP_API_URL = https://ваш-backend.up.railway.app
# (используйте URL из Railway шага 2)

# 5. Нажмите Deploy
# 6. Дождитесь, пока Vercel создаст приложение
# 7. Скопируйте URL (выглядит как: https://your-app-name.vercel.app)

# 8. Обновите в Railway переменную:
WEBAPP_URL = https://your-app-name.vercel.app
```

### Вариант B: Netlify

```bash
# 1. npm run build
# 2. Перейдите на https://app.netlify.com
# 3. Перетащите папку `build` на страницу
# 4. Дождитесь развертывания
# 5. Скопируйте URL приложения
```

## Шаг 4️⃣: Настройка Telegram Bot (2 минуты)

```
1. Откройте свой бот в Telegram
   (найдите: @your_bot_username)

2. Отправьте: /start

3. Должно появиться сообщение с кнопкой
   "📱 Открыть приложение"

4. Нажмите кнопку → откроется ваше приложение

5. Создайте спринт и начинайте планировать! 🎯
```

## ✅ Все готово!

Поздравляем! 🎉 Ваше приложение работает!

### Что дальше?

1. **Создайте спринт** на 90 дней с вашими целями
2. **Разбейте на недели** с приоритизированными задачами
3. **Заполняйте ежедневник** каждое утро и вечер
4. **Получайте напоминания** в Telegram

### 🚨 Если что-то не работает

**Ошибка: "Bot не отвечает"**
- Проверьте TELEGRAM_BOT_TOKEN (скопируйте заново у BotFather)
- Убедитесь, что сервер запущен (в Railway или локально)

**Ошибка: "Web App не загружается"**
- Проверьте WEBAPP_URL в переменных
- Убедитесь, что фронтенд развернут на Vercel/Netlify
- Откройте DevTools (F12) и проверьте ошибки

**Ошибка: "Данные не сохраняются"**
- Проверьте MONGODB_URI (скопируйте заново)
- Убедитесь, что MongoDB доступна (проверьте IP whitelist)

**Ошибка: "Напоминания не приходят"**
- Сервер должен работать 24/7 (Railway это обеспечивает)
- Проверьте правильность часового пояса

---

## 📞 Контакты для помощи

- Документация: README.md
- Telegram Bot API: https://core.telegram.org/bots/api
- MongoDB Help: https://www.mongodb.com/docs/

---

**Готовы начать свой путь к продуктивности?** 

Помните: каждый день — это новый шанс для прогресса! 💪🚀

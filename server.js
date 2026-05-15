const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let dbConnected = false;
let bot = null;

// Не буферизовать запросы — сразу падать с ошибкой если БД недоступна
mongoose.set('bufferCommands', false);

// ===== HEALTH CHECK (отвечает всегда) =====

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: dbConnected ? 'connected' : 'disconnected',
    bot: bot ? 'running' : 'disabled'
  });
});

// Все /api/* запросы проверяют подключение к БД
app.use('/api', (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      error: 'database_unavailable',
      message: 'База данных недоступна. Убедитесь что MONGODB_URI задан в настройках Railway.'
    });
  }
  next();
});

// ===== СХЕМЫ =====

const SprintSchema = new mongoose.Schema({
  userId: String,
  startDate: Date,
  endDate: Date,
  title: String,
  goals: [String],
  events: [{ date: Date, title: String, description: String }],
  createdAt: { type: Date, default: Date.now }
});

const WeekSchema = new mongoose.Schema({
  userId: String,
  sprintId: mongoose.Schema.Types.ObjectId,
  weekNumber: Number,
  startDate: Date,
  endDate: Date,
  tasks: [{
    id: String,
    title: String,
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    category: String,
    completed: { type: Boolean, default: false },
    createdAt: Date
  }],
  createdAt: { type: Date, default: Date.now }
});

const DailyTaskSchema = new mongoose.Schema({
  userId: String,
  weekId: mongoose.Schema.Types.ObjectId,
  date: Date,
  mainTasks: [{ id: String, title: String, completed: { type: Boolean, default: false } }],
  habits: [{ id: String, name: String, completed: { type: Boolean, default: false }, streak: { type: Number, default: 0 } }],
  metrics: {
    water: { type: Number, default: 0 },
    steps: { type: Number, default: 0 },
    calories: { type: Number, default: 0 }
  },
  insight: String,
  morningReminderSent: { type: Boolean, default: false },
  eveningSummaryGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  telegramId: String,
  firstName: String,
  lastName: String,
  username: String,
  timezone: { type: String, default: 'UTC' },
  reminderTime: { type: String, default: '07:00' },
  summaryTime: { type: String, default: '21:00' },
  createdAt: { type: Date, default: Date.now }
});

const Sprint = mongoose.model('Sprint', SprintSchema);
const Week = mongoose.model('Week', WeekSchema);
const DailyTask = mongoose.model('DailyTask', DailyTaskSchema);
const User = mongoose.model('User', UserSchema);

// ===== API =====

app.get('/api/user/:userId', async (req, res) => {
  try {
    res.json(await User.findOne({ telegramId: req.params.userId }) || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sprint', async (req, res) => {
  try {
    const { userId, title, goals, events, startDate } = req.body;
    const sDate = startDate ? new Date(startDate) : new Date();
    const eDate = new Date(sDate);
    eDate.setDate(eDate.getDate() + 90);
    const sprint = await Sprint.findOneAndUpdate(
      { userId },
      { userId, title, goals: goals || [], events: (events || []).map(ev => ({ date: new Date(ev.date), title: ev.title, description: ev.description || '' })), startDate: sDate, endDate: eDate },
      { upsert: true, new: true }
    );
    res.json(sprint);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sprint/:userId', async (req, res) => {
  try {
    res.json(await Sprint.findOne({ userId: req.params.userId }) || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sprint/:sprintId/event', async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.sprintId);
    sprint.events.push(req.body);
    await sprint.save();
    res.json(sprint);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/week', async (req, res) => {
  try {
    const { userId, sprintId, weekNumber, tasks, startDate, endDate } = req.body;
    const wStart = startDate ? new Date(startDate) : (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() || 7) - 1)); d.setHours(0,0,0,0); return d; })();
    const wEnd = endDate ? new Date(endDate) : (() => { const d = new Date(wStart); d.setDate(d.getDate() + 6); d.setHours(23,59,59,999); return d; })();
    const week = await Week.findOneAndUpdate(
      { userId, weekNumber },
      { userId, sprintId: sprintId || undefined, weekNumber, startDate: wStart, endDate: wEnd, tasks: (tasks || []).map(t => ({ id: t.id || (Date.now().toString() + Math.random().toString(36).slice(2)), title: t.title, priority: t.priority || 'medium', category: t.category || '', completed: t.completed || false, createdAt: t.createdAt ? new Date(t.createdAt) : new Date() })) },
      { upsert: true, new: true }
    );
    res.json(week);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/week/:weekId', async (req, res) => {
  try {
    res.json(await Week.findById(req.params.weekId) || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/week/current/:userId', async (req, res) => {
  try {
    const now = new Date();
    res.json(await Week.findOne({ userId: req.params.userId, startDate: { $lte: now }, endDate: { $gte: now } }) || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/daily-task', async (req, res) => {
  try {
    const { userId, weekId, date, mainTasks, habits, metrics, insight } = req.body;
    const d = new Date(date);
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999);
    const dailyTask = await DailyTask.findOneAndUpdate(
      { userId, date: { $gte: dayStart, $lte: dayEnd } },
      { userId, weekId: weekId || undefined, date: dayStart, mainTasks: mainTasks || [], habits: habits || [], metrics: metrics || { water: 0, steps: 0, calories: 0 }, insight: insight || '' },
      { upsert: true, new: true }
    );
    res.json(dailyTask);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/daily-task/:userId/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    res.json(await DailyTask.findOne({ userId: req.params.userId, date: { $gte: new Date(date.setHours(0,0,0,0)), $lt: new Date(date.setHours(23,59,59,999)) } }) || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/daily-task/:taskId', async (req, res) => {
  try {
    const { mainTaskIndex, habitIndex, completed, insight, metrics } = req.body;
    const dailyTask = await DailyTask.findById(req.params.taskId);
    if (mainTaskIndex !== undefined) dailyTask.mainTasks[mainTaskIndex].completed = completed;
    if (habitIndex !== undefined) { dailyTask.habits[habitIndex].completed = completed; if (completed) dailyTask.habits[habitIndex].streak += 1; }
    if (insight) dailyTask.insight = insight;
    if (metrics) dailyTask.metrics = { ...dailyTask.metrics, ...metrics };
    await dailyTask.save();
    res.json(dailyTask);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/motivation', (req, res) => {
  const list = [
    '🌟 Каждый выполненный день — шаг к вашей мечте!',
    '💪 Вы делаете отличный прогресс! Продолжайте в том же духе!',
    '🔥 Ваша серия растёт! Не прерывайте её!',
    '✨ Сегодня вы уже ближе к своим целям, чем вчера!',
    '🚀 Маленькие шаги каждый день ведут к большим результатам!'
  ];
  res.json({ motivation: list[Math.floor(Math.random() * list.length)] });
});

app.get('/api/stats/:userId/:weekId', async (req, res) => {
  try {
    const tasks = await DailyTask.find({ userId: req.params.userId, weekId: req.params.weekId });
    const total = tasks.reduce((s, dt) => s + dt.mainTasks.length, 0);
    const done = tasks.reduce((s, dt) => s + dt.mainTasks.filter(t => t.completed).length, 0);
    const totalH = tasks.reduce((s, dt) => s + dt.habits.length, 0);
    const doneH = tasks.reduce((s, dt) => s + dt.habits.filter(h => h.completed).length, 0);
    res.json({
      taskCompletion: total > 0 ? (done / total * 100).toFixed(1) : 0,
      habitCompletion: totalH > 0 ? (doneH / totalH * 100).toFixed(1) : 0,
      avgWater: (tasks.reduce((s, dt) => s + dt.metrics.water, 0) / (tasks.length || 1)).toFixed(1),
      avgSteps: Math.round(tasks.reduce((s, dt) => s + dt.metrics.steps, 0) / (tasks.length || 1)),
      totalDays: tasks.length
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== ФРОНТЕНД =====

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// ===== ЗАПУСК СЕРВЕРА (первым, до MongoDB и Telegram) =====

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  initMongoDB();
  initTelegramBot();
});

// ===== ИНИЦИАЛИЗАЦИЯ MONGODB =====

async function initMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️  MONGODB_URI не задан — база данных отключена');
    return;
  }
  try {
    await mongoose.connect(uri);
    dbConnected = true;
    console.log('✅ MongoDB подключена');
    mongoose.connection.on('disconnected', () => { dbConnected = false; console.warn('⚠️  MongoDB отключена'); });
    mongoose.connection.on('reconnected', () => { dbConnected = true; console.log('✅ MongoDB переподключена'); });
  } catch (err) {
    console.error('❌ MongoDB: не удалось подключиться:', err.message);
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM BOT =====

async function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN не задан — бот отключён');
    return;
  }
  try {
    const TelegramBot = require('node-telegram-bot-api');
    bot = new TelegramBot(token, { polling: true });

    bot.on('polling_error', (err) => {
      // 409 = другой polling уже запущен (нормально при перезапуске)
      if (err.code !== 'ETELEGRAM' || !err.message.includes('409')) {
        console.error('Telegram polling error:', err.message);
      }
    });

    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      if (dbConnected) {
        try {
          await User.findOneAndUpdate(
            { telegramId: userId },
            { telegramId: userId, firstName: msg.from.first_name, lastName: msg.from.last_name, username: msg.from.username },
            { upsert: true }
          );
        } catch (e) { console.error('DB error on /start:', e.message); }
      }
      const webAppUrl = process.env.WEBAPP_URL || `https://your-app.up.railway.app`;
      bot.sendMessage(chatId,
        '🎯 Добро пожаловать в Personal Planner!\n\n' +
        'Это ваш персональный ассистент для управления:\n' +
        '• 90-дневными спринтами\n• Еженедельными задачами\n• Ежедневными делами\n• Привычками и метриками\n\n' +
        'Нажмите кнопку ниже, чтобы открыть приложение:',
        { reply_markup: { inline_keyboard: [[{ text: '📱 Открыть приложение', web_app: { url: `${webAppUrl}?user_id=${userId}` } }]] } }
      );
    });

    bot.onText(/\/help/, (msg) => {
      bot.sendMessage(msg.chat.id, '📚 Справка:\n\n/start - Открыть приложение\n/help - Эта справка');
    });

    console.log('✅ Telegram Bot запущен');
    setInterval(sendMorningReminders, 60000);
    setInterval(sendEveningSummary, 60000);
  } catch (err) {
    console.error('❌ Telegram Bot: не удалось запустить:', err.message);
  }
}

// ===== УВЕДОМЛЕНИЯ =====

async function sendMorningReminders() {
  if (!bot || !dbConnected) return;
  try {
    const users = await User.find({});
    const now = new Date();
    for (const user of users) {
      const [h, m] = user.reminderTime.split(':').map(Number);
      if (h === now.getHours() && m === now.getMinutes()) {
        bot.sendMessage(user.telegramId,
          '☀️ Доброе утро!\n\nПора заполнить ваши задачи на день!\n📝 Откройте приложение и определите 3-5 главных задач на сегодня.',
          { reply_markup: { inline_keyboard: [[{ text: '📱 Открыть', web_app: { url: `${process.env.WEBAPP_URL}?user_id=${user.telegramId}` } }]] } }
        ).catch(e => console.error('Reminder send error:', e.message));
      }
    }
  } catch (e) { console.error('sendMorningReminders error:', e.message); }
}

async function sendEveningSummary() {
  if (!bot || !dbConnected) return;
  try {
    const users = await User.find({});
    const now = new Date();
    for (const user of users) {
      const [h, m] = user.summaryTime.split(':').map(Number);
      if (h !== now.getHours() || m !== now.getMinutes()) continue;
      const today = new Date();
      const dt = await DailyTask.findOne({ userId: user.telegramId, date: { $gte: new Date(today.setHours(0,0,0,0)), $lt: new Date(today.setHours(23,59,59,999)) } });
      if (!dt) continue;
      const motivations = ['🌟 Отличная работа!', '💪 Вы молодец!', '🔥 Прекрасный день!'];
      bot.sendMessage(user.telegramId,
        `📊 Итоги дня:\n\n✅ Задач: ${dt.mainTasks.filter(t=>t.completed).length}/${dt.mainTasks.length}\n⭐ Привычек: ${dt.habits.filter(h=>h.completed).length}/${dt.habits.length}\n💧 Вода: ${dt.metrics.water}л\n👟 Шаги: ${dt.metrics.steps}\n\n${motivations[Math.floor(Math.random()*motivations.length)]}\n\n😴 Хорошо поспите!`
      ).catch(e => console.error('Summary send error:', e.message));
    }
  } catch (e) { console.error('sendEveningSummary error:', e.message); }
}

// ===== ЗАЩИТА ОТ НЕКРИТИЧНЫХ ОШИБОК =====

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

module.exports = { app };

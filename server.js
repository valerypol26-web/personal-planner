const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ===== MONGODB =====

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI не задан — база данных отключена');
}

let dbConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      dbConnected = true;
      console.log('✅ MongoDB подключена');
    })
    .catch(err => {
      console.error('❌ Ошибка подключения к MongoDB:', err.message);
    });

  mongoose.connection.on('disconnected', () => {
    dbConnected = false;
    console.warn('⚠️  MongoDB отключена');
  });
  mongoose.connection.on('reconnected', () => {
    dbConnected = true;
    console.log('✅ MongoDB переподключена');
  });
}

// ===== СХЕМЫ =====

const SprintSchema = new mongoose.Schema({
  userId: String,
  startDate: Date,
  endDate: Date,
  title: String,
  goals: [String],
  events: [{
    date: Date,
    title: String,
    description: String
  }],
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
  mainTasks: [{
    id: String,
    title: String,
    completed: { type: Boolean, default: false }
  }],
  habits: [{
    id: String,
    name: String,
    completed: { type: Boolean, default: false },
    streak: { type: Number, default: 0 }
  }],
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

// ===== TELEGRAM BOT =====

let bot = null;

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (TELEGRAM_TOKEN) {
  try {
    const TelegramBot = require('node-telegram-bot-api');
    bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
    console.log('✅ Telegram Bot запущен (polling)');

    bot.on('polling_error', (err) => {
      console.error('❌ Telegram polling error:', err.message);
    });

    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      try {
        await User.findOneAndUpdate(
          { telegramId: userId },
          {
            telegramId: userId,
            firstName: msg.from.first_name,
            lastName: msg.from.last_name,
            username: msg.from.username
          },
          { upsert: true }
        );
      } catch (err) {
        console.error('DB error on /start:', err.message);
      }

      const webAppUrl = process.env.WEBAPP_URL || 'https://your-app.up.railway.app';

      bot.sendMessage(chatId,
        '🎯 Добро пожаловать в Personal Planner!\n\n' +
        'Это ваш персональный ассистент для управления:\n' +
        '• 90-дневными спринтами\n' +
        '• Еженедельными задачами\n' +
        '• Ежедневными делами\n' +
        '• Привычками и метриками\n\n' +
        'Нажмите кнопку ниже, чтобы открыть приложение:',
        {
          reply_markup: {
            inline_keyboard: [[
              {
                text: '📱 Открыть приложение',
                web_app: { url: `${webAppUrl}?user_id=${userId}` }
              }
            ]]
          }
        }
      );
    });

    bot.onText(/\/help/, (msg) => {
      bot.sendMessage(msg.chat.id,
        '📚 Справка:\n\n' +
        '/start - Открыть приложение\n' +
        '/stats - Статистика за неделю\n' +
        '/today - Задачи на сегодня\n' +
        '/help - Эта справка'
      );
    });

  } catch (err) {
    console.error('❌ Не удалось запустить Telegram Bot:', err.message);
  }
} else {
  console.warn('⚠️  TELEGRAM_BOT_TOKEN не задан — бот отключён');
}

// ===== HEALTH CHECK =====

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: dbConnected ? 'connected' : 'disconnected',
    bot: bot ? 'running' : 'disabled'
  });
});

// ===== API ENDPOINTS =====

app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.userId });
    res.json(user || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sprint', async (req, res) => {
  try {
    const { userId, title, goals, events, startDate } = req.body;
    const sDate = startDate ? new Date(startDate) : new Date();
    const eDate = new Date(sDate);
    eDate.setDate(eDate.getDate() + 90);

    const sprint = await Sprint.findOneAndUpdate(
      { userId },
      {
        userId,
        title,
        goals: goals || [],
        events: (events || []).map(ev => ({
          date: new Date(ev.date),
          title: ev.title,
          description: ev.description || ''
        })),
        startDate: sDate,
        endDate: eDate
      },
      { upsert: true, new: true }
    );

    res.json(sprint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sprint/:userId', async (req, res) => {
  try {
    const sprint = await Sprint.findOne({ userId: req.params.userId });
    res.json(sprint || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sprint/:sprintId/event', async (req, res) => {
  try {
    const { date, title, description } = req.body;
    const sprint = await Sprint.findById(req.params.sprintId);
    sprint.events.push({ date, title, description });
    await sprint.save();
    res.json(sprint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/week', async (req, res) => {
  try {
    const { userId, sprintId, weekNumber, tasks, startDate, endDate } = req.body;

    const wStart = startDate ? new Date(startDate) : (() => {
      const d = new Date(); d.setDate(d.getDate() - ((d.getDay() || 7) - 1)); d.setHours(0,0,0,0); return d;
    })();
    const wEnd = endDate ? new Date(endDate) : (() => {
      const d = new Date(wStart); d.setDate(d.getDate() + 6); d.setHours(23,59,59,999); return d;
    })();

    const week = await Week.findOneAndUpdate(
      { userId, weekNumber },
      {
        userId,
        sprintId: sprintId || undefined,
        weekNumber,
        startDate: wStart,
        endDate: wEnd,
        tasks: (tasks || []).map(t => ({
          id: t.id || (Date.now().toString() + Math.random().toString(36).slice(2)),
          title: t.title,
          priority: t.priority || 'medium',
          category: t.category || '',
          completed: t.completed || false,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date()
        }))
      },
      { upsert: true, new: true }
    );

    res.json(week);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/week/:weekId', async (req, res) => {
  try {
    const week = await Week.findById(req.params.weekId);
    res.json(week || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/week/current/:userId', async (req, res) => {
  try {
    const now = new Date();
    const week = await Week.findOne({
      userId: req.params.userId,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });
    res.json(week || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/daily-task', async (req, res) => {
  try {
    const { userId, weekId, date, mainTasks, habits, metrics, insight } = req.body;
    const d = new Date(date);
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
    const dayEnd   = new Date(d); dayEnd.setHours(23,59,59,999);

    const dailyTask = await DailyTask.findOneAndUpdate(
      { userId, date: { $gte: dayStart, $lte: dayEnd } },
      {
        userId,
        weekId: weekId || undefined,
        date: dayStart,
        mainTasks: mainTasks || [],
        habits: habits || [],
        metrics: metrics || { water: 0, steps: 0, calories: 0 },
        insight: insight || ''
      },
      { upsert: true, new: true }
    );

    res.json(dailyTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/daily-task/:userId/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const dailyTask = await DailyTask.findOne({
      userId: req.params.userId,
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    res.json(dailyTask || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/daily-task/:taskId', async (req, res) => {
  try {
    const { mainTaskIndex, habitIndex, completed, insight, metrics } = req.body;
    const dailyTask = await DailyTask.findById(req.params.taskId);

    if (mainTaskIndex !== undefined) {
      dailyTask.mainTasks[mainTaskIndex].completed = completed;
    }
    if (habitIndex !== undefined) {
      dailyTask.habits[habitIndex].completed = completed;
      if (completed) dailyTask.habits[habitIndex].streak += 1;
    }
    if (insight) dailyTask.insight = insight;
    if (metrics) dailyTask.metrics = { ...dailyTask.metrics, ...metrics };

    await dailyTask.save();
    res.json(dailyTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/motivation', (req, res) => {
  const motivations = [
    '🌟 Каждый выполненный день — шаг к вашей мечте!',
    '💪 Вы делаете отличный прогресс! Продолжайте в том же духе!',
    '🔥 Ваша серия растёт! Не прерывайте её!',
    '✨ Сегодня вы уже ближе к своим целям, чем вчера!',
    '🚀 Маленькие шаги каждый день ведут к большим результатам!',
    '⭐ Вы вдохновляете сами себя своим прогрессом!',
    '🎯 Помните, почему вы начали это делать — продолжайте!',
    '💎 Ваши привычки — это ваше величие!',
    '🌈 Даже сложные дни делают вас сильнее!',
    '👑 Вы достойны успеха, и вы это доказываете каждый день!'
  ];
  res.json({ motivation: motivations[Math.floor(Math.random() * motivations.length)] });
});

app.get('/api/stats/:userId/:weekId', async (req, res) => {
  try {
    const dailyTasks = await DailyTask.find({
      userId: req.params.userId,
      weekId: req.params.weekId
    });

    const totalTasks = dailyTasks.reduce((sum, dt) => sum + dt.mainTasks.length, 0);
    const completedTasks = dailyTasks.reduce((sum, dt) =>
      sum + dt.mainTasks.filter(t => t.completed).length, 0);

    const totalHabits = dailyTasks.reduce((sum, dt) => sum + dt.habits.length, 0);
    const completedHabits = dailyTasks.reduce((sum, dt) =>
      sum + dt.habits.filter(h => h.completed).length, 0);

    const avgWater = dailyTasks.reduce((sum, dt) => sum + dt.metrics.water, 0) / dailyTasks.length || 0;
    const avgSteps = dailyTasks.reduce((sum, dt) => sum + dt.metrics.steps, 0) / dailyTasks.length || 0;

    res.json({
      taskCompletion: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0,
      habitCompletion: totalHabits > 0 ? (completedHabits / totalHabits * 100).toFixed(1) : 0,
      avgWater: avgWater.toFixed(1),
      avgSteps: avgSteps.toFixed(0),
      totalDays: dailyTasks.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== АВТОМАТИЧЕСКИЕ УВЕДОМЛЕНИЯ =====

async function sendMorningReminders() {
  if (!bot || !dbConnected) return;
  try {
    const users = await User.find({});
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    users.forEach(user => {
      const [reminderHour, reminderMinute] = user.reminderTime.split(':').map(Number);
      if (reminderHour === currentHour && reminderMinute === currentMinute) {
        bot.sendMessage(user.telegramId,
          '☀️ Доброе утро!\n\n' +
          'Пора заполнить ваши задачи на день!\n\n' +
          '📝 Откройте приложение и определите 3-5 главных задач на сегодня.',
          {
            reply_markup: {
              inline_keyboard: [[{
                text: '📱 Открыть',
                web_app: { url: `${process.env.WEBAPP_URL}?user_id=${user.telegramId}` }
              }]]
            }
          }
        ).catch(err => console.error('Morning reminder error:', err.message));
      }
    });
  } catch (err) {
    console.error('sendMorningReminders error:', err.message);
  }
}

async function sendEveningSummary() {
  if (!bot || !dbConnected) return;
  try {
    const users = await User.find({});
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (const user of users) {
      const [summaryHour, summaryMinute] = user.summaryTime.split(':').map(Number);
      if (summaryHour !== currentHour || summaryMinute !== currentMinute) continue;

      const today = new Date();
      const dailyTask = await DailyTask.findOne({
        userId: user.telegramId,
        date: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999))
        }
      });

      if (!dailyTask) continue;

      const completedTasks = dailyTask.mainTasks.filter(t => t.completed).length;
      const completedHabits = dailyTask.habits.filter(h => h.completed).length;
      const totalTasks = dailyTask.mainTasks.length;
      const totalHabits = dailyTask.habits.length;

      const motivations = [
        '🌟 Отличная работа! Вы близко к вашей цели!',
        '💪 Вы молодец! Продолжайте так же завтра!',
        '🔥 Ваша серия растёт! Это вдохновляет!',
        '✨ Прекрасный день! Гордитесь собой!',
        '🚀 Вы делаете прогресс каждый день!'
      ];
      const motivation = motivations[Math.floor(Math.random() * motivations.length)];

      bot.sendMessage(user.telegramId,
        `📊 Итоги дня:\n\n` +
        `✅ Задач выполнено: ${completedTasks}/${totalTasks}\n` +
        `⭐ Привычек выполнено: ${completedHabits}/${totalHabits}\n` +
        `💧 Вода: ${dailyTask.metrics.water}л\n` +
        `👟 Шаги: ${dailyTask.metrics.steps}\n\n` +
        `${motivation}\n\n` +
        `😴 Хорошо поспите! Завтра новый день для новых побед!`
      ).catch(err => console.error('Evening summary error:', err.message));
    }
  } catch (err) {
    console.error('sendEveningSummary error:', err.message);
  }
}

setInterval(sendMorningReminders, 60000);
setInterval(sendEveningSummary, 60000);

// ===== ФРОНТЕНД =====

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ===== ЗАПУСК =====

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});

module.exports = { app };

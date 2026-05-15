const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB подключение
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/planner', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Telegram Bot инициализация
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// ===== СХЕМЫ =====

const SprintSchema = new mongoose.Schema({
  userId: String,
  startDate: Date,
  endDate: Date, // 90 дней от начала
  title: String,
  goals: [String], // глобальные цели спринта
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
  date: Date, // конкретная дата в 2026
  mainTasks: [{ // максимум 5 главных задач
    id: String,
    title: String,
    completed: { type: Boolean, default: false }
  }],
  habits: [{ // привычки
    id: String,
    name: String,
    completed: { type: Boolean, default: false },
    streak: { type: Number, default: 0 }
  }],
  metrics: {
    water: { type: Number, default: 0 }, // литры
    steps: { type: Number, default: 0 },
    calories: { type: Number, default: 0 }
  },
  insight: String, // инсайт дня
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
  reminderTime: { type: String, default: '07:00' }, // утреннее напоминание
  summaryTime: { type: String, default: '21:00' }, // вечерний итог
  createdAt: { type: Date, default: Date.now }
});

const Sprint = mongoose.model('Sprint', SprintSchema);
const Week = mongoose.model('Week', WeekSchema);
const DailyTask = mongoose.model('DailyTask', DailyTaskSchema);
const User = mongoose.model('User', UserSchema);

// ===== TELEGRAM BOT КОМАНДЫ =====

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Сохраняем пользователя
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

  // Клавиатура с Web App кнопкой
  const webAppUrl = process.env.WEBAPP_URL || 'https://your-app.vercel.app';
  
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
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '📚 Справка:\n\n' +
    '/start - Открыть приложение\n' +
    '/stats - Статистика за неделю\n' +
    '/today - Задачи на сегодня\n' +
    '/help - Эта справка'
  );
});

// ===== API ENDPOINTS =====

// Получить пользователя
app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.userId });
    res.json(user || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать/обновить спринт
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

// Получить спринт
app.get('/api/sprint/:userId', async (req, res) => {
  try {
    const sprint = await Sprint.findOne({ userId: req.params.userId });
    res.json(sprint || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Добавить событие в спринт
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

// Создать/обновить неделю с задачами (upsert по userId + weekNumber)
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

// Получить неделю
app.get('/api/week/:weekId', async (req, res) => {
  try {
    const week = await Week.findById(req.params.weekId);
    res.json(week || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить текущую неделю пользователя
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

// Создать/обновить ежедневные задачи
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

// Получить ежедневные задачи на дату
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

// Обновить задачу дня (отметить выполненное)
app.patch('/api/daily-task/:taskId', async (req, res) => {
  try {
    const { mainTaskIndex, habitIndex, completed, insight, metrics } = req.body;
    const dailyTask = await DailyTask.findById(req.params.taskId);

    if (mainTaskIndex !== undefined) {
      dailyTask.mainTasks[mainTaskIndex].completed = completed;
    }
    if (habitIndex !== undefined) {
      dailyTask.habits[habitIndex].completed = completed;
      if (completed) {
        dailyTask.habits[habitIndex].streak += 1;
      }
    }
    if (insight) {
      dailyTask.insight = insight;
    }
    if (metrics) {
      dailyTask.metrics = { ...dailyTask.metrics, ...metrics };
    }

    await dailyTask.save();
    res.json(dailyTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить мотивирующий совет
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
  
  const random = motivations[Math.floor(Math.random() * motivations.length)];
  res.json({ motivation: random });
});

// Получить статистику неделю
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

// Отправить утреннее напоминание
async function sendMorningReminders() {
  const users = await User.find({});
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  users.forEach(user => {
    const [reminderHour, reminderMinute] = user.reminderTime.split(':').map(Number);
    
    if (reminderHour === currentHour && reminderMinute === currentMinute) {
      bot.sendMessage(user.telegramId,
        '☀️ Доброе утро! \n\n' +
        'Пора заполнить ваши задачи на день!\n\n' +
        '📝 Откройте приложение и определите 3-5 главных задач на сегодня.',
        {
          reply_markup: {
            inline_keyboard: [[
              {
                text: '📱 Открыть',
                web_app: { url: `${process.env.WEBAPP_URL}?user_id=${user.telegramId}` }
              }
            ]]
          }
        }
      );
    }
  });
}

// Подведение итогов вечером
async function sendEveningSummary() {
  const users = await User.find({});
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  users.forEach(async (user) => {
    const [summaryHour, summaryMinute] = user.summaryTime.split(':').map(Number);
    
    if (summaryHour === currentHour && summaryMinute === currentMinute) {
      const today = new Date();
      const dailyTask = await DailyTask.findOne({
        userId: user.telegramId,
        date: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999))
        }
      });

      if (dailyTask) {
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
        );
      }
    }
  });
}

// Проверять напоминания каждую минуту
setInterval(sendMorningReminders, 60000);
setInterval(sendEveningSummary, 60000);

// ===== РАЗДАЧА ФРОНТЕНДА =====

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Для всех остальных маршрутов отправляем index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ===== ЗАПУСК СЕРВЕРА =====

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
  console.log(`🤖 Telegram Bot активен`);
});

module.exports = { bot, app };

import React, { useState, useEffect } from 'react';
import '../styles/DailyView.css';

function DailyView({ userId }) {
  const [dailyTask, setDailyTask] = useState(null);
  const [week, setWeek] = useState(null);
  const [newMainTask, setNewMainTask] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [newInsight, setNewInsight] = useState('');
  const [metrics, setMetrics] = useState({ water: 0, steps: 0, calories: 0 });
  const [motivation, setMotivation] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  const today = new Date('2026-01-15'); // пример даты

  useEffect(() => {
    fetchDailyData();
    fetchMotivation();
  }, [userId]);

  const fetchDailyData = async () => {
    try {
      const dateStr = today.toISOString().split('T')[0];
      
      // Получаем неделю
      const weekRes = await fetch(`${API_URL}/api/week/current/${userId}`);
      const weekData = await weekRes.json();
      setWeek(weekData);

      // Получаем задачи дня
      const dailyRes = await fetch(`${API_URL}/api/daily-task/${userId}/${dateStr}`);
      const dailyData = await dailyRes.json();
      
      if (dailyData) {
        setDailyTask(dailyData);
        setMetrics(dailyData.metrics || { water: 0, steps: 0, calories: 0 });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке данных дня:', error);
      setLoading(false);
    }
  };

  const fetchMotivation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/motivation`);
      const data = await response.json();
      setMotivation(data.motivation);
    } catch (error) {
      console.error('Ошибка при загрузке мотивации:', error);
    }
  };

  const createOrUpdateDailyTask = async (mainTasks = [], habits = []) => {
    try {
      const dateStr = today.toISOString().split('T')[0];
      
      const response = await fetch(`${API_URL}/api/daily-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weekId: week?._id,
          date: dateStr,
          mainTasks: mainTasks.length > 0 ? mainTasks : dailyTask?.mainTasks || [],
          habits: habits.length > 0 ? habits : dailyTask?.habits || []
        })
      });

      const data = await response.json();
      setDailyTask(data);
      return data;
    } catch (error) {
      console.error('Ошибка при создании дня:', error);
    }
  };

  const addMainTask = async () => {
    if (!newMainTask) return;

    if (!dailyTask) {
      const newTask = {
        id: Date.now().toString(),
        title: newMainTask,
        completed: false
      };
      await createOrUpdateDailyTask([newTask]);
      setNewMainTask('');
      return;
    }

    const updatedTasks = [
      ...dailyTask.mainTasks,
      {
        id: Date.now().toString(),
        title: newMainTask,
        completed: false
      }
    ];

    if (updatedTasks.length > 5) {
      alert('⚠️ Максимум 5 главных задач в день!');
      return;
    }

    const updated = await createOrUpdateDailyTask(updatedTasks);
    setNewMainTask('');
  };

  const addHabit = async () => {
    if (!newHabit) return;

    if (!dailyTask) {
      const newHabitObj = {
        id: Date.now().toString(),
        name: newHabit,
        completed: false,
        streak: 0
      };
      await createOrUpdateDailyTask([], [newHabitObj]);
      setNewHabit('');
      return;
    }

    const updatedHabits = [
      ...dailyTask.habits,
      {
        id: Date.now().toString(),
        name: newHabit,
        completed: false,
        streak: 0
      }
    ];

    const updated = await createOrUpdateDailyTask([], updatedHabits);
    setNewHabit('');
  };

  const toggleMainTask = async (index) => {
    if (!dailyTask) return;

    const updatedTasks = [...dailyTask.mainTasks];
    updatedTasks[index].completed = !updatedTasks[index].completed;
    await createOrUpdateDailyTask(updatedTasks);
  };

  const toggleHabit = async (index) => {
    if (!dailyTask) return;

    const updatedHabits = [...dailyTask.habits];
    updatedHabits[index].completed = !updatedHabits[index].completed;
    if (updatedHabits[index].completed) {
      updatedHabits[index].streak = (updatedHabits[index].streak || 0) + 1;
    }
    await createOrUpdateDailyTask([], updatedHabits);
  };

  const updateMetrics = async (field, value) => {
    const updatedMetrics = { ...metrics, [field]: value };
    setMetrics(updatedMetrics);

    if (dailyTask) {
      try {
        await fetch(`${API_URL}/api/daily-task/${dailyTask._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: updatedMetrics
          })
        });
      } catch (error) {
        console.error('Ошибка при обновлении метрик:', error);
      }
    }
  };

  const saveInsight = async () => {
    if (!dailyTask || !newInsight) return;

    try {
      await fetch(`${API_URL}/api/daily-task/${dailyTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight: newInsight
        })
      });

      setDailyTask({ ...dailyTask, insight: newInsight });
      setNewInsight('');
    } catch (error) {
      console.error('Ошибка при сохранении инсайта:', error);
    }
  };

  const generateSummary = () => {
    if (!dailyTask) return;

    const completedTasks = dailyTask.mainTasks.filter(t => t.completed).length;
    const totalTasks = dailyTask.mainTasks.length;
    const completedHabits = dailyTask.habits.filter(h => h.completed).length;
    const totalHabits = dailyTask.habits.length;

    setShowSummary(true);
  };

  if (loading) {
    return <div className="loading">Загружаю ваш день...</div>;
  }

  const taskCompletion = dailyTask && dailyTask.mainTasks.length > 0 
    ? (dailyTask.mainTasks.filter(t => t.completed).length / dailyTask.mainTasks.length * 100).toFixed(0)
    : 0;

  const habitCompletion = dailyTask && dailyTask.habits.length > 0
    ? (dailyTask.habits.filter(h => h.completed).length / dailyTask.habits.length * 100).toFixed(0)
    : 0;

  return (
    <div className="daily-view">
      {showSummary ? (
        <div className="daily-summary">
          <h2>📊 Итоги дня</h2>
          
          {dailyTask && (
            <>
              <div className="summary-stat">
                <h3>✅ Задачи</h3>
                <p className="stat-value">
                  {dailyTask.mainTasks.filter(t => t.completed).length}/{dailyTask.mainTasks.length}
                </p>
                <div className="summary-bar">
                  <div 
                    className="summary-bar-fill" 
                    style={{ width: `${taskCompletion}%` }}
                  ></div>
                </div>
              </div>

              <div className="summary-stat">
                <h3>⭐ Привычки</h3>
                <p className="stat-value">
                  {dailyTask.habits.filter(h => h.completed).length}/{dailyTask.habits.length}
                </p>
                <div className="summary-bar">
                  <div 
                    className="summary-bar-fill" 
                    style={{ width: `${habitCompletion}%` }}
                  ></div>
                </div>
              </div>

              <div className="summary-metrics">
                <div className="metric-item">
                  <span>💧 Вода</span>
                  <span>{dailyTask.metrics.water}л</span>
                </div>
                <div className="metric-item">
                  <span>👟 Шаги</span>
                  <span>{dailyTask.metrics.steps}</span>
                </div>
                <div className="metric-item">
                  <span>🔥 Ккал</span>
                  <span>{dailyTask.metrics.calories}</span>
                </div>
              </div>

              <div className="motivation-box">
                <p className="motivation-text">{motivation}</p>
              </div>

              {dailyTask.insight && (
                <div className="insight-box">
                  <h4>💡 Инсайт дня</h4>
                  <p>{dailyTask.insight}</p>
                </div>
              )}

              <div className="summary-actions">
                <p className="good-night">😴 Хорошо поспите! Завтра новый день для новых побед!</p>
                <button onClick={() => setShowSummary(false)}>← Вернуться к дню</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="daily-header">
            <h2>📝 {today.toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
            <p className="daily-date">{today.toLocaleDateString('ru-RU')}</p>
          </div>

          <div className="daily-section">
            <h3>🎯 Главные задачи (макс. 5)</h3>
            {dailyTask && dailyTask.mainTasks.length > 0 ? (
              <div className="tasks-list">
                {dailyTask.mainTasks.map((task, idx) => (
                  <div 
                    key={task.id}
                    className={`daily-task ${task.completed ? 'completed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleMainTask(idx)}
                    />
                    <span className="task-text">{task.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Задач еще нет</p>
            )}

            <div className="add-input">
              <input
                type="text"
                placeholder="Новая главная задача..."
                value={newMainTask}
                onChange={(e) => setNewMainTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMainTask()}
              />
              <button onClick={addMainTask}>Добавить</button>
            </div>
          </div>

          <div className="daily-section">
            <h3>⭐ Привычки</h3>
            {dailyTask && dailyTask.habits.length > 0 ? (
              <div className="habits-list">
                {dailyTask.habits.map((habit, idx) => (
                  <div 
                    key={habit.id}
                    className={`daily-habit ${habit.completed ? 'completed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={habit.completed}
                      onChange={() => toggleHabit(idx)}
                    />
                    <span className="habit-text">{habit.name}</span>
                    {habit.streak > 0 && (
                      <span className="streak-badge">🔥 {habit.streak}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Привычек еще нет</p>
            )}

            <div className="add-input">
              <input
                type="text"
                placeholder="Новая привычка..."
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addHabit()}
              />
              <button onClick={addHabit}>Добавить</button>
            </div>
          </div>

          <div className="daily-section">
            <h3>📊 Метрики</h3>
            <div className="metrics-inputs">
              <div className="metric-input">
                <label>💧 Вода (л)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={metrics.water}
                  onChange={(e) => updateMetrics('water', parseFloat(e.target.value))}
                />
              </div>
              <div className="metric-input">
                <label>👟 Шаги</label>
                <input
                  type="number"
                  min="0"
                  value={metrics.steps}
                  onChange={(e) => updateMetrics('steps', parseInt(e.target.value))}
                />
              </div>
              <div className="metric-input">
                <label>🔥 Ккал</label>
                <input
                  type="number"
                  min="0"
                  value={metrics.calories}
                  onChange={(e) => updateMetrics('calories', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="daily-section">
            <h3>💡 Инсайт дня</h3>
            <textarea
              placeholder="Что вы узнали сегодня? Какой был ваш самый большой успех?"
              value={newInsight}
              onChange={(e) => setNewInsight(e.target.value)}
              rows="3"
            />
            <button onClick={saveInsight} className="save-insight">Сохранить инсайт</button>
          </div>

          <div className="daily-actions">
            <button onClick={generateSummary} className="summary-btn">
              📊 Подвести итоги дня
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DailyView;

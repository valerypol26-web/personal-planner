import React, { useState, useEffect } from 'react';
import '../styles/WeekView.css';

function WeekView({ userId }) {
  const [week, setWeek] = useState(null);
  const [sprint, setSprint] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', category: '' });
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchWeekData();
  }, [userId]);

  const fetchWeekData = async () => {
    try {
      // Получаем текущий спринт
      const sprintRes = await fetch(`${API_URL}/api/sprint/${userId}`);
      const sprintData = await sprintRes.json();
      setSprint(sprintData);

      // Получаем текущую неделю
      const weekRes = await fetch(`${API_URL}/api/week/current/${userId}`);
      const weekData = await weekRes.json();
      setWeek(weekData);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке недели:', error);
      setLoading(false);
    }
  };

  const createWeek = async () => {
    if (!sprint || !newTask.title) return;

    try {
      const now = new Date('2026-01-15'); // пример
      const weekNumber = Math.ceil((now - new Date(sprint.startDate)) / (7 * 24 * 60 * 60 * 1000));

      const response = await fetch(`${API_URL}/api/week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sprintId: sprint._id,
          weekNumber: Math.max(1, weekNumber),
          tasks: [newTask]
        })
      });

      const data = await response.json();
      setWeek(data);
      setNewTask({ title: '', priority: 'medium', category: '' });
    } catch (error) {
      console.error('Ошибка при создании недели:', error);
    }
  };

  const addTask = async () => {
    if (!newTask.title) return;

    if (!week) {
      createWeek();
      return;
    }

    try {
      const updatedTasks = [
        ...week.tasks,
        {
          id: Date.now().toString(),
          ...newTask
        }
      ];

      const response = await fetch(`${API_URL}/api/week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sprintId: sprint?._id,
          weekNumber: week.weekNumber,
          tasks: updatedTasks
        })
      });

      const data = await response.json();
      setWeek(data);
      setNewTask({ title: '', priority: 'medium', category: '' });
    } catch (error) {
      console.error('Ошибка при добавлении задачи:', error);
    }
  };

  const toggleTaskCompletion = async (taskIndex) => {
    if (!week) return;

    try {
      const updatedTasks = [...week.tasks];
      updatedTasks[taskIndex].completed = !updatedTasks[taskIndex].completed;

      const response = await fetch(`${API_URL}/api/week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sprintId: sprint?._id,
          weekNumber: week.weekNumber,
          tasks: updatedTasks
        })
      });

      const data = await response.json();
      setWeek(data);
    } catch (error) {
      console.error('Ошибка при обновлении задачи:', error);
    }
  };

  const deleteTask = async (taskIndex) => {
    if (!week) return;

    try {
      const updatedTasks = week.tasks.filter((_, idx) => idx !== taskIndex);

      const response = await fetch(`${API_URL}/api/week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sprintId: sprint?._id,
          weekNumber: week.weekNumber,
          tasks: updatedTasks
        })
      });

      const data = await response.json();
      setWeek(data);
    } catch (error) {
      console.error('Ошибка при удалении задачи:', error);
    }
  };

  if (loading) {
    return <div className="loading">Загружаю неделю...</div>;
  }

  // Группируем задачи по категориям
  const groupedTasks = week ? week.tasks.reduce((acc, task) => {
    const category = task.category || 'Без категории';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {}) : {};

  // Сортируем задачи по приоритету
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTasks = (tasks) => {
    return [...tasks].sort((a, b) => 
      (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    );
  };

  const getWeekDates = () => {
    if (!week) return '';
    const start = new Date(week.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const end = new Date(week.endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `${start} — ${end}`;
  };

  const completedCount = week ? week.tasks.filter(t => t.completed).length : 0;
  const totalCount = week ? week.tasks.length : 0;

  return (
    <div className="week-view">
      {week ? (
        <>
          <div className="week-header">
            <h2>📅 Неделя {week.weekNumber}</h2>
            <p className="week-dates">{getWeekDates()}</p>
            <div className="week-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount * 100) : 0}%` }}
                ></div>
              </div>
              <p className="progress-text">
                Выполнено: {completedCount}/{totalCount}
              </p>
            </div>
          </div>

          {Object.keys(groupedTasks).length > 0 ? (
            Object.entries(groupedTasks).map(([category, tasks]) => (
              <div key={category} className="task-category">
                <h3 className="category-title">{category}</h3>
                <div className="tasks-list">
                  {sortedTasks(tasks).map((task, idx) => (
                    <div 
                      key={task.id} 
                      className={`task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => {
                          const actualIndex = week.tasks.findIndex(t => t.id === task.id);
                          toggleTaskCompletion(actualIndex);
                        }}
                        className="task-checkbox"
                      />
                      <span className="task-text">{task.title}</span>
                      <span className={`priority-badge priority-${task.priority}`}>
                        {task.priority === 'high' ? '⭐' : task.priority === 'medium' ? '●' : '○'}
                      </span>
                      <button
                        onClick={() => {
                          const actualIndex = week.tasks.findIndex(t => t.id === task.id);
                          deleteTask(actualIndex);
                        }}
                        className="delete-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-text">Задач пока нет</p>
          )}

          <div className="add-task-form">
            <input
              type="text"
              placeholder="Новая задача..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <option value="high">Высокий приоритет ⭐</option>
              <option value="medium">Средний приоритет ●</option>
              <option value="low">Низкий приоритет ○</option>
            </select>
            <input
              type="text"
              placeholder="Категория"
              value={newTask.category}
              onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
            />
            <button onClick={addTask}>Добавить</button>
          </div>
        </>
      ) : (
        <div className="create-week">
          <h2>Создайте неделю с задачами</h2>
          <p>Разбейте спринт на недельные задачи с приоритизацией</p>
          
          <div className="add-task-form">
            <input
              type="text"
              placeholder="Первая задача недели..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <option value="high">Высокий приоритет ⭐</option>
              <option value="medium">Средний приоритет ●</option>
              <option value="low">Низкий приоритет ○</option>
            </select>
            <input
              type="text"
              placeholder="Категория"
              value={newTask.category}
              onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
            />
            <button onClick={createWeek}>Создать неделю</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeekView;

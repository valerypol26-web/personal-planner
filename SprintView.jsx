import React, { useState, useEffect } from 'react';
import '../styles/SprintView.css';

function SprintView({ userId }) {
  const [sprint, setSprint] = useState(null);
  const [newGoal, setNewGoal] = useState('');
  const [newEvent, setNewEvent] = useState({ date: '', title: '', description: '' });
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchSprint();
  }, [userId]);

  const fetchSprint = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sprint/${userId}`);
      const data = await response.json();
      setSprint(data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке спринта:', error);
      setLoading(false);
    }
  };

  const createSprint = async () => {
    if (!newGoal) return;

    try {
      const response = await fetch(`${API_URL}/api/sprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: 'Спринт 2026',
          goals: [newGoal]
        })
      });

      const data = await response.json();
      setSprint(data);
      setNewGoal('');
    } catch (error) {
      console.error('Ошибка при создании спринта:', error);
    }
  };

  const addGoal = async () => {
    if (!newGoal || !sprint) return;

    try {
      const updatedGoals = [...sprint.goals, newGoal];
      const response = await fetch(`${API_URL}/api/sprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: sprint.title,
          goals: updatedGoals
        })
      });

      const data = await response.json();
      setSprint(data);
      setNewGoal('');
    } catch (error) {
      console.error('Ошибка при добавлении цели:', error);
    }
  };

  const addEvent = async () => {
    if (!newEvent.date || !newEvent.title || !sprint) return;

    try {
      const response = await fetch(`${API_URL}/api/sprint/${sprint._id}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(newEvent.date),
          title: newEvent.title,
          description: newEvent.description
        })
      });

      const data = await response.json();
      setSprint(data);
      setNewEvent({ date: '', title: '', description: '' });
    } catch (error) {
      console.error('Ошибка при добавлении события:', error);
    }
  };

  if (loading) {
    return <div className="loading">Загружаю спринт...</div>;
  }

  const progressDays = sprint ? Math.floor((new Date() - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24)) : 0;
  const progressPercent = sprint ? Math.floor((progressDays / 90) * 100) : 0;

  return (
    <div className="sprint-view">
      {sprint ? (
        <>
          <div className="sprint-progress">
            <h2>🎯 {sprint.title}</h2>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="progress-text">
              День {Math.min(progressDays, 90)}/90 • {progressPercent}%
            </p>
            <p className="sprint-dates">
              {new Date(sprint.startDate).toLocaleDateString('ru-RU')} — {new Date(sprint.endDate).toLocaleDateString('ru-RU')}
            </p>
          </div>

          <div className="sprint-section">
            <h3>🎯 Глобальные цели</h3>
            <div className="goals-list">
              {sprint.goals.map((goal, idx) => (
                <div key={idx} className="goal-item">
                  <span className="goal-icon">✓</span>
                  <span className="goal-text">{goal}</span>
                </div>
              ))}
            </div>

            <div className="add-goal">
              <input
                type="text"
                placeholder="Добавить новую цель..."
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addGoal()}
              />
              <button onClick={addGoal}>Добавить</button>
            </div>
          </div>

          <div className="sprint-section">
            <h3>📅 События спринта</h3>
            {sprint.events && sprint.events.length > 0 ? (
              <div className="events-list">
                {sprint.events.map((event, idx) => (
                  <div key={idx} className="event-item">
                    <span className="event-date">
                      {new Date(event.date).toLocaleDateString('ru-RU')}
                    </span>
                    <div className="event-content">
                      <p className="event-title">{event.title}</p>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Событий пока нет</p>
            )}

            <div className="add-event">
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              />
              <input
                type="text"
                placeholder="Название события"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
              <textarea
                placeholder="Описание (опционально)"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows="2"
              />
              <button onClick={addEvent}>Добавить событие</button>
            </div>
          </div>
        </>
      ) : (
        <div className="create-sprint">
          <h2>Создайте ваш первый спринт!</h2>
          <p>Спринт — это 90 дней для достижения ваших больших целей</p>
          
          <div className="add-goal">
            <input
              type="text"
              placeholder="Первая цель спринта..."
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createSprint()}
            />
            <button onClick={createSprint}>Создать спринт</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SprintView;

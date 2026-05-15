import React, { useState, useEffect } from 'react';
import './App.css';
import SprintView from './components/SprintView';
import WeekView from './components/WeekView';
import DailyView from './components/DailyView';

function App() {
  const [currentView, setCurrentView] = useState('daily');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем user_id из URL параметров (передается Telegram Bot)
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('user_id');
    setUserId(uid);

    // Инициализируем Telegram Web App
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.setHeaderColor('#1f2937');
    }

    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Загружаю приложение...</div>;
  }

  if (!userId) {
    return <div className="loading">Ошибка: не удалось получить ID пользователя</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 Personal Planner</h1>
        <p>Управляйте спринтами, неделями и ежедневными задачами</p>
      </header>

      <nav className="app-nav">
        <button 
          className={`nav-button ${currentView === 'sprint' ? 'active' : ''}`}
          onClick={() => setCurrentView('sprint')}
        >
          <span className="icon">🎯</span>
          <span>Спринт</span>
        </button>
        <button 
          className={`nav-button ${currentView === 'week' ? 'active' : ''}`}
          onClick={() => setCurrentView('week')}
        >
          <span className="icon">📅</span>
          <span>Неделя</span>
        </button>
        <button 
          className={`nav-button ${currentView === 'daily' ? 'active' : ''}`}
          onClick={() => setCurrentView('daily')}
        >
          <span className="icon">📝</span>
          <span>Сегодня</span>
        </button>
      </nav>

      <main className="app-content">
        {currentView === 'sprint' && <SprintView userId={userId} />}
        {currentView === 'week' && <WeekView userId={userId} />}
        {currentView === 'daily' && <DailyView userId={userId} />}
      </main>
    </div>
  );
}

export default App;

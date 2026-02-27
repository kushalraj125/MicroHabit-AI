import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

const App = () => {
  // 1. STATE MANAGEMENT
  const [view, setView] = useState('login'); // Controls which page is shown
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [input, setInput] = useState('');
  const [aiAdvice, setAiAdvice] = useState(''); // For AI-generated advice
  const [loadingAi, setLoadingAi] = useState(false); // AI loading state
  const [history, setHistory] = useState({}); // For tracking completion history

  // Separate states for the login/register inputs (Fixes the typing issue)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // AI COACH FUNCTION
  const getAiAdvice = async () => {
    setLoadingAi(true);
    const data = await apiRequest('/ai-coach');
    setAiAdvice(data.advice || data.error);
    setLoadingAi(false);
  };

  useEffect(() => {
    if (user) {
      apiRequest('/history').then(setHistory);
    }
  }, [user, habits]); // Refresh history when habits change



  // 2. API CALL HELPER
  const apiRequest = async (url, method = 'GET', body = null) => {
    try {
      const response = await fetch(`http://localhost:5000/api${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
        credentials: 'include', // Important for sessions
      });
      const data = await response.json();
      if (response.status === 401 && user) setUser(null);
      return data;
    } catch (err) {
      return { error: "Check if app.py is running" };
    }
  };

  // 3. AUTHENTICATION LOGIC
  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = view === 'login' ? '/login' : '/register';
    const data = await apiRequest(endpoint, 'POST', { username, password });

    if (data.user) {
      setUser(data.user);
      setView('dashboard');
    } else if (data.message && view === 'register') {
      alert("Registration successful! Please login.");
      setView('login');
      setUsername('');
      setPassword('');
    } else {
      alert(data.error || "Action failed");
    }
  };

  // 4. HABIT LOGIC
  useEffect(() => {
    if (user) {
      apiRequest('/habits').then(data => Array.isArray(data) && setHabits(data));
    }
  }, [user, habits]);

  const addHabit = async () => {
    if (!input.trim()) return;
    const res = await apiRequest('/habits', 'POST', { name: input });
    if (res.id) {
      setHabits([...habits, { ...res, completed: false }]);
      setInput('');
    }
  };

  const toggleHabit = async (id) => {
    const res = await apiRequest(`/habits/${id}`, 'PATCH');
    setHabits(habits.map(h => h.id === id ? { ...h, completed: res.completed } : h));
  };

  const deleteHabit = async (id) => {
    const res = await apiRequest(`/habits/${id}`, 'DELETE');
    if (!res.error) {
      setHabits(habits.filter(h => h.id !== id));
    }
  };

  const resetHabits = async () => {
    const res = await apiRequest('/habits/reset', 'POST');
    if (!res.error) {
      setHabits(habits.map(h => ({ ...h, completed: false })));
    }
  };


  // Calculate progress
  const completedCount = habits.filter(h => h.completed).length;
  const totalCount = habits.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // --- CONFETTI TRIGGER ---
  useEffect(() => {
    // Only trigger if progress is 100 AND there's actually at least one habit
    if (progress === 100 && totalCount > 0) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00b894', '#0984e3', '#fdcb6e']
      });
    }
  }, [progress, totalCount]);

  // 5. RENDERING THE PAGES

  // LOGIN / REGISTER PAGE
  if (view === 'login' || view === 'register') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={{ textAlign: 'center', color: '#2d3436' }}>
            {view === 'login' ? 'Login' : 'Create Account'}
          </h2>
          <form onSubmit={handleAuth} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)} // UNLOCKS TYPING
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} // UNLOCKS TYPING
              required
            />
            <button type="submit" style={styles.primaryBtn}>
              {view === 'login' ? 'Sign In' : 'Register Now'}
            </button>
          </form>
          <button
            onClick={() => setView(view === 'login' ? 'register' : 'login')}
            style={styles.linkBtn}
          >
            {view === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    );
  }

  // DASHBOARD PAGE
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>🌱 My Habits</h3>
          <button onClick={() => { apiRequest('/logout', 'POST'); setUser(null); setView('login'); }} style={styles.logoutBtn}>Logout</button>
        </div>

        {/* PROGRESS BAR SECTION */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#636e72', marginBottom: '5px' }}>
            <span>{progress === 100 ? 'All done! 🎉' : 'Daily Progress'}</span>
            <span>{progress}%</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressBar,
              width: `${progress}%`,
              // Dynamic color change
              backgroundColor: progress === 100 ? '#0984e3' : '#00b894'
            }}></div>
          </div>
        </div>


        <button
          onClick={getAiAdvice}
          style={styles.aiBtn}
          disabled={loadingAi}
        >
          {loadingAi ? 'Asking Coach...' : '✨ Get AI Coaching'}
        </button>

        {aiAdvice && (
          <div style={styles.aiBubble}>
            <strong>Coach Gemini:</strong> {aiAdvice}
          </div>
        )}


        <div style={styles.inputGroup}>
          <input
            style={{ ...styles.input, flex: 1 }}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="New habit..."
            onKeyPress={e => e.key === 'Enter' && addHabit()}
          />
          <button onClick={addHabit} style={styles.addBtn}>Add</button>
        </div>

        <ul style={{ padding: 0 }}>
          {habits.map(h => (
            <li key={h.id} style={styles.habitItem}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={h.completed} onChange={() => toggleHabit(h.id)} />
                <span style={{
                  marginLeft: '10px',
                  textDecoration: h.completed ? 'line-through' : 'none',
                  color: h.completed ? '#3d256d' : '#333'

                }}>
                  {h.name}
                </span>
              </div>
              {/* DELETE BUTTON */}
              <button
                onClick={() => deleteHabit(h.id)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ff4d4d' }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        {/* RESET BUTTON */}
        {habits.length > 0 && (
          <button onClick={resetHabits} style={styles.resetBtn}>
            Start New Day (Reset All)
          </button>
        )}

        {/* HISTORY CHART */}
        <HistoryPage history={history} />
      </div>
    </div>
  );

};

// 6. STYLING (The CSS)
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#dfe6e9', fontFamily: '-apple-system, sans-serif' },
  card: { background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', width: '340px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '14px', borderRadius: '10px', border: '1px solid #ced6e0', fontSize: '16px', outline: 'none' },
  primaryBtn: { padding: '14px', backgroundColor: '#00b894', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' },
  linkBtn: { background: 'none', border: 'none', color: '#0984e3', cursor: 'pointer', textDecoration: 'underline', marginTop: '20px', width: '100%' },
  logoutBtn: { background: '#ffeaa7', border: 'none', color: '#d63031', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' },
  inputGroup: { display: 'flex', gap: '10px', margin: '25px 0' },
  addBtn: { backgroundColor: '#2d3436', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', cursor: 'pointer', fontWeight: 'bold' },
  habitItem: { listStyle: 'none', display: 'flex', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #f1f2f6' },
  resetBtn: { width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#f1f2f6', border: '1px solid #dfe6e9', borderRadius: '8px', cursor: 'pointer', color: '#636e72', fontWeight: 'bold' },
  progressTrack: { width: '100%', height: '10px', backgroundColor: '#f1f2f6', borderRadius: '5px', overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#00b894', transition: 'width 0.3s ease-in-out' },
  aiBtn: { marginTop: '20px', width: '100%', padding: '10px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  aiBubble: { marginTop: '15px', padding: '15px', backgroundColor: '#dfe6e9', borderRadius: '10px', fontStyle: 'italic', color: '#2d3436' },
  horizontalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  rowDate: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#636e72',
    width: '25px', // Fixed width keeps bars aligned
    textAlign: 'right'
  },
  barContainer: {
    flex: 1,
    height: '24px',
    display: 'flex',
    alignItems: 'center'
  },
  horizontalBar: {
  height: '100%',
  borderRadius: '0 6px 6px 0',
  transition: 'width 0.8s cubic-bezier(0.1, 0.7, 1.0, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: '8px',
  // ADD THIS for a 2026 "Glassmorphism" look:
  background: 'linear-gradient(90deg, #6c5ce7 0%, #a29bfe 100%)',
  boxShadow: '2px 2px 10px rgba(108, 92, 231, 0.2)'
},
  rowPercent: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
  }
};

// --- PLACE THIS AT THE VERY BOTTOM OF App.js ---
const HistoryPage = ({ history }) => {
  // We removed .reverse() so the list starts with Today and goes backwards
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div style={{ marginTop: '30px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
      <h4 style={{ color: '#636e72', marginBottom: '15px', textAlign: 'center' }}>Recent History</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {last7Days.map(date => {
          const count = history[date] || 0;
          // Width: 30px per habit, max 200px
          const barWidth = Math.min(count * 30, 200); 

          return (
            <div key={date} style={styles.horizontalRow}>
              {/* DATE LABEL (e.g., 28, 27, 26...) */}
              <span style={styles.rowDate}>{date.split('-')[2]}</span>
              
              <div style={styles.barContainer}>
                <div style={{ 
                  ...styles.horizontalBar, 
                  width: `${barWidth}px`, 
                  backgroundColor: count > 0 ? '#6c5ce7' : '#dfe6e9',
                  // If 0, we show a tiny sliver so the user sees the line
                  minWidth: count > 0 ? 'auto' : '4px' 
                }}>
                  {count > 0 && <span style={styles.rowPercent}>{count}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


export default App;
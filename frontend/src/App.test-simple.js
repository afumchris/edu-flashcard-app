import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Frontend is Working!</h1>
      <p>If you can see this, React is rendering correctly.</p>
      <p>Backend URL: {process.env.REACT_APP_BACKEND_URL || 'http://localhost:5002'}</p>
    </div>
  );
}

export default App;

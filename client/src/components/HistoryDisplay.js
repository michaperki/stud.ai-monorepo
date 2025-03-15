
// src/components/HistoryDisplay.js
import React from 'react';

const HistoryDisplay = ({ history }) => {
  if (!history || history.length === 0) return null;

  return (
    <div style={{ marginTop: '1rem', width: '100%' }}>
      <h3>History:</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Word</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Your Response</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Correct?</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '0.5rem' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, idx) => (
            <tr key={idx}>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{item.word}</td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{item.userResponse}</td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                {item.isCorrect ? '✔' : '✘'}
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryDisplay;

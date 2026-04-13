import React, { useState, useEffect } from 'react';
import { MOCK_DATA, SNOWMAN_IMAGES, KEYBOARD_ROWS } from './mockData';

// Reemplazar con URL de Google Apps Script cuando se publique
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwLcTeIeb6-Lt7aL0VbipI7Xz4WiVhjbVdRGgCd47X0z-1T9ljKGfjYp_8uejwngpca/exec';

export default function App() {
  const [gameState, setGameState] = useState('LOGIN'); // LOGIN, PLAYING, WORD_RESULT, END
  const [playerId, setPlayerId] = useState('');
  
  const [themeTitle, setThemeTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [errors, setErrors] = useState(0); // Max 7
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [currentInput, setCurrentInput] = useState(''); // Nuevo input manual
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inicializar Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    if (!GAS_API_URL) {
      setTimeout(() => {
        setThemeTitle(MOCK_DATA.theme_title);
        setQuestions(MOCK_DATA.questions);
        setLoading(false);
      }, 600);
      return;
    }
    
    try {
      const resp = await fetch(GAS_API_URL);
      const json = await resp.json();
      if (json.success) {
        setThemeTitle(json.theme_title);
        setQuestions(json.questions);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if(playerId.length >= 6) {
      setGameState('PLAYING');
      setTotalScore(0);
      startWord(0);
    }
  };

  const startWord = (index) => {
    setCurrentQIndex(index);
    setErrors(0);
    setScore(0);
    setGuessedLetters([]);
    setGameState('PLAYING');
  };

  const submitFinalScore = async (finalScore) => {
    setSubmitting(true);
    if (GAS_API_URL) {
      try {
        await fetch(GAS_API_URL, {
          method: 'POST',
          body: JSON.stringify({ playerId, score: finalScore })
        });
      } catch (e) {
        console.error(e);
      }
    }
    setSubmitting(false);
  };

  const handleKeyboardClick = (letter) => {
    const cleanLetter = letter.toUpperCase();
    if (gameState !== 'PLAYING' || !cleanLetter) return;
    if (guessedLetters.includes(cleanLetter)) {
       setCurrentInput('');
       return;
    }

    const newGuessed = [...guessedLetters, cleanLetter];
    setGuessedLetters(newGuessed);
    setCurrentInput('');

    const q = questions[currentQIndex];
    if (!q.answer.includes(cleanLetter)) {
       const newErr = errors + 1;
       setErrors(newErr);
       if (newErr >= 7) {
          endWord(false); // Game Over inmediato
       }
    } else {
       // Check win word
       const isWin = evaluateWordCompletion(q.answer, newGuessed);
       if (isWin) {
          endWord(true); // Word guessed 
       }
    }
  };

  const evaluateWordCompletion = (word, guessed) => {
    const chars = word.split('').filter(c => c !== ' ');
    return chars.every(c => guessed.includes(c));
  };

  const endWord = (won) => {
    if (won) {
       const wordPoints = questions[currentQIndex].points || 10;
       setTotalScore(prev => prev + wordPoints);
       setScore(wordPoints);
    }
    setGameState('WORD_RESULT');
  };

  const nextAction = () => {
     // Si perdimos la palabra, game over general
     if (errors >= 7) {
        setGameState('END');
        submitFinalScore(totalScore);
        return;
     }
     
     // Si quedan preguntas
     if (currentQIndex + 1 < questions.length) {
        startWord(currentQIndex + 1);
     } else {
        // Victoria del juego completo
        setGameState('END');
        submitFinalScore(totalScore);
     }
  };

  if (loading) {
    return <div className="loader"></div>;
  }

  // ---- VIEWS ----

  if (gameState === 'LOGIN') {
    return (
      <div className="glass-panel" style={{margin: 'auto'}}>
        <h1>⛄ Snowman</h1>
        <p style={{color: 'var(--text-muted)'}}>¡Evita que el muñeco de nieve se derrita por el calor en cada pregunta!</p>
        
        <form onSubmit={handleLogin} style={{marginTop: 30}}>
          <label style={{fontSize: '0.9rem', color: 'var(--accent)'}}>ID DE JUGADOR</label>
          <input 
            type="number" 
            className="login-input" 
            placeholder="Mínimo 6 dígitos" 
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)} 
            style={{color: 'var(--text-main)'}}
          />
          <button type="submit" className="btn" disabled={playerId.length < 6}>
            COMENZAR
          </button>
        </form>
      </div>
    );
  }

  if (gameState === 'END') {
     const isVictory = errors < 7;
     return (
       <div className="glass-panel" style={{margin: 'auto'}}>
         <h1>{isVictory ? '¡Victoria Absoluta! 🏆' : 'Game Over 🧊'}</h1>
         <img 
           src={isVictory ? SNOWMAN_IMAGES.WIN : SNOWMAN_IMAGES.LOSE} 
           alt="Result" 
           className="snowman-img"
         />
         <div style={{margin: '20px 0'}}>
           <p style={{color: 'var(--text-muted)'}}>Puntuación Total:</p>
           <h2 style={{fontSize: '3rem', color: 'var(--accent)'}}>{totalScore}</h2>
           {submitting ? <p>Guardando score...</p> : <p style={{color: '#4ade80'}}>¡Grabado en la Base de Datos!</p>}
         </div>
         <button className="btn" onClick={() => window.location.reload()} disabled={submitting}>
           VOLVER A INICIO
         </button>
       </div>
     );
  }

  const currentQ = questions[currentQIndex];
  const isWordWon = gameState === 'WORD_RESULT' && errors < 7;
  const isWordLost = gameState === 'WORD_RESULT' && errors >= 7;

  return (
    <div className="game-area">
      <div className="game-stats">
         <span style={{color: 'rgba(0,0,0,0.5)'}}>Pregunta: {currentQIndex + 1} de {questions.length}</span>
         <span style={{color: 'var(--accent)'}}>Puntos: {totalScore}</span>
      </div>

      <div className="theme-title">{themeTitle}</div>

      <img 
        src={isWordWon ? SNOWMAN_IMAGES.WIN : isWordLost ? SNOWMAN_IMAGES.LOSE : SNOWMAN_IMAGES[errors]} 
        alt={`Snowman State ${errors}`} 
        className="snowman-img"
      />

      {gameState === 'WORD_RESULT' ? (
         <div className="glass-panel" style={{width: '100%', marginBottom: 20}}>
            <h2>{isWordWon ? '¡Adivinado!' : '¡Te equivocaste!'}</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: 10}}>La palabra era:</p>
            <h3 style={{color: 'var(--accent)', letterSpacing: 3, marginBottom: 20}}>{currentQ.answer}</h3>
            {isWordWon && <p style={{color: '#4ade80', marginBottom: 20}}>+{score} pts</p>}
            
            <button className="btn" onClick={nextAction}>
              {errors >= 7 || currentQIndex + 1 === questions.length ? 'VER RESULTADOS' : 'SIGUIENTE PREGUNTA'}
            </button>
         </div>
      ) : (
         <>
            <p className="question-text">{currentQ.question}</p>

            <div className="word-container">
              {currentQ.answer.split('').map((char, index) => {
                const isSpace = char === ' ';
                const isRevealed = guessedLetters.includes(char) || isSpace;
                return (
                  <div key={index} className={`letter-box ${isSpace ? 'space' : ''}`}>
                    {isRevealed ? char : ''}
                  </div>
                );
              })}
            </div>

            <form 
              className="letter-input-container" 
              onSubmit={(e) => {
                e.preventDefault();
                handleKeyboardClick(currentInput);
              }}
            >
              <input 
                type="text" 
                maxLength="1" 
                className="char-input" 
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value.toUpperCase())}
                autoFocus
              />
              <button type="submit" className="btn-check">✓</button>
            </form>
         </>
      )}
    </div>
  );
}

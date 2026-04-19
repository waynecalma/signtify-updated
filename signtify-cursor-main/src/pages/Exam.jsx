import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../auth/firebase';
import { useAuth } from '../auth/AuthContext';
import { saveExamResult, getUserProfile } from '../auth/firestoreUtils';
import '../styles/pages/Quiz.css';

function Exam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bestScore, setBestScore] = useState(null);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExam();
    if (currentUser) {
      loadBestScore();
    }
  }, [examId, currentUser]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const examRef = doc(db, 'exams', examId);
      const examDoc = await getDoc(examRef);
      
      if (examDoc.exists()) {
        setExam({ id: examDoc.id, ...examDoc.data() });
      } else {
        setError('Exam not found');
      }
    } catch (err) {
      console.error('Error loading exam:', err);
      setError('Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const loadBestScore = async () => {
    try {
      const profile = await getUserProfile(currentUser.uid);
      if (profile?.progress?.examsPassed) {
        // Find all attempts for this exam
        const examAttempts = profile.progress.examsPassed.filter(
          e => e.examId === examId
        );
        
        if (examAttempts.length > 0) {
          // Get the highest percentage
          const highestScore = Math.max(...examAttempts.map(e => e.percentage));
          setBestScore(highestScore);
        }
      }
    } catch (error) {
      console.error('Error loading best score:', error);
    }
  };

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleNext = async () => {
    if (!exam || !exam.questions) return;
    
    const isCorrect = selectedAnswer === exam.questions[currentQuestion].answer;
    
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) {
      setScore(newScore);
    }

    if (currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
    } else {
      setShowResult(true);
      // Save exam result to Firestore
      if (currentUser) {
        setSaving(true);
        try {
          await saveExamResult(currentUser.uid, examId, newScore, exam.questions.length, exam.category);
          // Reload best score after saving
          await loadBestScore();
        } catch (error) {
          console.error('Error saving exam result:', error);
        } finally {
          setSaving(false);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="quiz-page">
        <div className="loading-container">
          <p>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="quiz-page">
        <div className="error-container card">
          <h2>⚠️ {error || 'Exam not found'}</h2>
          <p>This exam may have been removed or doesn't exist.</p>
          <button onClick={() => navigate('/proficiency-exams')}>Return to Exams</button>
        </div>
      </div>
    );
  }

  if (!exam.questions || exam.questions.length === 0) {
    return (
      <div className="quiz-page">
        <div className="error-container card">
          <h2>⚠️ No Questions Available</h2>
          <p>This exam doesn't have any questions yet.</p>
          <button onClick={() => navigate('/proficiency-exams')}>Return to Exams</button>
        </div>
      </div>
    );
  }

  const percentage = Math.round((score / exam.questions.length) * 100);
  const passingScore = exam.passingScore || 80;

  if (showResult) {
    const isNewBest = bestScore === null || percentage > bestScore;
    
    return (
      <div className="quiz-page">
        <div className="quiz-result card">
          <h1>Proficiency Exam Complete!</h1>
          {saving && <p className="saving-text">Saving your results...</p>}
          <div className={`score-display ${percentage >= passingScore ? 'pass' : 'fail'}`}>
            <div className="score-circle">
              <span className="score-number">{percentage}%</span>
            </div>
            <p className="score-text">{score} out of {exam.questions.length} correct</p>
          </div>
          
          {/* Best Score Comparison */}
          {bestScore !== null && (
            <div className="score-comparison">
              {isNewBest ? (
                <div className="new-best-banner">
                  🏆 <strong>New Best Score!</strong> (Previous: {bestScore}%)
                </div>
              ) : (
                <div className="best-score-info">
                  Your Best: <strong>{bestScore}%</strong>
                </div>
              )}
            </div>
          )}
          
          {percentage >= passingScore ? (
            <div className="result-message success">
              <h2>🎉 Excellent Performance!</h2>
              <p>Congratulations! You passed the proficiency exam.</p>
              {(() => {
                // Check if this is a retake after already passing
                const isRetake = bestScore !== null && bestScore >= passingScore;
                return isRetake ? (
                  <p className="points-earned" style={{ color: '#666', fontStyle: 'italic' }}>
                    No points awarded - You've already passed this exam before
                  </p>
                ) : (
                  <p className="points-earned">+{score * 20} points earned!</p>
                );
              })()}
            </div>
          ) : (
            <div className="result-message">
              <h2>Keep Trying!</h2>
              <p>You need {passingScore}% to pass. Review and try again!</p>
            </div>
          )}

          <div className="result-actions">
            <button onClick={() => navigate('/proficiency-exams')}>Return to Exams</button>
            <button onClick={() => navigate('/profile')} className="secondary">View Profile</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <div className="header-content">
          <h1>{exam.title || 'Proficiency Exam'}</h1>
          {bestScore !== null && (
            <div className="best-score-badge">
              <span className="badge-label">Best Score:</span>
              <span className="badge-value">{bestScore}%</span>
            </div>
          )}
        </div>
        <div className="quiz-progress">
          <span>Question {currentQuestion + 1} of {exam.questions.length}</span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentQuestion + 1) / exam.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="quiz-content card">
        <div className="question-display">
          <div className="sign-visual">
            {exam.questions[currentQuestion].imageUrl ? (
              <div className="sign-image">
                <img 
                  src={exam.questions[currentQuestion].imageUrl} 
                  alt="Sign demonstration" 
                  style={{ maxWidth: '100%', borderRadius: '12px' }}
                />
              </div>
            ) : (
              <div className="sign-placeholder">
                {exam.questions[currentQuestion].handIcon || (exam.category === 'alphabet' ? '✋' : '👋')}
                <p>Sign displayed here</p>
              </div>
            )}
          </div>
          <h2>{exam.questions[currentQuestion].question}</h2>
        </div>

        <div className="options-grid">
          {exam.questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              className={`option-button ${selectedAnswer === option ? 'selected' : ''}`}
              onClick={() => handleAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="quiz-actions">
          <button 
            onClick={handleNext} 
            disabled={!selectedAnswer}
          >
            {currentQuestion < exam.questions.length - 1 ? 'Next Question' : 'Finish Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Exam;

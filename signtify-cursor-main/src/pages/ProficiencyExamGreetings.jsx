import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { saveExamResult, getUserProfile } from '../auth/firestoreUtils';
import '../styles/pages/Quiz.css';

function ProficiencyExamGreetings() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [hasAlreadyPassed, setHasAlreadyPassed] = useState(false);
  
  const questions = [
    { question: 'What greeting is this sign?', answer: 'Hello', options: ['Hello', 'Goodbye', 'Thank You', 'Please'] },
    { question: 'What greeting is this sign?', answer: 'Thank You', options: ['Sorry', 'Thank You', 'Welcome', 'Help'] },
    { question: 'What greeting is this sign?', answer: 'Good Morning', options: ['Good Morning', 'Good Night', 'Good afternoon', 'Goodbye'] },
    { question: 'What greeting is this sign?', answer: 'How are you?', options: ['How are you?', 'Nice to meet you', 'See you later', 'Take care'] },
    { question: 'What greeting is this sign?', answer: 'Yes', options: ['Yes', 'No', 'Maybe', 'Help'] },
    { question: 'What greeting is this sign?', answer: 'Please', options: ['Please', 'Thank You', 'Sorry', 'Welcome'] },
    { question: 'What greeting is this sign?', answer: 'Goodbye', options: ['Hello', 'Goodbye', 'See you later', 'Take care'] },
    { question: 'What greeting is this sign?', answer: 'Nice to meet you', options: ['Nice to meet you', 'How are you?', 'My name is', 'Friend'] },
    { question: 'What greeting is this sign?', answer: 'Good Night', options: ['Good Morning', 'Good afternoon', 'Good Night', 'Goodbye'] },
    { question: 'What greeting is this sign?', answer: 'Help', options: ['Help', 'Please', 'Thank You', 'Sorry'] },
  ];

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkPreviousPass();
  }, [currentUser]);

  const checkPreviousPass = async () => {
    if (currentUser) {
      try {
        const profile = await getUserProfile(currentUser.uid);
        const previousExams = profile?.progress?.examsPassed || [];
        const hasPassed = previousExams.some(exam => 
          exam.examId === 'greetings' && exam.passed === true && exam.percentage >= 80
        );
        setHasAlreadyPassed(hasPassed);
      } catch (error) {
        console.error('Error checking previous pass:', error);
      }
    }
  };

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleNext = async () => {
    const isCorrect = selectedAnswer === questions[currentQuestion].answer;
    
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) {
      setScore(newScore);
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
    } else {
      setShowResult(true);
      // Save exam result to Firestore
      if (currentUser) {
        setSaving(true);
        try {
          await saveExamResult(currentUser.uid, 'greetings', newScore, questions.length, 'greetings');
        } catch (error) {
          console.error('Error saving exam result:', error);
        } finally {
          setSaving(false);
        }
      }
    }
  };

  const handleReturnToExams = () => {
    navigate('/proficiency-exams');
  };

  const percentage = Math.round((score / questions.length) * 100);

  if (showResult) {
    return (
      <div className="quiz-page">
        <div className="quiz-result card">
          <h1>Proficiency Exam Complete!</h1>
          {saving && <p className="saving-text">Saving your results...</p>}
          <div className={`score-display ${percentage >= 80 ? 'pass' : 'fail'}`}>
            <div className="score-circle">
              <span className="score-number">{percentage}%</span>
            </div>
            <p className="score-text">{score} out of {questions.length} correct</p>
          </div>
          
          {percentage >= 80 ? (
            <div className="result-message success">
              <h2>🎉 Outstanding Work!</h2>
              <p>Congratulations! You passed the proficiency exam.</p>
              {hasAlreadyPassed ? (
                <p className="points-earned" style={{ color: '#666', fontStyle: 'italic' }}>
                  No points awarded - You've already passed this exam before
                </p>
              ) : (
                <p className="points-earned">+{score * 20} points earned!</p>
              )}
            </div>
          ) : (
            <div className="result-message">
              <h2>Keep Trying!</h2>
              <p>You need 80% to pass. Review and try again!</p>
            </div>
          )}

          <div className="result-actions">
            <button onClick={handleReturnToExams}>Return to Exams</button>
            <button onClick={() => navigate('/profile')} className="secondary">View Profile</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <h1>Proficiency Exam: Greetings</h1>
        <div className="quiz-progress">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="quiz-content card">
        <div className="question-display">
          <div className="sign-visual">
            <div className="sign-placeholder">
              👋
              <p>Sign displayed here</p>
            </div>
          </div>
          <h2>{questions[currentQuestion].question}</h2>
        </div>

        <div className="options-grid">
          {questions[currentQuestion].options.map((option) => (
            <button
              key={option}
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
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProficiencyExamGreetings;

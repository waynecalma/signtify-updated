import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, getAllLessons, getAllQuizzes, getAllExams, getAllDictionaryEntries } from '../../auth/adminUtils';
import '../../styles/pages/AdminDashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLessons: 0,
    totalQuizzes: 0,
    totalExams: 0,
    totalDictionaryEntries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [users, lessons, quizzes, exams, dictionary] = await Promise.all([
        getAllUsers(),
        getAllLessons(),
        getAllQuizzes(),
        getAllExams(),
        getAllDictionaryEntries()
      ]);

      setStats({
        totalUsers: users.length,
        totalLessons: lessons.length,
        totalQuizzes: quizzes.length,
        totalExams: exams.length,
        totalDictionaryEntries: dictionary.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage your Signtify application</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">📖</div>
          <div className="stat-info">
            <h3>{stats.totalLessons}</h3>
            <p>Lessons</p>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <h3>{stats.totalQuizzes}</h3>
            <p>Quizzes</p>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">🎓</div>
          <div className="stat-info">
            <h3>{stats.totalExams}</h3>
            <p>Exams</p>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>{stats.totalDictionaryEntries}</h3>
            <p>Dictionary Entries</p>
          </div>
        </div>
      </div>

      <div className="admin-sections">
        <h2>Management Sections</h2>
        <div className="sections-grid">
          <Link to="/admin/users" className="section-card card">
            <div className="section-icon">👥</div>
            <h3>User Management</h3>
            <p>View, edit, and manage user accounts</p>
          </Link>

          <Link to="/admin/lessons" className="section-card card">
            <div className="section-icon">📖</div>
            <h3>Lesson Management</h3>
            <p>Create, edit, and delete ASL lessons</p>
          </Link>

          <Link to="/admin/quizzes" className="section-card card">
            <div className="section-icon">📝</div>
            <h3>Quiz Management</h3>
            <p>Create, edit, and delete quizzes</p>
          </Link>

          <Link to="/admin/exams" className="section-card card">
            <div className="section-icon">🎓</div>
            <h3>Exam Management</h3>
            <p>Create, edit, and delete exams</p>
          </Link>

          <Link to="/admin/dictionary" className="section-card card">
            <div className="section-icon">📚</div>
            <h3>Dictionary Management</h3>
            <p>Manage sign language dictionary content</p>
          </Link>

          <Link to="/admin/activity-log" className="section-card card">
            <div className="section-icon">📋</div>
            <h3>Activity Log</h3>
            <p>View all admin and user activities</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

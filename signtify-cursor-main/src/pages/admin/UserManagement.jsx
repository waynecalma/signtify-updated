import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, updateUserAdminStatus, updateUserDetails, deleteUser, resetUserProgress } from '../../auth/adminUtils';
import { useAuth } from '../../auth/AuthContext';
import '../../styles/pages/AdminManagement.css';

function UserManagement() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: '',
    email: '',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, currentAdminStatus) => {
    if (userId === currentUser.uid) {
      alert('You cannot change your own admin status');
      return;
    }

    try {
      await updateUserAdminStatus(
        userId, 
        !currentAdminStatus,
        currentUser?.uid,
        currentUser?.email
      );
      await loadUsers();
      alert('Admin status updated successfully');
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      displayName: user.displayName || '',
      email: user.email || '',
      password: '' // Password field starts empty
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSaving(true);
      const updates = {
        displayName: editFormData.displayName
      };
      
      // Only include password if it's provided
      if (editFormData.password && editFormData.password.trim() !== '') {
        // Validate password: 12-16 alphanumeric characters
        if (editFormData.password.length < 12 || editFormData.password.length > 16) {
          alert('Password must be between 12 and 16 characters');
          setSaving(false);
          return;
        }
        if (!/[a-zA-Z]/.test(editFormData.password)) {
          alert('Password must contain at least one letter');
          setSaving(false);
          return;
        }
        if (!/[0-9]/.test(editFormData.password)) {
          alert('Password must contain at least one number');
          setSaving(false);
          return;
        }
        if (!/^[a-zA-Z0-9]+$/.test(editFormData.password)) {
          alert('Password must contain only letters and numbers (no special characters)');
          setSaving(false);
          return;
        }
        updates.password = editFormData.password;
      }
      
      await updateUserDetails(selectedUser.id, updates);
      await loadUsers();
      alert('User details updated successfully' + (editFormData.password ? ' (Note: Password stored in database. For Firebase Auth password update, user should use password reset.)' : ''));
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user details');
    } finally {
      setSaving(false);
    }
  };

  const handleResetProgress = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser.uid) {
      alert('You cannot reset your own progress');
      setShowResetConfirm(false);
      setSelectedUser(null);
      return;
    }

    try {
      await resetUserProgress(selectedUser.id);
      await loadUsers();
      alert('User progress reset successfully');
    } catch (error) {
      console.error('Error resetting user progress:', error);
      alert('Failed to reset user progress');
    } finally {
      setShowResetConfirm(false);
      setSelectedUser(null);
    }
  };

    const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser.uid) {
      alert('You cannot delete your own account');
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      return;
    }

    try {
      await deleteUser(selectedUser.id);
      await loadUsers();
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error?.message || 'Failed to delete user');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="admin-management">
        <div className="loading-container">
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-management">
      <div className="management-header">
        <Link to="/admin" className="back-button">← Back to Dashboard</Link>
        <h1>👥 User Management</h1>
        <p>Manage user accounts and permissions</p>
      </div>

      <div className="management-controls card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="management-stats">
          <span>Total Users: <strong>{users.length}</strong></span>
          <span>Admin Users: <strong>{users.filter(u => u.isAdmin).length}</strong></span>
        </div>
      </div>

      <div className="management-table card">
        <table>
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Email</th>
              <th>Created At</th>
              <th>Last Login</th>
              <th>Admin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={user.id === currentUser.uid ? 'current-user' : ''}>
                <td>{user.displayName || 'N/A'}</td>
                <td>{user.email}</td>
                <td>{formatDate(user.createdAt)}</td>
                <td>{formatDate(user.lastLogin)}</td>
                <td>
                  <span className={`badge ${user.isAdmin ? 'admin' : 'user'}`}>
                    {user.isAdmin ? 'Admin' : 'User'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-small btn-primary"
                      onClick={() => handleEditUser(user)}
                      title="Edit user details"
                    >
                      Edit
                    </button>
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                      disabled={user.id === currentUser.uid}
                      title={user.id === currentUser.uid ? 'Cannot modify own admin status' : 'Toggle admin status'}
                    >
                      {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                    </button>
                    <button
                      className="btn-small btn-warning"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowResetConfirm(true);
                      }}
                      disabled={user.id === currentUser.uid}
                      title={user.id === currentUser.uid ? 'Cannot reset own progress' : 'Reset user progress to zero'}
                    >
                      Reset
                    </button>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteConfirm(true);
                      }}
                      disabled={user.id === currentUser.uid}
                      title={user.id === currentUser.uid ? 'Cannot delete own account' : 'Delete user'}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-results">
            <p>No users found matching your search.</p>
          </div>
        )}
      </div>

      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Edit User Details</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={editFormData.displayName}
                  onChange={(e) => setEditFormData({...editFormData, displayName: e.target.value})}
                  placeholder="Enter display name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  disabled
                  className="disabled-input"
                  title="Email cannot be changed"
                />
                <small className="form-hint">Email cannot be modified</small>
              </div>
              <div className="form-group">
                <label>New Password <span className="optional-label">(Optional)</span></label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                  placeholder="Leave empty to keep current password"
                  minLength="12"
                  maxLength="16"
                  pattern="[a-zA-Z0-9]{12,16}"
                />
                <small className="form-hint">12-16 alphanumeric characters (letters and numbers only). Leave empty if not changing.</small>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetConfirm && selectedUser && (
        <div className="modal-overlay" onClick={() => {
          setShowResetConfirm(false);
          setSelectedUser(null);
        }}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <h2>🔄 Confirm Reset Progress</h2>
            <p>Are you sure you want to reset the progress for:</p>
            <p><strong>{selectedUser.displayName || selectedUser.email}</strong>?</p>
            <p className="warning-text">
              This will reset all progress including:
              <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                <li>All points (XP)</li>
                <li>Lessons completed</li>
                <li>Lesson tile progress (e.g. Alphabet 20/26 → 0/26)</li>
                <li>Quiz scores and history</li>
                <li>Exam results</li>
                <li>Achievements</li>
                <li>Streaks</li>
              </ul>
            </p>
            <p className="warning-text"><strong>This action cannot be undone.</strong></p>
            <div className="modal-actions">
              <button className="btn-warning" onClick={handleResetProgress}>
                Reset Progress
              </button>
              <button className="btn-secondary" onClick={() => {
                setShowResetConfirm(false);
                setSelectedUser(null);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Confirm Delete</h2>
            <p>Are you sure you want to delete the user:</p>
            <p><strong>{selectedUser.displayName || selectedUser.email}</strong>?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-danger" onClick={handleDeleteUser}>
                Delete User
              </button>
              <button className="btn-secondary" onClick={() => {
                setShowDeleteConfirm(false);
                setSelectedUser(null);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;

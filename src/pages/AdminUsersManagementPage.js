import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AdminUsersManagementPage = () => {
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    isActive: true,
  });

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading admin users:', error);
        alert('Failed to load admin users');
        return;
      }

      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      alert('Please fill all required fields');
      return;
    }

    try {
      // First create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
          }
        }
      });

      if (authError) {
        console.error('Error creating user in auth:', authError);
        alert('Failed to create user');
        return;
      }

      // Then add to admin_users table
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert([{
          name: formData.name,
          email: formData.email,
          password_hash: 'hashed_password', // In real implementation, this would be properly hashed
          role: formData.role,
          is_active: formData.isActive,
        }]);

      if (adminError) {
        console.error('Error adding to admin_users:', adminError);
        alert('Failed to add admin user');
        return;
      }

      setShowAddUser(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'agent',
        isActive: true,
      });
      loadAdminUsers();
      alert('Admin user created successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'agent',
      isActive: user.is_active !== false,
    });
    setShowAddUser(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !formData.name || !formData.email) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          is_active: formData.isActive,
        })
        .eq('id', editingUser.id);

      if (error) {
        console.error('Error updating admin user:', error);
        alert('Failed to update admin user');
        return;
      }

      setShowAddUser(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'agent',
        isActive: true,
      });
      loadAdminUsers();
      alert('Admin user updated successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) {
        console.error('Error toggling user status:', error);
        alert('Failed to update user status');
        return;
      }

      loadAdminUsers();
      alert(`User ${user.is_active ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) {
        console.error('Error deleting admin user:', error);
        alert('Failed to delete admin user');
        return;
      }

      loadAdminUsers();
      alert('Admin user deleted successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const renderUserCard = (user) => (
    <div key={user.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              user.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              user.role === 'super_admin' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user.role}
            </span>
          </div>
          <p className="text-gray-600">{user.email}</p>
          <p className="text-sm text-gray-500">
            Created: {new Date(user.created_at).toLocaleDateString()}
          </p>
          {user.last_login && (
            <p className="text-sm text-gray-500">
              Last login: {new Date(user.last_login).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleToggleUserStatus(user)}
            className={`px-3 py-1 rounded-md transition-colors ${
              user.is_active 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {user.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => handleEditUser(user)}
            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(user)}
            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading admin users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users Management</h1>
          <p className="text-gray-600">Create and manage admin users with different roles</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({
              name: '',
              email: '',
              password: '',
              role: 'agent',
              isActive: true,
            });
            setShowAddUser(true);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Add Admin User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">👥</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Admin Users</p>
              <p className="text-2xl font-semibold text-gray-900">{adminUsers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">👑</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Super Admins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {adminUsers.filter(user => user.role === 'super_admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">✅</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {adminUsers.filter(user => user.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Users List */}
      <div className="space-y-4">
        {adminUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👨‍💼</div>
            <p className="text-gray-600">No admin users found</p>
            <p className="text-sm text-gray-500">Add your first admin user to get started</p>
          </div>
        ) : (
          adminUsers.map(renderUserCard)
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingUser ? 'Edit Admin User' : 'Add Admin User'}
              </h2>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="agent">Agent</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active user
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingUser ? handleUpdateUser : handleAddUser}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                {editingUser ? 'Update User' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
              <button
                onClick={handleDeleteCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{userToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersManagementPage;
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    loadLogs();
  }, [activeTab, dateRange]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('admin_logs')
        .select(`
          *,
          admin_users:admin_user_id(name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply date range filter
      const now = new Date();
      let startDate;
      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      query = query.gte('created_at', startDate.toISOString());

      const { data, error } = await query;

      if (error) {
        console.error('Error loading logs:', error);
        alert('Failed to load logs');
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action.toLowerCase()) {
      case 'login':
        return '🔐';
      case 'logout':
        return '🚪';
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'wallet':
        return '💰';
      case 'ticket':
        return '🎫';
      default:
        return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      case 'create':
        return 'bg-blue-100 text-blue-800';
      case 'update':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'wallet':
        return 'bg-purple-100 text-purple-800';
      case 'ticket':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderLogItem = (log) => (
    <div key={log.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">{getActionIcon(log.action)}</div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{log.action}</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                {log.action}
              </span>
            </div>
            <p className="text-gray-600 mb-2">{log.details ? JSON.stringify(log.details) : 'No details'}</p>
            {log.user_affected && (
              <p className="text-gray-600 mb-2">User: {log.user_affected}</p>
            )}
            {log.amount && (
              <p className="text-gray-600 mb-2">Amount: {log.amount} JOD</p>
            )}
            <p className="text-sm text-gray-500">
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{log.admin_users?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-400">{log.admin_users?.email || ''}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
        <p className="text-gray-600">Track app usage and admin actions with detailed logs</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex space-x-4">
            {[
              { id: 'all', name: 'All Logs', icon: '📋' },
              { id: 'login', name: 'Logins', icon: '🔐' },
              { id: 'wallet', name: 'Wallet', icon: '💰' },
              { id: 'ticket', name: 'Tickets', icon: '🎫' },
              { id: 'admin', name: 'Admin', icon: '👨‍💼' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
          
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">📊</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Logs</p>
              <p className="text-2xl font-semibold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">🔐</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Logins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {logs.filter(log => log.action.toLowerCase().includes('login')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">💰</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Wallet Actions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {logs.filter(log => log.action.toLowerCase().includes('wallet')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">🎫</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ticket Actions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {logs.filter(log => log.action.toLowerCase().includes('ticket')).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-600">No logs found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          logs.map(renderLogItem)
        )}
      </div>
    </div>
  );
};

export default LogsPage;
import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';

// Supabase configuration
const supabaseUrl = 'https://rtjegrjmnuivkivdgwjk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0amVncmptbnVpdmtpdmRnd2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNzksImV4cCI6MjA2ODAwMzE3OX0.qvg1CsyFehM5g0Jx8-9P6mlhRPu8qalwzxUiQFb66UE';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  }
});

const RequestsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadRequests();
    getCurrentUser();
  }, [activeTab]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('all_requests_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('request_type', activeTab);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      showNotification('Error loading requests', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, requestType, newStatus) => {
    try {
      let tableName = '';
      switch (requestType) {
        case 'contact':
          tableName = 'contact_requests';
          break;
        case 'advertise':
          tableName = 'advertising_requests';
          break;
        case 'partnership':
          tableName = 'partnership_requests';
          break;
        default:
          throw new Error('Invalid request type');
      }

      // Update the request status
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add to history
      const { error: historyError } = await supabase
        .from('request_history')
        .insert([{
          request_id: requestId,
          request_type: requestType,
          status_from: selectedRequest.status,
          status_to: newStatus,
          changed_by: currentUser?.email || 'Unknown',
          changed_at: new Date().toISOString(),
          notes: noteText
        }]);

      if (historyError) throw historyError;

      showNotification(`Request status updated to ${newStatus}`, 'success');
      setSelectedRequest(null);
      setShowHistoryModal(false);
      setNoteText('');
      setNewStatus('');
      loadRequests();
    } catch (error) {
      console.error('Error updating request status:', error);
      showNotification('Error updating request status', 'error');
    }
  };

  const deleteRequest = async (requestId, requestType) => {
    if (!window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    try {
      let tableName = '';
      switch (requestType) {
        case 'contact':
          tableName = 'contact_requests';
          break;
        case 'advertise':
          tableName = 'advertising_requests';
          break;
        case 'partnership':
          tableName = 'partnership_requests';
          break;
        default:
          throw new Error('Invalid request type');
      }

      // Add to history before deletion
      const { error: historyError } = await supabase
        .from('request_history')
        .insert([{
          request_id: requestId,
          request_type: requestType,
          status_from: selectedRequest.status,
          status_to: 'deleted',
          changed_by: currentUser?.email || 'Unknown',
          changed_at: new Date().toISOString(),
          notes: 'Request deleted'
        }]);

      if (historyError) throw historyError;

      // Delete the request
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      showNotification('Request deleted successfully', 'success');
      setSelectedRequest(null);
      setShowHistoryModal(false);
      loadRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      showNotification('Error deleting request', 'error');
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) {
      showNotification('Please enter a note', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('request_notes')
        .insert([{
          request_id: selectedRequest.id,
          request_type: selectedRequest.request_type,
          note: noteText,
          added_by: currentUser?.email || 'Unknown',
          added_at: new Date().toISOString()
        }]);

      if (error) throw error;

      showNotification('Note added successfully', 'success');
      setNoteText('');
      setShowNoteModal(false);
      loadRequests();
    } catch (error) {
      console.error('Error adding note:', error);
      showNotification('Error adding note', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'no_response':
        return 'bg-red-100 text-red-800';
      case 'deleted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getRequestTypeLabel = (type) => {
    switch (type) {
      case 'contact':
        return 'Contact Us';
      case 'advertise':
        return 'Advertise With Us';
      case 'partnership':
        return 'Add Activity';
      default:
        return type;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const openHistoryModal = (request) => {
    setSelectedRequest(request);
    setShowHistoryModal(true);
  };

  const openNoteModal = (request) => {
    setSelectedRequest(request);
    setShowNoteModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Requests Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage all user requests and track their status
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', name: 'All Requests' },
              { id: 'contact', name: 'Contact Us' },
              { id: 'advertise', name: 'Advertise With Us' },
              { id: 'partnership', name: 'Add Activity' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {activeTab === 'all' ? 'All Requests' : getRequestTypeLabel(activeTab)} Requests
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {requests.length} request{requests.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">No requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={`${request.request_type}-${request.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getRequestTypeLabel(request.request_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div><strong>Name:</strong> {request.name}</div>
                          <div><strong>Email:</strong> {request.email}</div>
                          <div><strong>Phone:</strong> {request.phone}</div>
                          {request.city && <div><strong>City:</strong> {request.city}</div>}
                          {request.activity_type && <div><strong>Activity Type:</strong> {request.activity_type}</div>}
                          {request.address && <div><strong>Address:</strong> {request.address}</div>}
                          {request.message && <div><strong>Message:</strong> {request.message}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openHistoryModal(request)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            History
                          </button>
                          <button
                            onClick={() => openNoteModal(request)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Add Note
                          </button>
                          {request.status !== 'deleted' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setNewStatus('closed');
                                  setShowHistoryModal(true);
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Close
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setNewStatus('no_response');
                                  setShowHistoryModal(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                No Response
                              </button>
                              <button
                                onClick={() => deleteRequest(request.id, request.request_type)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {newStatus ? `Update Status` : `Request History`}
                </h3>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedRequest(null);
                    setNewStatus('');
                    setNoteText('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {newStatus ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status Change Note (Optional)
                    </label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Add a note about this status change..."
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowHistoryModal(false);
                        setSelectedRequest(null);
                        setNewStatus('');
                        setNoteText('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateRequestStatus(selectedRequest.id, selectedRequest.request_type, newStatus)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Request Details:</h4>
                    <div className="text-sm text-gray-600">
                      <p><strong>Type:</strong> {getRequestTypeLabel(selectedRequest.request_type)}</p>
                      <p><strong>Name:</strong> {selectedRequest.name}</p>
                      <p><strong>Email:</strong> {selectedRequest.email}</p>
                      <p><strong>Status:</strong> {selectedRequest.status}</p>
                      <p><strong>Created:</strong> {formatDate(selectedRequest.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Status History:</h4>
                    <div className="text-sm text-gray-600">
                      <p>History tracking will be implemented here...</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowHistoryModal(false);
                        setSelectedRequest(null);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Note</h3>
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setSelectedRequest(null);
                    setNoteText('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your note here..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setSelectedRequest(null);
                    setNoteText('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addNote}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage; 
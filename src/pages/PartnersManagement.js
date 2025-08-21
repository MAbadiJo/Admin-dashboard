import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';

// Create Supabase client with hardcoded values to bypass environment variable issues
const SUPABASE_URL = 'https://rtjegrjmnuivkivdgwjk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0amVncmptbnVpdmtpdmRnd2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNzksImV4cCI6MjA2ODAwMzE3OX0.qvg1CsyFehM5g0Jx8-9P6mlhRPu8qalwzxUiQFb66UE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage, // Explicitly set localStorage for web
    storageKey: 'supabase.auth.token' // Custom storage key
  }
});

const PartnersManagement = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [editingPartner, setEditingPartner] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [partnerActivities, setPartnerActivities] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    partnerName: '',
    partnerNameAr: '',
    managerName: '',
    email: '',
    phoneNumber: '',
    location: '',
    locationAr: '',
    commissionRate: 10.00,
    isActive: true,
    isVerified: false,
    additionalNotes: '', // Added additional notes field
  });

  useEffect(() => {
    console.log('Component mounted, fetching data...');
    console.log('🔍 Supabase client config:', {
      url: SUPABASE_URL,
      key: SUPABASE_ANON_KEY ? 'Present' : 'Missing'
    });
    
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('✅ Existing session found:', session.user.email);
        setIsAuthenticated(true);
      } else {
        console.log('ℹ️ No existing session found');
        setIsAuthenticated(false);
      }
    };
    
    checkSession();
    fetchPartners();
    
    // Load saved session on mount
    const loadSavedSession = () => {
      const savedSession = localStorage.getItem('partnersManagementSession');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          const sessionAge = new Date() - new Date(sessionData.timestamp);
          
          // Only restore if session is less than 1 hour old
          if (sessionAge < 3600000) {
            console.log('🔄 Restoring saved session...');
            if (sessionData.formData) {
              setFormData(sessionData.formData);
            }
          }
        } catch (error) {
          console.error('Error loading saved session:', error);
        }
      }
    };
    
    loadSavedSession();
  }, []); // Only run on mount

  // Separate useEffect for saving session state
  useEffect(() => {
    const saveSessionState = () => {
      const sessionState = {
        formData: formData,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('partnersManagementSession', JSON.stringify(sessionState));
    };
    
    // Save session every 30 seconds
    const sessionInterval = setInterval(saveSessionState, 30000);
    
    return () => clearInterval(sessionInterval);
  }, [formData]);



  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth error:', error);
        setIsAuthenticated(false);
        return;
      }
      
      if (session) {
        setIsAuthenticated(true);
        console.log('User authenticated:', session.user.email);
      } else {
        setIsAuthenticated(false);
        console.log('No active session');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    }
  };

  const fetchPartners = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('partners').select('*');
      
      if (searchQuery) {
        query = query.or(`business_name.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      
      if (locationFilter) {
        query = query.eq('business_address', locationFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching partners:', error);
        alert('Failed to fetch partners');
        return;
      }

      setPartners(data || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerActivities = async (partnerId) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching partner activities:', error);
        return;
      }

      setPartnerActivities(prev => ({
        ...prev,
        [partnerId]: data || []
      }));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddPartner = () => {
    setEditingPartner(null);
    setFormData({
      partnerName: '',
      partnerNameAr: '',
      managerName: '',
      email: '',
      phoneNumber: '',
      location: '',
      locationAr: '',
      commissionRate: 10.00,
      isActive: true,
      isVerified: false,
      additionalNotes: '',
    });
    setModalVisible(true);
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setFormData({
      partnerName: partner.business_name || '',
      partnerNameAr: partner.business_name_ar || '',
      managerName: partner.name || '',
      email: partner.email || '',
      phoneNumber: partner.phone || '',
      location: partner.business_address || '',
      locationAr: partner.business_address_ar || '',
      commissionRate: partner.commission_rate || 10.00,
      isActive: partner.is_active !== false,
      isVerified: partner.is_verified || false,
      additionalNotes: partner.additional_notes || '',
    });
    setModalVisible(true);
  };

  const handleSavePartner = async () => {
    if (!formData.partnerName || !formData.managerName || !formData.email || !formData.phoneNumber) {
      alert('Please fill all required fields (Partner Name, Manager Name, Email, Phone)');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      const partnerData = {
        business_name: formData.partnerName,
        business_name_ar: formData.partnerNameAr,
        name: formData.managerName,
        email: formData.email,
        phone: formData.phoneNumber,
        business_address: formData.location,
        business_address_ar: formData.locationAr,
        commission_rate: parseFloat(formData.commissionRate),
        is_active: formData.isActive,
        is_verified: formData.isVerified,
        additional_notes: formData.additionalNotes,
      };

      if (editingPartner) {
        const { error } = await supabase
          .from('partners')
          .update(partnerData)
          .eq('id', editingPartner.id);

        if (error) {
          console.error('Error updating partner:', error);
          alert('Failed to update partner');
          return;
        }
      } else {
        const { error } = await supabase
          .from('partners')
          .insert([partnerData]);

        if (error) {
          console.error('Error adding partner:', error);
          alert('Failed to add partner');
          return;
        }
      }

      setModalVisible(false);
      fetchPartners();
      alert(editingPartner ? 'Partner updated successfully!' : 'Partner added successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const handleDeleteClick = (partner) => {
    setPartnerToDelete(partner);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!partnerToDelete) return;

    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', partnerToDelete.id);

      if (error) {
        console.error('Error deleting partner:', error);
        alert('Failed to delete partner');
        return;
      }

      fetchPartners();
      alert('Partner deleted successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    } finally {
      setShowDeleteConfirm(false);
      setPartnerToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setPartnerToDelete(null);
  };

  const togglePartnerExpansion = (partnerId) => {
    if (expandedPartner === partnerId) {
      setExpandedPartner(null);
    } else {
      setExpandedPartner(partnerId);
      if (!partnerActivities[partnerId]) {
        fetchPartnerActivities(partnerId);
      }
    }
  };

  const hidePartnerActivities = async (partnerId) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_active: false })
        .eq('partner_id', partnerId);

      if (error) {
        console.error('Error hiding partner activities:', error);
        alert('Failed to hide partner activities');
        return;
      }

      // Refresh partner activities
      fetchPartnerActivities(partnerId);
      alert('All partner activities have been hidden successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const showPartnerActivities = async (partnerId) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_active: true })
        .eq('partner_id', partnerId);

      if (error) {
        console.error('Error showing partner activities:', error);
        alert('Failed to show partner activities');
        return;
      }

      // Refresh partner activities
      fetchPartnerActivities(partnerId);
      alert('All partner activities have been shown successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const renderPartnerActivities = (partnerId) => {
    const activities = partnerActivities[partnerId] || [];
    const activeActivities = activities.filter(activity => activity.is_active !== false);
    const hiddenActivities = activities.filter(activity => activity.is_active === false);

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-semibold text-gray-800">Partner Activities</h4>
          <div className="flex space-x-2">
            {activeActivities.length > 0 && (
              <button
                onClick={() => hidePartnerActivities(partnerId)}
                className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 transition-colors text-sm"
              >
                Hide All Activities
              </button>
            )}
            {hiddenActivities.length > 0 && (
              <button
                onClick={() => showPartnerActivities(partnerId)}
                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Show All Activities
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-green-700 mb-2">Active Activities ({activeActivities.length})</h5>
            {activeActivities.length === 0 ? (
              <p className="text-gray-500 text-sm">No active activities</p>
            ) : (
              <div className="space-y-2">
                {activeActivities.map(activity => (
                  <div key={activity.id} className="bg-white p-3 rounded border">
                    <div className="font-medium text-sm">{activity.title}</div>
                    <div className="text-xs text-gray-600">
                      Type: {activity.activity_type} | Price: {activity.price || 'N/A'} JOD
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h5 className="font-medium text-red-700 mb-2">Hidden Activities ({hiddenActivities.length})</h5>
            {hiddenActivities.length === 0 ? (
              <p className="text-gray-500 text-sm">No hidden activities</p>
            ) : (
              <div className="space-y-2">
                {hiddenActivities.map(activity => (
                  <div key={activity.id} className="bg-white p-3 rounded border border-red-200">
                    <div className="font-medium text-sm text-gray-600">{activity.title}</div>
                    <div className="text-xs text-gray-500">
                      Type: {activity.activity_type} | Price: {activity.price || 'N/A'} JOD
                    </div>
                    <div className="text-xs text-gray-400">
                      Created: {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPartnerItem = (partner) => (
    <div key={partner.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{partner.business_name}</h3>
            {partner.business_name_ar && (
              <span className="text-sm text-gray-500">({partner.business_name_ar})</span>
            )}
            {partner.is_verified && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Verified</span>
            )}
            {!partner.is_active && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Inactive</span>
            )}
          </div>
          
          <p className="text-gray-600">Manager: {partner.name}</p>
          <p className="text-gray-600">Email: {partner.email}</p>
          <p className="text-gray-600">Phone: {partner.phone}</p>
          {partner.business_address && (
            <p className="text-gray-600">
              Location: {partner.business_address}
              {partner.business_address_ar && ` (${partner.business_address_ar})`}
            </p>
          )}

          <p className="text-gray-600">Commission Rate: {partner.commission_rate || 10}%</p>
          {partner.additional_notes && (
            <p className="text-gray-600">
              <strong>Notes:</strong> {partner.additional_notes}
            </p>
          )}
          <p className="text-gray-600">
            Status: {partner.is_active ? 'Active' : 'Inactive'} | 
            Verified: {partner.is_verified ? 'Yes' : 'No'}
          </p>
          <p className="text-gray-600">
            Created: {new Date(partner.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => togglePartnerExpansion(partner.id)}
            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
          >
            {expandedPartner === partner.id ? 'Hide Activities' : 'View Activities'}
          </button>
          <button
            onClick={() => handleEditPartner(partner)}
            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(partner)}
            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      
      {expandedPartner === partner.id && renderPartnerActivities(partner.id)}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading partners...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <p className="text-gray-600">Please log in to access this page</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners Management</h1>
          <p className="text-gray-600">Manage your business partners and their information</p>
        </div>
        <button
          onClick={handleAddPartner}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Add New Partner
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Partners</label>
            <input
              type="text"
              placeholder="Search by name, manager, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Location</label>
            <input
              type="text"
              placeholder="Enter location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchPartners}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Partners List */}
      <div className="space-y-4">
        {partners.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤝</div>
            <p className="text-gray-600">No partners found</p>
            <p className="text-sm text-gray-500">Add your first partner to get started</p>
          </div>
        ) : (
          partners.map(renderPartnerItem)
        )}
      </div>

      {/* Add/Edit Partner Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPartner ? 'Edit Partner' : 'Add New Partner'}
              </h2>
              <button
                onClick={() => setModalVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner Name (English) *
                </label>
                <input
                  type="text"
                  value={formData.partnerName}
                  onChange={(e) => setFormData({...formData, partnerName: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner Name (Arabic)
                </label>
                <input
                  type="text"
                  value={formData.partnerNameAr}
                  onChange={(e) => setFormData({...formData, partnerNameAr: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager Name *
                </label>
                <input
                  type="text"
                  value={formData.managerName}
                  onChange={(e) => setFormData({...formData, managerName: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (English)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (Arabic)
                </label>
                <input
                  type="text"
                  value={formData.locationAr}
                  onChange={(e) => setFormData({...formData, locationAr: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({...formData, commissionRate: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active Partner</span>
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(e) => setFormData({...formData, isVerified: e.target.checked})}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Verified Partner</span>
                </label>
              </div>
            </div>

            {/* Additional Notes - Full Width */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
                rows={4}
                placeholder="Enter any additional notes about this partner..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setModalVisible(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePartner}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                {editingPartner ? 'Update Partner' : 'Add Partner'}
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
              Are you sure you want to delete "{partnerToDelete?.business_name}"? This action cannot be undone.
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

export default PartnersManagement; 
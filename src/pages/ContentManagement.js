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

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('about');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [content, setContent] = useState({
    about: { title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', content_en: '', content_ar: '' },
    contact: { title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', content_en: '', content_ar: '', email: '', phone: '', address: '' },
    cancellation: { title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', content_en: '', content_ar: '' },
    terms: { title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', content_en: '', content_ar: '' },
    privacy: { title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', content_en: '', content_ar: '' },
    addActivity: { title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', content_en: '', content_ar: '' },
    advertise: { title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', content_en: '', content_ar: '' }
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const contentMap = {};
        data.forEach(item => {
          contentMap[item.content_type] = {
            title_en: item.title_en || '',
            title_ar: item.title_ar || '',
            subtitle_en: item.subtitle_en || '',
            subtitle_ar: item.subtitle_ar || '',
            content_en: item.content_en || '',
            content_ar: item.content_ar || '',
            email: item.email || '',
            phone: item.phone || '',
            address: item.address || ''
          };
        });
        setContent(contentMap);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      showNotification('Error loading content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (contentType) => {
    setIsLoading(true);
    try {
      const contentData = content[contentType];
      
      // Check if content already exists
      const { data: existing } = await supabase
        .from('app_content')
        .select('id')
        .eq('content_type', contentType)
        .single();

      if (existing) {
        // Update existing content
        const { error } = await supabase
          .from('app_content')
          .update({
            title_en: contentData.title_en,
            title_ar: contentData.title_ar,
            subtitle_en: contentData.subtitle_en,
            subtitle_ar: contentData.subtitle_ar,
            content_en: contentData.content_en,
            content_ar: contentData.content_ar,
            email: contentData.email,
            phone: contentData.phone,
            address: contentData.address,
            updated_at: new Date().toISOString()
          })
          .eq('content_type', contentType);

        if (error) throw error;
      } else {
        // Insert new content
        const { error } = await supabase
          .from('app_content')
          .insert([{
            content_type: contentType,
            title_en: contentData.title_en,
            title_ar: contentData.title_ar,
            subtitle_en: contentData.subtitle_en,
            subtitle_ar: contentData.subtitle_ar,
            content_en: contentData.content_en,
            content_ar: contentData.content_ar,
            email: contentData.email,
            phone: contentData.phone,
            address: contentData.address
          }]);

        if (error) throw error;
      }

      showNotification(`${getContentTypeName(contentType)} content saved successfully!`, 'success');
    } catch (error) {
      console.error('Error saving content:', error);
      showNotification('Error saving content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (contentType) => {
    if (!window.confirm(`Are you sure you want to delete the ${getContentTypeName(contentType)} content? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('app_content')
        .delete()
        .eq('content_type', contentType);

      if (error) throw error;

      // Clear the content from state
      setContent(prev => ({
        ...prev,
        [contentType]: {
          title_en: '',
          title_ar: '',
          subtitle_en: '',
          subtitle_ar: '',
          content_en: '',
          content_ar: '',
          email: '',
          phone: '',
          address: ''
        }
      }));

      showNotification(`${getContentTypeName(contentType)} content deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting content:', error);
      showNotification('Error deleting content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (contentType, field, value) => {
    setContent(prev => ({
      ...prev,
      [contentType]: {
        ...prev[contentType],
        [field]: value
      }
    }));
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const getContentTypeName = (type) => {
    const names = {
      about: 'About Us',
      contact: 'Contact Us',
      cancellation: 'Cancellation Policy',
      terms: 'Terms & Privacy',
      privacy: 'Privacy Policy',
      addActivity: 'Add Activity',
      advertise: 'Advertise With Us'
    };
    return names[type] || type;
  };

  const renderContentForm = (contentType) => {
    const currentContent = content[contentType] || {};

    return (
      <div className="space-y-6">
        {/* Title Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (English)
            </label>
            <input
              type="text"
              value={currentContent.title_en || ''}
              onChange={(e) => handleInputChange(contentType, 'title_en', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter English title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (Arabic)
            </label>
            <input
              type="text"
              value={currentContent.title_ar || ''}
              onChange={(e) => handleInputChange(contentType, 'title_ar', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="أدخل العنوان بالعربية"
              dir="rtl"
            />
          </div>
        </div>

        {/* Subtitle Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtitle (English)
            </label>
            <input
              type="text"
              value={currentContent.subtitle_en || ''}
              onChange={(e) => handleInputChange(contentType, 'subtitle_en', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter English subtitle"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtitle (Arabic)
            </label>
            <input
              type="text"
              value={currentContent.subtitle_ar || ''}
              onChange={(e) => handleInputChange(contentType, 'subtitle_ar', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="أدخل العنوان الفرعي بالعربية"
              dir="rtl"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content (English)
            </label>
            <textarea
              value={currentContent.content_en || ''}
              onChange={(e) => handleInputChange(contentType, 'content_en', e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter English content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content (Arabic)
            </label>
            <textarea
              value={currentContent.content_ar || ''}
              onChange={(e) => handleInputChange(contentType, 'content_ar', e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="أدخل المحتوى بالعربية"
              dir="rtl"
            />
          </div>
        </div>

        {/* Contact-specific fields */}
        {contentType === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={currentContent.email || ''}
                onChange={(e) => handleInputChange(contentType, 'email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="text"
                value={currentContent.phone || ''}
                onChange={(e) => handleInputChange(contentType, 'phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="+962 79 123 4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={currentContent.address || ''}
                onChange={(e) => handleInputChange(contentType, 'address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Amman, Jordan"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => handleDelete(contentType)}
            disabled={isLoading}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isLoading ? 'Deleting...' : 'Delete Content'}
          </button>
          <button
            onClick={() => handleSave(contentType)}
            disabled={isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Content'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage content for mobile app screens
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
              { id: 'about', name: 'About Us' },
              { id: 'contact', name: 'Contact Us' },
              { id: 'cancellation', name: 'Cancellation Policy' },
              { id: 'terms', name: 'Terms & Privacy' },
              { id: 'privacy', name: 'Privacy Policy' },
              { id: 'addActivity', name: 'Add Activity' },
              { id: 'advertise', name: 'Advertise With Us' }
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

        {/* Content Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {getContentTypeName(activeTab)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Update the content for the {getContentTypeName(activeTab).toLowerCase()} screen
            </p>
          </div>

          {renderContentForm(activeTab)}
        </div>
      </div>
    </div>
  );
};

export default ContentManagement; 
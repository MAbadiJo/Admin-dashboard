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

const HomePageManagement = () => {
  // State for all three management types
  const [activeTab, setActiveTab] = useState('sections'); // 'sections', 'offers', 'cities'
  
  // Sections state
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  // Offers state
  const [offers, setOffers] = useState([]);
  const [showOffersForm, setShowOffersForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  // Cities state
  const [cities, setCities] = useState([]);
  const [showCitiesForm, setShowCitiesForm] = useState(false);
  const [editingCity, setEditingCity] = useState(null);

  // Form state for adding/editing sections - SIMPLIFIED
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    subtitle: '',
    subtitle_ar: '',
    position: 1,
    is_active: true
  });

  // Form state for offers
  const [offersFormData, setOffersFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    discount_percentage: '',
    promo_code: '',
    position: 1,
    is_active: true,
    start_date: '',
    end_date: '',
    min_purchase: '',
    max_uses: ''
  });

  // Form state for cities
  const [citiesFormData, setCitiesFormData] = useState({
    name: '',
    name_ar: '',
    position: 1,
    is_active: true
  });





  useEffect(() => {
    loadSections();
    loadOffers();
    loadCities();
  }, []);

  const loadSections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_sections')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error loading sections:', error);
      showNotification('Error loading sections', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const sectionData = {
        ...formData,
        // Auto-generate section_type based on name
        section_type: generateSectionType(formData.name),
        // Simple defaults
        max_items: 10,
        filter_type: 'category'
      };

      if (editingSection) {
        // Update existing section
        const { error } = await supabase
          .from('home_sections')
          .update(sectionData)
          .eq('id', editingSection.id);

        if (error) throw error;
        showNotification('Section updated successfully!', 'success');
      } else {
        // Insert new section
        const { error } = await supabase
          .from('home_sections')
          .insert([sectionData]);

        if (error) throw error;
        showNotification('Section added successfully!', 'success');
      }

      resetForm();
      loadSections();
    } catch (error) {
      console.error('Error saving section:', error);
      showNotification('Error saving section', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Simple function to generate section_type based on name
  const generateSectionType = (name) => {
    const lowerName = name.toLowerCase();
    let baseType = 'new_activities'; // default
    
    if (lowerName.includes('play') || lowerName.includes('game')) baseType = 'play_area';
    else if (lowerName.includes('training') || lowerName.includes('course') || lowerName.includes('educational')) baseType = 'training_courses';
    else if (lowerName.includes('school') || lowerName.includes('announcement')) baseType = 'school_announcements';
    else if (lowerName.includes('adventure') || lowerName.includes('experience')) baseType = 'new_experiences';
    else if (lowerName.includes('best') || lowerName.includes('seller')) baseType = 'best_sellers';
    else if (lowerName.includes('recent') || lowerName.includes('added')) baseType = 'new_activities';
    else if (lowerName.includes('recommend')) baseType = 'new_activities';
    else if (lowerName.includes('family')) baseType = 'new_activities';
    else if (lowerName.includes('entertainment')) baseType = 'play_area';
    
    // Add a random number suffix to make it unique (more compatible with constraints)
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${baseType}_${randomSuffix}`;
  };

  const handleDelete = async (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('home_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;
      showNotification('Section deleted successfully!', 'success');
      loadSections();
    } catch (error) {
      console.error('Error deleting section:', error);
      showNotification('Error deleting section', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setFormData({
      name: section.name || '',
      name_ar: section.name_ar || '',
      subtitle: section.subtitle || '',
      subtitle_ar: section.subtitle_ar || '',
      position: section.position || 1,
      is_active: section.is_active !== false
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_ar: '',
      subtitle: '',
      subtitle_ar: '',
      position: sections.length + 1,
      is_active: true
    });
    setEditingSection(null);
    setShowAddForm(false);
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;

    const newSections = [...sections];
    const draggedSection = newSections[dragIndex];
    newSections.splice(dragIndex, 1);
    newSections.splice(dropIndex, 0, draggedSection);

    // Update positions
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      position: index + 1
    }));

    setSections(updatedSections);
    setDragIndex(null);

    // Save new positions to database
    try {
      for (const section of updatedSections) {
        await supabase
          .from('home_sections')
          .update({ position: section.position })
          .eq('id', section.id);
      }
      showNotification('Section order updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating positions:', error);
      showNotification('Error updating section order', 'error');
      loadSections(); // Reload original order
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const getNextPosition = () => {
    return sections.length > 0 ? Math.max(...sections.map(s => s.position)) + 1 : 1;
  };

  // ===== OFFERS MANAGEMENT FUNCTIONS =====
  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('special_offers')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error loading offers:', error);
      showNotification('Error loading offers', 'error');
    }
  };

  const handleSaveOffer = async () => {
    try {
      const offerData = {
        title: offersFormData.title.trim(),
        title_ar: offersFormData.title_ar.trim(),
        description: offersFormData.description.trim(),
        description_ar: offersFormData.description_ar.trim(),
        discount_percentage: parseInt(offersFormData.discount_percentage) || 0,
        promo_code: offersFormData.promo_code.trim().toUpperCase(),
        position: parseInt(offersFormData.position) || 1,
        is_active: offersFormData.is_active,
        start_date: offersFormData.start_date || null,
        end_date: offersFormData.end_date || null,
        min_purchase: offersFormData.min_purchase ? parseFloat(offersFormData.min_purchase) : null,
        max_uses: offersFormData.max_uses ? parseInt(offersFormData.max_uses) : null
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('special_offers')
          .update(offerData)
          .eq('id', editingOffer.id);

        if (error) throw error;
        showNotification('Offer updated successfully!', 'success');
      } else {
        const { error } = await supabase
          .from('special_offers')
          .insert([offerData]);

        if (error) throw error;
        showNotification('Offer added successfully!', 'success');
      }

      resetOffersForm();
      loadOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      showNotification('Error saving offer', 'error');
    }
  };

  const handleEditOffer = (offer) => {
    setOffersFormData({
      title: offer.title || '',
      title_ar: offer.title_ar || '',
      description: offer.description || '',
      description_ar: offer.description_ar || '',
      discount_percentage: offer.discount_percentage?.toString() || '',
      promo_code: offer.promo_code || '',
      position: offer.position || 1,
      is_active: offer.is_active !== false,
      start_date: offer.start_date || '',
      end_date: offer.end_date || '',
      min_purchase: offer.min_purchase?.toString() || '',
      max_uses: offer.max_uses?.toString() || ''
    });
    setEditingOffer(offer);
    setShowOffersForm(true);
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;

    try {
      const { error } = await supabase
        .from('special_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      showNotification('Offer deleted successfully!', 'success');
      loadOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      showNotification('Error deleting offer', 'error');
    }
  };

  const resetOffersForm = () => {
    setOffersFormData({
      title: '',
      title_ar: '',
      description: '',
      description_ar: '',
      discount_percentage: '',
      promo_code: '',
      position: offers.length + 1,
      is_active: true,
      start_date: '',
      end_date: '',
      min_purchase: '',
      max_uses: ''
    });
    setEditingOffer(null);
    setShowOffersForm(false);
  };

  const toggleOfferActive = async (offer) => {
    try {
      const { error } = await supabase
        .from('special_offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offer.id);

      if (error) throw error;
      loadOffers();
    } catch (error) {
      console.error('Error toggling offer status:', error);
    }
  };

  // ===== CITIES MANAGEMENT FUNCTIONS =====
  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error loading cities:', error);
      showNotification('Error loading cities', 'error');
    }
  };

  const handleSaveCity = async () => {
    try {
      const cityData = {
        name: citiesFormData.name.trim(),
        name_ar: citiesFormData.name_ar.trim(),
        position: parseInt(citiesFormData.position) || 1,
        is_active: citiesFormData.is_active
      };

      if (editingCity) {
        const { error } = await supabase
          .from('cities')
          .update(cityData)
          .eq('id', editingCity.id);

        if (error) throw error;
        showNotification('City updated successfully!', 'success');
      } else {
        const { error } = await supabase
          .from('cities')
          .insert([cityData]);

        if (error) throw error;
        showNotification('City added successfully!', 'success');
      }

      resetCitiesForm();
      loadCities();
    } catch (error) {
      console.error('Error saving city:', error);
      showNotification('Error saving city', 'error');
    }
  };

  const handleEditCity = (city) => {
    setCitiesFormData({
      name: city.name || '',
      name_ar: city.name_ar || '',
      position: city.position || 1,
      is_active: city.is_active !== false
    });
    setEditingCity(city);
    setShowCitiesForm(true);
  };

  const handleDeleteCity = async (cityId) => {
    if (!window.confirm('Are you sure you want to delete this city?')) return;

    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', cityId);

      if (error) throw error;
      showNotification('City deleted successfully!', 'success');
      loadCities();
    } catch (error) {
      console.error('Error deleting city:', error);
      showNotification('Error deleting city', 'error');
    }
  };

  const resetCitiesForm = () => {
    setCitiesFormData({
      name: '',
      name_ar: '',
      position: cities.length + 1,
      is_active: true
    });
    setEditingCity(null);
    setShowCitiesForm(false);
  };

  const toggleCityActive = async (city) => {
    try {
      const { error } = await supabase
        .from('cities')
        .update({ is_active: !city.is_active })
        .eq('id', city.id);

      if (error) throw error;
      loadCities();
    } catch (error) {
      console.error('Error toggling city status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Home Page Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage all home screen content: sections, special offers, and cities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('sections')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sections'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Home Sections
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'offers'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Special Offers
            </button>
            <button
              onClick={() => setActiveTab('cities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cities'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cities
            </button>
          </nav>
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
        {/* SECTIONS TAB */}
        {activeTab === 'sections' && (
          <>
            {/* Add/Edit Form */}
            {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSection ? 'Edit Section' : 'Add New Section'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Name (English) *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sunday Offer"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Name (Arabic) *
                </label>
                <input
                  type="text"
                  placeholder="مثال: عرض الأحد"
                  value={formData.name_ar}
                  onChange={(e) => handleInputChange('name_ar', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtitle (English)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Special deals for Sunday"
                  value={formData.subtitle}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtitle (Arabic)
                </label>
                <input
                  type="text"
                  placeholder="مثال: عروض خاصة للأحد"
                  value={formData.subtitle_ar}
                  onChange={(e) => handleInputChange('subtitle_ar', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Lower number = higher position on screen</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active Section
                </label>
              </div>
            </div>



            

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : (editingSection ? 'Update Section' : 'Add Section')}
              </button>
            </div>
          </div>
        )}

            {/* Sections List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Home Sections</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Drag and drop to reorder sections
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFormData(prev => ({ ...prev, position: getNextPosition() }));
                      setShowAddForm(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Add New Section
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading sections...</p>
                </div>
              ) : sections.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No sections found. Add your first section!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`p-6 hover:bg-gray-50 cursor-move ${
                        dragIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-purple-600"
                            >
                              <span className="text-lg">#{section.position}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-lg font-medium text-gray-900">
                                {section.name}
                              </h4>
                              <span className="text-sm text-gray-500">
                                ({section.name_ar})
                              </span>
                              {!section.is_active && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              Type: {section.section_type} | Items: {section.max_items}
                            </p>
                            {section.subtitle && (
                              <p className="text-sm text-gray-600 mt-1">
                                {section.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(section)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(section.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* OFFERS TAB */}
        {activeTab === 'offers' && (
          <>
            {/* Add/Edit Offers Form */}
            {showOffersForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingOffer ? 'Edit Offer' : 'Add New Offer'}
                  </h2>
                  <button
                    onClick={resetOffersForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Offer Title (English) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Welcome Discount"
                      value={offersFormData.title}
                      onChange={(e) => setOffersFormData({ ...offersFormData, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Offer Title (Arabic)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: خصم الترحيب"
                      value={offersFormData.title_ar}
                      onChange={(e) => setOffersFormData({ ...offersFormData, title_ar: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (English)
                    </label>
                    <textarea
                      placeholder="e.g., Get 20% off on your first booking"
                      value={offersFormData.description}
                      onChange={(e) => setOffersFormData({ ...offersFormData, description: e.target.value })}
                      rows="3"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Arabic)
                    </label>
                    <textarea
                      placeholder="مثال: احصل على خصم 20% على حجزك الأول"
                      value={offersFormData.description_ar}
                      onChange={(e) => setOffersFormData({ ...offersFormData, description_ar: e.target.value })}
                      rows="3"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Percentage *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="20"
                      value={offersFormData.discount_percentage}
                      onChange={(e) => setOffersFormData({ ...offersFormData, discount_percentage: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Promo Code *
                    </label>
                    <input
                      type="text"
                      placeholder="WELCOME20"
                      value={offersFormData.promo_code}
                      onChange={(e) => setOffersFormData({ ...offersFormData, promo_code: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={offersFormData.position}
                      onChange={(e) => setOffersFormData({ ...offersFormData, position: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Purchase (JOD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="10.00"
                      value={offersFormData.min_purchase}
                      onChange={(e) => setOffersFormData({ ...offersFormData, min_purchase: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="100"
                      value={offersFormData.max_uses}
                      onChange={(e) => setOffersFormData({ ...offersFormData, max_uses: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={offersFormData.start_date}
                      onChange={(e) => setOffersFormData({ ...offersFormData, start_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={offersFormData.end_date}
                      onChange={(e) => setOffersFormData({ ...offersFormData, end_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    id="isActiveOffer"
                    checked={offersFormData.is_active}
                    onChange={(e) => setOffersFormData({ ...offersFormData, is_active: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActiveOffer" className="ml-2 block text-sm text-gray-900">
                    Active Offer
                  </label>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetOffersForm}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOffer}
                    className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    {editingOffer ? 'Update Offer' : 'Add Offer'}
                  </button>
                </div>
              </div>
            )}

            {/* Offers List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Special Offers</h3>
                  <button
                    onClick={() => setShowOffersForm(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Add New Offer
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Offer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Promo Code
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
                    {offers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{offer.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{offer.title}</div>
                            <div className="text-sm text-gray-500">{offer.title_ar}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {offer.discount_percentage}% OFF
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {offer.promo_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleOfferActive(offer)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              offer.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {offer.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditOffer(offer)}
                            className="text-purple-600 hover:text-purple-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {offers.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  No offers found. Add your first offer to get started!
                </div>
              )}
            </div>
          </>
        )}

        {/* CITIES TAB */}
        {activeTab === 'cities' && (
          <>
            {/* Add/Edit Cities Form */}
            {showCitiesForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingCity ? 'Edit City' : 'Add New City'}
                  </h2>
                  <button
                    onClick={resetCitiesForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City Name (English) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Amman"
                      value={citiesFormData.name}
                      onChange={(e) => setCitiesFormData({ ...citiesFormData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City Name (Arabic) *
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: عمان"
                      value={citiesFormData.name_ar}
                      onChange={(e) => setCitiesFormData({ ...citiesFormData, name_ar: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={citiesFormData.position}
                      onChange={(e) => setCitiesFormData({ ...citiesFormData, position: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower number = higher position on screen</p>
                  </div>
                </div>

                <div className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    id="isActiveCity"
                    checked={citiesFormData.is_active}
                    onChange={(e) => setCitiesFormData({ ...citiesFormData, is_active: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActiveCity" className="ml-2 block text-sm text-gray-900">
                    Active City
                  </label>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetCitiesForm}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCity}
                    className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    {editingCity ? 'Update City' : 'Add City'}
                  </button>
                </div>
              </div>
            )}

            {/* Cities List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Cities</h3>
                  <button
                    onClick={() => setShowCitiesForm(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Add New City
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        City Name
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
                    {cities.map((city) => (
                      <tr key={city.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-purple-600">
                              <span className="text-lg">#{city.position}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{city.name}</div>
                            <div className="text-sm text-gray-500">{city.name_ar}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleCityActive(city)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              city.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {city.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditCity(city)}
                            className="text-purple-600 hover:text-purple-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCity(city.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {cities.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  No cities found. Add your first city to get started!
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePageManagement; 
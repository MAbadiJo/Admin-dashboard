import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');
  
  // Categories state
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name_en: '',
    name_ar: '',
    image_url: '',
    position: 0,
    is_active: true
  });
  
  // Activities state
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    image_url: '',
    city: 'amman',
    category_id: null,
    price: 0,
    is_new: false,
    featured: false,
    is_active: true
  });
  
  // Sections state - UPDATED: Now using home_sections instead of dynamic_sections
  const [sections, setSections] = useState([]);
  const [newSection, setNewSection] = useState({
    name_en: '',
    name_ar: '',
    section_type: '',
    is_active: true
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check authentication and role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', user.email)
          .single();

        if (adminUser) {
          setUser(adminUser);
          fetchInitialData();
        } else {
          await supabase.auth.signOut();
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('position');
      
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });
      
      // UPDATED: Now fetching from home_sections instead of dynamic_sections
      const { data: sections } = await supabase
        .from('home_sections')
        .select('*')
        .order('position');

      setCategories(categories || []);
      setActivities(activities || []);
      setSections(sections || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Common image upload handler
  const handleImageUpload = async (e, setState) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-images')
        .getPublicUrl(filePath);

      setState(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD Operations for Categories
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      if (isEditing) {
        const { error } = await supabase
          .from('categories')
          .update(newCategory)
          .eq('id', newCategory.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{ 
            ...newCategory, 
            position: categories.length + 1 
          }]);
        
        if (error) throw error;
      }

      await fetchInitialData();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD Operations for Activities
  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      if (isEditing) {
        const { error } = await supabase
          .from('activities')
          .update(newActivity)
          .eq('id', newActivity.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('activities')
          .insert([newActivity]);
        
        if (error) throw error;
      }

      await fetchInitialData();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD Operations for Sections - UPDATED: Now using home_sections
  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      if (isEditing) {
        const { error } = await supabase
          .from('home_sections')  // UPDATED: Changed from dynamic_sections
          .update(newSection)
          .eq('id', newSection.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('home_sections')  // UPDATED: Changed from dynamic_sections
          .insert([newSection]);
        
        if (error) throw error;
      }

      await fetchInitialData();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Common edit handler
  const handleEdit = (item, type) => {
    if (type === 'category') setNewCategory(item);
    if (type === 'activity') setNewActivity(item);
    if (type === 'section') setNewSection(item);
    setIsEditing(true);
  };

  // Common delete handler - UPDATED: Now using home_sections
  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from(type === 'category' ? 'categories' : 
              type === 'activity' ? 'activities' : 'home_sections')  // UPDATED: Changed from dynamic_sections
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await fetchInitialData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Common reset form
  const resetForm = () => {
    setNewCategory({
      name_en: '',
      name_ar: '',
      image_url: '',
      position: 0,
      is_active: true
    });
    setNewActivity({
      title_en: '',
      title_ar: '',
      description_en: '',
      description_ar: '',
      image_url: '',
      city: 'amman',
      category_id: null,
      price: 0,
      is_new: false,
      featured: false,
      is_active: true
    });
    setNewSection({
      name_en: '',
      name_ar: '',
      section_type: '',
      is_active: true
    });
    setIsEditing(false);
    setError(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Tab Components
  const CategoriesTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">
          {isEditing ? 'Edit Category' : 'Add New Category'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleCategorySubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">English Name:</label>
              <input
                type="text"
                value={newCategory.name_en}
                onChange={(e) => setNewCategory({...newCategory, name_en: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Arabic Name:</label>
              <input
                type="text"
                value={newCategory.name_ar}
                onChange={(e) => setNewCategory({...newCategory, name_ar: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 font-medium mb-2">Category Image:</label>
            <input 
              type="file" 
              onChange={(e) => handleImageUpload(e, setNewCategory)} 
              accept="image/*"
              className="w-full text-gray-700"
            />
            {newCategory.image_url && (
              <div className="mt-3">
                <img 
                  src={newCategory.image_url} 
                  alt="Preview" 
                  className="max-w-full h-auto max-h-40 rounded-md border border-gray-200"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="categoryActive"
              checked={newCategory.is_active}
              onChange={(e) => setNewCategory({...newCategory, is_active: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="categoryActive">Active</label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 rounded-md text-white font-medium ${isLoading ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'} transition`}
            >
              {isLoading ? 'Processing...' : isEditing ? 'Update' : 'Add'} Category
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">
          Categories ({categories.length})
        </h2>
        
        {isLoading && !categories.length ? (
          <div className="text-center py-8 text-gray-600">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No categories found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">English Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arabic Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category, index) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.name_en}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{category.name_ar}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(category, 'category')}
                          disabled={isLoading}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id, 'category')}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
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
  );

  const ActivitiesTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">
          {isEditing ? 'Edit Activity' : 'Add New Activity'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleActivitySubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">English Title:</label>
              <input
                type="text"
                value={newActivity.title_en}
                onChange={(e) => setNewActivity({...newActivity, title_en: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Arabic Title:</label>
              <input
                type="text"
                value={newActivity.title_ar}
                onChange={(e) => setNewActivity({...newActivity, title_ar: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">English Description:</label>
              <textarea
                value={newActivity.description_en}
                onChange={(e) => setNewActivity({...newActivity, description_en: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Arabic Description:</label>
              <textarea
                value={newActivity.description_ar}
                onChange={(e) => setNewActivity({...newActivity, description_ar: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">City:</label>
              <select
                value={newActivity.city}
                onChange={(e) => setNewActivity({...newActivity, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="amman">Amman</option>
                <option value="zarqa">Zarqa</option>
                <option value="irbid">Irbid</option>
                <option value="aqaba">Aqaba</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Category:</label>
              <select
                value={newActivity.category_id || ''}
                onChange={(e) => setNewActivity({...newActivity, category_id: e.target.value ? parseInt(e.target.value) : null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Price (JOD):</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newActivity.price}
                onChange={(e) => setNewActivity({...newActivity, price: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 font-medium mb-2">Activity Image:</label>
            <input 
              type="file" 
              onChange={(e) => handleImageUpload(e, setNewActivity)} 
              accept="image/*"
              className="w-full text-gray-700"
            />
            {newActivity.image_url && (
              <div className="mt-3">
                <img 
                  src={newActivity.image_url} 
                  alt="Preview" 
                  className="max-w-full h-auto max-h-40 rounded-md border border-gray-200"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="activityActive"
                checked={newActivity.is_active}
                onChange={(e) => setNewActivity({...newActivity, is_active: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="activityActive">Active</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="activityFeatured"
                checked={newActivity.featured}
                onChange={(e) => setNewActivity({...newActivity, featured: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="activityFeatured">Featured</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="activityNew"
                checked={newActivity.is_new}
                onChange={(e) => setNewActivity({...newActivity, is_new: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="activityNew">Mark as New</label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 rounded-md text-white font-medium ${isLoading ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'} transition`}
            >
              {isLoading ? 'Processing...' : isEditing ? 'Update' : 'Add'} Activity
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">
          Activities ({activities.length})
        </h2>
        
        {isLoading && !activities.length ? (
          <div className="text-center py-8 text-gray-600">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No activities found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{activity.title_en}</div>
                      <div className="text-sm text-gray-500">{activity.title_ar}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {activity.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {categories.find(c => c.id === activity.category_id)?.name_en || 'None'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.price} JOD
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${activity.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {activity.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {activity.featured && (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Featured
                        </span>
                      )}
                      {activity.is_new && (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          New
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(activity, 'activity')}
                          disabled={isLoading}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(activity.id, 'activity')}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
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
  );

  const SectionsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">
          {isEditing ? 'Edit Section' : 'Add New Section'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSectionSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">English Name:</label>
              <input
                type="text"
                value={newSection.name_en}
                onChange={(e) => setNewSection({...newSection, name_en: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Arabic Name:</label>
              <input
                type="text"
                value={newSection.name_ar}
                onChange={(e) => setNewSection({...newSection, name_ar: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 font-medium mb-2">Section Type:</label>
            <select
              value={newSection.section_type}
              onChange={(e) => setNewSection({...newSection, section_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              disabled={isEditing}
            >
              <option value="">Select Section Type</option>
              <option value="featured">Featured</option>
              <option value="top_rated">Top Rated</option>
              <option value="recent">Recently Added</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="sectionActive"
              checked={newSection.is_active}
              onChange={(e) => setNewSection({...newSection, is_active: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="sectionActive">Active</label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 rounded-md text-white font-medium ${isLoading ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'} transition`}
            >
              {isLoading ? 'Processing...' : isEditing ? 'Update' : 'Add'} Section
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">
          Sections ({sections.length})
        </h2>
        
        {isLoading && !sections.length ? (
          <div className="text-center py-8 text-gray-600">Loading sections...</div>
        ) : sections.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No sections found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">English Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arabic Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sections.map((section) => (
                  <tr key={section.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {section.name_en}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {section.name_ar}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {section.section_type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${section.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {section.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(section, 'section')}
                          disabled={isLoading}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(section.id, 'section')}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
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
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p>You need to be logged in to access this page.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-purple-700">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Logged in as: {user.full_name} ({user.role})
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={handleLogout}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-2 px-4 ${activeTab === 'categories' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-gray-500'}`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`pb-2 px-4 ${activeTab === 'activities' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-gray-500'}`}
          >
            Activities
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`pb-2 px-4 ${activeTab === 'sections' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-gray-500'}`}
          >
            Sections
          </button>
        </div>

        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'activities' && <ActivitiesTab />}
        {activeTab === 'sections' && <SectionsTab />}
      </div>
    </div>
  );
};

export default AdminDashboard;
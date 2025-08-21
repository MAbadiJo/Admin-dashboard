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

const ActivitiesManagement = () => {
  const [activities, setActivities] = useState([]);
  const [partners, setPartners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Edit contexts
  const [editingActivity, setEditingActivity] = useState(null);

  // Delete confirmations
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);

  // Notifications
  const [notification, setNotification] = useState(null);

  // Activity form - SIMPLIFIED FOR SINGLE TABLE
  const [formData, setFormData] = useState({
    partnerId: '',
    categoryId: '',
    titleEn: '',
    titleAr: '',
    descriptionEn: '',
    descriptionAr: '',
          price: '',
      homeScreenPrice: '', // NEW: Dedicated field for home screen display
      currency: 'JOD',
    locationEn: '',
    locationAr: '',
    address: '',
    latitude: '',
    longitude: '',
    websiteUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    termsConditionsEn: '',
    termsConditionsAr: '',
    imageUrl: '',
    videoUrl: '',
    isActive: true,
    isFeatured: false,
    isPopular: false,
    isNew: true,
    activityType: 'selling_tickets', // 'selling_tickets', 'promotional_advertisement', or 'reservation'
    paymentMethod: 'all', // 'all', 'visa-only', 'cash-only', 'cash-visa'
    maxParticipants: '',
    availableTickets: '100',
    duration: '',
    ageRestriction: '',
    difficulty: '',
    tags: '',
  });

  // NEW: Multiple tickets array for dynamic ticket management
  const [tickets, setTickets] = useState([
    {
      id: 1,
      nameEn: 'Full Day Access',
      nameAr: 'وصول ليوم كامل',
      descriptionEn: 'Play full day with more than 1000 games',
      descriptionAr: 'اللعب ليوم كامل مع أكثر من 1000 لعبة',
      price: '',
      isActive: true
    }
  ]);

  // NEW: File upload states
  const [mainImageFile, setMainImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Dynamic gallery and media inputs
  const [galleryInputs, setGalleryInputs] = useState(['']);
  const [mediaInputs, setMediaInputs] = useState([{ type: 'image', url: '' }]);

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
      } else {
        console.log('ℹ️ No existing session found');
      }
    };
    
    checkSession();
    fetchData();
    
    // Load saved session on mount
    const loadSavedSession = () => {
      const savedSession = localStorage.getItem('activitiesManagementSession');
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
            if (sessionData.tickets) {
              setTickets(sessionData.tickets);
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
        tickets: tickets,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('activitiesManagementSession', JSON.stringify(sessionState));
    };
    
    // Save session every 30 seconds
    const sessionInterval = setInterval(saveSessionState, 30000);
    
    return () => clearInterval(sessionInterval);
  }, [formData, tickets]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching activities data...');

      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          partners:partner_id(
            id,
            name,
            business_name,
            business_name_ar,
            is_verified
          ),
          categories:category_id(
            id,
            name,
            name_ar
          )
        `)
        .order('created_at', { ascending: false });

      if (activitiesError) {
        console.error('Error fetching activities:', activitiesError);
      } else {
        console.log('Activities fetched successfully:', activitiesData?.length);
        setActivities(activitiesData || []);
      }

      // Fetch all partners first to see what's available
      const { data: allPartnersData, error: allPartnersError } = await supabase
        .from('partners')
        .select('id, name, business_name, business_name_ar, is_verified, is_active')
        .order('business_name', { ascending: true });
      
      if (allPartnersError) {
        console.error('Error fetching all partners:', allPartnersError);
      } else {
        console.log('All partners in database:', allPartnersData);
      }

      // Filter for active and verified partners
      const activeVerifiedPartners = allPartnersData?.filter(partner => 
        partner.is_active === true && partner.is_verified === true
      ) || [];
      
      console.log('Active and verified partners:', activeVerifiedPartners);
      
      // If no active/verified partners, show all partners for now
      const partnersToShow = activeVerifiedPartners.length > 0 ? activeVerifiedPartners : allPartnersData || [];
      
      setPartners(partnersToShow);

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, name_ar')
        .eq('is_active', true);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error in fetchData:', error);
      setNotification({
        type: 'error',
        message: 'Something went wrong while fetching data',
        title: 'Error'
      });
    } finally {
      setLoading(false);
      console.log('Data fetching completed');
    }
  };

  const resetForm = () => {
    setFormData({
      partnerId: '',
      categoryId: '',
      titleEn: '',
      titleAr: '',
      descriptionEn: '',
      descriptionAr: '',
      price: '',
      homeScreenPrice: '', // NEW: Dedicated field for home screen display
      currency: 'JOD',
      locationEn: '',
      locationAr: '',
      address: '',
      latitude: '',
      longitude: '',
      websiteUrl: '',
      instagramUrl: '',
      facebookUrl: '',
      termsConditionsEn: '',
      termsConditionsAr: '',
      imageUrl: '',
      videoUrl: '',
      isActive: true,
      isFeatured: false,
      isPopular: false,
      isNew: true,
      activityType: 'selling_tickets',
      paymentMethod: 'all', // 'all', 'visa-only', 'cash-only', 'cash-visa'
      maxParticipants: '',
      availableTickets: '100',
      duration: '',
      ageRestriction: '',
      difficulty: '',
      tags: '',
    });
    setGalleryInputs(['']);
    setMediaInputs([{ type: 'image', url: '' }]);
    
    // NEW: Reset tickets and file uploads
    setTickets([{
      id: 1,
      nameEn: 'Full Day Access',
      nameAr: 'وصول ليوم كامل',
      descriptionEn: 'Play full day with more than 1000 games',
      descriptionAr: 'اللعب ليوم كامل مع أكثر من 1000 لعبة',
      price: '',
      isActive: true
    }]);
    setMainImageFile(null);
    setGalleryFiles([]);
    setVideoFile(null);
    setUploadProgress(0);
  };

  const handleAddActivity = () => {
    console.log('Add Activity button clicked');
    setEditingActivity(null);
    resetForm();
    setModalVisible(true);
    console.log('Modal visibility set to true');
  };

  const handleEditActivity = (activity) => {
    console.log('Editing activity:', activity.id);
    setEditingActivity(activity);
    setFormData({
      partnerId: activity.partner_id || '',
      categoryId: activity.category_id || '',
      titleEn: activity.title || '',
      titleAr: activity.title_ar || '',
      descriptionEn: activity.description || '',
      descriptionAr: activity.description_ar || '',
      price: activity.price || '',
      currency: activity.currency || 'JOD',
      locationEn: activity.location || '',
      locationAr: activity.location_ar || '',
      address: activity.address || '',
      latitude: activity.latitude || '',
      longitude: activity.longitude || '',
      websiteUrl: activity.website_url || '',
      instagramUrl: activity.instagram_url || '',
      facebookUrl: activity.facebook_url || '',
      termsConditionsEn: activity.terms || '',
      termsConditionsAr: activity.terms_ar || '',
      imageUrl: activity.image_url || '',
      videoUrl: activity.video_url || '',
      isActive: activity.is_active !== false,
      isFeatured: activity.is_featured || false,
      isPopular: activity.is_popular || false,
      isNew: activity.is_new || false,
      activityType: activity.activity_type || 'selling_tickets',
      paymentMethod: 'all', // Default to 'all' since we don't store this in DB
      homeScreenPrice: activity.home_screen_price?.toString() || '',
      maxParticipants: activity.max_participants || '',
      availableTickets: activity.available_tickets || '100',
      duration: activity.duration || '',
      ageRestriction: activity.age_restriction || '',
      difficulty: activity.difficulty || '',
      tags: activity.tags ? activity.tags.join(', ') : '',
    });

    // Handle gallery images
    const galleryImages = activity.gallery_images || [];
    setGalleryInputs(galleryImages.length > 0 ? [galleryImages.join(', ')] : ['']);

    // Handle media (mixed images/videos)
    const media = activity.media || [];
    setMediaInputs(media.length > 0 ? media : [{ type: 'image', url: '' }]);

    setModalVisible(true);
  };

  // Helper function to validate and clean URLs
  const cleanUrl = (url) => {
    if (!url) return null;
    url = url.trim();
    
    // Accept any URL format - no strict validation
    if (url.includes('drive.google.com') || 
        url.includes('googleapis.com') ||
        url.includes('dropbox.com') ||
        url.includes('onedrive.com') ||
        url.includes('imgur.com') ||
        url.includes('cloudinary.com') ||
        url.includes('amazonaws.com') ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:') ||
        url.startsWith('/') ||
        url.includes('.')) {
      return url;
    }
    
    return url;
  };

  // NEW: File upload functions - Using base64 for now to avoid storage bucket issues
  const uploadFile = async (file, folder = 'activities') => {
    if (!file) return null;
    
    try {
      setUploadProgress(0);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      
      console.log(`Uploading ${file.name} to ${filePath}...`);
      
      const { data, error } = await supabase.storage
        .from('activities')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(percent);
          }
        });
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('activities')
        .getPublicUrl(filePath);
      
      console.log('Upload successful:', publicUrl);
      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(0);
      throw error;
    }
  };

  const handleMainImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setMainImageFile(file);
      try {
        const url = await uploadFile(file, 'activities/main-images');
        setFormData({ ...formData, imageUrl: url });
        setNotification({
          type: 'success',
          message: 'Main image uploaded successfully!',
          title: 'Upload Success'
        });
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Failed to upload main image',
          title: 'Upload Error'
        });
      }
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setGalleryFiles(prev => [...prev, ...files]);
      try {
        const uploadPromises = files.map(file => uploadFile(file, 'activities/gallery'));
        const urls = await Promise.all(uploadPromises);
        
        // Add new URLs to existing gallery
        const newGalleryUrls = urls.filter(url => url);
        setGalleryInputs(prev => [...prev, ...newGalleryUrls]);
        
        setNotification({
          type: 'success',
          message: `${newGalleryUrls.length} images uploaded successfully!`,
          title: 'Upload Success'
        });
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Failed to upload some images',
          title: 'Upload Error'
        });
      }
    }
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(file);
      try {
        const url = await uploadFile(file, 'activities/videos');
        setFormData({ ...formData, videoUrl: url });
        setNotification({
          type: 'success',
          message: 'Video uploaded successfully!',
          title: 'Upload Success'
        });
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Failed to upload video',
          title: 'Upload Error'
        });
      }
    }
  };

  // NEW: Ticket management functions
  const addNewTicket = () => {
    const newTicket = {
      id: Date.now(),
      nameEn: '2 Hours Access',
      nameAr: 'وصول ساعتين',
      descriptionEn: 'Play 2 hours with more than 50 games',
      descriptionAr: 'اللعب ساعتين مع أكثر من 50 لعبة',
      price: '',
      isActive: true
    };
    setTickets([...tickets, newTicket]);
  };

  const removeTicket = (ticketId) => {
    setTickets(tickets.filter(ticket => ticket.id !== ticketId));
  };

  const updateTicket = (ticketId, field, value) => {
    setTickets(tickets.map(ticket => 
      ticket.id === ticketId ? { ...ticket, [field]: value } : ticket
    ));
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    console.log('Save Activity form submitted');
    
    try {
      console.log('Form data:', formData);
      
      // Only require title (English) - everything else is optional
      if (!formData.titleEn.trim()) {
        setNotification({
          type: 'error',
          message: 'Please enter at least an English title for the activity.',
          title: 'Validation Error'
        });
        return;
      }

      // Process gallery images - accept any URLs without strict validation
      const galleryImagesArray = galleryInputs
        .flatMap((row) => (row ? row.split(',') : []))
        .map((url) => cleanUrl(url))
        .filter(Boolean);

      // Process media (images + videos)
      const mediaArray = mediaInputs
        .map((media) => ({
          type: media.type || 'image',
          url: cleanUrl(media.url)
        }))
        .filter((media) => media.url);

      // Process tags
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      // Process payment method for selling tickets
      let paymentTypes = ['visa', 'wallet']; // Default
      let cashPaymentEnabled = false;
      
      if (formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') {
        switch (formData.paymentMethod) {
          case 'all':
            paymentTypes = ['visa', 'wallet', 'cash'];
            cashPaymentEnabled = true;
            break;
          case 'visa-only':
            paymentTypes = ['visa'];
            cashPaymentEnabled = false;
            break;
          case 'cash-only':
            paymentTypes = ['cash'];
            cashPaymentEnabled = true;
            break;
          case 'cash-visa':
            paymentTypes = ['visa', 'cash'];
            cashPaymentEnabled = true;
            break;
          default:
            paymentTypes = ['visa', 'wallet'];
            cashPaymentEnabled = false;
        }
      }

      console.log('Processing gallery images:', galleryImagesArray);
      console.log('Processing media:', mediaArray);

      // Calculate lowest ticket price from tickets array
      let lowestTicketPrice = null;
      if ((formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') && tickets.length > 0) {
        const validTickets = tickets.filter(ticket => ticket.price && ticket.price > 0 && ticket.isActive);
        if (validTickets.length > 0) {
          lowestTicketPrice = Math.min(...validTickets.map(ticket => parseFloat(ticket.price)));
          console.log('Lowest ticket price calculated:', lowestTicketPrice);
        }
      }

      // Build activity data - SINGLE TABLE APPROACH
      const activityData = {
        // Core information (Title is the only required field)
        title: formData.titleEn.trim(),
        title_ar: formData.titleAr?.trim() || null,
        description: formData.descriptionEn?.trim() || null,
        description_ar: formData.descriptionAr?.trim() || null,
        
        // Relations (optional) - only if they exist in database
        partner_id: formData.partnerId && partners.find(p => p.id === formData.partnerId) ? formData.partnerId : null,
        category_id: formData.categoryId && categories.find(c => c.id === formData.categoryId) ? formData.categoryId : null,
        
        // Pricing (for selling tickets and reservations) - use lowest ticket price
        price: lowestTicketPrice || ((formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') && formData.price 
          ? parseFloat(formData.price) : null),
        
        // Home screen price (for display purposes)
        home_screen_price: formData.homeScreenPrice ? parseFloat(formData.homeScreenPrice) : null,
        currency: formData.currency || 'JOD',
        
        // Ticket information
        available_tickets: (formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') && formData.availableTickets 
          ? parseInt(formData.availableTickets) : 100,
        
        // Location (all optional)
        location: formData.locationEn?.trim() || null,
        location_ar: formData.locationAr?.trim() || null,
        address: formData.address?.trim() || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        
        // Terms (using correct column names from schema)
        terms: formData.termsConditionsEn?.trim() || null,
        terms_ar: formData.termsConditionsAr?.trim() || null,
        
        // Media
        image_url: cleanUrl(formData.imageUrl),
        gallery_images: galleryImagesArray.length > 0 ? galleryImagesArray : null,
        media: mediaArray.length > 0 ? mediaArray : null,
        
        // Activity details
        max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        duration: formData.duration?.trim() || null,
        
        // URLs (using correct column name from schema)
        website_url: cleanUrl(formData.websiteUrl),
        instagram_url: cleanUrl(formData.instagramUrl),
        facebook_url: cleanUrl(formData.facebookUrl),
        
        // Status flags
        is_active: formData.isActive,
        is_featured: formData.isFeatured,
        is_popular: formData.isPopular,
        is_new: formData.isNew,
        
        // Activity type and payment info
        activity_type: formData.activityType,
        payment_types: (formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') ? paymentTypes : null,
        cash_payment_enabled: (formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') ? cashPaymentEnabled : false,
        
        // Additional fields
        video_url: cleanUrl(formData.videoUrl),
        tags: tagsArray.length > 0 ? tagsArray : null,
        age_restriction: formData.ageRestriction?.trim() || null,
        difficulty: formData.difficulty?.trim() || null,
        
        // Store tickets data for mobile app
        tickets_data: (formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') && tickets.length > 0 
          ? tickets.map(ticket => ({
              id: ticket.id,
              name: ticket.nameEn,
              name_ar: ticket.nameAr,
              description: ticket.descriptionEn,
              description_ar: ticket.descriptionAr,
              price: parseFloat(ticket.price) || 0,
              is_active: ticket.isActive
            })) : null,
        
        // Timestamps - let Supabase handle these automatically
        // updated_at: new Date().toISOString(),
      };

      // Clean up any undefined values that might cause issues
      Object.keys(activityData).forEach(key => {
        if (activityData[key] === undefined) {
          console.warn(`⚠️ Removing undefined value for key: ${key}`);
          delete activityData[key];
        }
      });

      console.log('Prepared activity data:', activityData);
      
      // Validate data before sending
      console.log('🔍 Data validation:');
      console.log('- Title:', activityData.title ? '✅' : '❌ Missing');
      console.log('- Partner ID:', activityData.partner_id ? '✅' : '⚠️ Optional');
      console.log('- Category ID:', activityData.category_id ? '✅' : '⚠️ Optional');
      console.log('- Price:', activityData.price !== null ? '✅' : '⚠️ Optional');
      console.log('- Available tickets:', activityData.available_tickets !== null ? '✅' : '⚠️ Optional');
      console.log('- Activity type:', activityData.activity_type ? '✅' : '❌ Missing');
      console.log('- Payment types:', activityData.payment_types ? '✅' : '⚠️ Optional');
      console.log('- Image URL:', activityData.image_url ? '✅' : '⚠️ Optional');
      console.log('- Gallery images:', activityData.gallery_images ? '✅' : '⚠️ Optional');

      if (editingActivity) {
        console.log('Updating existing activity:', editingActivity.id);
        const { data, error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', editingActivity.id)
          .select();
        
        if (error) {
          console.error('Error updating activity:', error);
          setNotification({
            type: 'error',
            message: `Failed to update activity: ${error.message}`,
            title: 'Error'
          });
          throw error;
        }
        console.log('Activity updated successfully:', data);
        setNotification({
          type: 'success',
          message: '✅ Activity updated successfully!',
          title: 'Success'
        });
      } else {
        console.log('Creating new activity');
        // Let Supabase handle created_at automatically
        // activityData.created_at = new Date().toISOString();
        
        console.log('About to insert activity data:', JSON.stringify(activityData, null, 2));
        
        console.log('🔄 Starting Supabase insert...');
        
        // Simple, direct insert - no timeouts, no Promise.race
        const { data, error } = await supabase
          .from('activities')
          .insert(activityData)
          .select();
        
        console.log('📥 Supabase responded!');
        
        if (error) {
          console.error('❌ Insert failed:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          console.error('🔍 Full error object:', JSON.stringify(error, null, 2));
          console.error('📋 Data that was sent:', JSON.stringify(activityData, null, 2));
          setNotification({
            type: 'error',
            message: `Failed to create activity: ${error.message}`,
            title: 'Error'
          });
          throw error;
        }
        
        console.log('✅ Insert succeeded:', data);
        setNotification({
          type: 'success',
          message: '✅ Activity created successfully!',
          title: 'Success'
        });
      }

      setModalVisible(false);
      console.log('Refreshing data...');
      await fetchData();
      
      // Clear saved session after successful save
      localStorage.removeItem('activitiesManagementSession');
    } catch (error) {
      console.error('Error in handleSaveActivity:', error);
      setNotification({
        type: 'error',
        message: 'Something went wrong: ' + error.message,
        title: 'Error'
      });
    }
  };

  const handleToggleVisibility = async (activity) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_active: !activity.is_active })
        .eq('id', activity.id);
      if (error) throw error;
      fetchData();
      setNotification({
        type: 'success',
        message: `Activity ${activity.is_active ? 'hidden' : 'shown'} successfully!`,
        title: 'Success'
      });
    } catch (error) {
      console.error('Error:', error);
      setNotification({
        type: 'error',
        message: 'Something went wrong',
        title: 'Error'
      });
    }
  };

  const handleDeleteClick = (activity) => {
    setActivityToDelete(activity);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (activityToDelete) {
      try {
        // NO MORE TICKET DELETION - Just delete the activity
        const { error } = await supabase.from('activities').delete().eq('id', activityToDelete.id);
        if (error) throw error;
        fetchData();
        setNotification({
          type: 'success',
          message: 'Activity deleted successfully!',
          title: 'Success'
        });
          } catch (error) {
      console.error('Error:', error);
      setNotification({
        type: 'error',
        message: 'Something went wrong: ' + error.message,
        title: 'Error'
      });
    }
    }
    setShowDeleteConfirm(false);
    setActivityToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setActivityToDelete(null);
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.title_ar?.includes(searchQuery) ||
      activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'visible' && activity.is_active) ||
      (statusFilter === 'hidden' && !activity.is_active);

    const matchesType =
      typeFilter === 'all' ||
      activity.activity_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getActivityTypeDisplay = (activityType) => {
    switch (activityType) {
      case 'promotional_advertisement':
        return 'Promotional Ad';
      case 'reservation':
        return 'Reservation';
      case 'selling_tickets':
      default:
        return 'Selling Tickets';
    }
  };

  const getPaymentTypesDisplay = (activity) => {
    if (activity.activity_type === 'promotional_advertisement') return 'N/A';
    
    if (!activity.payment_types) return 'Default (Visa, Wallet)';
    
    const types = [];
    if (activity.payment_types.includes('visa')) types.push('Visa');
    if (activity.payment_types.includes('wallet')) types.push('Wallet');
    if (activity.payment_types.includes('cash') || activity.cash_payment_enabled) types.push('Cash');
    
    return types.join(', ') || 'None';
  };

  const renderActivityItem = (activity) => {
    const partnerName = activity.partners?.business_name || activity.partners?.name || 'No Partner';
    const categoryName = activity.categories?.name || 'No Category';
    const isPromotional = activity.activity_type === 'promotional_advertisement';

    return (
      <div key={activity.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{activity.title}</h3>
              {!activity.is_active && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Hidden</span>
              )}
              {activity.is_featured && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Featured</span>
              )}
              {activity.is_new && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">New</span>
              )}
              {activity.partners?.is_verified && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">✓ Verified Partner</span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${
                activity.activity_type === 'promotional_advertisement'
                  ? 'bg-purple-100 text-purple-800'
                  : activity.activity_type === 'reservation'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {getActivityTypeDisplay(activity.activity_type)}
              </span>
            </div>
            <p className="text-gray-600 mb-2">Arabic: {activity.title_ar || 'Not set'}</p>
            <p className="text-gray-600 mb-2">Partner: {partnerName}</p>
            <p className="text-gray-600 mb-2">Category: {categoryName}</p>
            <p className="text-gray-600 mb-2">Type: {getActivityTypeDisplay(activity.activity_type)}</p>
            {!isPromotional && (
              <>
                <p className="text-gray-600 mb-2">Price: {activity.price || 'Free'} {activity.currency || ''}</p>
                <p className="text-gray-600 mb-2">Payment: {getPaymentTypesDisplay(activity)}</p>
                <p className="text-gray-600 mb-2">Available Tickets: {activity.available_tickets || 'Unlimited'}</p>
                
                {/* Note: Tickets are managed separately, not stored in activities table */}
              </>
            )}
            <p className="text-gray-600 mb-2">Location: {activity.location || 'Not set'}</p>
            {activity.duration && (
              <p className="text-gray-600 mb-2">Duration: {activity.duration}</p>
            )}
            {activity.max_participants && (
              <p className="text-gray-600 mb-2">Max Participants: {activity.max_participants}</p>
            )}
            {activity.tags && activity.tags.length > 0 && (
              <p className="text-gray-600 mb-2">Tags: {activity.tags.join(', ')}</p>
            )}
            {activity.description && (
              <p className="text-gray-600 text-sm">{activity.description.substring(0, 150)}...</p>
            )}
            
            {/* Media Preview */}
            <div className="mt-3 flex space-x-2">
              {activity.image_url && (
                <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden">
                  <img 
                    src={activity.image_url} 
                    alt="Activity" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
              {activity.video_url && (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-600">🎥</span>
                </div>
              )}
              {activity.gallery_images && activity.gallery_images.length > 0 && (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-600">+{activity.gallery_images.length}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handleToggleVisibility(activity)}
              className={`px-3 py-1 rounded-md transition-colors text-sm ${
                !activity.is_active ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {!activity.is_active ? 'Show' : 'Hide'}
            </button>
            <button
              onClick={() => handleEditActivity(activity)}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteClick(activity)}
              className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMediaInput = (media, index) => (
    <div key={index} className="flex items-center space-x-2 mb-2">
      <select
        value={media.type}
        onChange={(e) => {
          const newMediaInputs = [...mediaInputs];
          newMediaInputs[index].type = e.target.value;
          setMediaInputs(newMediaInputs);
        }}
        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="image">Image</option>
        <option value="video">Video</option>
      </select>
      <input
        type="text"
        placeholder="Any URL: Google Drive, YouTube, direct link, etc."
        value={media.url}
        onChange={(e) => {
          const newMediaInputs = [...mediaInputs];
          newMediaInputs[index].url = e.target.value;
          setMediaInputs(newMediaInputs);
        }}
        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      {mediaInputs.length > 1 && (
        <button
          type="button"
          onClick={() => setMediaInputs(mediaInputs.filter((_, i) => i !== index))}
          className="px-3 py-2 text-red-600 border border-red-200 rounded-md hover:bg-red-50"
        >
          Remove
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading activities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification System */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : notification.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities Management</h1>
          <p className="text-gray-600">Manage all partner activities and their visibility</p>
        </div>
        <button
          onClick={handleAddActivity}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Add New Activity
        </button>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Activities</label>
            <input
              type="text"
              placeholder="Search by title, description, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Activities</option>
              <option value="visible">Visible Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Types</option>
              <option value="selling_tickets">Selling Tickets</option>
              <option value="promotional_advertisement">Promotional Ads</option>
              <option value="reservation">Reservation</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎯</div>
            <p className="text-gray-600">No activities found</p>
            <p className="text-sm text-gray-500">
              {activities.length === 0 ? 'Add your first activity to get started' : 'Try adjusting your search criteria'}
            </p>
          </div>
        ) : (
          filteredActivities.map(renderActivityItem)
        )}
      </div>

      {/* SIMPLIFIED Activity Modal - NO TICKETS MANAGEMENT */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingActivity ? 'Edit Activity' : 'Add New Activity'}
              </h2>
              <button onClick={() => setModalVisible(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSaveActivity}>
              {/* Activity Type Selection */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <label className="block text-lg font-medium text-gray-900 mb-3">Activity Type *</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    className={`border-2 p-4 rounded-lg cursor-pointer transition-colors ${
                      formData.activityType === 'selling_tickets' 
                        ? 'border-purple-500 bg-purple-100' 
                        : 'border-gray-300 hover:border-purple-300'
                    }`}
                    onClick={() => setFormData({ ...formData, activityType: 'selling_tickets' })}
                  >
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="activityType"
                        value="selling_tickets"
                        checked={formData.activityType === 'selling_tickets'}
                        onChange={() => setFormData({ ...formData, activityType: 'selling_tickets' })}
                        className="mr-3"
                      />
                      <h3 className="text-lg font-semibold text-emerald-700">🎫 Selling Tickets</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Customers can buy tickets and participate in the activity. 
                      Supports payment processing and booking system.
                    </p>
                  </div>
                  
                  <div 
                    className={`border-2 p-4 rounded-lg cursor-pointer transition-colors ${
                      formData.activityType === 'promotional_advertisement' 
                        ? 'border-purple-500 bg-purple-100' 
                        : 'border-gray-300 hover:border-purple-300'
                    }`}
                    onClick={() => setFormData({ ...formData, activityType: 'promotional_advertisement' })}
                  >
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="activityType"
                        value="promotional_advertisement"
                        checked={formData.activityType === 'promotional_advertisement'}
                        onChange={() => setFormData({ ...formData, activityType: 'promotional_advertisement' })}
                        className="mr-3"
                      />
                      <h3 className="text-lg font-semibold text-purple-700">📢 Promotional Advertisement</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Display-only activity for advertising purposes. 
                      No ticket purchasing - customers view information only.
                    </p>
                  </div>

                  <div 
                    className={`border-2 p-4 rounded-lg cursor-pointer transition-colors ${
                      formData.activityType === 'reservation' 
                        ? 'border-purple-500 bg-purple-100' 
                        : 'border-gray-300 hover:border-purple-300'
                    }`}
                    onClick={() => setFormData({ ...formData, activityType: 'reservation' })}
                  >
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="activityType"
                        value="reservation"
                        checked={formData.activityType === 'reservation'}
                        onChange={() => setFormData({ ...formData, activityType: 'reservation' })}
                        className="mr-3"
                      />
                      <h3 className="text-lg font-semibold text-orange-700">📞 Reservation</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Pre-booking required. Customer service will contact customers 
                      to confirm availability and process payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Title (English) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Play at Jony Playground"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Only field that's required</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Activity Title (Arabic)</label>
                  <input
                    type="text"
                    placeholder="مثال: اللعب في ملعب جوني"
                    value={formData.titleAr}
                    onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Partner</label>
                  <select
                    value={formData.partnerId}
                    onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Partner (Optional)</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.business_name || partner.name} 
                        {partner.is_verified ? ' ✓' : ' (Not Verified)'}
                        {partner.is_active === false ? ' (Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Category (Optional)</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Payment (Only for Selling Tickets and Reservation) */}
              {(formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') && (
                <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
                  <h3 className="text-lg font-medium text-emerald-800 mb-4">💰 Pricing & Payment Settings</h3>
                  
                  {/* Payment Methods */}
                  <div className="mb-6 p-4 bg-white rounded-lg border border-emerald-200">
                    <h4 className="text-md font-medium text-emerald-700 mb-3">Payment Methods</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="payment-all"
                          name="paymentMethod"
                          value="all"
                          checked={formData.paymentMethod === 'all'}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <label htmlFor="payment-all" className="ml-3 block text-sm text-gray-900">
                          <span className="font-medium">All Payment Methods</span>
                          <span className="text-gray-500 ml-2">(Cash, Visa, and Wallet)</span>
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="payment-visa-only"
                          name="paymentMethod"
                          value="visa-only"
                          checked={formData.paymentMethod === 'visa-only'}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <label htmlFor="payment-visa-only" className="ml-3 block text-sm text-gray-900">
                          <span className="font-medium">Only Visa</span>
                          <span className="text-gray-500 ml-2">(No cash or wallet payments)</span>
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="payment-cash-only"
                          name="paymentMethod"
                          value="cash-only"
                          checked={formData.paymentMethod === 'cash-only'}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <label htmlFor="payment-cash-only" className="ml-3 block text-sm text-gray-900">
                          <span className="font-medium">Only Cash</span>
                          <span className="text-gray-500 ml-2">(User can't pay by wallet if this option is active)</span>
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="payment-cash-visa"
                          name="paymentMethod"
                          value="cash-visa"
                          checked={formData.paymentMethod === 'cash-visa'}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <label htmlFor="payment-cash-visa" className="ml-3 block text-sm text-gray-900">
                          <span className="font-medium">Cash and Visa</span>
                          <span className="text-gray-500 ml-2">(No wallet payments)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NEW: Dynamic Tickets Section (Only for Selling Tickets and Reservation) */}
              {(formData.activityType === 'selling_tickets' || formData.activityType === 'reservation') && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-blue-800">Add New Ticket</h3>
                    <button
                      type="button"
                      onClick={addNewTicket}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      + Add New Ticket
                    </button>
                  </div>
                  
                  {tickets.map((ticket, index) => (
                    <div key={ticket.id} className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-medium text-blue-700">Ticket {index + 1}</h4>
                        {tickets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTicket(ticket.id)}
                            className="px-3 py-1 text-red-600 border border-red-200 rounded-md hover:bg-red-50 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Name (English)</label>
                          <input
                            type="text"
                            placeholder="e.g., Full Day Access"
                            value={ticket.nameEn}
                            onChange={(e) => updateTicket(ticket.id, 'nameEn', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Name (Arabic)</label>
                          <input
                            type="text"
                            placeholder="e.g., وصول ليوم كامل"
                            value={ticket.nameAr}
                            onChange={(e) => updateTicket(ticket.id, 'nameAr', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description (English)</label>
                          <textarea
                            placeholder="e.g., Play full day with more than 1000 games"
                            value={ticket.descriptionEn}
                            onChange={(e) => updateTicket(ticket.id, 'descriptionEn', e.target.value)}
                            rows="2"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description (Arabic)</label>
                          <textarea
                            placeholder="e.g., اللعب ليوم كامل مع أكثر من 1000 لعبة"
                            value={ticket.descriptionAr}
                            onChange={(e) => updateTicket(ticket.id, 'descriptionAr', e.target.value)}
                            rows="2"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price ({formData.currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="5.00"
                            value={ticket.price}
                            onChange={(e) => updateTicket(ticket.id, 'price', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`ticket-active-${ticket.id}`}
                            checked={ticket.isActive}
                            onChange={(e) => updateTicket(ticket.id, 'isActive', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`ticket-active-${ticket.id}`} className="ml-2 block text-sm text-gray-900">
                            Active Ticket
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Home Screen Price Section */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-medium text-purple-800 mb-4">🏠 Home Screen Price</h3>
                <p className="text-sm text-purple-600 mb-4">
                  This price will be displayed on the home screen and activity lists. 
                  Leave empty to show "Price on Request" or enter the lowest ticket price.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Home Screen Price ({formData.currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 5.00 (leave empty for 'Price on Request')"
                      value={formData.homeScreenPrice}
                      onChange={(e) => setFormData({ ...formData, homeScreenPrice: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        // Auto-calculate lowest ticket price
                        if (tickets.length > 0) {
                          const validTickets = tickets.filter(ticket => ticket.price && ticket.price > 0 && ticket.isActive);
                          if (validTickets.length > 0) {
                            const lowestPrice = Math.min(...validTickets.map(ticket => parseFloat(ticket.price)));
                            setFormData({ ...formData, homeScreenPrice: lowestPrice.toString() });
                          }
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      Auto-Fill Lowest Ticket Price
                    </button>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-medium text-blue-800 mb-4">📍 Location Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location (English)</label>
                    <input
                      type="text"
                      placeholder="Amman (optional)"
                      value={formData.locationEn}
                      onChange={(e) => setFormData({ ...formData, locationEn: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location (Arabic)</label>
                    <input
                      type="text"
                      placeholder="عمان (اختياري)"
                      value={formData.locationAr}
                      onChange={(e) => setFormData({ ...formData, locationAr: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
                    <input
                      type="text"
                      placeholder="King Abdullah Street, Amman, Jordan (optional)"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Media & Content */}
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-medium text-yellow-800 mb-4">🎨 Media & Content</h3>
                
                {/* Main Image */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Image</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Or enter image URL: Google Drive, direct link, etc."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMainImageUpload}
                        className="hidden"
                        id="main-image-upload"
                      />
                      <label
                        htmlFor="main-image-upload"
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors cursor-pointer text-sm"
                      >
                        📁 Upload Image
                      </label>
                      {mainImageFile && (
                        <span className="text-sm text-gray-600">
                          Selected: {mainImageFile.name}
                        </span>
                      )}
                    </div>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Video</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Or enter video URL: YouTube, direct link, etc."
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload"
                      />
                      <label
                        htmlFor="video-upload"
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors cursor-pointer text-sm"
                      >
                        🎥 Upload Video
                      </label>
                      {videoFile && (
                        <span className="text-sm text-gray-600">
                          Selected: {videoFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gallery Images */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gallery Images
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryUpload}
                        className="hidden"
                        id="gallery-upload"
                      />
                      <label
                        htmlFor="gallery-upload"
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors cursor-pointer text-sm"
                      >
                        📁 Upload Multiple Images
                      </label>
                      {galleryFiles.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {galleryFiles.length} files selected
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      Or enter URLs manually (comma-separated):
                    </div>
                    
                    {galleryInputs.map((val, idx) => (
                      <div key={idx} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          placeholder="url1.jpg, url2.jpg, Google Drive links, etc."
                          value={val}
                          onChange={(e) => {
                            const next = [...galleryInputs];
                            next[idx] = e.target.value;
                            setGalleryInputs(next);
                          }}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {galleryInputs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setGalleryInputs(galleryInputs.filter((_, i) => i !== idx))}
                            className="px-3 py-2 text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setGalleryInputs([...galleryInputs, ''])}
                      className="mt-1 text-purple-600 hover:text-purple-700 text-sm"
                    >
                      + Add more image URLs
                    </button>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (English)</label>
                    <textarea
                      placeholder="Description in English (optional)"
                      value={formData.descriptionEn}
                      onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                      rows="4"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Arabic)</label>
                    <textarea
                      placeholder="الوصف بالعربية (اختياري)"
                      value={formData.descriptionAr}
                      onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                      rows="4"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                <h3 className="text-lg font-medium text-indigo-800 mb-4">🌐 Contact & Social (All Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                    <input
                      type="text"
                      placeholder="https://partner-website.com"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instagram URL</label>
                    <input
                      type="text"
                      placeholder="https://instagram.com/partner"
                      value={formData.instagramUrl}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
                    <input
                      type="text"
                      placeholder="https://facebook.com/partner"
                      value={formData.facebookUrl}
                      onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions (English)</label>
                    <textarea
                      placeholder="Please follow safety guidelines... (optional)"
                      value={formData.termsConditionsEn}
                      onChange={(e) => setFormData({ ...formData, termsConditionsEn: e.target.value })}
                      rows="3"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions (Arabic)</label>
                    <textarea
                      placeholder="يرجى اتباع إرشادات السلامة... (اختياري)"
                      value={formData.termsConditionsAr}
                      onChange={(e) => setFormData({ ...formData, termsConditionsAr: e.target.value })}
                      rows="3"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Status Flags */}
              <div className="flex flex-wrap items-center space-x-6 mb-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Active</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">Featured</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPopular"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPopular" className="ml-2 block text-sm text-gray-900">Popular</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isNew"
                    checked={formData.isNew}
                    onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isNew" className="ml-2 block text-sm text-gray-900">New</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalVisible(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  {editingActivity ? 'Update Activity' : 'Add Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
              <button onClick={handleDeleteCancel} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{activityToDelete?.title}"? This action cannot be undone.
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

export default ActivitiesManagement;
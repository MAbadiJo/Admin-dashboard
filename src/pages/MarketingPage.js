import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const MarketingPage = () => {
  const [activeTab, setActiveTab] = useState('promo');
  const [promoCodes, setPromoCodes] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [pushNotifications, setPushNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [showAddNotification, setShowAddNotification] = useState(false);

  // Form states
  const [promoForm, setPromoForm] = useState({
    name: '',
    value: '',
    validFor: 'new_users',
    city: '',
    activity: '',
    user: '',
    validUntil: '',
  });

  const [voucherForm, setVoucherForm] = useState({
    name: '',
    value: '',
    validUntil: '',
  });

  const [notificationForm, setNotificationForm] = useState({
    titleAr: '',
    titleEn: '',
    messageAr: '',
    messageEn: '',
    targetLanguage: 'both',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load promo codes
      const { data: promoData } = await supabase
        .from('promo_code_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Load vouchers
      const { data: voucherData } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      // Load push notifications
      const { data: notificationData } = await supabase
        .from('push_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      setPromoCodes(promoData || []);
      setVouchers(voucherData || []);
      setPushNotifications(notificationData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addPromoCode = async () => {
    if (!promoForm.name || !promoForm.value) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('promo_code_logs')
        .insert([{
          promo_name: promoForm.name,
          value: parseFloat(promoForm.value),
          valid_for: promoForm.validFor,
          city: promoForm.city || null,
          activity_id: promoForm.activity || null,
          user_id: promoForm.user || null,
          valid_until: promoForm.validUntil || null,
        }]);

      if (error) {
        console.error('Error adding promo code:', error);
        alert('Failed to add promo code');
        return;
      }

      setShowAddPromo(false);
      setPromoForm({
        name: '',
        value: '',
        validFor: 'new_users',
        city: '',
        activity: '',
        user: '',
        validUntil: '',
      });
      loadData();
      alert('Promo code added successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const addVoucher = async () => {
    if (!voucherForm.name || !voucherForm.value) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vouchers')
        .insert([{
          name: voucherForm.name,
          value: parseFloat(voucherForm.value),
          valid_until: voucherForm.validUntil || null,
        }]);

      if (error) {
        console.error('Error adding voucher:', error);
        alert('Failed to add voucher');
        return;
      }

      setShowAddVoucher(false);
      setVoucherForm({
        name: '',
        value: '',
        validUntil: '',
      });
      loadData();
      alert('Voucher added successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const sendPushNotification = async () => {
    if (!notificationForm.titleEn || !notificationForm.messageEn) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('push_notifications')
        .insert([{
          title_en: notificationForm.titleEn,
          title_ar: notificationForm.titleAr,
          message_en: notificationForm.messageEn,
          message_ar: notificationForm.messageAr,
          target_audience: notificationForm.targetLanguage,
          sent_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('Error sending notification:', error);
        alert('Failed to send notification');
        return;
      }

      setShowAddNotification(false);
      setNotificationForm({
        titleAr: '',
        titleEn: '',
        messageAr: '',
        messageEn: '',
        targetLanguage: 'both',
      });
      loadData();
      alert('Notification sent successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong');
    }
  };

  const renderPromoCodes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Promo Codes</h3>
        <button
          onClick={() => setShowAddPromo(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Add Promo Code
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {promoCodes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎫</div>
            <p className="text-gray-600">No promo codes found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {promoCodes.map((promo) => (
              <div key={promo.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{promo.promo_name}</h4>
                    <p className="text-gray-600">Value: {promo.value} JOD</p>
                    <p className="text-gray-600">Valid for: {promo.valid_for}</p>
                    {promo.used_at && (
                      <p className="text-sm text-gray-500">Used: {new Date(promo.used_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderVouchers = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Vouchers</h3>
        <button
          onClick={() => setShowAddVoucher(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Add Voucher
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {vouchers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎁</div>
            <p className="text-gray-600">No vouchers found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vouchers.map((voucher) => (
              <div key={voucher.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{voucher.name}</h4>
                    <p className="text-gray-600">Value: {voucher.value} JOD</p>
                    {voucher.valid_until && (
                      <p className="text-gray-600">Valid until: {new Date(voucher.valid_until).toLocaleDateString()}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    voucher.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {voucher.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPushNotifications = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
        <button
          onClick={() => setShowAddNotification(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Send Notification
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {pushNotifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📱</div>
            <p className="text-gray-600">No notifications sent</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pushNotifications.map((notification) => (
              <div key={notification.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{notification.title_en}</h4>
                    <p className="text-gray-600">{notification.message_en}</p>
                    <p className="text-sm text-gray-500">Target: {notification.target_audience}</p>
                    {notification.sent_at && (
                      <p className="text-sm text-gray-500">Sent: {new Date(notification.sent_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Sent
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading marketing data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing Management</h1>
        <p className="text-gray-600">Manage promotions, vouchers, and push notifications</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'promo', name: 'Promo Codes', icon: '🎫' },
              { id: 'vouchers', name: 'Vouchers', icon: '🎁' },
              { id: 'notifications', name: 'Push Notifications', icon: '📱' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'promo' && renderPromoCodes()}
          {activeTab === 'vouchers' && renderVouchers()}
          {activeTab === 'notifications' && renderPushNotifications()}
        </div>
      </div>

      {/* Add Promo Code Modal */}
      {showAddPromo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add Promo Code</h2>
              <button
                onClick={() => setShowAddPromo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Promo Name *</label>
                <input
                  type="text"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({...promoForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value (JOD) *</label>
                <input
                  type="number"
                  value={promoForm.value}
                  onChange={(e) => setPromoForm({...promoForm, value: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid For</label>
                <select
                  value={promoForm.validFor}
                  onChange={(e) => setPromoForm({...promoForm, validFor: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="new_users">New Users</option>
                  <option value="all_users">All Users</option>
                  <option value="specific_city">Specific City</option>
                  <option value="specific_activity">Specific Activity</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                <input
                  type="date"
                  value={promoForm.validUntil}
                  onChange={(e) => setPromoForm({...promoForm, validUntil: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddPromo(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addPromoCode}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Add Promo Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Voucher Modal */}
      {showAddVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add Voucher</h2>
              <button
                onClick={() => setShowAddVoucher(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Name *</label>
                <input
                  type="text"
                  value={voucherForm.name}
                  onChange={(e) => setVoucherForm({...voucherForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value (JOD) *</label>
                <input
                  type="number"
                  value={voucherForm.value}
                  onChange={(e) => setVoucherForm({...voucherForm, value: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                <input
                  type="date"
                  value={voucherForm.validUntil}
                  onChange={(e) => setVoucherForm({...voucherForm, validUntil: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddVoucher(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addVoucher}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Add Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showAddNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Send Push Notification</h2>
              <button
                onClick={() => setShowAddNotification(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title (English) *</label>
                <input
                  type="text"
                  value={notificationForm.titleEn}
                  onChange={(e) => setNotificationForm({...notificationForm, titleEn: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title (Arabic)</label>
                <input
                  type="text"
                  value={notificationForm.titleAr}
                  onChange={(e) => setNotificationForm({...notificationForm, titleAr: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Message (English) *</label>
                <textarea
                  value={notificationForm.messageEn}
                  onChange={(e) => setNotificationForm({...notificationForm, messageEn: e.target.value})}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Message (Arabic)</label>
                <textarea
                  value={notificationForm.messageAr}
                  onChange={(e) => setNotificationForm({...notificationForm, messageAr: e.target.value})}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Language</label>
                <select
                  value={notificationForm.targetLanguage}
                  onChange={(e) => setNotificationForm({...notificationForm, targetLanguage: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="both">Both Languages</option>
                  <option value="english">English Only</option>
                  <option value="arabic">Arabic Only</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddNotification(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendPushNotification}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingPage;
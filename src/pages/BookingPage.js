import { createClient } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useState } from 'react';

// Create Supabase client with hardcoded values to bypass environment variable issues
const SUPABASE_URL = 'https://rtjegrjmnuivkivdgwjk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0amVncmptbnVpdmtpdmRnd2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNzksImV4cCI6MjA2ODAwMzE3OX0.qvg1CsyFehM5g0Jx8-9P6mlhRPu8qalwzxUiQFb66UE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window?.localStorage,
    storageKey: 'supabase.auth.token'
  }
});

/* =========================
   Utilities
   ========================= */

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '--');
const fmtDateShort = (d) => (d ? new Date(d).toLocaleDateString() + ' at ' + new Date(d).toLocaleTimeString() : '--');

function clsx(...xs) {
  return xs.filter(Boolean).join(' ');
}

/* =========================
   Confirm Dialog Hook
   ========================= */

function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    resolve: null,
  });

  const confirm = ({ title = 'Please confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel' } = {}) =>
    new Promise((resolve) => {
      setState({ open: true, title, message, confirmText, cancelText, resolve });
    });

  const ConfirmDialog = () =>
    state.open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-in zoom-in-95 duration-200">
          <div className="px-6 pt-6">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center">{state.title}</h3>
            <p className="text-gray-600 mt-2 text-center">{state.message}</p>
          </div>
          <div className="px-6 pb-6 pt-6 flex justify-end gap-3">
            <button
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200 hover:shadow-sm"
              onClick={() => {
                if (state.resolve) state.resolve(false);
                setState((s) => ({ ...s, open: false }));
              }}
            >
              {state.cancelText}
            </button>
            <button
              className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all duration-200 hover:shadow-lg transform hover:scale-105"
              onClick={() => {
                if (state.resolve) state.resolve(true);
                setState((s) => ({ ...s, open: false }));
              }}
            >
              {state.confirmText}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return { confirm, ConfirmDialog };
}

/* =========================
   Centralized action logger
   ========================= */

async function logBookingAction({ actorId, actorName, actorType, bookingId, action, note }) {
  const { error } = await supabase.from('admin_action_logs').insert([
    {
      actor_id: actorId || null,
      actor_name: actorName || null,
      target_user_id: null,
      action,
      note: note || null,
      booking_id: bookingId || null,
      actor_type: actorType || 'admin',
    },
  ]);
  if (error) console.error('logBookingAction error:', error);
}

/* =========================
   Transfer Ticket Modal
   ========================= */

const TransferTicketModal = ({ open, onClose, onTransfer, booking }) => {
  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userId, setUserId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setMode('email');
      setEmail('');
      setPhone('');
      setUserId('');
      setNote('');
    }
  }, [open]);

  if (!open || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Transfer Ticket</h3>
              <p className="text-gray-600 mt-1">Booking #{booking.booking_number}</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">Transfer Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'email', label: 'Email', icon: '✉️' },
                  { value: 'phone', label: 'Phone', icon: '📱' },
                  { value: 'user_id', label: 'User ID', icon: '🆔' }
                ].map((option) => (
                  <button
                    key={option.value}
                    className={clsx(
                      'p-3 rounded-xl border-2 text-center transition-all duration-200 transform hover:scale-105',
                      mode === option.value 
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-600 shadow-lg' 
                        : 'hover:bg-gray-50 border-gray-200 text-gray-700'
                    )}
                    onClick={() => setMode(option.value)}
                  >
                    <div className="text-lg mb-1">{option.icon}</div>
                    <div className="text-xs font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {mode === 'email' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Recipient Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="user@example.com"
                />
              </div>
            )}

            {mode === 'phone' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Recipient Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="+962700000000"
                />
              </div>
            )}

            {mode === 'user_id' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Recipient User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="UUID"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Transfer Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none"
                placeholder="Reason for transfer..."
              />
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button 
              onClick={onClose} 
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => onTransfer({ mode, email, phone, userId, note })}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-105"
            >
              Transfer Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Extend Expiry Modal
   ========================= */

const ExtendExpiryModal = ({ open, onClose, onExtend, booking }) => {
  const [expiry, setExpiry] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setExpiry('');
      setNote('');
    }
  }, [open]);

  if (!open || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-gray-900">Extend Ticket Expiry</h4>
              <p className="text-gray-600">Booking #{booking.booking_number}</p>
            </div>
            <button 
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-all" 
              onClick={onClose}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">New Expiry Date & Time</label>
              <input
                type="datetime-local"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Extension Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                placeholder="Reason for extension..."
              />
            </div>
            
            <div className="flex gap-4">
              <button 
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                onClick={() => {
                  onExtend(expiry, note);
                  onClose();
                }}
              >
                Extend Expiry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Booking Action History
   ========================= */

const BookingActionHistory = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="mt-6 p-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No actions recorded for this booking</p>
          <p className="text-gray-500 text-sm mt-1">Activity history will appear here once actions are performed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        Action History
      </h4>
      
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-bold text-gray-800 text-sm uppercase tracking-wide">Action</th>
                <th className="text-left px-6 py-4 font-bold text-gray-800 text-sm uppercase tracking-wide">Time</th>
                <th className="text-left px-6 py-4 font-bold text-gray-800 text-sm uppercase tracking-wide">Performed By</th>
                <th className="text-left px-6 py-4 font-bold text-gray-800 text-sm uppercase tracking-wide">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log, index) => (
                <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border border-indigo-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">{fmtDateShort(log.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {log.actor_name || log.actor_id || 'Unknown'}
                      </span>
                      {log.actor_type && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                          {log.actor_type}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{log.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Main Booking Page
   ========================= */

const BookingPage = ({ currentAdmin }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [transferModalBooking, setTransferModalBooking] = useState(null);
  const [extendExpiryBooking, setExtendExpiryBooking] = useState(null);
  const [actionLogs, setActionLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isPageActive, setIsPageActive] = useState(true);

  const { confirm, ConfirmDialog } = useConfirm();

  const ticketStatusOptions = ['active', 'expired', 'used', 'cancelled'];

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading bookings...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('⚠️ No active session, but continuing with anonymous access');
      }
      
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        
        if (searchType === 'phone') {
          query = query.ilike('customer_phone', `%${queryLower}%`);
        } else if (searchType === 'email') {
          query = query.ilike('customer_email', `%${queryLower}%`);
        } else if (searchType === 'booking_id') {
          query = query.ilike('booking_number', `%${queryLower}%`);
        } else {
          query = query.or(`
            customer_phone.ilike.%${queryLower}%,
            customer_email.ilike.%${queryLower}%,
            customer_name.ilike.%${queryLower}%,
            booking_number.ilike.%${queryLower}%
          `);
        }
      }

      const { data, error } = await query;
      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} bookings`);
      setBookings(data || []);
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType]);

  const loadBookingLogs = useCallback(async (bookingId) => {
    try {
      setLogsLoading(true);
      const { data, error } = await supabase
        .from('admin_action_logs')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActionLogs(data || []);
    } catch (error) {
      console.error('Error loading booking logs:', error);
      setActionLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPageActive(false);
      } else {
        setIsPageActive(true);
        loadBookings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const checkSessionAndLoad = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ Existing session found:', session.user.email);
        } else {
          console.log('ℹ️ No existing session found');
        }
        await loadBookings();
      } catch (error) {
        console.error('Session check error:', error);
        await loadBookings();
      }
    };
    
    checkSessionAndLoad();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadBookings]);

  useEffect(() => {
    const handleFocus = () => {
      setIsPageActive(true);
      loadBookings();
    };

    const handleBlur = () => {
      setIsPageActive(false);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setIsPageActive(true);
        if (showBookingDetails) {
          setShowBookingDetails(false);
          setSelectedBooking(null);
        }
        if (transferModalBooking) {
          setTransferModalBooking(null);
        }
        if (extendExpiryBooking) {
          setExtendExpiryBooking(null);
        }
        loadBookings();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showBookingDetails) {
          setShowBookingDetails(false);
          setSelectedBooking(null);
        }
        if (transferModalBooking) {
          setTransferModalBooking(null);
        }
        if (extendExpiryBooking) {
          setExtendExpiryBooking(null);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadBookings, showBookingDetails, transferModalBooking, extendExpiryBooking]);

  const openBookingDetails = async (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
    await loadBookingLogs(booking.id);
  };

  /* ========= Booking Actions ========= */

  const handleRefundToWallet = async (booking) => {
    const ok = await confirm({
      title: 'Refund to Wallet',
      message: `Refund ${booking.total_amount} JOD to ${booking.customer_name}'s wallet for booking ${booking.booking_number}?`,
      confirmText: 'Refund to Wallet',
    });
    if (!ok) return;

    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          ticket_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentAdmin?.id || null,
          refunded_amount: toNumber(booking.total_amount || 0),
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      const refundAmount = toNumber(booking.total_amount || 0);
      if (refundAmount > 0) {
        const { data: wallet, error: walletError } = await supabase
          .from('user_wallets')
          .select('*')
          .eq('user_id', booking.user_id)
          .single();

        if (walletError && !walletError.message.includes('No rows found')) throw walletError;

        const prevBalance = toNumber(wallet?.balance || 0);
        const newBalance = prevBalance + refundAmount;

        const { error: transactionError } = await supabase.from('wallet_transactions').insert([
          {
            user_id: booking.user_id,
            amount: refundAmount,
            transaction_type: 'refund',
            description: `Refund for booking ${booking.booking_number}`,
          },
        ]);

        if (transactionError) throw transactionError;

        if (wallet) {
          const { error: updateError } = await supabase
            .from('user_wallets')
            .update({
              balance: newBalance,
              total_earned: toNumber(wallet.total_earned || 0) + refundAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', booking.user_id);

          if (updateError) throw updateError;
        } else {
          const { error: createError } = await supabase
            .from('user_wallets')
            .insert({
              user_id: booking.user_id,
              balance: refundAmount,
              total_earned: refundAmount,
              total_spent: 0,
              is_active: true,
            });

          if (createError) throw createError;
        }
      }

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'refund_to_wallet',
        note: `Refunded ${booking.total_amount} JOD to wallet`,
      });

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        await loadBookingLogs(booking.id);
      }
      alert('Ticket refunded to wallet successfully!');
    } catch (error) {
      console.error('Error refunding ticket:', error);
      alert('Failed to refund ticket');
    }
  };

  const handleCancelWithoutRefund = async (booking) => {
    const ok = await confirm({
      title: 'Cancel Without Refund',
      message: `Cancel booking ${booking.booking_number} without refund? This action cannot be undone.`,
      confirmText: 'Cancel Without Refund',
    });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          ticket_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentAdmin?.id || null,
          refunded_amount: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'cancel_without_refund',
        note: 'Cancelled without refund',
      });

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        await loadBookingLogs(booking.id);
      }
      alert('Ticket cancelled without refund');
    } catch (error) {
      console.error('Error cancelling ticket:', error);
      alert('Failed to cancel ticket');
    }
  };

  const handleTransferTicket = async ({ mode, email, phone, userId, note }) => {
    const booking = transferModalBooking;
    if (!booking) return;

    if (booking.ticket_status === 'cancelled' || booking.is_used) {
      alert('Only active/unused tickets can be transferred.');
      return;
    }

    try {
      let targetUserId = userId?.trim();
      
      if (mode === 'email') {
        const targetEmail = (email || '').trim().toLowerCase();
        if (!targetEmail) {
          alert('Please enter a recipient email.');
          return;
        }
        const { data: targetProfile, error: pErr } = await supabase
          .from('profiles')
          .select('id, email, name')
          .eq('email', targetEmail)
          .single();
        if (pErr || !targetProfile?.id) {
          alert('Recipient not found by email.');
          return;
        }
        targetUserId = targetProfile.id;
      } else if (mode === 'phone') {
        const targetPhone = (phone || '').trim();
        if (!targetPhone) {
          alert('Please enter a recipient phone number.');
          return;
        }
        const { data: targetProfile, error: pErr } = await supabase
          .from('profiles')
          .select('id, phone, name')
          .eq('phone', targetPhone)
          .single();
        if (pErr || !targetProfile?.id) {
          alert('Recipient not found by phone number.');
          return;
        }
        targetUserId = targetProfile.id;
      } else {
        if (!targetUserId) {
          alert('Please enter a valid recipient user ID.');
          return;
        }
        const { data: targetProfile, error: vErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', targetUserId)
          .single();
        if (vErr || !targetProfile?.id) {
          alert('Recipient user ID not found.');
          return;
        }
      }

      if (targetUserId === booking.user_id) {
        alert('Ticket is already owned by this user.');
        return;
      }

      const { error: updErr } = await supabase
        .from('bookings')
        .update({
          user_id: targetUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (updErr) throw updErr;

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'transfer_ticket',
        note: note || `Transferred to user ${targetUserId}`,
      });

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        await loadBookingLogs(booking.id);
      }
      setTransferModalBooking(null);
      alert('Ticket transferred successfully.');
    } catch (error) {
      console.error('Error transferring ticket:', error);
      alert('Failed to transfer ticket');
    }
  };

  const handleDeleteTicket = async (booking) => {
    const ok = await confirm({
      title: 'Delete Ticket',
      message: `Permanently delete booking ${booking.booking_number}? This action cannot be undone and will remove all associated data.`,
      confirmText: 'Delete Permanently',
    });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (error) throw error;

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'delete_ticket',
        note: 'Ticket permanently deleted',
      });

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        setShowBookingDetails(false);
        setSelectedBooking(null);
      }
      alert('Ticket deleted permanently');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    }
  };

  const handleExtendExpiry = async (booking, newExpiry, note) => {
    if (!newExpiry) {
      alert('Please select a new expiry date/time');
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          expiry_date: new Date(newExpiry).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'extend_expiry',
        note: note || `Extended expiry to ${new Date(newExpiry).toLocaleString()}`,
      });

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        await loadBookingLogs(booking.id);
      }
      alert('Ticket expiry extended successfully');
    } catch (error) {
      console.error('Error extending expiry:', error);
      alert('Failed to extend expiry');
    }
  };

  const handleStatusChange = async (booking, newStatus) => {
    try {
      const patch = {
        ticket_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'used' && !booking.used_at) {
        patch.used_at = new Date().toISOString();
        patch.is_used = true;
        patch.used_by = currentAdmin?.name || 'Admin';
      } else if (newStatus !== 'used') {
        patch.is_used = newStatus === 'used';
      }

      const { error } = await supabase
        .from('bookings')
        .update(patch)
        .eq('id', booking.id);

      if (error) throw error;

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'status_change',
        note: `Status changed from ${booking.ticket_status || 'active'} to ${newStatus}`,
      });

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        await loadBookingLogs(booking.id);
      }
      alert('Ticket status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDownloadPDF = async (booking) => {
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(booking.qr_code || booking.booking_number)}`;
      
      let activityImageUrl = '';
      let activityTitle = '';
      let activityDescription = '';
      let activityTermsEn = '';
      let activityTermsAr = '';
      let googleMapsLink = '';
       
      if (booking.activity_id) {
        try {
          const { data: activity } = await supabase
            .from('activities')
            .select('image_url, images, gallery_images, title, title_ar, name, description, description_ar, terms, terms_ar, terms_conditions, terms_conditions_ar, google_map_link, latitude, longitude')
            .eq('id', booking.activity_id)
            .single();
           
          if (activity) {
            if (activity.images && activity.images.length > 0) {
              const imagePath = activity.images[0];
              activityImageUrl = imagePath.startsWith('http') 
                ? imagePath 
                : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/${imagePath}`;
            } 
            else if (activity.gallery_images && activity.gallery_images.length > 0) {
              const imagePath = activity.gallery_images[0];
              activityImageUrl = imagePath.startsWith('http') 
                ? imagePath 
                : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/${imagePath}`;
            } 
            else if (activity.image_url) {
              const imagePath = activity.image_url;
              activityImageUrl = imagePath.startsWith('http') 
                ? imagePath 
                : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/${imagePath}`;
            }
             
            googleMapsLink = activity.google_map_link || 
              (activity.latitude && activity.longitude ? 
                `https://www.google.com/maps?q=${activity.latitude},${activity.longitude}` : 
                '');
             
            activityTitle = activity.title || activity.title_ar || activity.name || booking.ticket_type;
            activityDescription = activity.description || activity.description_ar || '';
             
            activityTermsEn = activity.terms || activity.terms_conditions || '';
            activityTermsAr = activity.terms_ar || activity.terms_conditions_ar || '';
          }
        } catch (error) {
          console.log('Could not fetch activity details:', error);
        }
      }
      
      const appLogoUrl = 'https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/basmahjoapplogo.png';
      
      const hasActivityTerms = activityTermsEn || activityTermsAr;
      
      console.log('🎫 Generating PDF for booking:', booking.booking_number);
       
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
       
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket - ${booking.booking_number}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .ticket-container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.15);
              max-width: 650px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
            }
            .header { 
              text-align: center; 
              border-bottom: 4px solid #667eea; 
              padding-bottom: 25px; 
              margin-bottom: 35px; 
            }
            .app-logo {
              width: 90px;
              height: 90px;
              border-radius: 50%;
              border: 4px solid #667eea;
              margin: 0 auto 20px auto;
              display: block;
              object-fit: cover;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            .header h1 {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin: 0;
              font-size: 32px;
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .header h2 {
              color: #374151;
              margin: 15px 0 0 0;
              font-size: 22px;
              font-weight: 600;
            }
            .activity-section {
              display: flex;
              align-items: center;
              margin-bottom: 30px;
              padding: 25px;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-radius: 20px;
              border: 2px solid #667eea;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
            }
            .activity-image {
              width: 110px;
              height: 110px;
              object-fit: cover;
              border-radius: 16px;
              margin-right: 25px;
              border: 3px solid #667eea;
              box-shadow: 0 6px 16px rgba(0,0,0,0.15);
            }
            .activity-info {
              flex: 1;
            }
            .activity-info h3 {
              margin: 0 0 10px 0;
              color: #1f2937;
              font-size: 20px;
              font-weight: 700;
            }
            .activity-info p {
              margin: 0 0 8px 0;
              color: #6b7280;
              font-size: 15px;
              line-height: 1.5;
              font-weight: 500;
            }
            .activity-description {
              color: #9ca3af;
              font-size: 13px;
              font-style: italic;
              margin-top: 10px;
              line-height: 1.4;
            }
            .ticket-info { 
              margin-bottom: 30px; 
              background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
              padding: 25px;
              border-radius: 16px;
              border: 1px solid #e5e7eb;
            }
            .row { 
              display: flex; 
              justify-content: space-between; 
              align-items: center;
              margin: 12px 0; 
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .row:last-child {
              border-bottom: none;
              margin-bottom: 0;
            }
            .label { 
              font-weight: 600; 
              color: #667eea;
              min-width: 140px;
              font-size: 14px;
            }
            .value {
              color: #374151;
              text-align: right;
              font-weight: 500;
              font-size: 14px;
            }
            .qr-section { 
              text-align: center; 
              margin: 35px 0; 
              padding: 25px;
              background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
              border-radius: 16px;
              border: 1px solid #e5e7eb;
            }
            .qr-code {
              margin: 20px 0;
              padding: 20px;
              background: white;
              border-radius: 12px;
              display: inline-block;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .qr-code img {
              border: 2px solid #667eea;
              border-radius: 8px;
            }
            .qr-text {
              font-family: 'Courier New', monospace; 
              font-size: 18px; 
              margin: 15px 0;
              color: #374151;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .footer { 
              margin-top: 35px; 
              text-align: center; 
              font-size: 13px; 
              color: #6b7280;
              border-top: 2px solid #e5e7eb;
              padding-top: 25px;
            }
            .terms-section {
              margin: 30px 0;
              padding: 25px;
              background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
              border-radius: 16px;
              border-left: 5px solid #667eea;
            }
            .terms-title {
              font-size: 18px;
              font-weight: 700;
              color: #667eea;
              margin-bottom: 20px;
              text-align: center;
            }
            .terms-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .terms-list li {
              margin-bottom: 10px;
              padding-left: 25px;
              position: relative;
              font-size: 13px;
              line-height: 1.5;
              color: #374151;
            }
            .terms-list li:before {
              content: "•";
              color: #667eea;
              font-weight: bold;
              font-size: 16px;
              position: absolute;
              left: 0;
            }
            .activity-terms {
              margin-top: 20px;
              padding: 20px;
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
              border-radius: 12px;
              border-left: 4px solid #3b82f6;
            }
            .activity-terms h4 {
              font-size: 16px;
              font-weight: 700;
              color: #1d4ed8;
              margin: 0 0 12px 0;
            }
            .activity-terms p {
              font-size: 12px;
              line-height: 1.4;
              color: #374151;
              margin: 0;
            }
            .status-badge {
              display: inline-flex;
              align-items: center;
              padding: 6px 14px;
              border-radius: 50px;
              font-size: 12px;
              font-weight: 700;
              margin-left: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .status-active { 
              background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
              color: #065f46; 
              border: 1px solid #10b981;
            }
            .status-used { 
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); 
              color: #1e3a8a; 
              border: 1px solid #3b82f6;
            }
            .status-expired { 
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
              color: #92400e; 
              border: 1px solid #f59e0b;
            }
            .status-cancelled { 
              background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); 
              color: #991b1b; 
              border: 1px solid #ef4444;
            }
            .payment-paid { 
              background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
              color: #065f46; 
              border: 1px solid #10b981;
            }
            .payment-pending { 
              background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); 
              color: #991b1b; 
              border: 1px solid #ef4444;
            }
            @media print { 
              body { 
                margin: 0; 
                background: white;
              }
              .ticket-container {
                box-shadow: none;
                border: 2px solid #374151;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <div class="header">
              <img src="${appLogoUrl}" alt="Basmah Jo Logo" class="app-logo" onerror="this.style.display='none';">
              <h1>🎫 BASMAH JO TICKET</h1>
              <h2>Booking #${booking.booking_number}</h2>
            </div>
            
            <div class="activity-section">
              ${activityImageUrl ? `<img src="${activityImageUrl}" alt="Activity" class="activity-image" onerror="this.style.display='none';">` : ''}
              <div class="activity-info">
                <h3>${activityTitle}</h3>
                <p><strong>Ticket Type:</strong> ${booking.ticket_type}</p>
                <p><strong>Activity ID:</strong> ${booking.activity_id || 'N/A'}</p>
                ${activityDescription ? `<p class="activity-description">${activityDescription}</p>` : ''}
                ${googleMapsLink ? `<p><strong>Location:</strong> <a href="${googleMapsLink}" target="_blank" style="color: #667eea; text-decoration: underline;">View on Google Maps</a></p>` : ''}
              </div>
            </div>
            
            <div class="ticket-info">
              <div class="row">
                <span class="label">Customer:</span>
                <span class="value">${booking.customer_name || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Email:</span>
                <span class="value">${booking.customer_email || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Phone:</span>
                <span class="value">${booking.customer_phone || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Quantity:</span>
                <span class="value">${booking.quantity}</span>
              </div>
              <div class="row">
                <span class="label">Unit Price:</span>
                <span class="value">${booking.unit_price} JOD</span>
              </div>
              <div class="row">
                <span class="label">Subtotal:</span>
                <span class="value">${booking.subtotal} JOD</span>
              </div>
              <div class="row">
                <span class="label">Taxes:</span>
                <span class="value">${booking.taxes} JOD</span>
              </div>
              <div class="row">
                <span class="label">Discount:</span>
                <span class="value">${booking.discount || 0} JOD</span>
              </div>
              <div class="row">
                <span class="label">Total Amount:</span>
                <span class="value"><strong>${booking.total_amount} JOD</strong></span>
              </div>
              <div class="row">
                <span class="label">Booking Date:</span>
                <span class="value">${new Date(booking.booking_date).toLocaleDateString()}</span>
              </div>
              <div class="row">
                <span class="label">Scheduled Date:</span>
                <span class="value">${booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Status:</span>
                <span class="value">
                  ${booking.ticket_status || 'active'}
                  <span class="status-badge status-${booking.ticket_status || 'active'}">${(booking.ticket_status || 'active').toUpperCase()}</span>
                </span>
              </div>
              <div class="row">
                <span class="label">Payment Status:</span>
                <span class="value">
                  ${booking.payment_status || 'pending'}
                  <span class="status-badge payment-${booking.payment_status || 'pending'}">${(booking.payment_status || 'pending').toUpperCase()}</span>
                </span>
              </div>
            </div>
            
            ${booking.ticket_status === 'used' ? `
            <div class="qr-section" style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); border: 2px solid #dc3545;">
              <h3 style="color: #991b1b; font-weight: 700;">Ticket Used</h3>
              <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 60px; color: #dc3545; margin-bottom: 20px;">✓</div>
                <div style="font-size: 28px; font-weight: 800; color: #991b1b; margin-bottom: 15px;">TICKET USED</div>
                <div style="font-size: 16px; color: #991b1b; font-weight: 500;">
                  This ticket has been used and is no longer valid for entry
                </div>
                ${booking.used_at ? `<div style="font-size: 14px; color: #991b1b; margin-top: 15px; font-weight: 500;">
                  Used on: ${new Date(booking.used_at).toLocaleString()}
                </div>` : ''}
                ${booking.used_by ? `<div style="font-size: 14px; color: #991b1b;">
                  Used by: ${booking.used_by}
                </div>` : ''}
              </div>
            </div>
            ` : `
            <div class="qr-section">
              <h3 style="font-size: 20px; font-weight: 700; color: #374151; margin-bottom: 5px;">QR Code for Entry</h3>
              <div class="qr-code">
                <img src="${qrCodeUrl}" alt="QR Code" width="200" height="200">
              </div>
              <div class="qr-text">${booking.qr_code || 'QR-' + booking.booking_number}</div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 15px; font-weight: 500;">
                Scan this QR code at the venue for entry
              </p>
            </div>
            `}
             
            ${hasActivityTerms ? `
            <div class="terms-section">
              <div class="terms-title">Terms & Conditions</div>
              ${activityTermsEn ? `
              <div class="activity-terms">
                <h4>Activity Terms:</h4>
                <p>${activityTermsEn}</p>
              </div>
              ` : ''}
            </div>
            
            ${activityTermsAr ? `
            <div class="terms-section" style="direction: rtl; text-align: right;">
              <div class="terms-title">الشروط والأحكام</div>
              <div class="activity-terms">
                <h4>شروط النشاط:</h4>
                <p>${activityTermsAr}</p>
              </div>
            </div>
            ` : ''}
            ` : ''}
             
            <div class="footer">
              <p style="font-weight: 600; font-size: 14px;"><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
              <p style="font-weight: 700; font-size: 15px; margin-top: 8px;"><strong>Basmah Jo - Activity Booking System</strong></p>
              <p style="font-size: 11px; color: #9ca3af; margin-top: 8px;">
                This ticket is valid for the specified activity and date only.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 2000);
      };
      
      logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'download_pdf',
        note: 'Enhanced PDF with activity image and app logo generated and downloaded',
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate ticket PDF. Please try again.');
    }
  };

  const handlePageClick = () => {
    if (!isPageActive) {
      setIsPageActive(true);
      loadBookings();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" onClick={handlePageClick}>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center transform rotate-3 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                  Booking Management
                </h1>
                <p className="text-lg text-gray-600 font-medium">
                  Complete control over bookings with real-time insights and powerful actions
                </p>
              </div>
            </div>
            {!isPageActive && (
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-yellow-900 font-semibold">
                    ⚠️ Page is not active. Click anywhere to refresh data.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadBookings();
              }}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
          <div className="flex gap-6 flex-col lg:flex-row">
            <div className="flex-1">
              <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Bookings
              </label>
              <div className="flex gap-4 flex-col sm:flex-row">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="border-2 border-gray-300 rounded-2xl px-6 py-4 text-gray-700 font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white shadow-sm"
                >
                  <option value="all">🔍 All Fields</option>
                  <option value="phone">📱 Phone Number</option>
                  <option value="email">✉️ Email Address</option>
                  <option value="booking_id">🎫 Booking ID</option>
                </select>
                <input
                  type="text"
                  placeholder={`Search by ${searchType === 'all' ? 'any field' : searchType}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-2 border-gray-300 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium shadow-sm bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
                </div>
                <div className="mt-6 text-xl font-semibold text-gray-700">Loading bookings...</div>
                <div className="text-gray-500">Please wait while we fetch the latest data</div>
              </div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">No bookings found</h3>
              <p className="text-lg text-gray-500 mb-8">Try adjusting your search criteria or check back later</p>
              <button
                onClick={loadBookings}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Refresh Search
              </button>
            </div>
          ) : (
            bookings.map((booking) => {
              const customerName = booking.customer_name || '—';
              const customerEmail = booking.customer_email || '—';
              const customerPhone = booking.customer_phone || '—';

              return (
                <div key={booking.id} className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 flex-wrap mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                          #{booking.booking_number}
                        </h3>
                        <div className="flex gap-2">
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                            booking.ticket_status === 'active' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300' :
                            booking.ticket_status === 'used' ? 'bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800 border border-blue-300' :
                            booking.ticket_status === 'expired' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300' :
                            'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300'
                          }`}>
                            {(booking.ticket_status || 'active').toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                            booking.payment_status === 'paid' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300' :
                            'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300'
                          }`}>
                            {(booking.payment_status || 'pending').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span className="text-lg font-semibold text-gray-900">Activity ID: {booking.activity_id || '—'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-gray-600 font-medium">Partner ID: {booking.partner_id || '—'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-gray-600 font-medium">User ID: {booking.user_id || '—'}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <span className="text-lg font-semibold text-gray-900">{customerName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-sky-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-gray-600 font-medium">{customerEmail}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <span className="text-gray-600 font-medium">{customerPhone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border">
                        <div className="text-center">
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Ticket Type</div>
                          <div className="text-lg font-bold text-gray-900">{booking.ticket_type}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Quantity</div>
                          <div className="text-lg font-bold text-gray-900">{booking.quantity}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Amount</div>
                          <div className="text-lg font-bold text-indigo-600">{booking.total_amount} JOD</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Booking Date</div>
                          <div className="text-lg font-bold text-gray-900">{fmtDateShort(booking.booking_date)}</div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-xl p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div><span className="font-semibold">Created:</span> {fmtDateShort(booking.created_at)}</div>
                          <div><span className="font-semibold">Expiry:</span> {fmtDateShort(booking.expiry_date)}</div>
                          {booking.is_used && (
                            <>
                              <div><span className="font-semibold">Used:</span> {fmtDateShort(booking.used_at)}</div>
                              <div><span className="font-semibold">Used by:</span> {booking.used_by || 'system'}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => openBookingDetails(booking)}
                        className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Booking Details Modal */}
        {showBookingDetails && selectedBooking && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowBookingDetails(false);
                setSelectedBooking(null);
              }
            }}
          >
            <div className="min-h-full flex items-start justify-center p-6">
              <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-7xl transform animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center transform rotate-3 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                        Booking Details
                      </h2>
                      <div className="text-xl font-semibold text-gray-700">#{selectedBooking.booking_number}</div>
                      <div className="text-sm text-gray-500 mt-1">ID: {selectedBooking.id}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowBookingDetails(false);
                      setSelectedBooking(null);
                    }} 
                    className="text-gray-400 hover:text-gray-600 p-3 rounded-full hover:bg-gray-100 transition-all duration-200"
                    title="Close (ESC)"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                  {/* Booking Information */}
                  <div className="xl:col-span-3 space-y-8">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        Booking Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Activity ID:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.activity_id || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Partner ID:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.partner_id || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">User ID:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.user_id || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Ticket Type:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.ticket_type}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Quantity:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.quantity}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Customer:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.customer_name || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Email:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.customer_email || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Phone:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.customer_phone || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Booking Date:</span>
                            <span className="font-bold text-gray-900">{fmtDateShort(selectedBooking.booking_date)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Scheduled Date:</span>
                            <span className="font-bold text-gray-900">{fmtDateShort(selectedBooking.scheduled_date)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        Payment & Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Unit Price:</span>
                            <span className="font-bold text-green-600">{selectedBooking.unit_price} JOD</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Subtotal:</span>
                            <span className="font-bold text-green-600">{selectedBooking.subtotal} JOD</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Taxes:</span>
                            <span className="font-bold text-green-600">{selectedBooking.taxes} JOD</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Discount:</span>
                            <span className="font-bold text-green-600">{selectedBooking.discount || 0} JOD</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border shadow-md">
                            <span className="font-bold text-gray-800">Total Amount:</span>
                            <span className="font-black text-green-700 text-lg">{selectedBooking.total_amount} JOD</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Payment Status:</span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                              selectedBooking.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {(selectedBooking.payment_status || 'pending').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Payment Method:</span>
                            <span className="font-bold text-gray-900">{selectedBooking.payment_method || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Ticket Status:</span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                              selectedBooking.ticket_status === 'active' ? 'bg-green-100 text-green-800' :
                              selectedBooking.ticket_status === 'used' ? 'bg-blue-100 text-blue-800' :
                              selectedBooking.ticket_status === 'expired' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {(selectedBooking.ticket_status || 'active').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border">
                            <span className="font-semibold text-gray-700">Expiry Date:</span>
                            <span className="font-bold text-gray-900">{fmtDateShort(selectedBooking.expiry_date)}</span>
                          </div>
                          {selectedBooking.is_used && (
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                              <span className="font-semibold text-blue-700">Used At:</span>
                              <div className="text-right">
                                <div className="font-bold text-blue-900">{fmtDateShort(selectedBooking.used_at)}</div>
                                <div className="text-sm text-blue-600">by {selectedBooking.used_by || 'system'}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action History */}
                    <BookingActionHistory logs={actionLogs} />
                  </div>

                  {/* Actions Panel */}
                  <div className="xl:col-span-1">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6 sticky top-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                        </div>
                        Actions
                      </h3>
                      <div className="space-y-4">
                        <button
                          onClick={() => handleDownloadPDF(selectedBooking)}
                          className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl hover:from-green-600 hover:to-green-700 font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download PDF
                        </button>

                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-3">Change Ticket Status</label>
                          <select
                            value={selectedBooking.ticket_status || 'active'}
                            onChange={(e) => handleStatusChange(selectedBooking, e.target.value)}
                            className="w-full border-2 border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-semibold bg-white"
                          >
                            {ticketStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => setExtendExpiryBooking(selectedBooking)}
                          className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Extend Expiry
                        </button>

                        <button
                          onClick={() => setTransferModalBooking(selectedBooking)}
                          className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl hover:from-purple-600 hover:to-purple-700 font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Transfer Ticket
                        </button>

                        <button
                          onClick={() => handleRefundToWallet(selectedBooking)}
                          className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl hover:from-orange-600 hover:to-orange-700 font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Refund to Wallet
                        </button>

                        <button
                          onClick={() => handleCancelWithoutRefund(selectedBooking)}
                          className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Cancel (No Refund)
                        </button>

                        <button
                          onClick={() => handleDeleteTicket(selectedBooking)}
                          className="w-full px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl hover:from-gray-900 hover:to-black font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        <TransferTicketModal
          open={!!transferModalBooking}
          booking={transferModalBooking}
          onClose={() => setTransferModalBooking(null)}
          onTransfer={handleTransferTicket}
        />

        {/* Extend Expiry Modal */}
        <ExtendExpiryModal
          open={!!extendExpiryBooking}
          booking={extendExpiryBooking}
          onClose={() => setExtendExpiryBooking(null)}
          onExtend={(newExpiry, note) => handleExtendExpiry(extendExpiryBooking, newExpiry, note)}
        />

        {/* Render the global ConfirmDialog */}
        <ConfirmDialog />
      </div>
    </div>
  );
};

export default BookingPage;
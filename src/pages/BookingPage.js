import { createClient } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useState } from 'react';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="px-6 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">{state.title}</h3>
            <p className="text-gray-700 mt-2">{state.message}</p>
          </div>
          <div className="px-6 pb-6 pt-4 flex justify-end gap-3">
            <button
              className="px-4 py-2 border rounded-md"
              onClick={() => {
                if (state.resolve) state.resolve(false);
                setState((s) => ({ ...s, open: false }));
              }}
            >
              {state.cancelText}
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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
      target_user_id: null, // We'll use booking_id instead
      action,
      note: note || null,
      booking_id: bookingId || null,
      actor_type: actorType || 'admin', // 'admin' or 'partner'
    },
  ]);
  if (error) console.error('logBookingAction error:', error);
}

/* =========================
   Transfer Ticket Modal
   ========================= */

const TransferTicketModal = ({ open, onClose, onTransfer, booking }) => {
  const [mode, setMode] = useState('email'); // email | phone | user_id
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transfer Ticket</h3>
              <p className="text-sm text-gray-600 mt-1">Booking #{booking.booking_number}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transfer by</label>
              <div className="flex gap-2">
                <button
                  className={clsx(
                    'px-3 py-1 rounded-md border',
                    mode === 'email' ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'
                  )}
                  onClick={() => setMode('email')}
                >
                  Email
                </button>
                <button
                  className={clsx(
                    'px-3 py-1 rounded-md border',
                    mode === 'phone' ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'
                  )}
                  onClick={() => setMode('phone')}
                >
                  Phone
                </button>
                <button
                  className={clsx(
                    'px-3 py-1 rounded-md border',
                    mode === 'user_id' ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'
                  )}
                  onClick={() => setMode('user_id')}
                >
                  User ID
                </button>
              </div>
            </div>

            {mode === 'email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="user@example.com"
                />
              </div>
            )}

            {mode === 'phone' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="+962700000000"
                />
              </div>
            )}

            {mode === 'user_id' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="UUID"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Reason for transfer"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-md">Cancel</button>
            <button
              onClick={() => onTransfer({ mode, email, phone, userId, note })}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Transfer
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-semibold text-gray-900">Extend Ticket Expiry</h4>
              <p className="text-sm text-gray-600">Booking #{booking.booking_number}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>✕</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Expiry (date/time)</label>
              <input
                type="datetime-local"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 border rounded-md" onClick={onClose}>
                Cancel
              </button>
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  onExtend(expiry, note);
                  onClose();
                }}
              >
                Save
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
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <p className="text-gray-600 text-sm">No actions recorded for this booking.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-900 mb-2">Action History</h4>
      <div className="overflow-auto border rounded-md">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Action</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Time</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">By</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Note</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="px-3 py-2 font-medium">{log.action}</td>
                <td className="px-3 py-2">{fmtDateShort(log.created_at)}</td>
                <td className="px-3 py-2">
                  {log.actor_name || log.actor_id || '--'}
                  {log.actor_type && (
                    <span className="ml-1 text-xs px-1 py-0.5 bg-gray-200 rounded">
                      {log.actor_type}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{log.note || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [searchType, setSearchType] = useState('all'); // all, phone, email, booking_id
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
      
      // Check session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('⚠️ No active session, but continuing with anonymous access');
      }
      
      // Build the query based on search type
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply search filters
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        
        if (searchType === 'phone') {
          query = query.ilike('customer_phone', `%${queryLower}%`);
        } else if (searchType === 'email') {
          query = query.ilike('customer_email', `%${queryLower}%`);
        } else if (searchType === 'booking_id') {
          query = query.ilike('booking_number', `%${queryLower}%`);
        } else {
          // Search across multiple fields
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
      // Don't show alert for every error, just log it
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

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPageActive(false);
      } else {
        setIsPageActive(true);
        // Reload data when page becomes visible again
        loadBookings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check for existing session and initial load
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

  // Additional effect to handle focus/blur events
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
        // Reset modal states when page becomes visible again
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

    // Handle escape key to close modals
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
      // Update booking status
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

      // Add refund to user's wallet
      const refundAmount = toNumber(booking.total_amount || 0);
      if (refundAmount > 0) {
        // Get current wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from('user_wallets')
          .select('*')
          .eq('user_id', booking.user_id)
          .single();

        if (walletError && !walletError.message.includes('No rows found')) throw walletError;

        const prevBalance = toNumber(wallet?.balance || 0);
        const newBalance = prevBalance + refundAmount;

        // Create wallet transaction
        const { error: transactionError } = await supabase.from('wallet_transactions').insert([
          {
            user_id: booking.user_id,
            amount: refundAmount,
            transaction_type: 'refund',
            description: `Refund for booking ${booking.booking_number}`,
          },
        ]);

        if (transactionError) throw transactionError;

        // Update wallet balance
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
          // Create wallet if it doesn't exist
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

      // Log the action
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
      // Generate QR code using a QR code API
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(booking.qr_code || booking.booking_number)}`;
      
             // Try to get activity image and details if activity_id exists
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
              // Get the best available image (same logic as HomeScreen)
              // Check for images array first (main picture)
              if (activity.images && activity.images.length > 0) {
                const imagePath = activity.images[0];
                // Convert to full Supabase storage URL if it's not already a full URL
                activityImageUrl = imagePath.startsWith('http') 
                  ? imagePath 
                  : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/${imagePath}`;
              } 
              // Then check gallery_images (fallback)
              else if (activity.gallery_images && activity.gallery_images.length > 0) {
                const imagePath = activity.gallery_images[0];
                activityImageUrl = imagePath.startsWith('http') 
                  ? imagePath 
                  : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/${imagePath}`;
              } 
              // Finally check image_url (final fallback)
              else if (activity.image_url) {
                const imagePath = activity.image_url;
                activityImageUrl = imagePath.startsWith('http') 
                  ? imagePath 
                  : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/${imagePath}`;
              }
              
              console.log('Activity image found:', {
                images: activity.images,
                gallery_images: activity.gallery_images,
                image_url: activity.image_url,
                selected: activityImageUrl
              });
             
             // Get Google Maps link if available
             googleMapsLink = activity.google_map_link || 
               (activity.latitude && activity.longitude ? 
                 `https://www.google.com/maps?q=${activity.latitude},${activity.longitude}` : 
                 '');
             
             // Get activity title and description
             activityTitle = activity.title || activity.title_ar || activity.name || booking.ticket_type;
             activityDescription = activity.description || activity.description_ar || '';
             
             // Get activity-specific terms (check multiple possible column names)
             activityTermsEn = activity.terms || activity.terms_conditions || '';
             activityTermsAr = activity.terms_ar || activity.terms_conditions_ar || '';
           }
         } catch (error) {
           console.log('Could not fetch activity details:', error);
         }
       }
      
      // App logo URL (you can replace this with your actual logo URL)
      const appLogoUrl = 'https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/basmahjoapplogo.png';
      
             // Activity-specific terms and conditions only
       const hasActivityTerms = activityTermsEn || activityTermsAr;
      
             console.log('🎫 Generating PDF for booking:', booking.booking_number);
       console.log('📸 Activity image URL:', activityImageUrl);
       console.log('🏷️ Activity title:', activityTitle);
       console.log('📍 Google Maps link:', googleMapsLink);
       console.log('🖼️ App logo URL:', appLogoUrl);
       
       const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
       
       const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket - ${booking.booking_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .ticket-container {
              background: white;
              border-radius: 15px;
              padding: 30px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              max-width: 600px;
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #667eea; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .app-logo {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              border: 3px solid #667eea;
              margin: 0 auto 15px auto;
              display: block;
              object-fit: cover;
            }
            .header h1 {
              color: #667eea;
              margin: 0;
              font-size: 28px;
            }
            .header h2 {
              color: #333;
              margin: 10px 0 0 0;
              font-size: 20px;
            }
            .activity-section {
              display: flex;
              align-items: center;
              margin-bottom: 25px;
              padding: 20px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-radius: 15px;
              border: 2px solid #667eea;
            }
            .activity-image {
              width: 100px;
              height: 100px;
              object-fit: cover;
              border-radius: 12px;
              margin-right: 20px;
              border: 3px solid #667eea;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .activity-info {
              flex: 1;
            }
            .activity-info h3 {
              margin: 0 0 8px 0;
              color: #333;
              font-size: 18px;
              font-weight: bold;
            }
            .activity-info p {
              margin: 0 0 5px 0;
              color: #666;
              font-size: 14px;
              line-height: 1.4;
            }
            .activity-description {
              color: #888;
              font-size: 12px;
              font-style: italic;
              margin-top: 8px;
            }
            .ticket-info { 
              margin-bottom: 25px; 
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
            }
            .row { 
              display: flex; 
              justify-content: space-between; 
              margin: 8px 0; 
              padding: 5px 0;
              border-bottom: 1px solid #eee;
            }
            .row:last-child {
              border-bottom: none;
            }
            .label { 
              font-weight: bold; 
              color: #667eea;
              min-width: 120px;
            }
            .value {
              color: #333;
              text-align: right;
            }
            .qr-section { 
              text-align: center; 
              margin: 30px 0; 
              padding: 20px;
              background: #f8f9fa;
              border-radius: 10px;
            }
            .qr-code {
              margin: 15px 0;
              padding: 15px;
              background: white;
              border-radius: 8px;
              display: inline-block;
            }
            .qr-code img {
              border: 2px solid #667eea;
              border-radius: 5px;
            }
            .qr-text {
              font-family: monospace; 
              font-size: 16px; 
              margin: 10px 0;
              color: #333;
              font-weight: bold;
            }
                         .footer { 
               margin-top: 30px; 
               text-align: center; 
               font-size: 12px; 
               color: #666;
               border-top: 2px solid #eee;
               padding-top: 20px;
             }
             .terms-section {
               margin: 25px 0;
               padding: 20px;
               background: #f8f9fa;
               border-radius: 10px;
               border-left: 4px solid #667eea;
             }
             .terms-title {
               font-size: 16px;
               font-weight: bold;
               color: #667eea;
               margin-bottom: 15px;
               text-align: center;
             }
             .terms-list {
               list-style: none;
               padding: 0;
               margin: 0;
             }
             .terms-list li {
               margin-bottom: 8px;
               padding-left: 20px;
               position: relative;
               font-size: 12px;
               line-height: 1.4;
               color: #333;
             }
             .terms-list li:before {
               content: "•";
               color: #667eea;
               font-weight: bold;
               position: absolute;
               left: 0;
             }
             .activity-terms {
               margin-top: 15px;
               padding: 15px;
               background: #e3f2fd;
               border-radius: 8px;
               border-left: 3px solid #2196f3;
             }
             .activity-terms h4 {
               font-size: 14px;
               font-weight: bold;
               color: #1976d2;
               margin: 0 0 10px 0;
             }
             .activity-terms p {
               font-size: 11px;
               line-height: 1.3;
               color: #333;
               margin: 0;
             }
             .status-badge {
               display: inline-block;
               padding: 5px 12px;
               border-radius: 20px;
               font-size: 12px;
               font-weight: bold;
               margin-left: 10px;
             }
             .status-active { background: #d4edda; color: #155724; }
             .status-used { background: #cce5ff; color: #004085; }
             .status-expired { background: #fff3cd; color: #856404; }
             .status-cancelled { background: #f8d7da; color: #721c24; }
             .payment-paid { background: #d4edda; color: #155724; }
             .payment-pending { background: #f8d7da; color: #721c24; }
            @media print { 
              body { 
                margin: 0; 
                background: white;
              }
              .ticket-container {
                box-shadow: none;
                border: 2px solid #333;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
                         <div class="header">
               <img src="${appLogoUrl}" alt="Basmah Jo Logo" class="app-logo" onerror="this.style.display='none'; console.log('App logo failed to load:', this.src);">
               <h1>🎫 BASMAH JO TICKET</h1>
               <h2>Booking #${booking.booking_number}</h2>
             </div>
            
                         <div class="activity-section">
               ${activityImageUrl ? `<img src="${activityImageUrl}" alt="Activity" class="activity-image" onerror="this.style.display='none'; console.log('Activity image failed to load:', this.src);">` : ''}
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
             <div class="qr-section" style="background: #f8d7da; border: 2px solid #dc3545;">
               <h3 style="color: #721c24;">Ticket Used</h3>
               <div style="text-align: center; padding: 40px 20px;">
                 <div style="font-size: 48px; color: #dc3545; margin-bottom: 20px;">✓</div>
                 <div style="font-size: 24px; font-weight: bold; color: #721c24; margin-bottom: 10px;">TICKET USED</div>
                 <div style="font-size: 14px; color: #721c24;">
                   This ticket has been used and is no longer valid for entry
                 </div>
                 ${booking.used_at ? `<div style="font-size: 12px; color: #721c24; margin-top: 10px;">
                   Used on: ${new Date(booking.used_at).toLocaleString()}
                 </div>` : ''}
                 ${booking.used_by ? `<div style="font-size: 12px; color: #721c24;">
                   Used by: ${booking.used_by}
                 </div>` : ''}
               </div>
             </div>
             ` : `
             <div class="qr-section">
               <h3>QR Code for Entry</h3>
               <div class="qr-code">
                 <img src="${qrCodeUrl}" alt="QR Code" width="200" height="200">
               </div>
               <div class="qr-text">${booking.qr_code || 'QR-' + booking.booking_number}</div>
               <p style="font-size: 12px; color: #666; margin-top: 10px;">
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
               <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
               <p><strong>Basmah Jo - Activity Booking System</strong></p>
               <p style="font-size: 10px; color: #999;">
                 This ticket is valid for the specified activity and date only.
               </p>
             </div>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 2000); // Increased time to ensure images load properly
      };
      
      // Log the action
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

  /* ========= UI ========= */

  const handlePageClick = () => {
    if (!isPageActive) {
      setIsPageActive(true);
      loadBookings();
    }
  };

  return (
    <div className="space-y-6" onClick={handlePageClick}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600">
            Full control over all bookings and tickets with detailed action logging
          </p>
          {!isPageActive && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded-md">
              <p className="text-yellow-800 text-sm">
                ⚠️ Page is not active. Click anywhere to refresh data.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadBookings();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <span>🔄</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Bookings</label>
            <div className="flex gap-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Fields</option>
                <option value="phone">Phone Number</option>
                <option value="email">Email</option>
                <option value="booking_id">Booking ID</option>
              </select>
              <input
                type="text"
                placeholder={`Search by ${searchType === 'all' ? 'any field' : searchType}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            <span className="ml-3 text-gray-600">Loading bookings...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎫</div>
            <p className="text-gray-600">No bookings found</p>
            <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
          </div>
        ) : (
                     bookings.map((booking) => {
             const customerName = booking.customer_name || '--';
             const customerEmail = booking.customer_email || '--';
             const customerPhone = booking.customer_phone || '--';

            return (
              <div key={booking.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        #{booking.booking_number}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        booking.ticket_status === 'active' ? 'bg-green-100 text-green-800' :
                        booking.ticket_status === 'used' ? 'bg-blue-100 text-blue-800' :
                        booking.ticket_status === 'expired' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.ticket_status || 'active'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.payment_status || 'pending'}
                      </span>
                    </div>
                    
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                       <div>
                         <p className="font-medium text-gray-900">Activity ID: {booking.activity_id || '--'}</p>
                         <p className="text-gray-600">Partner ID: {booking.partner_id || '--'}</p>
                         <p className="text-gray-600">User ID: {booking.user_id || '--'}</p>
                       </div>
                       <div>
                         <p className="font-medium text-gray-900">{customerName}</p>
                         <p className="text-gray-600">{customerEmail}</p>
                         <p className="text-gray-600">{customerPhone}</p>
                       </div>
                     </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Ticket:</span> {booking.ticket_type}
                      </div>
                      <div>
                        <span className="font-medium">Qty:</span> {booking.quantity}
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> {booking.total_amount} JOD
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {fmtDateShort(booking.booking_date)}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Created: {fmtDateShort(booking.created_at)} | 
                      Expiry: {fmtDateShort(booking.expiry_date)}
                      {booking.is_used && ` | Used: ${fmtDateShort(booking.used_at)} by ${booking.used_by || 'system'}`}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openBookingDetails(booking)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                    >
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
           className="fixed inset-0 bg-black/50 overflow-y-auto z-50"
           onClick={(e) => {
             if (e.target === e.currentTarget) {
               setShowBookingDetails(false);
               setSelectedBooking(null);
             }
           }}
         >
           <div className="min-h-full flex items-start justify-center p-4">
             <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Booking Details - #{selectedBooking.booking_number}
                  </h2>
                  <div className="text-sm text-gray-500 mt-1">
                    ID: {selectedBooking.id}
                  </div>
                </div>
                                 <button 
                   onClick={() => {
                     setShowBookingDetails(false);
                     setSelectedBooking(null);
                   }} 
                   className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                   title="Close (ESC)"
                 >
                   <span className="text-xl">✕</span>
                 </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Booking Information */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 border rounded-md p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h3>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                       <div>
                         <p><span className="font-medium">Activity ID:</span> {selectedBooking.activity_id || '--'}</p>
                         <p><span className="font-medium">Partner ID:</span> {selectedBooking.partner_id || '--'}</p>
                         <p><span className="font-medium">User ID:</span> {selectedBooking.user_id || '--'}</p>
                         <p><span className="font-medium">Ticket Type:</span> {selectedBooking.ticket_type}</p>
                         <p><span className="font-medium">Quantity:</span> {selectedBooking.quantity}</p>
                       </div>
                       <div>
                         <p><span className="font-medium">Customer:</span> {selectedBooking.customer_name || '--'}</p>
                         <p><span className="font-medium">Email:</span> {selectedBooking.customer_email || '--'}</p>
                         <p><span className="font-medium">Phone:</span> {selectedBooking.customer_phone || '--'}</p>
                         <p><span className="font-medium">Booking Date:</span> {fmtDateShort(selectedBooking.booking_date)}</p>
                         <p><span className="font-medium">Scheduled Date:</span> {fmtDateShort(selectedBooking.scheduled_date)}</p>
                       </div>
                     </div>
                  </div>

                  <div className="bg-gray-50 border rounded-md p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment & Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="font-medium">Unit Price:</span> {selectedBooking.unit_price} JOD</p>
                        <p><span className="font-medium">Subtotal:</span> {selectedBooking.subtotal} JOD</p>
                        <p><span className="font-medium">Taxes:</span> {selectedBooking.taxes} JOD</p>
                        <p><span className="font-medium">Discount:</span> {selectedBooking.discount || 0} JOD</p>
                        <p><span className="font-medium">Total Amount:</span> {selectedBooking.total_amount} JOD</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Payment Status:</span> {selectedBooking.payment_status || 'pending'}</p>
                        <p><span className="font-medium">Payment Method:</span> {selectedBooking.payment_method || '--'}</p>
                        <p><span className="font-medium">Ticket Status:</span> {selectedBooking.ticket_status || 'active'}</p>
                        <p><span className="font-medium">Expiry Date:</span> {fmtDateShort(selectedBooking.expiry_date)}</p>
                        {selectedBooking.is_used && (
                          <p><span className="font-medium">Used At:</span> {fmtDateShort(selectedBooking.used_at)} by {selectedBooking.used_by || 'system'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action History */}
                  <BookingActionHistory logs={actionLogs} />
                </div>

                {/* Actions Panel */}
                <div>
                  <div className="bg-gray-50 border rounded-md p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => handleDownloadPDF(selectedBooking)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Download PDF
                      </button>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Change Status</label>
                        <select
                          value={selectedBooking.ticket_status || 'active'}
                          onChange={(e) => handleStatusChange(selectedBooking, e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Extend Expiry
                      </button>

                      <button
                        onClick={() => setTransferModalBooking(selectedBooking)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        Transfer Ticket
                      </button>

                      <button
                        onClick={() => handleRefundToWallet(selectedBooking)}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                      >
                        Refund to Wallet
                      </button>

                      <button
                        onClick={() => handleCancelWithoutRefund(selectedBooking)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Cancel (No Refund)
                      </button>

                      <button
                        onClick={() => handleDeleteTicket(selectedBooking)}
                        className="w-full px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
                      >
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

      {/* Render the global ConfirmDialog once */}
      <ConfirmDialog />
    </div>
  );
};

export default BookingPage;

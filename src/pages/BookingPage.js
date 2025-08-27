import { createClient } from '@supabase/supabase-js';



import React, { useCallback, useEffect, useState } from 'react';
// ===== Helpers: status + booking number + cascades =====
const normalizeTicketStatus = (t) => {
  // Handle both 'status' and 'ticket_status' shapes
  return (t?.status || t?.ticket_status || 'valid').toLowerCase();
};

const deriveDisplayBookingNumberLoose = (booking, tickets=[]) => {
  // Prefer short_booking_id if present, else from ticket prefixes, else booking_number/id
  if (booking?.short_booking_id) return booking.short_booking_id;
  try {
    const candidates = tickets
      .map(t => (t?.full_ticket_id || t?.ticket_code || '').toString())
      .filter(Boolean)
      .map(s => {
        const i = s.lastIndexOf('-');
        return i > -1 ? s.slice(0, i) : s;
      });
    if (candidates.length) {
      const first = candidates[0];
      if (first && candidates.every(c => c === first)) return first;
      return first; // fallback to first prefix
    }
  } catch {}
  return booking?.booking_number || booking?.id || '';
};

// Update bookings + ALL related tickets in one go
async function cascadeBookingUpdate(supabase, bookingId, patchBooking={}, patchTickets={}, logCb) {
  // Update booking
  if (patchBooking && Object.keys(patchBooking).length) {
    const { error: bErr } = await supabase.from('bookings').update(patchBooking).eq('id', bookingId);
    if (bErr) throw bErr;
  }
  // Update tickets under this booking
  if (patchTickets && Object.keys(patchTickets).length) {
    const { error: tErr } = await supabase.from('tickets').update(patchTickets).eq('booking_id', bookingId);
    if (tErr) throw tErr;
  }
  if (typeof logCb === 'function') await logCb();
}


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
   Action Modal
   ========================= */

const ActionModal = ({ isOpen, type, target, selectedAction, note, onClose, onActionSelect, onNoteChange, onExecute, actionOptions }) => {
  if (!isOpen || !target) return null;

  const targetName = type === 'booking' 
    ? `Booking #${target?.display_booking_number || target?.short_booking_id || target?.booking_number || target?.id}` 
    : `Ticket ${target?.full_ticket_id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {type === 'booking' ? 'Booking Actions' : 'Ticket Actions'}
              </h3>
              <p className="text-gray-600 mt-1">{targetName}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>

          {/* Action Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Select Action:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {actionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onActionSelect(option.value)}
                  className={`p-4 rounded-xl text-left transition-all duration-200 ${
                    selectedAction === option.value
                      ? `${option.color} text-white shadow-lg transform scale-105`
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:shadow-md'
                  }`}
                >
                  <span className="font-semibold">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Note (Optional):
            </label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={3}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Add a note about this action..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onExecute}
              disabled={!selectedAction}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                selectedAction
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Execute Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
              <h3 className="text-lg font-semibold text-gray-900">
                {booking.ticketId && booking.ticketNumber ? 'Transfer Individual Ticket' : 'Transfer Ticket'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {booking.ticketId && booking.ticketNumber 
                  ? `Ticket ${booking.ticketNumber} from Booking #${booking.display_booking_number || booking.short_booking_id || booking.booking_number || booking.id}`
                  : `Booking #${booking.display_booking_number || booking.short_booking_id || booking.booking_number || booking.id}`
                }
              </p>
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
              <p className="text-sm text-gray-600">Booking #{booking.display_booking_number || booking.short_booking_id || booking.booking_number}</p>
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

  const [bookingTickets, setBookingTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // New action modal state
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null, // 'booking' or 'ticket'
    target: null, // booking object or ticket object
    selectedAction: null,
    note: '',
  });

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

// Enrich each booking with display_booking_number and aggregated ticket counts
let bookingsEnriched = (data || []).map(b => ({ 
  ...b, 
  display_booking_number: deriveDisplayBookingNumberLoose(b, [])
}));

try {
  const ids = bookingsEnriched.map(b => b.id);
  if (ids.length) {
    const { data: tix, error: tErr } = await supabase
      .from('tickets')
      .select('id, booking_id, status, ticket_status, used_at, activated_by, full_ticket_id')
      .in('booking_id', ids);
    if (!tErr && Array.isArray(tix)) {
      const byBooking = new Map();
      for (const t of tix) {
        const k = t.booking_id;
        const st = normalizeTicketStatus(t);
        const rec = byBooking.get(k) || { total: 0, used: 0 };
        rec.total += 1;
        if (st === 'used' || t.used_at) rec.used += 1;
        byBooking.set(k, rec);
      }
      bookingsEnriched = bookingsEnriched.map(b => {
        const rec = byBooking.get(b.id) || { total: 0, used: 0 };
        const computed =
          rec.total > 0 && rec.used === rec.total ? 'used' :
          (b.ticket_status || 'active');
        return { ...b, total_tickets: rec.total, used_tickets: rec.used, ticket_status: computed };
      });
    }
  }
} catch (e) {
  console.warn('Aggregation of tickets failed (non-fatal):', e);
}

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} bookings`);
      setBookings(bookingsEnriched || data || []);
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

  const loadBookingTickets = useCallback(async (bookingId) => {
    try {
      setTicketsLoading(true);
      console.log('🔄 Loading tickets for booking:', bookingId);

      // First, get the tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (ticketsError) throw ticketsError;

      console.log(`✅ Found ${ticketsData?.length || 0} tickets for booking ${bookingId}`);

      // Then, get the booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Get profile data separately
      let profileData = null;
      if (bookingData.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', bookingData.user_id)
          .single();
        
        if (!profileError && profile) {
          profileData = profile;
        }
      }

      // Get activity data separately
      let activityData = null;
      if (bookingData.activity_id) {
        const { data: activity, error: activityError } = await supabase
          .from('activities')
          .select('title, title_ar, location, location_ar, image_url, price, address')
          .eq('id', bookingData.activity_id)
          .single();
        
        if (!activityError && activity) {
          activityData = activity;
        }
      }

      // Combine the data
      const combinedTickets = ticketsData?.map(ticket => ({
        ...ticket,
        bookings: {
          ...bookingData,
          profiles: profileData,
          activities: activityData
        }
      })) || [];

      console.log(`✅ Combined ${combinedTickets.length} tickets with booking data`);
      setBookingTickets(combinedTickets);
      try { setSelectedBooking(prev => prev ? { ...prev, display_booking_number: deriveDisplayBookingNumberLoose(prev, ticketsData || []) } : prev); } catch {}
    } catch (error) {
      console.error('Error loading booking tickets:', error);
      setBookingTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, []);



  
const handleTicketStatusChange = async (ticket, newStatus, note) => {
  try {
    const now = new Date().toISOString();
    const patch = {
      ticket_status: newStatus,
      updated_at: now,
    };
    if (newStatus === 'used' && !ticket.used_at) {
      patch.used_at = now;
      patch.activated_at = now;
      patch.activated_by = currentAdmin?.name || 'Admin';
    }
    if (newStatus !== 'used') {
      patch.used_at = null;
      patch.activated_at = null;
      patch.activated_by = null;
    }

    const { error } = await supabase
      .from('tickets')
      .update(patch)
      .eq('id', ticket.id);
    if (error) throw error;

    await logBookingAction({
      actorId: currentAdmin?.id,
      actorName: currentAdmin?.name,
      actorType: 'admin',
      bookingId: ticket.booking_id,
      action: 'ticket_status_change',
      note: note || `Ticket ${ticket.full_ticket_id} → ${newStatus} by ${currentAdmin?.name || 'Admin'}`,
    });

    // Refresh the details + list aggregates
    await loadBookingTickets(ticket.booking_id);
    await loadBookings();

    alert('Individual ticket status updated successfully');
  } catch (error) {
    console.error('Error updating ticket status:', error?.message || error, error);
    alert('Failed to update ticket status');
  }
};


  const handleDownloadTicketPDF = async (ticket) => {
    try {
      const booking = ticket.bookings;
      const profile = booking?.profiles;
      const activity = booking?.activities;
      
      // Generate QR code for the individual ticket
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qr_code)}`;
      
      // Get activity image
      let activityImageUrl = '';
      if (activity?.image_url) {
        activityImageUrl = activity.image_url.startsWith('http') 
          ? activity.image_url 
          : `https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/activities/${activity.image_url}`;
      }
      
      // App logo URL
      const appLogoUrl = 'https://rtjegrjmnuivkivdgwjk.supabase.co/storage/v1/object/public/images/basmahjoapplogo.png';
      
      console.log('🎫 Generating PDF for ticket:', ticket.full_ticket_id);
      
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket - ${ticket.full_ticket_id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .ticket-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .logo {
              width: 80px;
              height: 80px;
              margin: 0 auto 20px;
              border-radius: 50%;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
            }
            .ticket-content {
              padding: 40px;
            }
            .qr-section {
              text-align: center;
              margin: 30px 0;
            }
            .qr-code {
              width: 200px;
              height: 200px;
              margin: 0 auto;
              border: 2px solid #ddd;
              border-radius: 10px;
            }
            .ticket-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin: 30px 0;
            }
            .detail-group {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
            }
            .detail-group h3 {
              margin: 0 0 15px 0;
              color: #333;
              font-size: 18px;
            }
            .detail-item {
              margin: 10px 0;
              display: flex;
              justify-content: space-between;
            }
            .detail-label {
              font-weight: bold;
              color: #666;
            }
            .detail-value {
              color: #333;
            }
            .status-badge {
              display: inline-block;
              padding: 5px 15px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 14px;
            }
            .status-valid { background: #d4edda; color: #155724; }
            .status-used { background: #cce5ff; color: #004085; }
            .status-expired { background: #fff3cd; color: #856404; }
            .status-cancelled { background: #f8d7da; color: #721c24; }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { background: white; }
              .ticket-container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <div class="header">
              <div class="logo">🎫</div>
              <h1>BASMAH JO</h1>
              <p>Individual Ticket</p>
            </div>
            
            <div class="ticket-content">
              <div class="qr-section">
                <h2>Scan QR Code</h2>
                <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
                <p><strong>Ticket ID:</strong> ${ticket.full_ticket_id}</p>
              </div>
              
              <div class="ticket-details">
                <div class="detail-group">
                  <h3>Ticket Information</h3>
                  <div class="detail-item">
                    <span class="detail-label">Ticket ID:</span>
                    <span class="detail-value">${ticket.full_ticket_id}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">QR Code:</span>
                    <span class="detail-value">${ticket.qr_code}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">
                      <span class="status-badge status-${ticket.status}">${ticket.status}</span>
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Created:</span>
                    <span class="detail-value">${fmtDateShort(ticket.created_at)}</span>
                  </div>
                  ${ticket.used_at ? `
                  <div class="detail-item">
                    <span class="detail-label">Used At:</span>
                    <span class="detail-value">${fmtDateShort(ticket.used_at)}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Used By:</span>
                    <span class="detail-value">${ticket.activated_by || '--'}</span>
                  </div>
                  ` : ''}
                </div>
                
                <div class="detail-group">
                  <h3>Activity & Customer</h3>
                  <div class="detail-item">
                    <span class="detail-label">Activity:</span>
                    <span class="detail-value">${activity?.title || '--'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${activity?.location || '--'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Price:</span>
                    <span class="detail-value">${activity?.price || 0} JOD</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Customer:</span>
                    <span class="detail-value">${profile?.name || '--'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${profile?.email || '--'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${profile?.phone || '--'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p>© 2024 Basmah Jo. All rights reserved.</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Wait for images to load before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
      
    } catch (error) {
      console.error('Error generating ticket PDF:', error);
      alert('Failed to generate ticket PDF');
    }
  };

  const handleDownloadAllTicketsPDF = async () => {
    try {
      if (!selectedBooking || bookingTickets.length === 0) {
        alert('No tickets to download');
        return;
      }

      console.log('🎫 Generating PDF for all tickets in booking:', selectedBooking.booking_number);
      
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      let ticketsContent = '';
      bookingTickets.forEach((ticket, index) => {
        const booking = ticket.bookings;
        const profile = booking?.profiles;
        const activity = booking?.activities;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qr_code)}`;
        
        ticketsContent += `
          <div style="page-break-after: always; margin-bottom: 30px;">
            <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #333; margin: 0;">Ticket ${index + 1} of ${bookingTickets.length}</h2>
                <p style="color: #666; margin: 5px 0;">${ticket.full_ticket_id}</p>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div style="text-align: center;">
                  <img src="${qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px; border: 2px solid #ddd; border-radius: 8px;" />
                  <p style="margin: 10px 0; font-weight: bold;">Scan QR Code</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">Ticket Details</h3>
                  <p style="margin: 5px 0;"><strong>Status:</strong> <span style="background: ${ticket.status === 'valid' ? '#d4edda' : ticket.status === 'used' ? '#cce5ff' : '#fff3cd'}; color: ${ticket.status === 'valid' ? '#155724' : ticket.status === 'used' ? '#004085' : '#856404'}; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${ticket.status}</span></p>
                  <p style="margin: 5px 0;"><strong>Type:</strong> ${booking?.ticket_type || '--'}</p>
                  <p style="margin: 5px 0;"><strong>Activity:</strong> ${activity?.title || '--'}</p>
                  <p style="margin: 5px 0;"><strong>Customer:</strong> ${profile?.name || '--'}</p>
                  <p style="margin: 5px 0;"><strong>Price:</strong> ${activity?.price || 0} JOD</p>
                  ${ticket.used_at ? `<p style="margin: 5px 0;"><strong>Used:</strong> ${fmtDateShort(ticket.used_at)} by ${ticket.activated_by || '--'}</p>` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      });
      
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>All Tickets - ${selectedBooking.booking_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 15px;
              margin-bottom: 30px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-radius: 15px;
              margin-top: 30px;
            }
            @media print {
              body { background: white; }
              .header, .footer { border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BASMAH JO</h1>
            <p>All Tickets for Booking #${selectedBooking.display_booking_number || selectedBooking.short_booking_id || selectedBooking.booking_number || selectedBooking.id}</p>
            <p>${selectedBooking.customer_name} • ${selectedBooking.customer_email}</p>
            <p>Total Tickets: ${bookingTickets.length}</p>
          </div>
          
          ${ticketsContent}
          
          <div class="footer">
            <p>© 2024 Basmah Jo. All rights reserved.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
      
    } catch (error) {
      console.error('Error generating all tickets PDF:', error);
      alert('Failed to generate all tickets PDF');
    }
  };

  // Individual ticket action functions
  const handleIndividualTicketRefund = async (bookingWithTicket) => {
    const { ticketId, ticketNumber } = bookingWithTicket;
    const ok = await confirm({
      title: 'Refund Individual Ticket',
      message: `Refund ticket ${ticketNumber} to wallet? This will only affect this specific ticket.`,
      confirmText: 'Refund Ticket',
    });
    if (!ok) return;

    try {
      // Update individual ticket status
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      // Calculate refund amount (assuming equal distribution)
      const ticketPrice = selectedBooking.total_amount / selectedBooking.quantity;
      
      // Add refund to user's wallet
      if (ticketPrice > 0) {
        const { data: wallet, error: walletError } = await supabase
          .from('user_wallets')
          .select('*')
          .eq('user_id', selectedBooking.user_id)
          .single();

        if (walletError && !walletError.message.includes('No rows found')) throw walletError;

        const prevBalance = toNumber(wallet?.balance || 0);
        const newBalance = prevBalance + ticketPrice;

        // Create wallet transaction
        const { error: transactionError } = await supabase.from('wallet_transactions').insert([
          {
            user_id: selectedBooking.user_id,
            amount: ticketPrice,
            transaction_type: 'refund',
            description: `Refund for ticket ${ticketNumber} from booking ${selectedBooking.booking_number}`,
          },
        ]);

        if (transactionError) throw transactionError;

        // Update wallet balance
        if (wallet) {
          const { error: updateError } = await supabase
            .from('user_wallets')
            .update({
              balance: newBalance,
              total_earned: toNumber(wallet.total_earned || 0) + ticketPrice,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', selectedBooking.user_id);

          if (updateError) throw updateError;
        } else {
          const { error: createError } = await supabase
            .from('user_wallets')
            .insert({
              user_id: selectedBooking.user_id,
              balance: ticketPrice,
              total_earned: ticketPrice,
              total_spent: 0,
              is_active: true,
            });

          if (createError) throw createError;
        }
      }

      await cascadeBookingUpdate(supabase, selectedBooking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: selectedBooking.id,
        action: 'refund_individual_ticket',
        note: `Refunded ticket ${ticketNumber} (${ticketPrice} JOD) to wallet`,
      });

      await loadBookingTickets(selectedBooking.id);
      alert('Individual ticket refunded to wallet successfully!');
    } catch (error) {
      console.error('Error refunding individual ticket:', error);
      alert('Failed to refund individual ticket');
    }
  };

  const handleIndividualTicketCancel = async (bookingWithTicket) => {
    const { ticketId, ticketNumber } = bookingWithTicket;
    const ok = await confirm({
      title: 'Cancel Individual Ticket',
      message: `Cancel ticket ${ticketNumber} without refund? This action cannot be undone.`,
      confirmText: 'Cancel Ticket',
    });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;

      await cascadeBookingUpdate(supabase, selectedBooking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: selectedBooking.id,
        action: 'cancel_individual_ticket',
        note: `Cancelled ticket ${ticketNumber} without refund`,
      });

      await loadBookingTickets(selectedBooking.id);
      alert('Individual ticket cancelled successfully');
    } catch (error) {
      console.error('Error cancelling individual ticket:', error);
      alert('Failed to cancel individual ticket');
    }
  };

  const handleIndividualTicketDelete = async (bookingWithTicket) => {
    const { ticketId, ticketNumber } = bookingWithTicket;
    const ok = await confirm({
      title: 'Delete Individual Ticket',
      message: `Permanently delete ticket ${ticketNumber}? This action cannot be undone and will remove all associated data.`,
      confirmText: 'Delete Ticket',
    });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      await cascadeBookingUpdate(supabase, selectedBooking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: selectedBooking.id,
        action: 'delete_individual_ticket',
        note: `Permanently deleted ticket ${ticketNumber}`,
      });

      await loadBookingTickets(selectedBooking.id);
      alert('Individual ticket deleted permanently');
    } catch (error) {
      console.error('Error deleting individual ticket:', error);
      alert('Failed to delete individual ticket');
    }
  };

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
    await loadBookingTickets(booking.id);
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
      await cascadeBookingUpdate(supabase, booking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

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
      await cascadeBookingUpdate(supabase, booking.id, {
          status: 'cancelled',
          ticket_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentAdmin?.id || null,
          refunded_amount: 0,
          updated_at: new Date().toISOString(),
        }, {
          ticket_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentAdmin?.id || null,
          updated_at: new Date().toISOString(),
        });

      await cascadeBookingUpdate(supabase, booking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

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
      console.error('Error cancelling ticket:', error?.message || error, error);
      alert('Failed to cancel ticket');
    }
  };

  const handleTransferTicket = async ({ mode, email, phone, userId, note }) => {
    const booking = transferModalBooking;
    if (!booking) return;

    // Check if this is an individual ticket transfer
    const isIndividualTicket = booking.ticketId && booking.ticketNumber;
    
    if (isIndividualTicket) {
      // Handle individual ticket transfer
      try {

        if (!booking.ticketId) {
          console.error('Transfer ticket error: missing ticketId in payload/object', booking);
          alert('Cannot transfer: internal ticket id is missing for this row.');
          return;
        }

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

        // Update the individual ticket's booking to point to the new user
        const { error: updErr } = await supabase
          .from('tickets')
          .update({
            user_id: targetUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.ticketId);

        if (updErr) { console.error('Transfer ticket update error:', updErr); throw updErr; }

        await logBookingAction({
          actorId: currentAdmin?.id,
          actorName: currentAdmin?.name,
          actorType: 'admin',
          bookingId: booking.id,
          action: 'transfer_individual_ticket',
          note: note || `Transferred ticket ${booking.ticketNumber} to user ${targetUserId}`,
        });

        await loadBookingTickets(booking.id);
        setTransferModalBooking(null);
        alert('Individual ticket transferred successfully.');
        return;
      } catch (error) {
        console.error('Error transferring individual ticket:', error?.message || error, error);
        alert('Failed to transfer individual ticket');
        return;
      }
    }

    // Original booking-level transfer logic
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

      await cascadeBookingUpdate(supabase, booking.id, {
        user_id: targetUserId,
        updated_at: new Date().toISOString(),
      }, {
        user_id: targetUserId,
        updated_at: new Date().toISOString(),
      });

      await cascadeBookingUpdate(supabase, booking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

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
      console.error('Error transferring ticket:', error?.message || error, error);
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

      await cascadeBookingUpdate(supabase, booking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

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

  const handleDeleteBooking = async (booking) => {
    const ok = await confirm({
      title: 'Delete Booking',
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

      await cascadeBookingUpdate(supabase, booking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'delete_booking',
        note: 'Booking permanently deleted',
      });

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        setShowBookingDetails(false);
        setSelectedBooking(null);
      }
      alert('Booking deleted permanently');
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking');
    }
  };

  // New action modal functions
  const openActionModal = (type, target) => {
    setActionModal({
      isOpen: true,
      type,
      target,
      selectedAction: null,
      note: '',
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      type: null,
      target: null,
      selectedAction: null,
      note: '',
    });
  };

  const handleActionExecution = async () => {
    const { type, target, selectedAction, note } = actionModal;
    
    if (!selectedAction) {
      alert('Please select an action');
      return;
    }

    try {
      if (type === 'booking') {
        // Handle booking-level actions
        switch (selectedAction) {
          case 'download_pdf':
            await handleDownloadPDF(target);
            break;
          case 'change_status':
            // For booking status change, we need to prompt for the new status
            const newBookingStatus = prompt('Enter new status (active/used/expired/cancelled):', target.ticket_status || 'active');
            if (newBookingStatus && ['active', 'used', 'expired', 'cancelled'].includes(newBookingStatus)) {
              await handleStatusChange(target, newBookingStatus);
            }
            break;
          case 'extend_expiry':
            await handleExtendExpiry(target, null, note);
            break;
          case 'transfer':
            setTransferModalBooking(target);
            break;
          case 'refund_wallet':
            await handleRefundToWallet(target);
            break;
          case 'cancel_no_refund':
            await handleCancelWithoutRefund(target);
            break;
          case 'delete':
            await handleDeleteBooking(target);
            break;
        }
      } else if (type === 'ticket') {
        // Handle ticket-level actions
        const bookingWithTicket = { ...selectedBooking, ticketId: target.id, ticketNumber: target.full_ticket_id };
        
        switch (selectedAction) {
          case 'download_pdf':
            await handleDownloadTicketPDF(target);
            break;
          case 'change_status':
            // For ticket status change, we need to prompt for the new status
            const newStatus = prompt('Enter new status (valid/used/expired/cancelled):', target.status || 'valid');
            if (newStatus && ['valid', 'used', 'expired', 'cancelled'].includes(newStatus)) {
              await handleTicketStatusChange(target, newStatus, note);
            }
            break;
          case 'extend_expiry':
            await handleExtendExpiry(selectedBooking, null, `Extend ticket ${target.full_ticket_id} - ${note}`);
            break;
          case 'transfer':
            setTransferModalBooking(bookingWithTicket);
            break;
          case 'refund_wallet':
            await handleIndividualTicketRefund(bookingWithTicket);
            break;
          case 'cancel_no_refund':
            await handleIndividualTicketCancel(bookingWithTicket);
            break;
          case 'delete':
            await handleIndividualTicketDelete(bookingWithTicket);
            break;
        }
      }

      closeActionModal();
    } catch (error) {
      console.error('Error executing action:', error);
      alert('Failed to execute action');
    }
  };

  const getActionOptions = (type) => {
    if (type === 'booking') {
      return [
        { value: 'download_pdf', label: '📄 Download PDF', color: 'bg-green-500' },
        { value: 'change_status', label: '🔄 Change Status', color: 'bg-blue-500' },
        { value: 'extend_expiry', label: '⏰ Extend Expiry', color: 'bg-yellow-500' },
        { value: 'transfer', label: '🔄 Transfer Ticket', color: 'bg-purple-500' },
        { value: 'refund_wallet', label: '💰 Refund to Wallet', color: 'bg-orange-500' },
        { value: 'cancel_no_refund', label: '❌ Cancel (No Refund)', color: 'bg-red-500' },
        { value: 'delete', label: '🗑️ Delete Permanently', color: 'bg-gray-800' },
      ];
    } else {
      return [
        { value: 'download_pdf', label: '📄 Download PDF', color: 'bg-green-500' },
        { value: 'change_status', label: '🔄 Change Status', color: 'bg-blue-500' },
        { value: 'extend_expiry', label: '⏰ Extend Expiry', color: 'bg-yellow-500' },
        { value: 'transfer', label: '🔄 Transfer Ticket', color: 'bg-purple-500' },
        { value: 'refund_wallet', label: '💰 Refund to Wallet', color: 'bg-orange-500' },
        { value: 'cancel_no_refund', label: '❌ Cancel (No Refund)', color: 'bg-red-500' },
        { value: 'delete', label: '🗑️ Delete Permanently', color: 'bg-gray-800' },
      ];
    }
  };

  const handleExtendExpiry = async (booking, newExpiry, note) => {
    if (!newExpiry) {
      alert('Please select a new expiry date/time');
      return;
    }

    try {
      await cascadeBookingUpdate(supabase, booking.id, {
          expiry_date: new Date(newExpiry).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          ticket_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentAdmin?.id || null,
          updated_at: new Date().toISOString(),
        });

      await cascadeBookingUpdate(supabase, booking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

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
    const now = new Date().toISOString();
    const bookingPatch = {
      ticket_status: newStatus,
      updated_at: now,
    };
    if (newStatus === 'used' && !booking.used_at) {
      bookingPatch.used_at = now;
      bookingPatch.is_used = true;
      bookingPatch.used_by = currentAdmin?.name || 'Admin';
    } else if (newStatus !== 'used') {
      bookingPatch.is_used = newStatus === 'used';
    }

    const ticketPatch = {
      ticket_status: newStatus,
      updated_at: now,
      activated_at: newStatus === 'used' ? now : null,
      activated_by: newStatus === 'used' ? (currentAdmin?.name || 'Admin') : null,
      used_at: newStatus === 'used' ? now : null,
    };

    await cascadeBookingUpdate(supabase, booking.id, bookingPatch, ticketPatch, async () => {
      await cascadeBookingUpdate(supabase, booking.id, {}, {
        ticket_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentAdmin?.id || null,
        updated_at: new Date().toISOString(),
      });

      await logBookingAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        actorType: 'admin',
        bookingId: booking.id,
        action: 'status_change_all_tickets',
        note: `Set all tickets to ${newStatus}`,
      });
    });

    await loadBookings();
    if (selectedBooking?.id === booking.id) {
      await loadBookingLogs(booking.id);
      await loadBookingTickets(booking.id);
    }
    alert('Status updated for all tickets in the booking');
  } catch (error) {
    console.error('Error updating booking status:', error);
    alert('Failed to update booking status');
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
               <h2>Booking #${booking.display_booking_number || booking.short_booking_id || booking.booking_number || booking.id}</h2>
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
             ` : booking.ticket_status === 'cancelled' ? `
             <div class="qr-section" style="background: #f8d7da; border: 2px solid #dc3545;">
               <h3 style="color: #721c24;">Ticket Cancelled</h3>
               <div style="text-align: center; padding: 40px 20px;">
                 <div style="font-size: 48px; color: #dc3545; margin-bottom: 20px;">✗</div>
                 <div style="font-size: 24px; font-weight: bold; color: #721c24; margin-bottom: 10px;">TICKET CANCELLED</div>
                 <div style="font-size: 14px; color: #721c24;">
                   This ticket has been cancelled and is no longer valid for entry
                 </div>
                 ${booking.cancelled_at ? `<div style="font-size: 12px; color: #721c24; margin-top: 10px;">
                   Cancelled on: ${new Date(booking.cancelled_at).toLocaleString()}
                 </div>` : ''}
                 ${booking.cancelled_by ? `<div style="font-size: 12px; color: #721c24;">
                   Cancelled by: ${booking.cancelled_by}
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

      {/* Enhanced Search */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
        <div className="flex gap-6 flex-col lg:flex-row">
          <div className="flex-1">
            <label className="block text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              Search & Filter Bookings
            </label>
            <div className="flex gap-4 flex-col sm:flex-row">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="border-2 border-gray-300 rounded-2xl px-6 py-4 text-gray-700 font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white shadow-sm"
              >
                <option value="all">🔍 Search All Fields</option>
                <option value="booking_id">🎫 Booking ID</option>
                <option value="email">✉️ Customer Email</option>
                <option value="phone">📱 Customer Phone</option>
                <option value="name">👤 Customer Name</option>
              </select>
              <input
                type="text"
                placeholder={`Search by ${searchType === 'all' ? 'booking ID, customer name, email, or phone' : searchType === 'booking_id' ? 'booking ID (e.g., BJ20250824008)' : searchType === 'email' ? 'customer email address' : searchType === 'phone' ? 'customer phone number' : 'customer name'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-2 border-gray-300 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium shadow-sm bg-white"
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
              <div key={booking.id} className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-1">
                    {/* Header with Booking ID and Status */}
                    {/* Stunning Header */}
                    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 mb-8 text-white shadow-2xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-4xl font-bold mb-2">Booking #{selectedBooking?.display_booking_number || selectedBooking?.short_booking_id || selectedBooking?.booking_number || booking.display_booking_number || booking.short_booking_id || booking.booking_number}</h2>
                          <p className="text-indigo-100 text-lg">ID: {selectedBooking?.display_booking_number || selectedBooking?.short_booking_id || selectedBooking?.booking_number || selectedBooking?.id || booking.display_booking_number || booking.short_booking_id || booking.booking_number || booking.id}</p>
                          <div className="flex gap-3 mt-4">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                              booking.ticket_status === 'active' ? 'bg-green-500 text-white' :
                              booking.ticket_status === 'used' ? 'bg-blue-500 text-white' : booking.ticket_status === 'partial' ? 'bg-yellow-500 text-white' :
                              booking.ticket_status === 'expired' ? 'bg-yellow-500 text-white' :
                              'bg-red-500 text-white'
                            }`}>
                              {(booking.ticket_status || 'active').toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                              booking.payment_status === 'paid' ? 'bg-green-500 text-white' :
                              'bg-red-500 text-white'
                            }`}>
                              {(booking.payment_status || 'pending').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedBooking(null)}
                          className="text-white hover:text-gray-200 text-2xl font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    {/* Customer Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <span className="text-gray-600 font-medium">Payment Method: {booking.payment_method || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <span className="text-gray-600 font-medium">Ticket Type: {booking.ticket_type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-teal-100 to-cyan-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="text-gray-600 font-medium">Location: {booking.location || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Quantity</div>
                        <div className="text-lg font-bold text-gray-900">{booking.quantity}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Unit Price</div>
                        <div className="text-lg font-bold text-gray-900">{booking.unit_price || 0} JOD</div>
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

                    {/* Additional Details */}
                    <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div><span className="font-semibold">Created:</span> {fmtDateShort(booking.created_at)}</div>
                        <div><span className="font-semibold">Expiry:</span> {fmtDateShort(booking.expiry_date)}</div>
                        {booking.is_used && (
                          <div><span className="font-semibold">Used:</span> {fmtDateShort(booking.used_at)} by {booking.used_by || 'system'}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Single View Details Button */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => openBookingDetails(booking)}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details & Tickets
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

                  {/* Tickets Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                        Individual Tickets ({bookingTickets.length})
                      </h3>
                      {bookingTickets.length > 0 && (
                        <button
                          onClick={handleDownloadAllTicketsPDF}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download All Tickets PDF
                        </button>
                      )}
                    </div>
                    
                    {ticketsLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        <span className="ml-3 text-gray-600">Loading tickets...</span>
                      </div>
                    ) : bookingTickets.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-2xl mb-2">🎫</div>
                        <p className="text-gray-600">No individual tickets found for this booking</p>
                      </div>

                    ) : (
                      <div className="space-y-4">
                        {bookingTickets.map((ticket) => {
                          const booking = ticket.bookings;
                          const profile = booking?.profiles;
                          const activity = booking?.activities;
                          
                          return (
                            <div key={ticket.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
                              {/* Ticket Header */}
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-bold text-gray-900">
                                      {ticket.full_ticket_id || ticket.id}
                                    </h4>
                                    <p className="text-sm text-gray-600 font-mono">QR: {ticket.qr_code}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    ticket.status === 'valid' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300' :
                                    ticket.status === 'used' ? 'bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800 border border-blue-300' :
                                    ticket.status === 'expired' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300' :
                                    'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300'
                                  }`}>
                                    {(ticket.status || 'valid').toUpperCase()}
                                  </span>
                                </div>
                              </div>

                              {/* Ticket Details Grid */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                {/* Activity & Location Info */}
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                                  <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Activity Information
                                  </h5>
                                  <div className="space-y-2 text-sm">
                                    <p><span className="font-semibold text-gray-700">Activity:</span> <span className="text-gray-900">{activity?.title || '--'}</span></p>
                                    <p><span className="font-semibold text-gray-700">Location:</span> <span className="text-gray-900">{activity?.location || '--'}</span></p>
                                    <p><span className="font-semibold text-gray-700">Price:</span> <span className="text-indigo-600 font-bold">{activity?.price || 0} JOD</span></p>
                                  </div>
                                </div>

                                {/* Customer & Ticket Info */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                                  <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Customer & Ticket Details
                                  </h5>
                                  <div className="space-y-2 text-sm">
                                    <p><span className="font-semibold text-gray-700">Customer:</span> <span className="text-gray-900">{profile?.name || '--'}</span></p>
                                    <p><span className="font-semibold text-gray-700">Ticket Type:</span> <span className="text-gray-900">{booking?.ticket_type || '--'}</span></p>
                                    <p><span className="font-semibold text-gray-700">Created:</span> <span className="text-gray-900">{fmtDateShort(ticket.created_at)}</span></p>
                                  </div>
                                </div>
                              </div>

                              {/* Usage Information */}
                              {ticket.used_at && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl">
                                  <h5 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Ticket Usage Information
                                  </h5>
                                  <div className="text-sm text-blue-800">
                                    <p><span className="font-semibold">Used At:</span> {fmtDateShort(ticket.used_at)}</p>
                                    <p><span className="font-semibold">Activated By:</span> {ticket.activated_by || '--'}</p>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-center mt-4">
                                <button
                                  onClick={() => openActionModal('ticket', ticket)}
                                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                  🎯 Take Action
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}


                  </div>
                </div>
                  {/* Action History */}
                  <BookingActionHistory logs={actionLogs} />


                {/* Actions Panel */}
                <div>
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                      </div>
                      Booking Actions
                    </h3>
                    <button
                      onClick={() => openActionModal('booking', selectedBooking)}
                      className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
                    >
                      🎯 Take Action
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        target={actionModal.target}
        selectedAction={actionModal.selectedAction}
        note={actionModal.note}
        onClose={closeActionModal}
        onActionSelect={(action) => setActionModal(prev => ({ ...prev, selectedAction: action }))}
        onNoteChange={(note) => setActionModal(prev => ({ ...prev, note }))}
        onExecute={handleActionExecution}
        actionOptions={getActionOptions(actionModal.type)}
      />

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
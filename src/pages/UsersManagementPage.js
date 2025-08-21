import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

/* =========================
   Utilities
   ========================= */

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '--');

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

async function logAdminAction({ actorId, actorName, targetUserId, action, note }) {
  const { error } = await supabase.from('admin_action_logs').insert([
    {
      actor_id: actorId || null,
      actor_name: actorName || null,
      target_user_id: targetUserId || null,
      action,
      note: note || null,
    },
  ]);
  if (error) console.error('logAdminAction error:', error);
}

/* =========================
   ADMIN USER MANAGEMENT
   ========================= */

async function adminCreateUser({ email, password, userMeta }) {
  try {
    // Create user through Supabase Auth signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userMeta?.full_name || userMeta?.name || '',
          phone: userMeta?.phone || '',
          preferred_language: userMeta?.preferred_language || 'en',
          city: userMeta?.city || '',
        }
      }
    });

    if (authError) throw authError;

    const user = authData.user;
    if (!user?.id) throw new Error('Auth user not created');

    // Create profile using the auth user ID
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id, // Use the auth user ID
        email,
        name: userMeta?.full_name || userMeta?.name || '',
        phone: userMeta?.phone || '',
        preferred_language: userMeta?.preferred_language || 'en',
        city: userMeta?.city || '',
        status: 'active',
        role: 'user',
      });

    if (profileError) throw profileError;

    // Create wallet
    const { error: walletError } = await supabase
      .from('user_wallets')
      .insert({
        user_id: user.id,
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        is_active: true,
      });

    if (walletError) throw walletError;

    return { 
      data: { 
        user: { 
          id: user.id, 
          email: user.email,
          email_confirmed_at: user.email_confirmed_at
        } 
      }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
}

async function adminUpdateUserPassword(userId, newPassword) {
  try {
    // For now, we can't update passwords without proper admin functions
    // This would need to be handled server-side with admin privileges
    return { 
      data: null, 
      error: { message: 'Password updates require server-side admin privileges. Please contact support.' } 
    };
  } catch (error) {
    return { data: null, error };
  }
}

/* =========================
   Defaults
   ========================= */

const defaultUserForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  preferred_language: 'en',
  city: '',
};

const defaultWalletForm = {
  amount: '',
  action: 'add',
  description: '',
};

const defaultPointsForm = {
  points: '',
  action: 'add',
  description: '',
};

const ticketStatusOptions = ['active', 'expired', 'used', 'cancelled'];

/* =========================
   Transfer Ticket Modal
   ========================= */

const TransferTicketModal = ({ open, onClose, onTransfer, ticket }) => {
  const [mode, setMode] = useState('email'); // email | user_id
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setMode('email');
      setEmail('');
      setUserId('');
      setNote('');
    }
  }, [open]);

  if (!open || !ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transfer Ticket</h3>
              <p className="text-sm text-gray-600 mt-1">Booking #{ticket.booking_number}</p>
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
                    mode === 'user_id' ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'
                  )}
                  onClick={() => setMode('user_id')}
                >
                  User ID
                </button>
              </div>
            </div>

            {mode === 'email' ? (
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
            ) : (
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
              onClick={() => onTransfer({ mode, email, userId, note })}
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

const ExtendExpiryButton = ({ onExtend }) => {
  const [open, setOpen] = useState(false);
  const [expiry, setExpiry] = useState('');
  const [note, setNote] = useState('');

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-1 border rounded-md hover:bg-gray-50">
        Extend Expiry
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">Extend Ticket Expiry</h4>
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setOpen(false)}>✕</button>
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
                  <button className="px-3 py-2 border rounded-md" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={() => {
                      onExtend(expiry, note);
                      setOpen(false);
                      setExpiry('');
                      setNote('');
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* =========================
   Action History Table
   ========================= */

const ActionHistory = ({ logs }) => {
  if (!logs) return null;
  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Action History</h3>
      {logs.length === 0 ? (
        <div className="text-gray-600">No actions recorded.</div>
      ) : (
        <div className="overflow-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Action</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">By</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">At</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.action}</td>
                  <td className="px-3 py-2">{l.actor_name || l.actor_id || '--'}</td>
                  <td className="px-3 py-2">{fmtDate(l.created_at)}</td>
                  <td className="px-3 py-2">{l.note || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* =========================
   Main Page
   ========================= */

const UsersManagementPage = ({ currentAdmin }) => {
  const [users, setUsers] = useState([]);
  const [walletsByUser, setWalletsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const [userForm, setUserForm] = useState(defaultUserForm);
  const [editForm, setEditForm] = useState(null);
  const [walletForm, setWalletForm] = useState(defaultWalletForm);
  const [pointsForm, setPointsForm] = useState(defaultPointsForm);

  // Tickets
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [transferModalTicket, setTransferModalTicket] = useState(null);

  // Action history
  const [actionLogs, setActionLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const { confirm, ConfirmDialog } = useConfirm();

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (pErr) throw pErr;

      const ids = (profiles || []).map((u) => u.id);
      let walletsMap = {};
      if (ids.length > 0) {
        const { data: wallets, error: wErr } = await supabase
          .from('user_wallets')
          .select('*')
          .in('user_id', ids);
        if (!wErr && wallets) {
          walletsMap = wallets.reduce((acc, w) => {
            acc[w.user_id] = w;
            return acc;
          }, {});
        } else if (wErr) console.error('Wallets load error:', wErr);
      }

      setUsers(profiles || []);
      setWalletsByUser(walletsMap);
    } catch (e) {
      console.error('Error loading users:', e);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      return email.includes(q) || phone.includes(q) || name.includes(q) || id.includes(q);
    });
  }, [users, searchQuery]);

  const loadUserTickets = useCallback(async (userId) => {
    try {
      setTicketsLoading(true);
      const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (bErr) throw bErr;
      if (!bookings?.length) {
        setTickets([]);
        return;
      }

      const activityIds = Array.from(new Set(bookings.map((b) => b.activity_id).filter(Boolean)));
      const partnerIds = Array.from(new Set(bookings.map((b) => b.partner_id).filter(Boolean)));

      const activitiesById = {};
      if (activityIds.length > 0) {
        const { data: activities, error: aErr } = await supabase
          .from('activities')
          .select('id, title, name')
          .in('id', activityIds);
        if (!aErr && activities) activities.forEach((a) => (activitiesById[a.id] = a));
      }

      const partnersById = {};
      if (partnerIds.length > 0) {
        const { data: partners, error: pErr } = await supabase
          .from('partners')
          .select('id, business_name, business_name_ar, branch, location')
          .in('id', partnerIds);
        if (!pErr && partners) partners.forEach((p) => (partnersById[p.id] = p));
      }

      const enriched = bookings.map((b) => ({
        ...b,
        _activity: activitiesById[b.activity_id] || null,
        _partner: partnersById[b.partner_id] || null,
      }));

      setTickets(enriched);
    } catch (err) {
      console.error('loadUserTickets error:', err);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const loadUserLogs = useCallback(async (userId) => {
    try {
      setLogsLoading(true);
      const { data, error } = await supabase
        .from('admin_action_logs')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActionLogs(data || []);
    } catch (e) {
      console.error('loadUserLogs error:', e);
      setActionLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      preferred_language: user.preferred_language || 'en',
      city: user.city || '',
      status: user.status || 'active',
      new_password: '',
    });
    setShowUserDetails(true);
    await Promise.all([loadUserTickets(user.id), loadUserLogs(user.id)]);
  };

  /* ========= User CRUD / Wallet / Points ========= */

  const handleAddUser = async () => {
    const { full_name, email, phone, password, preferred_language, city } = userForm;
    if (!full_name || !email || !password) {
      alert('Please fill all required fields (name, email, password)');
      return;
    }
    try {
      const { data: created, error: aErr } = await adminCreateUser({
        email,
        password,
        userMeta: { full_name, phone, preferred_language, city },
      });
      if (aErr) throw aErr;

      const authUser = created?.user;
      if (!authUser?.id) throw new Error('Auth user not created');

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: authUser.id,
        action: 'create_user',
        note: `User created: ${full_name} (${email})`,
      });

      setShowAddUser(false);
      setUserForm({ ...defaultUserForm });
      await loadUsers();
      
      // Show appropriate message based on email confirmation status
      if (created?.user?.email_confirmed_at) {
        alert('User created successfully!');
      } else {
        alert('User created successfully! Email confirmation required.');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !editForm) return;
    try {
      const { full_name, email, phone, preferred_language, city, status, new_password } = editForm;

      const { error: pErr } = await supabase
        .from('profiles')
        .update({
          email,
          name: full_name,
          phone,
          preferred_language,
          city,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);
      if (pErr) throw pErr;

      let note = 'Profile updated';
      if (new_password && new_password.trim().length >= 6) {
        const { error: pwErr } = await adminUpdateUserPassword(selectedUser.id, new_password.trim());
        if (pwErr) {
          // Show warning but don't fail the entire update
          alert('Profile updated successfully, but password change failed: ' + pwErr.message);
        } else {
          note += ' + password changed';
        }
      }

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser.id,
        action: 'update_user',
        note,
      });

      await loadUsers();
      const { data: updated } = await supabase.from('profiles').select('*').eq('id', selectedUser.id).single();
      setSelectedUser(updated);
      alert('User updated successfully');
    } catch (err) {
      console.error('handleUpdateUser error:', err);
      alert(err.message || 'Failed to update user');
    }
  };

  const handleAccountStatus = async (newStatus, note) => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedUser.id);
      if (error) throw error;

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser.id,
        action: `account_${newStatus}`,
        note: note || '',
      });

      await loadUsers();
      const { data: updated } = await supabase.from('profiles').select('*').eq('id', selectedUser.id).single();
      setSelectedUser(updated);
      alert(`Account ${newStatus}`);
    } catch (err) {
      console.error('handleAccountStatus error:', err);
      alert('Failed to update account status');
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedUser) return;

    const ok = await confirm({
      title: 'Delete Account',
      message: 'Are you sure you want to delete this user account? This action cannot be undone.',
    });
    if (!ok) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', selectedUser.id);
      if (error) throw error;

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser.id,
        action: 'delete_account',
        note: 'Account deleted by admin',
      });

      setShowUserDetails(false);
      setSelectedUser(null);
      await loadUsers();
      alert('Account deleted');
    } catch (err) {
      console.error('handleDeleteAccount error:', err);
      alert('Failed to delete account (ensure FK constraints and cascades are set properly)');
    }
  };

  const handleWalletAction = async () => {
    if (!selectedUser || !walletForm.amount) {
      alert('Please fill all required fields');
      return;
    }

    const amount = toNumber(walletForm.amount);
    if (amount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    const isAdd = walletForm.action === 'add';

    try {
      const { error: tErr } = await supabase.from('wallet_transactions').insert([
        {
          user_id: selectedUser.id,
          amount: isAdd ? amount : -amount,
          transaction_type: isAdd ? 'add' : 'deduct',
          description: walletForm.description || null,
        },
      ]);
      if (tErr) throw tErr;

      const wallet = walletsByUser[selectedUser.id];
      const prevBalance = toNumber(wallet?.balance || 0);
      const newBalance = isAdd ? prevBalance + amount : prevBalance - amount;

      const updates = {
        balance: newBalance,
        updated_at: new Date().toISOString(),
      };
      if (isAdd) {
        updates.total_earned = toNumber(wallet?.total_earned || 0) + amount;
      } else {
        updates.total_spent = toNumber(wallet?.total_spent || 0) + amount;
      }

      const { error: wErr } = await supabase.from('user_wallets').update(updates).eq('user_id', selectedUser.id);
      if (wErr) throw wErr;

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser.id,
        action: isAdd ? 'wallet_add' : 'wallet_deduct',
        note: walletForm.description || `Wallet ${isAdd ? 'credited' : 'debited'}: ${amount}`,
      });

      setWalletForm({ ...defaultWalletForm });
      await loadUsers();
      alert(`Wallet ${isAdd ? 'credited' : 'debited'} successfully!`);
    } catch (error) {
      console.error('Error updating wallet:', error);
      alert('Failed to update wallet');
    }
  };

  const handlePointsAction = async () => {
    if (!selectedUser || !pointsForm.points) {
      alert('Please enter points');
      return;
    }
    const delta = toNumber(pointsForm.points);
    if (delta <= 0) {
      alert('Points must be greater than 0');
      return;
    }
    const isAdd = pointsForm.action === 'add';
    const signed = isAdd ? delta : -delta;

    try {
      const currentPoints = toNumber(selectedUser.points || 0);
      const newPoints = currentPoints + signed;

      const { error: pErr } = await supabase
        .from('profiles')
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', selectedUser.id);
      if (pErr) throw pErr;

      const { error: tErr } = await supabase.from('wallet_transactions').insert([
        {
          user_id: selectedUser.id,
          amount: signed,
          transaction_type: isAdd ? 'points_add' : 'points_deduct',
          description: pointsForm.description || null,
        },
      ]);
      if (tErr) console.warn('points transaction log error (optional):', tErr);

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser.id,
        action: isAdd ? 'points_add' : 'points_deduct',
        note: pointsForm.description || `Points ${isAdd ? 'added' : 'deducted'}: ${delta}`,
      });

      const { data: updated } = await supabase.from('profiles').select('*').eq('id', selectedUser.id).single();
      setSelectedUser(updated);
      setPointsForm({ ...defaultPointsForm });
      alert('Points updated');
    } catch (err) {
      console.error('handlePointsAction error:', err);
      alert('Failed to update points');
    }
  };

  /* ========= Ticket actions ========= */

  const handleTicketStatusChange = async (ticket, newStatus, note) => {
    try {
      const patch = {
        ticket_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'used' && !ticket.used_at) {
        patch.used_at = new Date().toISOString();
        patch.is_used = true;
        patch.used_by = currentAdmin?.name || 'system';
      }
      if (newStatus !== 'used') {
        patch.is_used = newStatus === 'used';
      }

      const { error } = await supabase.from('bookings').update(patch).eq('id', ticket.id);
      if (error) throw error;

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser?.id,
        action: 'ticket_status_change',
        note: note || `Status: ${ticket.ticket_status} -> ${newStatus} (booking ${ticket.booking_number})`,
      });

      await loadUserTickets(selectedUser.id);
      alert('Ticket status updated');
    } catch (err) {
      console.error('handleTicketStatusChange error:', err);
      alert('Failed to update ticket status');
    }
  };

  const handleExtendTicket = async (ticket, newExpiry, note) => {
    if (!newExpiry) {
      alert('Please select a new expiry date/time');
      return;
    }
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ expiry_date: new Date(newExpiry).toISOString(), updated_at: new Date().toISOString() })
        .eq('id', ticket.id);
      if (error) throw error;

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser?.id,
        action: 'ticket_extend_expiry',
        note: note || `Extended expiry to ${new Date(newExpiry).toLocaleString()} (booking ${ticket.booking_number})`,
      });

      await loadUserTickets(selectedUser.id);
      alert('Ticket expiry extended');
    } catch (err) {
      console.error('handleExtendTicket error:', err);
      alert('Failed to extend expiry');
    }
  };

  const handleCancelTicketAndRefund = async (ticket, note) => {
    const ok = await confirm({
      title: 'Cancel Ticket & Refund',
      message: `Cancel booking ${ticket.booking_number} and refund ${ticket.total_amount} to wallet?`,
      confirmText: 'Cancel & Refund',
    });
    if (!ok) return;

    try {
      const { error: bErr } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          ticket_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentAdmin?.id || null,
          refunded_amount: toNumber(ticket.total_amount || 0),
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);
      if (bErr) throw bErr;

      const refundAmount = toNumber(ticket.total_amount || 0);
      if (refundAmount > 0) {
        const wallet = walletsByUser[selectedUser.id];
        const prevBalance = toNumber(wallet?.balance || 0);
        const newBalance = prevBalance + refundAmount;

        const { error: tErr } = await supabase.from('wallet_transactions').insert([
          {
            user_id: selectedUser.id,
            amount: refundAmount,
            transaction_type: 'refund',
            description: `Refund for booking ${ticket.booking_number}`,
          },
        ]);
        if (tErr) throw tErr;

        const { error: wErr } = await supabase
          .from('user_wallets')
          .update({
            balance: newBalance,
            total_earned: toNumber(wallet?.total_earned || 0) + refundAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', selectedUser.id);
        if (wErr) throw wErr;
      }

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser?.id,
        action: 'ticket_cancel_refund',
        note: note || `Cancelled booking ${ticket.booking_number}, refunded ${ticket.total_amount}`,
      });

      await Promise.all([loadUserTickets(selectedUser.id), loadUsers(), loadUserLogs(selectedUser.id)]);
      alert('Ticket cancelled and refunded to wallet');
    } catch (err) {
      console.error('handleCancelTicketAndRefund error:', err);
      alert('Failed to cancel and refund');
    }
  };

  const handleCancelTicketNoRefund = async (ticket) => {
    const ok = await confirm({
      title: 'Cancel Ticket (No Refund)',
      message: `Cancel booking ${ticket.booking_number} without refund? This cannot be undone.`,
      confirmText: 'Cancel Ticket',
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
        .eq('id', ticket.id);
      if (error) throw error;

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser?.id,
        action: 'ticket_cancel_no_refund',
        note: `Cancelled booking ${ticket.booking_number} without refund`,
      });

      await Promise.all([loadUserTickets(selectedUser.id), loadUserLogs(selectedUser.id)]);
      alert('Ticket cancelled without refund');
    } catch (e) {
      console.error('handleCancelTicketNoRefund error:', e);
      alert('Failed to cancel ticket');
    }
  };

  const handleTransferTicket = async ({ mode, email, userId, note }) => {
    const ticket = transferModalTicket;
    if (!ticket) return;

    if (ticket.ticket_status === 'cancelled' || ticket.is_used) {
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
          .select('id, email, name, full_name')
          .eq('email', targetEmail)
          .single();
        if (pErr || !targetProfile?.id) {
          alert('Recipient not found by email.');
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

      if (targetUserId === selectedUser.id) {
        alert('Ticket is already owned by this user.');
        return;
      }

      const ok = await confirm({
        title: 'Transfer Ticket',
        message: `Transfer booking ${ticket.booking_number} to user ${targetUserId}?`,
        confirmText: 'Transfer',
      });
      if (!ok) return;

      const { error: updErr } = await supabase
        .from('bookings')
        .update({
          user_id: targetUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);
      if (updErr) throw updErr;

      await logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: targetUserId,
        action: 'ticket_transfer',
        note:
          note ||
          `Transferred booking ${ticket.booking_number} from ${selectedUser.id} to ${targetUserId}`,
      });

      await Promise.all([loadUserTickets(selectedUser.id), loadUserLogs(selectedUser.id)]);
      setTransferModalTicket(null);
      alert('Ticket transferred successfully.');
    } catch (e) {
      console.error('handleTransferTicket error:', e);
      alert('Failed to transfer ticket');
    }
  };

  /* ========= Ticket PDF Download ========= */

  const handleDownloadTicketPdf = (ticket) => {
    const url = ticket?.ticket_pdf_url?.trim();
    if (!url) {
      alert('Ticket PDF is not available for this booking.');
      return;
    }
    try {
      // Open in a new tab. If you use Supabase Storage with signed URLs, ensure the URL is valid here.
      window.open(url, '_blank', 'noopener,noreferrer');
      // Optional logging
      logAdminAction({
        actorId: currentAdmin?.id,
        actorName: currentAdmin?.name,
        targetUserId: selectedUser?.id,
        action: 'ticket_pdf_download',
        note: `Downloaded PDF for booking ${ticket.booking_number}`,
      });
    } catch (e) {
      console.error('PDF open error:', e);
      alert('Failed to open ticket PDF.');
    }
  };

  /* ========= UI ========= */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600">
            Create, search, edit users, manage wallets, points, and tickets
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddUser(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Add New User
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
            <input
              type="text"
              placeholder="Search by name, email, phone, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            <span className="ml-3 text-gray-600">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-gray-600">No users found</p>
            <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const wallet = walletsByUser[user.id];
            return (
              <div key={user.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user.name || '--'}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        ID: {user.id}
                      </span>
                    </div>
                    <p className="text-gray-600">{user.email}</p>
                    {user.phone && <p className="text-gray-600">Phone: {user.phone}</p>}
                    <div className="flex flex-wrap gap-4 text-gray-600 mt-1">
                      <span>Language: {user.preferred_language || 'en'}</span>
                      <span>City: {user.city || '--'}</span>
                      <span>Status: {user.status || 'active'}</span>
                      <span>Wallet: {toNumber(wallet?.balance || 0)} JOD</span>
                      <span>Points: {toNumber(user.points || 0)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Joined: {fmtDate(user.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openUserDetails(user)}
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

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={userForm.preferred_language}
                  onChange={(e) => setUserForm({ ...userForm, preferred_language: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={userForm.city}
                  onChange={(e) => setUserForm({ ...userForm, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && editForm && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto z-50">
          <div className="min-h-full flex items-start justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
                  <div className="text-sm text-gray-500 mt-1">User ID: {selectedUser.id}</div>
                </div>
                <button onClick={() => setShowUserDetails(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Information and Edit */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 border rounded-md p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Language</label>
                        <select
                          value={editForm.preferred_language}
                          onChange={(e) => setEditForm({ ...editForm, preferred_language: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="en">English</option>
                          <option value="ar">Arabic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="active">Active</option>
                          <option value="blocked">Blocked</option>
                          <option value="deactivated">Deactivated</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Change Password (min 6 chars)</label>
                        <input
                          type="password"
                          value={editForm.new_password}
                          onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter new password"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        onClick={handleUpdateUser}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => handleAccountStatus('blocked', 'Account blocked')}
                        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                      >
                        Block Account
                      </button>
                      <button
                        onClick={() => handleAccountStatus('deactivated', 'Account deactivated')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Deactivate
                      </button>
                      <button
                        onClick={() => handleAccountStatus('active', 'Account activated')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Activate
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>

                  {/* Tickets */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Tickets</h3>
                    {ticketsLoading ? (
                      <div className="text-gray-600">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                      <div className="text-gray-600">No tickets found</div>
                    ) : (
                      <div className="space-y-4">
                        {tickets.map((t) => {
                          const activityName = t._activity?.title || t._activity?.name || '--';
                          const branch = t._partner?.business_name || t._partner?.branch || '--';
                          const location = t._partner?.location || '--';
                          const canTransfer = (t.ticket_status !== 'cancelled') && !t.is_used;
                          return (
                            <div key={t.id} className="border rounded-md p-4">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    #{t.booking_number} — {activityName}
                                  </div>
                                  <div className="text-sm text-gray-600">Branch: {branch} · Location: {location}</div>
                                  <div className="text-sm text-gray-600">
                                    Ticket: {t.ticket_type} · Qty: {t.quantity} · Unit: {t.unit_price} · Total: {t.total_amount}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Purchase: {fmtDate(t.created_at)} · Scheduled: {fmtDate(t.scheduled_date)}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Status: {t.ticket_status || 'active'} · Payment: {t.payment_method}
                                    {t.promo_code_used ? ` · Promo: ${t.promo_code_used}` : ''}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Expiry: {fmtDate(t.expiry_date)}
                                    {t.is_used ? ` · Used at: ${fmtDate(t.used_at)} by ${t.used_by || 'system'}` : ''}
                                  </div>
                                  {t.qr_code && (
                                    <div className="text-xs text-gray-500 mt-1 break-all">
                                      QR: {t.qr_code.slice(0, 80)}{t.qr_code.length > 80 ? '…' : ''}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {/* Dedicated Download button with validation */}
                                  <button
                                    onClick={() => handleDownloadTicketPdf(t)}
                                    className="px-3 py-1 border rounded-md hover:bg-gray-50"
                                  >
                                    Download Ticket PDF
                                  </button>

                                  <select
                                    className="px-2 py-1 border rounded-md"
                                    value={t.ticket_status || 'active'}
                                    onChange={(e) => handleTicketStatusChange(t, e.target.value)}
                                  >
                                    {ticketStatusOptions.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>

                                  <ExtendExpiryButton
                                    onExtend={(newExpiry, note) => handleExtendTicket(t, newExpiry, note)}
                                  />

                                  {canTransfer && (
                                    <button
                                      onClick={() => setTransferModalTicket(t)}
                                      className="px-3 py-1 border rounded-md hover:bg-gray-50"
                                    >
                                      Transfer Ticket
                                    </button>
                                  )}

                                  {t.ticket_status !== 'cancelled' && (
                                    <>
                                      <button
                                        onClick={() => handleCancelTicketAndRefund(t)}
                                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                                      >
                                        Cancel & Refund
                                      </button>
                                      <button
                                        onClick={() => handleCancelTicketNoRefund(t)}
                                        className="px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                                      >
                                        Cancel (No Refund)
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action History */}
                  <div className="mt-8">
                    {logsLoading ? (
                      <div className="text-gray-600">Loading action history...</div>
                    ) : (
                      <ActionHistory logs={actionLogs} />
                    )}
                  </div>

                  <div className="mt-8 text-sm text-gray-500">
                    All actions are automatically logged to admin_action_logs with the current admin info if provided.
                  </div>
                </div>

                {/* Wallet and Points */}
                <div>
                  <div className="bg-gray-50 border rounded-md p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Wallet</h3>
                    <div className="space-y-3">
                      <div className="text-gray-700">
                        Current Balance: {toNumber(walletsByUser[selectedUser.id]?.balance || 0)} JOD
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                        <select
                          value={walletForm.action}
                          onChange={(e) => setWalletForm({ ...walletForm, action: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="add">Add to Wallet</option>
                          <option value="deduct">Deduct from Wallet</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (JOD)</label>
                        <input
                          type="number"
                          value={walletForm.amount}
                          onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={walletForm.description}
                          onChange={(e) => setWalletForm({ ...walletForm, description: e.target.value })}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <button
                        onClick={handleWalletAction}
                        className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
                      >
                        {walletForm.action === 'add' ? 'Add to Wallet' : 'Deduct from Wallet'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 border rounded-md p-4 mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Points</h3>
                    <div className="space-y-3">
                      <div className="text-gray-700">Current Points: {toNumber(selectedUser.points || 0)}</div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                        <select
                          value={pointsForm.action}
                          onChange={(e) => setPointsForm({ ...pointsForm, action: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="add">Add Points</option>
                          <option value="deduct">Deduct Points</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                        <input
                          type="number"
                          value={pointsForm.points}
                          onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={pointsForm.description}
                          onChange={(e) => setPointsForm({ ...pointsForm, description: e.target.value })}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <button
                        onClick={handlePointsAction}
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                      >
                        {pointsForm.action === 'add' ? 'Add Points' : 'Deduct Points'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfer Modal */}
              <TransferTicketModal
                open={!!transferModalTicket}
                ticket={transferModalTicket}
                onClose={() => setTransferModalTicket(null)}
                onTransfer={handleTransferTicket}
              />
            </div>
          </div>
        </div>
      )}

      {/* Render the global ConfirmDialog once */}
      <ConfirmDialog />
    </div>
  );
};

export default UsersManagementPage;
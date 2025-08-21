import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const HomePage = () => {
  const [statistics, setStatistics] = useState({
    dailyTicketSales: 0,
    totalUsers: 0,
    newUsers: 0,
    totalTicketsSold: 0,
    totalSalesAmount: 0,
    activeTicketsCount: 0,
    usedTicketsCount: 0,
    appDownloads: 0,
    dailyAppLogins: 0,
    totalActivities: 0,
    hiddenActivities: 0,
  });
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('super_admin');
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    fetchStatistics();
  }, [dateRange]);

  const checkSession = async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }

      if (!session) {
        navigate('/login');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role || 'super_admin';
        setUserRole(role);
      }

    } catch (error) {
      console.error('Error checking session:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (event === 'SIGNED_IN') {
        await checkSession();
      }
    });

    return () => {
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, [navigate]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      const { data: statsData, error: statsError } = await supabase
        .from('app_statistics')
        .select('*')
        .order('date', { ascending: false })
        .limit(1);

      if (statsError) {
        console.error('Error fetching statistics:', statsError);
        return;
      }

      if (statsData && statsData.length > 0) {
        const latestStats = statsData[0];
        setStatistics({
          dailyTicketSales: latestStats.daily_ticket_sales || 0,
          totalUsers: latestStats.total_users || 0,
          newUsers: latestStats.new_users || 0,
          totalTicketsSold: latestStats.total_tickets_sold || 0,
          totalSalesAmount: latestStats.total_sales_amount || 0,
          activeTicketsCount: latestStats.active_tickets_count || 0,
          usedTicketsCount: latestStats.used_tickets_count || 0,
          appDownloads: latestStats.app_downloads || 0,
          dailyAppLogins: latestStats.daily_app_logins || 0,
          totalActivities: latestStats.total_activities || 0,
          hiddenActivities: latestStats.hidden_activities || 0,
        });
      }

      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select('id', { count: 'exact' });

      if (!partnersError) {
        setStatistics(prev => ({
          ...prev,
          partnersCount: partnersData?.length || 0,
        }));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, subtitle, color = '#3B82F6' }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="text-3xl opacity-20">📊</div>
      </div>
    </div>
  );

  const ChartCard = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome, {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
        </div>
        <div className="flex space-x-2">
          {userRole === 'super_admin' && (
            <Link 
              to="/home-page-management"
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Manage Home Page
            </Link>
          )}
          <Link
            to="/requests"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            View Requests
          </Link>
          <Link
            to="/bookings"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Bookings
          </Link>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Daily Ticket Sales" 
          value={statistics.dailyTicketSales} 
          subtitle="Today's sales"
          color="#3B82F6"
        />
        <MetricCard 
          title="Total Users" 
          value={statistics.totalUsers} 
          subtitle="Registered users"
          color="#10B981"
        />
        <MetricCard 
          title="New Users" 
          value={statistics.newUsers} 
          subtitle="Today's registrations"
          color="#F59E0B"
        />
        <MetricCard 
          title="Total Sales" 
          value={`$${statistics.totalSalesAmount.toLocaleString()}`} 
          subtitle="Total revenue"
          color="#EF4444"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Active Tickets" 
          value={statistics.activeTicketsCount} 
          subtitle="Valid tickets"
          color="#8B5CF6"
        />
        <MetricCard 
          title="Used Tickets" 
          value={statistics.usedTicketsCount} 
          subtitle="Redeemed tickets"
          color="#06B6D4"
        />
        <MetricCard 
          title="App Downloads" 
          value={statistics.appDownloads} 
          subtitle="Total downloads"
          color="#84CC16"
        />
        <MetricCard 
          title="Daily Logins" 
          value={statistics.dailyAppLogins} 
          subtitle="Today's logins"
          color="#F97316"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Daily Ticket Sales Trend">
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-gray-600">Chart placeholder</p>
              <p className="text-sm text-gray-500">Daily ticket sales visualization</p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="User Activity">
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <div className="text-center">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-gray-600">Chart placeholder</p>
              <p className="text-sm text-gray-500">User activity over time</p>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Activities Overview">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Activities</span>
              <span className="font-semibold">{statistics.totalActivities}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Hidden Activities</span>
              <span className="font-semibold text-orange-600">{statistics.hiddenActivities}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Partners</span>
              <span className="font-semibold">{statistics.partnersCount || 0}</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Quick Actions">
          <div className="space-y-3">
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors">
              Add New Activity
            </button>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              Send Notification
            </button>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
              View Reports
            </button>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default HomePage;
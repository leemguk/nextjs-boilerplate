'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MultiFormatUpload from '../components/MultiFormatUpload';
import EmailSettingsComponent from '../components/EmailSettingsComponent';

interface Customer {
  name: string;
  email: string;
  orderNumber?: string;
}

interface ActivityItem {
  id: string;
  customerName: string;
  customerEmail: string;
  event: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam';
  timestamp: string;
  timeAgo: string;
  platform?: string;
}

interface AnalyticsData {
  emailsSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam: number;
  failed: number;
  monthlyLimit: number;
  monthlyEmails: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  usagePercentage: number;
  timeRange: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showSettings, setShowSettings] = useState(false);
  
  // Analytics state with real API integration
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    emailsSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    spam: 0,
    failed: 0,
    monthlyLimit: 1000,
    monthlyEmails: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    usagePercentage: 0,
    timeRange: '30d'
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }
    
    setUser(JSON.parse(userData));
    
    // Fetch analytics data
    fetchAnalytics();
    fetchRecentActivity();
  }, [router]);

  // Refetch analytics when time range changes
  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/analytics/stats?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
      } else {
        console.error('Failed to fetch analytics:', result.error);
        setMessage('❌ Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setMessage('❌ Error connecting to analytics service');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    setActivityLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/analytics/activity?limit=6`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Transform the data to match your existing format
        const transformedActivity = result.data.map((activity: any) => ({
          id: activity.id,
          customerName: activity.customerName,
          customerEmail: activity.customerEmail,
          event: activity.status.toLowerCase(), // Convert DELIVERED to delivered
          timestamp: activity.updatedAt,
          timeAgo: activity.timeAgo,
          platform: activity.platform
        }));
        
        setRecentActivity(transformedActivity);
      } else {
        console.error('Failed to fetch activity:', result.error);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const calculateRate = (numerator: number, denominator: number): string => {
    if (denominator === 0) return '0%';
    return ((numerator / denominator) * 100).toFixed(1) + '%';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleCustomersImported = (newCustomers: Customer[]) => {
  setActiveTab('manual');
  const customerText = newCustomers.map(c => {
    if (c.orderNumber) {
      return `${c.name}, ${c.email}, ${c.orderNumber}`;
    }
    return `${c.name}, ${c.email}`;
  }).join('\n');
  setCustomers(customerText);
  setMessage(`✅ Successfully imported ${newCustomers.length} customers from file!`);
};

  const handleSendEmails = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setMessage('');

  try {
    let customerList: Customer[] = [];

    if (customers.trim()) {
      const customerLines = customers.trim().split('\n');
      customerList = customerLines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const [name, email, orderNumber] = parts;
        return { 
          name, 
          email,
          orderNumber: orderNumber || undefined // Include order number if present
        };
      }).filter(customer => customer.name && customer.email);
    }

      if (customerList.length === 0) {
        setMessage('Please enter valid customer data or import from a file');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          customers: customerList,
          templateId: 1,
          reviewPlatformId: 1,
          campaignName: `Campaign ${new Date().toLocaleDateString()}`
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ ${result.data.sent} emails sent successfully!`);
        setCustomers('');
        
        // Refresh analytics after sending emails
        setTimeout(() => {
          fetchAnalytics();
          fetchRecentActivity();
        }, 1000);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Failed to send emails');
      console.error('Send emails error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventBadge = (event: string) => {
    const badges = {
      delivered: { text: 'Email Delivered', class: 'bg-blue-100 text-blue-800' },
      opened: { text: 'Opened Email', class: 'bg-green-100 text-green-800' },
      clicked: { text: 'Clicked Link', class: 'bg-purple-100 text-purple-800' },
      bounced: { text: 'Email Bounced', class: 'bg-red-100 text-red-800' },
      spam: { text: 'Marked Spam', class: 'bg-orange-100 text-orange-800' }
    };
    
    const badge = badges[event as keyof typeof badges];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📧</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Review Requester</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user.firstName}</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        alert('Help documentation coming soon!');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Help & Support
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
  
  {/* Emails Sent */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-500">Emails Sent</h3>
      <span className="text-gray-400">📧</span>
    </div>
    {analyticsLoading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    ) : (
      <>
        <p className="text-2xl font-bold text-gray-900">{analytics.emailsSent}</p>
        <p className="text-xs text-gray-500 mt-1">
          {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
        </p>
      </>
    )}
  </div>

  {/* Delivery Rate */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-500">Delivery Rate</h3>
      <span className="text-gray-400">📈</span>
    </div>
    {analyticsLoading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    ) : (
      <>
        <p className="text-2xl font-bold text-gray-900">
          {analytics.deliveryRate}%
        </p>
        <p className="text-xs text-gray-500 mt-1">
         {analytics.delivered} of {analytics.emailsSent} delivered
        </p>
      </>
    )}
  </div>

  {/* Link Clicks - Updated text to emphasize importance */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-500">Review Link Clicks</h3>
      <span className="text-gray-400">🔗</span>
    </div>
    {analyticsLoading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    ) : (
      <>
        <p className="text-2xl font-bold text-gray-900">
          {analytics.clickRate}%
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {analytics.clicked} customers clicked review link
        </p>
      </>
    )}
  </div>

</div>

          {/* Second Row Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Bounces</h3>
                <span className="text-orange-400">⚠️</span>
              </div>
              {analyticsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{analytics.bounced}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {calculateRate(analytics.bounced, analytics.emailsSent)} bounce rate
                  </p>
                </>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Spam Reports</h3>
                <span className="text-red-400">🚫</span>
              </div>
              {analyticsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{analytics.spam}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {calculateRate(analytics.spam, analytics.emailsSent)} spam rate
                  </p>
                </>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Monthly Usage</h3>
                <span className="text-blue-400">📊</span>
              </div>
              {analyticsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.monthlyEmails}/{analytics.monthlyLimit}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(analytics.usagePercentage, 100)}%` }}
                    ></div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Add Customers Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Add Customers</h3>
                  <p className="text-sm text-gray-500 mt-1">Add customers to send review requests</p>
                </div>
                
                <div className="p-6">
                  {/* Tab Selection */}
                  <div className="flex mb-6">
                    <button
                      onClick={() => setActiveTab('manual')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeTab === 'manual'
                          ? 'border-blue-600 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Manual Entry
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ml-8 ${
                        activeTab === 'upload'
                          ? 'border-blue-600 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Import File
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'manual' ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Enter one customer per line in format: Name, Email<br/>
                        Example: John Doe, john@example.com
                      </p>
                      <textarea
                        value={customers}
                        onChange={(e) => setCustomers(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com&#10;Bob Johnson, bob@example.com"
                      />
                      <button
                        onClick={(e) => handleSendEmails(e)}
                        disabled={loading || !customers.trim()}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {loading ? 'Sending...' : 'Send Emails'}
                      </button>
                    </div>
                  ) : (
                    <MultiFormatUpload onCustomersImported={handleCustomersImported} />
                  )}

                  {message && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${
                      message.includes('✅')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Account Status</h3>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Platform</span>
                    <span className="text-sm font-medium text-gray-900">Trustpilot</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Plan</span>
                    <span className="text-sm font-medium text-gray-900">Internal Use</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Monthly emails</span>
                      {analyticsLoading ? (
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {analytics.monthlyEmails}/{analytics.monthlyLimit}
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${analyticsLoading ? 0 : Math.min(analytics.usagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <button className="w-full mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                    ↗️ Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                <p className="text-sm text-gray-500 mt-1">Latest email tracking events from SendGrid</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {activityLoading ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-6 animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-48"></div>
                        </div>
                        <div className="w-20 h-6 bg-gray-200 rounded"></div>
                        <div className="w-16 h-4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))
                ) : recentActivity.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>No recent activity</p>
                    <p className="text-sm">Activity will appear here after sending emails</p>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="p-6 flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-600">
                          {activity.customerName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.customerName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {activity.customerEmail}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getEventBadge(activity.event)}
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {activity.timeAgo}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <EmailSettingsComponent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

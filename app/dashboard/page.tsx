'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MultiFormatUpload from '../components/MultiFormatUpload';

interface Customer {
  name: string;
  email: string;
}

interface ActivityItem {
  id: string;
  customerName: string;
  customerEmail: string;
  event: 'delivered' | 'opened' | 'clicked' | 'bounced';
  timestamp: string;
  timeAgo: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    emailsSent: 45,
    delivered: 44,
    opened: 30,
    clicked: 13,
    bounced: 1,
    spam: 0,
    monthlyLimit: 100
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    {
      id: '1',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      event: 'clicked',
      timestamp: '2025-06-06T10:00:00Z',
      timeAgo: '2 hours ago'
    },
    {
      id: '2',
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah@example.com',
      event: 'opened',
      timestamp: '2025-06-06T09:00:00Z',
      timeAgo: '3 hours ago'
    },
    {
      id: '3',
      customerName: 'Michael Brown',
      customerEmail: 'michael@example.com',
      event: 'delivered',
      timestamp: '2025-06-06T08:00:00Z',
      timeAgo: '4 hours ago'
    },
    {
      id: '4',
      customerName: 'Emily Davis',
      customerEmail: 'emily@example.com',
      event: 'clicked',
      timestamp: '2025-06-06T07:00:00Z',
      timeAgo: 'Yesterday'
    },
    {
      id: '5',
      customerName: 'Robert Wilson',
      customerEmail: 'robert@invalid-domain.com',
      event: 'bounced',
      timestamp: '2025-06-05T15:00:00Z',
      timeAgo: 'Yesterday'
    },
    {
      id: '6',
      customerName: 'Lisa Anderson',
      customerEmail: 'lisa@example.com',
      event: 'opened',
      timestamp: '2025-06-05T14:00:00Z',
      timeAgo: '2 days ago'
    }
  ]);

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
  }, [router]);

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
    const customerText = newCustomers.map(c => `${c.name}, ${c.email}`).join('\n');
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
          const [name, email] = line.split(',').map(s => s.trim());
          return { name, email };
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
        
        // Update analytics
        setAnalytics(prev => ({
          ...prev,
          emailsSent: prev.emailsSent + result.data.sent
        }));
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
      bounced: { text: 'Email Bounced', class: 'bg-red-100 text-red-800' }
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
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <span className="text-lg">❓</span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <span className="text-lg">⚙️</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <span className="text-sm font-medium">{user.firstName}</span>
                  <span className="text-gray-400">▼</span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
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
            <button
              onClick={() => {
                if (customers.trim()) {
                  handleSendEmails({ preventDefault: () => {} } as React.FormEvent);
                } else {
                  setMessage('Please add customers before sending emails');
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              📧 Send Review Requests
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Emails Sent</h3>
                <span className="text-gray-400">📧</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics.emailsSent}</p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Delivery Rate</h3>
                <span className="text-gray-400">📈</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {calculateRate(analytics.delivered, analytics.emailsSent)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.delivered} of {analytics.emailsSent} delivered
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Email Opens</h3>
                <span className="text-gray-400">📖</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {calculateRate(analytics.opened, analytics.delivered)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.opened} of {analytics.delivered} opened
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Link Clicks</h3>
                <span className="text-gray-400">🔗</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {calculateRate(analytics.clicked, analytics.opened)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.clicked} of {analytics.opened} clicked
              </p>
            </div>
          </div>

          {/* Second Row Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Bounces</h3>
                <span className="text-orange-400">⚠️</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics.bounced}</p>
              <p className="text-xs text-gray-500 mt-1">
                {calculateRate(analytics.bounced, analytics.emailsSent)} bounce rate
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Spam Reports</h3>
                <span className="text-red-400">🚫</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics.spam}</p>
              <p className="text-xs text-gray-500 mt-1">
                {calculateRate(analytics.spam, analytics.emailsSent)} spam rate
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Monthly Usage</h3>
                <span className="text-blue-400">📊</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.emailsSent}/{analytics.monthlyLimit}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(analytics.emailsSent / analytics.monthlyLimit) * 100}%` }}
                ></div>
              </div>
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
                        {loading ? 'Adding...' : '+ Add Customers'}
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
                    <span className="text-sm font-medium text-gray-900">Free Trial</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Monthly emails</span>
                      <span className="text-sm font-medium text-gray-900">
                        {analytics.emailsSent}/{analytics.monthlyLimit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(analytics.emailsSent / analytics.monthlyLimit) * 100}%` }}
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
                {recentActivity.map((activity) => (
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
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

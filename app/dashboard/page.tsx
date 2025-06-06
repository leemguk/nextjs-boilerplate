'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleSendEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Parse customer data
      const customerLines = customers.trim().split('\n');
      const customerList = customerLines.map(line => {
        const [name, email] = line.split(',').map(s => s.trim());
        return { name, email };
      }).filter(customer => customer.name && customer.email);

      if (customerList.length === 0) {
        setMessage('Please enter valid customer data');
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
        setCustomers(''); // Clear the form
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Review Requester</h1>
              <p className="text-gray-600">Welcome back, {user.firstName}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Stats Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">📧</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Platform</dt>
                        <dd className="text-lg font-medium text-gray-900">Trustpilot</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Status</dt>
                        <dd className="text-lg font-medium text-gray-900">Active</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">⚡</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Plan</dt>
                        <dd className="text-lg font-medium text-gray-900">Free Trial</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Emails Form */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Send Review Request Emails
                  </h3>
                  
                  <form onSubmit={handleSendEmails}>
                    <div className="mb-4">
                      <label htmlFor="customers" className="block text-sm font-medium text-gray-700 mb-2">
                        Customer List
                      </label>
                      <p className="text-sm text-gray-500 mb-2">
                        Enter one customer per line in format: Name, Email
                      </p>
                      <textarea
                        id="customers"
                        name="customers"
                        rows={8}
                        value={customers}
                        onChange={(e) => setCustomers(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com&#10;Bob Johnson, bob@example.com"
                        required
                      />
                    </div>

                    {message && (
                      <div className={`mb-4 p-3 rounded-md text-sm ${
                        message.includes('✅')
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {message}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Sending...' : 'Send Review Request Emails'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Instructions Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    How to Use
                  </h3>
                  
                  <div className="space-y-4 text-sm text-gray-600">
                    <div>
                      <h4 className="font-medium text-gray-900">1. Add Customers</h4>
                      <p>Enter customer details one per line: Name, Email</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">2. Send Emails</h4>
                      <p>Click send to dispatch Trustpilot review requests</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">3. Track Results</h4>
                      <p>Monitor email delivery and review responses</p>
                    </div>
                  </div>

                  <div className="mt-6 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Currently using:</strong> Trustpilot platform with your default template
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

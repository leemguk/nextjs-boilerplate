'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MultiFormatUpload from '../components/MultiFormatUpload';

interface Customer {
  name: string;
  email: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState('');
  const [importedCustomers, setImportedCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
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

  const handleCustomersImported = (newCustomers: Customer[]) => {
    setImportedCustomers(newCustomers);
    setActiveTab('manual'); // Switch to manual tab to show imported data
    
    // Convert imported customers to text format for the textarea
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

      // Parse customer data from textarea
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
        setCustomers(''); // Clear the form
        setImportedCustomers([]); // Clear imported data
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

            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Import Methods */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Add Customers
                  </h3>
                  
                  {/* Tab Selection */}
                  <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('manual')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'manual'
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      ✏️ Manual Entry
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'upload'
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📁 Import File
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'manual' ? (
                    <div>
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
                      />
                      {importedCustomers.length > 0 && (
                        <p className="mt-2 text-sm text-green-600">
                          ✅ {importedCustomers.length} customers imported from file
                        </p>
                      )}
                    </div>
                  ) : (
                    <MultiFormatUpload onCustomersImported={handleCustomersImported} />
                  )}
                </div>
              </div>

              {/* Send Emails Section */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Send Review Request Emails
                  </h3>

                  <form onSubmit={handleSendEmails}>
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
                      disabled={loading || (!customers.trim() && importedCustomers.length === 0)}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
                      <h4 className="font-medium text-gray-900">📝 Manual Entry</h4>
                      <p>Type customer details: Name, Email (one per line)</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">📁 File Import</h4>
                      <p>Upload CSV, Excel, or import from Google Sheets</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">📧 Send Emails</h4>
                      <p>Review and send Trustpilot review requests</p>
                    </div>
                  </div>

                  <div className="mt-6 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Currently using:</strong> Trustpilot platform with professional templates
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-green-50 rounded-md">
                    <h4 className="font-medium text-green-800 mb-2">✨ Supported Formats:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• CSV files</li>
                      <li>• Excel (.xlsx, .xls)</li>
                      <li>• Google Sheets</li>
                      <li>• Tab-separated files</li>
                    </ul>
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

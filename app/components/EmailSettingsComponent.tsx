'use client';

import { useState, useEffect } from 'react';

interface EmailSettings {
  displayName: string;
  fromEmail: string;
}

export default function EmailSettingsComponent() {
  const [settings, setSettings] = useState<EmailSettings>({
    displayName: '',
    fromEmail: 'charlie.gilbert@ransomspares.co.uk'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Load existing settings when component mounts
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/user/email-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Set default from user data if available
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setSettings(prev => ({
          ...prev,
          displayName: `${user.firstName} ${user.lastName}`
        }));
      }
    }
  };

  const handleSave = async () => {
    if (!settings.displayName.trim()) {
      setMessage('❌ Display name is required');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/user/email-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: settings.displayName.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Email settings saved successfully!');
        setIsEditing(false);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Failed to save settings');
      console.error('Save settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadSettings(); // Reload original settings
    setMessage('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Email Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Configure how your emails appear to customers</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Edit Settings
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Display Name Setting */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
            Display Name
          </label>
          <p className="text-xs text-gray-500 mb-3">
            This is how your name appears to customers when they receive review request emails
          </p>
          {isEditing ? (
            <input
              type="text"
              id="displayName"
              value={settings.displayName}
              onChange={(e) => setSettings({...settings, displayName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Charlie Gilbert"
              maxLength={50}
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
              {settings.displayName || 'Not set'}
            </div>
          )}
        </div>

        {/* From Email (Read-only for now) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Email Address
          </label>
          <p className="text-xs text-gray-500 mb-3">
            All emails will be sent from this authenticated address
          </p>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
            {settings.fromEmail}
            <span className="ml-2 text-xs text-green-600 font-medium">✓ Verified</span>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Email Preview</h4>
          <p className="text-sm text-blue-700">
            Customers will see: <strong>"{settings.displayName || 'Your Name'} &lt;{settings.fromEmail}&gt;"</strong>
          </p>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('✅')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

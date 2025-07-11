'use client';

import { useState } from 'react';

export default function ApiTestPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testGet = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();
      setResult(`GET Success: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`GET Error: ${error}`);
    }
    setLoading(false);
  };

  const testPost = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@ransomspares.co.uk',
          password: 'testpassword'
        }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      const text = await response.text();
      console.log('Response text:', text);
      
      try {
        const data = JSON.parse(text);
        setResult(`POST Response (${response.status}): ${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        setResult(`POST Response (${response.status}): ${text}`);
      }
    } catch (error) {
      setResult(`POST Error: ${error}`);
    }
    setLoading(false);
  };

  const testApiUrl = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    setResult(`NEXT_PUBLIC_API_URL = "${apiUrl}" (type: ${typeof apiUrl})`);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Route Test</h1>
      
      <div className="space-x-4 mb-4">
        <button
          onClick={testGet}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test GET /api/auth/login
        </button>
        
        <button
          onClick={testPost}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Test POST /api/auth/login
        </button>
        
        <button
          onClick={testApiUrl}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Check API URL
        </button>
      </div>
      
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {loading ? 'Loading...' : result}
      </pre>
    </div>
  );
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://144.91.104.237:3001/api_v1'\;

export const api = {
  baseURL: API_BASE_URL,
  
  // Test health endpoint
  async health() {
    const response = await fetch('http://144.91.104.237:3001/health');
    return response.json();
  },
  
  // Auth endpoints
  auth: {
    register: (data: any) => fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    
    login: (data: any) => fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://backendweb-ca9k.onrender.com';
const BASE_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE.replace(/\/$/, '')}/api`;

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const activeBranchId = localStorage.getItem('activeBranchId');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(activeBranchId ? { 'X-Branch-Id': activeBranchId } : {})
  };
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    if (window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeBranchId');
      window.location.href = '/login';
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Sesión expirada o credenciales inválidas');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errMsg = typeof errorData.error === 'string' ? errorData.error : (errorData.message || 'Error en la petición');
    
    if (errMsg.includes('negocio asignado') && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeBranchId');
      window.location.href = '/login';
    }

    throw new Error(errMsg);
  }
  
  return response.json();
};

export const api = {
  get: async (endpoint) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  post: async (endpoint, data) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  put: async (endpoint, data) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  delete: async (endpoint) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(response);
  }
};

export const formatCOP = (amount) => {
  const num = parseFloat(amount);
  const safeNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(safeNum).replace('COP', '$').trim();
};

export const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  const safeNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeNum);
};

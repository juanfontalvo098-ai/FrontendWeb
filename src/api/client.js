const resolveApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return '/api';
};

const API_BASE = resolveApiBase();
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
  get: (endpoint) => fetch(`${BASE_URL}${endpoint}`, { headers: getHeaders(), mode: 'cors' }).then(handleResponse),
  post: (endpoint, data) => fetch(`${BASE_URL}${endpoint}`, { method: 'POST', headers: getHeaders(), mode: 'cors', body: JSON.stringify(data) }).then(handleResponse),
  put: (endpoint, data) => fetch(`${BASE_URL}${endpoint}`, { method: 'PUT', headers: getHeaders(), mode: 'cors', body: JSON.stringify(data) }).then(handleResponse),
  delete: (endpoint) => fetch(`${BASE_URL}${endpoint}`, { method: 'DELETE', headers: getHeaders(), mode: 'cors' }).then(handleResponse),
  getBlob: async (endpoint) => {
    const token = localStorage.getItem('token');
    const activeBranchId = localStorage.getItem('activeBranchId');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(activeBranchId ? { 'X-Branch-Id': activeBranchId } : {})
      },
      mode: 'cors'
    });
    if (!res.ok) {
      let errMsg = 'Error al generar el archivo para descarga';
      try {
        const json = await res.json();
        if (json.error) errMsg = json.error;
      } catch (e) {}
      throw new Error(errMsg);
    }
    return res.blob();
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

export const formatDateTime = (dateInput) => {
  if (!dateInput) return '---';
  try {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
      let str = dateInput.trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        return str;
      }
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
        str = str.replace(' ', 'T') + 'Z';
      }
      date = new Date(str);
    } else {
      date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return String(dateInput);

    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return String(dateInput);
  }
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '---';
  try {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
      let str = dateInput.trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        return str;
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        str = str.replace(' ', 'T');
        if (!str.includes('Z')) str += 'Z';
      }
      date = new Date(str);
    } else {
      date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return String(dateInput);

    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (e) {
    return String(dateInput);
  }
};

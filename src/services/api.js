import axios from 'axios';
import dayjs from 'dayjs';

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
const REQUEST_TIMEOUT = 30000;

// Request queue and rate limiting
let requestQueue = [];
let isProcessingQueue = false;
const REQUEST_DELAY = 100;

// Create axios instance with better error handling
const createApiInstance = (baseURL = API_BASE_URL) => {
  const instance = axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT,
    headers: { 
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('adminData');
        localStorage.removeItem('cashierData');
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// API instances
const api = createApiInstance();

// Request queue processor
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    try {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
      const response = await api(request.config);
      request.resolve(response);
    } catch (error) {
      request.reject(error);
    }
  }
  
  isProcessingQueue = false;
};

// Enhanced request function with queuing
const makeRequest = async (config) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ config, resolve, reject });
    processQueue();
  });
};

// Enhanced response data extractor
const extractResponseData = (response) => {
  if (!response?.data) {
    return null;
  }
  
  const data = response.data;
  
  if (data.success !== undefined && data.data !== undefined) {
    return data.data;
  }
  
  if (data.transactions !== undefined || Array.isArray(data)) {
    return data;
  }
  
  return data;
};

// Enhanced Error handler
const handleApiError = (error) => {
  console.error('API Error Details:', {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
    config: error.config
  });

  if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
    return 'Cannot connect to server. Please check if the backend is running.';
  }
  
  if (error.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  if (error.response?.status === 404) {
    return 'Endpoint not found. Please check if the backend server is running.';
  }
  
  if (error.response?.status === 500) {
    const serverError = error.response?.data;
    if (serverError?.error) {
      if (serverError.error.includes('validation failed')) {
        const fieldErrors = serverError.errors ? Object.values(serverError.errors).map(err => err.message) : [];
        return `Validation failed: ${fieldErrors.join(', ')}`;
      }
      return serverError.error;
    }
    return 'Server error. Please try again later.';
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

// Cache for frequently requested data
const cache = {
  data: {},
  timestamps: {},
  get: (key) => {
    const item = cache.data[key];
    const timestamp = cache.timestamps[key];
    if (item && timestamp && Date.now() - timestamp < 30000) {
      return item;
    }
    return null;
  },
  set: (key, data) => {
    cache.data[key] = data;
    cache.timestamps[key] = Date.now();
  },
  clear: (key) => {
    delete cache.data[key];
    delete cache.timestamps[key];
  },
  clearAll: () => {
    cache.data = {};
    cache.timestamps = {};
  }
};

// ==================== ENHANCED TRANSACTION API ====================

export const transactionAPI = {
  // Basic CRUD operations
  create: async (transactionData) => {
    try {
      console.log('💰 Creating transaction:', transactionData);
      const response = await makeRequest({
        method: 'post',
        url: '/transactions',
        data: transactionData
      });
      
      const result = extractResponseData(response);
      cache.clearAll();
      console.log('✅ Transaction created successfully');
      return result;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  getAll: async (params = {}) => {
    try {
      console.log('📊 Fetching transactions...', params);
      
      const cacheKey = `transactions_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached transactions');
        return cached;
      }
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions',
        params
      });
      
      const data = extractResponseData(response);
      const result = Array.isArray(data) ? data : [];
      
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      
      const cacheKey = `transactions_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached transactions due to error');
        return cached;
      }
      
      throw new Error(handleApiError(error));
    }
  },

  getById: async (id) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: `/transactions/${id}`
      });
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  update: async (id, data) => {
    try {
      const response = await makeRequest({
        method: 'put',
        url: `/transactions/${id}`,
        data
      });
      
      cache.clearAll();
      return extractResponseData(response);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  delete: async (id) => {
    try {
      const response = await makeRequest({
        method: 'delete',
        url: `/transactions/${id}`
      });
      
      cache.clearAll();
      return extractResponseData(response);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  // NEW: Get shop performance data
  getShopPerformance: async (shopId, params = {}) => {
    try {
      console.log(`📊 Fetching shop performance for: ${shopId}`);
      
      const response = await makeRequest({
        method: 'get',
        url: `/transactions/shop-performance/${shopId}`,
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching shop performance:', error);
      throw new Error(handleApiError(error));
    }
  },

  // NEW: Get comprehensive sales data
  getSalesAll: async (params = {}) => {
    try {
      console.log('📈 Fetching comprehensive sales data...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/sales/all',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching comprehensive sales data:', error);
      throw new Error(handleApiError(error));
    }
  },

  // NEW: Get enhanced transactions
  getEnhanced: async (params = {}) => {
    try {
      console.log('🔍 Fetching enhanced transactions...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/enhanced',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching enhanced transactions:', error);
      throw new Error(handleApiError(error));
    }
  },

  // NEW: Get optimized reports (replaces multiple endpoints)
  getOptimizedReports: async (params = {}) => {
    try {
      console.log('🚀 Fetching optimized reports...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/reports/optimized',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching optimized reports:', error);
      throw new Error(handleApiError(error));
    }
  },

  // NEW: Enhanced cashier daily analysis
  getCashierDailyAnalysis: async (cashierId, shopId, date = null) => {
    try {
      console.log('📊 Fetching enhanced cashier daily analysis...', { cashierId, shopId, date });
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/analysis/cashier-daily',
        params: {
          cashierId,
          shopId,
          date: date || dayjs().format('YYYY-MM-DD')
        }
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching cashier daily analysis:', error);
      throw new Error(handleApiError(error));
    }
  },

  // NEW: Get transaction reports data (alias for optimized reports)
  getTransactionReportsData: async (filters = {}) => {
    return transactionAPI.getOptimizedReports(filters);
  },

  // Legacy endpoints (maintained for backward compatibility)
  getCashierDailyStats: async (params = {}) => {
    try {
      console.log('📊 Fetching cashier daily stats...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/stats/cashier-daily',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching cashier daily stats:', error);
      return null;
    }
  },

  getDailySalesStats: async (params = {}) => {
    try {
      console.log('📈 Fetching daily sales stats...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/stats/daily-sales',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching daily sales stats:', error);
      return null;
    }
  },

  // Report endpoints (maintained for backward compatibility)
  getComprehensiveReport: async (params = {}) => {
    try {
      console.log('📊 Generating comprehensive report...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/reports/comprehensive',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      throw new Error(handleApiError(error));
    }
  },

  getSalesSummary: async (params = {}) => {
    try {
      console.log('📈 Generating sales summary...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/reports/sales-summary',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error generating sales summary:', error);
      throw new Error(handleApiError(error));
    }
  },

  getProductPerformance: async (params = {}) => {
    try {
      console.log('📦 Generating product performance report...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/reports/product-performance',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error generating product performance report:', error);
      throw new Error(handleApiError(error));
    }
  },

  getCashierPerformance: async (params = {}) => {
    try {
      console.log('👤 Generating cashier performance report...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/reports/cashier-performance',
        params
      });
      
      return extractResponseData(response);
    } catch (error) {
      console.error('Error generating cashier performance report:', error);
      throw new Error(handleApiError(error));
    }
  }
};

// ==================== ENHANCED CREDIT API ====================

export const creditAPI = {
  // Basic CRUD operations
  create: async (creditData) => {
    try {
      console.log('💳 Creating credit record:', creditData);
      const response = await makeRequest({
        method: 'post',
        url: '/credits',
        data: creditData
      });
      
      console.log('✅ Credit record created successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error creating credit record:', error);
      throw new Error(error.response?.data?.message || 'Failed to create credit record');
    }
  },

  getAll: async (params = {}) => {
    try {
      console.log('💳 Fetching credits...', params);
      const response = await makeRequest({
        method: 'get',
        url: '/credits',
        params
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching credits:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch credits');
    }
  },

  getById: async (id) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: `/credits/${id}`
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching credit:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch credit');
    }
  },

  update: async (id, updateData) => {
    try {
      console.log('💳 Updating credit:', { id, updateData });
      const response = await makeRequest({
        method: 'put',
        url: `/credits/${id}`,
        data: updateData
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating credit:', error);
      throw new Error(error.response?.data?.message || 'Failed to update credit');
    }
  },

  delete: async (id) => {
    try {
      console.log('🗑️ Deleting credit:', id);
      const response = await makeRequest({
        method: 'delete',
        url: `/credits/${id}`
      });
      console.log('✅ Credit deleted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting credit:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete credit');
    }
  },

  // Payment operations
  patchPayment: async (id, paymentData) => {
    try {
      const response = await makeRequest({
        method: 'patch',
        url: `/credits/${id}/payment`,
        data: paymentData
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      throw new Error(error.response?.data?.message || 'Failed to process payment');
    }
  },

  // NEW: Get credits by shop
  getByShop: async (shopId) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: `/credits/shop/${shopId}`
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching credits by shop:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch credits by shop');
    }
  },

  // NEW: Get shop credit summary
  getShopCreditSummary: async () => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/credits/shop-summary'
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching shop credit summary:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch shop credit summary');
    }
  },

  // NEW: Get due soon credits
  getDueSoonCredits: async (days = 2) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/credits/due-soon',
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching due soon credits:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch due soon credits');
    }
  },

  // NEW: Send reminder
  sendReminder: async (creditId) => {
    try {
      const response = await makeRequest({
        method: 'post',
        url: `/credits/${creditId}/send-reminder`
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error sending reminder:', error);
      throw new Error(error.response?.data?.message || 'Failed to send reminder');
    }
  },

  // NEW: Get cashier credit summary
  getCashierCreditSummary: async (cashierId, shopId, date = null) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/credits/cashier-summary',
        params: {
          cashierId,
          shopId,
          date: date || dayjs().format('YYYY-MM-DD')
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching cashier credit summary:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch cashier credit summary');
    }
  },

  // NEW: Get cashier daily credits
  getCashierDailyCredits: async (cashierId, shopId, date = null) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/credits/cashier-daily',
        params: {
          cashierId,
          shopId,
          date: date || dayjs().format('YYYY-MM-DD')
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching cashier daily credits:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch cashier daily credits');
    }
  },

  // Enhanced method to get credit data for reports
  getCreditsForReports: async (params = {}) => {
    try {
      console.log('💳 Fetching credits for reports...', params);
      
      const response = await makeRequest({
        method: 'get',
        url: '/credits',
        params
      });
      
      const data = extractResponseData(response);
      console.log('✅ Credits for reports received:', data?.length || 0);
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Error fetching credits for reports:', error);
      return [];
    }
  }
};

// ==================== AUTH API ====================

export const authAPI = {
  requestSecureCode: async (emailData) => {
    try {
      console.log('📧 Requesting secure code for:', emailData.email);
      
      const response = await makeRequest({
        method: 'post',
        url: '/auth/request-code',
        data: emailData
      });
      
      const data = response.data;
      
      if (data.developmentMode && data.secureCode) {
        console.log('🔐 DEVELOPMENT MODE - Secure code:', data.secureCode);
      }
      
      console.log('✅ Secure code request successful');
      return data;
    } catch (error) {
      console.error('❌ Secure code request error:', error);
      throw new Error(handleApiError(error));
    }
  },

  verifySecureCode: async (codeData) => {
    try {
      console.log('🔐 Verifying secure code for:', codeData.email);
      
      const response = await makeRequest({
        method: 'post',
        url: '/auth/verify-code',
        data: codeData
      });
      
      const data = response.data;
      let user = null;
      
      if (data.user) {
        user = data.user;
      } else if (data.data && data.data.user) {
        user = data.data.user;
      } else if (data.data && (data.data.email || data.data.role)) {
        user = data.data;
      } else if (data && (data.email || data.role)) {
        user = data;
      }
      
      if (!user) {
        throw new Error('No user data received from server');
      }
      
      if (user.role === 'admin') {
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('adminData', JSON.stringify(user));
      } else if (user.role === 'cashier') {
        localStorage.setItem('cashierData', JSON.stringify(user));
      } else {
        localStorage.setItem('userData', JSON.stringify(user));
      }
      
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('userToken', data.token);
      }
      
      cache.clearAll();
      console.log(`✅ ${user.role} login successful`);
      return data;
    } catch (error) {
      console.error('❌ Secure code verification error:', error);
      throw new Error(handleApiError(error));
    }
  },

  cashierLogin: async (credentials) => {
    try {
      console.log('👤 Attempting cashier login...');
      console.log('📧 Email:', credentials.email);
      
      const response = await makeRequest({
        method: 'post',
        url: '/auth/login',
        data: {
          email: credentials.email,
          password: credentials.password,
          userType: 'cashier'
        }
      });
      
      const data = response.data;
      console.log('✅ Raw login response:', data);
      
      if (data.success === true && data.user) {
        const user = data.user;
        
        const allowedRoles = ['cashier', 'manager', 'admin'];
        if (!user.role || !allowedRoles.includes(user.role)) {
          throw new Error('Access denied. Cashier privileges required.');
        }
        
        if (user.status === 'inactive') {
          throw new Error('Cashier account is inactive. Please contact administrator.');
        }

        localStorage.setItem('cashierData', JSON.stringify(user));
        cache.clearAll();
        console.log('✅ Cashier login successful');
        return data;
      } else {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('❌ Cashier login error:', error);
      
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        throw new Error('Cannot connect to server. Please check if backend is running on port 5001.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password. Please try again.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Cashier account is inactive. Please contact administrator.');
      }
      
      if (error.response?.status === 404) {
        throw new Error('Cashier account not found. Please contact administrator.');
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  adminLogin: async (credentials) => {
    throw new Error('Admin login now uses secure code authentication. Please use requestSecureCode and verifySecureCode methods.');
  },

  login: async (credentials, userType = 'cashier') => {
    if (userType === 'admin') {
      throw new Error('Admin login now uses secure code authentication.');
    }
    return authAPI.cashierLogin(credentials);
  },

  logout: () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('adminData');
    localStorage.removeItem('cashierData');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    cache.clearAll();
    console.log('✅ Logout completed - user data cleared');
  },

  getProfile: async () => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/auth/me'
      });
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw new Error(handleApiError(error));
    }
  },

  testConnection: async () => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/health'
      });
      return response.data;
    } catch (error) {
      console.error('Connection test failed:', error);
      throw new Error(handleApiError(error));
    }
  },

  checkUserExists: async (email) => {
    try {
      const response = await makeRequest({
        method: 'post',
        url: '/auth/request-code',
        data: { email }
      });
      
      return { exists: true, message: 'User exists' };
    } catch (error) {
      if (error.response?.status === 404) {
        return { exists: false, message: 'No account found with this email' };
      }
      throw new Error(handleApiError(error));
    }
  }
};

// ==================== PRODUCT API ====================

export const productAPI = {
  getAll: async (params = {}) => {
    try {
      console.log('🛍️ Fetching products...');
      
      const cacheKey = `products_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached products');
        return cached;
      }
      
      const response = await makeRequest({
        method: 'get',
        url: '/products',
        params
      });
      
      const data = extractResponseData(response);
      const products = Array.isArray(data) ? data : [];
      
      cache.set(cacheKey, products);
      console.log(`✅ Found ${products.length} products`);
      return products;
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      
      const cacheKey = `products_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached products due to error');
        return cached;
      }
      
      return [];
    }
  },

  getById: async (id) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: `/products/${id}`
      });
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error(handleApiError(error));
    }
  },

  create: async (productData) => {
    try {
      console.log('📦 Creating product:', productData);
      const response = await makeRequest({
        method: 'post',
        url: '/products',
        data: productData
      });
      
      const result = extractResponseData(response);
      cache.clear('products');
      console.log('✅ Product created successfully');
      return result;
    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw new Error(handleApiError(error));
    }
  },

  update: async (id, data) => {
    try {
      console.log('📦 Updating product:', { id, data });
      
      const response = await makeRequest({
        method: 'put',
        url: `/products/${id}`,
        data
      });
      
      const result = extractResponseData(response);
      cache.clear('products');
      console.log('✅ Product updated successfully');
      return result;
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw new Error(handleApiError(error));
    }
  },

  bulkUpdateStock: async (data) => {
    try {
      console.log('📦 Bulk updating product stock:', data);
      
      const response = await makeRequest({
        method: 'patch',
        url: '/products/bulk-stock',
        data
      });
      
      const result = extractResponseData(response);
      cache.clear('products');
      console.log('✅ Bulk stock update successful');
      return result;
    } catch (error) {
      console.error('❌ Error in bulk stock update:', error);
      throw new Error(handleApiError(error));
    }
  },

  delete: async (id) => {
    try {
      const response = await makeRequest({
        method: 'delete',
        url: `/products/${id}`
      });
      
      cache.clear('products');
      return extractResponseData(response);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error(handleApiError(error));
    }
  },

  getProductsForReports: async () => {
    try {
      console.log('📦 Fetching products for reports...');
      
      const optimizedData = await transactionAPI.getOptimizedReports({});
      const products = optimizedData.comprehensiveData?.products || [];
      
      console.log('✅ Products for reports received:', products.length);
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.error('❌ Error fetching products for reports:', error);
      return [];
    }
  }
};

// ==================== SHOP API ====================

export const shopAPI = {
  getAll: async (params = {}) => {
    try {
      console.log('🏪 Fetching shops...');
      
      const cacheKey = 'shops';
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached shops');
        return cached;
      }
      
      const response = await makeRequest({
        method: 'get',
        url: '/shops',
        params
      });
      
      const data = extractResponseData(response);
      const shops = Array.isArray(data) ? data : [];
      
      cache.set(cacheKey, shops);
      console.log(`✅ Found ${shops.length} shops`);
      return shops;
    } catch (error) {
      console.error('❌ Error fetching shops:', error);
      
      const cached = cache.get('shops');
      if (cached) {
        console.log('🔄 Using stale cached shops due to error');
        return cached;
      }
      
      return [];
    }
  },

  getById: async (id) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: `/shops/${id}`
      });
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching shop:', error);
      throw new Error(handleApiError(error));
    }
  },

  create: async (shopData) => {
    try {
      console.log('🏪 Creating shop:', shopData);
      const response = await makeRequest({
        method: 'post',
        url: '/shops',
        data: shopData
      });
      
      const result = extractResponseData(response);
      cache.clear('shops');
      console.log('✅ Shop created successfully');
      return result;
    } catch (error) {
      console.error('❌ Error creating shop:', error);
      throw new Error(handleApiError(error));
    }
  },

  update: async (id, data) => {
    try {
      const response = await makeRequest({
        method: 'put',
        url: `/shops/${id}`,
        data
      });
      
      cache.clear('shops');
      return extractResponseData(response);
    } catch (error) {
      console.error('Error updating shop:', error);
      throw new Error(handleApiError(error));
    }
  },

  delete: async (id) => {
    try {
      const response = await makeRequest({
        method: 'delete',
        url: `/shops/${id}`
      });
      
      cache.clear('shops');
      return extractResponseData(response);
    } catch (error) {
      console.error('Error deleting shop:', error);
      throw new Error(handleApiError(error));
    }
  },

  getShopsForReports: async () => {
    try {
      console.log('🏪 Fetching shops for reports...');
      
      const optimizedData = await transactionAPI.getOptimizedReports({});
      const shops = optimizedData.shops || [];
      
      console.log('✅ Shops for reports received:', shops.length);
      return Array.isArray(shops) ? shops : [];
    } catch (error) {
      console.error('❌ Error fetching shops for reports:', error);
      return [];
    }
  }
};

// ==================== CASHIER API ====================

export const cashierAPI = {
  getAll: async (params = {}) => {
    try {
      console.log('👤 Fetching cashiers...');
      
      const cacheKey = 'cashiers';
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached cashiers');
        return cached;
      }
      
      const response = await makeRequest({
        method: 'get',
        url: '/cashiers',
        params
      });
      
      const data = extractResponseData(response);
      const cashiers = Array.isArray(data) ? data : [];
      
      cache.set(cacheKey, cashiers);
      console.log(`✅ Found ${cashiers.length} cashiers`);
      return cashiers;
    } catch (error) {
      console.error('❌ Error fetching cashiers:', error);
      
      const cached = cache.get('cashiers');
      if (cached) {
        console.log('🔄 Using stale cached cashiers due to error');
        return cached;
      }
      
      return [];
    }
  },

  getById: async (id) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: `/cashiers/${id}`
      });
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching cashier:', error);
      throw new Error(handleApiError(error));
    }
  },

  create: async (cashierData) => {
    try {
      console.log('👤 Creating cashier:', cashierData);
      const response = await makeRequest({
        method: 'post',
        url: '/cashiers',
        data: cashierData
      });
      
      const result = extractResponseData(response);
      cache.clear('cashiers');
      console.log('✅ Cashier created successfully');
      return result;
    } catch (error) {
      console.error('❌ Error creating cashier:', error);
      throw new Error(handleApiError(error));
    }
  },

  update: async (id, data) => {
    try {
      const response = await makeRequest({
        method: 'put',
        url: `/cashiers/${id}`,
        data
      });
      
      cache.clear('cashiers');
      return extractResponseData(response);
    } catch (error) {
      console.error('Error updating cashier:', error);
      throw new Error(handleApiError(error));
    }
  },

  patch: async (id, data) => {
    try {
      const response = await makeRequest({
        method: 'patch',
        url: `/cashiers/${id}`,
        data
      });
      
      cache.clear('cashiers');
      return extractResponseData(response);
    } catch (error) {
      console.error('Error patching cashier:', error);
      throw new Error(handleApiError(error));
    }
  },

  delete: async (id) => {
    try {
      const response = await makeRequest({
        method: 'delete',
        url: `/cashiers/${id}`
      });
      
      cache.clear('cashiers');
      return extractResponseData(response);
    } catch (error) {
      console.error('Error deleting cashier:', error);
      throw new Error(handleApiError(error));
    }
  },

  getCashiersForReports: async () => {
    try {
      console.log('👤 Fetching cashiers for reports...');
      
      const optimizedData = await transactionAPI.getOptimizedReports({});
      const cashiers = optimizedData.cashiers || [];
      
      console.log('✅ Cashiers for reports received:', cashiers.length);
      return Array.isArray(cashiers) ? cashiers : [];
    } catch (error) {
      console.error('❌ Error fetching cashiers for reports:', error);
      return [];
    }
  }
};

// ==================== EXPENSE API ====================

export const expenseAPI = {
  getAll: async (params = {}) => {
    try {
      console.log('💰 Fetching expenses...');
      
      const cacheKey = `expenses_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached expenses');
        return cached;
      }
      
      const response = await makeRequest({
        method: 'get',
        url: '/expenses',
        params
      });
      
      const data = extractResponseData(response);
      const expenses = Array.isArray(data) ? data : [];
      
      cache.set(cacheKey, expenses);
      console.log(`✅ Found ${expenses.length} expenses`);
      return expenses;
    } catch (error) {
      console.error('❌ Error fetching expenses:', error);
      
      const cacheKey = `expenses_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached expenses due to error');
        return cached;
      }
      
      return [];
    }
  },

  getById: async (id) => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: `/expenses/${id}`
      });
      return extractResponseData(response);
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw new Error(handleApiError(error));
    }
  },

  create: async (expenseData) => {
    try {
      console.log('💰 Creating expense:', expenseData);
      
      const response = await makeRequest({
        method: 'post',
        url: '/expenses',
        data: expenseData
      });
      
      const result = extractResponseData(response);
      cache.clear('expenses');
      console.log('✅ Expense created successfully');
      return result;
    } catch (error) {
      console.error('❌ Error creating expense:', error);
      throw new Error(handleApiError(error));
    }
  },

  update: async (id, data) => {
    try {
      console.log('💰 Updating expense:', { id, data });
      
      const response = await makeRequest({
        method: 'put',
        url: `/expenses/${id}`,
        data
      });
      
      const result = extractResponseData(response);
      cache.clear('expenses');
      console.log('✅ Expense updated successfully');
      return result;
    } catch (error) {
      console.error('❌ Error updating expense:', error);
      throw new Error(handleApiError(error));
    }
  },

  delete: async (id) => {
    try {
      console.log('🗑️ Deleting expense:', id);
      
      const response = await makeRequest({
        method: 'delete',
        url: `/expenses/${id}`
      });
      
      const result = extractResponseData(response);
      cache.clear('expenses');
      console.log('✅ Expense deleted successfully');
      return result;
    } catch (error) {
      console.error('❌ Error deleting expense:', error);
      throw new Error(handleApiError(error));
    }
  },

  getExpensesForReports: async (params = {}) => {
    try {
      console.log('💰 Fetching expenses for reports...', params);
      
      const optimizedData = await transactionAPI.getOptimizedReports(params);
      const expenses = optimizedData.comprehensiveData?.expenses || [];
      
      console.log('✅ Expenses for reports received:', expenses.length);
      return Array.isArray(expenses) ? expenses : [];
    } catch (error) {
      console.error('❌ Error fetching expenses for reports:', error);
      return [];
    }
  }
};

// ==================== SYSTEM API ====================

export const systemAPI = {
  health: async () => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/health'
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  testDatabase: async () => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/api/debug/database'
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getRoutes: async () => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/api/debug/routes'
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getEmailStatus: async () => {
    try {
      const response = await makeRequest({
        method: 'get',
        url: '/api/debug/email-status'
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
};

// ==================== SETUP API ====================

export const setupAPI = {
  createSampleData: async () => {
    try {
      console.log('🔄 Creating sample data...');
      const response = await makeRequest({
        method: 'post',
        url: '/api/setup/sample-data'
      });
      
      cache.clearAll();
      return response.data;
    } catch (error) {
      console.error('Error creating sample data:', error);
      throw new Error(handleApiError(error));
    }
  },

  checkDatabaseStatus: async () => {
    try {
      const optimizedData = await transactionAPI.getOptimizedReports({});
      
      return {
        hasData: (optimizedData.comprehensiveData?.transactions?.length || 0) > 0,
        counts: {
          products: optimizedData.comprehensiveData?.products?.length || 0,
          shops: optimizedData.shops?.length || 0,
          cashiers: optimizedData.cashiers?.length || 0,
          expenses: optimizedData.comprehensiveData?.expenses?.length || 0,
          transactions: optimizedData.comprehensiveData?.transactions?.length || 0,
          credits: optimizedData.credits?.length || 0
        }
      };
    } catch (error) {
      console.error('Error checking database status:', error);
      return { 
        hasData: false, 
        counts: { 
          products: 0, 
          shops: 0, 
          cashiers: 0, 
          expenses: 0,
          transactions: 0,
          credits: 0
        } 
      };
    }
  }
};

// ==================== REPORT API ====================

export const reportAPI = {
  getDashboardData: async (filters = {}) => {
    try {
      console.log('📈 Fetching complete dashboard data...', filters);
      
      const transactionReportsData = await transactionAPI.getTransactionReportsData(filters);
      
      const creditStats = {
        totalCredits: transactionReportsData.credits?.length || 0,
        totalCreditAmount: transactionReportsData.credits?.reduce((sum, c) => sum + (c.totalAmount || 0), 0) || 0,
        totalAmountPaid: transactionReportsData.credits?.reduce((sum, c) => sum + (c.amountPaid || 0), 0) || 0,
        totalBalanceDue: transactionReportsData.credits?.reduce((sum, c) => sum + (c.balanceDue || 0), 0) || 0,
        overdueCredits: transactionReportsData.credits?.filter(c => 
          c.dueDate && new Date(c.dueDate) < new Date() && c.balanceDue > 0
        ).length || 0,
        collectionRate: transactionReportsData.credits?.length > 0 ? 
          (transactionReportsData.credits.reduce((sum, c) => sum + (c.amountPaid || 0), 0) / 
           transactionReportsData.credits.reduce((sum, c) => sum + (c.totalAmount || 0), 0)) * 100 : 0
      };
      
      const dashboardData = {
        ...transactionReportsData,
        creditStats,
        loadedAt: new Date().toISOString(),
        dataSources: {
          transactions: transactionReportsData.totalCount,
          shops: transactionReportsData.shops.length,
          cashiers: transactionReportsData.cashiers.length,
          products: transactionReportsData.comprehensiveData.products.length,
          credits: transactionReportsData.credits.length,
          expenses: transactionReportsData.comprehensiveData.expenses.length
        }
      };
      
      console.log('✅ Dashboard data loaded successfully:', dashboardData.dataSources);
      return dashboardData;
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      return {
        comprehensiveReport: {
          summary: {},
          timeSeries: [],
          paymentMethods: [],
          cashierPerformance: [],
          productPerformance: [],
          rawTransactions: []
        },
        salesSummary: {
          summary: {},
          dailyBreakdown: [],
          recentTransactions: []
        },
        productPerformance: {
          products: [],
          summary: {}
        },
        cashierPerformance: {
          cashiers: [],
          summary: {}
        },
        comprehensiveData: {
          transactions: [],
          expenses: [],
          products: [],
          summary: {},
          stats: {}
        },
        enhancedStats: {
          salesWithProfit: [],
          financialStats: {
            totalSales: 0,
            totalProfit: 0,
            totalExpenses: 0,
            netProfit: 0,
            profitMargin: 0,
            transactionCount: 0,
            averageTransaction: 0,
            totalCredits: 0,
            totalCreditAmount: 0,
            totalAmountPaid: 0,
            totalBalanceDue: 0,
            overdueCredits: 0,
            creditCollectionRate: 0
          }
        },
        filteredTransactions: [],
        shops: [],
        cashiers: [],
        products: [],
        credits: [],
        expenses: [],
        creditStats: {
          totalCredits: 0,
          totalCreditAmount: 0,
          totalAmountPaid: 0,
          totalBalanceDue: 0,
          overdueCredits: 0,
          collectionRate: 0
        },
        filters,
        totalCount: 0,
        filteredCount: 0,
        loadedAt: new Date().toISOString(),
        dataSources: {
          transactions: 0,
          shops: 0,
          cashiers: 0,
          products: 0,
          credits: 0,
          expenses: 0
        },
        success: false,
        error: handleApiError(error)
      };
    }
  },
  
  exportReport: async (data, format = 'csv') => {
    try {
      console.log(`📤 Exporting report as ${format}...`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
      const filename = `transaction-report-${timestamp}.${format}`;
      
      console.log('✅ Report export prepared:', filename);
      
      return {
        success: true,
        filename,
        format,
        timestamp: new Date().toISOString(),
        dataSize: JSON.stringify(data).length
      };
    } catch (error) {
      console.error('❌ Error exporting report:', error);
      throw new Error(handleApiError(error));
    }
  },
  
  clearCache: () => {
    console.log('🧹 Clearing report cache...');
    cache.clearAll();
    console.log('✅ Cache cleared');
    
    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  }
};

// ==================== UTILITY FUNCTIONS ====================

export const storageUtils = {
  clearUserData: () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('adminData');
    localStorage.removeItem('cashierData');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
  },
  
  getUserData: () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },
  
  getCashierData: () => {
    const cashierData = localStorage.getItem('cashierData');
    return cashierData ? JSON.parse(cashierData) : null;
  },
  
  getCurrentUser: () => {
    return storageUtils.getCashierData() || storageUtils.getUserData();
  },

  isAuthenticated: () => {
    return !!(storageUtils.getCashierData() || storageUtils.getUserData());
  },

  isAdmin: () => {
    const user = storageUtils.getCurrentUser();
    return user && user.role === 'admin';
  },

  getAuthToken: () => {
    return localStorage.getItem('adminToken') || localStorage.getItem('userToken');
  }
};

// ==================== MAIN API SERVICE ====================

const apiService = {
  auth: authAPI,
  transactions: transactionAPI,
  products: productAPI,
  shops: shopAPI,
  cashiers: cashierAPI,
  expenses: expenseAPI,
  credits: creditAPI,
  reports: reportAPI,
  system: systemAPI,
  setup: setupAPI,
  utils: storageUtils,
  cache
};

export default apiService;
export { handleApiError };
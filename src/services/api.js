import axios from 'axios';
import dayjs from 'dayjs';

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://stanzo-back.vercel.app/';
const REQUEST_TIMEOUT = 30000;

// Request queue and rate limiting
let requestQueue = [];
let isProcessingQueue = false;
const REQUEST_DELAY = 100; // 100ms between requests

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
        // Token expired or invalid
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('adminData');
        localStorage.removeItem('cashierData');
        // Redirect to login if we're in a browser environment
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
  
  // Handle different response structures
  if (data.success !== undefined && data.data !== undefined) {
    return data.data;
  }
  
  // If it's already the data we need, return it directly
  if (data.transactions !== undefined || Array.isArray(data)) {
    return data;
  }
  
  // For other structures, return the full data
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
    if (item && timestamp && Date.now() - timestamp < 30000) { // 30 second cache
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

// Calculation Utilities for reports
const CalculationUtils = {
  processSalesData: (transactions = [], products = [], expenses = [], shopId, credits = []) => {
    try {
      // Filter transactions by shop if specified
      const filteredTransactions = shopId && shopId !== 'all' 
        ? transactions.filter(t => t.shop === shopId)
        : transactions;

      // Calculate sales with profit
      const salesWithProfit = filteredTransactions.map(transaction => {
        const transactionProfit = transaction.items?.reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId || p.name === item.productName);
          const costPrice = product?.costPrice || 0;
          const profit = (item.unitPrice - costPrice) * item.quantity;
          return sum + (profit || 0);
        }, 0) || 0;

        return {
          ...transaction,
          profit: transactionProfit,
          profitMargin: transaction.totalAmount > 0 ? (transactionProfit / transaction.totalAmount) * 100 : 0
        };
      });

      // Calculate financial stats including credit data
      const totalSales = salesWithProfit.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalProfit = salesWithProfit.reduce((sum, t) => sum + (t.profit || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalProfit - totalExpenses;
      
      // Credit statistics
      const totalCredits = credits.length;
      const totalCreditAmount = credits.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
      const totalAmountPaid = credits.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
      const totalBalanceDue = credits.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
      const overdueCredits = credits.filter(c => 
        c.dueDate && new Date(c.dueDate) < new Date() && c.balanceDue > 0
      ).length;

      const financialStats = {
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        profitMargin: totalSales > 0 ? parseFloat(((totalProfit / totalSales) * 100).toFixed(2)) : 0,
        transactionCount: filteredTransactions.length,
        averageTransaction: filteredTransactions.length > 0 ? parseFloat((totalSales / filteredTransactions.length).toFixed(2)) : 0,
        // Credit stats
        totalCredits,
        totalCreditAmount: parseFloat(totalCreditAmount.toFixed(2)),
        totalAmountPaid: parseFloat(totalAmountPaid.toFixed(2)),
        totalBalanceDue: parseFloat(totalBalanceDue.toFixed(2)),
        overdueCredits,
        creditCollectionRate: totalCreditAmount > 0 ? parseFloat(((totalAmountPaid / totalCreditAmount) * 100).toFixed(2)) : 0
      };

      return {
        salesWithProfit,
        financialStats,
        transactionCount: filteredTransactions.length
      };
    } catch (error) {
      console.error('Error processing sales data:', error);
      return {
        salesWithProfit: [],
        financialStats: this.getDefaultStats(),
        transactionCount: 0
      };
    }
  },

  getDefaultStats: () => ({
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
  }),

  validateTransactionData: (transaction) => {
    if (!transaction) return null;
    
    return {
      id: transaction.id || transaction._id,
      shop: transaction.shop || 'Unknown Shop',
      cashierName: transaction.cashierName || 'Unknown Cashier',
      customerName: transaction.customerName || 'Walk-in Customer',
      transactionNumber: transaction.transactionNumber || 'N/A',
      totalAmount: transaction.totalAmount || 0,
      paymentMethod: transaction.paymentMethod || 'cash',
      status: transaction.status || 'completed',
      saleDate: transaction.saleDate || new Date().toISOString(),
      items: transaction.items || [],
      receiptNumber: transaction.receiptNumber || 'N/A'
    };
  },

  // Enhanced credit data validation
  validateCreditData: (credit) => {
    if (!credit) return null;
    
    return {
      id: credit.id || credit._id,
      transactionId: credit.transactionId,
      customerName: credit.customerName || 'Unknown Customer',
      customerPhone: credit.customerPhone || 'N/A',
      totalAmount: credit.totalAmount || 0,
      amountPaid: credit.amountPaid || 0,
      balanceDue: credit.balanceDue || 0,
      dueDate: credit.dueDate,
      status: credit.status || 'pending',
      shopId: credit.shopId || credit.shop,
      cashierName: credit.cashierName || 'Unknown Cashier',
      paymentHistory: credit.paymentHistory || [],
      createdAt: credit.createdAt,
      updatedAt: credit.updatedAt
    };
  },

  groupDataByTime: (data, groupBy = 'daily') => {
    const grouped = {};
    
    data.forEach(item => {
      const date = dayjs(item.saleDate || item.date || item.createdAt);
      let key;
      
      switch (groupBy) {
        case 'hourly':
          key = date.format('YYYY-MM-DD HH:00');
          break;
        case 'weekly':
          key = date.startOf('week').format('YYYY-MM-DD');
          break;
        case 'monthly':
          key = date.format('YYYY-MM');
          break;
        case 'yearly':
          key = date.format('YYYY');
          break;
        case 'daily':
        default:
          key = date.format('YYYY-MM-DD');
          break;
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  }
};

// ==================== AUTH API ====================

export const authAPI = {
  // Request secure code for ADMIN login
  requestSecureCode: async (emailData) => {
    try {
      console.log('📧 Requesting secure code for:', emailData.email);
      
      const response = await makeRequest({
        method: 'post',
        url: '/auth/request-code',
        data: emailData
      });
      
      const data = response.data;
      
      // Handle development mode where code is returned directly
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

  // Verify secure code and login for ADMIN
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
      
      // Extract user data from response
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
      
      // Store user data based on role
      if (user.role === 'admin') {
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('adminData', JSON.stringify(user));
      } else if (user.role === 'cashier') {
        localStorage.setItem('cashierData', JSON.stringify(user));
      } else {
        localStorage.setItem('userData', JSON.stringify(user));
      }
      
      // Store token if available
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('userToken', data.token);
      }
      
      // Clear cache on login
      cache.clearAll();
      
      console.log(`✅ ${user.role} login successful`);
      return data;
    } catch (error) {
      console.error('❌ Secure code verification error:', error);
      throw new Error(handleApiError(error));
    }
  },

  // CASHIER LOGIN - Password-based
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
        
        // Verify cashier role
        const allowedRoles = ['cashier', 'manager', 'admin'];
        if (!user.role || !allowedRoles.includes(user.role)) {
          throw new Error('Access denied. Cashier privileges required.');
        }
        
        // Check if account is active
        if (user.status === 'inactive') {
          throw new Error('Cashier account is inactive. Please contact administrator.');
        }

        // Store cashier data
        localStorage.setItem('cashierData', JSON.stringify(user));
        
        // Clear cache on login
        cache.clearAll();
        
        console.log('✅ Cashier login successful');
        return data;
      } else {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('❌ Cashier login error:', error);
      
      // Enhanced error handling
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

  // ADMIN LOGIN - Secure code only
  adminLogin: async (credentials) => {
    throw new Error('Admin login now uses secure code authentication. Please use requestSecureCode and verifySecureCode methods.');
  },

  // Legacy login method
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
  }
};

// ==================== CREDIT API ====================

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

  // Reminder and notification operations
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
  },

  // Utility methods for frontend
  validateCreditData: (creditData) => {
    const errors = [];
    
    if (!creditData.customerName?.trim()) {
      errors.push('Customer name is required');
    }
    
    if (!creditData.customerPhone?.trim()) {
      errors.push('Customer phone is required');
    }
    
    if (!creditData.totalAmount || creditData.totalAmount <= 0) {
      errors.push('Valid total amount is required');
    }
    
    if (creditData.amountPaid < 0) {
      errors.push('Amount paid cannot be negative');
    }
    
    if (creditData.balanceDue < 0) {
      errors.push('Balance due cannot be negative');
    }
    
    if (!creditData.dueDate) {
      errors.push('Due date is required');
    }
    
    if (creditData.amountPaid > creditData.totalAmount) {
      errors.push('Amount paid cannot exceed total amount');
    }
    
    return errors;
  },

  // Format credit data for display
  formatCreditForDisplay: (credit) => {
    return {
      ...credit,
      formattedTotalAmount: `KES ${(credit.totalAmount || 0).toLocaleString()}`,
      formattedAmountPaid: `KES ${(credit.amountPaid || 0).toLocaleString()}`,
      formattedBalanceDue: `KES ${(credit.balanceDue || 0).toLocaleString()}`,
      formattedDueDate: credit.dueDate ? new Date(credit.dueDate).toLocaleDateString() : 'Not set',
      statusColor: credit.status === 'paid' ? 'green' : 
                   credit.status === 'overdue' ? 'red' : 'orange',
      isOverdue: credit.dueDate && new Date(credit.dueDate) < new Date() && credit.balanceDue > 0
    };
  }
};
// ==================== OPTIMIZED TRANSACTION API ====================

export const transactionAPI = {
  // NEW: Main optimized endpoint that replaces 5 separate API calls
  getOptimizedReports: async (params = {}) => {
    try {
      console.log('🚀 Fetching optimized reports...', params);
      
      const cacheKey = `optimized_reports_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached optimized reports');
        return cached;
      }
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/reports/optimized',
        params
      });
      
      const data = extractResponseData(response);
      
      cache.set(cacheKey, data);
      
      console.log('✅ Optimized reports received:', {
        comprehensiveReport: !!data?.comprehensiveReport,
        salesSummary: !!data?.salesSummary,
        productPerformance: !!data?.productPerformance,
        cashierPerformance: !!data?.cashierPerformance,
        comprehensiveData: !!data?.comprehensiveData,
        shops: data?.shops?.length,
        cashiers: data?.cashiers?.length,
        credits: data?.credits?.length
      });
      
      return data || {
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
        shops: [],
        cashiers: [],
        credits: [],
        processingTime: 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error fetching optimized reports:', error);
      
      const cacheKey = `optimized_reports_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached optimized reports due to error');
        return cached;
      }
      
      throw new Error(handleApiError(error));
    }
  },

  // Enhanced method to get processed data for TransactionReports component
  getTransactionReportsData: async (filters = {}) => {
    try {
      console.log('📋 Fetching transaction reports data with filters:', filters);
      
      const {
        startDate,
        endDate,
        shopId,
        cashierId,
        paymentMethod,
        timeRange,
        searchText,
        groupBy = 'daily'
      } = filters;
      
      const params = {};
      
      if (startDate && endDate) {
        params.startDate = dayjs(startDate).format('YYYY-MM-DD');
        params.endDate = dayjs(endDate).format('YYYY-MM-DD');
      }
      
      if (shopId && shopId !== 'all') {
        params.shopId = shopId;
      }
      
      if (cashierId && cashierId !== 'all') {
        params.cashierId = cashierId;
      }
      
      if (paymentMethod && paymentMethod !== 'all') {
        params.paymentMethod = paymentMethod;
      }
      
      if (groupBy) {
        params.groupBy = groupBy;
      }
      
      const reportsData = await transactionAPI.getAllReportsData(params);
      
      // Enhanced credit data processing
      const enhancedCredits = (reportsData.credits || []).map(credit => {
        const shop = (reportsData.shops || []).find(s => s._id === (credit.shopId || credit.shop));
        const cashier = (reportsData.cashiers || []).find(c => 
          c._id === credit.cashierId || c.name === credit.cashierName
        );
        
        return {
          ...credit,
          shopName: shop?.name || 'Unknown Shop',
          cashierName: cashier?.name || credit.cashierName || 'Unknown Cashier',
          shopDetails: shop,
          cashierDetails: cashier
        };
      });
      
      const processedData = {
        ...reportsData,
        credits: enhancedCredits,
        enhancedStats: CalculationUtils.processSalesData(
          reportsData.comprehensiveData?.transactions || [],
          reportsData.comprehensiveData?.products || [],
          reportsData.comprehensiveData?.expenses || [],
          shopId,
          enhancedCredits
        ),
        filteredTransactions: (reportsData.comprehensiveData?.transactions || [])
          .filter(transaction => {
            if (!transaction) return false;
            
            if (searchText) {
              const searchLower = searchText.toLowerCase();
              const searchFields = [
                transaction.cashierName,
                transaction.shop,
                transaction.paymentMethod,
                transaction.transactionNumber,
                transaction.customerName,
                ...(transaction.items?.map(item => item.productName) || [])
              ].filter(Boolean).map(field => field.toLowerCase());
              
              if (!searchFields.some(field => field.includes(searchLower))) {
                return false;
              }
            }
            
            return true;
          })
          .map(transaction => CalculationUtils.validateTransactionData(transaction)),
        filters,
        totalCount: reportsData.comprehensiveData?.transactions?.length || 0,
        filteredCount: 0,
        timestamp: new Date().toISOString()
      };
      
      processedData.filteredCount = processedData.filteredTransactions.length;
      
      console.log('✅ Transaction reports data processed:', {
        totalTransactions: processedData.totalCount,
        filteredTransactions: processedData.filteredCount,
        shops: processedData.shops.length,
        cashiers: processedData.cashiers.length,
        products: processedData.comprehensiveData.products.length,
        credits: processedData.credits.length
      });
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Error processing transaction reports data:', error);
      
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
          financialStats: CalculationUtils.getDefaultStats()
        },
        filteredTransactions: [],
        shops: [],
        cashiers: [],
        credits: [],
        filters,
        totalCount: 0,
        filteredCount: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: handleApiError(error)
      };
    }
  },

  // Backward compatibility - comprehensive data
  getComprehensiveData: async (params = {}) => {
    try {
      console.log('📊 Fetching comprehensive data...', params);
      
      const cacheKey = `comprehensive_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached comprehensive data');
        return cached;
      }
      
      const response = await makeRequest({
        method: 'get',
        url: '/transactions/sales/all',
        params
      });
      
      const data = extractResponseData(response);
      
      const result = {
        transactions: data?.transactions || [],
        expenses: data?.expenses || [],
        products: data?.products || [],
        summary: data?.summary || {},
        stats: data?.stats || {}
      };
      
      cache.set(cacheKey, result);
      
      console.log('✅ Comprehensive data received:', {
        transactions: result.transactions.length,
        expenses: result.expenses.length,
        products: result.products.length
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error fetching comprehensive data:', error);
      
      const cacheKey = `comprehensive_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached comprehensive data due to error');
        return cached;
      }
      
      return {
        transactions: [],
        expenses: [],
        products: [],
        summary: {},
        stats: {}
      };
    }
  },

  // Backward compatibility - individual reports (now using optimized endpoint)
  getComprehensiveReport: async (params = {}) => {
    try {
      console.log('📊 Fetching comprehensive report via optimized endpoint...', params);
      
      const optimizedData = await transactionAPI.getOptimizedReports(params);
      return optimizedData.comprehensiveReport || {
        summary: {},
        timeSeries: [],
        paymentMethods: [],
        cashierPerformance: [],
        productPerformance: [],
        rawTransactions: []
      };
    } catch (error) {
      console.error('❌ Error fetching comprehensive report:', error);
      throw new Error(handleApiError(error));
    }
  },

  getSalesSummaryReport: async (params = {}) => {
    try {
      console.log('📈 Fetching sales summary report via optimized endpoint...', params);
      
      const optimizedData = await transactionAPI.getOptimizedReports(params);
      return optimizedData.salesSummary || {
        summary: {},
        dailyBreakdown: [],
        recentTransactions: []
      };
    } catch (error) {
      console.error('❌ Error fetching sales summary:', error);
      throw new Error(handleApiError(error));
    }
  },

  getProductPerformanceReport: async (params = {}) => {
    try {
      console.log('📦 Fetching product performance report via optimized endpoint...', params);
      
      const optimizedData = await transactionAPI.getOptimizedReports(params);
      return optimizedData.productPerformance || {
        products: [],
        summary: {}
      };
    } catch (error) {
      console.error('❌ Error fetching product performance:', error);
      throw new Error(handleApiError(error));
    }
  },

  getCashierPerformanceReport: async (params = {}) => {
    try {
      console.log('👤 Fetching cashier performance report via optimized endpoint...', params);
      
      const optimizedData = await transactionAPI.getOptimizedReports(params);
      return optimizedData.cashierPerformance || {
        cashiers: [],
        summary: {}
      };
    } catch (error) {
      console.error('❌ Error fetching cashier performance:', error);
      throw new Error(handleApiError(error));
    }
  },

  // Enhanced method to get all data in one call using optimized endpoint
  getAllReportsData: async (params = {}) => {
    try {
      console.log('🚀 Fetching all reports data via optimized endpoint...', params);
      
      const cacheKey = `all_reports_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached all reports data');
        return cached;
      }
      
      const optimizedData = await transactionAPI.getOptimizedReports(params);
      
      const result = {
        comprehensiveReport: optimizedData.comprehensiveReport || {
          summary: {},
          timeSeries: [],
          paymentMethods: [],
          cashierPerformance: [],
          productPerformance: [],
          rawTransactions: []
        },
        salesSummary: optimizedData.salesSummary || {
          summary: {},
          dailyBreakdown: [],
          recentTransactions: []
        },
        productPerformance: optimizedData.productPerformance || {
          products: [],
          summary: {}
        },
        cashierPerformance: optimizedData.cashierPerformance || {
          cashiers: [],
          summary: {}
        },
        comprehensiveData: optimizedData.comprehensiveData || {
          transactions: [],
          expenses: [],
          products: [],
          summary: {},
          stats: {}
        },
        shops: optimizedData.shops || [],
        cashiers: optimizedData.cashiers || [],
        credits: optimizedData.credits || [],
        timestamp: optimizedData.timestamp || new Date().toISOString(),
        params,
        success: true
      };
      
      cache.set(cacheKey, result);
      
      console.log('✅ All reports data processed from optimized endpoint:', {
        transactions: result.comprehensiveData.transactions.length,
        expenses: result.comprehensiveData.expenses.length,
        products: result.comprehensiveData.products.length,
        shops: result.shops.length,
        cashiers: result.cashiers.length,
        credits: result.credits.length
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error fetching all reports data:', error);
      
      const cacheKey = `all_reports_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached all reports data due to error');
        return cached;
      }
      
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
        shops: [],
        cashiers: [],
        credits: [],
        timestamp: new Date().toISOString(),
        params,
        success: false,
        error: handleApiError(error)
      };
    }
  },

  // Enhanced method to get processed data for TransactionReports component
  getTransactionReportsData: async (filters = {}) => {
    try {
      console.log('📋 Fetching transaction reports data with filters:', filters);
      
      const {
        startDate,
        endDate,
        shopId,
        cashierId,
        paymentMethod,
        timeRange,
        searchText,
        groupBy = 'daily'
      } = filters;
      
      const params = {};
      
      if (startDate && endDate) {
        params.startDate = dayjs(startDate).format('YYYY-MM-DD');
        params.endDate = dayjs(endDate).format('YYYY-MM-DD');
      }
      
      if (shopId && shopId !== 'all') {
        params.shopId = shopId;
      }
      
      if (cashierId && cashierId !== 'all') {
        params.cashierId = cashierId;
      }
      
      if (paymentMethod && paymentMethod !== 'all') {
        params.paymentMethod = paymentMethod;
      }
      
      if (groupBy) {
        params.groupBy = groupBy;
      }
      
      const reportsData = await transactionAPI.getAllReportsData(params);
      
      const processedData = {
        ...reportsData,
        enhancedStats: CalculationUtils.processSalesData(
          reportsData.comprehensiveData?.transactions || [],
          reportsData.comprehensiveData?.products || [],
          reportsData.comprehensiveData?.expenses || [],
          shopId,
          reportsData.credits || []
        ),
        filteredTransactions: (reportsData.comprehensiveData?.transactions || [])
          .filter(transaction => {
            if (!transaction) return false;
            
            if (searchText) {
              const searchLower = searchText.toLowerCase();
              const searchFields = [
                transaction.cashierName,
                transaction.shop,
                transaction.paymentMethod,
                transaction.transactionNumber,
                transaction.customerName,
                ...(transaction.items?.map(item => item.productName) || [])
              ].filter(Boolean).map(field => field.toLowerCase());
              
              if (!searchFields.some(field => field.includes(searchLower))) {
                return false;
              }
            }
            
            return true;
          })
          .map(transaction => CalculationUtils.validateTransactionData(transaction)),
        filters,
        totalCount: reportsData.comprehensiveData?.transactions?.length || 0,
        filteredCount: 0,
        timestamp: new Date().toISOString()
      };
      
      processedData.filteredCount = processedData.filteredTransactions.length;
      
      console.log('✅ Transaction reports data processed:', {
        totalTransactions: processedData.totalCount,
        filteredTransactions: processedData.filteredCount,
        shops: processedData.shops.length,
        cashiers: processedData.cashiers.length,
        products: processedData.comprehensiveData.products.length,
        credits: processedData.credits.length
      });
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Error processing transaction reports data:', error);
      
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
          financialStats: CalculationUtils.getDefaultStats()
        },
        filteredTransactions: [],
        shops: [],
        cashiers: [],
        credits: [],
        filters,
        totalCount: 0,
        filteredCount: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: handleApiError(error)
      };
    }
  },

  // Basic CRUD operations
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

  create: async (transactionData) => {
    try {
      console.log('💰 Creating transaction...', transactionData);
      
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
      console.error('❌ Error fetching cashier daily stats:', error);
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
      console.error('❌ Error fetching daily sales stats:', error);
      return null;
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

  // Get products for reports (from optimized endpoint)
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

  // Get shops for reports (from optimized endpoint)
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

  // Get cashiers for reports (from optimized endpoint)
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

  // Get expenses for reports (from optimized endpoint)
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
  // Get complete dashboard data using optimized endpoint
  getDashboardData: async (filters = {}) => {
    try {
      console.log('📈 Fetching complete dashboard data via optimized endpoint...', filters);
      
      const transactionReportsData = await transactionAPI.getTransactionReportsData(filters);
      
      // Enhanced credit statistics
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
          financialStats: CalculationUtils.getDefaultStats()
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
  
  // Export report data
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
  
  // Clear report cache
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
  cache,
  CalculationUtils
};

export default apiService;
export { handleApiError, CalculationUtils };
import axios from 'axios';
import { CalculationUtils } from '../utils/calculationUtils';

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
const REQUEST_TIMEOUT = 30000;

// Create axios instance
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
      const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken') || localStorage.getItem('cashierToken');
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
        localStorage.removeItem('cashierToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('adminData');
        localStorage.removeItem('cashierData');
        if (typeof window !== 'undefined') {
          window.location.href = '/cashier/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// API instances
const api = createApiInstance();

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
  
  // Handle specific authentication errors
  if (error.response?.status === 400 || error.response?.status === 401) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    return 'Invalid email or password. Please try again.';
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

// ==================== AUTH API SERVICE ====================

export const authAPI = {
  // Cashier login with email and password
  cashierLogin: async (credentials) => {
    try {
      console.log('🔐 Attempting cashier login with:', { 
        email: credentials.email, 
        hasPassword: !!credentials.password 
      });

      // Clear any existing tokens and data first
      localStorage.removeItem('cashierToken');
      localStorage.removeItem('cashierData');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');

      let response;
      let usedEndpoint = '';
      
      // Try multiple possible login endpoints
      const loginAttempts = [
        '/auth/cashier/login',
        '/cashier/login',
        '/auth/login',
        '/users/login',
        '/login'
      ];

      for (const endpoint of loginAttempts) {
        try {
          console.log(`🔄 Trying login endpoint: ${endpoint}`);
          response = await api.post(endpoint, {
            email: credentials.email,
            password: credentials.password,
            role: 'cashier'
          });
          usedEndpoint = endpoint;
          console.log(`✅ Success with endpoint: ${endpoint}`);
          break;
        } catch (endpointError) {
          console.log(`❌ Failed with endpoint ${endpoint}:`, endpointError.response?.status);
          continue;
        }
      }

      if (!response) {
        throw new Error('All login endpoints failed. Please check backend routes.');
      }

      console.log('✅ Login response received:', response.data);

      const data = response.data;
      
      if (data.success === true || data.token || data.access_token) {
        const user = data.user || data.data?.user || data.data || data;
        const token = data.token || data.access_token;
        
        if (!token) {
          throw new Error('No authentication token received');
        }

        // Store token and user data
        localStorage.setItem('cashierToken', token);
        localStorage.setItem('cashierData', JSON.stringify(user));
        localStorage.setItem('userToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        
        cache.clearAll();
        
        console.log('✅ Cashier login successful:', {
          user: { id: user.id, email: user.email, role: user.role },
          tokenReceived: !!token,
          endpointUsed: usedEndpoint
        });
        
        return {
          success: true,
          user: user,
          token: token,
          message: data.message || 'Login successful'
        };
      } else {
        throw new Error(data.message || 'Login failed: Invalid response structure');
      }
    } catch (error) {
      console.error('❌ Cashier login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Clear any partial data on error
      localStorage.removeItem('cashierToken');
      localStorage.removeItem('cashierData');
      
      let errorMessage = handleApiError(error);
      
      if (error.response?.status === 404) {
        errorMessage = 'Login service unavailable. Please contact administrator.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('All login endpoints failed')) {
        errorMessage = 'Cannot connect to authentication service. Please check if the server is running.';
      }
      
      throw new Error(errorMessage);
    }
  },

  // Admin/secure code login
  requestSecureCode: async (emailData) => {
    try {
      const response = await api.post('/auth/request-code', emailData);
      return response.data;
    } catch (error) {
      console.error('❌ Secure code request error:', error);
      throw new Error(handleApiError(error));
    }
  },

  verifySecureCode: async (codeData) => {
    try {
      const response = await api.post('/auth/verify-code', codeData);
      
      const data = response.data;
      const user = data.user || data.data?.user || data.data || data;
      
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

  logout: () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('adminData');
    localStorage.removeItem('cashierData');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('cashierToken');
    cache.clearAll();
    console.log('✅ Logout completed - all user data cleared');
  },

  // Utility function to check if cashier is logged in
  isCashierLoggedIn: () => {
    const token = localStorage.getItem('cashierToken') || localStorage.getItem('userToken');
    const cashierData = localStorage.getItem('cashierData') || localStorage.getItem('userData');
    
    if (token && cashierData) {
      try {
        const user = JSON.parse(cashierData);
        return user.role === 'cashier';
      } catch (error) {
        return false;
      }
    }
    return false;
  },

  // Get current cashier data
  getCurrentCashier: () => {
    try {
      const cashierData = localStorage.getItem('cashierData') || localStorage.getItem('userData');
      if (cashierData) {
        const user = JSON.parse(cashierData);
        return user.role === 'cashier' ? user : null;
      }
      return null;
    } catch (error) {
      console.error('Error parsing cashier data:', error);
      return null;
    }
  }
};

// ==================== ENHANCED UNIFIED API SERVICE ====================

export const unifiedAPI = {
  getCombinedTransactions: async (params = {}) => {
    try {
      console.log('🚀 Fetching enhanced combined transactions with credit normalization...', params);
      
      const cacheKey = `combined_transactions_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached combined transactions');
        return cached;
      }
      
      const response = await api.get('/transactions/combined', { params });
      
      const data = response.data?.data || response.data;
      
      console.log('📊 Raw API Response Structure:', {
        hasSummary: !!data.summary,
        hasFinancialStats: !!data.financialStats,
        hasEnhancedStats: !!data.enhancedStats,
        keys: Object.keys(data),
        transactionsCount: data.transactions?.length || data.salesWithProfit?.length || 0
      });

      // Extract transactions from various possible locations in the response
      const transactions = data.transactions || 
                          data.salesWithProfit || 
                          data.filteredTransactions || 
                          data.comprehensiveData?.transactions || 
                          [];

      // Extract other data with proper fallbacks
      const expenses = data.expenses || data.comprehensiveData?.expenses || [];
      const credits = data.credits || data.comprehensiveData?.credits || [];
      const products = data.products || data.comprehensiveData?.products || [];
      const shops = data.shops || data.comprehensiveData?.shops || [];
      const cashiers = data.cashiers || data.comprehensiveData?.cashiers || [];

      // ENHANCED: Normalize credit data for consistency
      const normalizedCredits = credits.map(credit => ({
        ...credit,
        // Ensure consistent field names and calculations
        totalAmount: CalculationUtils.safeNumber(credit.totalAmount),
        amountPaid: CalculationUtils.safeNumber(credit.amountPaid),
        balanceDue: CalculationUtils.safeNumber(credit.balanceDue) || 
                   Math.max(0, CalculationUtils.safeNumber(credit.totalAmount) - CalculationUtils.safeNumber(credit.amountPaid)),
        // Normalize status
        status: credit.status || 'pending',
        // Ensure consistent customer information
        customerName: credit.customerName || 'Unknown Customer',
        customerPhone: credit.customerPhone || '',
        // Normalize shop information
        shopName: credit.shopName || (credit.shop && typeof credit.shop === 'object' ? credit.shop.name : 'Unknown Shop'),
        shopId: credit.shopId || (credit.shop && typeof credit.shop === 'object' ? credit.shop._id : null),
        // Normalize cashier information
        cashierName: credit.cashierName || 'Unknown Cashier',
        cashierId: credit.cashierId || null,
        // Add calculated fields
        collectionRate: CalculationUtils.safeNumber(credit.totalAmount) > 0 ? 
          (CalculationUtils.safeNumber(credit.amountPaid) / CalculationUtils.safeNumber(credit.totalAmount)) * 100 : 0,
        isOverdue: credit.dueDate && new Date(credit.dueDate) < new Date() && 
                  CalculationUtils.safeNumber(credit.balanceDue) > 0
      }));

      // ENHANCED: Normalize transaction data for consistency
      const normalizedTransactions = transactions.map(transaction => {
        const isCredit = transaction.paymentMethod === 'credit' || 
                        transaction.isCreditTransaction === true ||
                        transaction.status === 'credit';
        
        // Calculate consistent credit metrics
        const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
        const amountPaid = CalculationUtils.safeNumber(transaction.amountPaid);
        const recognizedRevenue = CalculationUtils.safeNumber(transaction.recognizedRevenue);
        const outstandingRevenue = CalculationUtils.safeNumber(transaction.outstandingRevenue);
        
        let normalizedCreditData = {};
        
        if (isCredit) {
          // Ensure consistent credit calculations
          const calculatedAmountPaid = amountPaid || recognizedRevenue || 0;
          const calculatedOutstanding = outstandingRevenue || Math.max(0, totalAmount - calculatedAmountPaid);
          const calculatedRecognized = recognizedRevenue || calculatedAmountPaid;
          
          // Calculate credit status
          let creditStatus = transaction.creditStatus;
          if (!creditStatus) {
            if (calculatedOutstanding <= 0) {
              creditStatus = 'paid';
            } else if (calculatedAmountPaid > 0) {
              creditStatus = 'partially_paid';
            } else {
              creditStatus = 'pending';
            }
            
            // Check if overdue
            if (transaction.dueDate && new Date(transaction.dueDate) < new Date() && calculatedOutstanding > 0) {
              creditStatus = 'overdue';
            }
          }
          
          normalizedCreditData = {
            isCreditTransaction: true,
            amountPaid: calculatedAmountPaid,
            recognizedRevenue: calculatedRecognized,
            outstandingRevenue: calculatedOutstanding,
            creditStatus: creditStatus,
            collectionRate: totalAmount > 0 ? (calculatedRecognized / totalAmount) * 100 : 0
          };
        } else {
          normalizedCreditData = {
            isCreditTransaction: false,
            amountPaid: totalAmount,
            recognizedRevenue: totalAmount,
            outstandingRevenue: 0,
            creditStatus: null,
            collectionRate: 100
          };
        }
        
        return {
          ...transaction,
          // Normalize core financial data
          totalAmount: totalAmount,
          cost: CalculationUtils.safeNumber(transaction.cost),
          profit: CalculationUtils.safeNumber(transaction.profit),
          profitMargin: CalculationUtils.safeNumber(transaction.profitMargin),
          // Add normalized credit data
          ...normalizedCreditData,
          // Normalize display data
          displayDate: transaction.displayDate || 
                      new Date(transaction.saleDate || transaction.createdAt).toLocaleString('en-KE'),
          // Normalize shop information
          shopName: transaction.shopName || 
                   (transaction.shop && typeof transaction.shop === 'object' ? transaction.shop.name : 'Unknown Shop'),
          // Normalize cashier information
          cashierName: transaction.cashierName || 'Unknown Cashier',
          // Add validation flag
          _isValid: true,
          _normalizedAt: new Date().toISOString()
        };
      });

      console.log('📈 Normalized data counts:', {
        transactions: normalizedTransactions.length,
        creditTransactions: normalizedTransactions.filter(t => t.isCreditTransaction).length,
        completeTransactions: normalizedTransactions.filter(t => !t.isCreditTransaction).length,
        expenses: expenses.length,
        credits: normalizedCredits.length,
        products: products.length,
        shops: shops.length,
        cashiers: cashiers.length
      });

      // ENHANCED: Calculate consistent financial stats
      const creditTransactions = normalizedTransactions.filter(t => t.isCreditTransaction);
      const totalCreditSales = creditTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const recognizedCreditRevenue = creditTransactions.reduce((sum, t) => sum + t.recognizedRevenue, 0);
      const outstandingCredit = creditTransactions.reduce((sum, t) => sum + t.outstandingRevenue, 0);
      
      // Also calculate from credits data for verification
      const totalCreditFromCredits = normalizedCredits.reduce((sum, c) => sum + c.totalAmount, 0);
      const outstandingFromCredits = normalizedCredits.reduce((sum, c) => sum + c.balanceDue, 0);

      // Use the maximum value to ensure consistency
      const consistentCreditSales = Math.max(totalCreditSales, totalCreditFromCredits);
      const consistentOutstanding = Math.max(outstandingCredit, outstandingFromCredits);

      // Enhanced data structure with consistent calculations
      const enhancedData = {
        // Core normalized data arrays
        transactions: normalizedTransactions,
        salesWithProfit: normalizedTransactions,
        filteredTransactions: normalizedTransactions,
        expenses: expenses,
        credits: normalizedCredits,
        products: products,
        shops: shops,
        cashiers: cashiers,
        
        // Enhanced statistics and summaries with consistent credit calculations
        summary: {
          ...(data.summary || CalculationUtils.getDefaultStats()),
          // Override with consistent credit calculations
          creditSales: consistentCreditSales,
          outstandingCredit: consistentOutstanding,
          totalCreditGiven: consistentCreditSales,
          recognizedCreditRevenue: recognizedCreditRevenue,
          creditSalesCount: Math.max(creditTransactions.length, normalizedCredits.length),
          creditCollectionRate: consistentCreditSales > 0 ? 
            ((consistentCreditSales - consistentOutstanding) / consistentCreditSales) * 100 : 0
        },
        
        financialStats: {
          ...(data.financialStats || data.summary || CalculationUtils.getDefaultStats()),
          // Ensure consistent credit metrics
          creditSales: consistentCreditSales,
          outstandingCredit: consistentOutstanding,
          totalCreditGiven: consistentCreditSales,
          recognizedCreditRevenue: recognizedCreditRevenue,
          creditSalesCount: Math.max(creditTransactions.length, normalizedCredits.length),
          creditCollectionRate: consistentCreditSales > 0 ? 
            ((consistentCreditSales - consistentOutstanding) / consistentCreditSales) * 100 : 0
        },
        
        enhancedStats: data.enhancedStats || {
          salesWithProfit: normalizedTransactions,
          financialStats: data.summary || data.financialStats || CalculationUtils.getDefaultStats()
        },
        
        comprehensiveData: data.comprehensiveData || {
          transactions: normalizedTransactions,
          expenses: expenses,
          products: products,
          credits: normalizedCredits,
          summary: data.summary || CalculationUtils.getDefaultStats()
        },
        
        // Performance data
        performance: data.performance || {
          topProducts: [],
          shopPerformance: [],
          topCashiers: []
        },
        
        // Add consistency metadata
        _metadata: {
          processedAt: new Date().toISOString(),
          dataConsistency: {
            creditTransactionsFromTransactions: creditTransactions.length,
            creditsFromCredits: normalizedCredits.length,
            totalCreditSalesFromTransactions: totalCreditSales,
            totalCreditSalesFromCredits: totalCreditFromCredits,
            outstandingFromTransactions: outstandingCredit,
            outstandingFromCredits: outstandingFromCredits,
            consistencyScore: Math.abs(totalCreditSales - totalCreditFromCredits) < 1 ? 'HIGH' : 
                             Math.abs(totalCreditSales - totalCreditFromCredits) < 10 ? 'MEDIUM' : 'LOW'
          },
          normalizationApplied: true
        }
      };

      console.log('✅ Enhanced data structure created with credit normalization:', {
        transactionsCount: enhancedData.transactions.length,
        creditTransactions: creditTransactions.length,
        creditsCount: normalizedCredits.length,
        totalCreditSales: consistentCreditSales,
        outstandingCredit: consistentOutstanding,
        consistency: enhancedData._metadata.dataConsistency.consistencyScore
      });

      cache.set(cacheKey, enhancedData);
      console.log('✅ Combined transactions data received and enhanced with credit normalization');
      return enhancedData;
    } catch (error) {
      console.error('❌ Error fetching combined transactions:', error);
      
      // Return comprehensive fallback data with proper structure
      const fallbackData = {
        transactions: [],
        salesWithProfit: [],
        filteredTransactions: [],
        shops: [],
        cashiers: [],
        products: [],
        expenses: [],
        credits: [],
        summary: CalculationUtils.getDefaultStats(),
        financialStats: CalculationUtils.getDefaultStats(),
        enhancedStats: {
          salesWithProfit: [],
          financialStats: CalculationUtils.getDefaultStats()
        },
        comprehensiveData: {
          transactions: [],
          expenses: [],
          products: [],
          credits: [],
          summary: CalculationUtils.getDefaultStats()
        },
        _metadata: {
          processedAt: new Date().toISOString(),
          dataConsistency: {
            creditTransactionsFromTransactions: 0,
            creditsFromCredits: 0,
            totalCreditSalesFromTransactions: 0,
            totalCreditSalesFromCredits: 0,
            outstandingFromTransactions: 0,
            outstandingFromCredits: 0,
            consistencyScore: 'N/A (Fallback)'
          },
          normalizationApplied: false,
          error: true
        },
        error: handleApiError(error)
      };
      
      console.log('🔄 Returning fallback data structure');
      return fallbackData;
    }
  },

  // ENHANCED: Create transaction with stock reduction and credit normalization
  createTransaction: async (transactionData) => {
    try {
      console.log('💰 Creating transaction with stock reduction:', transactionData);
      const response = await api.post('/transactions', transactionData);
      cache.clearAll();
      
      // Normalize the response data
      const createdTransaction = response.data?.data || response.data;
      const normalizedTransaction = CalculationUtils.processSingleTransaction(createdTransaction);
      
      console.log('✅ Transaction created successfully with stock reduction');
      return normalizedTransaction;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  // ENHANCED: Combined reports with credit normalization
  getCombinedReports: async (params = {}) => {
    try {
      console.log('📊 Generating combined reports with credit normalization...', params);
      
      const cacheKey = `combined_reports_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached combined reports');
        return cached;
      }
      
      // Use the normalized transactions data as base
      const transactionsData = await unifiedAPI.getCombinedTransactions(params);
      
      const enhancedReports = {
        ...transactionsData,
        salesSummary: transactionsData.salesSummary || {
          financialStats: transactionsData.financialStats,
          topProducts: transactionsData.performance?.topProducts || [],
          topCashiers: transactionsData.performance?.topCashiers || []
        },
        productPerformance: transactionsData.productPerformance || {
          products: transactionsData.products,
          summary: {}
        },
        cashierPerformance: transactionsData.cashierPerformance || {
          cashiers: transactionsData.cashiers,
          summary: {}
        },
        comprehensiveReport: transactionsData.comprehensiveReport || {
          summary: transactionsData.financialStats,
          transactions: transactionsData.transactions,
          expenses: transactionsData.expenses,
          products: transactionsData.products,
          credits: transactionsData.credits
        },
        // Add credit-specific analysis
        creditAnalysis: await unifiedAPI.getCombinedCreditAnalysis(params)
      };
      
      cache.set(cacheKey, enhancedReports);
      console.log('✅ Combined reports generated with credit normalization');
      return enhancedReports;
    } catch (error) {
      console.error('❌ Error generating combined reports:', error);
      
      const cacheKey = `combined_reports_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached reports due to error');
        return cached;
      }
      
      return {
        salesSummary: {
          financialStats: CalculationUtils.getDefaultStats(),
          topProducts: [],
          topCashiers: []
        },
        productPerformance: {
          products: [],
          summary: {}
        },
        cashierPerformance: {
          cashiers: [],
          summary: {}
        },
        comprehensiveReport: {
          summary: CalculationUtils.getDefaultStats(),
          transactions: [],
          expenses: [],
          products: [],
          credits: []
        },
        creditAnalysis: {
          totalCreditSales: 0,
          outstandingCredit: 0,
          creditSalesCount: 0
        },
        error: handleApiError(error)
      };
    }
  },

  // ENHANCED: Combined credit analysis with data consistency
  getCombinedCreditAnalysis: async (params = {}) => {
    try {
      console.log('💳 Fetching combined credit analysis with consistency...', params);
      
      const cacheKey = `credit_analysis_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached credit analysis');
        return cached;
      }
      
      // Get normalized data from unified endpoint
      const transactionsData = await unifiedAPI.getCombinedTransactions(params);
      
      // Use the already normalized data
      const creditTransactions = transactionsData.transactions?.filter(t => t.isCreditTransaction) || [];
      const credits = transactionsData.credits || [];
      
      // Calculate metrics using normalized data
      const totalCreditSales = transactionsData.financialStats?.creditSales || 
                              creditTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      
      const recognizedCreditRevenue = transactionsData.financialStats?.recognizedCreditRevenue ||
                                    creditTransactions.reduce((sum, t) => sum + (t.recognizedRevenue || 0), 0);
      
      const outstandingCredit = transactionsData.financialStats?.outstandingCredit ||
                              creditTransactions.reduce((sum, t) => sum + (t.outstandingRevenue || 0), 0);
      
      // Calculate credit status breakdown from normalized data
      const statusBreakdown = {
        pending: creditTransactions.filter(t => t.creditStatus === 'pending').length,
        partially_paid: creditTransactions.filter(t => t.creditStatus === 'partially_paid').length,
        paid: creditTransactions.filter(t => t.creditStatus === 'paid').length,
        overdue: creditTransactions.filter(t => t.creditStatus === 'overdue').length
      };
      
      // Calculate shop breakdown from normalized data
      const shopBreakdown = {};
      creditTransactions.forEach(transaction => {
        const shopName = transaction.shopName || 'Unknown Shop';
        if (!shopBreakdown[shopName]) {
          shopBreakdown[shopName] = {
            totalCredit: 0,
            outstanding: 0,
            transactionCount: 0,
            collectionRate: 0
          };
        }
        shopBreakdown[shopName].totalCredit += transaction.totalAmount || 0;
        shopBreakdown[shopName].outstanding += transaction.outstandingRevenue || 0;
        shopBreakdown[shopName].transactionCount += 1;
        shopBreakdown[shopName].collectionRate = shopBreakdown[shopName].totalCredit > 0 ?
          ((shopBreakdown[shopName].totalCredit - shopBreakdown[shopName].outstanding) / shopBreakdown[shopName].totalCredit) * 100 : 0;
      });
      
      // Enhanced credit analysis structure with consistent data
      const enhancedAnalysis = {
        // Core metrics using normalized data
        totalCreditSales: parseFloat(totalCreditSales.toFixed(2)),
        outstandingCredit: parseFloat(outstandingCredit.toFixed(2)),
        recognizedCreditRevenue: parseFloat(recognizedCreditRevenue.toFixed(2)),
        
        // Additional calculated metrics
        creditSalesCount: Math.max(creditTransactions.length, credits.length),
        creditCollectionRate: totalCreditSales > 0 ? 
          parseFloat(((totalCreditSales - outstandingCredit) / totalCreditSales) * 100).toFixed(2) : 0,
        averageCreditSale: Math.max(creditTransactions.length, credits.length) > 0 ? 
          parseFloat((totalCreditSales / Math.max(creditTransactions.length, credits.length)).toFixed(2)) : 0,
        overdueCredit: creditTransactions.filter(t => t.creditStatus === 'overdue')
          .reduce((sum, t) => sum + (t.outstandingRevenue || 0), 0),
        creditRiskScore: Math.max(0, 100 - (outstandingCredit / Math.max(totalCreditSales, 1)) * 100),
        
        // Data sources for transparency
        dataSources: {
          creditTransactions: creditTransactions.length,
          creditRecords: credits.length,
          consistency: transactionsData._metadata?.dataConsistency?.consistencyScore || 'UNKNOWN'
        },
        
        // Structured analysis sections
        summary: {
          totalCreditSales: parseFloat(totalCreditSales.toFixed(2)),
          creditSalesCount: Math.max(creditTransactions.length, credits.length),
          recognizedCreditRevenue: parseFloat(recognizedCreditRevenue.toFixed(2)),
          creditCollectionRate: totalCreditSales > 0 ? 
            parseFloat(((totalCreditSales - outstandingCredit) / totalCreditSales) * 100).toFixed(2) : 0,
          outstandingCredit: parseFloat(outstandingCredit.toFixed(2)),
          averageCreditSale: Math.max(creditTransactions.length, credits.length) > 0 ? 
            parseFloat((totalCreditSales / Math.max(creditTransactions.length, credits.length)).toFixed(2)) : 0,
          overdueAmount: creditTransactions.filter(t => t.creditStatus === 'overdue')
            .reduce((sum, t) => sum + (t.outstandingRevenue || 0), 0),
          creditRiskScore: Math.max(0, 100 - (outstandingCredit / Math.max(totalCreditSales, 1)) * 100),
          statusBreakdown
        },
        
        comprehensive: {
          summary: {
            totalCreditSales: parseFloat(totalCreditSales.toFixed(2)),
            outstandingCredit: parseFloat(outstandingCredit.toFixed(2)),
            collectionRate: totalCreditSales > 0 ? 
              parseFloat(((totalCreditSales - outstandingCredit) / totalCreditSales) * 100).toFixed(2) : 0
          },
          statusBreakdown,
          shopBreakdown: Object.entries(shopBreakdown).map(([shopName, data]) => ({
            shopName,
            ...data,
            totalCredit: parseFloat(data.totalCredit.toFixed(2)),
            outstanding: parseFloat(data.outstanding.toFixed(2)),
            collectionRate: parseFloat(data.collectionRate.toFixed(2))
          }))
        },
        
        transactionAnalysis: {
          transactions: creditTransactions,
          summary: {
            totalAmount: parseFloat(totalCreditSales.toFixed(2)),
            averageAmount: creditTransactions.length > 0 ? 
              parseFloat((totalCreditSales / creditTransactions.length).toFixed(2)) : 0,
            collectionRate: totalCreditSales > 0 ? 
              parseFloat((recognizedCreditRevenue / totalCreditSales) * 100).toFixed(2) : 0
          }
        },
        
        credits: credits,
        creditTransactions: creditTransactions
      };
      
      cache.set(cacheKey, enhancedAnalysis);
      console.log('✅ Combined credit analysis calculated with data consistency');
      return enhancedAnalysis;
    } catch (error) {
      console.error('❌ Error in credit analysis calculation:', error);
      
      const cacheKey = `credit_analysis_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('🔄 Using stale cached analysis due to error');
        return cached;
      }
      
      // Return comprehensive fallback data
      return {
        totalCreditSales: 0,
        outstandingCredit: 0,
        recognizedCreditRevenue: 0,
        creditSalesCount: 0,
        creditCollectionRate: 0,
        averageCreditSale: 0,
        overdueCredit: 0,
        creditRiskScore: 100,
        dataSources: {
          creditTransactions: 0,
          creditRecords: 0,
          consistency: 'ERROR'
        },
        summary: {
          totalCreditSales: 0,
          creditSalesCount: 0,
          recognizedCreditRevenue: 0,
          creditCollectionRate: 0,
          outstandingCredit: 0,
          averageCreditSale: 0,
          overdueAmount: 0,
          creditRiskScore: 100,
          statusBreakdown: {
            pending: 0,
            partially_paid: 0,
            paid: 0,
            overdue: 0
          }
        },
        comprehensive: {
          summary: {
            totalCreditSales: 0,
            outstandingCredit: 0,
            collectionRate: 0
          },
          statusBreakdown: {
            pending: 0,
            partially_paid: 0,
            paid: 0,
            overdue: 0
          },
          shopBreakdown: []
        },
        transactionAnalysis: {
          transactions: [],
          summary: {
            totalAmount: 0,
            averageAmount: 0,
            collectionRate: 0
          }
        },
        credits: [],
        creditTransactions: [],
        error: handleApiError(error)
      };
    }
  }
};

// ==================== LEGACY API COMPATIBILITY ====================

export const transactionAPI = {
  // Basic CRUD operations
  create: async (transactionData) => {
    try {
      console.log('💰 Creating transaction:', transactionData);
      const response = await api.post('/transactions', transactionData);
      cache.clearAll();
      console.log('✅ Transaction created successfully');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  getAll: async (params = {}) => {
    const data = await unifiedAPI.getCombinedTransactions(params);
    return data.transactions || [];
  },

  getById: async (id) => {
    try {
      // Handle case where id might be an object instead of string
      const transactionId = typeof id === 'object' ? id._id || id.id || id.transactionId : id;
      
      if (!transactionId) {
        throw new Error('Invalid transaction ID');
      }
      
      const response = await api.get(`/transactions/${transactionId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      // Don't throw error for transaction details to prevent breaking the credits list
      return null;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/transactions/${id}`, data);
      cache.clearAll();
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/transactions/${id}`);
      cache.clearAll();
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(handleApiError(error));
    }
  },

  // Legacy endpoints routed to unified API
  getOptimizedReports: async (filters = {}) => {
    return unifiedAPI.getCombinedTransactions({ ...filters, dataType: 'optimized' });
  },

  getFinancialAnalysis: async (params = {}) => {
    const data = await unifiedAPI.getCombinedTransactions(params);
    const creditAnalysis = await unifiedAPI.getCombinedCreditAnalysis(params);
    return {
      ...data.summary,
      creditAnalysis: creditAnalysis.summary || creditAnalysis
    };
  },

  getCreditAnalysis: async (params = {}) => {
    const analysis = await unifiedAPI.getCombinedCreditAnalysis(params);
    return analysis.summary || analysis;
  }
};

export const creditAPI = {
  // Basic CRUD operations
  create: async (creditData) => {
    try {
      console.log('💳 Creating credit record:', creditData);
      
      // Ensure we have the required fields
      if (!creditData.transactionId) {
        throw new Error('Transaction ID is required for credit record');
      }
      
      if (!creditData.customerName) {
        throw new Error('Customer name is required for credit record');
      }
      
      const response = await api.post('/credits', creditData);
      cache.clearAll();
      console.log('✅ Credit record created successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error creating credit record:', error);
      
      // Enhanced error handling
      let errorMessage = handleApiError(error);
      
      if (error.message.includes('Transaction ID')) {
        errorMessage = error.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Credit creation endpoint not found. Please check if the backend server is running.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid credit data provided';
      }
      
      throw new Error(errorMessage);
    }
  },

  getAll: async (params = {}) => {
    try {
      const response = await api.get('/credits', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching credits:', error);
      throw new Error(handleApiError(error));
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/credits/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching credit:', error);
      throw new Error(handleApiError(error));
    }
  },

  update: async (id, updateData) => {
    try {
      const response = await api.put(`/credits/${id}`, updateData);
      cache.clearAll();
      return response.data;
    } catch (error) {
      console.error('❌ Error updating credit:', error);
      throw new Error(handleApiError(error));
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/credits/${id}`);
      cache.clearAll();
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting credit:', error);
      throw new Error(handleApiError(error));
    }
  },

  // Payment operations
  patchPayment: async (id, paymentData) => {
    try {
      const response = await api.patch(`/credits/${id}/payment`, paymentData);
      cache.clearAll();
      return response.data;
    } catch (error) {
      console.error('❌ Error recording payment:', error);
      throw new Error(handleApiError(error));
    }
  },

  getPaymentHistory: async (creditId) => {
    try {
      const response = await api.get(`/credits/${creditId}/payment-history`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching payment history:', error);
      throw new Error(handleApiError(error));
    }
  },

  // Legacy analysis endpoints routed to unified API
  getAnalysisSummary: async (params = {}) => {
    const analysis = await unifiedAPI.getCombinedCreditAnalysis(params);
    return analysis.summary || analysis;
  },

  getCreditAnalysis: async (params = {}) => {
    return unifiedAPI.getCombinedCreditAnalysis(params);
  },

  getComprehensiveAnalysis: async (params = {}) => {
    const analysis = await unifiedAPI.getCombinedCreditAnalysis(params);
    return analysis.comprehensive || analysis;
  }
};

export const reportAPI = {
  getDashboardData: async (filters = {}) => {
    try {
      console.log('📈 Fetching complete dashboard data...', filters);
      
      const [transactionsData, reportsData] = await Promise.all([
        unifiedAPI.getCombinedTransactions(filters),
        unifiedAPI.getCombinedReports(filters)
      ]);
      
      const creditAnalysis = await unifiedAPI.getCombinedCreditAnalysis(filters);
      
      const dashboardData = {
        ...transactionsData,
        ...reportsData,
        creditAnalysis,
        creditStats: creditAnalysis.summary,
        loadedAt: new Date().toISOString(),
        dataSources: {
          transactions: transactionsData.transactions?.length || 0,
          shops: transactionsData.shops?.length || 0,
          cashiers: transactionsData.cashiers?.length || 0,
          products: transactionsData.products?.length || 0,
          credits: creditAnalysis.credits?.length || 0,
          expenses: transactionsData.expenses?.length || 0
        }
      };
      
      console.log('✅ Enhanced dashboard data loaded successfully');
      return dashboardData;
    } catch (error) {
      console.error('❌ Error loading enhanced dashboard data:', error);
      
      // Try to provide partial data if possible
      try {
        const transactionsData = await unifiedAPI.getCombinedTransactions(filters);
        const creditAnalysis = await unifiedAPI.getCombinedCreditAnalysis(filters);
        
        return {
          ...transactionsData,
          creditAnalysis,
          creditStats: creditAnalysis.summary,
          loadedAt: new Date().toISOString(),
          dataSources: {
            transactions: transactionsData.transactions?.length || 0,
            shops: transactionsData.shops?.length || 0,
            cashiers: transactionsData.cashiers?.length || 0,
            products: transactionsData.products?.length || 0,
            credits: creditAnalysis.credits?.length || 0,
            expenses: transactionsData.expenses?.length || 0
          },
          error: 'Partial data loaded due to server issues'
        };
      } catch (fallbackError) {
        throw new Error(handleApiError(error));
      }
    }
  },

  getCreditAnalysisReport: async (filters = {}) => {
    const analysis = await unifiedAPI.getCombinedCreditAnalysis(filters);
    return {
      ...analysis,
      reportGenerated: new Date().toISOString(),
      filters,
      summary: analysis.summary
    };
  }
};

// ==================== BASIC CRUD APIs ====================

// Basic CRUD APIs (products, shops, cashiers, expenses)
const createBasicAPI = (endpoint) => ({
  getAll: async (params = {}) => {
    try {
      console.log(`📋 Fetching ${endpoint} with params:`, params);
      
      const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`✅ Using cached ${endpoint}`);
        return cached;
      }

      const response = await api.get(`/${endpoint}`, { params });
      const data = response.data?.data || response.data;
      const items = Array.isArray(data) ? data : [];

      console.log(`✅ ${endpoint} fetched successfully:`, items.length, 'items');
      
      cache.set(cacheKey, items);
      return items;
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint}:`, error);
      
      // Enhanced error handling
      if (error.response?.status === 404) {
        console.error(`${endpoint} endpoint not found. Please check backend routes.`);
        return [];
      }
      
      const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      return cached || [];
    }
  },

  getById: async (id) => {
    try {
      console.log(`🔍 Fetching ${endpoint} by ID:`, id);
      const response = await api.get(`/${endpoint}/${id}`);
      console.log(`✅ ${endpoint} fetched successfully`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint}:`, error);
      
      let errorMessage = handleApiError(error);
      if (error.response?.status === 404) {
        errorMessage = `${endpoint} not found with ID: ${id}`;
      }
      
      throw new Error(errorMessage);
    }
  },

  create: async (data) => {
    try {
      console.log(`🆕 Creating ${endpoint}:`, data);
      const response = await api.post(`/${endpoint}`, data);
      cache.clearAll();
      console.log(`✅ ${endpoint} created successfully`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`❌ Error creating ${endpoint}:`, error);
      
      let errorMessage = handleApiError(error);
      if (error.response?.status === 404) {
        errorMessage = `${endpoint} creation endpoint not found. Please check backend routes.`;
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || `Invalid ${endpoint} data provided`;
      } else if (error.response?.status === 500) {
        errorMessage = `Server error while creating ${endpoint}. Please try again.`;
      }
      
      throw new Error(errorMessage);
    }
  },

  update: async (id, data) => {
    try {
      console.log(`✏️ Updating ${endpoint} ID:`, id, 'with data:', data);
      const response = await api.put(`/${endpoint}/${id}`, data);
      cache.clearAll();
      console.log(`✅ ${endpoint} updated successfully`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`❌ Error updating ${endpoint}:`, error);
      
      let errorMessage = handleApiError(error);
      if (error.response?.status === 404) {
        errorMessage = `${endpoint} not found with ID: ${id}`;
      }
      
      throw new Error(errorMessage);
    }
  },

  delete: async (id) => {
    try {
      console.log(`🗑️ Deleting ${endpoint} ID:`, id);
      const response = await api.delete(`/${endpoint}/${id}`);
      cache.clearAll();
      console.log(`✅ ${endpoint} deleted successfully`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`❌ Error deleting ${endpoint}:`, error);
      
      let errorMessage = handleApiError(error);
      if (error.response?.status === 404) {
        errorMessage = `${endpoint} not found with ID: ${id}`;
      } else if (error.response?.status === 409) {
        errorMessage = `Cannot delete ${endpoint} - it may be in use by other records`;
      }
      
      throw new Error(errorMessage);
    }
  }
});

export const productAPI = createBasicAPI('products');
export const shopAPI = createBasicAPI('shops');
export const cashierAPI = createBasicAPI('cashiers');

// Enhanced expense API with additional methods
export const expenseAPI = {
  ...createBasicAPI('expenses'),
  
  getStats: async (params = {}) => {
    try {
      console.log('📊 Fetching expense stats with params:', params);
      const response = await api.get('/expenses/stats/overview', { params });
      console.log('✅ Expense stats fetched successfully');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching expense stats:', error);
      
      // Return comprehensive default stats instead of throwing error
      return {
        overview: { 
          totalExpenses: 0, 
          totalAmount: 0, 
          averageExpense: 0, 
          minExpense: 0, 
          maxExpense: 0,
          expensesCount: 0
        },
        byCategory: [],
        byPaymentMethod: [],
        byShop: [],
        recentExpenses: [],
        trends: {
          daily: [],
          weekly: [],
          monthly: []
        }
      };
    }
  },

  getByDateRange: async (startDate, endDate) => {
    try {
      console.log('📅 Fetching expenses by date range:', { startDate, endDate });
      const response = await api.get('/expenses', {
        params: { startDate, endDate }
      });
      const data = response.data?.data || response.data;
      console.log('✅ Date range expenses fetched successfully:', data?.length || 0, 'items');
      return data;
    } catch (error) {
      console.error('❌ Error fetching expenses by date range:', error);
      return [];
    }
  },

  getCategories: async () => {
    try {
      console.log('📂 Fetching expense categories');
      const response = await api.get('/expenses/categories');
      const data = response.data?.data || response.data;
      console.log('✅ Expense categories fetched successfully:', data?.length || 0, 'categories');
      return data;
    } catch (error) {
      console.error('❌ Error fetching expense categories:', error);
      return [];
    }
  }
};

// ==================== MAIN API SERVICE ====================

const apiService = {
  // Unified endpoints (recommended)
  unified: unifiedAPI,
  
  // Legacy endpoints (for backward compatibility)
  auth: authAPI,
  transactions: transactionAPI,
  products: productAPI,
  shops: shopAPI,
  cashiers: cashierAPI,
  expenses: expenseAPI,
  credits: creditAPI,
  reports: reportAPI,
  
  // Utility functions
  handleApiError,
  cache
};

export default apiService;
export { handleApiError };
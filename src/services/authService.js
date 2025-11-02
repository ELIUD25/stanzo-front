import apiService from './api';

// Enhanced auth service with better error handling
const authService = {
  // Admin auth
  admin: {
    login: async (credentials) => {
      try {
        const response = await apiService.auth.admin.login(credentials);
        if (response.success && response.token) {
          // Validate token before storing
          if (apiService.utils.validateToken('admin')) {
            apiService.utils.setAuthToken(response.token, 'admin');
            localStorage.setItem('adminData', JSON.stringify(response.data));
            return response;
          } else {
            throw new Error('Invalid token received from server');
          }
        }
        return response;
      } catch (error) {
        // Clear any partial auth data on login failure
        apiService.utils.clearAuth();
        throw error;
      }
    },
    
    logout: async () => {
      try {
        const response = await apiService.auth.admin.logout();
        apiService.utils.clearAuth();
        return response;
      } catch (error) {
        // Ensure auth is cleared even if logout API fails
        apiService.utils.clearAuth();
        throw error;
      }
    },
    
    getProfile: async () => {
      try {
        // Validate token before making profile request
        if (!apiService.utils.validateToken('admin')) {
          throw new Error('Token expired or invalid');
        }
        const response = await apiService.auth.admin.getProfile();
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    // New method to check auth state without automatic redirect
    checkAuth: () => {
      return apiService.utils.validateToken('admin');
    }
  },

  // Cashier auth
  cashier: {
    login: async (credentials) => {
      try {
        const response = await apiService.auth.cashier.login(credentials);
        if (response.success && response.token) {
          // Validate token before storing
          if (apiService.utils.validateToken('cashier')) {
            apiService.utils.setAuthToken(response.token, 'cashier');
            localStorage.setItem('cashierData', JSON.stringify(response.data));
            return response;
          } else {
            throw new Error('Invalid token received from server');
          }
        }
        return response;
      } catch (error) {
        apiService.utils.clearAuth();
        throw error;
      }
    },
    
    logout: async () => {
      try {
        const response = await apiService.auth.cashier.logout();
        apiService.utils.clearAuth();
        return response;
      } catch (error) {
        apiService.utils.clearAuth();
        throw error;
      }
    },
    
    getProfile: async () => {
      try {
        // Validate token before making profile request
        if (!apiService.utils.validateToken('cashier')) {
          throw new Error('Token expired or invalid');
        }
        const response = await apiService.auth.cashier.getProfile();
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    // New method to check auth state without automatic redirect
    checkAuth: () => {
      return apiService.utils.validateToken('cashier');
    }
  },

  // Enhanced common methods
  isAuthenticated: (userType) => apiService.utils.isAuthenticated(userType),
  getToken: (userType) => apiService.utils.getAuthToken(userType),
  clearAuth: () => apiService.utils.clearAuth(),
  validateToken: (userType) => apiService.utils.validateToken(userType)
};

export default authService;
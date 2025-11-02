// src/pages/Cashier/CashierLogin.jsx - UPDATED MUI VERSION
import React, { useState } from 'react';
import { 
  Container,
  Box,
  Typography,
  Avatar,
  Paper,
  CssBaseline,
  Alert,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  PointOfSale,
  ArrowBack,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

const CashierLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  // Color scheme matching the home.jsx
  const colors = {
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
    },
    cashier: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
    },
    background: {
      main: '#0F172A',
      light: '#1E293B',
      paper: '#334155'
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Attempting cashier login...');
      console.log('📧 Email:', credentials.email);
      
      // Cashier login API call using email and password
      const response = await authAPI.cashierLogin({
        email: credentials.email,
        password: credentials.password
      });

      console.log('✅ Raw login response:', response);
      
      // Handle different response structures
      let responseData;
      if (response && typeof response === 'object') {
        // Check if response has data property (Axios response)
        if (response.data !== undefined) {
          responseData = response.data;
          console.log('📦 Response structure: Axios-style (response.data)');
        } 
        // Check if response is the actual data directly
        else if (response.success !== undefined) {
          responseData = response;
          console.log('📦 Response structure: Direct data (response)');
        }
        else {
          responseData = response;
          console.log('📦 Response structure: Unknown, using response directly');
        }
      } else {
        throw new Error('Invalid response format: ' + typeof response);
      }
      
      console.log('✅ Processed response data:', responseData);
      
      if (!responseData) {
        throw new Error('Could not extract response data');
      }
      
      // FIXED: Check for success property in responseData
      if (responseData.success === true || responseData.user || responseData.cashier) {
        // Extract cashier data from response
        const cashierData = responseData.data || responseData.cashier || responseData.user || responseData;
        
        if (!cashierData || !cashierData._id) {
          throw new Error('No valid cashier data received');
        }

        // Verify cashier has appropriate role
        const allowedRoles = ['cashier', 'manager', 'admin'];
        if (cashierData.role && !allowedRoles.includes(cashierData.role)) {
          throw new Error('Access denied. Cashier privileges required.');
        }
        
        // Check if account is active
        if (cashierData.status === 'inactive' || cashierData.isActive === false) {
          throw new Error('Cashier account is inactive. Please contact administrator.');
        }

        // Store cashier data (no tokens) - FIXED: Ensure all required fields
        const authData = {
          _id: cashierData._id,
          name: cashierData.name || cashierData.email?.split('@')[0] || 'Cashier',
          email: cashierData.email,
          role: cashierData.role || 'cashier',
          loginTime: new Date().toISOString(),
          // Include any other relevant fields
          ...(cashierData.shop && { shop: cashierData.shop }),
          ...(cashierData.permissions && { permissions: cashierData.permissions })
        };
        
        // Store in localStorage - FIXED: Using correct key and structure
        localStorage.setItem('cashierData', JSON.stringify(authData));
        
        console.log('✅ Cashier login successful - Stored data:', authData);
        console.log('👤 Logged in as:', authData.name);
        console.log('🎯 Role:', authData.role);
        
        // FIXED: Redirect to SHOP SELECTION first, not dashboard
        navigate('/cashier/shops', { 
          replace: true,
          state: { 
            loginSuccess: true,
            cashierName: authData.name
          }
        });
        
      } else {
        // FIXED: Use the message from responseData if available
        const errorMessage = responseData.message || 'Login failed. Please check your credentials.';
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('❌ Cashier login error:', err);
      
      // Enhanced error handling
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Please check if backend is running on port 5001.');
        return;
      }
      
      if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Server may be busy. Please try again.');
        return;
      }
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data || {};
        const errorMessage = errorData.message || err.message;
        
        switch (status) {
          case 401:
            setError('Invalid email or password. Please try again.');
            break;
          case 403:
            setError('Access denied. You do not have cashier privileges.');
            break;
          case 404:
            setError('Cashier account not found. Please contact administrator.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(errorMessage || `Login failed (Status: ${status})`);
        }
      } else {
        // FIXED: Use the actual error message from the caught error
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ 
      ...prev, 
      [name]: value 
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin(e);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container 
      component="main" 
      maxWidth="sm"
      sx={{
        background: colors.background.main,
        minHeight: '100vh',
        padding: 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
    >
      <CssBaseline />
      
      {/* Back Button */}
      <Box sx={{ 
        mb: 2,
        display: 'flex',
        justifyContent: 'flex-start'
      }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBackToMain}
          sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white'
            }
          }}
          disabled={loading}
        >
          Back to Main
        </Button>
      </Box>

      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1
        }}
      >
        {/* Logo/Icon */}
        <Avatar sx={{ 
          width: 70, 
          height: 70,
          background: colors.cashier.gradient,
          mb: 2,
          boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
        }}>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <PointOfSale sx={{ fontSize: 36 }} />
          )}
        </Avatar>

        {/* Title */}
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 1,
            fontWeight: 'bold',
            background: colors.cashier.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center'
          }}
        >
          Cashier Login
        </Typography>

        {/* Subtitle */}
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 3,
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center'
          }}
        >
          Sign in to access your POS system
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error"
            sx={{ 
              width: '100%', 
              mb: 3,
              borderRadius: 2,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'white',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <Paper 
          elevation={8} 
          sx={{ 
            p: 4,
            width: '100%',
            borderRadius: 3,
            background: `linear-gradient(135deg, ${colors.background.paper} 0%, rgba(51, 65, 85, 0.9) 100%)`,
            border: `1px solid rgba(16, 185, 129, 0.2)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <Box component="form" onSubmit={handleLogin} noValidate>
            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={credentials.email}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={loading}
              autoComplete="email"
              autoFocus
              placeholder="Enter your email"
              sx={{ mb: 2 }}
              InputProps={{
                sx: { 
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.cashier.main,
                  }
                }
              }}
              InputLabelProps={{
                sx: {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: colors.cashier.light,
                  }
                }
              }}
            />
            
            {/* Password Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={loading}
              autoComplete="current-password"
              placeholder="Enter your password"
              InputProps={{
                sx: { 
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.cashier.main,
                  }
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={togglePasswordVisibility}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      disabled={loading}
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.5)',
                        '&:hover': {
                          color: colors.cashier.light
                        }
                      }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              InputLabelProps={{
                sx: {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: colors.cashier.light,
                  }
                }
              }}
            />

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !credentials.email || !credentials.password}
              sx={{ 
                mt: 3, 
                mb: 2,
                py: 1.5,
                background: colors.cashier.gradient,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': {
                  background: colors.cashier.dark,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${colors.cashier.main}40`
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>
        </Paper>

        {/* Removed the instructional text as requested */}
      </Box>
    </Container>
  );
};

export default CashierLogin;
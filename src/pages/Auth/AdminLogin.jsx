// pages/Auth/AdminLogin.jsx - UPDATED WITH EMAIL-BASED SECURE CODE AUTH
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService, { authAPI } from '../../services/api';
import { 
  Container,
  Box,
  Avatar,
  Paper,
  CssBaseline,
  Alert,
  IconButton,
  InputAdornment,
  Typography,
  CircularProgress,
  Button,
  TextField,
  alpha
} from '@mui/material';
import { 
  AdminPanelSettings, 
  Email, 
  Security,
  ArrowBack 
} from '@mui/icons-material';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [step, setStep] = useState('email'); // 'email', 'code', 'success'
  const [formData, setFormData] = useState({
    email: '',
    secureCode: ''
  });

  // Color scheme aligned with Home.jsx
  const colors = {
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
    },
    admin: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
    },
    background: {
      main: '#0F172A',
      light: '#1E293B',
      paper: '#334155'
    }
  };

  // Simple storage function
  const storeUserData = (user) => {
    console.log('💾 Storing user data:', user);
    
    if (!user) {
      throw new Error('No user data provided for storage');
    }
    
    // Store user data
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('adminData', JSON.stringify(user));
    
    // Verify storage
    const storedData = localStorage.getItem('userData');
    
    if (!storedData) {
      throw new Error('Failed to store user data');
    }
    
    console.log('✅ User data storage successful');
    return true;
  };

  // Request secure code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log('📧 Requesting secure code for:', formData.email);
      
      const response = await authAPI.requestSecureCode({
        email: formData.email
      });

      console.log('✅ Secure code response:', response);
      
      if (response.success) {
        setMessage(`Secure code sent to ${formData.email}`);
        setStep('code');
      } else {
        setError(response.message || 'Failed to send secure code');
      }
      
    } catch (err) {
      console.error('❌ Secure code request error:', err);
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data || {};
        const message = errorData.message || err.message;
        
        switch (status) {
          case 404:
            setError('No account found with this email address.');
            break;
          case 429:
            setError('Too many attempts. Please try again later.');
            break;
          case 400:
            setError(message || 'Invalid email address.');
            break;
          case 500:
            setError('Email service temporarily unavailable. Please try again later.');
            break;
          default:
            setError(message || `Error: ${status}`);
        }
      } else if (err.request) {
        setError('Server not responding. Please check your connection.');
      } else {
        setError(err.message || 'Failed to request secure code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify secure code and login
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!formData.secureCode || formData.secureCode.length !== 6) {
      setError('Please enter the 6-digit secure code');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log('🔐 Verifying secure code for:', formData.email);
      
      const response = await authAPI.verifySecureCode({
        email: formData.email,
        code: formData.secureCode
      });

      console.log('✅ Verification response:', response);
      
      if (response.success) {
        setMessage('Login successful! Redirecting...');
        
        // Extract user data from response
        let userData = null;
        
        if (response.user) {
          userData = response.user;
        } else if (response.data && response.data.user) {
          userData = response.data.user;
        } else {
          // Create user data from available info
          userData = {
            email: formData.email,
            role: 'admin',
            name: 'System Administrator',
            lastLogin: new Date().toISOString()
          };
        }

        console.log('👤 Extracted user data:', userData);

        // Verify admin role
        if (userData.role !== 'admin') {
          throw new Error('Access denied. Admin privileges required.');
        }

        // Store user data
        try {
          const storageSuccess = storeUserData(userData);
          
          if (!storageSuccess) {
            throw new Error('Storage validation failed');
          }
          
          console.log('🎉 Admin login process completed successfully');
          
          // Store token if available
          if (response.token) {
            localStorage.setItem('adminToken', response.token);
          }
          
          // Add a small delay to ensure storage is processed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Navigate to admin dashboard
          const redirectPath = location.state?.from || '/admin/dashboard';
          navigate(redirectPath, { 
            replace: true,
            state: { 
              loginSuccess: true,
              timestamp: Date.now(),
              adminEmail: userData.email
            }
          });
          
        } catch (storageError) {
          console.error('❌ Storage error:', storageError);
          setError('Failed to save login information. Please try again.');
        }
      } else {
        setError(response.message || 'Invalid secure code');
      }
      
    } catch (err) {
      console.error('❌ Code verification error:', err);
      
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data || {};
        const message = errorData.message || err.message;
        
        switch (status) {
          case 400:
            setError(message || 'Invalid or expired code.');
            break;
          case 401:
            setError('Invalid secure code. Please try again.');
            break;
          case 404:
            setError('No secure code found. Please request a new one.');
            break;
          case 429:
            setError('Too many failed attempts. Please request a new code.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(message || `Error: ${status}`);
        }
      } else if (err.request) {
        setError('Server not responding. Please check your connection.');
      } else {
        setError(err.message || 'Failed to verify secure code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For secure code, only allow numbers and limit to 6 digits
    if (name === 'secureCode') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const handleBackToEmail = () => {
    setStep('email');
    setFormData(prev => ({ ...prev, secureCode: '' }));
    setError('');
    setMessage('');
  };

  const getStepIcon = () => {
    switch (step) {
      case 'email':
        return <Email />;
      case 'code':
        return <Security />;
      default:
        return <AdminPanelSettings />;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'email':
        return 'Admin Portal Access';
      case 'code':
        return 'Enter Secure Code';
      default:
        return 'Admin Portal';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 'email':
        return 'Enter your email to receive a secure login code';
      case 'code':
        return `Check ${formData.email} for your 6-digit code`;
      default:
        return 'Secure Administrator Access';
    }
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
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <CssBaseline />
      
      <Box
        sx={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3
        }}
      >
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography 
            component="h1" 
            variant="h4" 
            sx={{ 
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)',
              background: colors.admin.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1
            }}
          >
            {getStepTitle()}
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: alpha('#fff', 0.8),
              fontWeight: 300
            }}
          >
            {getStepSubtitle()}
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error"
            sx={{ 
              width: '100%', 
              borderRadius: 2,
              border: `1px solid ${alpha('#ef5350', 0.3)}`
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {message && (
          <Alert 
            severity="success"
            sx={{ 
              width: '100%', 
              borderRadius: 2,
              border: `1px solid ${alpha('#4caf50', 0.3)}`
            }} 
            onClose={() => setMessage(null)}
          >
            {message}
          </Alert>
        )}

        {/* Login Form */}
        <Paper 
          elevation={8} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            width: '100%',
            background: `linear-gradient(135deg, ${colors.background.paper} 0%, ${alpha(colors.background.paper, 0.8)} 100%)`,
            border: `1px solid ${alpha(colors.admin.main, 0.2)}`,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                m: '0 auto 16px',
                background: colors.admin.gradient
              }}
            >
              {loading ? (
                <CircularProgress size={40} color="inherit" />
              ) : (
                getStepIcon()
              )}
            </Avatar>
          </Box>

          {/* Email Step */}
          {step === 'email' && (
            <Box component="form" onSubmit={handleRequestCode}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                autoComplete="email"
                autoFocus
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: alpha('#fff', 0.3),
                    },
                    '&:hover fieldset': {
                      borderColor: colors.admin.light,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: colors.admin.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: alpha('#fff', 0.7),
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: colors.admin.light,
                  },
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !formData.email}
                sx={{ 
                  py: 1.5, 
                  borderRadius: 2,
                  background: colors.admin.gradient,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  '&:hover': {
                    background: colors.admin.dark,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 25px ${alpha(colors.admin.main, 0.4)}`,
                  },
                  '&:disabled': {
                    background: alpha(colors.admin.main, 0.5),
                  },
                  transition: 'all 0.3s ease'
                }}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Email />}
              >
                {loading ? 'SENDING CODE...' : 'SEND SECURE CODE'}
              </Button>
            </Box>
          )}

          {/* Code Verification Step */}
          {step === 'code' && (
            <Box component="form" onSubmit={handleVerifyCode}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="secureCode"
                label="6-Digit Secure Code"
                type="text"
                value={formData.secureCode}
                onChange={handleChange}
                disabled={loading}
                autoComplete="one-time-code"
                autoFocus
                inputProps={{
                  maxLength: 6,
                  pattern: '[0-9]*',
                  inputMode: 'numeric'
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: alpha('#fff', 0.3),
                    },
                    '&:hover fieldset': {
                      borderColor: colors.admin.light,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: colors.admin.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: alpha('#fff', 0.7),
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: colors.admin.light,
                  },
                }}
              />
              
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  textAlign: 'center',
                  color: alpha('#fff', 0.6),
                  mb: 3
                }}
              >
                Enter the 6-digit code sent to {formData.email}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  disabled={loading}
                  onClick={handleBackToEmail}
                  sx={{ 
                    flex: 1,
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: alpha('#fff', 0.3),
                    color: 'white',
                    '&:hover': {
                      borderColor: colors.admin.light,
                      backgroundColor: alpha(colors.admin.light, 0.1),
                    },
                  }}
                  startIcon={<ArrowBack />}
                >
                  BACK
                </Button>
                
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || formData.secureCode.length !== 6}
                  sx={{ 
                    flex: 2,
                    py: 1.5,
                    borderRadius: 2,
                    background: colors.admin.gradient,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: colors.admin.dark,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(colors.admin.main, 0.4)}`,
                    },
                    '&:disabled': {
                      background: alpha(colors.admin.main, 0.5),
                    },
                    transition: 'all 0.3s ease'
                  }}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Security />}
                >
                  {loading ? 'VERIFYING...' : 'VERIFY CODE'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {/* Footer Note */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.6) }}>
            {step === 'email' 
              ? 'Secure access for authorized administrators only' 
              : 'Codes expire after 15 minutes for security'
            }
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminLogin;
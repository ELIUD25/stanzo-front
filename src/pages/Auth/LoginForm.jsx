import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  Container
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ userType = 'cashier' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Navigation based on user type
      if (userType === 'cashier') {
        navigate('/cashier/login');
      } else {
        navigate('/admin/login');
      }
    } catch (error) {
      setError('Login navigation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Color scheme based on user type
  const themeColors = {
    cashier: {
      primary: '#1976d2', // Blue
      gradient: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
      light: '#e3f2fd'
    },
    admin: {
      primary: '#d32f2f', // Red
      gradient: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
      light: '#ffebee'
    }
  };

  const colors = themeColors[userType];

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          py: 4
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 6,
            width: '100%',
            maxWidth: 420,
            borderRadius: 3,
            background: '#ffffff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            border: `1px solid ${colors.light}`
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 4
            }}
          >
            <Avatar
              sx={{
                bgcolor: colors.primary,
                mb: 2,
                width: 60,
                height: 60,
                background: colors.gradient
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 30 }} />
            </Avatar>
            <Typography 
              component="h1" 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold',
                background: colors.gradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1
              }}
            >
              {userType === 'cashier' ? 'Cashier Login' : 'Admin Login'}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ textAlign: 'center' }}
            >
              Welcome back! Please sign in to your account
            </Typography>
          </Box>

          {/* Form Section */}
          <Box 
            component="form" 
            onSubmit={handleSubmit} 
            noValidate 
            sx={{ mt: 2 }}
          >
            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                  },
                },
              }}
            />

            {/* Password Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                  },
                },
              }}
            />

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mt: 2, 
                  borderRadius: 2,
                  border: '1px solid #ffcdd2'
                }}
              >
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !email || !password}
              sx={{
                mt: 4,
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                background: colors.gradient,
                boxShadow: `0 4px 15px ${colors.primary}40`,
                '&:hover': {
                  background: colors.primary,
                  boxShadow: `0 6px 20px ${colors.primary}60`,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: '#bdbdbd',
                  transform: 'none',
                  boxShadow: 'none',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Helper Text */}
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center"
              sx={{ mt: 2, fontSize: '0.875rem' }}
            >
              {userType === 'cashier' 
                ? 'Cashier access for point-of-sale operations'
                : 'Administrative access for system management'
              }
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginForm;
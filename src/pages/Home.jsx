import { 
  Container,
  Box,
  Typography,
  Button,
  CssBaseline,
  Paper,
  Avatar,
  Card,
  CardContent,
  alpha,
  CircularProgress
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { PointOfSale, AdminPanelSettings, Security, Speed } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { ROLES } from '../config/config';

const Home = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Beautiful gradient colors
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

  useEffect(() => {
    const checkAuth = () => {
      try {
        const cashierData = localStorage.getItem('cashierData');
        const adminData = localStorage.getItem('adminData');
        
        if (cashierData) {
          const parsedData = JSON.parse(cashierData);
          setUser({ ...parsedData, role: ROLES.CASHIER });
        } else if (adminData) {
          const parsedData = JSON.parse(adminData);
          setUser({ ...parsedData, role: ROLES.ADMIN });
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
        localStorage.removeItem('cashierData');
        localStorage.removeItem('adminData');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const getDashboardPath = () => {
    return user?.role === ROLES.ADMIN ? '/admin/dashboard' : '/cashier/dashboard';
  };

  const handleLogout = () => {
    localStorage.removeItem('cashierData');
    localStorage.removeItem('adminData');
    setUser(null);
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: colors.background.main
      }}>
        <CircularProgress 
          size={60} 
          sx={{ 
            color: colors.primary.main 
          }} 
        />
      </Box>
    );
  }

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
      
      {/* Centered Main Content */}
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
        {/* System Title - Centered */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography 
            component="h1" 
            variant="h3" 
            sx={{ 
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)',
              background: colors.primary.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1
            }}
          >
            STANZO POS
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: alpha('#fff', 0.8),
              fontWeight: 300
            }}
          >
            Point of Sale System
          </Typography>
        </Box>

        {user ? (
          // Welcome Back Section - Centered
          <Paper 
            elevation={8} 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              width: '100%',
              background: `linear-gradient(135deg, ${colors.background.paper} 0%, ${alpha(colors.background.paper, 0.8)} 100%)`,
              border: `1px solid ${alpha(colors.primary.main, 0.2)}`,
              textAlign: 'center'
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, color: 'white', fontWeight: 'bold' }}>
              Welcome back, {user.name}!
            </Typography>
            
            <Typography 
              variant="subtitle1" 
              sx={{ 
                mb: 3, 
                color: alpha('#fff', 0.8),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1
              }}
            >
              {user.role === ROLES.ADMIN ? <AdminPanelSettings /> : <PointOfSale />}
              {user.role === ROLES.ADMIN ? 'Administrator' : 'Cashier'} Access
            </Typography>
            
            <Button
              component={Link}
              to={getDashboardPath()}
              variant="contained"
              fullWidth
              size="large"
              sx={{ 
                py: 1.5, 
                borderRadius: 2,
                mb: 2,
                background: user.role === ROLES.ADMIN ? colors.admin.gradient : colors.cashier.gradient,
                fontSize: '1rem',
                fontWeight: 'bold',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${alpha(user.role === ROLES.ADMIN ? colors.admin.main : colors.cashier.main, 0.4)}`,
                },
                transition: 'all 0.3s ease'
              }}
              startIcon={user.role === ROLES.ADMIN ? <AdminPanelSettings /> : <PointOfSale />}
            >
              Go to {user.role === ROLES.ADMIN ? 'Admin' : 'Cashier'} Dashboard
            </Button>
            
            <Button
              variant="outlined"
              fullWidth
              size="medium"
              onClick={handleLogout}
              sx={{ 
                py: 1, 
                borderRadius: 2,
                borderColor: alpha('#fff', 0.3),
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: alpha('#fff', 0.1)
                }
              }}
            >
              Logout
            </Button>
          </Paper>
        ) : (
          // Login Selection Section - Centered
          <Box sx={{ width: '100%' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                textAlign: 'center',
                mb: 3,
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              Choose Your Access
            </Typography>

            {/* Admin Login Card */}
            <Card 
              sx={{ 
                borderRadius: 3,
                background: `linear-gradient(135deg, ${colors.admin.main}20 0%, ${colors.admin.light}20 100%)`,
                border: `2px solid ${alpha(colors.admin.main, 0.3)}`,
                transition: 'all 0.3s ease',
                mb: 2,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  border: `2px solid ${colors.admin.main}`,
                  boxShadow: `0 8px 25px ${alpha(colors.admin.main, 0.3)}`
                }
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar 
                  sx={{ 
                    m: '0 auto 15px',
                    width: 60,
                    height: 60,
                    background: colors.admin.gradient
                  }}
                >
                  <AdminPanelSettings sx={{ fontSize: 30 }} />
                </Avatar>
                
                <Typography variant="h5" sx={{ mb: 2, color: 'white', fontWeight: 'bold' }}>
                  Admin Login
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
                  <Security sx={{ color: colors.admin.light }} />
                  <Typography variant="body2" sx={{ color: colors.admin.light }}>
                    Secure Admin Access
                  </Typography>
                </Box>

                <Button
                  component={Link}
                  to="/admin-login"
                  variant="contained"
                  fullWidth
                  size="medium"
                  sx={{ 
                    py: 1,
                    borderRadius: 2,
                    background: colors.admin.gradient,
                    fontWeight: 'bold',
                    '&:hover': {
                      background: colors.admin.dark,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 20px ${alpha(colors.admin.main, 0.4)}`
                    },
                    transition: 'all 0.3s ease'
                  }}
                  startIcon={<AdminPanelSettings />}
                >
                  Admin Login
                </Button>
              </CardContent>
            </Card>

            {/* Cashier Login Card */}
            <Card 
              sx={{ 
                borderRadius: 3,
                background: `linear-gradient(135deg, ${colors.cashier.main}20 0%, ${colors.cashier.light}20 100%)`,
                border: `2px solid ${alpha(colors.cashier.main, 0.3)}`,
                transition: 'all 0.3s ease',
                mb: 2,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  border: `2px solid ${colors.cashier.main}`,
                  boxShadow: `0 8px 25px ${alpha(colors.cashier.main, 0.3)}`
                }
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar 
                  sx={{ 
                    m: '0 auto 15px',
                    width: 60,
                    height: 60,
                    background: colors.cashier.gradient
                  }}
                >
                  <PointOfSale sx={{ fontSize: 30 }} />
                </Avatar>
                
                <Typography variant="h5" sx={{ mb: 2, color: 'white', fontWeight: 'bold' }}>
                  Cashier Login
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
                  <Speed sx={{ color: colors.cashier.light }} />
                  <Typography variant="body2" sx={{ color: colors.cashier.light }}>
                    Quick & Easy Access
                  </Typography>
                </Box>

                <Button
                  component={Link}
                  to="/cashier-login"
                  variant="contained"
                  fullWidth
                  size="medium"
                  sx={{ 
                    py: 1,
                    borderRadius: 2,
                    background: colors.cashier.gradient,
                    fontWeight: 'bold',
                    '&:hover': {
                      background: colors.cashier.dark,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 20px ${alpha(colors.cashier.main, 0.4)}`
                    },
                    transition: 'all 0.3s ease'
                  }}
                  startIcon={<PointOfSale />}
                >
                  Cashier Login
                </Button>
              </CardContent>
            </Card>

            {/* Footer Note */}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.6) }}>
                Need help? Contact system administrator
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Home;
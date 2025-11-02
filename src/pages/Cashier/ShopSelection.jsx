// src/pages/Cashier/ShopSelection.jsx - UPDATED MUI VERSION
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Card,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Divider,
  Paper,
  alpha
} from '@mui/material';
import {
  Store,
  ArrowForward,
  Person,
  Logout,
  PointOfSale,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { shopAPI, authAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const ShopSelection = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cashier, setCashier] = useState(null);
  const [selectingShop, setSelectingShop] = useState(null);

  // Color scheme matching cashier login
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

  useEffect(() => {
    initializeCashier();
    fetchShops();
  }, []);

  const initializeCashier = () => {
    try {
      const cashierData = JSON.parse(localStorage.getItem('cashierData'));
      if (!cashierData) {
        navigate('/cashier/login');
        return;
      }
      setCashier(cashierData);
    } catch (error) {
      console.error('Error initializing cashier:', error);
      navigate('/cashier/login');
    }
  };

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await shopAPI.getAll();
      
      // Enhanced data validation with multiple fallbacks
      let shopsData = [];
      
      if (response && typeof response === 'object') {
        // Handle different API response structures
        if (Array.isArray(response.data)) {
          shopsData = response.data;
        } else if (Array.isArray(response)) {
          shopsData = response;
        } else if (response.data && typeof response.data === 'object') {
          // Convert object to array if needed
          shopsData = Object.values(response.data);
        }
      }
      
      // Ensure we have a valid array
      const validatedShops = Array.isArray(shopsData) ? shopsData : [];
      
      // Filter out invalid shop objects and add safety checks
      const safeShops = validatedShops
        .filter(shop => shop && typeof shop === 'object' && shop._id && shop.name)
        .map(shop => ({
          _id: shop._id || `shop-${Math.random().toString(36).substr(2, 9)}`,
          name: shop.name || 'Unnamed Shop',
          location: shop.location || 'Location not specified',
          description: shop.description || '',
          status: shop.status || 'active',
          createdAt: shop.createdAt || new Date().toISOString()
        }));
      
      setShops(safeShops);
      
      if (safeShops.length === 0) {
        setError('No shops available. Please contact administrator.');
      }
      
    } catch (error) {
      console.error('Error fetching shops:', error);
      setError('Failed to load shops. Please check your connection and try again.');
      setShops([]); // Ensure shops is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleShopSelect = async (shop) => {
    if (!shop || !shop._id) {
      setError('Invalid shop selection');
      return;
    }
    
    setSelectingShop(shop._id);
    
    try {
      // Validate cashier data
      const cashierData = JSON.parse(localStorage.getItem('cashierData')) || {};
      if (!cashierData.id && !cashierData._id) {
        throw new Error('Cashier session expired');
      }

      // Store selected shop in localStorage with enhanced data
      const updatedCashierData = {
        ...cashierData,
        lastShop: shop._id,
        shopName: shop.name,
        shopLocation: shop.location,
        selectedAt: new Date().toISOString(),
        shopDescription: shop.description,
        sessionStart: new Date().toISOString()
      };
      
      localStorage.setItem('cashierData', JSON.stringify(updatedCashierData));
      setCashier(updatedCashierData);
      
      // Show success feedback before navigation
      setTimeout(() => {
        navigate('/cashier/dashboard', { 
          replace: true,
          state: { 
            shopSelected: true,
            shopName: shop.name 
          }
        });
      }, 800);
      
    } catch (error) {
      console.error('Error selecting shop:', error);
      setError(error.message || 'Failed to select shop. Please try again.');
    } finally {
      setSelectingShop(null);
    }
  };

  const handleLogout = () => {
    try {
      authAPI.logout();
      localStorage.removeItem('cashierData');
      navigate('/cashier/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API fails
      localStorage.removeItem('cashierData');
      navigate('/cashier/login', { replace: true });
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchShops();
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        background: colors.background.main
      }}>
        <CircularProgress 
          size={60} 
          sx={{ 
            color: colors.cashier.main,
            mb: 2
          }} 
        />
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            mb: 1
          }}
        >
          Loading available shops...
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.6)'
          }}
        >
          Please wait while we load your shop information
        </Typography>
      </Box>
    );
  }

  return (
    <Container 
      component="main" 
      maxWidth="md"
      sx={{
        background: colors.background.main,
        minHeight: '100vh',
        padding: 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
    >
      {/* Main Content Card */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: `1px solid ${alpha(colors.cashier.main, 0.2)}`,
          background: `linear-gradient(135deg, ${colors.background.paper} 0%, ${alpha(colors.background.paper, 0.9)} 100%)`,
          overflow: 'hidden',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Header Section */}
        <Box sx={{ 
          textAlign: 'center', 
          padding: 4,
          background: `linear-gradient(135deg, ${alpha(colors.cashier.main, 0.1)} 0%, ${alpha(colors.cashier.light, 0.1)} 100%)`,
          position: 'relative'
        }}>
          {selectingShop && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: colors.cashier.light
              }}
            >
              <CircularProgress size={16} color="inherit" />
              <Typography variant="caption">
                Selecting...
              </Typography>
            </Box>
          )}
          
          <Avatar 
            sx={{ 
              width: 80, 
              height: 80, 
              margin: '0 auto 16px',
              background: colors.cashier.gradient,
              boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Person sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 'bold',
              background: colors.cashier.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1
            }}
          >
            Welcome, {cashier?.name || 'Cashier'}!
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 2
            }}
          >
            Select a shop to start using the POS system
          </Typography>
          
          <Chip 
            icon={<Store />}
            label="Please select your working shop"
            variant="outlined"
            sx={{ 
              color: colors.cashier.light,
              borderColor: alpha(colors.cashier.main, 0.3),
              backgroundColor: alpha(colors.cashier.main, 0.1),
              fontWeight: 'medium'
            }}
          />
        </Box>

        <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

        {/* Shops Section */}
        <Box sx={{ padding: 4 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              textAlign: 'center',
              color: 'white',
              mb: 3,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}
          >
            <Store />
            Available Shops
            <Chip 
              label={shops.length}
              size="small"
              sx={{ 
                backgroundColor: alpha(colors.cashier.main, 0.2),
                color: colors.cashier.light,
                fontWeight: 'bold'
              }}
            />
          </Typography>

          {/* Error Display */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'white',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                '& .MuiAlert-icon': {
                  color: '#EF4444'
                }
              }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleRetry}
                  sx={{
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* No Shops Available */}
          {!error && shops.length === 0 ? (
            <Alert
              severity="warning"
              icon={<Warning />}
              sx={{
                borderRadius: 2,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: 'white',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                '& .MuiAlert-icon': {
                  color: '#F59E0B'
                }
              }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleRetry}
                  sx={{
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Retry
                </Button>
              }
            >
              No shops available. Please contact administrator or try again.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {shops.map((shop, index) => (
                <Paper
                  key={shop._id}
                  sx={{
                    padding: 3,
                    borderRadius: 2,
                    cursor: selectingShop ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    border: `1px solid ${alpha(colors.cashier.main, 0.2)}`,
                    backgroundColor: selectingShop === shop._id 
                      ? alpha(colors.cashier.main, 0.15)
                      : selectingShop
                      ? alpha(colors.background.paper, 0.3)
                      : alpha(colors.background.paper, 0.5),
                    opacity: selectingShop && selectingShop !== shop._id ? 0.6 : 1,
                    '&:hover': selectingShop ? {} : {
                      transform: 'translateY(-2px)',
                      border: `1px solid ${colors.cashier.main}`,
                      boxShadow: `0 8px 25px ${alpha(colors.cashier.main, 0.2)}`,
                      backgroundColor: alpha(colors.cashier.main, 0.1)
                    }
                  }}
                  onClick={() => !selectingShop && handleShopSelect(shop)}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          background: index % 2 === 0 ? colors.primary.gradient : colors.cashier.gradient,
                          width: 50,
                          height: 50,
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {shop.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: 'white',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          {shop.name}
                          {shop.status === 'active' && (
                            <Chip 
                              label="Active"
                              size="small"
                              sx={{ 
                                backgroundColor: alpha(colors.cashier.main, 0.2),
                                color: colors.cashier.light,
                                fontSize: '0.7rem',
                                height: 20
                              }}
                            />
                          )}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            mb: 0.5
                          }}
                        >
                          📍 {shop.location}
                        </Typography>
                        {shop.description && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.5)',
                              fontStyle: 'italic'
                            }}
                          >
                            {shop.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    
                    <Button
                      variant="contained"
                      size="medium"
                      disabled={selectingShop !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShopSelect(shop);
                      }}
                      sx={{
                        background: selectingShop === shop._id 
                          ? alpha(colors.cashier.main, 0.3)
                          : colors.cashier.gradient,
                        borderRadius: 2,
                        px: 3,
                        fontWeight: 'bold',
                        minWidth: 120,
                        '&:hover': selectingShop ? {} : {
                          background: colors.cashier.dark,
                          transform: 'translateY(-1px)',
                          boxShadow: `0 6px 20px ${alpha(colors.cashier.main, 0.4)}`
                        },
                        '&:disabled': {
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.3)'
                        }
                      }}
                      startIcon={
                        selectingShop === shop._id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <PointOfSale />
                        )
                      }
                    >
                      {selectingShop === shop._id ? 'Selecting...' : 'Start POS'}
                    </Button>
                  </Box>
                  
                  {/* Selection Progress Indicator */}
                  {selectingShop === shop._id && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} color="inherit" />
                      <Typography variant="caption" sx={{ color: colors.cashier.light }}>
                        Preparing your POS session...
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

        {/* Footer Section */}
        <Box sx={{ 
          padding: 3, 
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: 2
        }}>
          <Button
            variant="outlined"
            size="medium"
            onClick={handleRetry}
            disabled={loading}
            startIcon={<CheckCircle />}
            sx={{
              color: colors.cashier.light,
              borderColor: alpha(colors.cashier.main, 0.5),
              '&:hover': {
                color: 'white',
                borderColor: colors.cashier.light,
                backgroundColor: alpha(colors.cashier.main, 0.1)
              }
            }}
          >
            Refresh Shops
          </Button>
          
          <Button
            variant="outlined"
            size="medium"
            onClick={handleLogout}
            startIcon={<Logout />}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                color: 'white',
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Logout
          </Button>
        </Box>
      </Card>
    </Container>
  );
};

export default ShopSelection;
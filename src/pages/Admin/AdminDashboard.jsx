
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layout, Menu, Typography, Card, Row, Col, Table, Tag, Statistic, List, Alert, Spin, 
  Button, Modal, Space, Tooltip, Divider, message, Badge, Avatar, Progress,
  Tabs, Descriptions, Dropdown, Input, Select, DatePicker, Switch
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  DollarOutlined,
  ShopOutlined,
  ProductOutlined,
  WarningOutlined,
  BarChartOutlined,
  MoneyCollectOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExportOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  FallOutlined,
  CalculatorOutlined,
  LineChartOutlined,
  PieChartOutlined,
  LogoutOutlined,
  SettingOutlined,
  CreditCardOutlined,
  SearchOutlined,
  TeamOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  transactionAPI, 
  productAPI, 
  shopAPI, 
  cashierAPI, 
  expenseAPI,
  creditAPI,
  reportAPI
} from '../../services/api';
import './AdminDashboard.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Enhanced Calculation Utilities with Credit Sales Support
const CalculationUtils = {
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  formatCurrency: (amount) => {
    const value = CalculationUtils.safeNumber(amount);
    return `KES ${value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  },

  getProfitColor: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    if (value > 0) return '#3f8600';
    if (value < 0) return '#cf1322';
    return '#d9d9d9';
  },

  getProfitIcon: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    return value >= 0 ? <RiseOutlined /> : <FallOutlined />;
  },

  calculateProfit: (revenue, cost) => {
    const revenueNum = CalculationUtils.safeNumber(revenue);
    const costNum = CalculationUtils.safeNumber(cost);
    return revenueNum - costNum;
  },

  calculateProfitMargin: (revenue, profit) => {
    const revenueNum = CalculationUtils.safeNumber(revenue);
    const profitNum = CalculationUtils.safeNumber(profit);
    if (revenueNum <= 0) return 100.0;
    return (profitNum / revenueNum) * 100;
  },

  // Calculate Cost of Goods Sold from transaction items
  calculateCOGS: (transactions, products = []) => {
    let totalCOGS = 0;
    
    transactions.forEach(transaction => {
      transaction.items?.forEach(item => {
        // Find product to get accurate buying price
        const product = products.find(p => 
          p._id === (item.productId || item.product) || 
          p.name === item.productName
        );
        
        const buyingPrice = CalculationUtils.safeNumber(
          product?.buyingPrice || item.buyingPrice || item.costPrice || 0
        );
        const quantity = CalculationUtils.safeNumber(item.quantity, 1);
        const itemCOGS = buyingPrice * quantity;
        
        totalCOGS += itemCOGS;
      });
    });
    
    return totalCOGS;
  },

  // FIXED: Enhanced data processing with credit sales included in total revenue
  processDashboardData: (comprehensiveData, creditsData = [], shops = [], filters = {}) => {
    console.log('🚀 Processing dashboard data with credit sales support...', { filters });
    
    let transactions = comprehensiveData?.transactions || [];
    const products = comprehensiveData?.products || [];
    const expenses = comprehensiveData?.expenses || [];
    const cashiers = comprehensiveData?.cashiers || [];

    // Apply filters
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      transactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.saleDate || transaction.createdAt);
        return transactionDate >= filters.dateRange[0] && transactionDate <= filters.dateRange[1];
      });
    }

    if (filters.shop && filters.shop !== 'all') {
      transactions = transactions.filter(transaction => {
        const shopId = transaction.shopId || transaction.shop;
        return shopId === filters.shop;
      });
    }

    console.log('📊 Filtered data:', {
      transactions: transactions.length,
      products: products.length,
      expenses: expenses.length,
      shops: shops.length,
      cashiers: cashiers.length,
      credits: creditsData.length
    });

    // Calculate COGS from transaction items
    const totalCOGS = CalculationUtils.calculateCOGS(transactions, products);
    
    let totalRevenue = 0;
    let totalItemsSold = 0;
    let cashRevenue = 0;
    let bankMpesaRevenue = 0;
    let creditRevenue = 0; // NEW: Track credit sales revenue

    const processedTransactions = transactions.map(transaction => {
      // Calculate transaction-level metrics
      const transactionRevenue = CalculationUtils.safeNumber(transaction.totalAmount);
      const transactionItemsCount = CalculationUtils.safeNumber(transaction.itemsCount) ||
        transaction.items?.reduce((sum, item) => sum + CalculationUtils.safeNumber(item.quantity, 1), 0) || 0;

      // Calculate transaction COGS
      const transactionCOGS = transaction.items?.reduce((sum, item) => {
        const product = products.find(p => 
          p._id === (item.productId || item.product) || 
          p.name === item.productName
        );
        const buyingPrice = CalculationUtils.safeNumber(
          product?.buyingPrice || item.buyingPrice || item.costPrice || 0
        );
        const quantity = CalculationUtils.safeNumber(item.quantity, 1);
        return sum + (buyingPrice * quantity);
      }, 0) || 0;

      // FIXED: Accumulate totals - include ALL sales in total revenue regardless of payment method
      totalRevenue += transactionRevenue;
      totalItemsSold += transactionItemsCount;

      // Track revenue by payment method
      const paymentMethod = transaction.paymentMethod?.toLowerCase() || 'cash';
      if (paymentMethod === 'credit') {
        creditRevenue += transactionRevenue;
      } else if (paymentMethod === 'bank_mpesa') {
        bankMpesaRevenue += transactionRevenue;
      } else if (paymentMethod === 'cash_bank_mpesa') {
        // For split payments, add to both cash and bank/mpesa
        cashRevenue += CalculationUtils.safeNumber(transaction.cashAmount);
        bankMpesaRevenue += CalculationUtils.safeNumber(transaction.bankMpesaAmount);
      } else {
        cashRevenue += transactionRevenue;
      }

      // Map shop ID to shop name
      const shopId = transaction.shopId || transaction.shop;
      let shopName = 'Unknown Shop';
      
      if (shopId && shops.length > 0) {
        const foundShop = shops.find(shop => 
          shop._id === shopId || 
          shop.name === shopId ||
          (shop._id && shop._id.toString() === shopId.toString())
        );
        shopName = foundShop?.name || shopId;
      } else if (transaction.shop && typeof transaction.shop === 'string' && transaction.shop !== 'Unknown Shop') {
        shopName = transaction.shop;
      }

      return {
        ...transaction,
        cost: transactionCOGS,
        itemsCount: transactionItemsCount,
        shop: shopName,
        shopName: shopName,
        displayShop: shopName,
        profit: CalculationUtils.calculateProfit(transactionRevenue, transactionCOGS),
        profitMargin: CalculationUtils.calculateProfitMargin(transactionRevenue, CalculationUtils.calculateProfit(transactionRevenue, transactionCOGS))
      };
    });

    console.log('💰 Revenue Calculation Results:', {
      totalRevenue,
      totalCOGS,
      totalItemsSold,
      cashRevenue,
      bankMpesaRevenue,
      creditRevenue, // NEW: Credit sales included in total revenue
      transactionCount: transactions.length
    });

    // Calculate financial metrics
    const totalProfit = CalculationUtils.calculateProfit(totalRevenue, totalCOGS);
    
    // Filter expenses by date range and shop
    let filteredExpenses = expenses;
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date || expense.createdAt);
        return expenseDate >= filters.dateRange[0] && expenseDate <= filters.dateRange[1];
      });
    }
    if (filters.shop && filters.shop !== 'all') {
      filteredExpenses = filteredExpenses.filter(expense => expense.shop === filters.shop);
    }
    
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0);
    const netProfit = CalculationUtils.calculateProfit(totalProfit, totalExpenses);
    const profitMargin = CalculationUtils.calculateProfitMargin(totalRevenue, netProfit);
    const totalSales = transactions.length;

    // Credit calculations
    let filteredCredits = creditsData;
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      filteredCredits = creditsData.filter(credit => {
        const creditDate = new Date(credit.date || credit.createdAt);
        return creditDate >= filters.dateRange[0] && creditDate <= filters.dateRange[1];
      });
    }
    
    const totalCredits = filteredCredits.length;
    const totalCreditAmount = filteredCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.totalAmount), 0);
    const totalAmountPaid = filteredCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.amountPaid), 0);
    const totalBalanceDue = filteredCredits.reduce((sum, c) => sum + CalculationUtils.safeNumber(c.balanceDue), 0);
    const overdueCredits = filteredCredits.filter(c => 
      c.dueDate && new Date(c.dueDate) < new Date() && CalculationUtils.safeNumber(c.balanceDue) > 0
    ).length;

    // Product analysis with filters
    let filteredProducts = products;
    if (filters.shop && filters.shop !== 'all') {
      // Filter products by shop if needed
      filteredProducts = products.filter(p => p.shop === filters.shop);
    }
    
    const lowStockProducts = filteredProducts.filter(p => 
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    );

    // Recent transactions (last 10) with proper shop names
    const recentTransactions = processedTransactions
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt))
      .slice(0, 10);

    const result = {
      financialStats: {
        // FIXED: totalRevenue now includes credit sales
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCOGS: parseFloat(totalCOGS.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        totalSales: totalSales,
        totalItemsSold: totalItemsSold,
        averageTransactionValue: totalSales > 0 ? totalRevenue / totalSales : 0,
        
        // NEW: Payment method breakdown
        cashRevenue: parseFloat(cashRevenue.toFixed(2)),
        bankMpesaRevenue: parseFloat(bankMpesaRevenue.toFixed(2)),
        creditRevenue: parseFloat(creditRevenue.toFixed(2)),
        
        // Credit stats
        totalCredits,
        totalCreditAmount: parseFloat(totalCreditAmount.toFixed(2)),
        totalAmountPaid: parseFloat(totalAmountPaid.toFixed(2)),
        totalBalanceDue: parseFloat(totalBalanceDue.toFixed(2)),
        overdueCredits,
        creditCollectionRate: totalCreditAmount > 0 ? (totalAmountPaid / totalCreditAmount) * 100 : 0
      },
      businessStats: {
        totalProducts: filteredProducts.length,
        totalShops: shops.length,
        totalCashiers: cashiers.length,
        lowStockCount: lowStockProducts.length,
        activeCredits: filteredCredits.filter(c => c.status !== 'paid').length
      },
      recentTransactions,
      lowStockProducts: lowStockProducts.slice(0, 5),
      topProducts: CalculationUtils.quickTopProducts(processedTransactions, 5),
      shopPerformance: CalculationUtils.quickShopPerformance(processedTransactions, shops),
      creditAlerts: filteredCredits.filter(c => 
        c.dueDate && new Date(c.dueDate) < new Date() && CalculationUtils.safeNumber(c.balanceDue) > 0
      ).slice(0, 5),
      timestamp: new Date().toISOString(),
      appliedFilters: filters
    };

    console.log('✅ Final financial stats with credit sales:', result.financialStats);
    return result;
  },

  // Quick top products calculation
  quickTopProducts: (transactions, limit = 5) => {
    const productSales = {};
    
    transactions.forEach(transaction => {
      transaction.items?.forEach(item => {
        const productName = item.productName || 'Unknown Product';
        if (!productSales[productName]) {
          productSales[productName] = {
            name: productName,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0
          };
        }
        const itemQuantity = CalculationUtils.safeNumber(item.quantity, 1);
        const itemRevenue = CalculationUtils.safeNumber(item.totalPrice || item.price);
        const itemCost = CalculationUtils.safeNumber(item.buyingPrice || item.costPrice || 0) * itemQuantity;
        
        productSales[productName].quantity += itemQuantity;
        productSales[productName].revenue += itemRevenue;
        productSales[productName].cost += itemCost;
        productSales[productName].profit += (itemRevenue - itemCost);
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  // Shop performance calculation
  quickShopPerformance: (transactions, shops) => {
    const shopPerformance = {};
    
    transactions.forEach(transaction => {
      const shopName = transaction.shop || transaction.shopName || 'Unknown Shop';
      if (!shopPerformance[shopName]) {
        shopPerformance[shopName] = {
          name: shopName,
          revenue: 0,
          cost: 0,
          profit: 0,
          transactions: 0,
          itemsSold: 0
        };
      }
      shopPerformance[shopName].revenue += CalculationUtils.safeNumber(transaction.totalAmount);
      shopPerformance[shopName].cost += CalculationUtils.safeNumber(transaction.cost);
      shopPerformance[shopName].profit += CalculationUtils.safeNumber(transaction.profit);
      shopPerformance[shopName].transactions += 1;
      shopPerformance[shopName].itemsSold += CalculationUtils.safeNumber(transaction.itemsCount);
    });

    return Object.values(shopPerformance)
      .map(shop => ({
        ...shop,
        profitMargin: CalculationUtils.calculateProfitMargin(shop.revenue, shop.profit)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  },

  getDefaultStats: () => ({
    totalSales: 0,
    totalRevenue: 0,
    totalCOGS: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    totalProducts: 0,
    totalShops: 0,
    totalCashiers: 0,
    lowStockCount: 0,
    totalItemsSold: 0,
    averageTransactionValue: 0,
    // NEW: Payment method revenue
    cashRevenue: 0,
    bankMpesaRevenue: 0,
    creditRevenue: 0,
    // Credit stats
    totalCredits: 0,
    totalCreditAmount: 0,
    totalAmountPaid: 0,
    totalBalanceDue: 0,
    overdueCredits: 0,
    creditCollectionRate: 0,
    timestamp: new Date().toISOString()
  })
};

// Enhanced Admin Dashboard Component with Credit Sales Support
const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    financialStats: CalculationUtils.getDefaultStats(),
    businessStats: {
      totalProducts: 0,
      totalShops: 0,
      totalCashiers: 0,
      lowStockCount: 0,
      activeCredits: 0
    },
    recentTransactions: [],
    lowStockProducts: [],
    topProducts: [],
    shopPerformance: [],
    creditAlerts: []
  });
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewModalContent, setViewModalContent] = useState(null);
  const [viewModalTitle, setViewModalTitle] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [shops, setShops] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    dateRange: null,
    shop: 'all',
    autoRefresh: false
  });
  const [filterVisible, setFilterVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    
    fetchDashboardData();
    
    return () => clearTimeout(timer);
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    let intervalId;
    
    if (filters.autoRefresh) {
      intervalId = setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard data...');
        fetchDashboardData();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [filters.autoRefresh]);

  // Enhanced data fetching with credit sales support
  const fetchDashboardData = async (customFilters = null) => {
    const activeFilters = customFilters || filters;
    
    console.log('🚀 Fetching dashboard data with credit sales support...', activeFilters);
    
    try {
      setLoading(true);
      setRefreshing(true);
      
      // Fetch shops first
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      // Use optimized reports endpoint
      const optimizedData = await reportAPI.getDashboardData();
      
      // Process data with filters - FIXED: Now includes credit sales in revenue
      const processedData = CalculationUtils.processDashboardData(
        {
          transactions: optimizedData.comprehensiveData?.transactions || [],
          products: optimizedData.comprehensiveData?.products || [],
          expenses: optimizedData.comprehensiveData?.expenses || [],
          cashiers: optimizedData.cashiers || []
        },
        optimizedData.credits || [],
        shopsData,
        activeFilters
      );

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
      console.log('✅ Dashboard data processed with credit sales:', {
        totalRevenue: processedData.financialStats.totalRevenue,
        cashRevenue: processedData.financialStats.cashRevenue,
        bankMpesaRevenue: processedData.financialStats.bankMpesaRevenue,
        creditRevenue: processedData.financialStats.creditRevenue,
        netProfit: processedData.financialStats.netProfit
      });
      
      message.success(`Dashboard refreshed - ${processedData.financialStats.totalSales} transactions`);
  
    } catch (error) {
      console.error('💥 Dashboard fetch failed:', error);
      await fetchDataWithFallback(activeFilters);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fallback with filters
  const fetchDataWithFallback = async (activeFilters) => {
    try {
      const [comprehensiveData, creditsData, shopsData] = await Promise.all([
        transactionAPI.getComprehensiveData().catch(err => {
          console.error('Comprehensive data error:', err);
          return { transactions: [], products: [], expenses: [] };
        }),
        creditAPI.getAll().catch(err => {
          console.error('Credits data error:', err);
          return [];
        }),
        shopAPI.getAll().catch(err => {
          console.error('Shops data error:', err);
          return [];
        })
      ]);

      setShops(shopsData);

      const processedData = CalculationUtils.processDashboardData(
        comprehensiveData,
        creditsData,
        shopsData,
        activeFilters
      );

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
    } catch (fallbackError) {
      console.error('💥 Fallback data fetch failed:', fallbackError);
      message.error('Failed to load dashboard data');
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Auto-refresh when filters change
    fetchDashboardData(newFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      dateRange: null,
      shop: 'all',
      autoRefresh: filters.autoRefresh // Keep auto-refresh setting
    };
    setFilters(clearedFilters);
    fetchDashboardData(clearedFilters);
  };

  // Quick refresh function
  const quickRefresh = async () => {
    setRefreshing(true);
    try {
      const quickData = await transactionAPI.getOptimizedReports({ 
        quick: true,
        limit: 50 
      });
      
      if (quickData?.comprehensiveData) {
        const processedData = CalculationUtils.processDashboardData(
          quickData.comprehensiveData,
          quickData.credits || [],
          shops,
          filters
        );
        setDashboardData(processedData);
        setDataTimestamp(new Date().toISOString());
        message.success('Quick refresh completed');
      }
    } catch (error) {
      console.error('Quick refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshData = () => {
    fetchDashboardData();
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const exportData = {
        timestamp: dataTimestamp,
        filters: filters,
        ...dashboardData
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  // Enhanced search functionality
  const filteredRecentTransactions = useMemo(() => {
    if (!searchTerm) return dashboardData.recentTransactions;
    
    return dashboardData.recentTransactions.filter(transaction =>
      transaction.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transactionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.cashierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.shop?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dashboardData.recentTransactions, searchTerm]);

  const handleLogout = () => {
    Modal.confirm({
      title: 'Confirm Logout',
      content: 'Are you sure you want to logout?',
      okText: 'Yes, Logout',
      cancelText: 'Cancel',
      onOk: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        navigate('/login');
        message.success('Logged out successfully');
      }
    });
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/dashboard')) return 'dashboard';
    if (path.includes('/admin/cashiers')) return 'cashiers';
    if (path.includes('/admin/shops')) return 'shops';
    if (path.includes('/admin/products')) return 'products';
    if (path.includes('/admin/inventory')) return 'inventory';
    if (path.includes('/admin/expenses')) return 'expenses';
    if (path.includes('/admin/transactions')) return 'transactions';
    if (path.includes('/admin/credits')) return 'credits';
    return 'dashboard';
  };

  const handleViewAll = (type) => {
    switch (type) {
      case 'sales':
        navigate('/admin/transactions');
        break;
      case 'cashiers':
        navigate('/admin/cashiers');
        break;
      case 'shops':
        navigate('/admin/shops');
        break;
      case 'products':
        navigate('/admin/products');
        break;
      case 'expenses':
        navigate('/admin/expenses');
        break;
      case 'credits':
        navigate('/admin/credits');
        break;
      case 'inventory':
        navigate('/admin/inventory');
        break;
      default:
        break;
    }
  };

  const handleViewDetails = (type, data) => {
    setViewModalTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Details`);
    setViewModalContent(data);
    setViewModalVisible(true);
  };

  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'dashboard':
        navigate('/admin/dashboard');
        break;
      case 'cashiers':
        navigate('/admin/cashiers');
        break;
      case 'shops':
        navigate('/admin/shops');
        break;
      case 'products':
        navigate('/admin/products');
        break;
      case 'inventory':
        navigate('/admin/inventory');
        break;
      case 'expenses':
        navigate('/admin/expenses');
        break;
      case 'transactions':
        navigate('/admin/transactions');
        break;
      case 'credits':
        navigate('/admin/credits');
        break;
      default:
        navigate('/admin/dashboard');
    }
  };

  // User dropdown menu items
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile Settings'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'System Settings'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout
    }
  ];

  // Enhanced Sales Columns with payment method indicators
  const salesColumns = [
    {
      title: 'Transaction ID',
      dataIndex: '_id',
      key: 'transactionId',
      render: (id, record) => (
        <Tooltip title={id}>
          <Text code style={{ fontSize: '11px' }}>
            {record.transactionNumber || (id ? `${id.substring(0, 8)}...` : 'N/A')}
          </Text>
        </Tooltip>
      ),
      width: 100
    },
    {
      title: 'Date',
      dataIndex: 'saleDate',
      key: 'saleDate',
      render: (date) => date ? new Date(date).toLocaleDateString('en-KE') : 'N/A',
      width: 90
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name) => <Text style={{ fontSize: '12px' }}>{name || 'Walk-in'}</Text>,
      width: 100
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px', color: '#1890ff' }}>
            {CalculationUtils.formatCurrency(amount)}
          </Text>
          <Tag 
            color={
              record.paymentMethod === 'credit' ? 'orange' : 
              record.paymentMethod === 'bank_mpesa' ? 'blue' :
              record.paymentMethod === 'cash_bank_mpesa' ? 'purple' : 'green'
            }
            style={{ fontSize: '9px', margin: 0 }}
          >
            {record.paymentMethod === 'cash_bank_mpesa' ? 'CASH/BANK' : 
             record.paymentMethod === 'bank_mpesa' ? 'BANK/MPESA' : 
             record.paymentMethod?.toUpperCase() || 'CASH'}
          </Tag>
        </Space>
      ),
      width: 100
    },
    {
      title: 'COGS',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => (
        <Text style={{ fontSize: '11px', color: '#faad14' }}>
          {CalculationUtils.formatCurrency(cost)}
        </Text>
      ),
      width: 80
    },
    {
      title: 'Profit',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit) => (
        <Text 
          strong 
          style={{ 
            fontSize: '12px', 
            color: CalculationUtils.getProfitColor(profit) 
          }}
        >
          {CalculationUtils.formatCurrency(profit)}
        </Text>
      ),
      width: 80
    },
    {
      title: 'Shop',
      dataIndex: 'shop',
      key: 'shop',
      render: (text) => <Tag color="blue" style={{ fontSize: '10px' }}>{text || 'Unknown Shop'}</Tag>,
      width: 80
    }
  ];

  // Low Stock Products Columns
  const lowStockColumns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ProductOutlined />
          <Text strong={record.currentStock === 0} style={{ fontSize: '12px' }}>{text}</Text>
          {record.currentStock === 0 && <Tag color="red" style={{ fontSize: '10px' }}>OUT</Tag>}
        </Space>
      )
    },
    {
      title: 'Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock, record) => (
        <Badge 
          count={stock} 
          showZero 
          style={{ 
            backgroundColor: record.currentStock === 0 ? '#cf1322' : '#faad14',
            fontSize: '10px'
          }}
        />
      ),
      width: 60
    },
    {
      title: 'Min',
      dataIndex: 'minStockLevel',
      key: 'minStockLevel',
      render: (min) => <Text style={{ fontSize: '12px' }}>{min}</Text>,
      width: 50
    },
    {
      title: 'COGS',
      dataIndex: 'buyingPrice',
      key: 'buyingPrice',
      render: (price) => (
        <Text style={{ fontSize: '11px' }}>
          {CalculationUtils.formatCurrency(price)}
        </Text>
      ),
      width: 80
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth="80"
      >
        <div className="logo">
          <Title level={4} style={{ color: 'white', textAlign: 'center', padding: '16px 0' }}>
            {collapsed ? 'TP' : 'The Place Club'}
          </Title>
        </div>
        <Menu 
          theme="dark" 
          selectedKeys={[getActiveTab()]}
          mode="inline"
          onClick={handleMenuClick}
        >
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            Dashboard
          </Menu.Item>
          <Menu.Item key="products" icon={<ProductOutlined />}>
            Product Management
          </Menu.Item>
          <Menu.Item key="shops" icon={<ShopOutlined />}>
            Shop Management
          </Menu.Item>
          <Menu.Item key="cashiers" icon={<UserOutlined />}>
            Cashier Management
          </Menu.Item>
          <Menu.Item key="transactions" icon={<BarChartOutlined />}>
            Transactions Report
          </Menu.Item>
          <Menu.Item key="expenses" icon={<DollarOutlined />}>
            Expense Management
          </Menu.Item>
          <Menu.Item key="inventory" icon={<AppstoreOutlined />}>
            Inventory
          </Menu.Item>
          <Menu.Item key="credits" icon={<CreditCardOutlined />}>
            Credit Management
          </Menu.Item>
        </Menu>
      </Sider>

      <Layout className="site-layout">
        <Header className="site-layout-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              STANZO SHOP - ADMIN DASHBOARD
            </Title>
            <Space>
              {/* Auto-refresh toggle */}
              <Tooltip title={filters.autoRefresh ? "Auto-refresh ON (30s)" : "Auto-refresh OFF"}>
                <Button 
                  type={filters.autoRefresh ? "primary" : "default"}
                  icon={<ReloadOutlined spin={filters.autoRefresh} />}
                  onClick={() => handleFilterChange('autoRefresh', !filters.autoRefresh)}
                  size="small"
                >
                  Auto
                </Button>
              </Tooltip>
              
              <Button 
                icon={<ReloadOutlined spin={refreshing} />} 
                onClick={quickRefresh}
                disabled={refreshing}
                size="small"
              >
                Quick Refresh
              </Button>
              
              {/* Filter button */}
              <Button 
                icon={<FilterOutlined />}
                onClick={() => setFilterVisible(!filterVisible)}
                size="small"
              >
                Filters
              </Button>
              
              <Button 
                icon={<ExportOutlined />} 
                onClick={handleExportData}
                loading={exportLoading}
                size="small"
              >
                Export
              </Button>
              
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Button type="text" style={{ color: 'white' }} size="small">
                  <Space>
                    <UserOutlined />
                    Admin
                  </Space>
                </Button>
              </Dropdown>
              
              <Button 
                type="primary" 
                danger 
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                size="small"
              >
                Logout
              </Button>
            </Space>
          </div>
        </Header>
        
        <Content style={{ margin: '16px', padding: 16 }}>
          {showWelcome && location.pathname === '/admin/dashboard' && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '60vh',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#1890ff',
              animation: 'fadeIn 1s'
            }}>
              WELCOME TO THE STANZO SHOP ADMIN DASHBOARD
            </div>
          )}
          
          {!showWelcome && location.pathname === '/admin/dashboard' && (
            <>
              {/* Filter Panel */}
              {filterVisible && (
                <Card 
                  size="small" 
                  style={{ marginBottom: 16 }}
                  title={
                    <Space>
                      <FilterOutlined />
                      Dashboard Filters
                    </Space>
                  }
                  extra={
                    <Button size="small" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  }
                >
                  <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>Date Range</Text>
                        <RangePicker
                          style={{ width: '100%' }}
                          value={filters.dateRange}
                          onChange={(dates) => handleFilterChange('dateRange', dates)}
                          format="YYYY-MM-DD"
                        />
                      </Space>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>Shop</Text>
                        <Select
                          style={{ width: '100%' }}
                          value={filters.shop}
                          onChange={(value) => handleFilterChange('shop', value)}
                          placeholder="Select Shop"
                        >
                          <Option value="all">All Shops</Option>
                          {shops.map(shop => (
                            <Option key={shop._id} value={shop._id}>
                              {shop.name}
                            </Option>
                          ))}
                        </Select>
                      </Space>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>Auto Refresh</Text>
                        <div>
                          <Switch
                            checked={filters.autoRefresh}
                            onChange={(checked) => handleFilterChange('autoRefresh', checked)}
                            checkedChildren="ON"
                            unCheckedChildren="OFF"
                          />
                          <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                            Refresh every 30s
                          </Text>
                        </div>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              )}

              {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}>Loading dashboard data...</div>
                </div>
              ) : (
                <>
                  {/* Data Timestamp and Active Filters */}
                  <Row style={{ marginBottom: 16 }} justify="space-between" align="middle">
                    <Col>
                      {dataTimestamp && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Last updated: {new Date(dataTimestamp).toLocaleString()}
                          {filters.autoRefresh && (
                            <Tag color="green" style={{ marginLeft: 8 }}>Auto-refresh ON</Tag>
                          )}
                        </Text>
                      )}
                    </Col>
                    <Col>
                      {(filters.dateRange || filters.shop !== 'all') && (
                        <Space>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Active filters:
                          </Text>
                          {filters.dateRange && (
                            <Tag color="blue">
                              {filters.dateRange[0].toLocaleDateString()} - {filters.dateRange[1].toLocaleDateString()}
                            </Tag>
                          )}
                          {filters.shop !== 'all' && (
                            <Tag color="green">
                              Shop: {shops.find(s => s._id === filters.shop)?.name || filters.shop}
                            </Tag>
                          )}
                        </Space>
                      )}
                    </Col>
                  </Row>

                  {/* Enhanced Financial Overview with Credit Sales */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Title level={4}>
                        <LineChartOutlined /> Financial Overview
                        {filters.dateRange && (
                          <Text type="secondary" style={{ fontSize: '14px', marginLeft: 8 }}>
                            ({filters.dateRange[0].toLocaleDateString()} - {filters.dateRange[1].toLocaleDateString()})
                          </Text>
                        )}
                      </Title>
                    </Col>
                    
                    {/* Main Financial Metrics */}
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card size="small">
                        <Statistic 
                          title="Total Revenue" 
                          value={dashboardData.financialStats.totalRevenue} 
                          prefix="KES" 
                          precision={0}
                          valueStyle={{ color: '#1890ff', fontSize: '14px' }}
                          prefix={<MoneyCollectOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card size="small">
                        <Statistic 
                          title="COGS" 
                          value={dashboardData.financialStats.totalCOGS} 
                          prefix="KES" 
                          precision={0}
                          valueStyle={{ color: '#faad14', fontSize: '14px' }}
                          prefix={<CalculatorOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card size="small">
                        <Statistic 
                          title="Gross Profit" 
                          value={dashboardData.financialStats.totalProfit} 
                          prefix="KES" 
                          precision={0}
                          valueStyle={{ 
                            color: CalculationUtils.getProfitColor(dashboardData.financialStats.totalProfit),
                            fontSize: '14px'
                          }}
                          prefix={CalculationUtils.getProfitIcon(dashboardData.financialStats.totalProfit)}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card size="small">
                        <Statistic 
                          title="Expenses" 
                          value={dashboardData.financialStats.totalExpenses} 
                          prefix="KES" 
                          precision={0}
                          valueStyle={{ color: '#cf1322', fontSize: '14px' }}
                          prefix={<DollarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card size="small">
                        <Statistic 
                          title="Net Profit" 
                          value={dashboardData.financialStats.netProfit} 
                          prefix="KES" 
                          precision={0}
                          valueStyle={{ 
                            color: CalculationUtils.getProfitColor(dashboardData.financialStats.netProfit),
                            fontSize: '14px'
                          }}
                          prefix={CalculationUtils.getProfitIcon(dashboardData.financialStats.netProfit)}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card size="small">
                        <Statistic 
                          title="Profit Margin" 
                          value={dashboardData.financialStats.profitMargin} 
                          suffix="%" 
                          precision={1}
                          valueStyle={{ 
                            color: dashboardData.financialStats.profitMargin >= 0 ? '#3f8600' : '#cf1322',
                            fontSize: '14px'
                          }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* REMOVED: Revenue Breakdown by Payment Method section */}

                  {/* Business Overview and Additional Metrics */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} md={6} lg={3}>
                      <Card size="small">
                        <Statistic 
                          title="Total Sales" 
                          value={dashboardData.financialStats.totalSales} 
                          valueStyle={{ color: '#722ed1', fontSize: '14px' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={3}>
                      <Card size="small">
                        <Statistic 
                          title="Items Sold" 
                          value={dashboardData.financialStats.totalItemsSold} 
                          valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={3}>
                      <Card size="small">
                        <Statistic 
                          title="Products" 
                          value={dashboardData.businessStats.totalProducts} 
                          valueStyle={{ color: '#1890ff', fontSize: '14px' }}
                          prefix={<ProductOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={3}>
                      <Card size="small">
                        <Statistic 
                          title="Shops" 
                          value={dashboardData.businessStats.totalShops} 
                          valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                          prefix={<ShopOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={3}>
                      <Card size="small">
                        <Statistic 
                          title="Low Stock" 
                          value={dashboardData.businessStats.lowStockCount} 
                          valueStyle={{ 
                            color: dashboardData.businessStats.lowStockCount > 0 ? '#cf1322' : '#3f8600',
                            fontSize: '14px'
                          }}
                          prefix={<WarningOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={3}>
                      <Card size="small">
                        <Statistic 
                          title="Outstanding Credit" 
                          value={dashboardData.financialStats.totalBalanceDue} 
                          prefix="KES" 
                          precision={0}
                          valueStyle={{ color: '#faad14', fontSize: '14px' }}
                          prefix={<CreditCardOutlined />}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Alerts Section */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      {dashboardData.businessStats.lowStockCount > 0 && (
                        <Alert
                          message={`${dashboardData.businessStats.lowStockCount} products are low on stock`}
                          description="Some products need to be reordered to avoid stockouts."
                          type="warning"
                          showIcon
                          icon={<WarningOutlined />}
                          action={
                            <Button size="small" type="primary" onClick={() => handleViewAll('inventory')}>
                              View Inventory
                            </Button>
                          }
                          style={{ marginBottom: 8 }}
                        />
                      )}
                      {dashboardData.financialStats.overdueCredits > 0 && (
                        <Alert
                          message={`${dashboardData.financialStats.overdueCredits} credits are overdue`}
                          description="Follow up with customers for payment collection."
                          type="error"
                          showIcon
                          icon={<CreditCardOutlined />}
                          action={
                            <Button size="small" type="primary" onClick={() => handleViewAll('credits')}>
                              View Credits
                            </Button>
                          }
                        />
                      )}
                    </Col>
                  </Row>

                  {/* Main Content Grid */}
                  <Row gutter={[12, 12]}>
                    {/* Recent Transactions */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <ShoppingCartOutlined />
                            Recent Transactions
                            <Badge count={dashboardData.recentTransactions.length} showZero />
                          </Space>
                        }
                        extra={
                          <Space>
                            <Search
                              placeholder="Search transactions..."
                              size="small"
                              style={{ width: 150 }}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              allowClear
                            />
                            <Button 
                              size="small" 
                              type="primary" 
                              onClick={() => handleViewAll('sales')}
                            >
                              View All
                            </Button>
                          </Space>
                        }
                        size="small"
                      >
                        <Table 
                          dataSource={filteredRecentTransactions} 
                          columns={salesColumns} 
                          pagination={{ 
                            pageSize: 5,
                            size: 'small',
                            simple: true
                          }}
                          size="small"
                          scroll={{ x: 600 }}
                          rowKey="_id"
                          locale={{ emptyText: 'No recent transactions' }}
                        />
                      </Card>
                    </Col>

                    {/* Low Stock Products */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <WarningOutlined />
                            Low Stock Products
                            <Badge 
                              count={dashboardData.lowStockProducts.length} 
                              showZero 
                              style={{ backgroundColor: '#cf1322' }} 
                            />
                          </Space>
                        }
                        extra={
                          <Button 
                            size="small" 
                            onClick={() => handleViewAll('inventory')}
                          >
                            Manage
                          </Button>
                        }
                        size="small"
                      >
                        <Table 
                          dataSource={dashboardData.lowStockProducts} 
                          columns={lowStockColumns} 
                          pagination={false}
                          size="small"
                          rowKey="_id"
                          locale={{ emptyText: 'All products are well stocked' }}
                        />
                      </Card>
                    </Col>

                    {/* Top Products */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <ProductOutlined />
                            Top Selling Products
                          </Space>
                        }
                        size="small"
                      >
                        <List
                          dataSource={dashboardData.topProducts}
                          renderItem={(item, index) => (
                            <List.Item>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9',
                                      fontSize: '10px'
                                    }}
                                  >
                                    {index + 1}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '12px' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Sold: {item.quantity} units
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      COGS: {CalculationUtils.formatCurrency(item.cost)}
                                    </Text>
                                    <Text strong style={{ fontSize: '11px', color: '#1890ff' }}>
                                      Revenue: {CalculationUtils.formatCurrency(item.revenue)}
                                    </Text>
                                    <Text strong style={{ fontSize: '11px', color: CalculationUtils.getProfitColor(item.profit) }}>
                                      Profit: {CalculationUtils.formatCurrency(item.profit)}
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No product sales data' }}
                        />
                      </Card>
                    </Col>

                    {/* Shop Performance */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <ShopOutlined />
                            Shop Performance
                          </Space>
                        }
                        size="small"
                      >
                        <List
                          dataSource={dashboardData.shopPerformance}
                          renderItem={(item, index) => (
                            <List.Item>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? '#52c41a' : '#d9d9d9',
                                      fontSize: '10px'
                                    }}
                                  >
                                    {item.name?.charAt(0)?.toUpperCase() || 'S'}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '12px' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Transactions: {item.transactions}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      COGS: {CalculationUtils.formatCurrency(item.cost)}
                                    </Text>
                                    <Text strong style={{ fontSize: '11px', color: '#1890ff' }}>
                                      Revenue: {CalculationUtils.formatCurrency(item.revenue)}
                                    </Text>
                                    <Text strong style={{ fontSize: '11px', color: CalculationUtils.getProfitColor(item.profit) }}>
                                      Profit: {CalculationUtils.formatCurrency(item.profit)} ({item.profitMargin?.toFixed(1)}%)
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          locale={{ emptyText: 'No shop performance data' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Quick Actions */}
                  <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                    <Col span={24}>
                      <Card title="Quick Actions" size="small">
                        <Space wrap>
                          <Button 
                            type="primary" 
                            icon={<BarChartOutlined />}
                            onClick={() => handleViewAll('sales')}
                          >
                            View Full Reports
                          </Button>
                          <Button 
                            icon={<ProductOutlined />}
                            onClick={() => handleViewAll('products')}
                          >
                            Manage Products
                          </Button>
                          <Button 
                            icon={<CreditCardOutlined />}
                            onClick={() => handleViewAll('credits')}
                          >
                            Manage Credits
                          </Button>
                          <Button 
                            icon={<AppstoreOutlined />}
                            onClick={() => handleViewAll('inventory')}
                          >
                            Check Inventory
                          </Button>
                          <Button 
                            icon={<ReloadOutlined />}
                            onClick={handleRefreshData}
                          >
                            Full Refresh
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </>
              )}
            </>
          )}
          
          {location.pathname !== '/admin/dashboard' && <Outlet />}

          {/* View Details Modal */}
          <Modal
            title={viewModalTitle}
            open={viewModalVisible}
            onCancel={() => setViewModalVisible(false)}
            footer={[
              <Button key="close" onClick={() => setViewModalVisible(false)}>
                Close
              </Button>
            ]}
            width={700}
            style={{ top: 20 }}
          >
            {viewModalContent && (
              <Descriptions bordered column={2} size="small">
                {Object.entries(viewModalContent).map(([key, value]) => {
                  if (key === '_id' || key === '__v') return null;
                  
                  if (key === 'items' && Array.isArray(value)) {
                    return (
                      <Descriptions.Item label="Items" span={2} key={key}>
                        <List
                          size="small"
                          dataSource={value.slice(0, 10)}
                          renderItem={item => (
                            <List.Item>
                              {item.productName} - {item.quantity} x {CalculationUtils.formatCurrency(item.unitPrice)} = {CalculationUtils.formatCurrency(item.totalPrice)}
                              {item.buyingPrice && (
                                <Text type="secondary" style={{ marginLeft: 8 }}>
                                  (COGS: {CalculationUtils.formatCurrency(item.buyingPrice)} each)
                                </Text>
                              )}
                            </List.Item>
                          )}
                        />
                        {value.length > 10 && (
                          <Text type="secondary">
                            ... and {value.length - 10} more items
                          </Text>
                        )}
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'object' && value !== null) {
                    return (
                      <Descriptions.Item label={key} span={2} key={key}>
                        <Text code>{JSON.stringify(value, null, 2)}</Text>
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
                    return (
                      <Descriptions.Item label={key} key={key}>
                        <Text strong>{CalculationUtils.formatCurrency(value)}</Text>
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'string' && key.toLowerCase().includes('date')) {
                    return (
                      <Descriptions.Item label={key} key={key}>
                        {new Date(value).toLocaleString()}
                      </Descriptions.Item>
                    );
                  }
                  
                  return (
                    <Descriptions.Item label={key} key={key}>
                      {String(value)}
                    </Descriptions.Item>
                  );
                })}
              </Descriptions>
            )}
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;
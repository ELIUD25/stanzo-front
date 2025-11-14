// src/pages/Admin/AdminDashboard.jsx
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
  FilterOutlined,
  BankOutlined,
  CreditCardFilled,
  WalletOutlined
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  unifiedAPI, 
  shopAPI, 
  reportAPI 
} from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import './AdminDashboard.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Enhanced Admin Dashboard Component with Unified API Integration
const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    financialStats: CalculationUtils.getDefaultStatsWithCreditManagement(),
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
    creditAlerts: [],
    cashierPerformance: []
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

  // ENHANCED: Data fetching with unified API integration
  const fetchDashboardData = async (customFilters = null) => {
    const activeFilters = customFilters || filters;
    
    console.log('🚀 Fetching dashboard data with unified API...', activeFilters);
    
    try {
      setLoading(true);
      setRefreshing(true);
      
      // Fetch shops first for filtering
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      // Build params for unified API
      const params = {};
      
      // Apply date range filter
      if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1]) {
        params.startDate = activeFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = activeFilters.dateRange[1].format('YYYY-MM-DD');
      }
      
      // Apply shop filter
      if (activeFilters.shop && activeFilters.shop !== 'all') {
        params.shopId = activeFilters.shop;
      }

      // Use unified API endpoint (same as Transaction Report)
      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      
      console.log('📊 Unified API response:', {
        transactions: comprehensiveData.salesWithProfit?.length,
        financialStats: comprehensiveData.financialStats,
        hasEnhancedStats: !!comprehensiveData.enhancedStats
      });

      // Process data using the same utility as Transaction Report
      const processedData = processDashboardData(comprehensiveData, shopsData, activeFilters);

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
      console.log('✅ Dashboard data processed:', {
        totalRevenue: processedData.financialStats.totalRevenue,
        netProfit: processedData.financialStats.netProfit,
        creditSales: processedData.financialStats.creditSales,
        recentTransactions: processedData.recentTransactions.length
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

  // ENHANCED: Fallback with unified API structure
  const fetchDataWithFallback = async (activeFilters) => {
    try {
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      // Build basic params for fallback
      const params = {};
      if (activeFilters.shop && activeFilters.shop !== 'all') {
        params.shopId = activeFilters.shop;
      }

      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      const processedData = processDashboardData(comprehensiveData, shopsData, activeFilters);

      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      
    } catch (fallbackError) {
      console.error('💥 Fallback data fetch failed:', fallbackError);
      message.error('Failed to load dashboard data');
      
      // Set empty data structure
      setDashboardData({
        financialStats: CalculationUtils.getDefaultStatsWithCreditManagement(),
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
        creditAlerts: [],
        cashierPerformance: []
      });
    }
  };

// ENHANCED: Dashboard data processing aligned with Transaction Report
const processDashboardData = (comprehensiveData, shops, activeFilters) => {
  console.log('🔄 Processing dashboard data with unified structure...');
  
  // Use the same data processing as Transaction Report
  const processedData = CalculationUtils.processComprehensiveData(
    comprehensiveData, 
    activeFilters.shop === 'all' ? null : activeFilters.shop,
    { 
      includePerformance: true,
      includeProducts: true 
    }
  );

  // Extract data from processed structure
  const transactions = processedData.salesWithProfit || [];
  const financialStats = processedData.financialStats || CalculationUtils.getDefaultStatsWithCreditManagement();
  const products = processedData.products || [];
  const expenses = processedData.expenses || [];
  const credits = processedData.credits || [];
  const cashiers = processedData.cashiers || [];

  console.log('📈 Processed data extracted:', {
    transactions: transactions.length,
    products: products.length,
    expenses: expenses.length,
    credits: credits.length,
    cashiers: cashiers.length
  });

  // Apply date range filter to transactions if needed
  let filteredTransactions = transactions;
  if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1]) {
    filteredTransactions = CalculationUtils.filterDataByDateRange(
      transactions,
      activeFilters.dateRange[0],
      activeFilters.dateRange[1],
      'saleDate'
    );
  }

  // Recent transactions (last 10)
  const recentTransactions = filteredTransactions
    .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt))
    .slice(0, 10);

  // Low stock products
  const lowStockProducts = products.filter(p => 
    CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
  ).slice(0, 5);

  // Top products using same calculation as Transaction Report
  const topProducts = CalculationUtils.calculateTopProducts(filteredTransactions, 5);

  // Shop performance using same calculation as Transaction Report
  const shopPerformance = CalculationUtils.calculateShopPerformance(filteredTransactions, shops);

  // Cashier performance using same calculation as Transaction Report
  const cashierPerformance = CalculationUtils.calculateCashierPerformance(filteredTransactions, cashiers);

  // Credit alerts (overdue credits)
  const creditAlerts = credits
    .filter(credit => {
      const isOverdue = credit.dueDate && new Date(credit.dueDate) < new Date() && 
                       CalculationUtils.safeNumber(credit.balanceDue) > 0;
      
      // Apply shop filter if needed
      if (activeFilters.shop && activeFilters.shop !== 'all') {
        const creditShopId = credit.shopId || (credit.shop && typeof credit.shop === 'object' ? credit.shop._id : credit.shop);
        return isOverdue && creditShopId === activeFilters.shop;
      }
      
      return isOverdue;
    })
    .slice(0, 5);

  // ENHANCE COGS CALCULATION: Use the same robust calculation as in calculateFinancialStatsWithCreditManagement
  const costOfGoodsSold = financialStats.costOfGoodsSold || 
                         filteredTransactions.reduce((sum, t) => {
                           // Calculate from transaction cost or items using the same logic as in main calculations
                           if (t.cost) {
                             return sum + CalculationUtils.safeNumber(t.cost);
                           }
                           
                           // Calculate from items as fallback using the utility function
                           return sum + CalculationUtils.calculateCostFromItems(t);
                         }, 0);

  // Enhanced financial stats with additional calculations
  const enhancedFinancialStats = {
    ...financialStats,
    // Ensure all required fields are present
    totalRevenue: financialStats.totalRevenue || 0,
    netProfit: financialStats.netProfit || 0,
    totalSales: financialStats.totalSales || filteredTransactions.length,
    creditSales: financialStats.creditSales || filteredTransactions.filter(t => t.isCreditTransaction).reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    nonCreditSales: financialStats.nonCreditSales || filteredTransactions.filter(t => !t.isCreditTransaction).reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    outstandingCredit: financialStats.outstandingCredit || filteredTransactions.filter(t => t.isCreditTransaction).reduce((sum, t) => sum + (t.outstandingRevenue || 0), 0),
    totalExpenses: financialStats.totalExpenses || expenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0),
    
    // Use the enhanced COGS calculation
    costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
    
    // Recalculate gross profit and profit margin with accurate COGS
    grossProfit: financialStats.grossProfit || parseFloat((enhancedFinancialStats.totalRevenue - costOfGoodsSold).toFixed(2)),
    profitMargin: financialStats.profitMargin || CalculationUtils.calculateProfitMargin(enhancedFinancialStats.totalRevenue, enhancedFinancialStats.grossProfit)
  };

  // Recalculate net profit with accurate expenses and COGS
  if (!financialStats.netProfit) {
    enhancedFinancialStats.netProfit = parseFloat((enhancedFinancialStats.grossProfit - enhancedFinancialStats.totalExpenses).toFixed(2));
  }

  // Business stats
  const businessStats = {
    totalProducts: products.length,
    totalShops: shops.length,
    totalCashiers: cashiers.length,
    lowStockCount: lowStockProducts.length,
    activeCredits: credits.filter(c => c.status !== 'paid' && CalculationUtils.safeNumber(c.balanceDue) > 0).length
  };

  return {
    financialStats: enhancedFinancialStats,
    businessStats,
    recentTransactions,
    lowStockProducts,
    topProducts,
    shopPerformance,
    cashierPerformance,
    creditAlerts,
    timestamp: new Date().toISOString(),
    appliedFilters: activeFilters,
    dataSources: {
      transactions: filteredTransactions.length,
      products: products.length,
      expenses: expenses.length,
      credits: credits.length,
      shops: shops.length,
      cashiers: cashiers.length
    }
  };
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
      const params = {};
      if (filters.shop && filters.shop !== 'all') {
        params.shopId = filters.shop;
      }

      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      const shopsData = await shopAPI.getAll();
      const processedData = processDashboardData(comprehensiveData, shopsData, filters);
      
      setDashboardData(processedData);
      setDataTimestamp(new Date().toISOString());
      message.success('Quick refresh completed');
    } catch (error) {
      console.error('Quick refresh failed:', error);
      message.error('Quick refresh failed');
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

  // ENHANCED: Sales Columns aligned with Transaction Report
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
            color={record.isCreditTransaction ? 'orange' : 'green'}
            style={{ fontSize: '9px', margin: 0 }}
          >
            {record.isCreditTransaction ? 'CREDIT' : 'COMPLETE'}
          </Tag>
        </Space>
      ),
      width: 100
    },
    {
      title: 'Revenue',
      key: 'recognizedRevenue',
      render: (_, record) => (
        <Text strong style={{ fontSize: '12px', color: '#52c41a' }}>
          {CalculationUtils.formatCurrency(record.recognizedRevenue || record.totalAmount)}
        </Text>
      ),
      width: 100
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
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag 
            color={record.isCreditTransaction ? 'orange' : 'green'}
            style={{ fontSize: '9px' }}
          >
            {record.isCreditTransaction ? 'CREDIT' : 'COMPLETE'}
          </Tag>
          {record.isCreditTransaction && record.creditStatus && (
            <Tag 
              color={
                record.creditStatus === 'paid' ? 'green' :
                record.creditStatus === 'partially_paid' ? 'blue' :
                record.creditStatus === 'overdue' ? 'red' : 'orange'
              }
              style={{ fontSize: '8px' }}
            >
              {record.creditStatus.toUpperCase()}
            </Tag>
          )}
        </Space>
      ),
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
      title: 'Price',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      render: (price) => (
        <Text style={{ fontSize: '11px' }}>
          {CalculationUtils.formatCurrency(price)}
        </Text>
      ),
      width: 80
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth="80"
        style={{ 
          background: 'linear-gradient(180deg, #2c3e50 0%, #3498db 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}
      >
        <div className="logo" style={{ padding: '16px 0', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
            {collapsed ? 'TP' : 'The Place Club'}
          </Title>
        </div>
        <Menu 
          theme="dark" 
          selectedKeys={[getActiveTab()]}
          mode="inline"
          onClick={handleMenuClick}
          style={{ background: 'transparent', border: 'none' }}
        >
          <Menu.Item key="dashboard" icon={<DashboardOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
            Dashboard
          </Menu.Item>
          <Menu.Item key="products" icon={<ProductOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
            Product Management
          </Menu.Item>
          <Menu.Item key="shops" icon={<ShopOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
            Shop Management
          </Menu.Item>
          <Menu.Item key="cashiers" icon={<UserOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
            Cashier Management
          </Menu.Item>
          <Menu.Item key="transactions" icon={<BarChartOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
            Transactions Report
          </Menu.Item>
          <Menu.Item key="expenses" icon={<DollarOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
            Expense Management
          </Menu.Item>
          <Menu.Item key="inventory" icon={<AppstoreOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
            Inventory
          </Menu.Item>
          <Menu.Item key="credits" icon={<CreditCardOutlined />} style={{ margin: '4px 8px', borderRadius: '6px' }}>
            Credit Management
          </Menu.Item>
        </Menu>
      </Sider>

      <Layout className="site-layout">
        <Header className="site-layout-header" style={{ 
          background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
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
                  style={{ background: filters.autoRefresh ? '#52c41a' : '#f0f0f0' }}
                >
                  Auto
                </Button>
              </Tooltip>
              
              <Button 
                icon={<ReloadOutlined spin={refreshing} />} 
                onClick={quickRefresh}
                disabled={refreshing}
                size="small"
                type="primary"
              >
                Quick Refresh
              </Button>
              
              {/* Filter button */}
              <Button 
                icon={<FilterOutlined />}
                onClick={() => setFilterVisible(!filterVisible)}
                size="small"
                type="default"
              >
                Filters
              </Button>
              
              <Button 
                icon={<ExportOutlined />} 
                onClick={handleExportData}
                loading={exportLoading}
                size="small"
                type="default"
              >
                Export
              </Button>
              
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Button type="text" style={{ color: 'white', fontWeight: 'bold' }} size="small">
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
        
        <Content style={{ margin: '16px', padding: 16, background: '#f5f7fa' }}>
          {showWelcome && location.pathname === '/admin/dashboard' && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '60vh',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#3498db',
              animation: 'fadeIn 1s',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
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
                  style={{ marginBottom: 16, border: '1px solid #e8e8e8', borderRadius: '8px' }}
                  title={
                    <Space>
                      <FilterOutlined style={{ color: '#3498db' }} />
                      <Text strong>Dashboard Filters</Text>
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
                              {filters.dateRange[0].format('YYYY-MM-DD')} - {filters.dateRange[1].format('YYYY-MM-DD')}
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

                  {/* UPDATED: Enhanced Financial Overview with Expense and COGS */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col span={24}>
                      <Card 
                        title={
                          <Space>
                            <LineChartOutlined style={{ color: '#3498db', fontSize: '18px' }} />
                            <Text strong style={{ fontSize: '16px', color: '#2c3e50' }}>Financial Overview</Text>
                            {filters.dateRange && (
                              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                                ({filters.dateRange[0].format('YYYY-MM-DD')} - {filters.dateRange[1].format('YYYY-MM-DD')})
                              </Text>
                            )}
                          </Space>
                        }
                        style={{ 
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: 'none'
                        }}
                        bodyStyle={{ padding: '16px' }}
                      >
                        <Row gutter={[16, 16]}>
                          {/* Core Revenue Metrics */}
                          <Col xs={24} sm={12} md={8} lg={6}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ color: 'white', fontSize: '12px' }}>
                                    <MoneyCollectOutlined /> Total Revenue
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalRevenue} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}
                              />
                            </Card>
                          </Col>
                          
                          <Col xs={24} sm={12} md={8} lg={6}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                border: 'none',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ color: 'white', fontSize: '12px' }}>
                                    <ShoppingCartOutlined /> Total Sales
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalSales} 
                                precision={0}
                                valueStyle={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}
                              />
                            </Card>
                          </Col>

                          {/* NEW: Expense Metrics */}
                          <Col xs={24} sm={12} md={8} lg={6}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                border: 'none',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ color: 'white', fontSize: '12px' }}>
                                    <DollarOutlined /> Total Expenses
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalExpenses} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}
                              />
                            </Card>
                          </Col>

                          <Col xs={24} sm={12} md={8} lg={6}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                border: 'none',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ color: 'white', fontSize: '12px' }}>
                                    <CalculatorOutlined /> Net Profit
                                  </Text>
                                }
                                value={dashboardData.financialStats.netProfit} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}
                              />
                            </Card>
                          </Col>

                          {/* NEW: Cost of Goods Sold */}
                          <Col xs={24} sm={12} md={8} lg={6}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                                border: 'none',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ color: 'white', fontSize: '12px' }}>
                                    <ProductOutlined /> COGS
                                  </Text>
                                }
                                value={dashboardData.financialStats.costOfGoodsSold} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}
                              />
                            </Card>
                          </Col>

                          {/* Credit Sales */}
                          <Col xs={24} sm={12} md={8} lg={6}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                                border: 'none',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ color: '#2c3e50', fontSize: '12px' }}>
                                    <CreditCardFilled /> Credit Sales
                                  </Text>
                                }
                                value={dashboardData.financialStats.creditSales} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}
                              />
                            </Card>
                          </Col>

                          {/* Payment Methods */}
                          <Col xs={24} sm={12} md={8} lg={6}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                                border: 'none',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ color: '#2c3e50', fontSize: '12px' }}>
                                    <BankOutlined /> Digital Payments
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalMpesaBank} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}
                              />
                            </Card>
                          </Col>

                          <Col xs={24} sm={12} md={8} lg={6}>
                            <Card 
                              size="small" 
                              style={{ 
                                background: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
                                border: 'none',
                                borderRadius: '8px'
                              }}
                              bodyStyle={{ padding: '12px', textAlign: 'center' }}
                            >
                              <Statistic 
                                title={
                                  <Text style={{ color: '#2c3e50', fontSize: '12px' }}>
                                    <WalletOutlined /> Cash Payments
                                  </Text>
                                }
                                value={dashboardData.financialStats.totalCash} 
                                prefix="KES" 
                                precision={0}
                                valueStyle={{ color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}
                              />
                            </Card>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>

                  {/* Credit Management Overview - Only show if there are credit sales */}
                  {dashboardData.financialStats.creditSales > 0 && (
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                      <Col span={24}>
                        <Card 
                          title={
                            <Space>
                              <CreditCardOutlined style={{ color: '#e74c3c' }} />
                              <Text strong>Credit Management</Text>
                            </Space>
                          }
                          style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        >
                          <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Card size="small">
                                <Statistic 
                                  title="Outstanding Credit" 
                                  value={dashboardData.financialStats.outstandingCredit} 
                                  prefix="KES" 
                                  precision={0}
                                  valueStyle={{ color: '#cf1322', fontSize: '14px' }}
                                  prefix={<WarningOutlined />}
                                />
                              </Card>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Card size="small">
                                <Statistic 
                                  title="Credit Sales Count" 
                                  value={dashboardData.financialStats.creditSalesCount} 
                                  precision={0}
                                  valueStyle={{ color: '#fa8c16', fontSize: '14px' }}
                                />
                              </Card>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Card size="small">
                                <Statistic 
                                  title="Complete Sales" 
                                  value={dashboardData.financialStats.completeTransactionsCount} 
                                  precision={0}
                                  valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                                />
                              </Card>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Card size="small">
                                <Statistic 
                                  title="Total Credit Given" 
                                  value={dashboardData.financialStats.totalCreditGiven} 
                                  prefix="KES" 
                                  precision={0}
                                  valueStyle={{ color: '#722ed1', fontSize: '14px' }}
                                />
                              </Card>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {/* Business Overview */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col span={24}>
                      <Card 
                        title={
                          <Space>
                            <AppstoreOutlined style={{ color: '#9b59b6' }} />
                            <Text strong>Business Overview</Text>
                          </Space>
                        }
                        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      >
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#ecf0f1', border: 'none' }}>
                              <Statistic 
                                title="Total Products" 
                                value={dashboardData.businessStats.totalProducts} 
                                valueStyle={{ color: '#3498db', fontSize: '14px' }}
                                prefix={<ProductOutlined />}
                              />
                            </Card>
                          </Col>
                          <Col xs={24} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#ecf0f1', border: 'none' }}>
                              <Statistic 
                                title="Total Shops" 
                                value={dashboardData.businessStats.totalShops} 
                                valueStyle={{ color: '#2ecc71', fontSize: '14px' }}
                                prefix={<ShopOutlined />}
                              />
                            </Card>
                          </Col>
                          <Col xs={24} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#ecf0f1', border: 'none' }}>
                              <Statistic 
                                title="Total Cashiers" 
                                value={dashboardData.businessStats.totalCashiers} 
                                valueStyle={{ color: '#9b59b6', fontSize: '14px' }}
                                prefix={<UserOutlined />}
                              />
                            </Card>
                          </Col>
                          <Col xs={24} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#ecf0f1', border: 'none' }}>
                              <Statistic 
                                title="Low Stock" 
                                value={dashboardData.businessStats.lowStockCount} 
                                valueStyle={{ 
                                  color: dashboardData.businessStats.lowStockCount > 0 ? '#e74c3c' : '#27ae60',
                                  fontSize: '14px'
                                }}
                                prefix={<WarningOutlined />}
                              />
                            </Card>
                          </Col>
                          <Col xs={24} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#ecf0f1', border: 'none' }}>
                              <Statistic 
                                title="Active Credits" 
                                value={dashboardData.businessStats.activeCredits} 
                                valueStyle={{ color: '#f39c12', fontSize: '14px' }}
                                prefix={<CreditCardOutlined />}
                              />
                            </Card>
                          </Col>
                          <Col xs={24} sm={12} md={6} lg={3}>
                            <Card size="small" style={{ background: '#ecf0f1', border: 'none' }}>
                              <Statistic 
                                title="Items Sold" 
                                value={dashboardData.financialStats.totalItemsSold} 
                                valueStyle={{ color: '#1abc9c', fontSize: '14px' }}
                              />
                            </Card>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>

                  {/* Alerts Section */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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
                          style={{ marginBottom: 8, borderRadius: '8px' }}
                        />
                      )}
                      {dashboardData.financialStats.outstandingCredit > 0 && (
                        <Alert
                          message={`Outstanding credit: ${CalculationUtils.formatCurrency(dashboardData.financialStats.outstandingCredit)}`}
                          description="Monitor credit collection and follow up with customers."
                          type="info"
                          showIcon
                          icon={<CreditCardOutlined />}
                          action={
                            <Button size="small" type="primary" onClick={() => handleViewAll('credits')}>
                              View Credits
                            </Button>
                          }
                          style={{ marginBottom: 8, borderRadius: '8px' }}
                        />
                      )}
                      {dashboardData.creditAlerts.length > 0 && (
                        <Alert
                          message={`${dashboardData.creditAlerts.length} credits are overdue`}
                          description="Follow up with customers for payment collection."
                          type="error"
                          showIcon
                          icon={<CreditCardOutlined />}
                          action={
                            <Button size="small" type="primary" onClick={() => handleViewAll('credits')}>
                              View Credits
                            </Button>
                          }
                          style={{ borderRadius: '8px' }}
                        />
                      )}
                    </Col>
                  </Row>

                  {/* Main Content Grid */}
                  <Row gutter={[16, 16]}>
                    {/* Recent Transactions */}
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Space>
                            <ShoppingCartOutlined style={{ color: '#3498db' }} />
                            <Text strong>Recent Transactions</Text>
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
                        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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
                            <WarningOutlined style={{ color: '#e74c3c' }} />
                            <Text strong>Low Stock Products</Text>
                            <Badge 
                              count={dashboardData.lowStockProducts.length} 
                              showZero 
                              style={{ backgroundColor: '#e74c3c' }} 
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
                        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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
                            <ProductOutlined style={{ color: '#2ecc71' }} />
                            <Text strong>Top Selling Products</Text>
                          </Space>
                        }
                        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      >
                        <List
                          dataSource={dashboardData.topProducts}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? '#3498db' : '#95a5a6',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {index + 1}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Sold: {item.totalSold} units
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Revenue: {CalculationUtils.formatCurrency(item.totalRevenue)}
                                    </Text>
                                    <Text strong style={{ fontSize: '11px', color: CalculationUtils.getProfitColor(item.totalProfit) }}>
                                      Profit: {CalculationUtils.formatCurrency(item.totalProfit)}
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
                            <ShopOutlined style={{ color: '#9b59b6' }} />
                            <Text strong>Shop Performance</Text>
                          </Space>
                        }
                        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      >
                        <List
                          dataSource={dashboardData.shopPerformance}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    size="small" 
                                    style={{ 
                                      backgroundColor: index < 3 ? '#9b59b6' : '#bdc3c7',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {item.name?.charAt(0)?.toUpperCase() || 'S'}
                                  </Avatar>
                                }
                                title={
                                  <Text style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Text>
                                }
                                description={
                                  <Space direction="vertical" size={0}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                      Transactions: {item.transactions}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
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
                          locale={{ emptyText: 'No shop performance data' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Quick Actions */}
                  <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                    <Col span={24}>
                      <Card 
                        title="Quick Actions" 
                        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      >
                        <Space wrap>
                          <Button 
                            type="primary" 
                            icon={<BarChartOutlined />}
                            onClick={() => handleViewAll('sales')}
                            size="middle"
                          >
                            View Full Reports
                          </Button>
                          <Button 
                            icon={<ProductOutlined />}
                            onClick={() => handleViewAll('products')}
                            size="middle"
                          >
                            Manage Products
                          </Button>
                          <Button 
                            icon={<CreditCardOutlined />}
                            onClick={() => handleViewAll('credits')}
                            size="middle"
                          >
                            Manage Credits
                          </Button>
                          <Button 
                            icon={<AppstoreOutlined />}
                            onClick={() => handleViewAll('inventory')}
                            size="middle"
                          >
                            Check Inventory
                          </Button>
                          <Button 
                            icon={<DollarOutlined />}
                            onClick={() => handleViewAll('expenses')}
                            size="middle"
                          >
                            Manage Expenses
                          </Button>
                          <Button 
                            icon={<ReloadOutlined />}
                            onClick={handleRefreshData}
                            size="middle"
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
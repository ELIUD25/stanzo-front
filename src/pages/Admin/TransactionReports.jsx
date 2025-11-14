// src/pages/Admin/TransactionReports.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Typography,
  Input,
  Button,
  DatePicker,
  Statistic,
  Row,
  Col,
  Alert,
  Space,
  Tag,
  Modal,
  Divider,
  message,
  Select,
  Spin,
  Tooltip,
  Tabs,
  Empty,
  List,
  Avatar,
  Progress,
  Badge,
  Descriptions
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DollarOutlined,
  UserOutlined,
  ShopOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  PieChartOutlined,
  TableOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { unifiedAPI, shopAPI } from '../../services/api';
import { CalculationUtils } from '../../utils/calculationUtils';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

// Extend dayjs with plugins
dayjs.extend(advancedFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// =============================================
// CONSTANTS AND CONFIGURATION
// =============================================

const TIME_RANGE_OPTIONS = [
  { label: 'Today', value: 'daily' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Year', value: 'yearly' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom Range', value: 'custom' }
];

const PAYMENT_METHOD_OPTIONS = [
  { label: 'All Payments', value: '' },
  { label: 'CASH', value: 'cash' },
  { label: 'MPESA/BANK', value: 'mpesa' },
  { label: 'CREDIT', value: 'credit' }
];

const TRANSACTION_TYPE_OPTIONS = [
  { label: 'All Transactions', value: '' },
  { label: 'Complete Transactions', value: 'complete' },
  { label: 'Credit Transactions', value: 'credit' }
];

const STATUS_CONFIG = {
  completed: { color: 'green', text: 'COMPLETED' },
  pending: { color: 'orange', text: 'PENDING' },
  refunded: { color: 'blue', text: 'REFUNDED' },
  cancelled: { color: 'red', text: 'CANCELLED' },
  credit: { color: 'red', text: 'CREDIT' }
};

const PAYMENT_METHOD_CONFIG = {
  cash: { color: 'orange', text: 'CASH' },
  mpesa: { color: 'green', text: 'MPESA' },
  bank: { color: 'blue', text: 'BANK' },
  credit: { color: 'red', text: 'CREDIT' },
  card: { color: 'purple', text: 'CARD' }
};

const CREDIT_STATUS_CONFIG = {
  pending: { color: 'orange', icon: <ClockCircleOutlined />, text: 'PENDING' },
  partially_paid: { color: 'blue', icon: <DollarOutlined />, text: 'PARTIALLY PAID' },
  paid: { color: 'green', icon: <CheckCircleOutlined />, text: 'PAID' },
  overdue: { color: 'red', icon: <ExclamationCircleOutlined />, text: 'OVERDUE' }
};

// =============================================
// MAIN COMPONENT - UPDATED VERSION
// =============================================

const TransactionsReport = ({ currentUser }) => {
  // State management - simplified
  const [comprehensiveData, setComprehensiveData] = useState({
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  
  // Filters - always visible, auto-refresh enabled by default
  const [filters, setFilters] = useState({
    dateRange: null,
    shop: 'all',
    paymentMethod: '',
    transactionType: '',
    timeRange: '30d' // Default to last 30 days for better data visibility
  });
  
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [shops, setShops] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Auto-refresh effect - PERMANENT (every 30 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing transaction report...');
      fetchAllData();
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Calculate date range based on timeRangeFilter
  const calculateDateRange = useCallback((rangeType) => {
    const now = dayjs();
    let startDate;

    switch (rangeType) {
      case 'daily':
        startDate = now.startOf('day');
        break;
      case '7d':
        startDate = now.subtract(7, 'days');
        break;
      case '30d':
        startDate = now.subtract(30, 'days');
        break;
      case 'yearly':
        startDate = now.startOf('year');
        break;
      case 'all':
        return null;
      case 'custom':
        return filters.dateRange;
      default:
        startDate = now.subtract(30, 'days'); // Default to 30 days
    }

    return [startDate, now];
  }, [filters.dateRange]);

  // Update date range when timeRange changes
  useEffect(() => {
    const newDateRange = calculateDateRange(filters.timeRange);
    setFilters(prev => ({ ...prev, dateRange: newDateRange }));
  }, [filters.timeRange, calculateDateRange]);

  // Data fetching
  const fetchAllData = useCallback(async (customFilters = null) => {
    if (loading) return;

    const activeFilters = customFilters || filters;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Fetching transaction report data with unified API...', activeFilters);
      
      // Fetch shops first for filtering
      const shopsData = await shopAPI.getAll();
      setShops(shopsData);

      // Build params
      const params = {};
      
      // Apply date range filter
      if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1]) {
        params.startDate = dayjs(activeFilters.dateRange[0]).format('YYYY-MM-DD');
        params.endDate = dayjs(activeFilters.dateRange[1]).format('YYYY-MM-DD');
      }
      
      // Apply shop filter
      if (activeFilters.shop && activeFilters.shop !== 'all') {
        params.shopId = activeFilters.shop;
      }

      // Use unified API endpoint
      const comprehensiveData = await unifiedAPI.getCombinedTransactions(params);
      
      console.log('📊 Unified API response for Transaction Report:', {
        transactions: comprehensiveData.salesWithProfit?.length,
        financialStats: comprehensiveData.financialStats,
        hasEnhancedStats: !!comprehensiveData.enhancedStats
      });

      // Process data
      const processedData = processTransactionReportData(comprehensiveData, shopsData, activeFilters);
      setComprehensiveData(processedData);
      setDataTimestamp(new Date().toISOString());

      const transactionCount = processedData.recentTransactions.length;
      if (transactionCount > 0) {
        let shopName = 'All Shops';
        if (activeFilters.shop !== 'all') {
          const foundShop = shopsData.find(s => s._id === activeFilters.shop);
          shopName = foundShop?.name || 'Selected Shop';
        }
        
        const creditTransactionCount = processedData.financialStats.creditSalesCount || 0;
        const creditInfo = creditTransactionCount > 0 ? 
          ` (${creditTransactionCount} credit transactions)` : '';
        
        message.success(`Loaded ${transactionCount} transactions${creditInfo} for ${shopName}`);
      } else {
        message.info('No transaction data found for the selected filters');
      }

    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to load transaction data. Please try again.';
      setError(errorMessage);
      message.error(errorMessage);
      
      // Set fallback data structure
      setComprehensiveData({
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
    } finally {
      setLoading(false);
    }
  }, [filters, loading]);

  // Data processing function
  const processTransactionReportData = (comprehensiveData, shops, activeFilters) => {
    console.log('🔄 Processing transaction report data...');
    
    // Process data
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

    // Apply additional filters for transaction report
    let filteredTransactions = transactions;
    
    // Apply payment method filter
    if (activeFilters.paymentMethod) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.paymentMethod === activeFilters.paymentMethod
      );
    }
    
    // Apply transaction type filter
    if (activeFilters.transactionType === 'credit') {
      filteredTransactions = filteredTransactions.filter(t => t.isCreditTransaction);
    } else if (activeFilters.transactionType === 'complete') {
      filteredTransactions = filteredTransactions.filter(t => !t.isCreditTransaction);
    }

    // Apply date range filter to transactions if needed
    if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1]) {
      filteredTransactions = CalculationUtils.filterDataByDateRange(
        filteredTransactions,
        activeFilters.dateRange[0],
        activeFilters.dateRange[1],
        'saleDate'
      );
    }

    // Recent transactions (all filtered transactions for report)
    const recentTransactions = filteredTransactions
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt));

    // Low stock products
    const lowStockProducts = products.filter(p => 
      CalculationUtils.safeNumber(p.currentStock) <= CalculationUtils.safeNumber(p.minStockLevel, 5)
    ).slice(0, 5);

    // Top products
    const topProducts = CalculationUtils.calculateTopProducts(filteredTransactions, 10);

    // Shop performance
    const shopPerformance = CalculationUtils.calculateShopPerformance(filteredTransactions, shops);

    // Cashier performance
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

    // Enhanced financial stats with additional calculations
    const costOfGoodsSold = financialStats.costOfGoodsSold || 
                           filteredTransactions.reduce((sum, t) => {
                             if (t.cost) {
                               return sum + CalculationUtils.safeNumber(t.cost);
                             }
                             return sum + CalculationUtils.calculateCostFromItems(t);
                           }, 0);

    const enhancedFinancialStats = {
      ...financialStats,
      totalRevenue: financialStats.totalRevenue || 0,
      netProfit: financialStats.netProfit || 0,
      totalSales: financialStats.totalSales || filteredTransactions.length,
      creditSales: financialStats.creditSales || filteredTransactions.filter(t => t.isCreditTransaction).reduce((sum, t) => sum + (t.totalAmount || 0), 0),
      nonCreditSales: financialStats.nonCreditSales || filteredTransactions.filter(t => !t.isCreditTransaction).reduce((sum, t) => sum + (t.totalAmount || 0), 0),
      outstandingCredit: financialStats.outstandingCredit || filteredTransactions.filter(t => t.isCreditTransaction).reduce((sum, t) => sum + (t.outstandingRevenue || 0), 0),
      totalExpenses: financialStats.totalExpenses || expenses.reduce((sum, e) => sum + CalculationUtils.safeNumber(e.amount), 0),
      costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
      grossProfit: financialStats.grossProfit || parseFloat((enhancedFinancialStats.totalRevenue - costOfGoodsSold).toFixed(2)),
      profitMargin: financialStats.profitMargin || CalculationUtils.calculateProfitMargin(enhancedFinancialStats.totalRevenue, enhancedFinancialStats.grossProfit)
    };

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

  // Auto-fetch data when filters change
  useEffect(() => {
    fetchAllData();
  }, [filters.shop, filters.timeRange, filters.paymentMethod, filters.transactionType]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Auto-refresh when filters change
    fetchAllData(newFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      dateRange: null,
      shop: 'all',
      paymentMethod: '',
      transactionType: '',
      timeRange: '30d'
    };
    setFilters(clearedFilters);
    fetchAllData(clearedFilters);
    message.info('Filters cleared - showing last 30 days data');
  };

  // Event handlers
  const handleViewTransaction = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setViewModalVisible(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAllData();
    message.success('Data refreshed successfully');
  }, [fetchAllData]);

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const exportData = {
        timestamp: dataTimestamp,
        filters: filters,
        ...comprehensiveData
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transaction-report-${new Date().toISOString().split('T')[0]}.json`;
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

  // Filtered data with search
  const filteredTransactions = useMemo(() => {
    if (!comprehensiveData?.recentTransactions) return [];
    
    let filtered = comprehensiveData.recentTransactions;
    
    // Apply search filter
    const searchLower = searchText.toLowerCase().trim();
    if (searchLower) {
      filtered = filtered.filter(transaction => {
        if (!transaction) return false;
        
        const searchFields = [
          transaction.cashierName,
          transaction.shop && typeof transaction.shop === 'string' ? transaction.shop : 
            (transaction.shop && typeof transaction.shop === 'object' ? transaction.shop.name : ''),
          transaction.paymentMethod,
          transaction.transactionNumber,
          transaction.customerName,
          ...(transaction.items?.map(item => item.productName) || [])
        ].filter(Boolean).map(field => field.toLowerCase());

        return searchFields.some(field => field.includes(searchLower));
      });
    }
    
    return filtered;
  }, [comprehensiveData, searchText]);

  // Transaction type counts
  const transactionTypeCounts = useMemo(() => {
    if (!comprehensiveData?.recentTransactions) {
      return { total: 0, credit: 0, complete: 0 };
    }
    
    const transactions = comprehensiveData.recentTransactions;
    return {
      total: transactions.length,
      credit: transactions.filter(t => t.isCreditTransaction).length,
      complete: transactions.filter(t => !t.isCreditTransaction).length
    };
  }, [comprehensiveData]);

  // Helper functions
  const getShopNameForDisplay = () => {
    if (filters.shop === 'all') return 'All Shops';
    const foundShop = shops.find(s => s._id === filters.shop);
    return foundShop?.name || 'Selected Shop';
  };

  // Table columns
  const columns = useMemo(() => [
    {
      title: 'Transaction ID',
      dataIndex: '_id',
      key: 'transactionId',
      render: (id, record) => (
        <Tooltip title={id}>
          <Text code style={{ cursor: 'pointer' }}>
            {record.transactionNumber || (id ? `${id.substring(0, 8)}...` : 'N/A')}
          </Text>
        </Tooltip>
      ),
      width: 120,
      fixed: 'left'
    },
    {
      title: 'Date & Time',
      dataIndex: 'saleDate',
      key: 'date',
      render: (date, record) => record.displayDate || dayjs(date).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => new Date(a.saleDate) - new Date(b.saleDate),
      width: 150
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name) => name || 'Walk-in',
      width: 120
    },
    {
      title: 'Shop',
      dataIndex: 'shop',
      key: 'shop',
      width: 120,
      render: (shop, record) => {
        let shopName = 'Unknown Shop';
        
        if (typeof shop === 'string') {
          shopName = shop;
        } else if (shop && typeof shop === 'object' && shop.name) {
          shopName = shop.name;
        } else if (record.shopId) {
          const foundShop = shops.find(s => s._id === record.shopId);
          shopName = foundShop?.name || 'Unknown Shop';
        }
        
        return (
          <Tooltip title={shopName}>
            <Text ellipsis>{shopName}</Text>
          </Tooltip>
        );
      }
    },
    {
      title: 'Cashier',
      dataIndex: 'cashierName',
      key: 'cashierName',
      width: 120,
      render: (text) => text || 'Unknown Cashier'
    },
    {
      title: 'Transaction Type',
      key: 'transactionType',
      width: 120,
      render: (_, record) => (
        <Tag color={record.isCreditTransaction ? 'orange' : 'green'}>
          {record.isCreditTransaction ? 'CREDIT' : 'COMPLETE'}
        </Tag>
      )
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1890ff' }}>
            {CalculationUtils.formatCurrency(amount)}
          </Text>
          {record.isCreditTransaction && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Credit Sale
            </Text>
          )}
        </Space>
      ),
      sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
      width: 120
    },
    {
      title: 'Recognized Revenue',
      key: 'recognizedRevenue',
      width: 140,
      render: (_, record) => {
        const isCredit = record.isCreditTransaction;
        const recognizedRevenue = record.recognizedRevenue || record.totalAmount;
        
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: '#52c41a' }}>
              {CalculationUtils.formatCurrency(recognizedRevenue)}
            </Text>
            {isCredit && (
              <Progress 
                percent={Math.round((recognizedRevenue / record.totalAmount) * 100)} 
                size="small" 
                showInfo={false}
              />
            )}
          </Space>
        );
      },
      sorter: (a, b) => (a.recognizedRevenue || a.totalAmount || 0) - (b.recognizedRevenue || b.totalAmount || 0),
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => (
        <Text style={{ color: '#faad14' }}>
          {CalculationUtils.formatCurrency(cost || 0)}
        </Text>
      ),
      sorter: (a, b) => (a.cost || 0) - (b.cost || 0),
      width: 120
    },
    {
      title: 'Profit',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit) => (
        <Text strong style={{ color: CalculationUtils.getProfitColor(profit) }}>
          {CalculationUtils.formatCurrency(profit || 0)}
        </Text>
      ),
      sorter: (a, b) => (a.profit || 0) - (b.profit || 0),
      width: 120
    },
    {
      title: 'Margin',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (margin) => (
        <Text strong style={{ color: '#3f8600' }}>
          {CalculationUtils.safeNumber(margin, 0).toFixed(1)}%
        </Text>
      ),
      width: 100
    },
    {
      title: 'Payment & Credit Status',
      key: 'paymentCreditStatus',
      width: 200,
      render: (_, record) => {
        const isCredit = record.isCreditTransaction;
        
        return (
          <Space direction="vertical" size={0}>
            <Tag color={PAYMENT_METHOD_CONFIG[record.paymentMethod]?.color || 'default'}>
              {record.paymentMethod?.toUpperCase()}
            </Tag>
            {isCredit && (
              <>
                <Tag 
                  color={CREDIT_STATUS_CONFIG[record.creditStatus]?.color || 'orange'}
                  style={{ fontSize: '10px', marginTop: '2px' }}
                >
                  {record.creditStatus?.toUpperCase() || 'PENDING'}
                </Tag>
                {record.outstandingRevenue > 0 && (
                  <Text type="danger" style={{ fontSize: '10px' }}>
                    Due: {CalculationUtils.formatCurrency(record.outstandingRevenue)}
                  </Text>
                )}
              </>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Revenue Type',
      key: 'revenueType',
      width: 120,
      render: (_, record) => {
        if (record.isCreditTransaction) {
          return (
            <Space direction="vertical" size={0}>
              <Tag color="orange">CREDIT</Tag>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {Math.round((record.recognizedRevenue / record.totalAmount) * 100)}% Collected
              </Text>
            </Space>
          );
        }
        return <Tag color="green">CASH</Tag>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={STATUS_CONFIG[status]?.color || 'default'}>
          {status?.toUpperCase()}
        </Tag>
      ),
      width: 100
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewTransaction(record)}
          size="small"
        >
          View
        </Button>
      )
    }
  ], [shops, handleViewTransaction]);

  // Financial Overview Component - UPDATED: Financial Summary REMOVED
  const FinancialOverview = () => {
    const safeStats = comprehensiveData?.financialStats || CalculationUtils.getDefaultStatsWithCreditManagement();
    
    const hasData = safeStats.totalTransactions > 0 || safeStats.totalRevenue > 0;

    const StatCard = ({ title, value, prefix = "KES", description, borderColor, children }) => (
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card 
          size="small" 
          style={{ 
            textAlign: 'center', 
            borderLeft: `4px solid ${borderColor}`,
            opacity: hasData ? 1 : 0.6
          }}
        >
          <Statistic
            title={title}
            value={value}
            prefix={prefix}
            valueStyle={{ 
              color: hasData ? borderColor : '#d9d9d9',
              fontSize: '16px'
            }}
          />
          {description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {description}
            </Text>
          )}
          {children}
          {!hasData && (
            <Text type="secondary" style={{ fontSize: '10px', color: '#ff4d4f' }}>
              No data
            </Text>
          )}
        </Card>
      </Col>
    );

    return (
      <Card 
        title={
          <Space>
            <DollarOutlined />
            Financial Overview
            {loading && <Spin size="small" />}
            {!hasData && !loading && <Tag color="orange">No Data</Tag>}
          </Space>
        } 
        style={{ marginBottom: 24 }}
        loading={loading}
        extra={<Text type="secondary">{getShopNameForDisplay()}</Text>}
      >
        {!hasData && !loading && (
          <Alert
            message="No Transaction Data Available"
            description={
              <div>
                <p>No transactions found for the selected filters. This could be because:</p>
                <ul>
                  <li>No transactions have been created yet</li>
                  <li>The selected date range has no transactions</li>
                  <li>The selected shop has no transactions</li>
                  <li>All transactions are in "pending" status</li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={[16, 16]}>
          <StatCard title="Total Sales" value={safeStats.totalSales} borderColor="#1890ff" 
            description={`${safeStats.totalTransactions || 0} transactions`} />
          
          <StatCard title="Credit Sales" value={safeStats.creditSales} borderColor="#fa8c16"
            description={`${safeStats.creditSalesCount || 0} credit transactions`} />
          
          <StatCard title="Non-Credit Sales" value={safeStats.nonCreditSales} borderColor="#13c2c2"
            description="Paid immediately" />
          
          <StatCard title="Total Revenue" value={safeStats.totalRevenue} borderColor="#52c41a"
            description="From credit & non-credit sales" />
          
          <StatCard title="Expenses" value={safeStats.totalExpenses} borderColor="#cf1322"
            description="Total operational costs" />
          
          <StatCard title="Gross Profit" value={safeStats.grossProfit} borderColor="#389e0d"
            description="Revenue - Cost of Goods" />
          
          <StatCard title="Net Profit" value={safeStats.netProfit} borderColor="#722ed1"
            description="After all expenses" />
          
          <StatCard title="Cost of Goods Sold" value={safeStats.costOfGoodsSold} borderColor="#faad14"
            description="For credit & non-credit sales" />
          
          <StatCard title="Total Mpesa/Bank" value={safeStats.totalMpesaBank} borderColor="#08979c"
            description="Digital payments" />
          
          <StatCard title="Total Cash" value={safeStats.totalCash} borderColor="#d48806"
            description="Cash payments" />
          
          <StatCard title="Outstanding Credit" value={safeStats.outstandingCredit} borderColor="#c41d7f"
            description="Unpaid credit balance" />
          
          <StatCard title="Total Credit Given" value={safeStats.totalCreditGiven} borderColor="#eb2f96"
            description="Total credit extended" />
        </Row>

        {/* FINANCIAL SUMMARY SECTION PERMANENTLY REMOVED */}
      </Card>
    );
  };

  // Performance List Component
  const PerformanceList = ({ data, title, icon, loading, renderItem, emptyDescription }) => (
    <Card 
      title={
        <Space>
          {icon}
          {title}
          <Badge count={data.length} showZero color="#1890ff" />
        </Space>
      } 
      style={{ marginBottom: 24 }}
      loading={loading}
    >
      {data.length > 0 ? (
        <List dataSource={data} renderItem={renderItem} />
      ) : (
        <Empty description={emptyDescription} />
      )}
    </Card>
  );

  // Cashier Performance Component
  const CashierPerformance = () => {
    const renderCashierItem = (cashier, index) => (
      <List.Item>
        <List.Item.Meta
          avatar={
            <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#1890ff' : '#d9d9d9'}>
              <Avatar 
                style={{ 
                  backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9',
                  color: index < 3 ? '#fff' : '#000'
                }}
                icon={<UserOutlined />}
              >
                {cashier.name?.charAt(0)?.toUpperCase() || 'C'}
              </Avatar>
            </Badge>
          }
          title={
            <Space>
              <Text strong>{cashier.name}</Text>
              {index < 3 && <Tag color="gold">Top Performer</Tag>}
              <Tag color="blue">{cashier.transactions} transactions</Tag>
            </Space>
          }
          description={
            <Row gutter={[16, 8]} style={{ marginTop: 8, width: '100%' }}>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Total Revenue</Text>
                  <Text strong style={{ color: '#1890ff' }}>
                    {CalculationUtils.formatCurrency(cashier.revenue)}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Total Profit</Text>
                  <Text strong style={{ color: CalculationUtils.getProfitColor(cashier.profit) }}>
                    {CalculationUtils.formatCurrency(cashier.profit)}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Profit Margin</Text>
                  <Text strong style={{ color: '#3f8600' }}>
                    {cashier.profitMargin.toFixed(1)}%
                  </Text>
                </Space>
              </Col>
              
              <Col xs={24} sm={12}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Transaction Types:</Text>
                  <Space size={8} wrap>
                    <Tag color="green">Complete: {cashier.completeTransactions}</Tag>
                    <Tag color="orange">Credit: {cashier.creditTransactions}</Tag>
                  </Space>
                </Space>
              </Col>
            </Row>
          }
        />
      </List.Item>
    );

    return (
      <PerformanceList
        data={comprehensiveData.cashierPerformance || []}
        title="Cashier Performance"
        icon={<UserOutlined />}
        loading={loading}
        renderItem={renderCashierItem}
        emptyDescription="No cashier performance data available"
      />
    );
  };

  // Shop Performance Component
  const ShopPerformance = () => {
    const renderShopItem = (shop, index) => (
      <List.Item>
        <List.Item.Meta
          avatar={
            <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#1890ff' : '#d9d9d9'}>
              <Avatar 
                style={{ 
                  backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9',
                  color: index < 3 ? '#fff' : '#000'
                }}
              >
                {shop.name?.charAt(0)?.toUpperCase() || 'S'}
              </Avatar>
            </Badge>
          }
          title={
            <Space>
              <Text strong>{shop.name}</Text>
              {index < 3 && <Tag color="gold">Top Performer</Tag>}
            </Space>
          }
          description={
            <Row gutter={[16, 8]} style={{ marginTop: 8, width: '100%' }}>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Revenue</Text>
                  <Text strong style={{ color: '#1890ff' }}>
                    {CalculationUtils.formatCurrency(shop.revenue)}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Transactions</Text>
                  <Text strong>{shop.transactions}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Badge count={shop.completeSales} showZero size="small" color="green" />
                    <Text type="secondary" style={{ fontSize: '10px', marginLeft: 4 }}>Complete</Text>
                    <Badge count={shop.creditSales} showZero size="small" color="orange" style={{ marginLeft: 8 }} />
                    <Text type="secondary" style={{ fontSize: '10px', marginLeft: 4 }}>Credit</Text>
                  </div>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Profit Margin</Text>
                  <Text strong style={{ color: '#3f8600' }}>
                    {shop.profitMargin.toFixed(1)}%
                  </Text>
                </Space>
              </Col>
            </Row>
          }
        />
      </List.Item>
    );

    return (
      <PerformanceList
        data={comprehensiveData.shopPerformance || []}
        title="Shop Performance"
        icon={<ShopOutlined />}
        loading={loading}
        renderItem={renderShopItem}
        emptyDescription="No shop performance data available"
      />
    );
  };

  // Product Performance Component
  const ProductPerformance = () => {
    const renderProductItem = (product, index) => (
      <List.Item>
        <List.Item.Meta
          avatar={
            <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#1890ff' : '#d9d9d9'}>
              <Avatar 
                style={{ 
                  backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9',
                  color: index < 3 ? '#fff' : '#000'
                }}
              >
                {product.name?.charAt(0)?.toUpperCase() || 'P'}
              </Avatar>
            </Badge>
          }
          title={
            <Space>
              <Text strong style={{ maxWidth: 200 }} ellipsis={{ tooltip: product.name }}>
                {product.name}
              </Text>
              <Tag color="blue">{product.totalSold} units</Tag>
              {index < 3 && <Tag color="gold">Top Seller</Tag>}
            </Space>
          }
          description={
            <Row gutter={[16, 8]} style={{ marginTop: 8, width: '100%' }}>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Revenue</Text>
                  <Text strong style={{ color: '#1890ff' }}>
                    {CalculationUtils.formatCurrency(product.totalRevenue)}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Profit</Text>
                  <Text strong style={{ color: CalculationUtils.getProfitColor(product.totalProfit) }}>
                    {CalculationUtils.formatCurrency(product.totalProfit)}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Profit Margin</Text>
                  <Text strong style={{ color: '#3f8600' }}>
                    {product.profitMargin.toFixed(1)}%
                  </Text>
                </Space>
              </Col>
            </Row>
          }
        />
      </List.Item>
    );

    return (
      <PerformanceList
        data={comprehensiveData.topProducts || []}
        title="Top Performing Products"
        icon={<AppstoreOutlined />}
        loading={loading}
        renderItem={renderProductItem}
        emptyDescription="No product sales data available"
      />
    );
  };

  // Transaction Details Modal
  const TransactionDetailsModal = ({ transaction, visible, onCancel }) => {
    if (!transaction) return null;

    const getShopName = () => {
      if (transaction.shop && typeof transaction.shop === 'string') {
        return transaction.shop;
      }
      if (transaction.shop && typeof transaction.shop === 'object' && transaction.shop.name) {
        return transaction.shop.name;
      }
      if (transaction.shopId) {
        const foundShop = shops.find(s => s._id === transaction.shopId);
        return foundShop?.name || 'Unknown Shop';
      }
      return 'Unknown Shop';
    };

    const shopName = getShopName();
    const isCredit = transaction.paymentMethod === 'credit' || transaction.isCreditTransaction;
    const creditStatusConfig = CREDIT_STATUS_CONFIG[transaction.creditStatus] || CREDIT_STATUS_CONFIG.pending;
    const collectionRate = isCredit && transaction.totalAmount > 0 ? 
      (transaction.recognizedRevenue / transaction.totalAmount) * 100 : 0;

    return (
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Transaction Details
            <Tag color={transaction.status === 'completed' ? 'green' : 'orange'}>
              {transaction.status?.toUpperCase()}
            </Tag>
            {isCredit && (
              <Tag color={creditStatusConfig.color} icon={creditStatusConfig.icon}>
                CREDIT - {creditStatusConfig.text}
              </Tag>
            )}
          </Space>
        }
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="close" onClick={onCancel}>
            Close
          </Button>
        ]}
        width={700}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Transaction ID" span={2}>
            <Text code>{transaction.transactionNumber || transaction._id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Date & Time">
            {transaction.displayDate || dayjs(transaction.saleDate).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Customer">
            {transaction.customerName || 'Walk-in Customer'}
          </Descriptions.Item>
          <Descriptions.Item label="Shop">{shopName}</Descriptions.Item>
          <Descriptions.Item label="Cashier">
            {transaction.cashierName || 'Unknown Cashier'}
          </Descriptions.Item>
          <Descriptions.Item label="Transaction Type">
            <Tag color={isCredit ? 'orange' : 'green'}>
              {isCredit ? 'CREDIT SALE' : 'COMPLETE SALE'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Payment Method">
            <Tag color={PAYMENT_METHOD_CONFIG[transaction.paymentMethod]?.color || 'blue'}>
              {transaction.paymentMethod?.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
              {CalculationUtils.formatCurrency(transaction.totalAmount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Cost">
            <Text style={{ color: '#faad14' }}>
              {CalculationUtils.formatCurrency(transaction.cost || 0)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Profit">
            <Text strong style={{ color: CalculationUtils.getProfitColor(transaction.profit) }}>
              {CalculationUtils.formatCurrency(transaction.profit || 0)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Profit Margin">
            <Text strong style={{ color: '#3f8600' }}>
              {CalculationUtils.safeNumber(transaction.profitMargin, 0).toFixed(1)}%
            </Text>
          </Descriptions.Item>
          
          {isCredit && (
            <Descriptions.Item label="Credit Status" span={2}>
              <Space direction="vertical">
                <Tag color={creditStatusConfig.color} icon={creditStatusConfig.icon}>
                  {creditStatusConfig.text.toUpperCase()}
                </Tag>
                {transaction.outstandingRevenue > 0 && (
                  <Text type="danger">
                    Outstanding: {CalculationUtils.formatCurrency(transaction.outstandingRevenue)}
                  </Text>
                )}
                {transaction.recognizedRevenue > 0 && (
                  <Text type="success">
                    Collected: {CalculationUtils.formatCurrency(transaction.recognizedRevenue)}
                  </Text>
                )}
                {collectionRate > 0 && (
                  <Progress 
                    percent={Math.round(collectionRate)} 
                    size="small" 
                    status={collectionRate >= 100 ? 'success' : 'active'}
                    format={percent => `${percent}% Collected`}
                  />
                )}
              </Space>
            </Descriptions.Item>
          )}
          
          {transaction.items && transaction.items.length > 0 && (
            <Descriptions.Item label="Items" span={2}>
              <List
                size="small"
                dataSource={transaction.items}
                renderItem={(item, index) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${item.productName} (x${item.quantity})`}
                      description={
                        <Space>
                          <Text>Price: {CalculationUtils.formatCurrency(item.unitPrice)}</Text>
                          <Text>Total: {CalculationUtils.formatCurrency(item.totalPrice)}</Text>
                          {item.profit && (
                            <Text type="success">
                              Profit: {CalculationUtils.formatCurrency(item.profit)}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Descriptions.Item>
          )}
        </Descriptions>
      </Modal>
    );
  };

  // Overview Tab Content
  const renderOverviewTab = () => {
    return (
      <div>
        <FinancialOverview />
        
        <ShopPerformance />
        
        <CashierPerformance />
        
        <ProductPerformance />
      </div>
    );
  };

  // Filter Components
  const ShopFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong>Select Shop:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Filter by shop"
        allowClear
        loading={loading}
      >
        <Option value="all">All Shops</Option>
        {shops.map(shop => (
          <Option key={shop._id} value={shop._id}>
            {shop.name}
          </Option>
        ))}
      </Select>
    </div>
  );

  const TimeRangeFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong>Select Time Range:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Choose time range"
      >
        {TIME_RANGE_OPTIONS.map(option => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Select>
    </div>
  );

  const PaymentModeFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong>Payment Mode:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Filter by payment mode"
        allowClear
      >
        {PAYMENT_METHOD_OPTIONS.map(option => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Select>
    </div>
  );

  const TransactionTypeFilter = ({ value, onChange }) => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong>Transaction Type:</Text>
      </div>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
        placeholder="Filter by transaction type"
        allowClear
      >
        {TRANSACTION_TYPE_OPTIONS.map(option => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Select>
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2}>
          <DollarOutlined /> Transactions Report
          {currentUser?.role === 'cashier' && <Tag color="blue" style={{ marginLeft: 8 }}>My Transactions</Tag>}
        </Title>
        
        <Space>
          {/* Auto-refresh indicator - PERMANENTLY ENABLED */}
          <Tooltip title="Auto-refresh enabled (every 30 seconds)">
            <Badge dot status="processing" color="green">
              <Button 
                type="primary"
                icon={<DollarOutlined />}
                size="small"
                style={{ background: '#52c41a' }}
              >
                Auto Refresh
              </Button>
            </Badge>
          </Tooltip>
          
          {/* Quick Refresh button REMOVED */}
          
          <Button
            icon={<ExportOutlined />}
            onClick={handleExportData}
            loading={exportLoading}
          >
            Export
          </Button>
        </Space>
      </div>

      {/* Data Timestamp and Active Filters */}
      <Row style={{ marginBottom: 16 }} justify="space-between" align="middle">
        <Col>
          {dataTimestamp && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Last updated: {new Date(dataTimestamp).toLocaleString()}
              <Tag color="green" style={{ marginLeft: 8 }}>Auto-refresh ON</Tag>
            </Text>
          )}
        </Col>
        <Col>
          {(filters.dateRange || filters.shop !== 'all' || filters.paymentMethod || filters.transactionType) && (
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
              {filters.paymentMethod && (
                <Tag color="orange">
                  Payment: {filters.paymentMethod.toUpperCase()}
                </Tag>
              )}
              {filters.transactionType && (
                <Tag color="purple">
                  Type: {filters.transactionType.toUpperCase()}
                </Tag>
              )}
            </Space>
          )}
        </Col>
      </Row>

      {/* Filters Section - ALWAYS VISIBLE */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Input
              placeholder="Search transactions... (product name, customer, cashier, shop, transaction ID)"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          
          <Col xs={24} sm={12} md={6} lg={4}>
            <ShopFilter 
              value={filters.shop}
              onChange={(value) => handleFilterChange('shop', value)}
            />
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <TimeRangeFilter 
              value={filters.timeRange}
              onChange={(value) => handleFilterChange('timeRange', value)}
            />
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <PaymentModeFilter 
              value={filters.paymentMethod}
              onChange={(value) => handleFilterChange('paymentMethod', value)}
            />
          </Col>

          <Col xs={24} sm={12} md={6} lg={4}>
            <TransactionTypeFilter 
              value={filters.transactionType}
              onChange={(value) => handleFilterChange('transactionType', value)}
            />
          </Col>

          {filters.timeRange === 'custom' && (
            <Col xs={24} sm={24} md={8} lg={6}>
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Custom Date Range:</Text>
                </div>
                <RangePicker
                  onChange={(dates) => handleFilterChange('dateRange', dates)}
                  value={filters.dateRange}
                  style={{ width: '100%' }}
                  allowClear
                  placeholder={['Start Date', 'End Date']}
                />
              </div>
            </Col>
          )}

          <Col xs={24}>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={handleClearFilters}>
                Clear All Filters
              </Button>
            </div>
          </Col>
        </Row>

        {/* Active Filters Display */}
        <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: '#f0f8ff', borderRadius: 6 }}>
          <Text strong>Active Filters: </Text>
          <Tag color="blue" style={{ marginLeft: 8 }}>
            Shop: {getShopNameForDisplay()}
          </Tag>
          {filters.timeRange && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              Time Range: {TIME_RANGE_OPTIONS.find(opt => opt.value === filters.timeRange)?.label || filters.timeRange.toUpperCase()}
            </Tag>
          )}
          {filters.paymentMethod && (
            <Tag color="green" style={{ marginLeft: 8 }}>
              Payment Mode: {filters.paymentMethod.toUpperCase()}
            </Tag>
          )}
          {filters.transactionType && (
            <Tag color="purple" style={{ marginLeft: 8 }}>
              Transaction Type: {filters.transactionType.toUpperCase()}
            </Tag>
          )}
          {searchText && (
            <Tag color="orange" style={{ marginLeft: 8 }}>
              Search: "{searchText}"
            </Tag>
          )}
          <div style={{ marginTop: 8 }}>
            <Text strong>Transaction Counts: </Text>
            <Badge count={transactionTypeCounts.complete} showZero color="green" />
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>Complete</Text>
            <Badge count={transactionTypeCounts.credit} showZero color="orange" style={{ marginLeft: 8 }} />
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>Credit</Text>
            <Badge count={transactionTypeCounts.total} showZero color="blue" style={{ marginLeft: 8 }} />
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>Total</Text>
          </div>
        </div>
      </Card>

      {error && (
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {loading && !comprehensiveData.recentTransactions.length ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            Loading comprehensive transaction data with credit management integration...
          </div>
        </div>
      ) : (
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <PieChartOutlined />
                Comprehensive Overview
                <Badge count={comprehensiveData?.recentTransactions?.length || 0} overflowCount={999} style={{ marginLeft: 8 }} />
                {comprehensiveData?.financialStats?.creditSalesCount > 0 && (
                  <Badge count={comprehensiveData.financialStats.creditSalesCount} overflowCount={999} style={{ marginLeft: 4, backgroundColor: '#faad14' }} />
                )}
                {comprehensiveData?.financialStats?.completeTransactionsCount > 0 && (
                  <Badge count={comprehensiveData.financialStats.completeTransactionsCount} overflowCount={999} style={{ marginLeft: 4, backgroundColor: '#52c41a' }} />
                )}
              </span>
            } 
            key="overview"
          >
            {renderOverviewTab()}
          </TabPane>

          <TabPane 
            tab={
              <span>
                <TableOutlined />
                Detailed Transactions
                <Badge count={filteredTransactions.length} overflowCount={999} style={{ marginLeft: 8 }} />
                {transactionTypeCounts.credit > 0 && (
                  <Badge count={transactionTypeCounts.credit} overflowCount={999} style={{ marginLeft: 4, backgroundColor: '#faad14' }} />
                )}
                {transactionTypeCounts.complete > 0 && (
                  <Badge count={transactionTypeCounts.complete} overflowCount={999} style={{ marginLeft: 4, backgroundColor: '#52c41a' }} />
                )}
              </span>
            } 
            key="details"
          >
            <Card>
              <div style={{ marginBottom: 16 }}>
                <Text strong>
                  Showing {filteredTransactions.length} of {comprehensiveData?.recentTransactions?.length || 0} transactions
                  {filters.shop !== 'all' && (
                    <Text type="secondary"> for {getShopNameForDisplay()}</Text>
                  )}
                  {comprehensiveData?.financialStats && (
                    <Text type="secondary">
                      {' '}• Total Revenue: {CalculationUtils.formatCurrency(comprehensiveData.financialStats.totalRevenue)} • 
                      Net Profit: {CalculationUtils.formatCurrency(comprehensiveData.financialStats.netProfit)} • 
                      Items Sold: {comprehensiveData.financialStats.totalItemsSold}
                      {comprehensiveData.financialStats.creditSalesCount > 0 && (
                        <span> • Credit Sales: {comprehensiveData.financialStats.creditSalesCount}</span>
                      )}
                      {comprehensiveData.financialStats.completeTransactionsCount > 0 && (
                        <span> • Complete Sales: {comprehensiveData.financialStats.completeTransactionsCount}</span>
                      )}
                    </Text>
                  )}
                </Text>
              </div>
              <Table
                columns={columns}
                dataSource={filteredTransactions}
                rowKey={(record) => record._id || record.transactionNumber || Math.random()}
                loading={loading}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} transactions (${transactionTypeCounts.complete} complete, ${transactionTypeCounts.credit} credit)`
                }}
                scroll={{ x: 2000 }}
                locale={{ 
                  emptyText: filteredTransactions.length === 0 && comprehensiveData?.recentTransactions?.length > 0 ? 
                    'No transactions match your search' : 
                    'No transactions found'
                }}
              />
            </Card>
          </TabPane>
        </Tabs>
      )}

      <TransactionDetailsModal
        transaction={selectedTransaction}
        visible={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
      />
    </div>
  );
};

export default TransactionsReport;
// src/pages/Cashier/CashierDashboard.jsx - FULLY UPDATED
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout, Card, Row, Col, Statistic, Typography, Tag,
  Space, Button, Table, DatePicker, Spin, Alert,
  Divider, List, Avatar, Tabs, Input, Select, Badge,
  Modal, Form, InputNumber, Tooltip, Popconfirm, QRCode,
  FloatButton, notification, Empty, message, Descriptions
} from 'antd';
import {
  ShopOutlined, UserOutlined, DollarOutlined,
  ShoppingCartOutlined, LogoutOutlined, ReloadOutlined,
  ArrowLeftOutlined, BarChartOutlined, TransactionOutlined,
  SearchOutlined, PlusOutlined, BarcodeOutlined,
  CalculatorOutlined, DeleteOutlined, ScanOutlined,
  PrinterOutlined, SafetyCertificateOutlined, QrcodeOutlined,
  ClearOutlined, ExclamationCircleOutlined, HistoryOutlined,
  ShoppingOutlined, TeamOutlined, CreditCardOutlined,
  PhoneOutlined, CalendarOutlined, BankOutlined,
  MoneyCollectOutlined, LineChartOutlined, PieChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI, transactionAPI, productAPI, shopAPI, creditAPI } from '../../services/api';
import Cart from './Cart';
import ReceiptTemplate from '../../components/ReceiptTemplate';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;
const { Search } = Input;

// Enhanced Calculation Utilities for Cashier Dashboard
const CashierCalculationUtils = {
  // Safe number handling
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  // Currency formatting
  formatCurrency: (amount) => {
    const value = CashierCalculationUtils.safeNumber(amount);
    return `KES ${value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  },

  // Calculate cart totals
  calculateCartTotals: (cart) => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      subtotal,
      totalItems,
      grandTotal: subtotal,
      averageItemPrice: totalItems > 0 ? subtotal / totalItems : 0
    };
  },

  // Enhanced sales analysis
  analyzeDailySales: (transactions, cashierId, shopId, dateRange) => {
    if (!transactions || !Array.isArray(transactions)) {
      return getDefaultCashierStats();
    }

    // Filter transactions for this cashier and shop
    const filteredTransactions = transactions.filter(transaction => {
      const matchesCashier = transaction.cashierId === cashierId || transaction.cashierName === cashierId;
      const matchesShop = transaction.shop === shopId || transaction.shopId === shopId;
      const matchesDateRange = !dateRange || (
        dayjs(transaction.saleDate).isAfter(dateRange[0]) && 
        dayjs(transaction.saleDate).isBefore(dateRange[1])
      );
      
      return matchesCashier && matchesShop && matchesDateRange;
    });

    // Calculate comprehensive statistics
    const totalSales = filteredTransactions.reduce((sum, t) => sum + CashierCalculationUtils.safeNumber(t.totalAmount), 0);
    const totalTransactions = filteredTransactions.length;
    const totalItems = filteredTransactions.reduce((sum, t) => sum + CashierCalculationUtils.safeNumber(t.itemsCount), 0);
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Payment method analysis
    const paymentMethodBreakdown = {
      cash: 0,
      bank_mpesa: 0,
      credit: 0,
      cash_bank_mpesa: 0
    };

    let cashAmount = 0;
    let bankMpesaAmount = 0;
    let creditAmount = 0;
    let cashierItemsSold = 0;

    filteredTransactions.forEach(transaction => {
      const method = transaction.paymentMethod?.toLowerCase() || 'cash';
      const amount = transaction.totalAmount || 0;
      const itemsCount = transaction.itemsCount || 0;
      
      cashierItemsSold += itemsCount;
      
      if (paymentMethodBreakdown.hasOwnProperty(method)) {
        paymentMethodBreakdown[method] += amount;
      } else {
        paymentMethodBreakdown.cash += amount;
      }

      // Enhanced money classification
      if (method === 'cash') {
        cashAmount += amount;
      } else if (method === 'cash_bank_mpesa') {
        cashAmount += transaction.cashAmount || 0;
        bankMpesaAmount += transaction.bankMpesaAmount || (amount - (transaction.cashAmount || 0));
      } else if (method === 'credit') {
        creditAmount += transaction.amountPaid || amount;
      } else {
        bankMpesaAmount += amount;
      }
    });

    // Performance metrics
    const performanceMetrics = {
      salesEfficiency: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      itemsPerTransaction: totalTransactions > 0 ? totalItems / totalTransactions : 0,
      revenuePerItem: totalItems > 0 ? totalSales / totalItems : 0
    };

    // Time-based analysis
    const hourlyAnalysis = CashierCalculationUtils.analyzeHourlySales(filteredTransactions);
    const peakHours = CashierCalculationUtils.findPeakHours(hourlyAnalysis);

    return {
      // Basic metrics
      totalSales,
      totalTransactions,
      totalItems,
      averageTransaction,
      
      // Money collection
      cashAmount,
      bankMpesaAmount,
      creditAmount,
      cashierItemsSold,
      
      // Payment breakdown
      paymentMethodBreakdown,
      
      // Performance metrics
      performanceMetrics,
      
      // Time analysis
      hourlyAnalysis,
      peakHours,
      
      // Additional insights
      lastTransactionTime: filteredTransactions.length > 0 
        ? filteredTransactions.reduce((latest, current) => 
            new Date(current.saleDate || current.createdAt) > new Date(latest.saleDate || latest.createdAt) ? current : latest
          ).saleDate
        : null,
      
      timestamp: new Date().toISOString()
    };
  },

  // Analyze sales by hour
  analyzeHourlySales: (transactions) => {
    const hourlyData = {};
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour] = {
        hour,
        sales: 0,
        transactions: 0,
        items: 0
      };
    }

    transactions.forEach(transaction => {
      const hour = dayjs(transaction.saleDate).hour();
      hourlyData[hour].sales += transaction.totalAmount || 0;
      hourlyData[hour].transactions += 1;
      hourlyData[hour].items += transaction.itemsCount || 0;
    });

    return Object.values(hourlyData);
  },

  // Find peak performance hours
  findPeakHours: (hourlyAnalysis) => {
    if (!hourlyAnalysis.length) return [];
    
    const sortedBySales = [...hourlyAnalysis].sort((a, b) => b.sales - a.sales);
    return sortedBySales.slice(0, 3).map(hour => ({
      hour: hour.hour,
      sales: hour.sales,
      period: `${hour.hour}:00 - ${hour.hour + 1}:00`
    }));
  },

  // Product performance analysis for cashier
  analyzeProductPerformance: (transactions, cashierId) => {
    const productSales = {};
    
    transactions.forEach(transaction => {
      if (transaction.cashierId !== cashierId && transaction.cashierName !== cashierId) return;
      
      transaction.items?.forEach(item => {
        const productId = item.productId || item.productName;
        if (!productSales[productId]) {
          productSales[productId] = {
            productId,
            productName: item.productName,
            quantity: 0,
            revenue: 0,
            transactions: 0
          };
        }
        
        productSales[productId].quantity += item.quantity || 1;
        productSales[productId].revenue += item.totalPrice || 0;
        productSales[productId].transactions += 1;
      });
    });

    return Object.values(productSales)
      .map(product => ({
        ...product,
        averageQuantity: product.transactions > 0 ? product.quantity / product.transactions : 0,
        revenuePerUnit: product.quantity > 0 ? product.revenue / product.quantity : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  },

  // Credit sales analysis
  analyzeCreditSales: (credits, cashierId) => {
    if (!credits || !Array.isArray(credits)) return [];
    
    return credits
      .filter(credit => credit.cashierId === cashierId || credit.cashierName === cashierId)
      .map(credit => ({
        ...credit,
        daysUntilDue: credit.dueDate ? dayjs(credit.dueDate).diff(dayjs(), 'day') : null,
        isOverdue: credit.dueDate ? dayjs(credit.dueDate).isBefore(dayjs()) && credit.balanceDue > 0 : false
      }));
  }
};

// Default stats for initialization
const getDefaultCashierStats = () => ({
  totalSales: 0,
  totalTransactions: 0,
  totalItems: 0,
  averageTransaction: 0,
  cashAmount: 0,
  bankMpesaAmount: 0,
  creditAmount: 0,
  cashierItemsSold: 0,
  paymentMethodBreakdown: {
    cash: 0,
    bank_mpesa: 0,
    credit: 0,
    cash_bank_mpesa: 0
  },
  performanceMetrics: {
    salesEfficiency: 0,
    itemsPerTransaction: 0,
    revenuePerItem: 0
  },
  hourlyAnalysis: [],
  peakHours: [],
  productPerformance: [],
  creditAnalysis: []
});

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [cashier, setCashier] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [activeTab, setActiveTab] = useState('pos');

  // Enhanced Dashboard States with Analysis
  const [dailyStats, setDailyStats] = useState(getDefaultCashierStats());
  const [transactions, setTransactions] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('day'),
    dayjs().endOf('day')
  ]);

  // Enhanced POS States
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [posLoading, setPosLoading] = useState({
    products: false,
    checkout: false,
    stats: false,
    analysis: false
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [availableShops, setAvailableShops] = useState([]);

  // Enhanced Payment Modal States
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentForm] = Form.useForm();
  const [creditForm] = Form.useForm();

  // Enhanced Cash/Bank-Mpesa Payment State
  const [cashBankMpesaSplit, setCashBankMpesaSplit] = useState({
    cashAmount: 0,
    bankMpesaAmount: 0,
    totalAmount: 0
  });

  // Enhanced Credit Payment State
  const [creditPaymentData, setCreditPaymentData] = useState({
    amountPaid: 0,
    balance: 0,
    customerName: '',
    customerPhone: '',
    dueDate: null
  });

  // Enhanced Analysis States
  const [productPerformance, setProductPerformance] = useState([]);
  const [hourlyAnalysis, setHourlyAnalysis] = useState([]);
  const [creditAnalysis, setCreditAnalysis] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    salesEfficiency: 0,
    itemsPerTransaction: 0,
    revenuePerItem: 0
  });

  // Company information
  const companyInfo = useMemo(() => ({
    name: "STANZO SHOP",
    address: "Mikinduri, Kenya",
    phone: "+254 746919850",
    email: "stanzokinyua5967@gmail.com",
    slogan: "Quality Products, Best Prices"
  }), []);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = () => {
      const cashierData = JSON.parse(localStorage.getItem('cashierData'));
      
      if (!cashierData) {
        navigate('/cashier/login');
        return;
      }
      
      setCashier(cashierData);
      
      // Get selected shop from localStorage
      if (cashierData.lastShop) {
        setSelectedShop({
          _id: cashierData.lastShop,
          name: cashierData.shopName || 'Selected Shop'
        });
      } else {
        navigate('/cashier/shops');
        return;
      }
      
      setDashboardLoading(false);
    };

    initializeDashboard();
  }, [navigate]);

  // Validate shop and cashier data
  const validateShopAndCashier = useCallback(() => {
    if (!selectedShop || !selectedShop._id) {
      console.error('❌ Shop data is invalid:', selectedShop);
      message.error('Please select a shop to continue.');
      return false;
    }
    
    if (!cashier || !cashier._id) {
      console.error('❌ Cashier data is invalid:', cashier);
      message.error('Cashier information is missing. Please log in again.');
      return false;
    }
    
    return true;
  }, [selectedShop, cashier]);

  // Fetch available shops for cashier
  const fetchAvailableShops = useCallback(async () => {
    try {
      const response = await shopAPI.getAll();
      const shopsData = response.data || response;
      setAvailableShops(Array.isArray(shopsData) ? shopsData : []);
    } catch (error) {
      console.error('Error fetching shops:', error);
      message.error('Failed to load shops');
    }
  }, []);

  // ENHANCED: Fetch and analyze cashier's detailed daily sales stats
  const fetchCashierDailyStats = useCallback(async () => {
    if (!cashier?._id || !selectedShop?._id) return;

    setPosLoading(prev => ({ ...prev, stats: true }));
    
    try {
      const today = dayjs().startOf('day').toISOString();
      const now = dayjs().toISOString();
      
      // Try to get stats from backend aggregation first
      const backendStats = await transactionAPI.getCashierDailyStats({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now
      });
      
      if (backendStats && backendStats.todaySales !== undefined) {
        // Use backend calculated stats
        console.log('✅ Using backend aggregated cashier stats');
        setDailyStats(backendStats);
      } else {
        // Enhanced frontend calculation with analysis
        console.log('🔄 Using enhanced frontend calculation for cashier stats');
        
        const response = await transactionAPI.getAll({
          cashierId: cashier._id,
          shopId: selectedShop._id,
          startDate: today,
          endDate: now,
          status: 'completed'
        });
        
        const transactions = Array.isArray(response) ? response : [];
        
        // Enhanced analysis using calculation utilities
        const analyzedStats = CashierCalculationUtils.analyzeDailySales(
          transactions, 
          cashier._id, 
          selectedShop._id, 
          [dayjs(today), dayjs(now)]
        );

        setDailyStats(analyzedStats);
        
        // Additional analysis
        const productPerformance = CashierCalculationUtils.analyzeProductPerformance(transactions, cashier._id);
        setProductPerformance(productPerformance);
        
        setPerformanceMetrics(analyzedStats.performanceMetrics);
        setHourlyAnalysis(analyzedStats.hourlyAnalysis);
      }

    } catch (error) {
      console.error('❌ Error fetching cashier daily stats:', error);
    } finally {
      setPosLoading(prev => ({ ...prev, stats: false }));
    }
  }, [cashier, selectedShop]);

  // ENHANCED: Fetch and analyze daily sales for dashboard
  const fetchDailySales = async () => {
    if (!cashier?._id || !selectedShop?._id) return;
    
    setStatsLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      
      // Try to get stats from backend aggregation first
      const backendStats = await transactionAPI.getDailySalesStats({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (backendStats && backendStats.totalSales !== undefined) {
        // Use backend calculated stats
        console.log('✅ Using backend aggregated daily sales stats');
        setDailyStats(backendStats);
        
        // Fetch transactions for enhanced analysis
        const response = await transactionAPI.getAll({
          cashierId: cashier._id,
          shopId: selectedShop._id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: 'completed'
        });
        
        const transactionsData = Array.isArray(response) ? response : [];
        setTransactions(transactionsData);
        
        // Perform enhanced analysis
        performEnhancedAnalysis(transactionsData);
      } else {
        // Enhanced frontend calculation with analysis
        console.log('🔄 Using enhanced frontend calculation for daily sales');
        
        const response = await transactionAPI.getAll({
          cashierId: cashier._id,
          shopId: selectedShop._id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: 'completed'
        });
        
        const transactionsData = Array.isArray(response) ? response : [];
        setTransactions(transactionsData);
        
        // Enhanced analysis
        const analyzedStats = CashierCalculationUtils.analyzeDailySales(
          transactionsData, 
          cashier._id, 
          selectedShop._id, 
          dateRange
        );
        
        setDailyStats(analyzedStats);
        performEnhancedAnalysis(transactionsData);
      }
    } catch (error) {
      console.error('Error fetching daily sales:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // NEW: Perform enhanced analysis on transactions data
  const performEnhancedAnalysis = (transactionsData) => {
    if (!transactionsData.length) return;
    
    // Product performance analysis
    const productPerformance = CashierCalculationUtils.analyzeProductPerformance(transactionsData, cashier._id);
    setProductPerformance(productPerformance);
    
    // Hourly analysis
    const hourlyAnalysis = CashierCalculationUtils.analyzeHourlySales(transactionsData);
    setHourlyAnalysis(hourlyAnalysis);
    
    // Performance metrics
    const totalSales = transactionsData.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalTransactions = transactionsData.length;
    const totalItems = transactionsData.reduce((sum, t) => sum + (t.itemsCount || 0), 0);
    
    setPerformanceMetrics({
      salesEfficiency: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      itemsPerTransaction: totalTransactions > 0 ? totalItems / totalTransactions : 0,
      revenuePerItem: totalItems > 0 ? totalSales / totalItems : 0
    });
    
    // Fetch and analyze credit data
    fetchCreditAnalysis();
  };

  // NEW: Fetch and analyze credit data
  const fetchCreditAnalysis = async () => {
    try {
      const creditsData = await creditAPI.getAll({
        cashierId: cashier._id,
        shopId: selectedShop._id
      });
      
      const analyzedCredits = CashierCalculationUtils.analyzeCreditSales(creditsData, cashier._id);
      setCreditAnalysis(analyzedCredits);
    } catch (error) {
      console.error('Error fetching credit analysis:', error);
    }
  };

  // Fetch products for POS
  const fetchProducts = async (showMessage = false) => {
    if (!validateShopAndCashier()) return;
    
    setPosLoading(prev => ({ ...prev, products: true }));
    
    try {
      console.log('🛍️ Fetching products for shop:', selectedShop._id);
      const response = await productAPI.getAll();
      const productsData = response.data || response;
      
      const shopProducts = Array.isArray(productsData) 
        ? productsData.filter(product => {
            const productShopId = product.shop?._id || product.shop || product.shopId;
            return productShopId === selectedShop._id && product.isActive !== false;
          })
        : [];

      setProducts(shopProducts);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(shopProducts
        .map(p => p.category)
        .filter(Boolean)
        .sort()
      )];
      setCategories(uniqueCategories);

      // Enhanced low stock analysis
      const lowStock = shopProducts.filter(product => 
        product.currentStock > 0 && product.currentStock <= (product.minStockLevel || 5)
      );
      setLowStockProducts(lowStock);

      if (showMessage) {
        if (shopProducts.length === 0) {
          message.warning(`No products found for ${selectedShop?.name}. Please add products first.`);
        } else {
          message.success(`Loaded ${shopProducts.length} products for ${selectedShop?.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      notification.error({
        message: 'Failed to Load Products',
        description: 'Please check your connection and try again.',
        duration: 3,
      });
    } finally {
      setPosLoading(prev => ({ ...prev, products: false }));
    }
  };

  // Filter products for POS
  const filteredProductsMemo = useMemo(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    return filtered;
  }, [products, searchTerm, selectedCategory]);

  // Update filtered products when memo changes
  useEffect(() => {
    setFilteredProducts(filteredProductsMemo);
  }, [filteredProductsMemo]);

  // Enhanced cart calculations
  const totals = useMemo(() => {
    return CashierCalculationUtils.calculateCartTotals(cart);
  }, [cart]);

  // Enhanced Payment Method Selection
  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
    
    if (method === 'cash_bank_mpesa') {
      setCashBankMpesaSplit({
        cashAmount: 0,
        bankMpesaAmount: 0,
        totalAmount: totals.subtotal
      });
      paymentForm.setFieldsValue({
        cashAmount: 0,
        bankMpesaAmount: 0
      });
    } else if (method === 'credit') {
      setCreditPaymentData({
        amountPaid: 0,
        balance: totals.subtotal,
        customerName: '',
        customerPhone: '',
        dueDate: dayjs().add(7, 'day')
      });
      creditForm.setFieldsValue({
        amountPaid: 0,
        balance: totals.subtotal,
        customerName: '',
        customerPhone: '',
        dueDate: dayjs().add(7, 'day')
      });
    }
    
    setPaymentModalVisible(true);
  };

  // Enhanced Cash/Bank-Mpesa Split Changes
  const handleCashBankMpesaChange = (changedValues, allValues) => {
    const cashAmount = parseFloat(allValues.cashAmount || 0);
    const bankMpesaAmount = parseFloat(allValues.bankMpesaAmount || 0);
    const total = cashAmount + bankMpesaAmount;
    
    setCashBankMpesaSplit({
      cashAmount,
      bankMpesaAmount,
      totalAmount: total
    });
  };

  // Enhanced Credit Payment Changes
  const handleCreditPaymentChange = (changedValues, allValues) => {
    const amountPaid = parseFloat(allValues.amountPaid || 0);
    const totalAmount = totals.subtotal;
    const balance = totalAmount - amountPaid;
    
    setCreditPaymentData(prev => ({
      ...prev,
      amountPaid,
      balance: Math.max(0, balance)
    }));
  };

  // Enhanced Payment Validation
  const validateCashBankMpesaPayment = () => {
    const { cashAmount, bankMpesaAmount, totalAmount } = cashBankMpesaSplit;
    
    if (totalAmount.toFixed(2) !== totals.subtotal.toFixed(2)) {
      message.error(`The sum of Cash and Bank/Mpesa (KES ${totalAmount.toLocaleString()}) must equal the total amount (KES ${totals.subtotal.toLocaleString()})`);
      return false;
    }
    
    if (cashAmount < 0 || bankMpesaAmount < 0) {
      message.error('Cash and Bank/Mpesa amounts cannot be negative');
      return false;
    }
    
    return true;
  };

  const validateCreditPayment = async () => {
    try {
      const values = await creditForm.validateFields();
      
      if (values.amountPaid < 0) {
        message.error('Amount paid cannot be negative');
        return false;
      }
      
      if (values.amountPaid > totals.subtotal) {
        message.error('Amount paid cannot exceed total amount');
        return false;
      }
      
      if (values.balance < 0) {
        message.error('Balance cannot be negative');
        return false;
      }
      
      return true;
    } catch (error) {
      message.error('Please fill all required fields correctly');
      return false;
    }
  };

  // Enhanced Process Payment
  const processPayment = async () => {
    if (selectedPaymentMethod === 'cash_bank_mpesa') {
      if (!validateCashBankMpesaPayment()) return;
      
      await handleCheckout('cash_bank_mpesa', {
        cashAmount: cashBankMpesaSplit.cashAmount,
        bankMpesaAmount: cashBankMpesaSplit.bankMpesaAmount
      });
      
    } else if (selectedPaymentMethod === 'credit') {
      if (!await validateCreditPayment()) return;
      
      const values = creditForm.getFieldsValue();
      
      await handleCheckout('credit', {
        amountPaid: values.amountPaid,
        balance: values.balance,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        dueDate: values.dueDate
      });
      
    } else {
      await handleCheckout(selectedPaymentMethod);
    }
    
    setPaymentModalVisible(false);
    setSelectedPaymentMethod(null);
  };

  // Enhanced Checkout with Analysis
  const handleCheckout = async (paymentMethod, paymentDetails = {}) => {
    if (!validateShopAndCashier()) return;

    if (cart.length === 0) {
      Modal.error({
        title: 'Empty Cart',
        content: 'Please add items to cart before checkout.',
      });
      return;
    }

    // Enhanced stock validation
    const stockValidation = cart.every(item => {
      const product = products.find(p => p._id === item.productId);
      return product && (product.currentStock || 0) >= item.quantity;
    });

    if (!stockValidation) {
      Modal.error({
        title: 'Stock Issue',
        content: 'Some products in your cart are no longer available in sufficient quantity. Please refresh and try again.',
      });
      await fetchProducts();
      return;
    }

    setPosLoading(prev => ({ ...prev, checkout: true }));
    
    try {
      const generateTransactionNumber = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `TXN-${timestamp}-${random}`.toUpperCase();
      };

      // Enhanced transaction data
      const transactionData = {
        shop: selectedShop._id,
        shopName: selectedShop.name,
        cashierId: cashier._id,
        cashierName: cashier.name || 'Cashier',
        customerName: paymentDetails.customerName?.trim() || 'Walk-in Customer',
        customerPhone: paymentDetails.customerPhone || '',
        transactionNumber: generateTransactionNumber(),
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          totalPrice: Number(item.price * item.quantity),
          barcode: item.barcode
        })),
        totalAmount: Number(totals.subtotal),
        paymentMethod: paymentMethod,
        status: 'completed',
        itemsCount: Number(totals.totalItems),
        saleDate: new Date().toISOString(),
        receiptNumber: `RCP-${Date.now()}`
      };

      // Enhanced payment data
      if (paymentMethod === 'cash_bank_mpesa') {
        transactionData.cashAmount = paymentDetails.cashAmount;
        transactionData.bankMpesaAmount = paymentDetails.bankMpesaAmount;
        transactionData.paymentSplit = {
          cash: paymentDetails.cashAmount,
          bank_mpesa: paymentDetails.bankMpesaAmount
        };
      } else if (paymentMethod === 'credit') {
        transactionData.amountPaid = paymentDetails.amountPaid;
        transactionData.balanceDue = paymentDetails.balance;
        transactionData.dueDate = paymentDetails.dueDate;
        transactionData.creditStatus = paymentDetails.balance > 0 ? 'pending' : 'paid';
        transactionData.status = paymentDetails.balance > 0 ? 'credit' : 'completed';
      }

      console.log('💰 Sending enhanced transaction data:', transactionData);

      // Update product stock
      await updateProductStock(cart);

      // Create transaction
      const response = await transactionAPI.create(transactionData);
      const transactionResult = response?.data || response;
      
      if (transactionResult && transactionResult._id) {
        // Enhanced credit record creation
        if (paymentMethod === 'credit' && paymentDetails.balance > 0) {
          try {
            const creditRecord = {
              transactionId: transactionResult._id,
              customerName: paymentDetails.customerName,
              customerPhone: paymentDetails.customerPhone,
              totalAmount: totals.subtotal,
              amountPaid: paymentDetails.amountPaid,
              balanceDue: paymentDetails.balance,
              dueDate: paymentDetails.dueDate,
              shopId: selectedShop._id,
              cashierId: cashier._id,
              cashierName: cashier.name,
              status: 'pending'
            };
            
            await creditAPI.create(creditRecord);
            console.log('✅ Enhanced credit record created');
          } catch (creditError) {
            console.error('❌ Error creating credit record:', creditError);
          }
        }
        
        setCurrentTransaction(transactionResult);
        setShowReceipt(true);
        
        // Enhanced stats update
        await fetchCashierDailyStats();
        await fetchDailySales();
        
        notification.success({
          message: 'Transaction Completed',
          description: `Sale completed successfully for ${selectedShop?.name}. Total: KES ${totals.subtotal.toLocaleString()}`,
          duration: 3,
        });

        setCart([]);
        
      } else {
        throw new Error('Transaction failed: Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Enhanced checkout error:', error);
      
      let errorMessage = 'Failed to process transaction. Please try again.';
      
      if (error.message.includes('stock')) {
        errorMessage = `Stock error: ${error.message}`;
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      notification.error({
        message: 'Checkout Failed',
        description: errorMessage,
        duration: 5,
      });

      await fetchProducts();
    } finally {
      setPosLoading(prev => ({ ...prev, checkout: false }));
    }
  };

  // Enhanced Product Stock Update
  const updateProductStock = async (cartItems) => {
    console.log('🔄 Starting enhanced stock update for cart items:', cartItems);
    
    try {
      setProducts(prevProducts => 
        prevProducts.map(product => {
          const cartItem = cartItems.find(item => item.productId === product._id);
          if (cartItem) {
            const newStock = Math.max(0, (product.currentStock || 0) - cartItem.quantity);
            console.log(`📦 Updating ${product.name} stock locally: ${product.currentStock} -> ${newStock}`);
            return { ...product, currentStock: newStock };
          }
          return product;
        })
      );

      const updatePromises = cartItems.map(async (cartItem) => {
        try {
          const product = products.find(p => p._id === cartItem.productId);
          if (product) {
            const newStock = Math.max(0, (product.currentStock || 0) - cartItem.quantity);
            
            await productAPI.update(product._id, {
              currentStock: newStock,
              lastStockUpdate: new Date().toISOString()
            });
            
            console.log(`✅ Stock updated via API for ${product.name}: ${newStock}`);
          }
        } catch (error) {
          console.error(`❌ Failed to update stock for product ${cartItem.productId}:`, error);
          throw error;
        }
      });

      await Promise.all(updatePromises);

      setLowStockProducts(prev => 
        prev.filter(product => 
          product.currentStock > 0 && product.currentStock <= (product.minStockLevel || 5)
        )
      );

      console.log('✅ Enhanced product stock update completed');
    } catch (error) {
      console.error('❌ Error in enhanced stock update:', error);
      throw new Error('Failed to update product stock. Please try again.');
    }
  };

  // Enhanced POS Functions
  const addToCart = (product, quantity = 1, customPrice = null) => {
    if (!product._id) {
      console.error('❌ Cannot add product to cart: product ID is missing', product);
      message.error('Cannot add product to cart. Product data is invalid.');
      return;
    }

    const currentStock = product.currentStock || 0;
    
    if (currentStock <= 0) {
      message.warning(`${product.name} is out of stock.`);
      return;
    }

    if (quantity > currentStock) {
      message.warning(`Only ${currentStock} items available in stock for ${product.name}.`);
      quantity = currentStock;
    }

    const finalPrice = customPrice && customPrice >= (product.minSellingPrice || product.sellingPrice || 0) 
      ? customPrice 
      : (product.minSellingPrice || product.sellingPrice || 0);

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product._id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > currentStock) {
          message.warning(`Only ${currentStock} items available in stock for ${product.name}.`);
          return prevCart.map(item =>
            item.productId === product._id
              ? { ...item, quantity: currentStock }
              : item
          );
        }
        
        return prevCart.map(item =>
          item.productId === product._id
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        return [...prevCart, {
          productId: product._id,
          name: product.name,
          price: finalPrice,
          originalPrice: product.minSellingPrice || product.sellingPrice || 0,
          quantity: quantity,
          stock: currentStock,
          category: product.category,
          barcode: product.barcode,
          product
        }];
      }
    });

    if (scanMode) {
      setBarcodeInput('');
    }
  };

  const updateCartItemPrice = (productId, newPrice) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    const originalPrice = product.minSellingPrice || product.sellingPrice || 0;
    
    if (newPrice < originalPrice) {
      message.error(`New price (KES ${newPrice}) cannot be lower than original price (KES ${originalPrice})`);
      return;
    }

    if (newPrice <= 0) {
      message.error('Price must be greater than 0');
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { ...item, price: newPrice }
          : item
      )
    );

    message.success('Price updated successfully');
  };

  const handleBarcodeScan = useCallback(() => {
    if (!barcodeInput.trim()) return;

    const product = products.find(p => 
      p.barcode && p.barcode.toString() === barcodeInput.toString().trim()
    );

    if (product) {
      addToCart(product, 1);
      message.success(`Scanned: ${product.name}`);
    } else {
      message.error('Product not found with this barcode');
    }
  }, [barcodeInput, products]);

  const updateCartItem = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p._id === productId);
    if (product && quantity > product.currentStock) {
      message.warning(`Only ${product.currentStock} items available in stock.`);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    
    Modal.confirm({
      title: 'Clear Cart',
      content: 'Are you sure you want to clear all items from the cart?',
      okText: 'Yes, Clear',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk() {
        setCart([]);
        message.success('Cart cleared');
      }
    });
  };

  const handlePrintReceipt = () => {
    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${currentTransaction?.receiptNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div id="receipt-content"></div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 1000);
              };
            </script>
          </body>
        </html>
      `);
      
      const receiptContent = document.getElementById('receipt-print-content');
      if (receiptContent) {
        receiptWindow.document.getElementById('receipt-content').innerHTML = receiptContent.innerHTML;
      }
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setCurrentTransaction(null);
  };

  const formatCurrency = (amount) => {
    return CashierCalculationUtils.formatCurrency(amount);
  };

  const handleShopChange = (shopId) => {
    const newShop = availableShops.find(shop => shop._id === shopId);
    if (newShop) {
      setSelectedShop(newShop);
      setCart([]);
      message.success(`Switched to ${newShop.name}`);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/cashier/login');
  };

  const handleBackToShops = () => {
    navigate('/cashier/shops');
  };

  // ENHANCED: Dashboard columns with analysis
  const dashboardColumns = [
    {
      title: 'Transaction ID',
      dataIndex: 'transactionNumber',
      key: 'transactionNumber',
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Shop',
      dataIndex: 'shopName',
      key: 'shopName',
      render: (shopName, record) => (
        <Tag color="blue" icon={<ShopOutlined />}>
          {shopName || record.shop?.name || selectedShop?.name || 'Unknown Shop'}
        </Tag>
      )
    },
    {
      title: 'Time',
      dataIndex: 'saleDate',
      key: 'saleDate',
      render: (date) => dayjs(date).format('HH:mm:ss')
    },
    {
      title: 'Items',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      align: 'center'
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => formatCurrency(amount)
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => {
        const methodColors = {
          cash: 'green',
          bank_mpesa: 'blue',
          cash_bank_mpesa: 'purple',
          credit: 'red'
        };
        
        const methodLabels = {
          cash: 'CASH',
          bank_mpesa: 'BANK/MPESA',
          cash_bank_mpesa: 'CASH/BANK/MPESA',
          credit: 'CREDIT'
        };
        
        return (
          <Tag color={methodColors[method] || 'default'}>
            {methodLabels[method] || method?.toUpperCase() || 'CASH'}
          </Tag>
        );
      }
    }
  ];

  // NEW: Enhanced Analysis Components
  const PerformanceMetricsCard = () => (
    <Card 
      title="Performance Metrics" 
      style={{ marginBottom: 16 }}
      loading={posLoading.stats}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Statistic
            title="Sales Efficiency"
            value={performanceMetrics.salesEfficiency}
            precision={2}
            prefix="KES"
            valueStyle={{ color: '#1890ff' }}
            suffix="per transaction"
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Items/Transaction"
            value={performanceMetrics.itemsPerTransaction}
            precision={1}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Revenue Per Item"
            value={performanceMetrics.revenuePerItem}
            precision={2}
            prefix="KES"
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
      </Row>
    </Card>
  );

  const ProductPerformanceCard = () => (
    <Card 
      title="Top Performing Products" 
      style={{ marginBottom: 16 }}
      loading={posLoading.stats}
    >
      {productPerformance.length > 0 ? (
        <List
          dataSource={productPerformance.slice(0, 5)}
          renderItem={(product, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#1890ff' : '#d9d9d9'}>
                    <Avatar>{product.productName?.charAt(0)?.toUpperCase()}</Avatar>
                  </Badge>
                }
                title={product.productName}
                description={
                  <Space>
                    <Tag color="blue">{product.quantity} sold</Tag>
                    <Tag color="green">{formatCurrency(product.revenue)}</Tag>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No product performance data available" />
      )}
    </Card>
  );

  const HourlyAnalysisCard = () => (
    <Card 
      title="Sales by Hour" 
      style={{ marginBottom: 16 }}
      loading={posLoading.stats}
    >
      {hourlyAnalysis.length > 0 ? (
        <List
          dataSource={hourlyAnalysis.filter(hour => hour.sales > 0)}
          renderItem={hour => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar style={{ backgroundColor: '#1890ff' }}>{hour.hour}</Avatar>}
                title={`${hour.hour}:00 - ${hour.hour + 1}:00`}
                description={
                  <Space>
                    <Text>{formatCurrency(hour.sales)}</Text>
                    <Text type="secondary">{hour.transactions} transactions</Text>
                    <Text type="secondary">{hour.items} items</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No hourly analysis data available" />
      )}
    </Card>
  );

  const CreditAnalysisCard = () => (
    <Card 
      title="Credit Sales Analysis" 
      style={{ marginBottom: 16 }}
      loading={posLoading.stats}
    >
      {creditAnalysis.length > 0 ? (
        <List
          dataSource={creditAnalysis.slice(0, 5)}
          renderItem={credit => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<CreditCardOutlined />} />}
                title={credit.customerName}
                description={
                  <Space direction="vertical" size={0}>
                    <Text>Total: {formatCurrency(credit.totalAmount)}</Text>
                    <Text>Balance: {formatCurrency(credit.balanceDue)}</Text>
                    <Tag color={credit.isOverdue ? 'red' : 'orange'}>
                      {credit.isOverdue ? 'OVERDUE' : `Due in ${credit.daysUntilDue} days`}
                    </Tag>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No credit analysis data available" />
      )}
    </Card>
  );

  // Enhanced Payment Method Modal
  const renderPaymentModal = () => {
    const modalTitle = `Select Payment Method - ${formatCurrency(totals.subtotal)}`;

    return (
      <Modal
        title={modalTitle}
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setSelectedPaymentMethod(null);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setPaymentModalVisible(false);
              setSelectedPaymentMethod(null);
            }}
          >
            Cancel
          </Button>,
          <Button 
            key="process" 
            type="primary" 
            loading={posLoading.checkout}
            onClick={processPayment}
          >
            Process Payment
          </Button>,
        ]}
        width={600}
      >
        {!selectedPaymentMethod ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('cash')}
                  style={{ textAlign: 'center' }}
                >
                  <DollarOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>Cash</Text>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('bank_mpesa')}
                  style={{ textAlign: 'center' }}
                >
                  <BankOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>Bank/Mpesa</Text>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('cash_bank_mpesa')}
                  style={{ textAlign: 'center', borderColor: '#722ed1' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <DollarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                    <Text strong>/</Text>
                    <BankOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>Cash + Bank/Mpesa</Text>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('credit')}
                  style={{ textAlign: 'center', borderColor: '#f5222d' }}
                >
                  <CreditCardOutlined style={{ fontSize: '32px', color: '#f5222d' }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>Credit</Text>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        ) : selectedPaymentMethod === 'cash_bank_mpesa' ? (
          <Form
            form={paymentForm}
            layout="vertical"
            onValuesChange={handleCashBankMpesaChange}
          >
            <Alert
              message="Cash + Bank/Mpesa Payment"
              description={`Please enter the amounts for cash and Bank/Mpesa. The total must equal ${formatCurrency(totals.subtotal)}`}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Cash Amount (KES)"
                  name="cashAmount"
                  rules={[
                    { required: true, message: 'Please enter cash amount' },
                    { 
                      type: 'number', 
                      min: 0, 
                      message: 'Cash amount cannot be negative' 
                    }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    min={0}
                    max={totals.subtotal}
                    step={0.01}
                    precision={2}
                    formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/KES\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Bank/Mpesa Amount (KES)"
                  name="bankMpesaAmount"
                  rules={[
                    { required: true, message: 'Please enter Bank/Mpesa amount' },
                    { 
                      type: 'number', 
                      min: 0, 
                      message: 'Bank/Mpesa amount cannot be negative' 
                    }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    min={0}
                    max={totals.subtotal}
                    step={0.01}
                    precision={2}
                    formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/KES\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="Cash Amount">
                {formatCurrency(cashBankMpesaSplit.cashAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Bank/Mpesa Amount">
                {formatCurrency(cashBankMpesaSplit.bankMpesaAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Entered">
                <Text strong>{formatCurrency(cashBankMpesaSplit.totalAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Required Total">
                <Text strong>{formatCurrency(totals.subtotal)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Difference">
                <Text 
                  strong 
                  type={Math.abs(cashBankMpesaSplit.totalAmount - totals.subtotal) < 0.01 ? 'success' : 'danger'}
                >
                  {formatCurrency(cashBankMpesaSplit.totalAmount - totals.subtotal)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Form>
        ) : selectedPaymentMethod === 'credit' ? (
          <Form
            form={creditForm}
            layout="vertical"
            onValuesChange={handleCreditPaymentChange}
            initialValues={{
              amountPaid: 0,
              balance: totals.subtotal,
              dueDate: dayjs().add(7, 'day')
            }}
          >
            <Alert
              message="Credit Sale"
              description="Please enter customer details and payment information"
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Customer Name"
                  name="customerName"
                  rules={[{ required: true, message: 'Customer name is required' }]}
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    placeholder="Enter customer name" 
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Phone Number"
                  name="customerPhone"
                  rules={[
                    { required: true, message: 'Phone number is required' },
                    { pattern: /^[0-9+\-\s()]{10,}$/, message: 'Please enter a valid phone number' }
                  ]}
                >
                  <Input 
                    prefix={<PhoneOutlined />} 
                    placeholder="e.g., 0712345678" 
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              label="Due Date"
              name="dueDate"
              rules={[{ required: true, message: 'Due date is required' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                disabledDate={(current) => current && current < dayjs().endOf('day')}
                suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Amount Paid Now (KES)"
                  name="amountPaid"
                  rules={[
                    { required: true, message: 'Please enter amount paid' },
                    { 
                      type: 'number', 
                      min: 0, 
                      message: 'Amount cannot be negative' 
                    }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    min={0}
                    max={totals.subtotal}
                    step={0.01}
                    precision={2}
                    formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/KES\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Balance Due (KES)"
                  name="balance"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    value={creditPaymentData.balance}
                    disabled
                    precision={2}
                    formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="Total Amount">
                <Text strong>{formatCurrency(totals.subtotal)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Amount Paid">
                <Text strong type="success">
                  {formatCurrency(creditPaymentData.amountPaid)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Balance Due">
                <Text strong type="danger">
                  {formatCurrency(creditPaymentData.balance)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                <Text strong>
                  {creditForm.getFieldValue('dueDate')?.format('DD/MM/YYYY') || 'Not set'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Alert
              message={`Confirm ${selectedPaymentMethod === 'bank_mpesa' ? 'BANK/MPESA' : selectedPaymentMethod?.toUpperCase()} Payment`}
              description={`Total Amount: ${formatCurrency(totals.subtotal)}`}
              type="info"
              showIcon
            />
            <div style={{ marginTop: '16px' }}>
              <Text>Click "Process Payment" to complete the transaction.</Text>
            </div>
          </div>
        )}
      </Modal>
    );
  };

  // Initial data fetch
  useEffect(() => {
    if (selectedShop) {
      fetchAvailableShops();
      fetchProducts(true);
      fetchCashierDailyStats();
      fetchDailySales();
    }
  }, [selectedShop]);

  // Show loading while initializing
  if (dashboardLoading || !selectedShop) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            {!selectedShop ? 'No shop selected. Redirecting...' : 'Loading enhanced dashboard...'}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToShops}
                type="text"
                size="small"
              >
                Change Shop
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                <ShopOutlined /> {selectedShop?.name || 'Cashier Portal'} - Enhanced Cashier Portal
              </Title>
              <Tag color="blue">
                <UserOutlined /> {cashier?.name || 'Cashier'}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Select
                value={selectedShop?._id}
                onChange={handleShopChange}
                style={{ width: 200 }}
                placeholder="Select Shop"
              >
                {availableShops.map(shop => (
                  <Option key={shop._id} value={shop._id}>
                    {shop.name}
                  </Option>
                ))}
              </Select>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchCashierDailyStats();
                  fetchDailySales();
                  fetchProducts();
                }}
                loading={posLoading.stats || statsLoading}
                size="small"
              >
                Refresh All
              </Button>
              <Button 
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                danger
                size="small"
              >
                Logout
              </Button>
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ padding: '24px' }}>
        {/* Enhanced Performance Header */}
        <Card 
          style={{ marginBottom: '24px' }}
          loading={posLoading.stats}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={4}>
              <Statistic
                title="Today's Sales"
                value={dailyStats.totalSales}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Statistic
                title="Today's Transactions"
                value={dailyStats.totalTransactions}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Statistic
                title="Items Sold Today"
                value={dailyStats.cashierItemsSold}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Statistic
                title="Cash Collected"
                value={dailyStats.cashAmount}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Statistic
                title="Bank/Mpesa"
                value={dailyStats.bankMpesaAmount}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Statistic
                title="Credit Sales"
                value={dailyStats.creditAmount}
                precision={2}
                prefix="KES"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
          </Row>
          
          {/* Enhanced Payment Method Breakdown */}
          {dailyStats.totalSales > 0 && (
            <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f0f8ff', borderRadius: 6 }}>
              <Text strong>Payment Methods: </Text>
              {Object.entries(dailyStats.paymentMethodBreakdown || {})
                .filter(([method, amount]) => amount > 0)
                .map(([method, amount]) => (
                  <Tag 
                    key={method} 
                    color={
                      method === 'cash' ? 'orange' : 
                      method === 'bank_mpesa' ? 'blue' :
                      method === 'cash_bank_mpesa' ? 'purple' : 'red'
                    }
                    style={{ marginLeft: 8 }}
                  >
                    {method === 'cash_bank_mpesa' ? 'CASH/BANK/MPESA' : 
                     method === 'bank_mpesa' ? 'BANK/MPESA' : method.toUpperCase()}: {formatCurrency(amount)}
                  </Tag>
                ))
              }
            </div>
          )}
        </Card>

        {/* Enhanced Main Tabs */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
        >
          {/* POS Interface Tab */}
          <TabPane 
            tab={
              <span>
                <ShoppingCartOutlined />
                POS Interface
              </span>
            } 
            key="pos"
          >
            <Row gutter={[16, 16]}>
              {/* Barcode Scanner Input */}
              {scanMode && (
                <Col span={24}>
                  <Card size="small" title="Barcode Scanner" extra={<Tag color="blue">Scan Mode</Tag>}>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        placeholder="Scan barcode or enter manually..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onPressEnter={handleBarcodeScan}
                        autoFocus
                        prefix={<BarcodeOutlined />}
                      />
                      <Button 
                        type="primary" 
                        onClick={handleBarcodeScan}
                        loading={posLoading.products}
                      >
                        Add Product
                      </Button>
                      <Button onClick={() => setScanMode(false)}>
                        Cancel
                      </Button>
                    </Space.Compact>
                  </Card>
                </Col>
              )}

              {/* Products Section */}
              <Col xs={24} lg={14}>
                <Card
                  title={
                    <Space>
                      <ShoppingCartOutlined />
                      <span>Products - {selectedShop?.name}</span>
                      <Badge 
                        count={products.length} 
                        showZero 
                        color="#1890ff" 
                        style={{ marginLeft: 8 }} 
                      />
                      {lowStockProducts.length > 0 && (
                        <Badge 
                          count={`${lowStockProducts.length} Low Stock`} 
                          color="orange" 
                        />
                      )}
                    </Space>
                  }
                  extra={
                    <Space wrap>
                      <Search
                        placeholder="Search products, barcode, category..."
                        prefix={<SearchOutlined />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: 250 }}
                        allowClear
                      />
                      <Select
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        style={{ width: 150 }}
                        placeholder="Category"
                        allowClear
                      >
                        <Option value="all">All Categories</Option>
                        {categories.map(category => (
                          <Option key={category} value={category}>
                            {category}
                          </Option>
                        ))}
                      </Select>
                      <Tooltip title="Refresh Products">
                        <Button 
                          icon={<ReloadOutlined />} 
                          onClick={() => fetchProducts(true)}
                          loading={posLoading.products}
                        />
                      </Tooltip>
                    </Space>
                  }
                  loading={posLoading.products}
                >
                  {filteredProducts.length === 0 ? (
                    <Empty
                      description={
                        searchTerm || selectedCategory !== 'all' 
                          ? "No products match your search criteria"
                          : `No products available for ${selectedShop?.name}`
                      }
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      <Button type="primary" onClick={() => fetchProducts(true)}>
                        Refresh Products
                      </Button>
                    </Empty>
                  ) : (
                    <div style={{ 
                      maxHeight: '60vh', 
                      overflowY: 'auto', 
                      padding: '8px'
                    }}>
                      {filteredProducts.map(product => (
                        <ProductRow 
                          key={product._id}
                          product={product} 
                          onAddToCart={addToCart}
                          disabled={posLoading.checkout}
                        />
                      ))}
                    </div>
                  )}
                </Card>
              </Col>

              {/* Cart Section */}
              <Col xs={24} lg={10}>
                <Cart
                  cart={cart}
                  onUpdateItem={updateCartItem}
                  onRemoveItem={removeFromCart}
                  onClearCart={clearCart}
                  onCheckout={handlePaymentMethodSelect}
                  onUpdateItemPrice={updateCartItemPrice}
                  loading={posLoading.checkout}
                  totals={totals}
                  shop={selectedShop}
                />
              </Col>
            </Row>

            {/* Floating Action Button */}
            <FloatButton.Group
              shape="circle"
              style={{ right: 24 }}
              icon={<ShoppingOutlined />}
              trigger="hover"
            >
              <FloatButton
                icon={<ReloadOutlined />}
                tooltip="Refresh Products"
                onClick={() => fetchProducts(true)}
              />
              <FloatButton
                icon={<QrcodeOutlined />}
                tooltip="Barcode Scan"
                onClick={() => setScanMode(true)}
              />
              <FloatButton
                icon={<ClearOutlined />}
                tooltip="Clear Cart"
                onClick={clearCart}
                disabled={cart.length === 0}
              />
            </FloatButton.Group>
          </TabPane>

          {/* Enhanced Sales Dashboard Tab */}
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Enhanced Analytics
              </span>
            } 
            key="dashboard"
          >
            {/* Date Range Picker */}
            <Card style={{ marginBottom: '24px' }}>
              <Space>
                <Text strong>Date Range:</Text>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates)}
                  format="DD/MM/YYYY"
                  allowClear={false}
                />
                <Text type="secondary">
                  Showing data for {dateRange[0].format('DD/MM/YYYY')} to {dateRange[1].format('DD/MM/YYYY')}
                </Text>
              </Space>
            </Card>

            {/* Enhanced Daily Stats Overview */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Sales"
                    value={dailyStats.totalSales}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#3f8600' }}
                    loading={statsLoading}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Transactions"
                    value={dailyStats.totalTransactions}
                    valueStyle={{ color: '#1890ff' }}
                    loading={statsLoading}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Items Sold"
                    value={dailyStats.cashierItemsSold}
                    valueStyle={{ color: '#52c41a' }}
                    loading={statsLoading}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Avg. Transaction"
                    value={dailyStats.averageTransaction}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#722ed1' }}
                    loading={statsLoading}
                  />
                </Card>
              </Col>
            </Row>

            {/* Enhanced Money Collection Classification */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title={
                      <Space>
                        <MoneyCollectOutlined />
                        Cash Collected
                      </Space>
                    }
                    value={dailyStats.cashAmount}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#cf1322' }}
                    loading={statsLoading}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title={
                      <Space>
                        <BankOutlined />
                        Bank/Mpesa
                      </Space>
                    }
                    value={dailyStats.bankMpesaAmount}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#722ed1' }}
                    loading={statsLoading}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title={
                      <Space>
                        <CreditCardOutlined />
                        Credit Sales
                      </Space>
                    }
                    value={dailyStats.creditAmount}
                    precision={2}
                    prefix="KES"
                    valueStyle={{ color: '#fa8c16' }}
                    loading={statsLoading}
                  />
                </Card>
              </Col>
            </Row>

            {/* Enhanced Analysis Section */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <PerformanceMetricsCard />
                <ProductPerformanceCard />
              </Col>
              <Col xs={24} lg={12}>
                <HourlyAnalysisCard />
                <CreditAnalysisCard />
              </Col>
            </Row>

            {/* Recent Transactions */}
            <Card
              title={
                <Space>
                  <TransactionOutlined />
                  <span>Recent Transactions - {selectedShop?.name}</span>
                  <Tag>{transactions.length} transactions</Tag>
                </Space>
              }
              loading={statsLoading}
            >
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <ShoppingCartOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <div style={{ marginTop: '16px' }}>
                    <Text type="secondary">No transactions found for the selected date range</Text>
                  </div>
                </div>
              ) : (
                <Table
                  dataSource={transactions}
                  columns={dashboardColumns}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              )}
            </Card>
          </TabPane>
        </Tabs>

        {/* Enhanced Payment Method Modal */}
        {renderPaymentModal()}

        {/* Receipt Modal */}
        <Modal
          title={
            <Space>
              <SafetyCertificateOutlined />
              Transaction Complete - {selectedShop?.name}
              <Tag color="green">Success</Tag>
            </Space>
          }
          open={showReceipt}
          onCancel={handleCloseReceipt}
          footer={[
            <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrintReceipt}>
              Print Receipt
            </Button>,
            <Button key="new" type="default" onClick={handleCloseReceipt}>
              New Sale
            </Button>,
          ]}
          width={800}
          style={{ top: 20 }}
        >
          {currentTransaction && (
            <div id="receipt-print-content">
              <ReceiptTemplate 
                transaction={currentTransaction}
                shop={selectedShop}
                companyInfo={companyInfo}
                onPrint={handlePrintReceipt}
                showPrintButton={false}
              />
            </div>
          )}
        </Modal>
      </Content>
    </Layout>
  );
};

// Enhanced Product Row Component
const ProductRow = React.memo(({ product, onAddToCart, disabled }) => {
  const [editingPrice, setEditingPrice] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(
    product.minSellingPrice || product.sellingPrice || product.price || 0
  );
  const [originalPrice] = useState(
    product.minSellingPrice || product.sellingPrice || product.price || 0
  );

  const stockStatus = useMemo(() => {
    const stock = product.currentStock || 0;
    if (stock <= 0) return { status: 'out', color: 'red', text: 'Out of Stock' };
    if (stock <= (product.minStockLevel || 5)) return { status: 'low', color: 'orange', text: 'Low Stock' };
    return { status: 'in', color: 'green', text: 'In Stock' };
  }, [product.currentStock, product.minStockLevel]);

  const handlePriceUpdate = () => {
    if (currentPrice < originalPrice) {
      message.error('New price cannot be lower than original price');
      setCurrentPrice(originalPrice);
      return;
    }

    if (currentPrice <= 0) {
      message.error('Price must be greater than 0');
      setCurrentPrice(originalPrice);
      return;
    }

    setEditingPrice(false);
    message.success('Price updated successfully');
  };

  const handleAddToCart = () => {
    const productWithUpdatedPrice = {
      ...product,
      minSellingPrice: currentPrice,
      sellingPrice: currentPrice,
      price: currentPrice
    };
    onAddToCart(productWithUpdatedPrice, 1, currentPrice);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        transition: 'all 0.3s',
        cursor: stockStatus.status === 'out' ? 'not-allowed' : 'pointer',
        opacity: stockStatus.status === 'out' ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (stockStatus.status !== 'out') {
          e.currentTarget.style.backgroundColor = '#fafafa';
          e.currentTarget.style.borderColor = '#d9d9d9';
        }
      }}
      onMouseLeave={(e) => {
        if (stockStatus.status !== 'out') {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.borderColor = '#f0f0f0';
        }
      }}
    >
      {/* Product Information */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#f0f2f5',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShoppingCartOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Text 
            strong 
            ellipsis={{ tooltip: product.name }} 
            style={{ 
              display: 'block',
              fontSize: '14px',
              lineHeight: '1.4',
              marginBottom: '2px'
            }}
          >
            {product.name}
          </Text>
          
          <Space size={8} style={{ flexWrap: 'wrap' }}>
            {editingPrice ? (
              <Space.Compact>
                <InputNumber
                  value={currentPrice}
                  onChange={setCurrentPrice}
                  onPressEnter={handlePriceUpdate}
                  onBlur={handlePriceUpdate}
                  min={originalPrice}
                  step={1}
                  precision={2}
                  autoFocus
                  style={{ width: '100px' }}
                  formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/KES\s?|(,*)/g, '')}
                />
                <Button 
                  type="primary" 
                  size="small" 
                  onClick={handlePriceUpdate}
                >
                  OK
                </Button>
                <Button 
                  size="small" 
                  onClick={() => {
                    setCurrentPrice(originalPrice);
                    setEditingPrice(false);
                  }}
                >
                  Cancel
                </Button>
              </Space.Compact>
            ) : (
              <Tooltip title="Click to edit price (can only increase)">
                <Text 
                  strong 
                  style={{ 
                    color: '#1890ff', 
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setEditingPrice(true)}
                >
                  KES {currentPrice.toLocaleString()}
                </Text>
              </Tooltip>
            )}
            
            <Tag 
              color={stockStatus.color} 
              style={{ 
                margin: 0, 
                fontSize: '11px',
                padding: '1px 6px',
                lineHeight: '1.2'
              }}
            >
              Stock: {product.currentStock || 0}
            </Tag>
            
            {product.category && (
              <Tag 
                color="blue" 
                style={{ 
                  fontSize: '11px', 
                  margin: 0,
                  padding: '1px 6px',
                  lineHeight: '1.2'
                }}
              >
                {product.category}
              </Tag>
            )}
            
            {product.barcode && (
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: '11px'
                }}
              >
                <BarcodeOutlined /> {product.barcode}
              </Text>
            )}
          </Space>
        </div>
      </div>

      {/* Add to Cart Button */}
      <div style={{ flexShrink: 0, marginLeft: '16px' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddToCart}
          disabled={stockStatus.status === 'out' || disabled}
          size="small"
          style={{
            fontSize: '12px',
            height: '32px',
            minWidth: '100px'
          }}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
});

ProductRow.displayName = 'ProductRow';

export default CashierDashboard;
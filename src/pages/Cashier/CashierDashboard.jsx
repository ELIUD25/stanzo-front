// src/pages/Cashier/CashierDashboard.jsx - UPDATED WITH CONSISTENT STYLING
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout, Card, Row, Col, Statistic, Typography, Tag,
  Space, Button, Spin, Alert, Divider, List, Avatar, 
  Tabs, Input, Modal, Form, InputNumber, Tooltip, 
  FloatButton, notification, Empty, message, Descriptions,
  Progress, Badge, Timeline, DatePicker, Table, Select
} from 'antd';
import {
  ShopOutlined, UserOutlined, DollarOutlined,
  ShoppingCartOutlined, LogoutOutlined, ReloadOutlined,
  ArrowLeftOutlined, BarChartOutlined, TransactionOutlined,
  SearchOutlined, PlusOutlined, BarcodeOutlined,
  CalculatorOutlined, DeleteOutlined, ScanOutlined,
  PrinterOutlined, SafetyCertificateOutlined, QrcodeOutlined,
  ClearOutlined, CreditCardOutlined, PhoneOutlined,
  CalendarOutlined, BankOutlined, MoneyCollectOutlined,
  HistoryOutlined, WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, TeamOutlined, ShoppingOutlined,
  EyeOutlined, FileTextOutlined, InfoCircleOutlined,
  RiseOutlined, FallOutlined, StockOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI, unifiedAPI, productAPI, creditAPI, transactionAPI } from '../../services/api';
import Cart from './Cart';
import ReceiptTemplate from '../../components/ReceiptTemplate';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;

// Enhanced Calculation Utilities with consistent styling
const CashierCalculationUtils = {
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  formatCurrency: (amount) => {
    const value = CashierCalculationUtils.safeNumber(amount);
    return `KES ${value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  },

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

  // Get color based on value (consistent with other components)
  getValueColor: (value, type = 'default') => {
    const numValue = CashierCalculationUtils.safeNumber(value);
    
    if (type === 'profit') {
      if (numValue > 0) return '#3f8600'; // Green
      if (numValue < 0) return '#cf1322'; // Red
      return '#8c8c8c'; // Gray
    }
    
    if (type === 'revenue') {
      if (numValue > 0) return '#1890ff'; // Blue
      return '#8c8c8c';
    }
    
    if (type === 'warning') {
      if (numValue > 0) return '#fa8c16'; // Orange
      return '#8c8c8c';
    }
    
    return '#595959'; // Default
  },

  // Get profit icon (consistent with other components)
  getProfitIcon: (profit) => {
    const value = CashierCalculationUtils.safeNumber(profit);
    return value >= 0 ? <RiseOutlined /> : <FallOutlined />;
  }
};

// Default stats with enhanced structure
const getDefaultCashierStats = () => ({
  totalSales: 0,
  totalTransactions: 0,
  totalItems: 0,
  averageTransaction: 0,
  cashAmount: 0,
  bankMpesaAmount: 0,
  creditAmount: 0,
  cashierItemsSold: 0,
  creditTransactions: 0,
  creditGivenToday: 0,
  profitMargin: 0,
  collectionRate: 0
});

// Color scheme matching your other components
const COLOR_SCHEME = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#f5222d',
  info: '#13c2c2',
  purple: '#722ed1',
  magenta: '#eb2f96',
  gold: '#faad14',
  cyan: '#08979c',
  
  // Background colors
  background: {
    light: '#f5f5f5',
    card: '#ffffff',
    header: '#001529'
  },
  
  // Status colors
  status: {
    completed: '#52c41a',
    pending: '#fa8c16',
    credit: '#f5222d',
    active: '#1890ff'
  }
};

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [cashier, setCashier] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [activeTab, setActiveTab] = useState('pos');

  // Dashboard States
  const [dailyStats, setDailyStats] = useState(getDefaultCashierStats());
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [todayCredits, setTodayCredits] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // POS States
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [posLoading, setPosLoading] = useState({
    products: false,
    checkout: false,
    stats: false
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  // Payment Modal States
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentForm] = Form.useForm();
  const [creditForm] = Form.useForm();
  const [cashBankMpesaSplit, setCashBankMpesaSplit] = useState({
    cashAmount: 0,
    bankMpesaAmount: 0,
    totalAmount: 0
  });
  const [creditPaymentData, setCreditPaymentData] = useState({
    amountPaid: 0,
    balance: 0,
    customerName: '',
    customerPhone: '',
    dueDate: null,
    shopName: '',
    shopId: ''
  });

  // Calculate credit percentage
  const creditPercentage = useMemo(() => 
    dailyStats.totalSales > 0 
      ? (dailyStats.creditAmount / dailyStats.totalSales) * 100 
      : 0, 
    [dailyStats.totalSales, dailyStats.creditAmount]
  );

  // Enhanced cart calculations with consistent formatting
  const totals = useMemo(() => {
    return CashierCalculationUtils.calculateCartTotals(cart);
  }, [cart]);

  // Company information with enhanced styling
  const companyInfo = useMemo(() => ({
    name: "STANZO SHOP",
    address: "Mikinduri, Kenya",
    phone: "+254 746919850",
    email: "stanzokinyua5967@gmail.com",
    slogan: "Quality Products, Best Prices",
    logo: "🏪"
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
      message.error('Please select a shop to continue.');
      return false;
    }
    
    if (!cashier || !cashier._id) {
      message.error('Cashier information is missing. Please log in again.');
      return false;
    }
    
    return true;
  }, [selectedShop, cashier]);

  // Enhanced fetch function with consistent error handling
  const fetchCashierDailyStats = useCallback(async () => {
    if (!cashier?._id || !selectedShop?._id) return;

    setPosLoading(prev => ({ ...prev, stats: true }));
    
    try {
      console.log('📊 Fetching enhanced cashier daily stats...');

      const today = dayjs().startOf('day').toISOString();
      const now = dayjs().toISOString();

      // Use unified API to get combined data
      const combinedData = await unifiedAPI.getCombinedTransactions({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now,
        status: 'completed'
      });

      // Extract and transform data for cashier dashboard
      const transactions = combinedData.transactions || [];
      const summary = combinedData.summary || {};
      const enhancedStats = combinedData.enhancedStats?.financialStats || {};

      // Calculate cashier-specific stats
      const totalSales = summary.totalRevenue || enhancedStats.totalRevenue || 0;
      const totalTransactions = transactions.length;
      const creditAmount = enhancedStats.creditSales || summary.creditSales || 0;
      const creditTransactions = transactions.filter(t => t.paymentMethod === 'credit').length;
      const cashAmount = enhancedStats.totalCash || summary.totalCash || 0;
      const bankMpesaAmount = enhancedStats.totalMpesaBank || summary.totalMpesaBank || 0;
      const cashierItemsSold = transactions.reduce((sum, t) => 
        sum + (t.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
      );

      // Enhanced stats with profit calculation
      const costOfGoods = transactions.reduce((sum, t) => sum + (t.cost || 0), 0);
      const grossProfit = totalSales - costOfGoods;
      const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

      setDailyStats({
        totalSales,
        totalTransactions,
        creditAmount,
        creditTransactions,
        cashAmount,
        bankMpesaAmount,
        cashierItemsSold,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
        creditGivenToday: creditAmount,
        profitMargin,
        collectionRate: creditAmount > 0 ? ((creditAmount - (enhancedStats.outstandingCredit || 0)) / creditAmount) * 100 : 0
      });

    } catch (error) {
      console.error('❌ Error fetching enhanced cashier daily stats:', error);
      await fetchDailySalesFallback();
    } finally {
      setPosLoading(prev => ({ ...prev, stats: false }));
    }
  }, [cashier, selectedShop]);

  // Enhanced today's transactions fetch
  const fetchTodayTransactions = useCallback(async () => {
    if (!cashier?._id || !selectedShop?._id) return;

    try {
      console.log('📊 Fetching today\'s transactions and credits...');
      
      const today = dayjs().startOf('day').toISOString();
      const now = dayjs().toISOString();

      // Use unified API for transactions
      const transactionsData = await unifiedAPI.getCombinedTransactions({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now,
        status: 'completed'
      });

      const transactions = transactionsData.transactions || [];
      setTodayTransactions(transactions);

      // Use unified API for credit analysis
      const creditAnalysis = await unifiedAPI.getCombinedCreditAnalysis({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now
      });

      const creditsData = creditAnalysis.credits || creditAnalysis.creditTransactions || [];
      setTodayCredits(creditsData);

    } catch (error) {
      console.error('❌ Error fetching today\'s data:', error);
      setTodayTransactions([]);
      setTodayCredits([]);
    }
  }, [cashier, selectedShop]);

  // Enhanced products fetch with better filtering
  const fetchProducts = async (showMessage = false) => {
    if (!validateShopAndCashier()) return;
    
    setPosLoading(prev => ({ ...prev, products: true }));
    
    try {
      const response = await productAPI.getAll();
      const productsData = response.data || response;
      
      const shopProducts = Array.isArray(productsData) 
        ? productsData.filter(product => {
            const productShopId = product.shop?._id || product.shop || product.shopId;
            return productShopId === selectedShop._id && product.isActive !== false;
          })
        : [];

      setProducts(shopProducts);
      setFilteredProducts(shopProducts);
      
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

      if (showMessage && shopProducts.length === 0) {
        message.warning(`No products found for ${selectedShop?.name}. Please add products first.`);
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

  // Enhanced cart functions with better user feedback
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

    // Show success notification
    notification.success({
      message: 'Product Added',
      description: `${quantity} x ${product.name} added to cart`,
      placement: 'topRight',
      duration: 2,
    });

    if (scanMode) {
      setBarcodeInput('');
    }
  };

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
        message.success('Cart cleared successfully');
      }
    });
  };

  // Enhanced payment method selection
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
        dueDate: dayjs().add(7, 'day'),
        shopName: selectedShop?.name || '',
        shopId: selectedShop?._id || ''
      });
      creditForm.setFieldsValue({
        amountPaid: 0,
        balance: totals.subtotal,
        customerName: '',
        customerPhone: '',
        dueDate: dayjs().add(7, 'day'),
        shopName: selectedShop?.name || '',
        shopId: selectedShop?._id || ''
      });
    }
    
    setPaymentModalVisible(true);
  };

  // Enhanced checkout with better error handling
  const handleCheckout = async (paymentMethod, paymentDetails = {}) => {
    if (!validateShopAndCashier()) return;

    if (cart.length === 0) {
      Modal.error({
        title: 'Empty Cart',
        content: 'Please add items to cart before checkout.',
      });
      return;
    }

    setPosLoading(prev => ({ ...prev, checkout: true }));
    
    try {
      const generateTransactionNumber = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `TXN-${timestamp}-${random}`.toUpperCase();
      };

      // Enhanced transaction data with credit support
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
          barcode: item.barcode,
          costPrice: item.product?.buyingPrice || 0
        })),
        totalAmount: Number(totals.subtotal),
        paymentMethod: paymentMethod,
        status: 'completed',
        itemsCount: Number(totals.totalItems),
        saleDate: new Date().toISOString(),
        receiptNumber: `RCP-${Date.now()}`,
        cost: cart.reduce((sum, item) => {
          const costPrice = item.product?.buyingPrice || 0;
          return sum + (costPrice * item.quantity);
        }, 0)
      };

      // Enhanced payment data for different methods
      if (paymentMethod === 'cash_bank_mpesa') {
        transactionData.cashAmount = paymentDetails.cashAmount;
        transactionData.bankMpesaAmount = paymentDetails.bankMpesaAmount;
        transactionData.paymentSplit = {
          cash: paymentDetails.cashAmount,
          bank_mpesa: paymentDetails.bankMpesaAmount
        };
      } else if (paymentMethod === 'credit') {
        transactionData.amountPaid = paymentDetails.amountPaid || 0;
        transactionData.balanceDue = paymentDetails.balance || totals.subtotal;
        transactionData.dueDate = paymentDetails.dueDate;
        transactionData.creditStatus = paymentDetails.balance > 0 ? 'pending' : 'paid';
        transactionData.status = paymentDetails.balance > 0 ? 'credit' : 'completed';
        transactionData.creditShopName = paymentDetails.shopName;
        transactionData.creditShopId = paymentDetails.shopId;
        transactionData.isCredit = true;
        
        if (paymentDetails.amountPaid > 0 && paymentDetails.balance > 0) {
          transactionData.creditStatus = 'partially_paid';
        }
      }

      console.log('💰 Sending enhanced transaction data:', transactionData);

      const response = await transactionAPI.create(transactionData);
      const transactionResult = response?.data || response;
      
      if (transactionResult && transactionResult._id) {
        // Create credit record if it's a credit transaction with balance
        if (paymentMethod === 'credit' && paymentDetails.balance > 0) {
          try {
            const creditRecord = {
              transactionId: transactionResult._id,
              transactionNumber: transactionResult.transactionNumber,
              customerName: paymentDetails.customerName,
              customerPhone: paymentDetails.customerPhone,
              totalAmount: totals.subtotal,
              amountPaid: paymentDetails.amountPaid || 0,
              balanceDue: paymentDetails.balance,
              dueDate: paymentDetails.dueDate,
              shopId: selectedShop._id,
              shopName: selectedShop.name,
              cashierId: cashier._id,
              cashierName: cashier.name,
              status: 'pending',
              creditShopName: paymentDetails.shopName,
              creditShopId: paymentDetails.shopId,
              items: cart.map(item => ({
                productId: item.productId,
                productName: item.name,
                quantity: item.quantity,
                price: item.price
              }))
            };
            
            await creditAPI.create(creditRecord);
            console.log('✅ Credit record created successfully');
          } catch (creditError) {
            console.error('❌ Error creating credit record:', creditError);
            notification.warning({
              message: 'Credit Record Warning',
              description: 'Transaction completed but credit record creation failed. Please create credit record manually.',
              duration: 5,
            });
          }
        }
        
        setCurrentTransaction(transactionResult);
        setShowReceipt(true);
        
        // Enhanced data refresh
        await Promise.all([
          fetchCashierDailyStats(),
          fetchTodayTransactions(),
          fetchProducts()
        ]);
        
        notification.success({
          message: 'Transaction Completed Successfully',
          description: `Sale completed for ${selectedShop?.name}. Total: ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`,
          duration: 3,
        });

        setCart([]);
        
      } else {
        throw new Error('Transaction failed: Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      
      let errorMessage = 'Failed to process transaction. Please try again.';
      
      if (error.message.includes('stock')) {
        errorMessage = `Stock error: ${error.message}`;
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message.includes('credit')) {
        errorMessage = 'Credit processing error. Please check credit details.';
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

  // Enhanced Today's Transactions Display Component
  const TodaysTransactionsCard = () => {
    const allTransactions = [...todayTransactions];

    // Calculate totals with enhanced formatting
    const totalSales = allTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const creditSales = allTransactions
      .filter(t => t.paymentMethod === 'credit')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const cashSales = totalSales - creditSales;

    // Enhanced transaction columns with consistent styling
    const transactionColumns = [
      {
        title: 'Transaction',
        dataIndex: 'transactionNumber',
        key: 'transactionNumber',
        width: 120,
        render: (text, record) => (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '12px' }}>{text}</Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {dayjs(record.saleDate).format('HH:mm')}
            </Text>
          </Space>
        )
      },
      {
        title: 'Customer',
        dataIndex: 'customerName',
        key: 'customerName',
        width: 120,
        render: (text) => (
          <Text style={{ fontSize: '12px' }}>{text || 'Walk-in'}</Text>
        )
      },
      {
        title: 'Payment Method',
        dataIndex: 'paymentMethod',
        key: 'paymentMethod',
        width: 100,
        render: (method) => {
          const methodConfig = {
            credit: { color: COLOR_SCHEME.warning, text: 'CREDIT' },
            cash_bank_mpesa: { color: COLOR_SCHEME.purple, text: 'SPLIT' },
            cash: { color: COLOR_SCHEME.success, text: 'CASH' },
            bank_mpesa: { color: COLOR_SCHEME.primary, text: 'DIGITAL' }
          };
          const config = methodConfig[method] || { color: COLOR_SCHEME.gold, text: method?.toUpperCase() };
          
          return (
            <Tag 
              color={config.color}
              style={{ fontSize: '11px', margin: 0, fontWeight: 'bold' }}
            >
              {config.text}
            </Tag>
          );
        }
      },
      {
        title: 'Items',
        dataIndex: 'itemsCount',
        key: 'itemsCount',
        width: 60,
        render: (count) => (
          <Badge count={count} showZero style={{ backgroundColor: COLOR_SCHEME.cyan }} />
        )
      },
      {
        title: 'Amount',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 100,
        render: (amount) => (
          <Text strong style={{ 
            fontSize: '12px',
            color: CashierCalculationUtils.getValueColor(amount, 'revenue')
          }}>
            {CashierCalculationUtils.formatCurrency(amount)}
          </Text>
        )
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        render: (status, record) => {
          const isCredit = record.paymentMethod === 'credit';
          return (
            <Tag 
              color={isCredit ? COLOR_SCHEME.warning : COLOR_SCHEME.success}
              style={{ fontSize: '10px', margin: 0, fontWeight: 'bold' }}
            >
              {isCredit ? 'CREDIT' : 'PAID'}
            </Tag>
          );
        }
      }
    ];

    // Enhanced credit columns
    const creditColumns = [
      {
        title: 'Customer',
        dataIndex: 'customerName',
        key: 'customerName',
        width: 120,
        render: (text, record) => (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '12px' }}>{text}</Text>
            {record.customerPhone && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {record.customerPhone}
              </Text>
            )}
          </Space>
        )
      },
      {
        title: 'Shop Classification',
        dataIndex: 'creditShopName',
        key: 'creditShopName',
        width: 140,
        render: (text, record) => (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: '11px' }}>{text || record.shopName}</Text>
            <Text type="secondary" style={{ fontSize: '9px' }}>
              Due: {dayjs(record.dueDate).format('DD/MM')}
            </Text>
          </Space>
        )
      },
      {
        title: 'Total Amount',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 100,
        render: (amount) => (
          <Text strong style={{ fontSize: '12px' }}>
            {CashierCalculationUtils.formatCurrency(amount)}
          </Text>
        )
      },
      {
        title: 'Amount Paid',
        dataIndex: 'amountPaid',
        key: 'amountPaid',
        width: 100,
        render: (amount) => (
          <Text type="success" style={{ fontSize: '12px' }}>
            {CashierCalculationUtils.formatCurrency(amount)}
          </Text>
        )
      },
      {
        title: 'Balance Due',
        dataIndex: 'balanceDue',
        key: 'balanceDue',
        width: 100,
        render: (balance) => (
          <Text strong type="danger" style={{ fontSize: '12px' }}>
            {CashierCalculationUtils.formatCurrency(balance)}
          </Text>
        )
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status) => {
          const statusConfig = {
            pending: { color: COLOR_SCHEME.warning, text: 'PENDING' },
            partially_paid: { color: COLOR_SCHEME.primary, text: 'PARTIAL' },
            paid: { color: COLOR_SCHEME.success, text: 'PAID' },
            overdue: { color: COLOR_SCHEME.error, text: 'OVERDUE' }
          };
          const config = statusConfig[status] || statusConfig.pending;
          return (
            <Tag color={config.color} style={{ fontSize: '10px', margin: 0, fontWeight: 'bold' }}>
              {config.text}
            </Tag>
          );
        }
      }
    ];

    return (
      <div>
        {/* Enhanced Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8} md={6}>
            <Card 
              size="small"
              style={{ borderLeft: `4px solid ${COLOR_SCHEME.success}` }}
            >
              <Statistic
                title="Total Sales"
                value={totalSales}
                precision={2}
                prefix="KES"
                valueStyle={{ color: COLOR_SCHEME.success, fontSize: '16px' }}
              />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                All payment methods
              </Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card 
              size="small"
              style={{ borderLeft: `4px solid ${COLOR_SCHEME.warning}` }}
            >
              <Statistic
                title="Credit Sales"
                value={creditSales}
                precision={2}
                prefix="KES"
                valueStyle={{ color: COLOR_SCHEME.warning, fontSize: '16px' }}
              />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {todayCredits.length} credit records
              </Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card 
              size="small"
              style={{ borderLeft: `4px solid ${COLOR_SCHEME.primary}` }}
            >
              <Statistic
                title="Cash Sales"
                value={cashSales}
                precision={2}
                prefix="KES"
                valueStyle={{ color: COLOR_SCHEME.primary, fontSize: '16px' }}
              />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Cash & Bank/Mpesa
              </Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card 
              size="small"
              style={{ borderLeft: `4px solid ${COLOR_SCHEME.info}` }}
            >
              <Statistic
                title="Transactions"
                value={allTransactions.length}
                valueStyle={{ color: COLOR_SCHEME.info, fontSize: '18px' }}
              />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Today's count
              </Text>
            </Card>
          </Col>
        </Row>

        <Tabs 
          defaultActiveKey="transactions"
          type="card"
        >
          <Tabs.TabPane 
            tab={
              <span>
                <TransactionOutlined />
                All Transactions 
                <Badge count={allTransactions.length} style={{ marginLeft: 8 }} />
              </span>
            } 
            key="transactions"
          >
            <Card>
              <Table
                columns={transactionColumns}
                dataSource={allTransactions}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 600 }}
                locale={{ emptyText: 'No transactions today' }}
              />
            </Card>
          </Tabs.TabPane>

          <Tabs.TabPane 
            tab={
              <span>
                <CreditCardOutlined />
                Credit Transactions 
                <Badge count={todayCredits.length} style={{ marginLeft: 8, backgroundColor: COLOR_SCHEME.warning }} />
              </span>
            } 
            key="credits"
          >
            <Card>
              <Table
                columns={creditColumns}
                dataSource={todayCredits}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 700 }}
                locale={{ emptyText: 'No credit transactions today' }}
                summary={() => {
                  const totalCreditAmount = todayCredits.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
                  const totalPaid = todayCredits.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
                  const totalBalance = todayCredits.reduce((sum, c) => sum + (c.balanceDue || 0), 0);

                  return (
                    <Table.Summary>
                      <Table.Summary.Row style={{ background: '#fafafa' }}>
                        <Table.Summary.Cell index={0} colSpan={2}>
                          <Text strong>Totals:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>
                          <Text strong>{CashierCalculationUtils.formatCurrency(totalCreditAmount)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <Text strong type="success">{CashierCalculationUtils.formatCurrency(totalPaid)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>
                          <Text strong type="danger">{CashierCalculationUtils.formatCurrency(totalBalance)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5}></Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </div>
    );
  };

  // Enhanced Product Row Component with consistent styling
  const ProductRow = React.memo(({ product, onAddToCart, disabled }) => {
    const stockStatus = useMemo(() => {
      const stock = product.currentStock || 0;
      if (stock <= 0) return { status: 'out', color: COLOR_SCHEME.error, text: 'Out of Stock' };
      if (stock <= (product.minStockLevel || 5)) return { status: 'low', color: COLOR_SCHEME.warning, text: 'Low Stock' };
      return { status: 'in', color: COLOR_SCHEME.success, text: 'In Stock' };
    }, [product.currentStock, product.minStockLevel]);

    const handleAddToCart = () => {
      onAddToCart(product, 1);
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: COLOR_SCHEME.background.light,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShoppingCartOutlined style={{ fontSize: '18px', color: COLOR_SCHEME.primary }} />
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
              <Text 
                strong 
                style={{ 
                  color: COLOR_SCHEME.primary, 
                  fontSize: '14px'
                }}
              >
                KES {(product.minSellingPrice || product.sellingPrice || 0).toLocaleString()}
              </Text>
              
              <Tag 
                color={stockStatus.color} 
                style={{ 
                  margin: 0, 
                  fontSize: '11px',
                  padding: '1px 6px',
                  lineHeight: '1.2',
                  fontWeight: 'bold'
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
            </Space>
          </div>
        </div>

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
              minWidth: '100px',
              backgroundColor: stockStatus.status === 'out' ? '#d9d9d9' : COLOR_SCHEME.primary,
              borderColor: stockStatus.status === 'out' ? '#d9d9d9' : COLOR_SCHEME.primary
            }}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    );
  });

  // Enhanced Payment Method Modal
  const renderPaymentModal = () => {
    const modalTitle = `Select Payment Method - ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`;

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
            style={{ backgroundColor: COLOR_SCHEME.primary }}
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
                  style={{ textAlign: 'center', borderColor: COLOR_SCHEME.success }}
                >
                  <DollarOutlined style={{ fontSize: '32px', color: COLOR_SCHEME.success }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>Cash</Text>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('bank_mpesa')}
                  style={{ textAlign: 'center', borderColor: COLOR_SCHEME.primary }}
                >
                  <BankOutlined style={{ fontSize: '32px', color: COLOR_SCHEME.primary }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>Bank/Mpesa</Text>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  hoverable 
                  onClick={() => handlePaymentMethodSelect('cash_bank_mpesa')}
                  style={{ textAlign: 'center', borderColor: COLOR_SCHEME.purple }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <DollarOutlined style={{ fontSize: '24px', color: COLOR_SCHEME.success }} />
                    <Text strong>/</Text>
                    <BankOutlined style={{ fontSize: '24px', color: COLOR_SCHEME.primary }} />
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
                  style={{ textAlign: 'center', borderColor: COLOR_SCHEME.warning }}
                >
                  <CreditCardOutlined style={{ fontSize: '32px', color: COLOR_SCHEME.warning }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>Credit</Text>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ padding: '10px 0' }}>
            {selectedPaymentMethod === 'cash_bank_mpesa' && (
              <Form
                form={paymentForm}
                layout="vertical"
                onValuesChange={handleCashBankMpesaChange}
              >
                <Alert
                  message="Cash + Bank/Mpesa Payment"
                  description={`Please enter the amounts for cash and Bank/Mpesa. The total must equal ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`}
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
                    {CashierCalculationUtils.formatCurrency(cashBankMpesaSplit.cashAmount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Bank/Mpesa Amount">
                    {CashierCalculationUtils.formatCurrency(cashBankMpesaSplit.bankMpesaAmount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Entered">
                    <Text strong>{CashierCalculationUtils.formatCurrency(cashBankMpesaSplit.totalAmount)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Required Total">
                    <Text strong>{CashierCalculationUtils.formatCurrency(totals.subtotal)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Difference">
                    <Text 
                      strong 
                      type={Math.abs(cashBankMpesaSplit.totalAmount - totals.subtotal) < 0.01 ? 'success' : 'danger'}
                    >
                      {CashierCalculationUtils.formatCurrency(cashBankMpesaSplit.totalAmount - totals.subtotal)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Form>
            )}
            
            {selectedPaymentMethod === 'credit' && (
              <Form
                form={creditForm}
                layout="vertical"
                onValuesChange={handleCreditPaymentChange}
                initialValues={{
                  amountPaid: 0,
                  balance: totals.subtotal,
                  dueDate: dayjs().add(7, 'day'),
                  shopName: selectedShop?.name || '',
                  shopId: selectedShop?._id || ''
                }}
              >
                <Alert
                  message="Credit Sale - Shop Classification Required"
                  description="Please enter customer details and shop information for credit classification"
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
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Shop Name"
                      name="shopName"
                      rules={[{ required: true, message: 'Shop name is required for credit classification' }]}
                    >
                      <Input 
                        prefix={<ShopOutlined />} 
                        placeholder="Enter shop name" 
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Shop ID"
                      name="shopId"
                      rules={[{ required: true, message: 'Shop ID is required for credit classification' }]}
                    >
                      <Input 
                        prefix={<ShopOutlined />} 
                        placeholder="Enter shop ID" 
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
                    <Text strong>{CashierCalculationUtils.formatCurrency(totals.subtotal)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Amount Paid">
                    <Text strong type="success">
                      {CashierCalculationUtils.formatCurrency(creditPaymentData.amountPaid)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Balance Due">
                    <Text strong type="danger">
                      {CashierCalculationUtils.formatCurrency(creditPaymentData.balance)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Due Date">
                    <Text strong>
                      {creditForm.getFieldValue('dueDate')?.format('DD/MM/YYYY') || 'Not set'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Shop Classification">
                    <Text strong>
                      {creditForm.getFieldValue('shopName') || 'Not set'}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Form>
            )}
            
            {(selectedPaymentMethod === 'cash' || selectedPaymentMethod === 'bank_mpesa') && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Alert
                  message={`Confirm ${selectedPaymentMethod === 'bank_mpesa' ? 'BANK/MPESA' : selectedPaymentMethod?.toUpperCase()} Payment`}
                  description={`Total Amount: ${CashierCalculationUtils.formatCurrency(totals.subtotal)}`}
                  type="info"
                  showIcon
                />
                <div style={{ marginTop: '16px' }}>
                  <Text>Click "Process Payment" to complete the transaction.</Text>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  };

  // Validation functions
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
      
      if (!values.shopName || !values.shopId) {
        message.error('Shop information is required for credit transactions');
        return false;
      }
      
      return true;
    } catch (error) {
      message.error('Please fill all required fields correctly');
      return false;
    }
  };

  // Process Payment
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
        dueDate: values.dueDate,
        shopName: values.shopName,
        shopId: values.shopId
      });
      
    } else {
      await handleCheckout(selectedPaymentMethod);
    }
    
    setPaymentModalVisible(false);
    setSelectedPaymentMethod(null);
  };

  // Cash/Bank-Mpesa split handler
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

  // Credit payment change handler
  const handleCreditPaymentChange = (changedValues, allValues) => {
    const amountPaid = parseFloat(allValues.amountPaid || 0);
    const totalAmount = totals.subtotal;
    const balance = totalAmount - amountPaid;
    
    setCreditPaymentData(prev => ({
      ...prev,
      amountPaid,
      balance: Math.max(0, balance),
      shopName: allValues.shopName || prev.shopName,
      shopId: allValues.shopId || prev.shopId
    }));
  };

  // Fallback function for basic stats calculation
  const fetchDailySalesFallback = async () => {
    try {
      const today = dayjs().startOf('day').toISOString();
      const now = dayjs().toISOString();
      
      const response = await unifiedAPI.getCombinedTransactions({
        cashierId: cashier._id,
        shopId: selectedShop._id,
        startDate: today,
        endDate: now,
        status: 'completed'
      });
      
      const transactions = response.transactions || [];
      
      // Calculate basic stats
      const totalSales = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalTransactions = transactions.length;
      const creditAmount = transactions
        .filter(t => t.paymentMethod === 'credit')
        .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const creditTransactions = transactions.filter(t => t.paymentMethod === 'credit').length;

      setDailyStats({
        totalSales,
        totalTransactions,
        creditAmount,
        creditTransactions,
        cashAmount: totalSales - creditAmount,
        bankMpesaAmount: 0,
        cashierItemsSold: transactions.reduce((sum, t) => 
          sum + (t.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
        )
      });
      
    } catch (fallbackError) {
      console.error('❌ Fallback calculation failed:', fallbackError);
      setDailyStats(getDefaultCashierStats());
    }
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

  const handleLogout = () => {
    authAPI.logout();
    navigate('/cashier/login');
  };

  const handleBackToShops = () => {
    navigate('/cashier/shops');
  };

  // Initial data fetch
  useEffect(() => {
    if (selectedShop) {
      fetchProducts(true);
      fetchCashierDailyStats();
      fetchTodayTransactions();
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
            {!selectedShop ? 'No shop selected. Redirecting...' : 'Loading cashier dashboard...'}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: COLOR_SCHEME.background.light }}>
      <Header style={{ 
        background: COLOR_SCHEME.background.header, 
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
                style={{ color: 'white' }}
              >
                Change Shop
              </Button>
              <Title level={4} style={{ margin: 0, color: 'white' }}>
                <ShopOutlined /> {selectedShop?.name || 'Cashier Portal'}
              </Title>
              <Tag color={COLOR_SCHEME.primary}>
                <UserOutlined /> {cashier?.name || 'Cashier'}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong style={{ color: 'rgba(255,255,255,0.8)' }}>
                Today: {dayjs().format('DD/MM/YYYY')}
              </Text>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchCashierDailyStats();
                  fetchTodayTransactions();
                  fetchProducts();
                }}
                loading={posLoading.stats}
                size="small"
                style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                Refresh
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
          style={{ marginBottom: '16px', borderRadius: '8px' }}
          loading={posLoading.stats}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card 
                size="small"
                style={{ borderLeft: `4px solid ${COLOR_SCHEME.success}` }}
              >
                <Statistic
                  title="Total Sales"
                  value={dailyStats.totalSales}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: COLOR_SCHEME.success, fontSize: '16px' }}
                  suffix={
                    <Tooltip title="Includes all sales: Cash, Bank/Mpesa, and Credit">
                      <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
                    </Tooltip>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                size="small"
                style={{ borderLeft: `4px solid ${COLOR_SCHEME.warning}` }}
              >
                <Statistic
                  title="Credit Sales"
                  value={dailyStats.creditAmount}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ 
                    color: dailyStats.creditAmount > 0 ? COLOR_SCHEME.warning : '#8c8c8c',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                />
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {dailyStats.creditTransactions || 0} credit transactions
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                size="small"
                style={{ borderLeft: `4px solid ${COLOR_SCHEME.primary}` }}
              >
                <Statistic
                  title="Cash Sales"
                  value={dailyStats.cashAmount}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: COLOR_SCHEME.primary, fontSize: '16px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card 
                size="small"
                style={{ borderLeft: `4px solid ${COLOR_SCHEME.purple}` }}
              >
                <Statistic
                  title="Bank/Mpesa Sales"
                  value={dailyStats.bankMpesaAmount}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ color: COLOR_SCHEME.purple, fontSize: '16px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Additional Stats Row */}
          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Total Transactions"
                  value={dailyStats.totalTransactions}
                  valueStyle={{ color: COLOR_SCHEME.info, fontSize: '18px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Items Sold"
                  value={dailyStats.cashierItemsSold}
                  valueStyle={{ color: COLOR_SCHEME.cyan, fontSize: '18px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Profit Margin"
                  value={dailyStats.profitMargin}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: dailyStats.profitMargin > 20 ? COLOR_SCHEME.success : 
                           dailyStats.profitMargin > 10 ? COLOR_SCHEME.warning : COLOR_SCHEME.error,
                    fontSize: '16px'
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Collection Rate"
                  value={dailyStats.collectionRate}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: dailyStats.collectionRate > 80 ? COLOR_SCHEME.success : 
                           dailyStats.collectionRate > 50 ? COLOR_SCHEME.warning : COLOR_SCHEME.error,
                    fontSize: '16px'
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* Sales Breakdown Summary */}
          <div style={{ marginTop: '16px', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
            <Row gutter={16}>
              <Col span={24}>
                <Text strong>Sales Breakdown: </Text>
                <Text>
                  Total Sales ({CashierCalculationUtils.formatCurrency(dailyStats.totalSales)}) = 
                  <Tag color={COLOR_SCHEME.primary} style={{ margin: '0 4px' }}>Cash: {CashierCalculationUtils.formatCurrency(dailyStats.cashAmount)}</Tag> + 
                  <Tag color={COLOR_SCHEME.purple} style={{ margin: '0 4px' }}>Bank/Mpesa: {CashierCalculationUtils.formatCurrency(dailyStats.bankMpesaAmount)}</Tag> + 
                  <Tag color={COLOR_SCHEME.warning} style={{ margin: '0 4px' }}>Credit: {CashierCalculationUtils.formatCurrency(dailyStats.creditAmount)}</Tag>
                </Text>
              </Col>
            </Row>
          </div>
        </Card>

        {/* Credit Sales Percentage Indicator */}
        {dailyStats.totalSales > 0 && (
          <Card size="small" style={{ marginBottom: '24px', borderRadius: '8px' }}>
            <Row gutter={16} align="middle">
              <Col xs={24} sm={8}>
                <Space>
                  <CreditCardOutlined style={{ color: COLOR_SCHEME.warning }} />
                  <Text strong>Credit Sales Percentage:</Text>
                  <Text 
                    strong 
                    style={{ 
                      color: creditPercentage > 30 ? COLOR_SCHEME.error : COLOR_SCHEME.success,
                      fontSize: '16px'
                    }}
                  >
                    {creditPercentage.toFixed(1)}%
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={16}>
                <Progress 
                  percent={Math.round(creditPercentage)}
                  strokeColor={{
                    '0%': COLOR_SCHEME.warning,
                    '100%': COLOR_SCHEME.error,
                  }}
                  format={percent => `${percent}% Credit Sales`}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* Main Tabs - POS and Transactions */}
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
                        color={COLOR_SCHEME.primary} 
                        style={{ marginLeft: 8 }} 
                      />
                      {lowStockProducts.length > 0 && (
                        <Badge 
                          count={`${lowStockProducts.length} Low Stock`} 
                          color={COLOR_SCHEME.warning} 
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
                      <Button 
                        icon={<ReloadOutlined />} 
                        onClick={() => fetchProducts(true)}
                        loading={posLoading.products}
                      >
                        Refresh
                      </Button>
                    </Space>
                  }
                  loading={posLoading.products}
                  style={{ borderRadius: '8px' }}
                >
                  {filteredProducts.length === 0 ? (
                    <Empty
                      description={
                        searchTerm
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

          {/* Today's Transactions Tab */}
          <TabPane 
            tab={
              <span>
                <FileTextOutlined />
                Today's Transactions
                <Badge 
                  count={todayTransactions.length + todayCredits.length} 
                  showZero 
                  style={{ marginLeft: 8 }} 
                />
              </span>
            } 
            key="transactions"
          >
            <TodaysTransactionsCard />
          </TabPane>
        </Tabs>

        {/* Payment Method Modal */}
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

export default CashierDashboard;
// src/pages/Admin/AdminDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layout, Menu, Typography, Card, Row, Col, Table, Tag, Statistic, List, Alert, Spin, 
  Button, Modal, Space, Tooltip, Divider, message, Badge, Avatar, Progress,
  Tabs, Descriptions, Dropdown
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
  CreditCardOutlined
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  transactionAPI, 
  productAPI, 
  shopAPI, 
  cashierAPI, 
  expenseAPI
} from '../../services/api';
import './AdminDashboard.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// =============================================
// ENHANCED CALCULATION UTILITIES
// =============================================

const CalculationUtils = {
  // Safely parse numbers
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  // Format currency
  formatCurrency: (amount) => {
    const value = CalculationUtils.safeNumber(amount);
    return `KES ${value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  },

  // Get profit color
  getProfitColor: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    if (value > 0) return '#3f8600';
    if (value < 0) return '#cf1322';
    return '#d9d9d9';
  },

  // Get profit icon
  getProfitIcon: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    return value >= 0 ? <RiseOutlined /> : <FallOutlined />;
  },

  // Enhanced transaction validation
  validateTransactionData: (transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return CalculationUtils.createFallbackTransaction();
    }
    
    try {
      // Handle different transaction data structures
      const items = transaction.items || [];
      const totalAmount = CalculationUtils.safeNumber(
        transaction.totalAmount || 
        transaction.amount || 
        items.reduce((sum, item) => sum + CalculationUtils.safeNumber(item.totalPrice || item.price), 0)
      );

      const cost = CalculationUtils.safeNumber(
        transaction.cost || 
        items.reduce((sum, item) => sum + (CalculationUtils.safeNumber(item.buyingPrice || item.costPrice) * CalculationUtils.safeNumber(item.quantity)), 0)
      );

      const profit = totalAmount - cost;
      const profitMargin = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;

      const validated = {
        _id: transaction._id?.toString() || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionNumber: transaction.transactionNumber || 
                          transaction.receiptNumber || 
                          transaction._id?.toString()?.substring(0, 8) || 
                          `TXN-${Date.now().toString().slice(-6)}`,
        totalAmount,
        cost,
        profit,
        profitMargin,
        paymentMethod: ['cash', 'mpesa', 'bank', 'card'].includes(transaction.paymentMethod?.toLowerCase()) 
          ? transaction.paymentMethod.toLowerCase() 
          : 'cash',
        status: ['completed', 'pending', 'cancelled', 'refunded'].includes(transaction.status?.toLowerCase())
          ? transaction.status.toLowerCase()
          : 'completed',
        customerName: String(transaction.customerName || transaction.customer || 'Walk-in Customer').trim(),
        cashierName: String(transaction.cashierName || transaction.cashier || 'Unknown Cashier').trim(),
        shop: String(transaction.shop || transaction.shopName || transaction.shopId?.name || 'Unknown Shop').trim(),
        saleDate: transaction.saleDate || transaction.createdAt || transaction.date || new Date(),
        items: Array.isArray(items) ? items : [],
        itemsCount: CalculationUtils.safeNumber(transaction.itemsCount || items.reduce((sum, item) => sum + CalculationUtils.safeNumber(item.quantity), 0)),
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      };
      
      return validated;
    } catch (error) {
      console.error('❌ Error validating transaction:', error);
      return CalculationUtils.createFallbackTransaction();
    }
  },

  // Create fallback transaction
  createFallbackTransaction: () => ({
    _id: `fallback_${Date.now()}`,
    transactionNumber: `FALLBACK-${Date.now()}`,
    totalAmount: 0,
    cost: 0,
    profit: 0,
    profitMargin: 0,
    paymentMethod: 'cash',
    status: 'completed',
    customerName: 'Walk-in Customer',
    cashierName: 'Unknown Cashier',
    shop: 'Unknown Shop',
    saleDate: new Date(),
    items: [],
    itemsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  // Enhanced sales data processing
  processSalesData: (salesData, productsData = [], expensesData = []) => {
    console.log('🔧 Processing sales data:', {
      salesCount: salesData?.length || 0,
      productsCount: productsData?.length || 0,
      expensesCount: expensesData?.length || 0
    });

    if (!salesData || !Array.isArray(salesData)) {
      return { 
        salesWithProfit: [], 
        financialStats: CalculationUtils.getDefaultStats() 
      };
    }

    // Validate all transactions first
    const validatedSalesData = salesData
      .map(CalculationUtils.validateTransactionData)
      .filter(sale => sale && sale.totalAmount >= 0);

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalItemsSold = 0;
    let totalTransactions = validatedSalesData.length;

    const salesWithProfit = validatedSalesData.map(sale => {
      try {
        const saleItems = sale.items || [];
        
        // Calculate item-level profits
        const itemsWithProfit = saleItems.map(item => {
          const product = CalculationUtils.findProduct(productsData, item);
          const buyingPrice = product?.buyingPrice || item.buyingPrice || item.costPrice || 0;
          const quantity = Math.max(1, CalculationUtils.safeNumber(item.quantity, 1));
          const unitPrice = CalculationUtils.safeNumber(item.unitPrice || item.price);
          const itemRevenue = CalculationUtils.safeNumber(item.totalPrice) || (unitPrice * quantity);
          const itemCost = buyingPrice * quantity;
          const itemProfit = itemRevenue - itemCost;
          const itemProfitMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;
          
          return {
            ...item,
            productName: item.productName || product?.name || 'Unknown Product',
            buyingPrice: CalculationUtils.safeNumber(buyingPrice),
            cost: parseFloat(itemCost.toFixed(2)),
            profit: parseFloat(itemProfit.toFixed(2)),
            profitMargin: parseFloat(itemProfitMargin.toFixed(2)),
            quantity,
            unitPrice,
            totalPrice: itemRevenue,
            category: item.category || product?.category || '',
            barcode: item.barcode || product?.barcode || ''
          };
        });

        // Calculate sale totals
        const saleCost = itemsWithProfit.reduce((sum, item) => sum + (item.cost || 0), 0);
        const saleProfit = sale.totalAmount - saleCost;
        const saleProfitMargin = sale.totalAmount > 0 ? (saleProfit / sale.totalAmount) * 100 : 0;
        const saleItemsCount = itemsWithProfit.reduce((sum, item) => sum + (item.quantity || 0), 0);

        // Update totals
        totalRevenue += sale.totalAmount;
        totalCost += saleCost;
        totalProfit += saleProfit;
        totalItemsSold += saleItemsCount;

        const processedSale = {
          ...sale,
          items: itemsWithProfit,
          cost: parseFloat(saleCost.toFixed(2)),
          profit: parseFloat(saleProfit.toFixed(2)),
          profitMargin: parseFloat(saleProfitMargin.toFixed(2)),
          itemsCount: saleItemsCount,
          totalAmount: sale.totalAmount,
          productName: saleItems.length === 1 ? itemsWithProfit[0]?.productName : `${saleItems.length} Items`,
          displayDate: new Date(sale.saleDate).toLocaleDateString('en-KE'),
          displayAmount: CalculationUtils.formatCurrency(sale.totalAmount),
          displayProfit: CalculationUtils.formatCurrency(saleProfit),
          displayMargin: `${saleProfitMargin.toFixed(1)}%`
        };

        return processedSale;
      } catch (saleError) {
        console.error('❌ Error processing sale:', saleError, sale);
        return CalculationUtils.createFallbackSale(sale);
      }
    });

    // Filter valid sales
    const validSales = salesWithProfit.filter(sale => sale && sale.totalAmount >= 0);
    
    // Process expenses
    const safeExpensesData = Array.isArray(expensesData) 
      ? expensesData.filter(exp => exp && CalculationUtils.safeNumber(exp.amount) >= 0)
      : [];
      
    const totalExpenses = safeExpensesData.reduce((sum, expense) => sum + CalculationUtils.safeNumber(expense.amount), 0);
    const netProfit = totalProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const averageTransactionValue = validSales.length > 0 ? totalRevenue / validSales.length : 0;

    const financialStats = {
      totalSales: validSales.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      totalItemsSold,
      averageTransactionValue: parseFloat(averageTransactionValue.toFixed(2)),
      totalTransactions: validSales.length,
      validSalesCount: validSales.length,
      invalidSalesCount: salesData.length - validSales.length,
      timestamp: new Date().toISOString()
    };

    console.log('📈 Final financial stats:', financialStats);
    
    return {
      salesWithProfit: validSales,
      financialStats
    };
  },

  // Find product in products data
  findProduct: (productsData, item) => {
    if (!productsData || !Array.isArray(productsData)) return null;
    
    const productId = item.productId || item.product;
    const productName = item.productName || item.name;
    
    return productsData.find(p => {
      if (!p) return false;
      
      // Direct ID match
      if (productId && p._id && p._id.toString() === productId.toString()) {
        return true;
      }
      
      // Name match
      if (productName && p.name && p.name.toLowerCase() === productName.toLowerCase()) {
        return true;
      }
      
      return false;
    });
  },

  // Create fallback sale
  createFallbackSale: (originalSale) => ({
    ...CalculationUtils.createFallbackTransaction(),
    ...(originalSale || {}),
    items: [],
    cost: 0,
    profit: 0,
    profitMargin: 0,
    itemsCount: 0,
    totalAmount: 0,
    status: 'completed'
  }),

  // Get default stats
  getDefaultStats: () => ({
    totalSales: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    totalProducts: 0,
    totalShops: 0,
    totalCashiers: 0,
    lowStockCount: 0,
    dailyRevenue: 0,
    dailyProfit: 0,
    totalItemsSold: 0,
    averageTransactionValue: 0,
    totalTransactions: 0,
    timestamp: new Date().toISOString(),
    dataQuality: 'no_data'
  }),

  // Calculate top products
  calculateTopProducts: (transactionsData, limit = 10) => {
    if (!transactionsData || !Array.isArray(transactionsData)) {
      return [];
    }

    const productSales = {};
    const validTransactions = transactionsData.filter(t => t && Array.isArray(t.items));
    
    validTransactions.forEach(transaction => {
      transaction.items?.forEach(item => {
        if (!item) return;
        
        const productName = item.productName || 'Unknown Product';
        const productId = item.productId || productName;
        const key = `${productId}-${productName}`;
        
        if (!productSales[key]) {
          productSales[key] = {
            id: productId,
            name: productName,
            totalSold: 0,
            totalRevenue: 0,
            totalProfit: 0,
            totalCost: 0,
            transactions: 0,
            averageQuantity: 0
          };
        }
        
        productSales[key].totalSold += CalculationUtils.safeNumber(item.quantity, 1);
        productSales[key].totalRevenue += CalculationUtils.safeNumber(item.totalPrice);
        productSales[key].totalProfit += CalculationUtils.safeNumber(item.profit);
        productSales[key].totalCost += CalculationUtils.safeNumber(item.cost) * CalculationUtils.safeNumber(item.quantity, 1);
        productSales[key].transactions += 1;
      });
    });
    
    const result = Object.values(productSales)
      .map(product => {
        const profitMargin = product.totalRevenue > 0 ? (product.totalProfit / product.totalRevenue) * 100 : 0;
        const averageQuantity = product.transactions > 0 ? product.totalSold / product.transactions : 0;
        const revenuePerUnit = product.totalSold > 0 ? product.totalRevenue / product.totalSold : 0;
        
        return {
          ...product,
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          averageQuantity: parseFloat(averageQuantity.toFixed(2)),
          revenuePerUnit: parseFloat(revenuePerUnit.toFixed(2)),
          performanceScore: CalculationUtils.calculateProductPerformanceScore(product)
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    return result;
  },

  // Calculate product performance score
  calculateProductPerformanceScore: (product) => {
    const revenueScore = Math.min(100, (product.totalRevenue / 10000) * 100);
    const profitScore = Math.min(100, (product.totalProfit / 5000) * 100);
    const volumeScore = Math.min(100, (product.totalSold / 500) * 100);
    const marginScore = Math.min(100, product.profitMargin * 2);
    
    return parseFloat(((revenueScore * 0.3) + (profitScore * 0.3) + (volumeScore * 0.2) + (marginScore * 0.2)).toFixed(1));
  },

  // Calculate shop performance
  calculateShopPerformance: (transactions) => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    const shopSales = {};
    const validTransactions = transactions.filter(t => t && t.shop);
    
    validTransactions.forEach(sale => {
      const shop = sale.shop;
      if (!shopSales[shop]) {
        shopSales[shop] = { 
          revenue: 0, 
          transactions: 0, 
          profit: 0,
          cost: 0,
          itemsSold: 0,
          averageTransaction: 0,
          profitMargin: 0
        };
      }
      shopSales[shop].revenue += CalculationUtils.safeNumber(sale.totalAmount);
      shopSales[shop].transactions += 1;
      shopSales[shop].profit += CalculationUtils.safeNumber(sale.profit);
      shopSales[shop].cost += CalculationUtils.safeNumber(sale.cost);
      shopSales[shop].itemsSold += CalculationUtils.safeNumber(sale.itemsCount);
    });
    
    // Calculate derived metrics
    const result = Object.entries(shopSales)
      .map(([name, data]) => {
        const averageTransaction = data.transactions > 0 ? data.revenue / data.transactions : 0;
        const profitMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
        const efficiency = data.transactions > 0 ? data.itemsSold / data.transactions : 0;
        
        return { 
          name, 
          ...data,
          revenue: parseFloat(data.revenue.toFixed(2)),
          profit: parseFloat(data.profit.toFixed(2)),
          cost: parseFloat(data.cost.toFixed(2)),
          averageTransaction: parseFloat(averageTransaction.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          efficiency: parseFloat(efficiency.toFixed(2)),
          performanceScore: CalculationUtils.calculateShopPerformanceScore(data)
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .map((shop, index) => ({
        ...shop,
        rank: index + 1,
        performance: CalculationUtils.getPerformanceTier(shop.performanceScore)
      }));

    return result;
  },

  // Calculate shop performance score
  calculateShopPerformanceScore: (data) => {
    const revenueScore = Math.min(100, (data.revenue / 100000) * 100);
    const transactionScore = Math.min(100, (data.transactions / 200) * 100);
    const marginScore = Math.min(100, data.profitMargin * 2);
    const efficiencyScore = Math.min(100, data.efficiency * 20);
    
    return parseFloat(((revenueScore * 0.4) + (transactionScore * 0.2) + (marginScore * 0.2) + (efficiencyScore * 0.2)).toFixed(1));
  },

  // Get performance tier
  getPerformanceTier: (score) => {
    if (score >= 90) return { tier: 'excellent', color: '#52c41a', label: 'Excellent' };
    if (score >= 75) return { tier: 'good', color: '#1890ff', label: 'Good' };
    if (score >= 60) return { tier: 'average', color: '#faad14', label: 'Average' };
    if (score >= 40) return { tier: 'needs_improvement', color: '#fa8c16', label: 'Needs Improvement' };
    return { tier: 'poor', color: '#cf1322', label: 'Poor' };
  },

  // Calculate revenue trends
  calculateRevenueTrends: (transactionsData, period = 'day', days = 7) => {
    if (!transactionsData || !Array.isArray(transactionsData)) {
      return [];
    }

    const validTransactions = transactionsData.filter(t => t && t.saleDate);
    const dailyData = {};
    
    validTransactions.forEach(transaction => {
      const date = new Date(transaction.saleDate);
      const periodKey = date.toISOString().split('T')[0];
      
      if (!dailyData[periodKey]) {
        dailyData[periodKey] = { 
          revenue: 0, 
          transactions: 0, 
          profit: 0,
          cost: 0,
          itemsSold: 0,
          date: periodKey,
          displayDate: new Date(periodKey).toLocaleDateString('en-KE')
        };
      }
      
      dailyData[periodKey].revenue += CalculationUtils.safeNumber(transaction.totalAmount);
      dailyData[periodKey].transactions += 1;
      dailyData[periodKey].profit += CalculationUtils.safeNumber(transaction.profit);
      dailyData[periodKey].cost += CalculationUtils.safeNumber(transaction.cost);
      dailyData[periodKey].itemsSold += CalculationUtils.safeNumber(transaction.itemsCount);
    });
    
    const result = Object.values(dailyData)
      .map(periodData => ({
        ...periodData,
        revenue: parseFloat(periodData.revenue.toFixed(2)),
        profit: parseFloat(periodData.profit.toFixed(2)),
        cost: parseFloat(periodData.cost.toFixed(2)),
        averageTransaction: periodData.transactions > 0 ? periodData.revenue / periodData.transactions : 0,
        profitMargin: periodData.revenue > 0 ? (periodData.profit / periodData.revenue) * 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    return result;
  },

  // Process products data
  processProductsData: (productsData) => {
    if (!productsData || !Array.isArray(productsData)) {
      return [];
    }

    return productsData.map(product => {
      if (!product) return CalculationUtils.createFallbackProduct();
      
      try {
        const buyingPrice = CalculationUtils.safeNumber(product.buyingPrice);
        const sellingPrice = CalculationUtils.safeNumber(product.minSellingPrice || product.sellingPrice || product.price);
        const currentStock = CalculationUtils.safeNumber(product.currentStock || product.stock);
        const minStockLevel = CalculationUtils.safeNumber(product.minStockLevel, 5);
        const profitPerUnit = sellingPrice - buyingPrice;
        const profitMargin = buyingPrice > 0 ? (profitPerUnit / buyingPrice) * 100 : 0;
        const stockValue = currentStock * buyingPrice;
        const potentialRevenue = currentStock * sellingPrice;
        const potentialProfit = currentStock * profitPerUnit;
        
        return {
          ...product,
          name: String(product.name || 'Unnamed Product').trim(),
          category: String(product.category || 'Uncategorized').trim(),
          shop: String(product.shop || product.shopName || product.shopId?.name || 'Unknown Shop').trim(),
          currentStock,
          minStockLevel,
          buyingPrice,
          minSellingPrice: sellingPrice,
          profitPerUnit: parseFloat(profitPerUnit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          stockValue: parseFloat(stockValue.toFixed(2)),
          potentialRevenue: parseFloat(potentialRevenue.toFixed(2)),
          potentialProfit: parseFloat(potentialProfit.toFixed(2)),
          needsReorder: currentStock <= minStockLevel,
          isOutOfStock: currentStock === 0,
          lastUpdated: product.updatedAt || product.lastRestocked || new Date().toISOString()
        };
      } catch (error) {
        console.error('❌ Error processing product:', error, product);
        return CalculationUtils.createFallbackProduct(product);
      }
    }).filter(Boolean);
  },

  // Create fallback product
  createFallbackProduct: (originalProduct = {}) => ({
    _id: originalProduct._id || `fallback_prod_${Date.now()}`,
    name: 'Error Processing Product',
    category: 'Uncategorized',
    shop: 'Unknown Shop',
    currentStock: 0,
    minStockLevel: 5,
    buyingPrice: 0,
    minSellingPrice: 0,
    profitPerUnit: 0,
    profitMargin: 0,
    stockValue: 0,
    potentialRevenue: 0,
    potentialProfit: 0,
    needsReorder: true,
    isOutOfStock: true,
    lastUpdated: new Date().toISOString(),
    ...originalProduct
  }),

  // Get low stock products
  getLowStockProducts: (productsData, threshold = null) => {
    if (!productsData || !Array.isArray(productsData)) return [];
    
    return productsData.filter(product => {
      if (!product) return false;
      const currentStock = CalculationUtils.safeNumber(product.currentStock);
      const minStockLevel = CalculationUtils.safeNumber(product.minStockLevel, 5);
      const thresholdLevel = threshold !== null ? CalculationUtils.safeNumber(threshold) : minStockLevel;
      
      return currentStock <= thresholdLevel;
    }).sort((a, b) => CalculationUtils.safeNumber(a.currentStock) - CalculationUtils.safeNumber(b.currentStock));
  }
};

// =============================================
// MAIN ADMIN DASHBOARD COMPONENT
// =============================================

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    sales: [],
    products: [],
    shops: [],
    cashiers: [],
    expenses: [],
    lowStockProducts: [],
    stats: CalculationUtils.getDefaultStats()
  });
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewModalContent, setViewModalContent] = useState(null);
  const [viewModalTitle, setViewModalTitle] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [activeSalesTab, setActiveSalesTab] = useState('summary');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    
    fetchDashboardData();
    
    return () => clearTimeout(timer);
  }, []);

  // Enhanced data fetching function - NO FILTERS
  const fetchDashboardData = async () => {
    console.log('🚀 START: fetchDashboardData called');
    
    try {
      setLoading(true);
      setRefreshing(true);
      
      // No filter parameters - fetch all data
      console.log('🔄 Calling transactionAPI.getComprehensiveData...');
      const comprehensiveData = await transactionAPI.getComprehensiveData();
      
      const salesData = comprehensiveData?.transactions || [];
      const expensesData = comprehensiveData?.expenses || [];
      const productsData = comprehensiveData?.products || [];
      
      console.log('📊 Data received:', {
        sales: salesData.length,
        expenses: expensesData.length,
        products: productsData.length
      });

      // Get additional data
      console.log('🔄 Fetching additional data...');
      const [shopsResponse, cashiersResponse] = await Promise.all([
        shopAPI.getAll().catch(err => { 
          console.error('Shops error:', err); 
          return { data: [] }; 
        }),
        cashierAPI.getAll().catch(err => { 
          console.error('Cashiers error:', err); 
          return { data: [] }; 
        })
      ]);

      const shopsData = shopsResponse?.data || shopsResponse || [];
      const cashiersData = cashiersResponse?.data || cashiersResponse || [];
  
      console.log('📈 Data summary:', {
        sales: salesData?.length || 0,
        products: productsData?.length || 0,
        shops: shopsData?.length || 0,
        cashiers: cashiersData?.length || 0,
        expenses: expensesData?.length || 0
      });
  
      // Process the data using enhanced utilities
      console.log('🔄 Processing sales data...');
      const { salesWithProfit, financialStats } = CalculationUtils.processSalesData(
        salesData, 
        productsData, 
        expensesData
      );
      console.log('✅ Processed sales:', salesWithProfit.length);
  
      const processedProducts = CalculationUtils.processProductsData(productsData);
      const lowStockProducts = CalculationUtils.getLowStockProducts(processedProducts, 3);

      const stats = {
        ...financialStats,
        totalProducts: processedProducts.length,
        totalShops: shopsData.length,
        totalCashiers: cashiersData.length,
        lowStockCount: lowStockProducts.length
      };

      console.log('📊 Final stats:', stats);
  
      setDashboardData({
        sales: salesWithProfit,
        products: processedProducts,
        shops: shopsData,
        cashiers: cashiersData,
        expenses: expensesData,
        lowStockProducts,
        stats
      });
  
      console.log('✅ Dashboard data set successfully');
      message.success(`Dashboard loaded with ${salesWithProfit.length} transactions`);
  
    } catch (error) {
      console.error('💥 CRITICAL: Dashboard fetch failed:', error);
      message.error('Failed to load dashboard data. Please check your connection.');
      
      // Set empty state with fallback data
      setDashboardData({
        sales: [],
        products: [],
        shops: [],
        cashiers: [],
        expenses: [],
        lowStockProducts: [],
        stats: CalculationUtils.getDefaultStats()
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 END: fetchDashboardData completed');
    }
  };

  // Memoized calculations
  const topSellingProducts = useMemo(() => 
    CalculationUtils.calculateTopProducts(dashboardData.sales), 
    [dashboardData.sales]
  );

  const shopPerformance = useMemo(() => 
    CalculationUtils.calculateShopPerformance(dashboardData.sales), 
    [dashboardData.sales]
  );

  const dailySalesTrend = useMemo(() => 
    CalculationUtils.calculateRevenueTrends(dashboardData.sales), 
    [dashboardData.sales]
  );

  const handleRefreshData = () => {
    fetchDashboardData();
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        stats: dashboardData.stats,
        sales: dashboardData.sales,
        products: dashboardData.products,
        shops: dashboardData.shops,
        cashiers: dashboardData.cashiers,
        expenses: dashboardData.expenses
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

  // Logout functionality
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

  // Enhanced Sales Columns
  const salesColumns = [
    {
      title: 'Transaction ID',
      dataIndex: '_id',
      key: 'transactionId',
      render: (id, record) => (
        <Tooltip title={id}>
          <Text code>{record.transactionNumber || (id ? `${id.substring(0, 8)}...` : 'N/A')}</Text>
        </Tooltip>
      ),
      width: 120
    },
    {
      title: 'Date/Time',
      dataIndex: 'saleDate',
      key: 'saleDate',
      render: (date) => date ? new Date(date).toLocaleString('en-KE') : 'N/A',
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
      title: 'Items',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      render: (count) => <Badge count={count} showZero />,
      sorter: (a, b) => (a.itemsCount || 0) - (b.itemsCount || 0),
      width: 80
    },
    {
      title: 'Shop',
      dataIndex: 'shop',
      key: 'shop',
      render: (text) => <Tag color="blue">{text || 'Unknown'}</Tag>,
      width: 120
    },
    {
      title: 'Cashier',
      dataIndex: 'cashierName',
      key: 'cashierName',
      render: (text) => text || 'Unknown',
      width: 120
    },
    {
      title: 'Revenue',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => CalculationUtils.formatCurrency(amount),
      sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
      width: 120
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => CalculationUtils.formatCurrency(cost),
      sorter: (a, b) => (a.cost || 0) - (b.cost || 0),
      width: 120
    },
    {
      title: 'Profit',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit) => (
        <span style={{ color: CalculationUtils.getProfitColor(profit), fontWeight: 'bold' }}>
          {CalculationUtils.formatCurrency(profit)}
        </span>
      ),
      sorter: (a, b) => (a.profit || 0) - (b.profit || 0),
      width: 120
    },
    {
      title: 'Margin',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (margin) => (
        <Progress 
          percent={Math.min(100, Math.max(0, margin || 0))} 
          size="small" 
          format={percent => `${(percent || 0).toFixed(1)}%`}
          status={margin >= 0 ? 'normal' : 'exception'}
        />
      ),
      sorter: (a, b) => (a.profitMargin || 0) - (b.profitMargin || 0),
      width: 100
    },
    {
      title: 'Payment',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => {
        const isCash = method?.toLowerCase() === 'cash';
        const displayMethod = method === 'bank' ? 'MPESA/BANK' : method?.toUpperCase();
        return (
          <Tag color={isCash ? 'green' : 'blue'}>
            {displayMethod}
          </Tag>
        );
      },
      width: 100
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'completed' ? 'green' : status === 'pending' ? 'orange' : 'red'}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      ),
      width: 100
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails('sale', record)}
          size="small"
        />
      )
    }
  ];

  // Low Stock Products Columns
  const lowStockColumns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ProductOutlined />
          <Text strong={record.isOutOfStock}>{text}</Text>
          {record.isOutOfStock && <Tag color="red">Out of Stock</Tag>}
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag>{text || 'Uncategorized'}</Tag>
    },
    {
      title: 'Current Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock, record) => (
        <Badge 
          count={stock} 
          showZero 
          style={{ 
            backgroundColor: record.isOutOfStock ? '#cf1322' : 
                           record.needsReorder ? '#faad14' : '#52c41a' 
          }}
        />
      )
    },
    {
      title: 'Min Stock',
      dataIndex: 'minStockLevel',
      key: 'minStockLevel',
      render: (min) => <Text>{min}</Text>
    },
    {
      title: 'Buying Price',
      dataIndex: 'buyingPrice',
      key: 'buyingPrice',
      render: (price) => CalculationUtils.formatCurrency(price)
    },
    {
      title: 'Selling Price',
      dataIndex: 'minSellingPrice',
      key: 'minSellingPrice',
      render: (price) => CalculationUtils.formatCurrency(price)
    },
    {
      title: 'Profit/Unit',
      dataIndex: 'profitPerUnit',
      key: 'profitPerUnit',
      render: (profit) => (
        <span style={{ color: CalculationUtils.getProfitColor(profit) }}>
          {CalculationUtils.formatCurrency(profit)}
        </span>
      )
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
              <Button 
                icon={<ReloadOutlined spin={refreshing} />} 
                onClick={handleRefreshData}
                disabled={refreshing}
              >
                Refresh
              </Button>
              <Button 
                icon={<ExportOutlined />} 
                onClick={handleExportData}
                loading={exportLoading}
              >
                Export
              </Button>
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Button type="text" style={{ color: 'white' }}>
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
              >
                Logout
              </Button>
            </Space>
          </div>
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24 }}>
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
              {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}>Loading dashboard data...</div>
                </div>
              ) : (
                <>
                  {/* Enhanced Financial Overview */}
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={24}>
                      <Title level={3}>
                        <LineChartOutlined /> Financial Overview
                      </Title>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Total Revenue" 
                          value={dashboardData.stats.totalRevenue} 
                          prefix="KES" 
                          precision={2}
                          valueStyle={{ color: '#1890ff' }}
                          prefix={<MoneyCollectOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Total Cost" 
                          value={dashboardData.stats.totalCost} 
                          prefix="KES" 
                          precision={2}
                          valueStyle={{ color: '#faad14' }}
                          prefix={<CalculatorOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Gross Profit" 
                          value={dashboardData.stats.totalProfit} 
                          prefix="KES" 
                          precision={2}
                          valueStyle={{ color: CalculationUtils.getProfitColor(dashboardData.stats.totalProfit) }}
                          prefix={CalculationUtils.getProfitIcon(dashboardData.stats.totalProfit)}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Total Expenses" 
                          value={dashboardData.stats.totalExpenses} 
                          prefix="KES" 
                          precision={2}
                          valueStyle={{ color: '#cf1322' }}
                          prefix={<DollarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Net Profit" 
                          value={dashboardData.stats.netProfit} 
                          prefix="KES" 
                          precision={2}
                          valueStyle={{ color: CalculationUtils.getProfitColor(dashboardData.stats.netProfit) }}
                          prefix={CalculationUtils.getProfitIcon(dashboardData.stats.netProfit)}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Profit Margin" 
                          value={dashboardData.stats.profitMargin} 
                          suffix="%" 
                          precision={2}
                          valueStyle={{ 
                            color: dashboardData.stats.profitMargin >= 0 ? '#3f8600' : '#cf1322' 
                          }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Business Overview */}
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={24}>
                      <Title level={3}>
                        <PieChartOutlined /> Business Overview
                      </Title>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Total Sales" 
                          value={dashboardData.stats.totalSales} 
                          valueStyle={{ color: '#722ed1' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Items Sold" 
                          value={dashboardData.stats.totalItemsSold} 
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Avg Transaction" 
                          value={dashboardData.stats.averageTransactionValue} 
                          prefix="KES"
                          precision={2}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic title="Total Products" value={dashboardData.stats.totalProducts} />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic title="Total Shops" value={dashboardData.stats.totalShops} />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={4}>
                      <Card>
                        <Statistic 
                          title="Low Stock Items" 
                          value={dashboardData.stats.lowStockCount} 
                          valueStyle={{ color: dashboardData.stats.lowStockCount > 0 ? '#cf1322' : '#3f8600' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Alerts Section */}
                  {dashboardData.stats.lowStockCount > 0 && (
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col span={24}>
                        <Alert
                          message={`${dashboardData.stats.lowStockCount} products are low on stock`}
                          description="Some products need to be reordered to avoid stockouts."
                          type="warning"
                          showIcon
                          icon={<WarningOutlined />}
                          action={
                            <Button size="small" type="primary" onClick={() => navigate('/admin/inventory')}>
                              View Inventory
                            </Button>
                          }
                        />
                      </Col>
                    </Row>
                  )}

                  {/* Sales Section */}
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={24}>
                      <Card 
                        title={
                          <Space>
                            <ShoppingCartOutlined />
                            Sales Overview
                            <Badge count={dashboardData.stats.totalSales} showZero />
                          </Space>
                        }
                        extra={
                          <Button type="primary" onClick={() => handleViewAll('sales')}>
                            View All Transactions
                          </Button>
                        }
                      >
                        <Tabs activeKey={activeSalesTab} onChange={setActiveSalesTab}>
                          <TabPane tab="Summary" key="summary">
                            <Row gutter={16}>
                              <Col xs={24} md={12}>
                                <Card title="Top Selling Products" size="small">
                                  <List
                                    dataSource={topSellingProducts.slice(0, 5)}
                                    renderItem={(item, index) => (
                                      <List.Item>
                                        <List.Item.Meta
                                          avatar={<Avatar style={{ backgroundColor: index < 3 ? '#1890ff' : '#d9d9d9' }}>{index + 1}</Avatar>}
                                          title={item.name}
                                          description={
                                            <div>
                                              <div>Sold: {item.totalSold} units</div>
                                              <div>Revenue: {CalculationUtils.formatCurrency(item.totalRevenue)}</div>
                                              <div>Profit: {CalculationUtils.formatCurrency(item.totalProfit)}</div>
                                              <div>Margin: {item.profitMargin.toFixed(1)}%</div>
                                            </div>
                                          }
                                        />
                                      </List.Item>
                                    )}
                                  />
                                </Card>
                              </Col>
                              <Col xs={24} md={12}>
                                <Card title="Shop Performance" size="small">
                                  <List
                                    dataSource={shopPerformance.slice(0, 5)}
                                    renderItem={(item, index) => (
                                      <List.Item>
                                        <List.Item.Meta
                                          avatar={<Avatar style={{ backgroundColor: item.performance.color }}>{index + 1}</Avatar>}
                                          title={item.name}
                                          description={
                                            <div>
                                              <div>Revenue: {CalculationUtils.formatCurrency(item.revenue)}</div>
                                              <div>Transactions: {item.transactions}</div>
                                              <div>Profit: {CalculationUtils.formatCurrency(item.profit)}</div>
                                              <div>Performance: {item.performance.label}</div>
                                            </div>
                                          }
                                        />
                                      </List.Item>
                                    )}
                                  />
                                </Card>
                              </Col>
                            </Row>
                          </TabPane>
                          <TabPane tab="Recent Transactions" key="transactions">
                            <Table 
                              dataSource={dashboardData.sales.slice(0, 10)} 
                              columns={salesColumns} 
                              pagination={{ pageSize: 10 }}
                              size="small"
                              scroll={{ x: 1200 }}
                              rowKey="_id"
                            />
                          </TabPane>
                          <TabPane tab="Daily Trend" key="trend">
                            <List
                              dataSource={dailySalesTrend}
                              renderItem={item => (
                                <List.Item>
                                  <List.Item.Meta
                                    title={item.displayDate}
                                    description={
                                      <div>
                                        <div>Revenue: {CalculationUtils.formatCurrency(item.revenue)}</div>
                                        <div>Transactions: {item.transactions}</div>
                                        <div>Profit: {CalculationUtils.formatCurrency(item.profit)}</div>
                                        <div>Items Sold: {item.itemsSold}</div>
                                      </div>
                                    }
                                  />
                                </List.Item>
                              )}
                            />
                          </TabPane>
                        </Tabs>
                      </Card>
                    </Col>
                  </Row>

                  {/* Low Stock Products Section */}
                  {dashboardData.lowStockProducts.length > 0 && (
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col span={24}>
                        <Card 
                          title={
                            <Space>
                              <WarningOutlined />
                              Low Stock Products
                              <Badge count={dashboardData.lowStockProducts.length} showZero style={{ backgroundColor: '#cf1322' }} />
                            </Space>
                          }
                          extra={
                            <Button onClick={() => navigate('/admin/inventory')}>
                              Manage Inventory
                            </Button>
                          }
                        >
                          <Table 
                            dataSource={dashboardData.lowStockProducts} 
                            columns={lowStockColumns} 
                            pagination={{ pageSize: 5 }}
                            size="small"
                            rowKey="_id"
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}
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
            width={800}
            style={{ top: 20 }}
          >
            {viewModalContent && (
              <Descriptions bordered column={2}>
                {Object.entries(viewModalContent).map(([key, value]) => {
                  if (key === 'items' && Array.isArray(value)) {
                    return (
                      <Descriptions.Item label="Items" span={2} key={key}>
                        <List
                          size="small"
                          dataSource={value}
                          renderItem={item => (
                            <List.Item>
                              {item.productName} - {item.quantity} x {CalculationUtils.formatCurrency(item.price)} = {CalculationUtils.formatCurrency(item.totalPrice)}
                            </List.Item>
                          )}
                        />
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'object' && value !== null) {
                    return (
                      <Descriptions.Item label={key} span={2} key={key}>
                        {JSON.stringify(value)}
                      </Descriptions.Item>
                    );
                  }
                  
                  if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
                    return (
                      <Descriptions.Item label={key} key={key}>
                        {CalculationUtils.formatCurrency(value)}
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
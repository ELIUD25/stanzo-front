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
  Popconfirm,
  Descriptions,
  Collapse,
  Switch,
  Form,
  InputNumber
} from 'antd';
import {
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FilterOutlined,
  DownloadOutlined,
  BarChartOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  ShoppingCartOutlined,
  CalculatorOutlined,
  MoneyCollectOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  ExportOutlined,
  AppstoreOutlined,
  TeamOutlined,
  DeleteOutlined,
  ShopOutlined,
  CalendarOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import { transactionAPI, shopAPI, productAPI, cashierAPI, expenseAPI, creditAPI } from '../../services/api';
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
const { Panel } = Collapse;

// =============================================
// ENHANCED CALCULATION UTILITIES
// =============================================

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

  validateTransactionData: (transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return CalculationUtils.createFallbackTransaction();
    }
    
    try {
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
  
      const profit = CalculationUtils.calculateProfit(totalAmount, cost);
      const profitMargin = CalculationUtils.calculateProfitMargin(totalAmount, profit);
  
      // ENHANCED: Better credit detection
      const isCredit = 
        transaction.paymentMethod === 'credit' || 
        transaction.isCredit ||
        transaction.status === 'credit' ||
        (transaction.balanceDue && transaction.balanceDue > 0);
  
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
        paymentMethod: ['cash', 'mpesa', 'bank', 'credit', 'card', 'cash_bank_mpesa'].includes(transaction.paymentMethod?.toLowerCase()) 
          ? transaction.paymentMethod.toLowerCase() 
          : 'cash',
        status: ['completed', 'pending', 'cancelled', 'refunded', 'credit'].includes(transaction.status?.toLowerCase())
          ? transaction.status.toLowerCase()
          : 'completed',
        customerName: String(transaction.customerName || transaction.customer || 'Walk-in Customer').trim(),
        cashierName: String(transaction.cashierName || transaction.cashier || 'Unknown Cashier').trim(),
        shop: String(transaction.shop || transaction.shopName || transaction.shopId?.name || 'Unknown Shop').trim(),
        shopId: transaction.shopId || transaction.shop,
        saleDate: transaction.saleDate || transaction.createdAt || transaction.date || new Date(),
        items: Array.isArray(items) ? items : [],
        itemsCount: CalculationUtils.safeNumber(transaction.itemsCount || items.reduce((sum, item) => sum + CalculationUtils.safeNumber(item.quantity), 0)),
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        // ENHANCED: Better credit field handling
        isCredit: isCredit,
        creditStatus: transaction.creditStatus || (isCredit ? 'pending' : undefined),
        creditAmount: CalculationUtils.safeNumber(transaction.creditAmount),
        creditBalance: CalculationUtils.safeNumber(transaction.creditBalance || transaction.balanceDue),
        amountPaid: CalculationUtils.safeNumber(transaction.amountPaid),
        recognizedRevenue: CalculationUtils.safeNumber(transaction.recognizedRevenue),
        outstandingRevenue: CalculationUtils.safeNumber(transaction.outstandingRevenue)
      };
      
      return validated;
    } catch (error) {
      console.error('❌ Error validating transaction:', error);
      return CalculationUtils.createFallbackTransaction();
    }
  },

  createFallbackTransaction: () => ({
    _id: `fallback_${Date.now()}`,
    transactionNumber: `FALLBACK-${Date.now()}`,
    totalAmount: 0,
    cost: 0,
    profit: 0,
    profitMargin: 100.0,
    paymentMethod: 'cash',
    status: 'completed',
    customerName: 'Walk-in Customer',
    cashierName: 'Unknown Cashier',
    shop: 'Unknown Shop',
    saleDate: new Date(),
    items: [],
    itemsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    amountPaid: 0,
    recognizedRevenue: 0,
    outstandingRevenue: 0
  }),
// ENHANCED: Updated processSalesData function to include both credit and complete transactions
processSalesData: (salesData, productsData = [], expensesData = [], selectedShopId = null, creditsData = []) => {
  console.log('🔧 Processing enhanced sales data with credit integration:', {
    salesCount: salesData?.length || 0,
    productsCount: productsData?.length || 0,
    expensesCount: expensesData?.length || 0,
    creditsCount: creditsData?.length || 0,
    selectedShopId
  });

  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    console.warn('⚠️ No sales data provided or empty array');
    return { 
      salesWithProfit: [], 
      financialStats: CalculationUtils.getDefaultStats() 
    };
  }

  // ENHANCED: Better credit transaction mapping that includes ALL credit transactions
  const mapCreditToTransaction = (transaction, credits) => {
    // Check if this is a credit transaction
    const isCreditTransaction = 
      transaction.paymentMethod === 'credit' || 
      transaction.isCredit ||
      transaction.status === 'credit' ||
      (transaction.balanceDue && transaction.balanceDue > 0);
    
    if (isCreditTransaction) {
      // Try multiple ways to match credit record
      const creditRecord = credits.find(credit => {
        // Direct ID matching
        if (credit.transactionId?._id === transaction._id || 
            credit.transactionId === transaction._id) {
          return true;
        }
        
        // Transaction number matching
        if (credit.transactionNumber === transaction.transactionNumber) {
          return true;
        }
        
        // Customer and amount matching (fallback)
        if (credit.customerName === transaction.customerName && 
            Math.abs(credit.totalAmount - transaction.totalAmount) < 0.01) {
          return true;
        }
        
        return false;
      });
      
      if (creditRecord) {
        return {
          ...transaction,
          isCredit: true,
          creditStatus: creditRecord.status || 'pending',
          creditAmount: creditRecord.totalAmount || transaction.totalAmount,
          amountPaid: creditRecord.amountPaid || transaction.amountPaid || 0,
          creditBalance: creditRecord.balanceDue || (transaction.totalAmount - (transaction.amountPaid || 0)),
          creditDueDate: creditRecord.dueDate,
          creditShopName: creditRecord.creditShopName || creditRecord.shopName,
          // For revenue recognition - only count paid amounts
          recognizedRevenue: creditRecord.amountPaid || transaction.amountPaid || 0,
          outstandingRevenue: creditRecord.balanceDue || (transaction.totalAmount - (transaction.amountPaid || 0))
        };
      } else {
        // If no credit record found but it's a credit transaction, create basic credit data
        return {
          ...transaction,
          isCredit: true,
          creditStatus: transaction.creditStatus || 'pending',
          creditAmount: transaction.totalAmount,
          amountPaid: transaction.amountPaid || 0,
          creditBalance: transaction.balanceDue || (transaction.totalAmount - (transaction.amountPaid || 0)),
          recognizedRevenue: transaction.amountPaid || 0,
          outstandingRevenue: transaction.balanceDue || (transaction.totalAmount - (transaction.amountPaid || 0))
        };
      }
    }
    return transaction;
  };

  // Process all transactions with enhanced credit data
  const transactionsWithCredits = salesData.map(transaction => {
    try {
      return mapCreditToTransaction(transaction, creditsData || []);
    } catch (error) {
      console.error('❌ Error mapping credit data:', error, transaction);
      return transaction; // Return original transaction if mapping fails
    }
  });

  // Filter by shop if specified - BUT DON'T FILTER OUT CREDIT TRANSACTIONS
  let filteredSales = transactionsWithCredits;
  if (selectedShopId && selectedShopId !== 'all') {
    filteredSales = transactionsWithCredits.filter(sale => {
      if (!sale) return false;
      
      const saleShopId = sale.shopId || sale.shop;
      const creditShopId = sale.creditShopId;
      
      // Include transaction if it matches selected shop OR if it's a credit transaction for this shop
      return saleShopId === selectedShopId || creditShopId === selectedShopId;
    });
    console.log(`🏪 Filtered to ${filteredSales.length} transactions for shop: ${selectedShopId}`);
  }

  // Enhanced profit calculation with credit consideration
  const salesWithProfit = filteredSales.map(sale => {
    try {
      const validatedSale = CalculationUtils.validateTransactionData(sale);
      const items = validatedSale.items || [];
      
      // Enhanced item processing with credit consideration
      const itemsWithProfit = items.map(item => {
        const product = CalculationUtils.findProduct(productsData, item);
        const buyingPrice = product?.buyingPrice || item.buyingPrice || item.costPrice || 0;
        const quantity = Math.max(1, CalculationUtils.safeNumber(item.quantity, 1));
        const unitPrice = CalculationUtils.safeNumber(item.unitPrice || item.price);
        const totalPrice = CalculationUtils.safeNumber(item.totalPrice) || (unitPrice * quantity);
        const cost = buyingPrice * quantity;
        const profit = CalculationUtils.calculateProfit(totalPrice, cost);
        const profitMargin = CalculationUtils.calculateProfitMargin(totalPrice, profit);

        return {
          ...item,
          productName: item.productName || product?.name || 'Unknown Product',
          buyingPrice: CalculationUtils.safeNumber(buyingPrice),
          cost: parseFloat(cost.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          quantity,
          unitPrice,
          totalPrice,
          category: item.category || product?.category || '',
          barcode: item.barcode || product?.barcode || ''
        };
      });

      const totalAmount = CalculationUtils.safeNumber(validatedSale.totalAmount) || itemsWithProfit.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalCost = itemsWithProfit.reduce((sum, item) => sum + item.cost, 0);
      
      // ENHANCED: Better profit calculation for credit transactions
      let recognizedAmount = totalAmount;
      let recognizedProfit = CalculationUtils.calculateProfit(totalAmount, totalCost);
      
      if (validatedSale.paymentMethod === 'credit' || validatedSale.isCredit) {
        recognizedAmount = validatedSale.amountPaid || validatedSale.recognizedRevenue || 0;
        // Calculate proportional cost for recognized revenue
        const costProportion = totalAmount > 0 ? recognizedAmount / totalAmount : 1;
        recognizedProfit = CalculationUtils.calculateProfit(recognizedAmount, totalCost * costProportion);
      }
      
      const profitMargin = CalculationUtils.calculateProfitMargin(recognizedAmount, recognizedProfit);
      const itemsCount = itemsWithProfit.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...validatedSale,
        items: itemsWithProfit,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalProfit: parseFloat(recognizedProfit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        itemsCount,
        displayDate: dayjs(validatedSale.saleDate).format('DD/MM/YYYY HH:mm'),
        displayAmount: CalculationUtils.formatCurrency(totalAmount),
        displayProfit: CalculationUtils.formatCurrency(recognizedProfit),
        displayMargin: `${profitMargin.toFixed(1)}%`,
        isCreditTransaction: validatedSale.paymentMethod === 'credit' || validatedSale.isCredit,
        creditDisplay: (validatedSale.paymentMethod === 'credit' || validatedSale.isCredit) ? 
          `Credit: ${CalculationUtils.formatCurrency(validatedSale.creditBalance || (totalAmount - (validatedSale.amountPaid || 0)))} (Paid: ${CalculationUtils.formatCurrency(validatedSale.amountPaid || 0)})` : 'Paid',
        // Enhanced credit fields for reporting
        recognizedRevenue: recognizedAmount,
        outstandingRevenue: (validatedSale.paymentMethod === 'credit' || validatedSale.isCredit) ? 
          (totalAmount - recognizedAmount) : 0
      };
    } catch (error) {
      console.error('❌ Error processing sale:', error, sale);
      return CalculationUtils.createFallbackSale(sale);
    }
  });

  // ENHANCED: Include ALL transactions, not just those with positive amounts
  const validSales = salesWithProfit.filter(sale => 
    sale && (sale.totalAmount > 0 || sale.recognizedRevenue > 0 || sale.outstandingRevenue > 0)
  );
  
  // Enhanced financial statistics with credit recognition
  const totalRevenue = validSales.reduce((sum, sale) => sum + sale.recognizedRevenue, 0);
  const totalCost = validSales.reduce((sum, sale) => sum + sale.totalCost, 0);
  const totalProfit = CalculationUtils.calculateProfit(totalRevenue, totalCost);
  
  // Enhanced credit metrics
  const creditSales = validSales.filter(sale => 
    sale.paymentMethod === 'credit' || sale.isCreditTransaction
  );
  const totalCreditAmount = creditSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const recognizedCreditRevenue = creditSales.reduce((sum, sale) => sum + sale.recognizedRevenue, 0);
  const outstandingCredit = creditSales.reduce((sum, sale) => sum + sale.outstandingRevenue, 0);
  
  // Process expenses
  const safeExpenses = Array.isArray(expensesData) ? expensesData : [];
  let filteredExpenses = safeExpenses;
  if (selectedShopId && selectedShopId !== 'all') {
    filteredExpenses = safeExpenses.filter(expense => expense.shop === selectedShopId);
  }
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + CalculationUtils.safeNumber(expense.amount), 0);
  
  const netProfit = CalculationUtils.calculateProfit(totalProfit, totalExpenses);
  const profitMargin = CalculationUtils.calculateProfitMargin(totalRevenue, netProfit);
  const averageTransactionValue = validSales.length > 0 ? totalRevenue / validSales.length : 0;
  const totalItemsSold = validSales.reduce((sum, sale) => sum + sale.itemsCount, 0);

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
    invalidSalesCount: filteredSales.length - validSales.length,
    selectedShop: selectedShopId || 'all',
    
    // Enhanced credit metrics
    creditSalesCount: creditSales.length,
    totalCreditAmount: parseFloat(totalCreditAmount.toFixed(2)),
    recognizedCreditRevenue: parseFloat(recognizedCreditRevenue.toFixed(2)),
    outstandingCredit: parseFloat(outstandingCredit.toFixed(2)),
    creditCollectionRate: totalCreditAmount > 0 ? (recognizedCreditRevenue / totalCreditAmount) * 100 : 0,
    
    timestamp: new Date().toISOString()
  };

  console.log('📈 Final enhanced financial stats:', financialStats);
  
  return {
    salesWithProfit: validSales,
    financialStats
  };
},
  findProduct: (productsData, item) => {
    if (!productsData || !Array.isArray(productsData)) return null;
    
    const productId = item.productId || item.product;
    const productName = item.productName || item.name;
    
    return productsData.find(p => {
      if (!p) return false;
      
      if (productId && p._id && p._id.toString() === productId.toString()) {
        return true;
      }
      
      if (productName && p.name && p.name.toLowerCase() === productName.toLowerCase()) {
        return true;
      }
      
      if (productId && p._id && p._id._id && p._id._id.toString() === productId.toString()) {
        return true;
      }
      
      if (item.barcode && p.barcode && p.barcode === item.barcode) {
        return true;
      }
      
      return false;
    });
  },

  createFallbackSale: (originalSale) => ({
    ...CalculationUtils.createFallbackTransaction(),
    ...(originalSale || {}),
    items: [],
    cost: 0,
    profit: 0,
    profitMargin: 100.0,
    itemsCount: 0,
    totalAmount: 0,
    status: 'completed'
  }),

  getDefaultStats: () => ({
    totalSales: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 100.0,
    totalProducts: 0,
    totalShops: 0,
    totalCashiers: 0,
    lowStockCount: 0,
    dailyRevenue: 0,
    dailyProfit: 0,
    totalItemsSold: 0,
    averageTransactionValue: 0,
    totalTransactions: 0,
    creditSalesCount: 0,
    totalCreditAmount: 0,
    recognizedCreditRevenue: 0,
    outstandingCredit: 0,
    creditCollectionRate: 0,
    timestamp: new Date().toISOString(),
    dataQuality: 'no_data'
  }),

  calculateTopProducts: (transactionsData, limit = 10, selectedShopId = null) => {
    if (!transactionsData || !Array.isArray(transactionsData)) {
      return [];
    }

    let filteredTransactions = transactionsData;
    if (selectedShopId && selectedShopId !== 'all') {
      filteredTransactions = transactionsData.filter(transaction => {
        const transactionShopId = transaction.shopId || transaction.shop;
        return transactionShopId === selectedShopId;
      });
    }

    const productSales = {};
    const validTransactions = filteredTransactions.filter(t => t && Array.isArray(t.items));
    
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
        const profitMargin = CalculationUtils.calculateProfitMargin(product.totalRevenue, product.totalProfit);
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

  calculateProductPerformanceScore: (product) => {
    const revenueScore = Math.min(100, (product.totalRevenue / 10000) * 100);
    const profitScore = Math.min(100, (product.totalProfit / 5000) * 100);
    const volumeScore = Math.min(100, (product.totalSold / 500) * 100);
    const marginScore = Math.min(100, product.profitMargin * 2);
    
    return parseFloat(((revenueScore * 0.3) + (profitScore * 0.3) + (volumeScore * 0.2) + (marginScore * 0.2)).toFixed(1));
  },

  calculateShopPerformance: (transactions, shops = []) => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    const shopSales = {};
    const validTransactions = transactions.filter(t => t && t.shop);
    
    validTransactions.forEach(sale => {
      const shop = sale.shop;
      const shopId = sale.shopId || shop;
      
      if (!shopSales[shopId]) {
        const shopInfo = shops.find(s => s._id === shopId || s.name === shop);
        const shopName = shopInfo?.name || shop;
        
        shopSales[shopId] = { 
          id: shopId,
          name: shopName,
          revenue: 0, 
          transactions: 0, 
          profit: 0,
          cost: 0,
          itemsSold: 0,
          averageTransaction: 0,
          profitMargin: 100.0
        };
      }
      shopSales[shopId].revenue += CalculationUtils.safeNumber(sale.totalAmount);
      shopSales[shopId].transactions += 1;
      shopSales[shopId].profit += CalculationUtils.safeNumber(sale.profit);
      shopSales[shopId].cost += CalculationUtils.safeNumber(sale.cost);
      shopSales[shopId].itemsSold += CalculationUtils.safeNumber(sale.itemsCount);
    });
    
    const result = Object.values(shopSales)
      .map((data) => {
        const averageTransaction = data.transactions > 0 ? data.revenue / data.transactions : 0;
        const profitMargin = CalculationUtils.calculateProfitMargin(data.revenue, data.profit);
        const efficiency = data.transactions > 0 ? data.itemsSold / data.transactions : 0;
        
        return { 
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

  calculateShopPerformanceScore: (data) => {
    const revenueScore = Math.min(100, (data.revenue / 100000) * 100);
    const transactionScore = Math.min(100, (data.transactions / 200) * 100);
    const marginScore = Math.min(100, data.profitMargin * 2);
    const efficiencyScore = Math.min(100, data.efficiency * 20);
    
    return parseFloat(((revenueScore * 0.4) + (transactionScore * 0.2) + (marginScore * 0.2) + (efficiencyScore * 0.2)).toFixed(1));
  },

  getPerformanceTier: (score) => {
    if (score >= 90) return { tier: 'excellent', color: '#52c41a', label: 'Excellent' };
    if (score >= 75) return { tier: 'good', color: '#1890ff', label: 'Good' };
    if (score >= 60) return { tier: 'average', color: '#faad14', label: 'Average' };
    if (score >= 40) return { tier: 'needs_improvement', color: '#fa8c16', label: 'Needs Improvement' };
    return { tier: 'underperforming', color: '#cf1322', label: 'Underperforming' };
  },

  calculateRevenueTrends: (transactionsData, period = 'day', days = 7, selectedShopId = null) => {
    if (!transactionsData || !Array.isArray(transactionsData)) {
      return [];
    }

    let filteredTransactions = transactionsData;
    if (selectedShopId && selectedShopId !== 'all') {
      filteredTransactions = transactionsData.filter(transaction => {
        const transactionShopId = transaction.shopId || transaction.shop;
        return transactionShopId === selectedShopId;
      });
    }

    const validTransactions = filteredTransactions.filter(t => t && t.saleDate);
    const dailyData = {};
    
    validTransactions.forEach(transaction => {
      const date = dayjs(transaction.saleDate);
      let periodKey;
      
      switch (period) {
        case 'month':
          periodKey = date.format('YYYY-MM');
          break;
        case 'week':
          periodKey = date.format('YYYY-[W]WW');
          break;
        case 'hour':
          periodKey = date.format('YYYY-MM-DD HH:00');
          break;
        default: // day
          periodKey = date.format('YYYY-MM-DD');
      }
      
      if (!dailyData[periodKey]) {
        dailyData[periodKey] = { 
          revenue: 0, 
          transactions: 0, 
          profit: 0,
          cost: 0,
          itemsSold: 0,
          date: periodKey,
          displayDate: CalculationUtils.getDisplayDate(periodKey, period)
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
        profitMargin: CalculationUtils.calculateProfitMargin(periodData.revenue, periodData.profit)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    return result;
  },

  getDisplayDate: (dateString, period) => {
    switch (period) {
      case 'month':
        return dayjs(dateString).format('MMM YYYY');
      case 'week':
        return `Week ${dateString.split('-W')[1]}, ${dateString.split('-')[0]}`;
      case 'hour':
        return dayjs(dateString).format('DD/MM HH:00');
      default: // day
        return dayjs(dateString).format('DD/MM/YYYY');
    }
  }
};

// =============================================
// COMPONENTS
// =============================================

// Shop Filter Component
const ShopFilter = ({ shops, value, onChange, loading }) => (
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

// Enhanced Financial Overview Component
const FinancialOverview = ({ stats, loading, selectedShop, shops }) => {
  const financialMetrics = [
    {
      title: 'Total Revenue',
      value: stats.totalRevenue || 0,
      prefix: 'KES',
      color: '#1890ff',
      icon: <MoneyCollectOutlined />,
      description: 'Total sales revenue (including credit)'
    },
    {
      title: 'Total Cost',
      value: stats.totalCost || 0,
      prefix: 'KES',
      color: '#faad14',
      icon: <CalculatorOutlined />,
      description: 'Total cost of goods sold'
    },
    {
      title: 'Gross Profit',
      value: stats.totalProfit || 0,
      prefix: 'KES',
      color: CalculationUtils.getProfitColor(stats.totalProfit),
      icon: CalculationUtils.getProfitIcon(stats.totalProfit),
      description: 'Revenue minus cost'
    },
    {
      title: 'Total Expenses',
      value: stats.totalExpenses || 0,
      prefix: 'KES',
      color: '#cf1322',
      icon: <DollarOutlined />,
      description: 'Total operating expenses'
    },
    {
      title: 'Net Profit',
      value: stats.netProfit || 0,
      prefix: 'KES',
      color: CalculationUtils.getProfitColor(stats.netProfit),
      icon: CalculationUtils.getProfitIcon(stats.netProfit),
      description: 'Profit after expenses'
    },
    {
      title: 'Profit Margin',
      value: stats.profitMargin || 0,
      suffix: '%',
      color: stats.profitMargin >= 0 ? '#3f8600' : '#cf1322',
      description: 'Net profit percentage'
    },
    {
      title: 'Total Sales',
      value: stats.totalSales || 0,
      color: '#722ed1',
      description: 'Number of transactions'
    },
    {
      title: 'Items Sold',
      value: stats.totalItemsSold || 0,
      color: '#52c41a',
      description: 'Total quantity sold'
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f0f8ff', borderRadius: 6 }}>
        <Text strong>Shop: </Text>
        <Tag color="blue">
          {selectedShop === 'all' ? 'All Shops' : 
           shops?.find(s => s._id === selectedShop)?.name || 'Selected Shop'}
        </Tag>
        <Text style={{ marginLeft: 16 }} type="secondary">
          Showing {stats.totalTransactions || 0} transactions
          {stats.creditSalesCount > 0 && (
            <Text style={{ marginLeft: 8 }} type="secondary">
              ({stats.creditSalesCount} credit sales)
            </Text>
          )}
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {financialMetrics.map((metric, index) => (
          <Col xs={24} sm={12} md={8} lg={6} key={index}>
            <Card 
              loading={loading}
              hoverable
              style={{ transition: 'all 0.3s ease' }}
            >
              <Statistic
                title={
                  <Space>
                    <Tooltip title={metric.description}>
                      <span style={{ cursor: 'help' }}>{metric.title}</span>
                    </Tooltip>
                  </Space>
                }
                value={metric.value}
                prefix={metric.prefix}
                suffix={metric.suffix}
                precision={2}
                valueStyle={{ color: metric.color }}
                formatter={value => (
                  <span style={{ color: metric.color }}>
                    {typeof value === 'number' ? value.toLocaleString('en-KE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) : value}
                  </span>
                )}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                {metric.description}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

// Enhanced Credit Analysis Component
const CreditAnalysis = ({ credits, stats, loading, selectedShop, shops }) => {
  const creditMetrics = [
    {
      title: 'Total Credit Sales',
      value: stats.totalCreditAmount || 0,
      prefix: 'KES',
      color: '#faad14',
      icon: <CreditCardOutlined />,
      description: 'Total sales on credit'
    },
    {
      title: 'Outstanding Credit',
      value: stats.outstandingCredit || 0,
      prefix: 'KES',
      color: '#cf1322',
      icon: <DollarOutlined />,
      description: 'Unpaid credit balance'
    },
    {
      title: 'Credit Sales Count',
      value: stats.creditSalesCount || 0,
      color: '#722ed1',
      icon: <ShoppingCartOutlined />,
      description: 'Number of credit transactions'
    },
    {
      title: 'Credit Collection Rate',
      value: stats.creditCollectionRate || 0,
      suffix: '%',
      color: stats.creditCollectionRate >= 80 ? '#52c41a' : 
             stats.creditCollectionRate >= 60 ? '#faad14' : '#cf1322',
      description: 'Percentage of credit collected'
    },
    {
      title: 'Recognized Credit Revenue',
      value: stats.recognizedCreditRevenue || 0,
      prefix: 'KES',
      color: '#1890ff',
      icon: <MoneyCollectOutlined />,
      description: 'Credit revenue already collected'
    },
    {
      title: 'Average Credit Sale',
      value: stats.creditSalesCount > 0 ? (stats.totalCreditAmount / stats.creditSalesCount) : 0,
      prefix: 'KES',
      color: '#722ed1',
      description: 'Average credit transaction value'
    }
  ];

  return (
    <Card 
      title={
        <Space>
          <CreditCardOutlined />
          Credit Analysis
          <Badge count={stats.creditSalesCount || 0} showZero color="orange" />
        </Space>
      } 
      style={{ marginBottom: 24 }}
      loading={loading}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Shop: {selectedShop === 'all' ? 'All Shops' : shops?.find(s => s._id === selectedShop)?.name || 'Selected Shop'}
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {creditMetrics.map((metric, index) => (
          <Col xs={24} sm={12} md={8} lg={6} key={index}>
            <Card 
              loading={loading}
              hoverable
              style={{ transition: 'all 0.3s ease' }}
            >
              <Statistic
                title={
                  <Space>
                    <Tooltip title={metric.description}>
                      <span style={{ cursor: 'help' }}>{metric.title}</span>
                    </Tooltip>
                  </Space>
                }
                value={metric.value}
                prefix={metric.prefix}
                suffix={metric.suffix}
                precision={2}
                valueStyle={{ color: metric.color }}
                formatter={value => (
                  <span style={{ color: metric.color }}>
                    {typeof value === 'number' ? value.toLocaleString('en-KE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) : value}
                  </span>
                )}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                {metric.description}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {credits && credits.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong>Recent Credit Transactions:</Text>
          <List
            size="small"
            dataSource={credits.slice(0, 5)}
            renderItem={credit => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<CreditCardOutlined />} />}
                  title={credit.customerName || 'Unknown Customer'}
                  description={
                    <Space>
                      <Text>Amount: {CalculationUtils.formatCurrency(credit.totalAmount)}</Text>
                      <Text>Balance: {CalculationUtils.formatCurrency(credit.balanceDue)}</Text>
                      <Tag color={
                        credit.status === 'paid' ? 'green' :
                        credit.status === 'partially_paid' ? 'orange' :
                        credit.status === 'overdue' ? 'red' : 'blue'
                      }>
                        {credit.status?.toUpperCase()}
                      </Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );
};

// Shop Performance Component
const ShopPerformance = ({ transactions, shops, loading, selectedShop }) => {
  const shopPerformance = useMemo(() => {
    return CalculationUtils.calculateShopPerformance(transactions, shops);
  }, [transactions, shops]);

  return (
    <Card 
      title={
        <Space>
          <ShopOutlined />
          Shop Performance Comparison
          <Badge count={shopPerformance.length} showZero color="#1890ff" />
        </Space>
      } 
      style={{ marginBottom: 24 }}
      loading={loading}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Shop: {selectedShop === 'all' ? 'All Shops' : shops?.find(s => s._id === selectedShop)?.name || 'Selected Shop'}
        </Text>
      </div>
      
      {shopPerformance.length > 0 ? (
        <List
          dataSource={shopPerformance}
          renderItem={(shop, index) => (
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
                    <Tag color={shop.performance.color}>{shop.performance.label}</Tag>
                  </Space>
                }
                description={
                  <Row gutter={[16, 8]} style={{ marginTop: 8, width: '100%' }}>
                    <Col xs={24} sm={6}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Revenue</Text>
                        <Text strong style={{ color: '#1890ff' }}>
                          {CalculationUtils.formatCurrency(shop.revenue)}
                        </Text>
                      </Space>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Transactions</Text>
                        <Text strong>{shop.transactions}</Text>
                      </Space>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Avg. Transaction</Text>
                        <Text strong>
                          {CalculationUtils.formatCurrency(shop.averageTransaction)}
                        </Text>
                      </Space>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Profit Margin</Text>
                        <Text strong style={{ color: '#3f8600' }}>
                          {shop.profitMargin.toFixed(1)}%
                        </Text>
                      </Space>
                    </Col>
                  </Row>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No shop performance data available" />
      )}
    </Card>
  );
};

// Cashier Performance Component
const CashierPerformance = ({ transactions, cashiers, loading, selectedShop, shops }) => {
  const cashierPerformance = useMemo(() => {
    let filteredTransactions = transactions;
    if (selectedShop && selectedShop !== 'all') {
      filteredTransactions = transactions.filter(transaction => {
        const transactionShopId = transaction.shopId || transaction.shop;
        return transactionShopId === selectedShop;
      });
    }

    const performance = {};
    
    filteredTransactions.forEach(transaction => {
      const cashierName = transaction.cashierName || 'Unknown Cashier';
      if (!performance[cashierName]) {
        performance[cashierName] = {
          name: cashierName,
          revenue: 0,
          transactions: 0,
          profit: 0,
          itemsSold: 0,
          creditSales: 0,
          creditAmount: 0,
          recognizedCreditRevenue: 0
        };
      }
      performance[cashierName].revenue += transaction.recognizedRevenue || transaction.totalAmount || 0;
      performance[cashierName].profit += transaction.profit || 0;
      performance[cashierName].transactions += 1;
      performance[cashierName].itemsSold += transaction.itemsCount || 0;
      
      if (transaction.paymentMethod === 'credit') {
        performance[cashierName].creditSales += 1;
        performance[cashierName].creditAmount += transaction.totalAmount || 0;
        performance[cashierName].recognizedCreditRevenue += transaction.recognizedRevenue || 0;
      }
    });
    
    return Object.values(performance)
      .map(cashier => ({
        ...cashier,
        averageTransaction: cashier.transactions > 0 ? cashier.revenue / cashier.transactions : 0,
        profitMargin: CalculationUtils.calculateProfitMargin(cashier.revenue, cashier.profit),
        creditRatio: cashier.revenue > 0 ? (cashier.creditAmount / cashier.revenue) * 100 : 0,
        creditCollectionRate: cashier.creditAmount > 0 ? (cashier.recognizedCreditRevenue / cashier.creditAmount) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [transactions, selectedShop]);

  return (
    <Card 
      title={
        <Space>
          <TeamOutlined />
          Cashier Performance
          <Badge count={cashierPerformance.length} showZero color="#1890ff" />
        </Space>
      } 
      style={{ marginBottom: 24 }}
      loading={loading}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Shop: {selectedShop === 'all' ? 'All Shops' : shops?.find(s => s._id === selectedShop)?.name || 'Selected Shop'}
        </Text>
      </div>
      
      {cashierPerformance.length > 0 ? (
        <List
          dataSource={cashierPerformance}
          renderItem={(cashier, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Badge count={index + 1} offset={[-5, 5]} color={index < 3 ? '#52c41a' : '#d9d9d9'}>
                    <Avatar 
                      style={{ 
                        backgroundColor: index < 3 ? '#52c41a' : '#d9d9d9',
                        color: index < 3 ? '#fff' : '#000'
                      }}
                    >
                      {cashier.name?.charAt(0)?.toUpperCase() || 'C'}
                    </Avatar>
                  </Badge>
                }
                title={
                  <Space>
                    <Text strong>{cashier.name}</Text>
                    {index < 3 && <Tag color="green">Top Performer</Tag>}
                    {cashier.creditSales > 0 && (
                      <Tag color="orange">{cashier.creditSales} credit sales</Tag>
                    )}
                  </Space>
                }
                description={
                  <Row gutter={[16, 8]} style={{ marginTop: 8, width: '100%' }}>
                    <Col xs={24} sm={6}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Revenue</Text>
                        <Text strong style={{ color: '#1890ff' }}>
                          {CalculationUtils.formatCurrency(cashier.revenue)}
                        </Text>
                      </Space>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Transactions</Text>
                        <Text strong>{cashier.transactions}</Text>
                      </Space>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Avg. Transaction</Text>
                        <Text strong>
                          {CalculationUtils.formatCurrency(cashier.averageTransaction)}
                        </Text>
                      </Space>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Profit Margin</Text>
                        <Text strong style={{ color: '#3f8600' }}>
                          {cashier.profitMargin.toFixed(1)}%
                        </Text>
                      </Space>
                    </Col>
                    {cashier.creditSales > 0 && (
                      <Col xs={24} sm={6}>
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Credit Collection</Text>
                          <Text strong style={{ color: cashier.creditCollectionRate >= 80 ? '#3f8600' : '#faad14' }}>
                            {cashier.creditCollectionRate.toFixed(1)}%
                          </Text>
                        </Space>
                      </Col>
                    )}
                  </Row>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No cashier performance data available" />
      )}
    </Card>
  );
};

// Product Performance Component
const ProductPerformance = ({ topProducts, loading, selectedShop, shops }) => (
  <Card 
    title={
      <Space>
        <AppstoreOutlined />
        Product Performance Analysis
        <Badge count={topProducts.length} showZero color="#1890ff" />
      </Space>
    } 
    style={{ marginBottom: 24 }}
    loading={loading}
  >
    <div style={{ marginBottom: 16 }}>
      <Text type="secondary">
        Shop: {selectedShop === 'all' ? 'All Shops' : shops?.find(s => s._id === selectedShop)?.name || 'Selected Shop'}
      </Text>
    </div>
    
    {topProducts.length > 0 ? (
      <List
        dataSource={topProducts}
        renderItem={(product, index) => (
          <List.Item
            actions={[
              <Tooltip key="view" title="View product details">
                <Button type="link" icon={<EyeOutlined />} size="small" />
              </Tooltip>
            ]}
          >
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
                  <Col xs={24} sm={6}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Revenue</Text>
                      <Text strong style={{ color: '#1890ff' }}>
                        {CalculationUtils.formatCurrency(product.totalRevenue)}
                      </Text>
                    </Space>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Profit</Text>
                      <Text strong style={{ color: CalculationUtils.getProfitColor(product.totalProfit) }}>
                        {CalculationUtils.formatCurrency(product.totalProfit)}
                      </Text>
                    </Space>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Avg. Price</Text>
                      <Text strong>
                        {CalculationUtils.formatCurrency(product.revenuePerUnit)}
                      </Text>
                    </Space>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Profit Margin</Text>
                      <Text strong style={{ color: '#3f8600' }}>
                        {product.profitMargin.toFixed(1)}%
                      </Text>
                    </Space>
                  </Col>
                </Row>
              }
            />
          </List.Item>
        )}
      />
    ) : (
      <Empty description="No product sales data available" />
    )}
  </Card>
);

// Export Report Modal
const ExportReportModal = ({ visible, onCancel, data, filters, loading, selectedShop, shops }) => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  const handleExport = async () => {
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (exportFormat === 'csv') {
        const headers = ['Transaction ID', 'Date', 'Customer', 'Cashier', 'Shop', 'Total Amount', 'Cost', 'Profit', 'Margin', 'Payment Method', 'Status', 'Items Count', 'Credit Status', 'Amount Paid', 'Balance Due'];
        const csvContent = [
          headers.join(','),
          ...data.transactions.map(transaction => [
            transaction.transactionNumber || transaction.receiptNumber || transaction._id,
            dayjs(transaction.createdAt || transaction.saleDate).format('YYYY-MM-DD HH:mm'),
            transaction.customerName || 'Walk-in',
            transaction.cashierName,
            transaction.shop,
            transaction.totalAmount,
            transaction.cost,
            transaction.profit,
            transaction.profitMargin?.toFixed(2) + '%',
            transaction.paymentMethod,
            transaction.status,
            transaction.itemsCount,
            transaction.paymentMethod === 'credit' ? (transaction.creditStatus || 'pending') : 'N/A',
            transaction.amountPaid || 0,
            transaction.creditBalance || 0
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions-report-${dayjs().format('YYYY-MM-DD')}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else if (exportFormat === 'json') {
        const shopName = selectedShop === 'all' ? 'All Shops' : shops.find(s => s._id === selectedShop)?.name || 'Selected Shop';
        
        const exportData = {
          metadata: {
            exportedAt: new Date().toISOString(),
            totalTransactions: data.transactions.length,
            filters: {
              ...filters,
              shop: shopName
            },
            summary: data.stats
          },
          transactions: data.transactions
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions-report-${dayjs().format('YYYY-MM-DD')}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      }

      message.success(`Exported ${data.transactions.length} transactions in ${exportFormat.toUpperCase()} format!`);
      onCancel();
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const shopName = selectedShop === 'all' ? 'All Shops' : shops.find(s => s._id === selectedShop)?.name || 'Selected Shop';

  return (
    <Modal
      title={
        <Space>
          <ExportOutlined />
          Export Report
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={exporting}>
          Cancel
        </Button>,
        <Button 
          key="export" 
          type="primary" 
          onClick={handleExport} 
          loading={exporting}
          icon={<DownloadOutlined />}
        >
          Export ({exportFormat.toUpperCase()})
        </Button>
      ]}
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text strong>Export Options</Text>
        
        <Form layout="vertical">
          <Form.Item label="Export Format">
            <Select value={exportFormat} onChange={setExportFormat}>
              <Option value="csv">CSV (Excel Compatible)</Option>
              <Option value="json">JSON (Structured Data)</Option>
            </Select>
          </Form.Item>
        </Form>
        
        <Divider />
        
        <Text type="secondary">
          This will export <Text strong>{data.transactions.length}</Text> transactions to {exportFormat.toUpperCase()} format.
          <div style={{ marginTop: 8 }}>
            <Text strong>Shop: </Text>
            <Tag color="blue">{shopName}</Tag>
          </div>
          {filters.dateRange && (
            <div>
              Date Range: {dayjs(filters.dateRange[0]).format('DD/MM/YYYY')} - {dayjs(filters.dateRange[1]).format('DD/MM/YYYY')}
            </div>
          )}
        </Text>
      </Space>
    </Modal>
  );
};

// Enhanced Transaction Details Modal
const TransactionDetailsModal = ({ transaction, visible, onCancel, shops }) => {
  if (!transaction) return null;

  const shopName = transaction.shop || shops.find(s => s._id === transaction.shopId)?.name || 'Unknown Shop';

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          Transaction Details
          <Tag color={transaction.status === 'completed' ? 'green' : 'orange'}>
            {transaction.status?.toUpperCase()}
          </Tag>
          {transaction.paymentMethod === 'credit' && (
            <Tag color="orange">
              CREDIT - {transaction.creditStatus?.toUpperCase() || 'PENDING'}
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
          {dayjs(transaction.saleDate).format('DD/MM/YYYY HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="Customer">
          {transaction.customerName || 'Walk-in Customer'}
        </Descriptions.Item>
        <Descriptions.Item label="Shop">
          {shopName}
        </Descriptions.Item>
        <Descriptions.Item label="Cashier">
          {transaction.cashierName}
        </Descriptions.Item>
        <Descriptions.Item label="Payment Method">
          <Tag color={transaction.paymentMethod === 'cash' ? 'orange' : transaction.paymentMethod === 'credit' ? 'red' : 'green'}>
            {transaction.paymentMethod?.toUpperCase()}
          </Tag>
        </Descriptions.Item>
        {transaction.paymentMethod === 'credit' && (
          <>
            <Descriptions.Item label="Credit Status">
              <Tag color={
                transaction.creditStatus === 'paid' ? 'green' :
                transaction.creditStatus === 'partially_paid' ? 'orange' :
                transaction.creditStatus === 'overdue' ? 'red' : 'blue'
              }>
                {transaction.creditStatus?.toUpperCase() || 'PENDING'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Amount Paid">
              <Text strong type="success">
                {CalculationUtils.formatCurrency(transaction.amountPaid || 0)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Credit Balance">
              <Text strong type="danger">
                {CalculationUtils.formatCurrency(transaction.creditBalance || transaction.totalAmount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Recognized Revenue">
              <Text strong type="success">
                {CalculationUtils.formatCurrency(transaction.recognizedRevenue || 0)}
              </Text>
            </Descriptions.Item>
          </>
        )}
        <Descriptions.Item label="Total Amount">
          <Text strong style={{ color: '#1890ff' }}>
            {CalculationUtils.formatCurrency(transaction.totalAmount)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Total Cost">
          <Text style={{ color: '#faad14' }}>
            {CalculationUtils.formatCurrency(transaction.cost)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Profit">
          <Text strong style={{ color: CalculationUtils.getProfitColor(transaction.profit) }}>
            {CalculationUtils.formatCurrency(transaction.profit)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Profit Margin">
          <Text strong style={{ color: '#3f8600' }}>
            {transaction.profitMargin?.toFixed(1)}%
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Divider>Items ({transaction.items?.length || 0})</Divider>
      
      {transaction.items?.length > 0 ? (
        <List
          size="small"
          dataSource={transaction.items}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar size="small">{index + 1}</Avatar>}
                title={
                  <Space>
                    <Text strong>{item.productName}</Text>
                    <Tag color="blue">Qty: {item.quantity}</Tag>
                  </Space>
                }
                description={
                  <Row gutter={16} style={{ width: '100%' }}>
                    <Col span={6}>
                      <Text type="secondary">Price: </Text>
                      <Text>{CalculationUtils.formatCurrency(item.price)}</Text>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">Total: </Text>
                      <Text strong>{CalculationUtils.formatCurrency(item.totalPrice)}</Text>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">Profit: </Text>
                      <Text style={{ color: CalculationUtils.getProfitColor(item.profit) }}>
                        {CalculationUtils.formatCurrency(item.profit)}
                      </Text>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">Margin: </Text>
                      <Text style={{ color: '#3f8600' }}>{item.profitMargin?.toFixed(1)}%</Text>
                    </Col>
                  </Row>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No items found" />
      )}
    </Modal>
  );
};

// Report Settings Component
const ReportSettings = ({ settings, onSettingsChange }) => {
  const [visible, setVisible] = useState(false);

  const handleSettingChange = (key, value) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <>
      <Button 
        icon={<SettingOutlined />} 
        onClick={() => setVisible(true)}
        type="text"
      >
        Settings
      </Button>
      
      <Modal
        title="Report Settings"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setVisible(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={() => setVisible(false)}>
            Save Settings
          </Button>
        ]}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>Display Settings</Text>
          
          <Form layout="vertical">
            <Form.Item label="Auto-refresh Interval (minutes)">
              <InputNumber
                min={1}
                max={60}
                value={settings.autoRefreshInterval}
                onChange={(value) => handleSettingChange('autoRefreshInterval', value)}
                style={{ width: '100%' }}
              />
            </Form.Item>
            
            <Form.Item label="Default Date Range">
              <Select
                value={settings.defaultDateRange}
                onChange={(value) => handleSettingChange('defaultDateRange', value)}
                style={{ width: '100%' }}
              >
                <Option value="7d">Last 7 Days</Option>
                <Option value="30d">Last 30 Days</Option>
                <Option value="90d">Last 90 Days</Option>
                <Option value="custom">Custom Range</Option>
              </Select>
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Switch 
                  checked={settings.showProfitMargins} 
                  onChange={(checked) => handleSettingChange('showProfitMargins', checked)}
                />
                <Text>Show Profit Margins</Text>
              </Space>
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Switch 
                  checked={settings.includeExpenses} 
                  onChange={(checked) => handleSettingChange('includeExpenses', checked)}
                />
                <Text>Include Expenses in Calculations</Text>
              </Space>
            </Form.Item>

            <Form.Item>
              <Space>
                <Switch 
                  checked={settings.includeCreditInRevenue} 
                  onChange={(checked) => handleSettingChange('includeCreditInRevenue', checked)}
                />
                <Text>Include Credit Sales in Revenue</Text>
              </Space>
            </Form.Item>

            <Form.Item>
              <Space>
                <Switch 
                  checked={settings.showCreditCollectionRate} 
                  onChange={(checked) => handleSettingChange('showCreditCollectionRate', checked)}
                />
                <Text>Show Credit Collection Rate</Text>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </>
  );
};

// Search Help Component
const SearchHelp = () => (
  <div style={{ marginBottom: 8 }}>
    <Text type="secondary" style={{ fontSize: '12px' }}>
      💡 Search tips: You can search by product name, customer name, cashier name, shop name, transaction ID, or payment method
    </Text>
  </div>
);

// Time Range Filter Component
const TimeRangeFilter = ({ value, onChange }) => {
  const options = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'This Year', value: 'yearly' },
    { label: 'All Time', value: 'all' },
    { label: 'Custom Range', value: 'custom' }
  ];

  return (
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
        {options.map(option => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Select>
    </div>
  );
};

// Payment Mode Filter Component
const PaymentModeFilter = ({ value, onChange }) => {
  const options = [
    { label: 'CASH', value: 'cash' },
    { label: 'MPESA/BANK', value: 'mpesa' },
    { label: 'CREDIT', value: 'credit' }
  ];

  return (
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
        {options.map(option => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Select>
    </div>
  );
};

// =============================================
// UPDATED MAIN TRANSACTIONS REPORT COMPONENT
// =============================================

const TransactionsReport = ({ currentUser }) => {
  // State management
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [timeRangeFilter, setTimeRangeFilter] = useState('yearly');
  const [selectedShop, setSelectedShop] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [shops, setShops] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [settings, setSettings] = useState({
    autoRefreshInterval: 5,
    defaultDateRange: 'yearly',
    showProfitMargins: true,
    includeExpenses: true,
    includeCreditInRevenue: true,
    showCreditCollectionRate: true
  });

  // Error boundary state
  const [hasError, setHasError] = useState(false);

  // Stats state
  const [stats, setStats] = useState(CalculationUtils.getDefaultStats());

  // Calculate date range based on timeRangeFilter
  const calculateDateRange = useCallback((rangeType) => {
    const now = dayjs();
    let startDate;

    switch (rangeType) {
      case '7d':
        startDate = now.subtract(7, 'days');
        break;
      case '30d':
        startDate = now.subtract(30, 'days');
        break;
      case '90d':
        startDate = now.subtract(90, 'days');
        break;
      case 'yearly':
        startDate = now.startOf('year');
        break;
      case 'all':
        return null;
      case 'custom':
        return dateRange;
      default:
        startDate = now.startOf('year');
    }

    return [startDate, now];
  }, [dateRange]);

  // Update date range when timeRangeFilter changes
  useEffect(() => {
    const newDateRange = calculateDateRange(timeRangeFilter);
    setDateRange(newDateRange);
  }, [timeRangeFilter, calculateDateRange]);

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      console.error('Component error:', error);
      setHasError(true);
      setError('Component error occurred. Please refresh the page.');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Auto-fetch data when filters change
  useEffect(() => {
    fetchAllData();
  }, [selectedShop, timeRangeFilter, paymentMethodFilter]);

 // ENHANCED: Updated fetch function with better credit integration
const fetchAllData = useCallback(async () => {
  if (loading) {
    console.log('⏳ Skipping fetch - already loading');
    return;
  }

  console.log('🚀 START: Enhanced fetchAllData for Transaction Reports');
  
  setLoading(true);
  setError(null);
  
  try {
    const params = {};
    
    // Apply filters
    if (dateRange && dateRange.length === 2) {
      params.startDate = dayjs(dateRange[0]).format('YYYY-MM-DD');
      params.endDate = dayjs(dateRange[1]).format('YYYY-MM-DD');
    } else if (timeRangeFilter !== 'all') {
      const calculatedRange = calculateDateRange(timeRangeFilter);
      if (calculatedRange && calculatedRange.length === 2) {
        params.startDate = dayjs(calculatedRange[0]).format('YYYY-MM-DD');
        params.endDate = dayjs(calculatedRange[1]).format('YYYY-MM-DD');
      }
    }
    
    if (paymentMethodFilter) {
      params.paymentMethod = paymentMethodFilter;
    }

    if (selectedShop && selectedShop !== 'all') {
      params.shopId = selectedShop;
    }

    console.log('📋 Fetch parameters for enhanced report:', params);

    // ENHANCED: Fetch ALL transactions including credit ones
    const [transactionsResponse, creditsResponse, shopsResponse, cashiersResponse] = await Promise.all([
      transactionAPI.getAll({ ...params, status: 'all' }), // Get all statuses
      creditAPI.getAll(params),
      shopAPI.getAll(),
      cashierAPI.getAll()
    ]);

    // Process transactions and credits together
    const transactions = Array.isArray(transactionsResponse) ? transactionsResponse : [];
    const credits = Array.isArray(creditsResponse?.data) ? creditsResponse.data : creditsResponse || [];
    const shops = Array.isArray(shopsResponse?.data) ? shopsResponse.data : shopsResponse || [];
    const cashiers = Array.isArray(cashiersResponse?.data) ? cashiersResponse.data : cashiersResponse || [];

    console.log('✅ Enhanced data received:', {
      transactions: transactions.length,
      credits: credits.length,
      shops: shops.length,
      cashiers: cashiers.length
    });

    // Process data with enhanced credit integration
    const { salesWithProfit, financialStats } = CalculationUtils.processSalesData(
      transactions, 
      [], // Products will be fetched separately if needed
      [], // Expenses will be fetched separately if needed
      selectedShop,
      credits
    );

    setTransactions(salesWithProfit);
    setShops(shops);
    setCashiers(cashiers);
    setCredits(credits);

    // Calculate additional stats
    const topProducts = CalculationUtils.calculateTopProducts(salesWithProfit, 10, selectedShop);
    const shopPerformance = CalculationUtils.calculateShopPerformance(salesWithProfit, shops);

    // Update stats with enhanced credit data
    const enhancedStatsData = {
      ...financialStats,
      topProducts,
      shopPerformance,
      credits: credits,
      timestamp: new Date().toISOString()
    };

    setStats(enhancedStatsData);

    // Show success message with credit information
    const transactionCount = salesWithProfit.length;
    const creditCount = credits.length;
    const creditTransactionCount = salesWithProfit.filter(t => t.isCreditTransaction).length;
    
    if (transactionCount > 0) {
      const shopName = selectedShop === 'all' ? 'All Shops' : shops.find(s => s._id === selectedShop)?.name || 'Selected Shop';
      message.success(`Loaded ${transactionCount} transactions (${creditTransactionCount} credit) and ${creditCount} credit records for ${shopName}`);
    } else {
      message.info('No transactions found for the selected filters');
    }

  } catch (error) {
    console.error('❌ Main error fetching data:', error);
    const errorMessage = error.response?.data?.message || 
                      error.response?.data?.error || 
                      error.message || 
                      'Failed to load transaction data. Please try again.';
    setError(errorMessage);
    message.error(errorMessage);
  } finally {
    setLoading(false);
    console.log('🏁 END: fetchAllData completed');
  }
}, [dateRange, paymentMethodFilter, selectedShop, timeRangeFilter, calculateDateRange, loading]);
  // Event handlers
  const handleViewTransaction = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setViewModalVisible(true);
  }, []);

  const handleDeleteTransaction = async (transactionId) => {
    try {
      setLoading(true);
      await transactionAPI.delete(transactionId);
      
      await fetchAllData();
      message.success('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      message.error('Failed to delete transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = useCallback(() => {
    setExportModalVisible(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAllData();
    message.success('Data refreshed successfully');
  }, [fetchAllData]);

  const clearFilters = useCallback(() => {
    setPaymentMethodFilter('');
    setTimeRangeFilter('yearly');
    setSelectedShop('all');
    setDateRange(null);
    setSearchText('');
    message.info('Filters cleared - showing yearly data');
  }, []);

  // Utility functions
  const getPaymentMethodColor = useCallback((method) => {
    const colors = {
      cash: 'orange',
      mpesa: 'green',
      bank: 'blue',
      credit: 'red'
    };
    return colors[method?.toLowerCase()] || 'default';
  }, []);

  const getStatusColor = useCallback((status) => {
    const colors = {
      completed: 'green',
      pending: 'orange',
      refunded: 'blue',
      cancelled: 'red'
    };
    return colors[status?.toLowerCase()] || 'default';
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return 'N/A';
    return dayjs(date).format('DD/MM/YYYY HH:mm');
  }, []);

  // Enhanced search functionality
  const searchPlaceholder = "Search transactions... (product name, customer, cashier, shop, transaction ID, payment method)";

  // Filtered data with enhanced search
  const filteredTransactions = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return [];
    
    const searchLower = searchText.toLowerCase().trim();
    
    if (!searchLower) return transactions;
    
    return transactions.filter(transaction => {
      if (!transaction) return false;
      
      const searchFields = [
        transaction.cashierName,
        transaction.shop,
        transaction.paymentMethod,
        transaction.transactionNumber,
        transaction.customerName,
        ...(transaction.items?.map(item => item.productName) || []),
        ...(transaction.items?.map(item => item.category) || [])
      ].filter(Boolean).map(field => field.toLowerCase());

      return searchFields.some(field => field.includes(searchLower));
    });
  }, [transactions, searchText]);

  // ENHANCED: Table columns with credit status and revenue recognition
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
      render: formatDate,
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
      render: (text, record) => {
        const shopName = text || shops.find(s => s._id === record.shopId)?.name || 'Unknown Shop';
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
      title: 'Revenue',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1890ff' }}>
            {CalculationUtils.formatCurrency(amount)}
          </Text>
          {record.paymentMethod === 'credit' && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Credit
            </Text>
          )}
        </Space>
      ),
      sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
      width: 120
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => (
        <Text style={{ color: '#faad14' }}>
          {CalculationUtils.formatCurrency(cost)}
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
          {CalculationUtils.formatCurrency(profit)}
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
          {margin?.toFixed(1)}%
        </Text>
      ),
      width: 100
    },
    {
      title: 'Payment & Credit Status',
      key: 'paymentCreditStatus',
      width: 180,
      render: (_, record) => {
        const isCredit = record.paymentMethod === 'credit' || record.isCredit;
        
        return (
          <Space direction="vertical" size={0}>
            <Tag color={getPaymentMethodColor(record.paymentMethod)}>
              {record.paymentMethod?.toUpperCase()}
            </Tag>
            {isCredit && (
              <Tag 
                color={
                  record.creditStatus === 'paid' ? 'green' :
                  record.creditStatus === 'partially_paid' ? 'orange' :
                  record.creditStatus === 'overdue' ? 'red' : 'blue'
                }
                style={{ fontSize: '10px', marginTop: '2px' }}
              >
                {record.creditStatus?.toUpperCase() || 'PENDING'}
              </Tag>
            )}
            {isCredit && record.amountPaid > 0 && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                Paid: {CalculationUtils.formatCurrency(record.amountPaid)}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Revenue Recognition',
      key: 'revenueRecognition',
      width: 150,
      render: (_, record) => {
        const isCredit = record.paymentMethod === 'credit' || record.isCredit;
        
        if (!isCredit) {
          return (
            <Text strong type="success">
              {CalculationUtils.formatCurrency(record.totalAmount)}
            </Text>
          );
        }
        
        return (
          <Space direction="vertical" size={0}>
            <Text strong type="success" style={{ fontSize: '12px' }}>
              Recognized: {CalculationUtils.formatCurrency(record.recognizedRevenue || record.amountPaid || 0)}
            </Text>
            {record.outstandingRevenue > 0 && (
              <Text type="danger" style={{ fontSize: '10px' }}>
                Outstanding: {CalculationUtils.formatCurrency(record.outstandingRevenue)}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      ),
      width: 100
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewTransaction(record)}
            size="small"
          >
            View
          </Button>
          <Popconfirm
            title="Delete Transaction"
            description="Are you sure you want to delete this transaction? This action cannot be undone."
            onConfirm={() => handleDeleteTransaction(record._id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [
    formatDate, 
    CalculationUtils.formatCurrency, 
    CalculationUtils.getProfitColor,
    getPaymentMethodColor, 
    getStatusColor, 
    handleViewTransaction,
    handleDeleteTransaction,
    shops
  ]);

  // Enhanced Overview Tab with new arrangement
  const renderOverviewTab = () => (
    <div>
      <FinancialOverview 
        stats={stats} 
        loading={loading} 
        selectedShop={selectedShop}
        shops={shops}
      />
      
      <CreditAnalysis
        credits={stats.credits}
        stats={stats}
        loading={loading}
        selectedShop={selectedShop}
        shops={shops}
      />
      
      <ShopPerformance 
        transactions={transactions} 
        shops={shops} 
        loading={loading}
        selectedShop={selectedShop}
      />
      
      <CashierPerformance 
        transactions={transactions} 
        cashiers={cashiers} 
        loading={loading} 
        selectedShop={selectedShop}
        shops={shops}
      />
      
      <ProductPerformance 
        topProducts={stats.topProducts || []} 
        loading={loading} 
        selectedShop={selectedShop}
        shops={shops}
      />
    </div>
  );

  // Error boundary check
  if (hasError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Alert
          message="Error Loading Reports"
          description="There was an error loading the transaction reports. Please refresh the page and try again."
          type="error"
          showIcon
        />
        <Button 
          type="primary" 
          onClick={() => window.location.reload()}
          style={{ marginTop: 16 }}
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  // Main render
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2}>
          <BarChartOutlined /> Transactions Report
          {currentUser?.role === 'cashier' && <Tag color="blue" style={{ marginLeft: 8 }}>My Transactions</Tag>}
        </Title>
        
        <Space>
          <ReportSettings settings={settings} onSettingsChange={setSettings} />
          
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            icon={<FilterOutlined />}
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exportLoading}
          >
            Export Report
          </Button>
        </Space>
      </div>

      {/* Enhanced Filters Section */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <SearchHelp />
            <Input
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          
          {/* Shop Filter */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <ShopFilter 
              shops={shops}
              value={selectedShop}
              onChange={setSelectedShop}
              loading={loading}
            />
          </Col>

          {/* Time Range Filter */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <TimeRangeFilter 
              value={timeRangeFilter}
              onChange={setTimeRangeFilter}
            />
          </Col>

          {/* Payment Mode Filter */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <PaymentModeFilter 
              value={paymentMethodFilter}
              onChange={setPaymentMethodFilter}
            />
          </Col>

          {/* Custom Date Range - Only show when custom is selected */}
          {timeRangeFilter === 'custom' && (
            <Col xs={24} sm={24} md={8} lg={6}>
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Custom Date Range:</Text>
                </div>
                <RangePicker
                  onChange={setDateRange}
                  value={dateRange}
                  style={{ width: '100%' }}
                  allowClear
                  placeholder={['Start Date', 'End Date']}
                />
              </div>
            </Col>
          )}
        </Row>

        {/* Active Filters Display */}
        <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: '#f0f8ff', borderRadius: 6 }}>
          <Text strong>Active Filters: </Text>
          <Tag color="blue" style={{ marginLeft: 8 }}>
            Shop: {selectedShop === 'all' ? 'All Shops' : shops.find(s => s._id === selectedShop)?.name || 'Selected Shop'}
          </Tag>
          {timeRangeFilter && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              Time Range: {timeRangeFilter === '7d' ? 'Last 7 Days' : 
                         timeRangeFilter === '30d' ? 'Last 30 Days' : 
                         timeRangeFilter === '90d' ? 'Last 90 Days' : 
                         timeRangeFilter === 'yearly' ? 'This Year' : 
                         timeRangeFilter === 'all' ? 'All Time' : 
                         timeRangeFilter === 'custom' ? 'Custom Range' : 
                         timeRangeFilter.toUpperCase()}
            </Tag>
          )}
          {paymentMethodFilter && (
            <Tag color="green" style={{ marginLeft: 8 }}>
              Payment Mode: {paymentMethodFilter.toUpperCase()}
            </Tag>
          )}
          {searchText && (
            <Tag color="orange" style={{ marginLeft: 8 }}>
              Search: "{searchText}"
            </Tag>
          )}
          {dateRange && dateRange.length === 2 && timeRangeFilter === 'custom' && (
            <Tag color="purple" style={{ marginLeft: 8 }}>
              Dates: {dayjs(dateRange[0]).format('DD/MM/YYYY')} - {dayjs(dateRange[1]).format('DD/MM/YYYY')}
            </Tag>
          )}
          {stats.creditSalesCount > 0 && (
            <Tag color="orange" style={{ marginLeft: 8 }}>
              Credit Sales: {stats.creditSalesCount}
            </Tag>
          )}
          {currentUser?.role === 'cashier' && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              My Transactions Only
            </Tag>
          )}
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading transactions data...</div>
        </div>
      ) : (
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <PieChartOutlined />
                Comprehensive Overview
                <Badge count={transactions.length} overflowCount={999} style={{ marginLeft: 8 }} />
                {stats.creditSalesCount > 0 && (
                  <Badge count={stats.creditSalesCount} overflowCount={999} style={{ marginLeft: 4, backgroundColor: '#faad14' }} />
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
              </span>
            } 
            key="details"
          >
            <Card>
              <div style={{ marginBottom: 16 }}>
                <Text strong>
                  Showing {filteredTransactions.length} of {transactions.length} transactions
                  {selectedShop !== 'all' && (
                    <Text type="secondary"> for {shops.find(s => s._id === selectedShop)?.name || 'Selected Shop'}</Text>
                  )}
                  {timeRangeFilter === 'all' ? (
                    <Text type="secondary"> for all time</Text>
                  ) : (
                    <Text type="secondary"> for the selected period</Text>
                  )}
                  {searchText && (
                    <Text type="secondary"> matching "{searchText}"</Text>
                  )}
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    Total Revenue: {CalculationUtils.formatCurrency(stats.totalRevenue)} | 
                    Total Profit: {CalculationUtils.formatCurrency(stats.netProfit)} | 
                    Items Sold: {stats.totalItemsSold} |
                    Avg. Transaction: {CalculationUtils.formatCurrency(stats.averageTransactionValue)}
                    {stats.creditSalesCount > 0 && (
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        | Credit Sales: {stats.creditSalesCount} ({CalculationUtils.formatCurrency(stats.totalCreditAmount)})
                      </Text>
                    )}
                    {stats.creditCollectionRate > 0 && (
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        | Credit Collection: {stats.creditCollectionRate.toFixed(1)}%
                      </Text>
                    )}
                  </Text>
                </div>
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
                    `${range[0]}-${range[1]} of ${total} transactions`
                }}
                scroll={{ x: 1800 }}
                locale={{ 
                  emptyText: filteredTransactions.length === 0 && transactions.length > 0 ? 
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
        shops={shops}
      />

      <ExportReportModal
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        data={{ 
          transactions: filteredTransactions, 
          stats: stats
        }}
        filters={{ 
          dateRange, 
          paymentMethodFilter,
          timeRangeFilter,
          searchText 
        }}
        selectedShop={selectedShop}
        shops={shops}
        loading={exportLoading}
      />
    </div>
  );
};

export default TransactionsReport;

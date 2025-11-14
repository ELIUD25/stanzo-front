// src/utils/calculationUtils.js
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { RiseOutlined, FallOutlined } from '@ant-design/icons';
import React from 'react';

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

// =============================================
// ENHANCED CALCULATION UTILITIES WITH COMPREHENSIVE CREDIT TRACKING
// =============================================

export const CalculationUtils = {
  // Safe number conversion with enhanced validation
  safeNumber: (value, fallback = 0) => {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') return fallback;
    if (typeof value === 'boolean') return value ? 1 : 0;
    
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  },

  // Format currency for display with enhanced options
  formatCurrency: (amount, currency = 'KES', showSymbol = true) => {
    const value = CalculationUtils.safeNumber(amount);
    const formatted = value.toLocaleString('en-KE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
    return showSymbol ? `${currency} ${formatted}` : formatted;
  },

  // Get color based on profit value
  getProfitColor: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    if (value > 0) return '#3f8600'; // Green
    if (value < 0) return '#cf1322'; // Red
    return '#d9d9d9'; // Gray
  },

  // Get profit icon based on profit value
  getProfitIcon: (profit) => {
    const value = CalculationUtils.safeNumber(profit);
    return value >= 0 ? <RiseOutlined /> : <FallOutlined />;
  },

  // Calculate profit from revenue and cost
  calculateProfit: (revenue, cost) => {
    const revenueNum = CalculationUtils.safeNumber(revenue);
    const costNum = CalculationUtils.safeNumber(cost);
    return revenueNum - costNum;
  },

  // Calculate profit margin percentage with enhanced validation
  calculateProfitMargin: (revenue, profit) => {
    const revenueNum = CalculationUtils.safeNumber(revenue);
    const profitNum = CalculationUtils.safeNumber(profit);
    if (revenueNum <= 0) return 0.0;
    return (profitNum / revenueNum) * 100;
  },

  // ENHANCED: Calculate cost from items if not provided
  calculateCostFromItems: (transaction) => {
    if (transaction.cost || transaction.totalCost) {
      return CalculationUtils.safeNumber(transaction.cost) || 
             CalculationUtils.safeNumber(transaction.totalCost);
    }
    
    // Calculate cost from items
    if (transaction.items && Array.isArray(transaction.items)) {
      return transaction.items.reduce((sum, item) => {
        const quantity = CalculationUtils.safeNumber(item.quantity, 1);
        const itemCost = CalculationUtils.safeNumber(item.cost) || 
                        CalculationUtils.safeNumber(item.buyingPrice) || 0;
        return sum + (itemCost * quantity);
      }, 0);
    }
    
    return 0;
  },

  // FIXED: Calculate COGS for transactions array - PROPERLY includes complete sales + credit sales made
  calculateCOGS: (transactions) => {
    if (!Array.isArray(transactions)) return 0;
    
    console.log('🧮 COGS Calculation - Processing transactions:', transactions.length);
    
    const totalCOGS = transactions.reduce((sum, transaction) => {
      // CRITICAL FIX: Include ALL transactions (both complete AND credit sales)
      // COGS is recognized when sale occurs, regardless of payment method
      const cost = CalculationUtils.calculateCostFromItems(transaction);
      
      console.log(`📦 Transaction ${transaction._id}:`, {
        isCredit: transaction.isCreditTransaction,
        paymentMethod: transaction.paymentMethod,
        totalAmount: transaction.totalAmount,
        calculatedCost: cost,
        itemsCount: transaction.items?.length
      });
      
      return sum + cost;
    }, 0);
    
    console.log('💰 FINAL COGS Calculation Result:', {
      totalTransactions: transactions.length,
      creditTransactions: transactions.filter(t => t.isCreditTransaction).length,
      completeTransactions: transactions.filter(t => !t.isCreditTransaction).length,
      totalCOGS: totalCOGS
    });
    
    return totalCOGS;
  },

  // ENHANCED: Calculate transaction metrics with proper credit recognition
  calculateTransactionMetrics: (transaction) => {
    const items = transaction.items || [];
    const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
    
    // Use enhanced cost calculation
    const cost = CalculationUtils.calculateCostFromItems(transaction);
    
    const profit = totalAmount - cost;
    const profitMargin = CalculationUtils.calculateProfitMargin(totalAmount, profit);
    
    const isCredit = transaction.paymentMethod === 'credit' || transaction.isCreditTransaction;
    
    // Enhanced credit revenue recognition
    const recognizedRevenue = isCredit ? 
      CalculationUtils.safeNumber(transaction.recognizedRevenue) : 
      totalAmount;
    
    const outstandingRevenue = isCredit ? 
      CalculationUtils.safeNumber(transaction.outstandingRevenue) : 
      0;
    
    const amountPaid = isCredit ? 
      CalculationUtils.safeNumber(transaction.amountPaid) : 
      totalAmount;

    // Enhanced credit status calculation
    let creditStatus = transaction.creditStatus;
    if (isCredit && !creditStatus) {
      if (outstandingRevenue <= 0) {
        creditStatus = 'paid';
      } else if (amountPaid > 0) {
        creditStatus = 'partially_paid';
      } else {
        creditStatus = 'pending';
      }
    }

    return {
      totalAmount,
      cost, // This cost is stored and will be used in COGS calculation
      profit,
      profitMargin,
      itemsCount: items.reduce((sum, item) => sum + CalculationUtils.safeNumber(item.quantity, 1), 0),
      isCreditTransaction: isCredit,
      recognizedRevenue,
      outstandingRevenue,
      amountPaid,
      creditStatus,
      displayDate: transaction.displayDate || new Date(transaction.saleDate || transaction.createdAt).toLocaleString('en-KE')
    };
  },

  // NEW: Calculate outstanding credit by cashier
  calculateOutstandingCreditByCashier: (credits = []) => {
    const cashierCredits = {};
    
    credits.forEach(credit => {
      const cashierId = credit.cashierId || credit.cashier?._id || 'unknown';
      const cashierName = credit.cashierName || credit.cashier?.name || 'Unknown Cashier';
      
      if (!cashierCredits[cashierId]) {
        cashierCredits[cashierId] = {
          cashierId,
          cashierName,
          totalCreditGiven: 0,
          outstandingCredit: 0,
          amountCollected: 0,
          creditCount: 0,
          overdueCredit: 0,
          creditTransactions: []
        };
      }
      
      const balanceDue = CalculationUtils.safeNumber(credit.balanceDue);
      const totalAmount = CalculationUtils.safeNumber(credit.totalAmount);
      const amountPaid = CalculationUtils.safeNumber(credit.amountPaid);
      
      cashierCredits[cashierId].totalCreditGiven += totalAmount;
      cashierCredits[cashierId].outstandingCredit += balanceDue;
      cashierCredits[cashierId].amountCollected += amountPaid;
      cashierCredits[cashierId].creditCount += 1;
      
      // Check if credit is overdue
      if (credit.dueDate && dayjs(credit.dueDate).isBefore(dayjs()) && balanceDue > 0) {
        cashierCredits[cashierId].overdueCredit += balanceDue;
      }
      
      cashierCredits[cashierId].creditTransactions.push(credit);
    });
    
    // Convert to array and calculate additional metrics
    return Object.values(cashierCredits).map(cashier => ({
      ...cashier,
      collectionRate: cashier.totalCreditGiven > 0 ? 
        (cashier.amountCollected / cashier.totalCreditGiven) * 100 : 0,
      averageCreditAmount: cashier.creditCount > 0 ? 
        cashier.totalCreditGiven / cashier.creditCount : 0
    })).sort((a, b) => b.outstandingCredit - a.outstandingCredit);
  },

  // NEW: Calculate outstanding credit by shop
  calculateOutstandingCreditByShop: (credits = []) => {
    const shopCredits = {};
    
    credits.forEach(credit => {
      const shopId = credit.shopId || credit.shop?._id || 'unknown';
      const shopName = credit.shopName || credit.shop?.name || 'Unknown Shop';
      
      if (!shopCredits[shopId]) {
        shopCredits[shopId] = {
          shopId,
          shopName,
          totalCreditGiven: 0,
          outstandingCredit: 0,
          amountCollected: 0,
          creditCount: 0,
          overdueCredit: 0,
          creditTransactions: []
        };
      }
      
      const balanceDue = CalculationUtils.safeNumber(credit.balanceDue);
      const totalAmount = CalculationUtils.safeNumber(credit.totalAmount);
      const amountPaid = CalculationUtils.safeNumber(credit.amountPaid);
      
      shopCredits[shopId].totalCreditGiven += totalAmount;
      shopCredits[shopId].outstandingCredit += balanceDue;
      shopCredits[shopId].amountCollected += amountPaid;
      shopCredits[shopId].creditCount += 1;
      
      // Check if credit is overdue
      if (credit.dueDate && dayjs(credit.dueDate).isBefore(dayjs()) && balanceDue > 0) {
        shopCredits[shopId].overdueCredit += balanceDue;
      }
      
      shopCredits[shopId].creditTransactions.push(credit);
    });
    
    // Convert to array and calculate additional metrics
    return Object.values(shopCredits).map(shop => ({
      ...shop,
      collectionRate: shop.totalCreditGiven > 0 ? 
        (shop.amountCollected / shop.totalCreditGiven) * 100 : 0,
      averageCreditAmount: shop.creditCount > 0 ? 
        shop.totalCreditGiven / shop.creditCount : 0
    })).sort((a, b) => b.outstandingCredit - a.outstandingCredit);
  },

  // NEW: Calculate cashier performance with credit metrics
  calculateCashierPerformanceWithCredits: (transactions = [], credits = [], cashiers = []) => {
    const cashierPerformance = {};
    
    // Initialize cashier data
    cashiers.forEach(cashier => {
      cashierPerformance[cashier._id] = {
        cashierId: cashier._id,
        cashierName: cashier.name,
        totalRevenue: 0,
        totalTransactions: 0,
        totalProfit: 0,
        itemsSold: 0,
        creditSales: 0,
        creditRevenue: 0,
        outstandingCredit: 0,
        totalCreditGiven: 0,
        creditCollectionRate: 0,
        creditTransactions: []
      };
    });
    
    // Process transactions
    transactions.forEach(transaction => {
      const cashierId = transaction.cashierId || transaction.cashier?._id;
      if (!cashierId || !cashierPerformance[cashierId]) return;
      
      const cashier = cashierPerformance[cashierId];
      const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
      const cost = CalculationUtils.calculateCostFromItems(transaction);
      const profit = CalculationUtils.calculateProfit(totalAmount, cost);
      
      cashier.totalRevenue += totalAmount;
      cashier.totalTransactions += 1;
      cashier.totalProfit += profit;
      cashier.itemsSold += CalculationUtils.safeNumber(transaction.itemsCount, 0);
      
      // Track credit sales
      if (transaction.paymentMethod === 'credit' || transaction.isCreditTransaction) {
        cashier.creditSales += 1;
        cashier.creditRevenue += totalAmount;
      }
    });
    
    // Process credits
    credits.forEach(credit => {
      const cashierId = credit.cashierId || credit.cashier?._id;
      if (!cashierId || !cashierPerformance[cashierId]) return;
      
      const cashier = cashierPerformance[cashierId];
      const balanceDue = CalculationUtils.safeNumber(credit.balanceDue);
      const totalAmount = CalculationUtils.safeNumber(credit.totalAmount);
      
      cashier.outstandingCredit += balanceDue;
      cashier.totalCreditGiven += totalAmount;
      cashier.creditTransactions.push(credit);
    });
    
    // Calculate final metrics
    return Object.values(cashierPerformance).map(cashier => {
      const collectionRate = cashier.totalCreditGiven > 0 ? 
        ((cashier.totalCreditGiven - cashier.outstandingCredit) / cashier.totalCreditGiven) * 100 : 0;
      
      return {
        ...cashier,
        collectionRate,
        profitMargin: CalculationUtils.calculateProfitMargin(cashier.totalRevenue, cashier.totalProfit),
        averageTransactionValue: cashier.totalTransactions > 0 ? 
          cashier.totalRevenue / cashier.totalTransactions : 0,
        creditRiskScore: Math.max(0, 100 - (cashier.outstandingCredit / Math.max(cashier.totalCreditGiven, 1)) * 100)
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  },

  // NEW: Calculate shop performance with credit metrics
  calculateShopPerformanceWithCredits: (transactions = [], credits = [], shops = []) => {
    const shopPerformance = {};
    
    // Initialize shop data
    shops.forEach(shop => {
      shopPerformance[shop._id] = {
        shopId: shop._id,
        shopName: shop.name,
        location: shop.location,
        totalRevenue: 0,
        totalTransactions: 0,
        totalProfit: 0,
        itemsSold: 0,
        creditSales: 0,
        creditRevenue: 0,
        outstandingCredit: 0,
        totalCreditGiven: 0,
        creditCollectionRate: 0,
        creditTransactions: []
      };
    });
    
    // Process transactions
    transactions.forEach(transaction => {
      const shopId = transaction.shopId || transaction.shop?._id;
      if (!shopId || !shopPerformance[shopId]) return;
      
      const shop = shopPerformance[shopId];
      const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
      const cost = CalculationUtils.calculateCostFromItems(transaction);
      const profit = CalculationUtils.calculateProfit(totalAmount, cost);
      
      shop.totalRevenue += totalAmount;
      shop.totalTransactions += 1;
      shop.totalProfit += profit;
      shop.itemsSold += CalculationUtils.safeNumber(transaction.itemsCount, 0);
      
      // Track credit sales
      if (transaction.paymentMethod === 'credit' || transaction.isCreditTransaction) {
        shop.creditSales += 1;
        shop.creditRevenue += totalAmount;
      }
    });
    
    // Process credits
    credits.forEach(credit => {
      const shopId = credit.shopId || credit.shop?._id;
      if (!shopId || !shopPerformance[shopId]) return;
      
      const shop = shopPerformance[shopId];
      const balanceDue = CalculationUtils.safeNumber(credit.balanceDue);
      const totalAmount = CalculationUtils.safeNumber(credit.totalAmount);
      
      shop.outstandingCredit += balanceDue;
      shop.totalCreditGiven += totalAmount;
      shop.creditTransactions.push(credit);
    });
    
    // Calculate final metrics
    return Object.values(shopPerformance).map(shop => {
      const collectionRate = shop.totalCreditGiven > 0 ? 
        ((shop.totalCreditGiven - shop.outstandingCredit) / shop.totalCreditGiven) * 100 : 0;
      
      return {
        ...shop,
        collectionRate,
        profitMargin: CalculationUtils.calculateProfitMargin(shop.totalRevenue, shop.totalProfit),
        averageTransactionValue: shop.totalTransactions > 0 ? 
          shop.totalRevenue / shop.totalTransactions : 0,
        creditRiskScore: Math.max(0, 100 - (shop.outstandingCredit / Math.max(shop.totalCreditGiven, 1)) * 100)
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  },

  // ENHANCED: Process comprehensive data with complete credit integration
  processComprehensiveData: (rawData, selectedShop) => {
    try {
      console.log('🔧 Processing comprehensive data with credit integration...', {
        rawDataKeys: Object.keys(rawData),
        selectedShop
      });

      // Extract data with proper fallbacks
      const transactions = rawData.transactions || 
                         rawData.salesWithProfit || 
                         rawData.filteredTransactions || 
                         [];

      const expenses = rawData.expenses || [];
      const credits = rawData.credits || [];
      const products = rawData.products || [];
      const shops = rawData.shops || [];
      const cashiers = rawData.cashiers || [];

      console.log('📊 Data extracted:', {
        transactions: transactions.length,
        expenses: expenses.length,
        credits: credits.length,
        products: products.length,
        shops: shops.length,
        cashiers: cashiers.length
      });

      // Process each transaction with enhanced credit handling
      const processedTransactions = transactions.map(transaction => {
        // Ensure proper credit transaction detection
        const isCredit = transaction.paymentMethod === 'credit' || 
                        transaction.isCreditTransaction === true ||
                        transaction.status === 'credit';

        // Use enhanced cost calculation
        const cost = CalculationUtils.calculateCostFromItems(transaction);
        const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount);
        const profit = CalculationUtils.calculateProfit(totalAmount, cost);
        const profitMargin = CalculationUtils.calculateProfitMargin(totalAmount, profit);

        // Enhanced credit revenue recognition
        let recognizedRevenue, outstandingRevenue, amountPaid, creditStatus;

        if (isCredit) {
          recognizedRevenue = CalculationUtils.safeNumber(transaction.recognizedRevenue);
          outstandingRevenue = CalculationUtils.safeNumber(transaction.outstandingRevenue);
          amountPaid = CalculationUtils.safeNumber(transaction.amountPaid);
          creditStatus = transaction.creditStatus || 'pending';
          
          // Validate credit amounts
          if (recognizedRevenue === 0 && outstandingRevenue === 0) {
            outstandingRevenue = totalAmount;
          }
        } else {
          // Complete transaction - all revenue recognized immediately
          recognizedRevenue = totalAmount;
          outstandingRevenue = 0;
          amountPaid = totalAmount;
          creditStatus = null;
        }

        // Enhanced shop name handling
        let shopName = 'Unknown Shop';
        if (transaction.shop) {
          if (typeof transaction.shop === 'string') {
            shopName = transaction.shop;
          } else if (typeof transaction.shop === 'object' && transaction.shop.name) {
            shopName = transaction.shop.name;
          }
        } else if (transaction.shopName) {
          shopName = transaction.shopName;
        }

        // Enhanced date handling
        const saleDate = transaction.saleDate || transaction.createdAt;
        const displayDate = transaction.displayDate || 
                           (saleDate ? new Date(saleDate).toLocaleString('en-KE') : 'Date Unknown');

        return {
          ...transaction,
          // Core financial data
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)), // This cost will be used in COGS calculation
          profit: parseFloat(profit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          
          // Enhanced credit management data
          isCreditTransaction: isCredit,
          recognizedRevenue: parseFloat(recognizedRevenue.toFixed(2)),
          outstandingRevenue: parseFloat(outstandingRevenue.toFixed(2)),
          amountPaid: parseFloat(amountPaid.toFixed(2)),
          creditStatus: creditStatus,
          
          // Display properties
          displayDate,
          shop: shopName,
          shopName: shopName,
          
          // Cashier info
          cashierName: transaction.cashierName || 'Unknown Cashier',
          
          // Items count
          itemsCount: CalculationUtils.safeNumber(transaction.itemsCount) || 
                     (transaction.items ? transaction.items.reduce((sum, item) => 
                       sum + CalculationUtils.safeNumber(item.quantity, 1), 0) : 0),
          
          // Metadata
          _id: transaction._id,
          transactionNumber: transaction.transactionNumber,
          paymentMethod: transaction.paymentMethod,
          customerName: transaction.customerName || 'Walk-in Customer',
          status: transaction.status || 'completed',
          _processedAt: new Date().toISOString(),
          _isValid: true
        };
      });

      // Filter by shop if specified
      const filteredTransactions = selectedShop && selectedShop !== 'all' ? 
        processedTransactions.filter(t => {
          const transactionShopId = t.shopId || t.shop;
          return transactionShopId === selectedShop;
        }) : processedTransactions;

      console.log('✅ Processed transactions:', {
        total: processedTransactions.length,
        filtered: filteredTransactions.length,
        creditTransactions: filteredTransactions.filter(t => t.isCreditTransaction).length,
        completeTransactions: filteredTransactions.filter(t => !t.isCreditTransaction).length
      });

      // Calculate financial stats
      const financialStats = CalculationUtils.calculateFinancialStatsWithCreditManagement(
        filteredTransactions, 
        expenses, 
        credits
      );

      // NEW: Calculate credit analytics
      const creditAnalytics = {
        byCashier: CalculationUtils.calculateOutstandingCreditByCashier(credits),
        byShop: CalculationUtils.calculateOutstandingCreditByShop(credits),
        cashierPerformance: CalculationUtils.calculateCashierPerformanceWithCredits(transactions, credits, cashiers),
        shopPerformance: CalculationUtils.calculateShopPerformanceWithCredits(transactions, credits, shops),
        summary: {
          totalOutstandingCredit: credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.balanceDue), 0),
          totalCreditGiven: credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.totalAmount), 0),
          totalCredits: credits.length,
          activeCredits: credits.filter(credit => CalculationUtils.safeNumber(credit.balanceDue) > 0).length,
          overdueCredits: credits.filter(credit => 
            credit.dueDate && dayjs(credit.dueDate).isBefore(dayjs()) && CalculationUtils.safeNumber(credit.balanceDue) > 0
          ).length
        }
      };

      return {
        salesWithProfit: filteredTransactions,
        financialStats,
        expenses,
        credits,
        products,
        shops,
        cashiers,
        summary: financialStats,
        enhancedStats: {
          financialStats,
          salesWithProfit: filteredTransactions,
          creditAnalytics
        },
        creditAnalytics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in processComprehensiveData:', error);
      return CalculationUtils.getDefaultProcessedData();
    }
  },

  // ENHANCED: Process single transaction with comprehensive credit management data
  processSingleTransaction: (transaction) => {
    try {
      if (!transaction) return CalculationUtils.createFallbackTransaction();

      // ENHANCED: Multiple ways to detect credit transactions
      const isCredit = transaction.paymentMethod === 'credit' || 
                      transaction.isCredit === true || 
                      transaction.transactionType === 'credit' ||
                      transaction.isCreditTransaction === true ||
                      transaction.status === 'credit';
      
      // Use server-calculated values when available, otherwise calculate
      const totalAmount = CalculationUtils.safeNumber(transaction.totalAmount) || 
                         CalculationUtils.safeNumber(transaction.amount) || 0;
      
      // ENHANCED: Use the new cost calculation function
      const cost = CalculationUtils.calculateCostFromItems(transaction);
      
      // ENHANCED: Credit management revenue recognition logic
      const amountPaid = CalculationUtils.safeNumber(transaction.amountPaid) || 
                        CalculationUtils.safeNumber(transaction.paidAmount) || 0;
      
      const recognizedRevenue = isCredit ? amountPaid : totalAmount;
      
      const outstandingRevenue = isCredit ? 
        (CalculationUtils.safeNumber(transaction.outstandingRevenue) || 
         CalculationUtils.safeNumber(transaction.balanceDue) || 
         Math.max(0, totalAmount - amountPaid)) : 0;

        // Calculate profit metrics
        const profit = CalculationUtils.calculateProfit(recognizedRevenue, cost);
        const profitMargin = CalculationUtils.calculateProfitMargin(recognizedRevenue, profit);

        // Enhanced date handling
        const saleDate = transaction.saleDate || transaction.createdAt || transaction.date;
        const displayDate = transaction.displayDate || 
                           (saleDate ? dayjs(saleDate).format('DD/MM/YYYY HH:mm') : 'Date Unknown');

        // Enhanced shop name handling
        let shopName = 'Unknown Shop';
        if (transaction.shop) {
          if (typeof transaction.shop === 'string') {
            shopName = transaction.shop;
          } else if (typeof transaction.shop === 'object' && transaction.shop.name) {
            shopName = transaction.shop.name;
          }
        }

        // ENHANCED: Credit status calculation similar to CreditManagement component
        const calculateCreditStatus: (transaction: any, balanceDue: number) => string = (transaction, balanceDue) => {
          if (balanceDue <= 0) {
            return 'paid';
          }
          
          if (amountPaid > 0 && balanceDue > 0) {
            return 'partially_paid';
          }
          
          if (transaction.dueDate && dayjs(transaction.dueDate).isBefore(dayjs())) {
            return 'overdue';
          }
          
          return 'pending';
        };

        const creditStatus = isCredit ? 
          (transaction.creditStatus || calculateCreditStatus(transaction, outstandingRevenue)) : 
          null;

        return {
          ...transaction,
          // Core financial data
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)), // This cost will be used in COGS calculation
          profit: parseFloat(profit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          
          // Enhanced revenue recognition with credit management
          amountPaid: parseFloat(amountPaid.toFixed(2)),
          recognizedRevenue: parseFloat(recognizedRevenue.toFixed(2)),
          outstandingRevenue: parseFloat(outstandingRevenue.toFixed(2)),
          
          // Display properties
          displayDate,
          
          // Transaction classification with enhanced credit handling
          isCreditTransaction: isCredit,
          creditStatus: creditStatus,
          
          // Safe shop handling
          shop: shopName,
          shopName: shopName, // Alias for compatibility
          
          // Cashier info
          cashierName: transaction.cashierName || 'Unknown Cashier',
          
          // Additional metadata for credit management
          _processedAt: new Date().toISOString(),
          _isValid: true,
          _creditManagementData: {
            isCredit,
            creditStatus,
            amountPaid,
            outstandingRevenue,
            collectionRate: totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0
          }
        };
      } catch (error) {
        console.error('❌ Error processing transaction:', error, transaction);
        return CalculationUtils.createFallbackTransaction(transaction);
      }
    },

  // FIXED: Calculate financial statistics with proper COGS (complete sales + credit sales made)
  calculateFinancialStatsWithCreditManagement: (transactions, expenses, credits, serverStats = null) => {
    // Prefer server-calculated stats when available
    if (serverStats) {
      return CalculationUtils.enhanceServerStatsWithCreditManagement(serverStats, transactions, credits);
    }

    const validTransactions = transactions.filter(t => t && t._isValid !== false);
    
    if (validTransactions.length === 0) {
      return CalculationUtils.getDefaultStatsWithCreditManagement();
    }

    try {
      // ENHANCED: Better credit transaction detection
      const creditTransactions = validTransactions.filter(t => 
        t.paymentMethod === 'credit' || 
        t.isCreditTransaction === true ||
        t.status === 'credit'
      );
      
      const nonCreditTransactions = validTransactions.filter(t => 
        !creditTransactions.includes(t)
      );

      console.log('🧮 COGS Analysis - Transaction Breakdown:', {
        totalTransactions: validTransactions.length,
        creditTransactions: creditTransactions.length,
        nonCreditTransactions: nonCreditTransactions.length
      });

      // Core revenue calculations - use recognizedRevenue for credit transactions
      const totalRevenue = validTransactions.reduce((sum, t) => 
        sum + (t.recognizedRevenue !== undefined ? t.recognizedRevenue : t.totalAmount), 0
      );
      
      // FIXED COGS CALCULATION: Include both complete sales AND credit sales made at that moment
      // This follows accounting principles where COGS is recognized when sale occurs, not when payment is received
      const costOfGoodsSold = CalculationUtils.calculateCOGS(validTransactions);
      
      const totalProfit = CalculationUtils.calculateProfit(totalRevenue, costOfGoodsSold);
      
      // Expense calculations
      const totalExpensesAmount = expenses.reduce((sum, e) => 
        sum + CalculationUtils.safeNumber(e.amount), 0
      );
      const netProfit = CalculationUtils.calculateProfit(totalProfit, totalExpensesAmount);
      
      // Payment method calculations
      const cashTransactions = validTransactions.filter(t => 
        t.paymentMethod === 'cash' || t.paymentMethod?.toLowerCase().includes('cash')
      );
      const mpesaBankTransactions = validTransactions.filter(t => 
        ['mpesa', 'bank', 'bank_mpesa', 'mobile_money', 'digital'].includes(t.paymentMethod?.toLowerCase())
      );

      // ENHANCED: Credit calculations
      const creditSalesAmount = creditTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const outstandingCredit = creditTransactions.reduce((sum, t) => sum + (t.outstandingRevenue || 0), 0);
      const recognizedCreditRevenue = creditTransactions.reduce((sum, t) => sum + (t.recognizedRevenue || 0), 0);

      // ENHANCED: Non-credit sales calculation (sum of totalAmount for non-credit transactions)
      const nonCreditSalesAmount = nonCreditTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

      // Payment method totals
      const totalCash = cashTransactions.reduce((sum, t) => 
        sum + (t.recognizedRevenue !== undefined ? t.recognizedRevenue : t.totalAmount), 0
      );
      const totalMpesaBank = mpesaBankTransactions.reduce((sum, t) => 
        sum + (t.recognizedRevenue !== undefined ? t.recognizedRevenue : t.totalAmount), 0
      );

      // NEW: Calculate credit metrics from credits data
      const totalCreditGiven = credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.totalAmount), 0);
      const totalOutstandingFromCredits = credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.balanceDue), 0);
      const totalAmountPaid = credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.amountPaid), 0);

      // Calculate COGS breakdown for detailed analysis
      const cogsFromCreditSales = CalculationUtils.calculateCOGS(creditTransactions);
      const cogsFromCompleteSales = CalculationUtils.calculateCOGS(nonCreditTransactions);

      console.log('💰 FINAL COGS Breakdown:', {
        totalCOGS: costOfGoodsSold,
        fromCreditSales: cogsFromCreditSales,
        fromCompleteSales: cogsFromCompleteSales,
        creditTransactionsCount: creditTransactions.length,
        completeTransactionsCount: nonCreditTransactions.length
      });

      // RETURN STRUCTURE WITH CREDIT MANAGEMENT INTEGRATION
      return {
        // Core financial metrics - matching your image requirements
        totalSales: validTransactions.length,
        creditSales: parseFloat(creditSalesAmount.toFixed(2)),
        nonCreditSales: parseFloat(nonCreditSalesAmount.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalExpenses: parseFloat(totalExpensesAmount.toFixed(2)),
        grossProfit: parseFloat(totalProfit.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)), // FIXED: Now properly includes both complete + credit sales
        totalMpesaBank: parseFloat(totalMpesaBank.toFixed(2)),
        totalCash: parseFloat(totalCash.toFixed(2)),
        outstandingCredit: parseFloat(Math.max(outstandingCredit, totalOutstandingFromCredits).toFixed(2)),
        totalCreditGiven: parseFloat(Math.max(creditSalesAmount, totalCreditGiven).toFixed(2)),
        totalAmountPaid: parseFloat(totalAmountPaid.toFixed(2)),
        
        // Additional metrics
        creditSalesCount: creditTransactions.length,
        profitMargin: CalculationUtils.calculateProfitMargin(totalRevenue, netProfit),
        creditCollectionRate: totalCreditGiven > 0 ? 
          parseFloat(((totalCreditGiven - totalOutstandingFromCredits) / totalCreditGiven) * 100).toFixed(2) : 0,
        totalTransactions: validTransactions.length,
        totalItemsSold: validTransactions.reduce((sum, t) => sum + (t.itemsCount || 0), 0),
        
        // Enhanced credit metrics
        recognizedCreditRevenue: parseFloat(recognizedCreditRevenue.toFixed(2)),
        averageCreditSale: creditTransactions.length > 0 ? 
          parseFloat((creditSalesAmount / creditTransactions.length).toFixed(2)) : 0,
        
        // Credit status breakdown
        creditStatusBreakdown: {
          pending: creditTransactions.filter(t => t.creditStatus === 'pending').length,
          partially_paid: creditTransactions.filter(t => t.creditStatus === 'partially_paid').length,
          paid: creditTransactions.filter(t => t.creditStatus === 'paid').length,
          overdue: creditTransactions.filter(t => t.creditStatus === 'overdue').length
        },
        
        // Complete transactions count (non-credit)
        completeTransactionsCount: nonCreditTransactions.length,
        
        // COGS breakdown for analysis
        cogsBreakdown: {
          total: parseFloat(costOfGoodsSold.toFixed(2)),
          fromCreditSales: parseFloat(cogsFromCreditSales.toFixed(2)),
          fromCompleteSales: parseFloat(cogsFromCompleteSales.toFixed(2))
        },
        
        // Timestamp
        timestamp: new Date().toISOString(),
        _calculatedAt: new Date().toISOString(),
        _creditManagementIntegrated: true,
        _cogsCalculation: 'complete_sales_plus_credit_sales_made'
      };
    } catch (error) {
      console.error('❌ Error calculating financial stats with credit management:', error);
      return CalculationUtils.getDefaultStatsWithCreditManagement();
    }
  },

  // NEW: Enhanced server stats processing with credit management
  enhanceServerStatsWithCreditManagement: (serverStats, transactions, credits) => {
    const enhanced = {
      ...CalculationUtils.getDefaultStatsWithCreditManagement(),
      ...serverStats
    };

    // Calculate additional credit metrics if not provided by server
    if (typeof enhanced.nonCreditSales === 'undefined' && transactions) {
      const nonCreditTransactions = transactions.filter(t => !t.isCreditTransaction);
      enhanced.nonCreditSales = nonCreditTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    }

    if (typeof enhanced.totalMpesaBank === 'undefined') {
      enhanced.totalMpesaBank = enhanced.digitalSales || 0;
    }

    if (typeof enhanced.totalCreditGiven === 'undefined') {
      const creditTransactions = transactions ? transactions.filter(t => t.isCreditTransaction) : [];
      enhanced.totalCreditGiven = creditTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    }

    if (typeof enhanced.completeTransactionsCount === 'undefined' && transactions) {
      enhanced.completeTransactionsCount = transactions.filter(t => !t.isCreditTransaction).length;
    }

    // Calculate credit status breakdown
    if (transactions) {
      const creditTransactions = transactions.filter(t => t.isCreditTransaction);
      enhanced.creditStatusBreakdown = {
        pending: creditTransactions.filter(t => t.creditStatus === 'pending').length,
        partially_paid: creditTransactions.filter(t => t.creditStatus === 'partially_paid').length,
        paid: creditTransactions.filter(t => t.creditStatus === 'paid').length,
        overdue: creditTransactions.filter(t => t.creditStatus === 'overdue').length
      };
    }

    // Add credit-specific metrics from credits data
    if (credits) {
      enhanced.totalCreditGiven = credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.totalAmount), 0);
      enhanced.outstandingCredit = credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.balanceDue), 0);
      enhanced.totalAmountPaid = credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.amountPaid), 0);
    }

    // FIXED: Calculate COGS for both complete and credit sales if not provided
    if (typeof enhanced.costOfGoodsSold === 'undefined' && transactions) {
      enhanced.costOfGoodsSold = CalculationUtils.calculateCOGS(transactions);
    }

    enhanced._source = 'server';
    enhanced._enhancedAt = new Date().toISOString();
    enhanced._creditManagementIntegrated = true;
    enhanced._cogsCalculation = 'complete_sales_plus_credit_sales_made';

    return enhanced;
  },

  // NEW: Credit analysis calculation
  calculateCreditAnalysis: (transactions, credits) => {
    const creditTransactions = transactions.filter(t => t.isCreditTransaction);
    
    if (creditTransactions.length === 0 && credits.length === 0) {
      return {
        totalCreditSales: 0,
        recognizedCreditRevenue: 0,
        outstandingCredit: 0,
        creditSalesCount: 0,
        creditCollectionRate: 0,
        averageCreditSale: 0,
        cogsForCreditSales: 0
      };
    }

    const totalCreditSales = creditTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const recognizedCreditRevenue = creditTransactions.reduce((sum, t) => sum + t.recognizedRevenue, 0);
    const outstandingCredit = creditTransactions.reduce((sum, t) => sum + t.outstandingRevenue, 0);
    const cogsForCreditSales = CalculationUtils.calculateCOGS(creditTransactions);

    // Use credits data if available for more accurate calculations
    const totalCreditGiven = credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.totalAmount), totalCreditSales);
    const totalOutstanding = credits.reduce((sum, credit) => sum + CalculationUtils.safeNumber(credit.balanceDue), outstandingCredit);

    return {
      totalCreditSales: parseFloat(totalCreditGiven.toFixed(2)),
      recognizedCreditRevenue: parseFloat(recognizedCreditRevenue.toFixed(2)),
      outstandingCredit: parseFloat(totalOutstanding.toFixed(2)),
      creditSalesCount: Math.max(creditTransactions.length, credits.length),
      creditCollectionRate: totalCreditGiven > 0 ? parseFloat(((totalCreditGiven - totalOutstanding) / totalCreditGiven) * 100).toFixed(2) : 0,
      averageCreditSale: Math.max(creditTransactions.length, credits.length) > 0 ? 
        parseFloat((totalCreditGiven / Math.max(creditTransactions.length, credits.length)).toFixed(2)) : 0,
      cogsForCreditSales: parseFloat(cogsForCreditSales.toFixed(2))
    };
  },

  // Enhanced sales performance summary
  calculateSalesPerformanceSummary: (transactions, expenses, financialStats) => {
    try {
      const validTransactions = transactions.filter(t => t && t._isValid !== false);
      
      if (validTransactions.length === 0) {
        return CalculationUtils.getDefaultSalesPerformanceSummary();
      }

      // ENHANCED: Include credit management data
      const creditTransactions = validTransactions.filter(t => t.isCreditTransaction);
      const nonCreditTransactions = validTransactions.filter(t => !t.isCreditTransaction);

      // FIXED: COGS calculations for both credit and non-credit sales
      const cogsForCreditSales = CalculationUtils.calculateCOGS(creditTransactions);
      const cogsForNonCreditSales = CalculationUtils.calculateCOGS(nonCreditTransactions);

      return {
        // Sales counts with credit breakdown
        totalSales: validTransactions.length,
        creditSales: financialStats.creditSalesCount,
        nonCreditSales: validTransactions.length - financialStats.creditSalesCount,
        completeTransactions: nonCreditTransactions.length,
        
        // Revenue breakdown
        totalRevenue: financialStats.totalRevenue,
        debtSalesRevenue: financialStats.creditSales,
        nonDebtRevenue: financialStats.nonCreditSales,
        
        // FIXED: Cost analysis - COGS includes both complete + credit sales
        costOfGoodsSold: financialStats.costOfGoodsSold,
        costOfGoodsSoldCredit: cogsForCreditSales,
        costOfGoodsSoldNonCredit: cogsForNonCreditSales,
        
        // Profit analysis
        grossProfit: financialStats.grossProfit,
        netProfit: financialStats.netProfit,
        debtSalesProfit: creditTransactions.reduce((sum, t) => sum + (t.profit || 0), 0),
        nonDebtProfit: nonCreditTransactions.reduce((sum, t) => sum + (t.profit || 0), 0),
        
        // Expense analysis
        expenses: financialStats.totalExpenses,
        revenueAfterExpenses: financialStats.totalRevenue - financialStats.totalExpenses,
        profitAfterExpenses: financialStats.netProfit,
        
        // Payment method analysis
        totalMpesa: financialStats.totalMpesaBank,
        totalBank: 0, // Combined with Mpesa in financialStats
        totalCash: financialStats.totalCash,
        
        // Enhanced credit analysis
        outstandingCredit: financialStats.outstandingCredit,
        totalCreditCollected: financialStats.recognizedCreditRevenue,
        creditCollectionRate: financialStats.creditCollectionRate,
        averageCreditSale: financialStats.averageCreditSale,
        
        // Timestamp
        timestamp: new Date().toISOString(),
        _calculatedAt: new Date().toISOString(),
        _cogsMethodology: 'complete_sales_plus_credit_sales_made'
      };
    } catch (error) {
      console.error('❌ Error calculating sales performance summary:', error);
      return CalculationUtils.getDefaultSalesPerformanceSummary();
    }
  },

  // ENHANCED: Simplified filtering functions for TransactionsReport
  filterTransactionsByShop: (transactions, shopId) => {
    if (!Array.isArray(transactions)) return [];
    if (!shopId || shopId === 'all') return transactions;
    
    return transactions.filter(transaction => {
      const transactionShopId = transaction.shopId || 
                               (transaction.shop && typeof transaction.shop === 'object' ? transaction.shop._id : transaction.shop);
      return transactionShopId === shopId;
    });
  },

  filterExpensesByShop: (expenses, shopId) => {
    if (!Array.isArray(expenses)) return [];
    if (!shopId || shopId === 'all') return expenses;
    
    return expenses.filter(expense => {
      const expenseShopId = expense.shopId || 
                           (expense.shop && typeof expense.shop === 'object' ? expense.shop._id : expense.shop);
      return expenseShopId === shopId;
    });
  },

  filterCreditsByShop: (credits, shopId) => {
    if (!Array.isArray(credits)) return [];
    if (!shopId || shopId === 'all') return credits;
    
    return credits.filter(credit => {
      const creditShopId = credit.shopId || 
                          (credit.shop && typeof credit.shop === 'object' ? credit.shop._id : credit.shop);
      return creditShopId === shopId;
    });
  },

  // NEW: Filter credits by cashier
  filterCreditsByCashier: (credits, cashierId) => {
    if (!Array.isArray(credits)) return [];
    if (!cashierId || cashierId === 'all') return credits;
    
    return credits.filter(credit => {
      const creditCashierId = credit.cashierId || 
                             (credit.cashier && typeof credit.cashier === 'object' ? credit.cashier._id : credit.cashier);
      return creditCashierId === cashierId;
    });
  },

  // ENHANCED: Top products calculation
  calculateTopProducts: (transactionsData, limit = 10) => {
    if (!transactionsData || !Array.isArray(transactionsData)) {
      return [];
    }

    const productSales = {};
    const validTransactions = transactionsData.filter(t => t && t.items && Array.isArray(t.items));
    
    validTransactions.forEach(transaction => {
      if (!transaction.items) return;
      
      transaction.items.forEach(item => {
        if (!item) return;
        
        const productName = item.productName || item.name || 'Unknown Product';
        const productId = item.productId || item._id || productName;
        const key = `${productId}-${productName}`;
        
        if (!productSales[key]) {
          productSales[key] = {
            id: productId,
            name: productName,
            totalSold: 0,
            totalRevenue: 0,
            totalProfit: 0,
            transactions: 0
          };
        }
        
        const quantity = CalculationUtils.safeNumber(item.quantity, 1);
        const price = CalculationUtils.safeNumber(item.price || item.unitPrice || 0);
        const cost = CalculationUtils.safeNumber(item.cost || item.unitCost || 0);
        const revenue = price * quantity;
        const profit = revenue - (cost * quantity);
        
        productSales[key].totalSold += quantity;
        productSales[key].totalRevenue += revenue;
        productSales[key].totalProfit += profit;
        productSales[key].transactions += 1;
      });
    });
    
    const products = Object.values(productSales)
      .map(product => ({
        ...product,
        profitMargin: CalculationUtils.calculateProfitMargin(product.totalRevenue, product.totalProfit),
        averagePrice: product.totalSold > 0 ? product.totalRevenue / product.totalSold : 0
      }));

    return products
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
      .map(product => ({
        ...product,
        totalRevenue: parseFloat(product.totalRevenue.toFixed(2)),
        totalProfit: parseFloat(product.totalProfit.toFixed(2)),
        profitMargin: parseFloat(product.profitMargin.toFixed(1))
      }));
  },

  // ENHANCED: Shop performance calculation
  calculateShopPerformance: (transactions, shops = []) => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    const shopSales = {};
    const validTransactions = transactions.filter(t => t && t._isValid !== false);
    
    validTransactions.forEach(sale => {
      // Enhanced shop identification
      let shopId = sale.shopId;
      let shopName = 'Unknown Shop';
      
      // Handle different shop data structures
      if (sale.shop) {
        if (typeof sale.shop === 'string') {
          shopName = sale.shop;
          shopId = shopId || sale.shop;
        } else if (typeof sale.shop === 'object') {
          shopName = sale.shop.name || 'Unknown Shop';
          shopId = shopId || sale.shop._id;
        }
      }
      
      // Find shop in provided shops array
      if (shops.length > 0 && shopId) {
        const foundShop = shops.find(s => s._id === shopId || s.name === shopName);
        if (foundShop) {
          shopName = foundShop.name;
          shopId = foundShop._id;
        }
      }
      
      if (!shopSales[shopId]) {
        shopSales[shopId] = { 
          id: shopId,
          name: shopName,
          revenue: 0, 
          transactions: 0, 
          profit: 0,
          creditSales: 0,
          completeSales: 0,
          costOfGoodsSold: 0
        };
      }
      
      shopSales[shopId].revenue += CalculationUtils.safeNumber(sale.recognizedRevenue || sale.totalAmount || 0);
      shopSales[shopId].transactions += 1;
      shopSales[shopId].profit += CalculationUtils.safeNumber(sale.profit || 0);
      shopSales[shopId].costOfGoodsSold += CalculationUtils.safeNumber(sale.cost || 0);
      
      // ENHANCED: Track credit vs complete sales
      if (sale.isCreditTransaction) {
        shopSales[shopId].creditSales += 1;
      } else {
        shopSales[shopId].completeSales += 1;
      }
    });
    
    return Object.values(shopSales)
      .map((data) => ({
        ...data,
        revenue: parseFloat(data.revenue.toFixed(2)),
        profit: parseFloat(data.profit.toFixed(2)),
        costOfGoodsSold: parseFloat(data.costOfGoodsSold.toFixed(2)),
        profitMargin: CalculationUtils.calculateProfitMargin(data.revenue, data.profit)
      }))
      .sort((a, b) => b.revenue - a.revenue);
  },

  // NEW: Cashier performance calculation
  calculateCashierPerformance: (transactions, cashiers = []) => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    const cashierSales = {};
    const validTransactions = transactions.filter(t => t && t._isValid !== false);
    
    validTransactions.forEach(sale => {
      const cashierName = sale.cashierName || 
                         (sale.cashier && typeof sale.cashier === 'object' ? 
                          sale.cashier.name : 'Unknown Cashier') || 
                         'Unknown Cashier';
      
      const cashierId = sale.cashierId || 
                       (sale.cashier && typeof sale.cashier === 'object' ? 
                        sale.cashier._id || sale.cashier.id : cashierName);
      
      if (!cashierSales[cashierId]) {
        cashierSales[cashierId] = { 
          id: cashierId,
          name: cashierName,
          revenue: 0, 
          transactions: 0,
          profit: 0,
          itemsSold: 0,
          creditTransactions: 0,
          completeTransactions: 0,
          performanceScore: 0,
          costOfGoodsSold: 0
        };
      }
      
      cashierSales[cashierId].revenue += CalculationUtils.safeNumber(sale.recognizedRevenue || sale.totalAmount || 0);
      cashierSales[cashierId].profit += CalculationUtils.safeNumber(sale.profit || 0);
      cashierSales[cashierId].transactions += 1;
      cashierSales[cashierId].itemsSold += CalculationUtils.safeNumber(sale.itemsCount || 0);
      cashierSales[cashierId].costOfGoodsSold += CalculationUtils.safeNumber(sale.cost || 0);
      
      if (sale.isCreditTransaction) {
        cashierSales[cashierId].creditTransactions += 1;
      } else {
        cashierSales[cashierId].completeTransactions += 1;
      }
    });
    
    return Object.values(cashierSales)
      .map((cashier) => ({
        ...cashier,
        revenue: parseFloat(cashier.revenue.toFixed(2)),
        profit: parseFloat(cashier.profit.toFixed(2)),
        costOfGoodsSold: parseFloat(cashier.costOfGoodsSold.toFixed(2)),
        profitMargin: CalculationUtils.calculateProfitMargin(cashier.revenue, cashier.profit),
        averageTransactionValue: cashier.transactions > 0 ? parseFloat((cashier.revenue / cashier.transactions).toFixed(2)) : 0,
        performanceScore: CalculationUtils.calculatePerformanceScore(cashier)
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore);
  },

  // Default data structures with credit management integration
  getDefaultProcessedData: () => ({
    salesWithProfit: [],
    financialStats: CalculationUtils.getDefaultStatsWithCreditManagement(),
    expenses: [],
    credits: [],
    salesPerformanceSummary: CalculationUtils.getDefaultSalesPerformanceSummary(),
    summary: CalculationUtils.getDefaultStatsWithCreditManagement(),
    enhancedStats: {
      financialStats: CalculationUtils.getDefaultStatsWithCreditManagement(),
      salesWithProfit: [],
      creditAnalysis: CalculationUtils.calculateCreditAnalysis([], [])
    },
    creditAnalytics: {
      byCashier: [],
      byShop: [],
      cashierPerformance: [],
      shopPerformance: [],
      summary: {
        totalOutstandingCredit: 0,
        totalCreditGiven: 0,
        totalCredits: 0,
        activeCredits: 0,
        overdueCredits: 0
      }
    },
    metadata: {
      processedAt: new Date().toISOString(),
      shopFilter: null,
      recordCounts: {
        transactions: 0,
        creditTransactions: 0,
        completeTransactions: 0,
        expenses: 0,
        credits: 0
      }
    }
  }),

  // NEW: Default stats with credit management integration
  getDefaultStatsWithCreditManagement: () => ({
    // Core metrics for FinancialOverview
    totalSales: 0,
    creditSales: 0,
    nonCreditSales: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    grossProfit: 0,
    netProfit: 0,
    costOfGoodsSold: 0,
    totalMpesaBank: 0,
    totalCash: 0,
    outstandingCredit: 0,
    totalCreditGiven: 0,
    totalAmountPaid: 0,
    
    // Additional metrics
    creditSalesCount: 0,
    profitMargin: 0,
    creditCollectionRate: 0,
    totalTransactions: 0,
    totalItemsSold: 0,
    recognizedCreditRevenue: 0,
    averageCreditSale: 0,
    
    // Credit management integration
    completeTransactionsCount: 0,
    creditStatusBreakdown: {
      pending: 0,
      partially_paid: 0,
      paid: 0,
      overdue: 0
    },
    
    // COGS breakdown
    cogsBreakdown: {
      total: 0,
      fromCreditSales: 0,
      fromCompleteSales: 0
    },
    
    timestamp: new Date().toISOString(),
    _calculatedAt: new Date().toISOString(),
    _creditManagementIntegrated: true,
    _cogsCalculation: 'complete_sales_plus_credit_sales_made'
  }),

  getDefaultSalesPerformanceSummary: () => ({
    totalSales: 0,
    creditSales: 0,
    nonCreditSales: 0,
    completeTransactions: 0,
    totalRevenue: 0,
    debtSalesRevenue: 0,
    nonDebtRevenue: 0,
    expenses: 0,
    grossProfit: 0,
    netProfit: 0,
    costOfGoodsSold: 0,
    costOfGoodsSoldCredit: 0,
    costOfGoodsSoldNonCredit: 0,
    totalMpesa: 0,
    totalBank: 0,
    totalCash: 0,
    outstandingCredit: 0,
    totalCreditCollected: 0,
    debtSalesProfit: 0,
    nonDebtProfit: 0,
    revenueAfterExpenses: 0,
    profitAfterExpenses: 0,
    creditCollectionRate: 0,
    averageCreditSale: 0,
    timestamp: new Date().toISOString(),
    _cogsMethodology: 'complete_sales_plus_credit_sales_made'
  }),

  createFallbackTransaction: (originalTransaction = {}) => ({
    _id: originalTransaction?._id || `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    transactionNumber: originalTransaction?.transactionNumber || `FALLBACK-${Date.now()}`,
    totalAmount: 0,
    cost: 0,
    profit: 0,
    profitMargin: 0,
    paymentMethod: 'cash',
    status: 'completed',
    customerName: 'Walk-in Customer',
    cashierName: 'Unknown Cashier',
    shop: 'Unknown Shop',
    shopName: 'Unknown Shop',
    saleDate: new Date(),
    items: [],
    itemsCount: 0,
    amountPaid: 0,
    recognizedRevenue: 0,
    outstandingRevenue: 0,
    displayDate: dayjs().format('DD/MM/YYYY HH:mm'),
    isCreditTransaction: false,
    creditStatus: null,
    _isValid: false,
    _isFallback: true
  }),

  // Utility function for performance score calculation
  calculatePerformanceScore: (cashier) => {
    if (!cashier) return 0;
    
    const revenueScore = Math.min((cashier.revenue || 0) / 1000, 100);
    const transactionScore = Math.min((cashier.transactions || 0) * 2, 50);
    const marginScore = Math.min((cashier.profitMargin || 0) * 2, 30);
    const itemsScore = Math.min((cashier.itemsSold || 0) / 10, 20);
    
    return revenueScore + transactionScore + marginScore + itemsScore;
  },

  // NEW: Utility function to filter data by date range
  filterDataByDateRange: (data, startDate, endDate, dateField = 'saleDate') => {
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => {
      const itemDate = item[dateField] || item.createdAt || item.date;
      if (!itemDate) return false;
      
      const itemDayjs = dayjs(itemDate);
      const startDayjs = dayjs(startDate);
      const endDayjs = dayjs(endDate);
      
      return itemDayjs.isBetween(startDayjs, endDayjs, null, '[]');
    });
  }
};

export default CalculationUtils;
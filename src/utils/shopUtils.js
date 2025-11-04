// src/utils/shopUtils.js - UPDATED WITH ENHANCED SHOP CLASSIFICATION
export const shopUtils = {
    // Enhanced: Get shop name by ID with transaction-based classification
    getShopName: (shopId, shops = [], creditData = null) => {
      if (!shopId) {
        // Try to get shop name from credit data if available
        if (creditData) {
          return creditData.creditShopName || creditData.shopName || 'Unclassified Shop';
        }
        return 'Unclassified Shop';
      }
      
      const shop = shops.find(s => s._id === shopId);
      if (shop) return shop.name;
      
      // If shop not found in shops array, try to get from credit data
      if (creditData) {
        return creditData.creditShopName || creditData.shopName || 'Unclassified Shop';
      }
      
      return 'Unclassified Shop';
    },
  
    // Enhanced: Get shop details by ID with fallback to transaction data
    getShopDetails: (shopId, shops = [], creditData = null) => {
      if (!shopId) {
        // Create shop details from credit data if available
        if (creditData && (creditData.creditShopName || creditData.shopName)) {
          return {
            _id: creditData.creditShopId || creditData.shopId || 'temp',
            name: creditData.creditShopName || creditData.shopName,
            type: creditData.shopType || 'Retail',
            location: creditData.shopLocation || 'Unknown Location',
            isClassified: !!creditData.creditShopName
          };
        }
        return null;
      }
      
      const shop = shops.find(s => s._id === shopId);
      if (shop) return shop;
      
      // If shop not found, create from credit data
      if (creditData && (creditData.creditShopName || creditData.shopName)) {
        return {
          _id: shopId,
          name: creditData.creditShopName || creditData.shopName,
          type: creditData.shopType || 'Retail',
          location: creditData.shopLocation || 'Unknown Location',
          isClassified: !!creditData.creditShopName
        };
      }
      
      return null;
    },
  
    // Enhanced: Classify transaction by shop type with transaction-based data
    classifyShopTransaction: (credit, shops = []) => {
      if (!credit) return 'Unclassified Shop';
      
      // Priority: creditShopName > shopName > shop lookup
      const shopName = credit.creditShopName || credit.shopName;
      const shopId = credit.creditShopId || credit.shopId || credit.shop;
      
      if (shopName) {
        const shopType = credit.shopType || shopUtils.getShopType(shopId, shops);
        return `${shopName} (${shopType})`;
      }
      
      const shop = shopUtils.getShopDetails(shopId, shops, credit);
      if (shop) {
        return `${shop.name} (${shop.type || 'Retail'})`;
      }
      
      return 'Unclassified Shop';
    },
  
    // Enhanced: Get shop type with transaction fallback
    getShopType: (shopId, shops = [], creditData = null) => {
      const shop = shopUtils.getShopDetails(shopId, shops, creditData);
      return shop?.type || (creditData?.shopType || 'Retail');
    },
  
    // Enhanced: Filter credits by shop with comprehensive shop matching
    filterCreditsByShop: (credits = [], shopId, shops = []) => {
      if (shopId === 'all') return credits;
      if (!Array.isArray(credits)) return [];
      
      return credits.filter(credit => {
        // Check multiple shop identification fields
        const creditShopId = credit.creditShopId || credit.shopId || credit.shop;
        const creditShopName = credit.creditShopName || credit.shopName;
        
        // Direct ID match
        if (creditShopId === shopId) return true;
        
        // Name match (case insensitive)
        const shop = shops.find(s => s._id === shopId);
        if (shop && creditShopName && creditShopName.toLowerCase() === shop.name.toLowerCase()) {
          return true;
        }
        
        // Additional matching for classified shops
        if (shop && credit.isShopClassified && creditShopName) {
          return creditShopName.toLowerCase() === shop.name.toLowerCase();
        }
        
        return false;
      });
    },
  
    // Enhanced: Search that includes comprehensive shop classification
    searchCredits: (credits = [], searchTerm = '', shops = []) => {
      if (!searchTerm || !Array.isArray(credits)) return credits;
      
      const searchLower = searchTerm.toLowerCase();
      
      return credits.filter(credit => {
        // Get comprehensive shop information
        const shopInfo = shopUtils.formatShopDisplay(credit, shops);
        const shopName = shopInfo.displayName.toLowerCase();
        const shopType = shopInfo.type.toLowerCase();
        const shopLocation = (shopInfo.location || '').toLowerCase();
        
        // Customer information
        const customerName = (credit.customerName || '').toLowerCase();
        const customerPhone = credit.customerPhone || '';
        
        // Transaction information
        const transactionNumber = (credit.transactionId?.transactionNumber || '').toLowerCase();
        const cashierName = (credit.cashierName || '').toLowerCase();
        
        // Credit amount information (search by amount)
        const totalAmount = (credit.totalAmount || 0).toString();
        const balanceDue = (credit.balanceDue || 0).toString();
        
        // Search across all relevant fields
        const searchFields = [
          customerName,
          customerPhone,
          transactionNumber,
          cashierName,
          shopName,
          shopType,
          shopLocation,
          totalAmount,
          balanceDue,
          // Include status for searching
          (credit.status || '').toLowerCase(),
          // Include formatted shop classification
          (credit.displayShop || '').toLowerCase()
        ].filter(Boolean);
        
        return searchFields.some(field => field.includes(searchLower));
      });
    },
  
    // NEW: Format shop display with comprehensive classification
    formatShopDisplay: (credit, shops = []) => {
      if (!credit) {
        return {
          displayName: 'Unclassified Shop',
          type: 'Unknown',
          location: 'Unknown Location',
          isClassified: false,
          shopObject: null
        };
      }
      
      // Priority: creditShopName > shopName > shop lookup
      const shopName = credit.creditShopName || credit.shopName;
      const shopId = credit.creditShopId || credit.shopId || credit.shop;
      
      // Try to find shop in shops array
      let shop = shops.find(s => s._id === shopId);
      
      // If shop not found but we have shop name from credit, create a virtual shop
      if (!shop && shopName) {
        shop = {
          _id: shopId || 'virtual',
          name: shopName,
          type: credit.shopType || 'Retail',
          location: credit.shopLocation || 'Unknown Location',
          isVirtual: true
        };
      }
      
      // If no shop found at all, use credit data
      if (!shop) {
        return {
          displayName: shopName || 'Unclassified Shop',
          type: credit.shopType || 'Unknown',
          location: credit.shopLocation || 'Unknown Location',
          isClassified: !!shopName,
          shopObject: null
        };
      }
      
      return {
        displayName: shop.name,
        type: shop.type || 'Retail',
        location: shop.location || 'Unknown Location',
        isClassified: !!shopName || !shop.isVirtual,
        shopObject: shop
      };
    },
  
    // NEW: Get shop statistics for dashboard
    getShopStatistics: (credits = [], shops = []) => {
      const stats = {};
      
      credits.forEach(credit => {
        const shopInfo = shopUtils.formatShopDisplay(credit, shops);
        const shopId = shopInfo.shopObject?._id || 'unclassified';
        const shopName = shopInfo.displayName;
        
        if (!stats[shopId]) {
          stats[shopId] = {
            shopId,
            shopName,
            totalCredits: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalBalance: 0,
            overdueCount: 0,
            pendingCount: 0,
            paidCount: 0,
            partiallyPaidCount: 0,
            isClassified: shopInfo.isClassified
          };
        }
        
        stats[shopId].totalCredits += 1;
        stats[shopId].totalAmount += credit.totalAmount || 0;
        stats[shopId].totalPaid += credit.amountPaid || 0;
        stats[shopId].totalBalance += credit.balanceDue || 0;
        
        // Count by status
        switch (credit.status) {
          case 'overdue':
            stats[shopId].overdueCount += 1;
            break;
          case 'paid':
            stats[shopId].paidCount += 1;
            break;
          case 'partially_paid':
            stats[shopId].partiallyPaidCount += 1;
            break;
          default:
            stats[shopId].pendingCount += 1;
        }
      });
      
      return stats;
    },
  
    // NEW: Group credits by shop for reporting
    groupCreditsByShop: (credits = [], shops = []) => {
      const grouped = {};
      
      credits.forEach(credit => {
        const shopInfo = shopUtils.formatShopDisplay(credit, shops);
        const shopId = shopInfo.shopObject?._id || 'unclassified';
        
        if (!grouped[shopId]) {
          grouped[shopId] = {
            shopInfo,
            credits: []
          };
        }
        
        grouped[shopId].credits.push(credit);
      });
      
      return grouped;
    },
  
    // NEW: Validate shop classification for a credit
    validateShopClassification: (credit) => {
      const errors = [];
      
      if (!credit.creditShopName && !credit.shopName) {
        errors.push('Shop name is required for classification');
      }
      
      if (!credit.creditShopId && !credit.shopId && !credit.shop) {
        errors.push('Shop identification is required');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        classificationLevel: credit.creditShopName ? 'fully_classified' : 
                            credit.shopName ? 'partially_classified' : 'unclassified'
      };
    },
  
    // NEW: Enhance credit data with shop classification
    enhanceCreditWithShopClassification: (credit, shops = []) => {
      if (!credit) return credit;
      
      const shopInfo = shopUtils.formatShopDisplay(credit, shops);
      const validation = shopUtils.validateShopClassification(credit);
      
      return {
        ...credit,
        // Enhanced shop fields
        displayShop: shopInfo.displayName,
        shopType: shopInfo.type,
        shopLocation: shopInfo.location,
        isShopClassified: shopInfo.isClassified,
        shopClassification: validation.classificationLevel,
        // Enhanced status for display
        displayStatus: shopUtils.getCreditStatusDisplay(credit),
        // Shop validation
        shopValidation: validation
      };
    },
  
    // NEW: Get credit status display configuration
    getCreditStatusDisplay: (credit) => {
      if (!credit) return { color: 'default', text: 'Unknown', icon: null };
      
      const status = credit.status;
      const balanceDue = credit.balanceDue || 0;
      const isOverdue = credit.dueDate && new Date(credit.dueDate) < new Date() && balanceDue > 0;
      
      const statusConfig = {
        pending: { 
          color: isOverdue ? 'red' : 'orange', 
          text: isOverdue ? 'Overdue' : 'Pending', 
          icon: 'ClockCircleOutlined' 
        },
        partially_paid: { 
          color: isOverdue ? 'red' : 'blue', 
          text: isOverdue ? 'Overdue' : 'Partially Paid', 
          icon: 'DollarOutlined' 
        },
        paid: { 
          color: 'green', 
          text: 'Paid', 
          icon: 'CheckCircleOutlined' 
        },
        overdue: { 
          color: 'red', 
          text: 'Overdue', 
          icon: 'ExclamationCircleOutlined' 
        }
      };
      
      return statusConfig[status] || statusConfig.pending;
    },
  
    // NEW: Find similar shops for classification suggestions
    findSimilarShops: (shopName, shops = [], limit = 5) => {
      if (!shopName) return [];
      
      const searchTerm = shopName.toLowerCase();
      return shops
        .filter(shop => 
          shop.name.toLowerCase().includes(searchTerm) ||
          (shop.type && shop.type.toLowerCase().includes(searchTerm)) ||
          (shop.location && shop.location.toLowerCase().includes(searchTerm))
        )
        .slice(0, limit);
    },
  
    // NEW: Calculate collection metrics by shop
    calculateShopCollectionMetrics: (credits = [], shops = []) => {
      const shopGroups = shopUtils.groupCreditsByShop(credits, shops);
      const metrics = {};
      
      Object.entries(shopGroups).forEach(([shopId, group]) => {
        const shopCredits = group.credits;
        const totalAmount = shopCredits.reduce((sum, credit) => sum + (credit.totalAmount || 0), 0);
        const totalPaid = shopCredits.reduce((sum, credit) => sum + (credit.amountPaid || 0), 0);
        const totalBalance = shopCredits.reduce((sum, credit) => sum + (credit.balanceDue || 0), 0);
        
        metrics[shopId] = {
          shopInfo: group.shopInfo,
          totalAmount,
          totalPaid,
          totalBalance,
          collectionRate: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
          averageCreditAmount: shopCredits.length > 0 ? totalAmount / shopCredits.length : 0,
          creditCount: shopCredits.length,
          // Performance metrics
          overdueRate: shopCredits.length > 0 ? 
            (shopCredits.filter(c => c.status === 'overdue').length / shopCredits.length) * 100 : 0,
          paidRate: shopCredits.length > 0 ? 
            (shopCredits.filter(c => c.status === 'paid').length / shopCredits.length) * 100 : 0
        };
      });
      
      return metrics;
    }
  };
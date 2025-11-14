import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Spin, 
  Alert, 
  Space, 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Tag, 
  InputNumber,
  Tooltip
} from 'antd';
import { 
  ProductOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined, 
  EyeOutlined, 
  ShoppingOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { productAPI, shopAPI } from '../../services/api';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0 });
  const [form] = Form.useForm();

  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // API response handler
  const handleApiResponse = useCallback((response) => {
    if (!response) return null;

    // Handle array responses
    if (Array.isArray(response)) {
      return response;
    }

    // Handle success/error format
    if (response.success !== undefined) {
      if (response.success) {
        return response.data || response;
      } else {
        throw new Error(response.message || 'API request failed');
      }
    }

    // Handle direct data response
    return response.data || response;
  }, []);

  // Fetch shops with error handling
  const fetchShops = useCallback(async () => {
    try {
      setFetching(true);
      const response = await shopAPI.getAll();
      const shopsData = handleApiResponse(response);
      
      if (shopsData && Array.isArray(shopsData)) {
        setShops(shopsData);
      } else {
        console.warn('Unexpected shops response format:', shopsData);
        setShops([]);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load shops';
      message.warning(errorMessage);
      setShops([]);
    } finally {
      setFetching(false);
    }
  }, [handleApiResponse]);

  // Extract categories from products
  const extractCategoriesFromProducts = useCallback((productsList) => {
    if (!productsList || !Array.isArray(productsList)) return [];
    
    const uniqueCategories = [...new Set(
      productsList
        .map(p => p.category)
        .filter(cat => cat && typeof cat === 'string')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0)
    )];
    
    return uniqueCategories.sort();
  }, []);

  // Calculate product statistics
  const calculateStats = useCallback((productsList) => {
    if (!productsList || !Array.isArray(productsList)) {
      setStats({ total: 0, lowStock: 0, outOfStock: 0 });
      return;
    }
    
    const total = productsList.length;
    const lowStock = productsList.filter(p => 
      p.currentStock > 0 && p.currentStock <= (p.minStockLevel || 5)
    ).length;
    const outOfStock = productsList.filter(p => p.currentStock === 0).length;
    
    setStats({ total, lowStock, outOfStock });
  }, []);

  // Get shop name with fallback strategies
  const getShopName = useCallback((product) => {
    if (!product) return 'Unknown Shop';
    
    // Priority 1: Direct shopName field
    if (product.shopName && product.shopName !== 'Unknown Shop') {
      return product.shopName;
    }
    
    // Priority 2: Shop object with name
    if (product.shop && typeof product.shop === 'object') {
      return product.shop.name || product.shop.shopName || 'Unknown Shop';
    }
    
    // Priority 3: Look up shop from shops list
    if (product.shop) {
      const shopId = typeof product.shop === 'string' ? product.shop : product.shop._id;
      const foundShop = shops.find(s => s._id === shopId);
      if (foundShop) {
        return foundShop.name || foundShop.shopName || 'Unknown Shop';
      }
    }
    
    // Priority 4: Shop ID field
    if (product.shopId) {
      const foundShop = shops.find(s => s._id === product.shopId);
      if (foundShop) {
        return foundShop.name || foundShop.shopName || 'Unknown Shop';
      }
    }
    
    return 'Unknown Shop';
  }, [shops]);

  // Main products fetch function
  const fetchProducts = useCallback(async () => {
    try {
      setFetching(true);
      setError(null);
      
      const response = await productAPI.getAll();
      const productsData = handleApiResponse(response);
      
      if (productsData && Array.isArray(productsData)) {
        const enhancedProducts = productsData.map(product => ({
          ...product,
          displayShopName: getShopName(product)
        }));
        
        setProducts(enhancedProducts);
        calculateStats(enhancedProducts);
        setCategories(extractCategoriesFromProducts(enhancedProducts));
      } else {
        setError('Invalid products data format received from server');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to load products. Please check your connection.';
      setError(errorMessage);
    } finally {
      setFetching(false);
    }
  }, [calculateStats, extractCategoriesFromProducts, handleApiResponse, getShopName]);

  // Initial data loading
  useEffect(() => {
    fetchProducts();
    fetchShops();
  }, [fetchProducts, fetchShops]);

  // API error handler
  const handleApiError = useCallback((error, defaultMessage) => {
    let errorMessage = defaultMessage;
    
    if (error.response) {
      const responseData = error.response.data;
      errorMessage = responseData?.message || 
                   responseData?.error || 
                   `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response from server. Please check if the backend is running.';
    } else {
      errorMessage = error.message;
    }
    
    message.error(errorMessage);
    return errorMessage;
  }, []);

  // Product actions
  const handleAddProduct = useCallback(() => {
    form.resetFields();
    setEditingProduct(null);
    setIsModalVisible(true);
  }, [form]);

  const handleViewProduct = useCallback((product) => {
    setSelectedProduct(product);
    setIsViewModalVisible(true);
  }, []);

  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    
    const shopValue = product.shop?._id || product.shop || product.shopId;
    
    form.setFieldsValue({
      name: product.name,
      category: product.category,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.minSellingPrice || product.sellingPrice,
      currentStock: product.currentStock,
      minStockLevel: product.minStockLevel || 5,
      shop: shopValue
    });
    
    setIsModalVisible(true);
  }, [form]);

  const handleDeleteProduct = useCallback(async (productId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this product?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await productAPI.delete(productId);
          
          if (response && response.success) {
            message.success('Product deleted successfully');
            const updatedProducts = products.filter(product => product._id !== productId);
            setProducts(updatedProducts);
            calculateStats(updatedProducts);
            setCategories(extractCategoriesFromProducts(updatedProducts));
          } else {
            message.error(response?.message || 'Failed to delete product');
          }
        } catch (error) {
          handleApiError(error, 'Failed to delete product');
        } finally {
          setLoading(false);
        }
      }
    });
  }, [handleApiError, products, calculateStats, extractCategoriesFromProducts]);

  // Prepare product data for API
  const prepareProductData = useCallback((values) => {
    const selectedShop = shops.find(shop => shop._id === values.shop);
    
    if (!selectedShop) {
      throw new Error('Selected shop not found. Please refresh and try again.');
    }

    const productData = {
      name: values.name.trim(),
      category: values.category.trim(),
      buyingPrice: Number(values.buyingPrice),
      minSellingPrice: Number(values.sellingPrice),
      currentStock: Number(values.currentStock) || 0,
      minStockLevel: Number(values.minStockLevel) || 5,
      shop: values.shop,
      shopName: selectedShop.name || selectedShop.shopName
    };

    return productData;
  }, [shops]);

  // Handle form submission
  const handleSubmit = useCallback(async (values) => {
    try {
      setLoading(true);
      
      const productData = prepareProductData(values);

      // Validation
      if (!productData.name || productData.name.length < 2) {
        message.error('Product name must be at least 2 characters long');
        return;
      }

      if (!productData.category || productData.category.length < 2) {
        message.error('Category must be at least 2 characters long');
        return;
      }

      if (productData.minSellingPrice < productData.buyingPrice) {
        message.error('Selling price cannot be less than buying price');
        return;
      }

      if (productData.currentStock < 0) {
        message.error('Stock cannot be negative');
        return;
      }

      let response;
      
      if (editingProduct) {
        // Update existing product
        response = await productAPI.update(editingProduct._id, productData);
        
        if (response && (response.success === true || response._id)) {
          const updatedProduct = response.data || response;
          const updatedProducts = products.map(product => 
            product._id === editingProduct._id 
              ? { 
                  ...product, 
                  ...updatedProduct,
                  displayShopName: getShopName({ ...product, ...updatedProduct })
                }
              : product
          );
          
          setProducts(updatedProducts);
          calculateStats(updatedProducts);
          setCategories(extractCategoriesFromProducts(updatedProducts));
          
          message.success('Product updated successfully');
          setIsModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        } else {
          throw new Error(response?.message || 'Failed to update product');
        }
      } else {
        // Create new product
        response = await productAPI.create(productData);
        
        if (response && (response.success === true || response._id)) {
          const newProduct = response.data || response;
          const enhancedProduct = {
            ...newProduct,
            displayShopName: getShopName(newProduct)
          };
          const newProducts = [...products, enhancedProduct];
          setProducts(newProducts);
          calculateStats(newProducts);
          setCategories(extractCategoriesFromProducts(newProducts));
          
          message.success('Product created successfully');
          setIsModalVisible(false);
          form.resetFields();
        } else {
          throw new Error(response?.message || 'Failed to create product');
        }
      }
      
    } catch (error) {
      console.error('Error submitting product:', error);
      
      if (error.response?.status === 400) {
        message.error('Validation failed. Please check your input.');
      } else if (error.response?.status === 409) {
        message.error('A product with this name already exists in this shop');
      } else if (error.response?.status === 404) {
        message.error('Product not found. It may have been deleted.');
      } else {
        const errorMessage = error.message || 
                           (editingProduct ? 'Failed to update product' : 'Failed to add product');
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [editingProduct, products, calculateStats, extractCategoriesFromProducts, form, prepareProductData, getShopName]);

  // Stock status utility
  const getStockStatus = useCallback((product) => {
    if (!product) return { status: 'default', text: 'Unknown', color: '#d9d9d9' };
    
    const currentStock = product.currentStock || 0;
    const minStockLevel = product.minStockLevel || 5;
    
    if (currentStock === 0) {
      return { status: 'error', text: 'Out of Stock', color: '#ff4d4f' };
    } else if (currentStock <= minStockLevel) {
      return { status: 'warning', text: 'Low Stock', color: '#faad14' };
    } else {
      return { status: 'success', text: 'In Stock', color: '#52c41a' };
    }
  }, []);

  // Shop options for forms
  const shopOptions = useMemo(() => {
    return shops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || 'Unknown Shop',
      key: shop._id
    }));
  }, [shops]);

  // Shop filter options
  const shopFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Shops' }
    ];
    
    const shopOptions = shops.map(shop => ({
      value: shop._id,
      label: shop.name || shop.shopName || 'Unknown Shop'
    }));
    
    return [...baseOptions, ...shopOptions];
  }, [shops]);

  // Category filter options
  const categoryFilterOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Categories' }
    ];
    
    const categoryOptions = categories.map(cat => ({
      value: cat,
      label: cat
    }));
    
    return [...baseOptions, ...categoryOptions];
  }, [categories]);

  // Get shop ID from product
  const getShopId = useCallback((product) => {
    if (!product) return null;
    
    if (product.shop && typeof product.shop === 'object') {
      return product.shop._id;
    } else if (product.shop) {
      return product.shop;
    } else if (product.shopId) {
      return product.shopId;
    }
    
    return null;
  }, []);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];

    return products.filter(product => {
      // Search filter
      const matchesSearch = searchText === '' || 
        (product.name && product.name.toLowerCase().includes(searchText.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchText.toLowerCase())) ||
        (getShopName(product) && getShopName(product).toLowerCase().includes(searchText.toLowerCase()));

      // Shop filter
      const matchesShop = selectedShopFilter === 'all' || 
        getShopId(product) === selectedShopFilter;

      // Category filter
      const matchesCategory = selectedCategoryFilter === 'all' || 
        product.category === selectedCategoryFilter;

      return matchesSearch && matchesShop && matchesCategory;
    });
  }, [products, searchText, selectedShopFilter, selectedCategoryFilter, getShopName, getShopId]);

  // Search and filter handlers
  const handleSearch = useCallback((value) => {
    setSearchText(value);
  }, []);

  const handleShopFilterChange = useCallback((value) => {
    setSelectedShopFilter(value);
  }, []);

  const handleCategoryFilterChange = useCallback((value) => {
    setSelectedCategoryFilter(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedShopFilter('all');
    setSelectedCategoryFilter('all');
  }, []);

  // Table columns
  const columns = useMemo(() => [
    { 
      title: 'Product Name', 
      dataIndex: 'name', 
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name || 'Unknown Product'}</div>
          <Tag 
            color={getStockStatus(record).color} 
            style={{ 
              fontSize: '10px', 
              marginTop: '4px',
              border: 'none'
            }}
          >
            {getStockStatus(record).text}
          </Tag>
        </div>
      )
    },
    { 
      title: 'Category', 
      dataIndex: 'category', 
      key: 'category',
      sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
      render: (category) => category || 'Uncategorized'
    },
    { 
      title: 'Buying Price', 
      dataIndex: 'buyingPrice', 
      key: 'buyingPrice', 
      sorter: (a, b) => (a.buyingPrice || 0) - (b.buyingPrice || 0),
      render: price => `KES ${(price || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    { 
      title: 'Selling Price', 
      dataIndex: 'minSellingPrice', 
      key: 'minSellingPrice', 
      sorter: (a, b) => (a.minSellingPrice || 0) - (b.minSellingPrice || 0),
      render: price => `KES ${(price || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    { 
      title: 'Current Stock', 
      dataIndex: 'currentStock', 
      key: 'currentStock',
      sorter: (a, b) => (a.currentStock || 0) - (b.currentStock || 0),
      render: (stock, record) => {
        const stockStatus = getStockStatus(record);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: stockStatus.color,
              fontWeight: stock <= (record.minStockLevel || 5) ? 'bold' : 'normal'
            }}>
              {stock}
            </span>
            {stock <= (record.minStockLevel || 5) && (
              <Tooltip title={`Low stock alert! Minimum level: ${record.minStockLevel || 5}`}>
                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            )}
          </div>
        );
      }
    },
    { 
      title: 'Min Stock Level', 
      dataIndex: 'minStockLevel', 
      key: 'minStockLevel',
      sorter: (a, b) => (a.minStockLevel || 5) - (b.minStockLevel || 5),
      render: level => level || 5
    },
    { 
      title: 'Shop', 
      key: 'shop',
      sorter: (a, b) => getShopName(a).localeCompare(getShopName(b)),
      render: (_, record) => {
        const shopName = getShopName(record);
        const shopId = getShopId(record);
        
        return (
          <Tooltip title={`Shop ID: ${shopId || 'N/A'}`}>
            <Tag color="blue" style={{ margin: 0, cursor: 'pointer' }}>
              {shopName}
            </Tag>
          </Tooltip>
        );
      }
    },
    { 
      title: 'Actions', 
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewProduct(record)}
              disabled={loading}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit Product">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditProduct(record)}
              disabled={loading}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete Product">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteProduct(record._id)}
              disabled={loading}
              size="small"
            />
          </Tooltip>
        </Space>
      )
    },
  ], [handleViewProduct, handleEditProduct, handleDeleteProduct, loading, getStockStatus, getShopName, getShopId]);

  // Loading state
  if (fetching && products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ProductOutlined style={{ fontSize: '24px', color: '#1890ff' }} /> 
          Product Management
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchProducts}
            loading={fetching}
          >
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddProduct}
            disabled={fetching || shopOptions.length === 0}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={stats.total}
              prefix={<ProductOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Low Stock"
              value={stats.lowStock}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Out of Stock"
              value={stats.outOfStock}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="In Stock"
              value={stats.total - stats.outOfStock}
              prefix={<ProductOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error Loading Products"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchProducts}>
              Retry
            </Button>
          }
          style={{ marginBottom: '20px' }}
        />
      )}

      {/* No Shops Warning */}
      {shopOptions.length === 0 && !fetching && (
        <Alert
          message="No Shops Available"
          description={
            <div>
              <p>You need to create shops first before adding products.</p>
              <Button 
                type="primary" 
                size="small" 
                onClick={fetchShops}
                loading={fetching}
              >
                Check for Shops
              </Button>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: '20px' }}
        />
      )}

      {/* Search and Filter Section */}
      <Card 
        title="Search & Filter"
        style={{ marginBottom: '20px' }}
        size="small"
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search products, categories, shops..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Filter by Shop"
              value={selectedShopFilter}
              onChange={handleShopFilterChange}
              options={shopFilterOptions}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Filter by Category"
              value={selectedCategoryFilter}
              onChange={handleCategoryFilterChange}
              options={categoryFilterOptions}
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button 
              icon={<FilterOutlined />}
              onClick={handleClearFilters}
              style={{ width: '100%' }}
            >
              Clear Filters
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ textAlign: 'right', color: '#666', fontSize: '14px' }}>
              Showing: {filteredProducts.length} of {products.length}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Products Table */}
      <Card 
        title={`Products (${filteredProducts.length} of ${products.length})`}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {shopOptions.length > 0 && (
              <Tag color="green">
                {shopOptions.length} shop{shopOptions.length !== 1 ? 's' : ''} available
              </Tag>
            )}
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchProducts}
              loading={fetching}
              size="small"
            >
              Refresh
            </Button>
          </div>
        }
      >
        <Table 
          columns={columns} 
          dataSource={filteredProducts} 
          rowKey="_id"
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`
          }}
          loading={fetching}
          scroll={{ x: 1200 }}
          locale={{ 
            emptyText: fetching ? 'Loading products...' : 'No products found'
          }}
        />
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingProduct ? <EditOutlined /> : <PlusOutlined />}
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnClose
        maskClosable={!loading}
      >
        <Form 
          form={form}
          onFinish={handleSubmit} 
          layout="vertical"
          requiredMark="optional"
          initialValues={{ 
            currentStock: 0, 
            minStockLevel: 5, 
            buyingPrice: 0, 
            sellingPrice: 0 
          }}
        >
          <Form.Item 
            name="name" 
            label="Product Name" 
            rules={[
              { required: true, message: 'Please input product name' },
              { min: 2, message: 'Minimum 2 characters' },
              { max: 100, message: 'Maximum 100 characters' }
            ]}
          >
            <Input 
              placeholder="Enter product name" 
              disabled={loading}
              maxLength={100}
              showCount
            />
          </Form.Item>

          <Form.Item 
            name="category" 
            label="Category" 
            rules={[
              { required: true, message: 'Please input category name' },
              { min: 2, message: 'Minimum 2 characters' },
              { max: 50, message: 'Maximum 50 characters' }
            ]}
          >
            <Input 
              placeholder="Enter category name" 
              disabled={loading}
              maxLength={50}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="buyingPrice" 
                label="Buying Price" 
                rules={[
                  { required: true, message: 'Please input buying price' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Price must be a positive number'
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                  disabled={loading}
                  style={{ width: '100%' }}
                  addonAfter="KES"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="sellingPrice" 
                label="Selling Price" 
                rules={[
                  { required: true, message: 'Please input selling price' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Price must be a positive number'
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                  disabled={loading}
                  style={{ width: '100%' }}
                  addonAfter="KES"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="currentStock" 
                label="Current Stock" 
                rules={[
                  { required: true, message: 'Please input stock quantity' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Stock cannot be negative'
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  placeholder="0"
                  disabled={loading}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="minStockLevel" 
                label={
                  <span>
                    Min Stock Level
                    <Tooltip title="Alert level for low stock">
                      <InfoCircleOutlined style={{ marginLeft: '4px', color: '#999' }} />
                    </Tooltip>
                  </span>
                }
                rules={[
                  { required: true, message: 'Please input minimum stock level' },
                  { 
                    type: 'number',
                    min: 0,
                    message: 'Must be a positive number'
                  }
                ]}
              >
                <InputNumber
                  min={0}
                  placeholder="5"
                  disabled={loading}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            name="shop" 
            label="Shop" 
            rules={[{ required: true, message: 'Please select shop' }]}
            help={shopOptions.length === 0 ? "No shops available. Please add shops first." : undefined}
          >
            <Select 
              placeholder="Select shop" 
              disabled={loading || shopOptions.length === 0}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              options={shopOptions}
              notFoundContent={shopOptions.length === 0 ? "No shops available" : "No shops found"}
            />
          </Form.Item>

          <div style={{ textAlign: 'right', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Button 
              onClick={() => setIsModalVisible(false)} 
              style={{ marginRight: 8 }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading}
              disabled={shopOptions.length === 0}
            >
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Product Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EyeOutlined />
            Product Details
          </div>
        }
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button 
            key="edit" 
            type="primary" 
            onClick={() => {
              setIsViewModalVisible(false);
              handleEditProduct(selectedProduct);
            }}
          >
            Edit Product
          </Button>,
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={500}
      >
        {selectedProduct && (
          <div style={{ lineHeight: '2' }}>
            <p><strong>Name:</strong> {selectedProduct.name}</p>
            <p><strong>Category:</strong> {selectedProduct.category || 'Uncategorized'}</p>
            <p><strong>Buying Price:</strong> KES {(selectedProduct.buyingPrice || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
            <p><strong>Selling Price:</strong> KES {(selectedProduct.minSellingPrice || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
            <p><strong>Current Stock:</strong> 
              <Tag color={getStockStatus(selectedProduct).color} style={{ marginLeft: '8px' }}>
                {selectedProduct.currentStock}
              </Tag>
            </p>
            <p><strong>Min Stock Level:</strong> {selectedProduct.minStockLevel || 5}</p>
            <p><strong>Shop:</strong> 
              <Tag color="blue" style={{ marginLeft: '8px' }}>
                {getShopName(selectedProduct)}
              </Tag>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Shop ID: {getShopId(selectedProduct) || 'N/A'}
              </div>
            </p>
            <p><strong>Status:</strong> 
              <Tag color={getStockStatus(selectedProduct).color} style={{ marginLeft: '8px' }}>
                {getStockStatus(selectedProduct).text}
              </Tag>
            </p>
            {selectedProduct.createdAt && (
              <p><strong>Created:</strong> {new Date(selectedProduct.createdAt).toLocaleString()}</p>
            )}
            {selectedProduct.updatedAt && (
              <p><strong>Last Updated:</strong> {new Date(selectedProduct.updatedAt).toLocaleString()}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductManagement;
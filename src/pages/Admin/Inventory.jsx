// src/pages/Admin/Inventory.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Statistic,
  Input,
  Tag,
  Row,
  Col,
  Typography,
  Alert,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Space,
  Popconfirm,
  Spin,
  Tooltip
} from 'antd';
import { 
  AppstoreOutlined, 
  SearchOutlined, 
  PlusOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import { productAPI, handleApiError, shopAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [shops, setShops] = useState([]); // Added shops state
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form] = Form.useForm();

  // Enhanced API response handler
  const handleApiResponse = useCallback((response, dataKey = 'data') => {
    console.log('📦 API Response:', response);
    
    if (!response) {
      console.warn('⚠️ No response received');
      return null;
    }

    // Handle array responses
    if (Array.isArray(response)) {
      console.log('✅ Returning array response');
      return response;
    }

    // Handle success wrapper pattern
    if (response.success !== undefined) {
      if (response.success) {
        // Success response with data
        if (response[dataKey] !== undefined) {
          console.log(`✅ Extracted ${dataKey} from success response`);
          return response[dataKey];
        } else if (response.data) {
          console.log('✅ Extracted data from success response');
          return response.data;
        } else {
          console.log('✅ Returning full success response');
          return response;
        }
      } else {
        throw new Error(response.message || 'API request failed');
      }
    }

    // Direct data response
    if (response[dataKey] !== undefined) {
      console.log(`✅ Extracted ${dataKey} from response`);
      return response[dataKey];
    }

    // Return the response as-is if no specific structure
    console.log('⚠️ No specific structure found, returning full response');
    return response;
  }, []);

  // Fetch shops data
  const fetchShops = useCallback(async () => {
    try {
      console.log('🔄 Fetching shops data...');
      const response = await shopAPI.getAll();
      const shopsData = handleApiResponse(response, 'shops');
      
      if (shopsData && Array.isArray(shopsData)) {
        console.log('✅ Shops loaded:', shopsData.length);
        setShops(shopsData);
      } else {
        console.warn('⚠️ No shops data found or invalid format');
      }
    } catch (error) {
      console.error('❌ Failed to fetch shops:', error);
      // Don't set error for shops fetch to avoid blocking inventory display
    }
  }, [handleApiResponse]);

  // Calculate statistics from inventory data
  const calculateStats = useCallback((inventoryData) => {
    if (!inventoryData || !Array.isArray(inventoryData)) {
      console.log('⚠️ No products list for stats calculation');
      return;
    }
    
    const totalProducts = inventoryData.length;
    const lowStockCount = inventoryData.filter(item => 
      (item.currentStock || 0) > 0 && (item.currentStock || 0) <= (item.minStockLevel || 5)
    ).length;
    const outOfStockCount = inventoryData.filter(item => (item.currentStock || 0) === 0).length;
    
    // Calculate total inventory value
    const totalInventoryValue = inventoryData.reduce((total, item) => {
      return total + (item.buyingPrice || 0) * (item.currentStock || 0);
    }, 0);
    
    setStats({
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue
    });
    
    console.log('📊 Inventory stats calculated:', { totalProducts, lowStockCount, outOfStockCount, totalInventoryValue });
  }, []);

  // Get shop name from product - Enhanced version
  const getShopName = useCallback((product) => {
    if (!product) return 'Unknown Shop';
    
    // If shop is already an object with name
    if (product.shop && typeof product.shop === 'object') {
      return product.shop.name || product.shop.shopName || 'Unknown Shop';
    } 
    // If shop is an ID, look it up in shops array
    else if (product.shop && shops.length > 0) {
      const foundShop = shops.find(shop => shop._id === product.shop);
      return foundShop?.name || 'Unknown Shop';
    }
    // If no shop data available
    else if (product.shop) {
      return product.shop; // Return as-is if it's a string
    }
    
    return 'Unknown Shop';
  }, [shops]);

  // Fetch inventory data from products API
  const fetchInventory = useCallback(async () => {
    try {
      setFetching(true);
      setError(null);
      console.log('🔄 Fetching inventory data...');
      
      const response = await productAPI.getAll();
      console.log('📦 Raw inventory API response:', response);
      
      const inventoryData = handleApiResponse(response, 'products');
      console.log('🔄 Processed inventory data:', inventoryData);
      
      if (inventoryData && Array.isArray(inventoryData)) {
        console.log('✅ Inventory loaded:', inventoryData.length);
        setInventory(inventoryData);
        calculateStats(inventoryData);
      } else if (inventoryData && typeof inventoryData === 'object') {
        // If inventoryData is an object, try to extract array from it
        const possibleArrays = Object.values(inventoryData).filter(value => Array.isArray(value));
        if (possibleArrays.length > 0) {
          const inventoryArray = possibleArrays[0];
          console.log('✅ Inventory extracted from object:', inventoryArray.length);
          setInventory(inventoryArray);
          calculateStats(inventoryArray);
        } else {
          const errorMsg = 'No products array found in response';
          setError(errorMsg);
          console.error('❌ Inventory API error:', errorMsg);
        }
      } else {
        const errorMsg = 'Invalid inventory data format';
        setError(errorMsg);
        console.error('❌ Inventory API error:', errorMsg);
      }
    } catch (error) {
      console.error('❌ Failed to fetch inventory:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to load inventory data. Please check your connection.';
      setError(errorMessage);
    } finally {
      setFetching(false);
    }
  }, [calculateStats, handleApiResponse]);

  // Fetch both inventory and shops on component mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchShops();
      await fetchInventory();
    };
    
    fetchData();
  }, [fetchInventory, fetchShops]);

  // Handle stock update
  const handleStockUpdate = async (values) => {
    try {
      setLoading(true);
      
      if (!selectedProduct || !selectedProduct._id) {
        message.error('No product selected for update');
        return;
      }

      const updatedStock = (selectedProduct.currentStock || 0) + Number(values.quantity);
      
      if (updatedStock < 0) {
        message.error('Stock cannot be negative');
        return;
      }

      const updateData = {
        currentStock: updatedStock,
        // Include other required fields to prevent validation errors
        name: selectedProduct.name,
        category: selectedProduct.category,
        buyingPrice: selectedProduct.buyingPrice,
        minSellingPrice: selectedProduct.minSellingPrice,
        minStockLevel: selectedProduct.minStockLevel || 5,
        shop: selectedProduct.shop?._id || selectedProduct.shop
      };

      console.log('📤 Updating product stock:', {
        productId: selectedProduct._id,
        updateData: updateData
      });

      const response = await productAPI.update(selectedProduct._id, updateData);
      console.log('📦 Stock update response:', response);
      
      if (response && (response.success || response._id)) {
        const updatedProduct = handleApiResponse(response);
        
        // Update the local state
        const updatedInventory = inventory.map(item => 
          item._id === selectedProduct._id 
            ? { ...item, ...updatedProduct, currentStock: updatedStock }
            : item
        );
        
        setInventory(updatedInventory);
        calculateStats(updatedInventory);
        message.success('Stock updated successfully');
        setIsModalVisible(false);
        form.resetFields();
      } else {
        throw new Error(response?.message || 'Failed to update stock');
      }
    } catch (error) {
      console.error('❌ Error updating stock:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to update stock. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk restock
  const handleRestock = async () => {
    try {
      setLoading(true);
      
      const lowStockItems = inventory.filter(item => 
        (item.currentStock || 0) <= (item.minStockLevel || 5)
      );

      if (lowStockItems.length === 0) {
        message.info('No low stock items found');
        return;
      }

      console.log(`🔄 Restocking ${lowStockItems.length} low stock items`);

      // Update each low stock item
      const updatePromises = lowStockItems.map(item => {
        const restockQuantity = (item.minStockLevel || 5) * 2; // Restock to 2x min level
        const updateData = {
          currentStock: restockQuantity,
          name: item.name,
          category: item.category,
          buyingPrice: item.buyingPrice,
          minSellingPrice: item.minSellingPrice,
          minStockLevel: item.minStockLevel || 5,
          shop: item.shop?._id || item.shop
        };
        
        console.log(`📤 Restocking product ${item._id}:`, updateData);
        return productAPI.update(item._id, updateData);
      });

      const results = await Promise.all(updatePromises);
      console.log('📦 Restock results:', results);

      // Refresh the inventory data
      await fetchInventory();
      
      message.success(`${lowStockItems.length} items restocked successfully`);
      setRestockModalVisible(false);
    } catch (error) {
      console.error('❌ Error restocking:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to restock products. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showUpdateModal = (product) => {
    setSelectedProduct(product);
    setIsModalVisible(true);
    form.setFieldsValue({
      quantity: 0,
      reason: 'restock',
      notes: ''
    });
  };

  const showViewModal = (product) => {
    setSelectedProduct(product);
    setViewModalVisible(true);
  };

  // Stock status helper function
  const getStockStatus = (product) => {
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
  };

  // Filter inventory based on search text - Enhanced to include shop name search
  const filteredInventory = inventory.filter(item =>
    item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchText.toLowerCase()) ||
    getShopName(item).toLowerCase().includes(searchText.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => showViewModal(record)}>
            {name || 'Unknown Product'}
          </div>
          <Tag color={getStockStatus(record).status} style={{ fontSize: '10px', marginTop: '4px', border: 'none' }}>
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
      title: 'Buying Price (KES)',
      dataIndex: 'buyingPrice',
      key: 'buyingPrice',
      render: (price) => `KES ${(price || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a, b) => (a.buyingPrice || 0) - (b.buyingPrice || 0)
    },
    {
      title: 'Selling Price (KES)',
      dataIndex: 'minSellingPrice',
      key: 'minSellingPrice',
      render: (price) => `KES ${(price || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a, b) => (a.minSellingPrice || 0) - (b.minSellingPrice || 0)
    },
    {
      title: 'Current Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock, record) => {
        const stockStatus = getStockStatus(record);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{ 
                color: stockStatus.color,
                fontWeight: (stock || 0) <= (record.minStockLevel || 5) ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
              onClick={() => showUpdateModal(record)}
            >
              {stock || 0}
            </span>
            {(stock || 0) <= (record.minStockLevel || 5) && (
              <Tooltip title={`Low stock alert! Minimum level: ${record.minStockLevel || 5}`}>
                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            )}
          </div>
        );
      },
      sorter: (a, b) => (a.currentStock || 0) - (b.currentStock || 0)
    },
    {
      title: 'Min Stock Level',
      dataIndex: 'minStockLevel',
      key: 'minStockLevel',
      render: (level) => level || 5,
      sorter: (a, b) => (a.minStockLevel || 5) - (b.minStockLevel || 5)
    },
    {
      title: 'Shop',
      dataIndex: 'shop',
      key: 'shop',
      sorter: (a, b) => getShopName(a).localeCompare(getShopName(b)),
      render: (shop, record) => {
        const shopName = getShopName(record);
        return (
          <Tag color="blue" style={{ margin: 0 }}>
            {shopName}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => showViewModal(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Update Stock">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => showUpdateModal(record)}
              size="small"
            >
              Stock
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  if (fetching && inventory.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <p>Loading inventory...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Typography.Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AppstoreOutlined /> Inventory Management
        </Typography.Title>
        
        <Space size="middle" wrap>
          <Input
            placeholder="Search inventory..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px' }}
            allowClear
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setRestockModalVisible(true)}
            disabled={fetching || inventory.length === 0}
          >
            Quick Restock
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={fetchInventory}
            loading={fetching}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {error && (
        <Alert 
          message="Error Loading Inventory" 
          description={error}
          type="error" 
          style={{ marginBottom: '16px' }}
          action={
            <Button size="small" onClick={fetchInventory}>
              Retry
            </Button>
          }
        />
      )}

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={stats.totalProducts || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={stats.lowStockCount || 0}
              valueStyle={{ color: (stats.lowStockCount || 0) > 0 ? '#faad14' : '#52c41a' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Out of Stock"
              value={stats.outOfStockCount || 0}
              valueStyle={{ color: (stats.outOfStockCount || 0) > 0 ? '#f5222d' : '#52c41a' }}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Inventory Value"
              value={stats.totalInventoryValue || 0}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
              prefix="KES"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredInventory}
          rowKey="_id"
          loading={fetching}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`
          }}
          scroll={{ x: true }}
          locale={{ emptyText: error ? 'Error loading inventory' : 'No inventory items found' }}
        />
      </Card>

      {/* Update Stock Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EditOutlined />
            Update Stock - {selectedProduct?.name}
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleStockUpdate}
          initialValues={{ quantity: 0, reason: 'restock' }}
        >
          <Form.Item label="Current Stock">
            <Input value={selectedProduct?.currentStock || 0} disabled />
          </Form.Item>
          
          <Form.Item
            name="quantity"
            label="Adjustment Quantity"
            rules={[
              { required: true, message: 'Please enter quantity' },
              { 
                validator: (_, value) => {
                  const numValue = Number(value);
                  if (isNaN(numValue)) {
                    return Promise.reject('Please enter a valid number');
                  }
                  const newStock = (selectedProduct?.currentStock || 0) + numValue;
                  if (newStock < 0) {
                    return Promise.reject('Resulting stock cannot be negative');
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber 
              placeholder="Positive to add, negative to remove" 
              style={{ width: '100%' }}
              min={-1000}
              max={1000}
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please select a reason' }]}
          >
            <Select placeholder="Select reason" disabled={loading}>
              <Option value="restock">Restock</Option>
              <Option value="damaged">Damaged Goods</Option>
              <Option value="return">Customer Return</Option>
              <Option value="adjustment">Stock Adjustment</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea 
              placeholder="Additional notes..." 
              rows={3} 
              disabled={loading}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
              >
                Update Stock
              </Button>
              <Button 
                onClick={() => setIsModalVisible(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Product Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EyeOutlined />
            Product Details - {selectedProduct?.name}
          </div>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button 
            key="update" 
            type="primary" 
            onClick={() => {
              setViewModalVisible(false);
              showUpdateModal(selectedProduct);
            }}
          >
            Update Stock
          </Button>,
          <Button key="close" onClick={() => setViewModalVisible(false)}>
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
              <Tag color={getStockStatus(selectedProduct).status} style={{ marginLeft: '8px' }}>
                {selectedProduct.currentStock || 0}
              </Tag>
            </p>
            <p><strong>Min Stock Level:</strong> {selectedProduct.minStockLevel || 5}</p>
            <p><strong>Shop:</strong> 
              <Tag color="blue" style={{ marginLeft: '8px' }}>
                {getShopName(selectedProduct)}
              </Tag>
            </p>
            <p><strong>Status:</strong> 
              <Tag color={getStockStatus(selectedProduct).status} style={{ marginLeft: '8px' }}>
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

      {/* Quick Restock Modal */}
      <Modal
        title="Quick Restock Low Stock Items"
        open={restockModalVisible}
        onCancel={() => setRestockModalVisible(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setRestockModalVisible(false)}
            disabled={loading}
          >
            Cancel
          </Button>,
          <Popconfirm
            key="restock"
            title="Are you sure you want to restock all low stock items?"
            description="This will set stock levels to 2x the minimum stock level for all low stock items."
            onConfirm={handleRestock}
            okText="Yes, Restock All"
            cancelText="Cancel"
            disabled={loading}
          >
            <Button type="primary" loading={loading}>
              Restock All
            </Button>
          </Popconfirm>
        ]}
      >
        <p>This will restock all items that are at or below their minimum stock level to 2x their minimum level.</p>
        <Alert
          message={`${inventory.filter(item => (item.currentStock || 0) <= (item.minStockLevel || 5)).length} items will be restocked`}
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </Modal>
    </div>
  );
};

export default Inventory;
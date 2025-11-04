// src/pages/Cashier/Cart.jsx - FINAL ENHANCED VERSION
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, List, Button, InputNumber, Typography, Space,
  Tag, Divider, Popconfirm, Tooltip, Badge, Alert,
  Row, Col, Statistic, Input, Modal, Progress, Select,
  Descriptions, Switch, Form, message // ADDED: message import
} from 'antd';
import {
  DeleteOutlined, ShoppingCartOutlined, CalculatorOutlined,
  ClearOutlined, DollarOutlined, CreditCardOutlined,
  CheckOutlined, ExclamationCircleOutlined,
  EditOutlined, CheckOutlined as CheckIcon, CloseOutlined,
  InfoCircleOutlined, ShopOutlined, TeamOutlined,
  PercentageOutlined, BarcodeOutlined, SafetyCertificateOutlined,
  BulbOutlined, ThunderboltOutlined, CrownOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const Cart = ({ 
  cart, 
  onUpdateItem, 
  onRemoveItem, 
  onClearCart, 
  onCheckout, 
  onUpdateItemPrice,
  loading, 
  totals = {},
  shop,
  customerType = 'regular', // NEW: Customer classification
  onCustomerTypeChange, // NEW: Handle customer type changes
  cashierInfo, // NEW: Cashier information for premium handling
  className = '' // NEW: Additional styling
}) => {
  const [editingPriceItem, setEditingPriceItem] = useState(null);
  const [tempPrice, setTempPrice] = useState(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [bulkDiscountModal, setBulkDiscountModal] = useState(false);
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState(0);
  const [priceHistory, setPriceHistory] = useState({});

  // Enhanced totals with customer classification
  const safeTotals = useMemo(() => {
    const baseTotals = {
      subtotal: totals?.subtotal || 0,
      totalItems: totals?.totalItems || 0,
      profit: totals?.profit || 0,
      profitMargin: totals?.profitMargin || 0,
      grandTotal: totals?.grandTotal || totals?.subtotal || 0,
      discount: totals?.discount || 0,
      tax: totals?.tax || 0
    };

    // Apply customer type modifiers
    let finalTotals = { ...baseTotals };
    
    switch (customerType) {
      case 'premium':
        // 10% discount for premium customers
        finalTotals.discount = baseTotals.subtotal * 0.1;
        finalTotals.grandTotal = baseTotals.subtotal - finalTotals.discount;
        break;
      case 'wholesale':
        // 15% discount for wholesale
        finalTotals.discount = baseTotals.subtotal * 0.15;
        finalTotals.grandTotal = baseTotals.subtotal - finalTotals.discount;
        break;
      case 'vip':
        // 20% discount for VIP
        finalTotals.discount = baseTotals.subtotal * 0.2;
        finalTotals.grandTotal = baseTotals.subtotal - finalTotals.discount;
        break;
      default:
        // Regular customer - no discount
        break;
    }

    return finalTotals;
  }, [totals, customerType]);

  const formatCurrency = (amount) => {
    return `KES ${parseFloat(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Enhanced stock analysis
  const stockAnalysis = useMemo(() => {
    const lowStockItems = cart.filter(item => item.stock > 0 && item.stock < 5);
    const outOfStockItems = cart.filter(item => item.stock === 0);
    const healthyStockItems = cart.filter(item => item.stock >= 5);
    
    return {
      lowStockItems,
      outOfStockItems,
      healthyStockItems,
      hasLowStock: lowStockItems.length > 0,
      hasOutOfStock: outOfStockItems.length > 0,
      totalLowStock: lowStockItems.length,
      totalOutOfStock: outOfStockItems.length
    };
  }, [cart]);

  // Price editing handlers with validation
  const handleStartEditPrice = (item) => {
    setEditingPriceItem(item.productId);
    setTempPrice(item.price);
    
    // Store original price in history
    setPriceHistory(prev => ({
      ...prev,
      [item.productId]: {
        original: item.price,
        timestamp: new Date().toISOString()
      }
    }));
  };

  const handleSavePrice = (productId) => {
    if (onUpdateItemPrice && tempPrice > 0) {
      const newPrice = parseFloat(tempPrice);
      onUpdateItemPrice(productId, newPrice);
      
      // Show price change confirmation
      message.success(`Price updated to ${formatCurrency(newPrice)}`);
    }
    setEditingPriceItem(null);
    setTempPrice(0);
  };

  const handleCancelEditPrice = () => {
    setEditingPriceItem(null);
    setTempPrice(0);
  };

  // Calculate price difference for display
  const getPriceDifference = (item) => {
    const originalPrice = item.originalPrice || item.buyingPrice || 0;
    return item.price - originalPrice;
  };

  // Bulk discount operations
  const applyBulkDiscount = () => {
    if (bulkDiscountPercent > 0 && bulkDiscountPercent <= 50) {
      cart.forEach(item => {
        const discountMultiplier = (100 - bulkDiscountPercent) / 100;
        const discountedPrice = item.originalPrice * discountMultiplier;
        onUpdateItemPrice(item.productId, discountedPrice);
      });
      message.success(`Applied ${bulkDiscountPercent}% discount to all items`);
      setBulkDiscountModal(false);
      setBulkDiscountPercent(0);
    } else {
      message.error('Please enter a valid discount percentage (1-50%)');
    }
  };

  // Customer type options
  const customerTypes = [
    { value: 'regular', label: 'Regular Customer', icon: <TeamOutlined />, color: 'blue' },
    { value: 'premium', label: 'Premium Member', icon: <CrownOutlined />, color: 'gold' },
    { value: 'wholesale', label: 'Wholesale Buyer', icon: <ShopOutlined />, color: 'green' },
    { value: 'vip', label: 'VIP Customer', icon: <SafetyCertificateOutlined />, color: 'purple' }
  ];

  // Get current customer type config
  const currentCustomerType = customerTypes.find(ct => ct.value === customerType) || customerTypes[0];

  // Enhanced cart analysis
  const cartAnalysis = useMemo(() => {
    const totalOriginalValue = cart.reduce((sum, item) => 
      sum + (item.originalPrice || item.buyingPrice || 0) * item.quantity, 0
    );
    const totalCurrentValue = cart.reduce((sum, item) => 
      sum + item.price * item.quantity, 0
    );
    const totalPriceAdjustment = totalCurrentValue - totalOriginalValue;
    
    return {
      totalOriginalValue,
      totalCurrentValue,
      totalPriceAdjustment,
      priceAdjustmentPercent: totalOriginalValue > 0 ? 
        (totalPriceAdjustment / totalOriginalValue) * 100 : 0
    };
  }, [cart]);

  return (
    <Card
      className={`cart-component ${className}`}
      title={
        <Space>
          <ShoppingCartOutlined />
          <span>Shopping Cart</span>
          <Badge 
            count={cart.length} 
            showZero 
            color="#52c41a" 
            style={{ marginLeft: 8 }} 
          />
          {shop && (
            <Tag color="blue" icon={<ShopOutlined />}>
              {shop.name}
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          {/* Customer Type Selector */}
          <Select
            value={customerType}
            onChange={onCustomerTypeChange}
            size="small"
            style={{ width: 140 }}
            disabled={cart.length === 0 || loading}
          >
            {customerTypes.map(type => (
              <Option key={type.value} value={type.value}>
                <Space>
                  {type.icon}
                  {type.label}
                </Space>
              </Option>
            ))}
          </Select>

          {cart.length > 0 && (
            <Popconfirm
              title="Clear Entire Cart"
              description="This will remove all items from your cart. Continue?"
              onConfirm={onClearCart}
              okText="Yes, Clear All"
              cancelText="Cancel"
              okType="danger"
            >
              <Button 
                icon={<ClearOutlined />} 
                danger 
                size="small"
                disabled={loading}
              >
                Clear Cart
              </Button>
            </Popconfirm>
          )}
        </Space>
      }
      style={{ height: 'fit-content', minHeight: '500px' }}
      bodyStyle={{ padding: cart.length === 0 ? '24px' : '16px' }}
    >
      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <ShoppingCartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary" style={{ marginBottom: 8 }}>
            Your Cart is Empty
          </Title>
          <Text type="secondary">
            Start adding products from the inventory to begin a sale
          </Text>
        </div>
      ) : (
        <>
          {/* Enhanced Stock Warnings */}
          {stockAnalysis.hasOutOfStock && (
            <Alert
              message={`${stockAnalysis.totalOutOfStock} Item(s) Out of Stock`}
              description="These items cannot be sold. Please remove them to proceed with checkout."
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
              style={{ marginBottom: 16 }}
              action={
                <Button 
                  size="small" 
                  danger 
                  onClick={() => {
                    stockAnalysis.outOfStockItems.forEach(item => 
                      onRemoveItem(item.productId)
                    );
                    message.success('Removed all out-of-stock items');
                  }}
                >
                  Remove All
                </Button>
              }
            />
          )}
          
          {stockAnalysis.hasLowStock && (
            <Alert
              message={`${stockAnalysis.totalLowStock} Item(s) Low on Stock`}
              description="Consider reordering these items soon to avoid stockouts."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Customer Type Banner */}
          {customerType !== 'regular' && (
            <Alert
              message={
                <Space>
                  {currentCustomerType.icon}
                  <Text strong>{currentCustomerType.label}</Text>
                  <Text type="secondary">
                    {customerType === 'premium' && '10% discount applied'}
                    {customerType === 'wholesale' && '15% discount applied'}
                    {customerType === 'vip' && '20% discount applied'}
                  </Text>
                </Space>
              }
              type="info"
              showIcon={false}
              style={{ 
                marginBottom: 16,
                border: `1px solid #${currentCustomerType.color}33`,
                backgroundColor: `#${currentCustomerType.color}11`
              }}
            />
          )}

          {/* Cart Items with Enhanced Features */}
          <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '16px' }}>
            <List
              dataSource={cart}
              renderItem={(item, index) => {
                const priceDifference = getPriceDifference(item);
                const isPriceEdited = priceDifference !== 0;
                const stockPercentage = (item.stock / (item.maxStock || item.stock + item.quantity)) * 100;
                
                return (
                  <List.Item
                    actions={[
                      <Tooltip title="Adjust price" key="edit">
                        <Button
                          icon={<EditOutlined />}
                          size="small"
                          type={isPriceEdited ? "primary" : "text"}
                          danger={isPriceEdited}
                          onClick={() => handleStartEditPrice(item)}
                          disabled={loading || item.stock === 0}
                        />
                      </Tooltip>,
                      <Tooltip title="Remove from cart" key="remove">
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          type="text"
                          onClick={() => {
                            onRemoveItem(item.productId);
                            message.info(`Removed ${item.name} from cart`);
                          }}
                          disabled={loading}
                        />
                      </Tooltip>
                    ]}
                    style={{
                      opacity: item.stock === 0 ? 0.6 : 1,
                      backgroundColor: item.stock === 0 ? '#fff2f0' : 'transparent',
                      borderBottom: '1px solid #f0f0f0',
                      padding: '12px 0'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ textAlign: 'center', minWidth: 40 }}>
                          {item.stock === 0 ? (
                            <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
                          ) : item.stock < 5 ? (
                            <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '16px' }} />
                          ) : (
                            <Text strong style={{ color: '#52c41a' }}>
                              {index + 1}
                            </Text>
                          )}
                        </div>
                      }
                      title={
                        <Space>
                          <Text 
                            strong 
                            ellipsis={{ tooltip: item.name }}
                            style={{ 
                              color: item.stock === 0 ? '#ff4d4f' : 'inherit',
                              maxWidth: '180px'
                            }}
                          >
                            {item.name}
                          </Text>
                          {item.stock === 0 && (
                            <Tag color="red" style={{ fontSize: '10px', margin: 0 }}>
                              OUT OF STOCK
                            </Tag>
                          )}
                          {item.stock > 0 && item.stock < 5 && (
                            <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>
                              LOW STOCK
                            </Tag>
                          )}
                          {item.barcode && (
                            <Tooltip title={`Barcode: ${item.barcode}`}>
                              <BarcodeOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                            </Tooltip>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                          {/* Price Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            {editingPriceItem === item.productId ? (
                              <Space.Compact style={{ width: '100%' }}>
                                <InputNumber
                                  value={tempPrice}
                                  onChange={setTempPrice}
                                  min={item.originalPrice || item.buyingPrice || 0}
                                  max={item.originalPrice * 3} // Limit to 3x original price
                                  step={1}
                                  precision={2}
                                  size="small"
                                  style={{ width: '120px' }}
                                  formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  parser={value => value.replace(/KES\s?|(,*)/g, '')}
                                  autoFocus
                                  addonBefore="KES"
                                />
                                <Button 
                                  type="primary" 
                                  size="small" 
                                  icon={<CheckIcon />}
                                  onClick={() => handleSavePrice(item.productId)}
                                  disabled={!tempPrice || tempPrice <= 0}
                                />
                                <Button 
                                  size="small" 
                                  icon={<CloseOutlined />}
                                  onClick={handleCancelEditPrice}
                                />
                              </Space.Compact>
                            ) : (
                              <Tooltip title="Click edit button to adjust price">
                                <Space>
                                  <Text 
                                    strong 
                                    style={{ 
                                      color: isPriceEdited ? '#cf1322' : '#1890ff',
                                      fontSize: '14px'
                                    }}
                                  >
                                    {formatCurrency(item.price)} each
                                  </Text>
                                  {isPriceEdited && (
                                    <Tag 
                                      color={priceDifference > 0 ? 'red' : 'green'} 
                                      style={{ fontSize: '10px', margin: 0 }}
                                    >
                                      {priceDifference > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(priceDifference))}
                                    </Tag>
                                  )}
                                </Space>
                              </Tooltip>
                            )}
                            <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
                              {formatCurrency(item.price * item.quantity)}
                            </Text>
                          </div>

                          {/* Quantity & Stock Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Space>
                              <InputNumber
                                size="small"
                                min={1}
                                max={Math.min(item.stock, 999)}
                                value={item.quantity}
                                onChange={(value) => {
                                  onUpdateItem(item.productId, value);
                                  if (value !== item.quantity) {
                                    message.info(`Updated ${item.name} quantity to ${value}`);
                                  }
                                }}
                                style={{ width: '70px' }}
                                disabled={loading || item.stock === 0}
                              />
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                × {item.quantity} units
                              </Text>
                            </Space>
                            <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                Stock: {item.stock}
                              </Text>
                              <Progress 
                                percent={Math.min(stockPercentage, 100)} 
                                size="small" 
                                showInfo={false}
                                strokeColor={
                                  item.stock === 0 ? '#ff4d4f' :
                                  item.stock < 5 ? '#faad14' : '#52c41a'
                                }
                                style={{ width: 60, margin: 0 }}
                              />
                            </Space>
                          </div>

                          {/* Original Price Display */}
                          {isPriceEdited && (
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: '10px' }}>
                                Original: {formatCurrency(item.originalPrice || item.buyingPrice)}
                              </Text>
                            </div>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>

          <Divider />

          {/* Advanced Options Toggle */}
          <div style={{ marginBottom: 16 }}>
            <Switch
              checked={showAdvancedOptions}
              onChange={setShowAdvancedOptions}
              size="small"
              checkedChildren="Advanced"
              unCheckedChildren="Advanced"
            />
            <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
              Show advanced options
            </Text>
          </div>

          {/* Advanced Options Panel */}
          {showAdvancedOptions && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Advanced Cart Operations</Text>
                <Space wrap>
                  <Button 
                    icon={<PercentageOutlined />}
                    size="small"
                    onClick={() => setBulkDiscountModal(true)}
                  >
                    Apply Bulk Discount
                  </Button>
                  <Button 
                    icon={<CalculatorOutlined />}
                    size="small"
                    onClick={() => {
                      Modal.info({
                        title: 'Cart Analysis',
                        content: (
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="Total Original Value">
                              {formatCurrency(cartAnalysis.totalOriginalValue)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Total Adjusted Value">
                              {formatCurrency(cartAnalysis.totalCurrentValue)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Price Adjustment">
                              <Text 
                                type={cartAnalysis.totalPriceAdjustment >= 0 ? 'success' : 'danger'}
                              >
                                {formatCurrency(cartAnalysis.totalPriceAdjustment)} 
                                ({cartAnalysis.priceAdjustmentPercent.toFixed(1)}%)
                              </Text>
                            </Descriptions.Item>
                          </Descriptions>
                        )
                      });
                    }}
                  >
                    Price Analysis
                  </Button>
                </Space>
              </Space>
            </Card>
          )}

          {/* Enhanced Totals Summary */}
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Items"
                  value={safeTotals.totalItems}
                  valueStyle={{ fontSize: '18px' }}
                  prefix={<ShoppingCartOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Subtotal"
                  value={safeTotals.subtotal}
                  precision={2}
                  prefix="KES"
                  valueStyle={{ fontSize: '18px', color: '#1890ff' }}
                />
              </Col>
            </Row>

            {/* Discount Display */}
            {safeTotals.discount > 0 && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#f6ffed', 
                borderRadius: '6px',
                border: '1px solid #b7eb8f'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>
                    <PercentageOutlined style={{ marginRight: 4 }} />
                    {currentCustomerType.label} Discount:
                  </Text>
                  <Text strong type="success">
                    -{formatCurrency(safeTotals.discount)}
                  </Text>
                </div>
              </div>
            )}
            
            {/* Profit Information */}
            <div style={{ 
              padding: '8px 12px', 
              backgroundColor: '#fff7e6', 
              borderRadius: '6px',
              border: '1px solid #ffd591'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>
                  <BulbOutlined style={{ marginRight: 4 }} />
                  Estimated Profit:
                </Text>
                <Text strong type="warning">
                  {formatCurrency(safeTotals.profit)} ({safeTotals.profitMargin.toFixed(1)}%)
                </Text>
              </div>
            </div>

            <Divider style={{ margin: '8px 0' }} />
            
            {/* Grand Total */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              border: `2px solid ${currentCustomerType.color === 'gold' ? '#faad14' : '#1890ff'}`
            }}>
              <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: '16px' }}>Grand Total</Text>
                {customerType !== 'regular' && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {currentCustomerType.label} Price
                  </Text>
                )}
              </Space>
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                {formatCurrency(safeTotals.grandTotal)}
              </Title>
            </div>
          </Space>

          {/* Enhanced Checkout Section */}
          <div style={{ marginTop: '20px' }}>
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={() => onCheckout()}
              icon={<ThunderboltOutlined />}
              disabled={
                cart.length === 0 || 
                stockAnalysis.hasOutOfStock || 
                loading ||
                safeTotals.grandTotal <= 0
              }
              style={{ 
                width: '100%', 
                height: '50px', 
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)'
              }}
            >
              {loading ? (
                <Space>
                  <ThunderboltOutlined spin />
                  PROCESSING TRANSACTION...
                </Space>
              ) : (
                `COMPLETE SALE - ${formatCurrency(safeTotals.grandTotal)}`
              )}
            </Button>
          </div>

          {/* Enhanced Additional Information */}
          <div style={{ marginTop: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {/* Shop & Cashier Info */}
              {(shop || cashierInfo) && (
                <div style={{ textAlign: 'center' }}>
                  <Space>
                    {shop && (
                      <Tag icon={<ShopOutlined />} color="blue">
                        {shop.name}
                        {shop.location && ` • ${shop.location}`}
                      </Tag>
                    )}
                    {cashierInfo && (
                      <Tag icon={<TeamOutlined />} color="green">
                        {cashierInfo.name}
                      </Tag>
                    )}
                  </Space>
                </div>
              )}
              
              {/* Payment Methods Info */}
              <div style={{ textAlign: 'center' }}>
                <Space size="small">
                  <DollarOutlined style={{ color: '#52c41a' }} />
                  <CreditCardOutlined style={{ color: '#1890ff' }} />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Accepts Multiple Payment Methods
                  </Text>
                </Space>
              </div>

              {/* Quick Tips */}
              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '10px' }}>
                    <EditOutlined style={{ marginRight: 4 }} />
                    Click edit icon to adjust prices • Select customer type for discounts
                  </Text>
                  <Text type="secondary" style={{ fontSize: '9px' }}>
                    All prices include VAT where applicable
                  </Text>
                </Space>
              </div>
            </Space>
          </div>
        </>
      )}

      {/* Bulk Discount Modal */}
      <Modal
        title="Apply Bulk Discount"
        open={bulkDiscountModal}
        onCancel={() => {
          setBulkDiscountModal(false);
          setBulkDiscountPercent(0);
        }}
        footer={[
          <Button key="cancel" onClick={() => setBulkDiscountModal(false)}>
            Cancel
          </Button>,
          <Button 
            key="apply" 
            type="primary" 
            onClick={applyBulkDiscount}
            disabled={bulkDiscountPercent <= 0 || bulkDiscountPercent > 50}
          >
            Apply {bulkDiscountPercent}% Discount
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Apply percentage discount to all items in cart:</Text>
          <InputNumber
            value={bulkDiscountPercent}
            onChange={setBulkDiscountPercent}
            min={0}
            max={50}
            precision={0}
            formatter={value => `${value}%`}
            parser={value => value.replace('%', '')}
            style={{ width: '120px' }}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Maximum discount: 50%
          </Text>
          {bulkDiscountPercent > 0 && (
            <Alert
              message={`New subtotal after discount: ${formatCurrency(safeTotals.subtotal * (1 - bulkDiscountPercent / 100))}`}
              type="info"
              showIcon
            />
          )}
        </Space>
      </Modal>
    </Card>
  );
};

export default Cart;
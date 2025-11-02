// src/pages/Cashier/Cart.jsx - FINAL UPDATED VERSION
import React, { useState } from 'react';
import {
  Card, List, Button, InputNumber, Typography, Space,
  Tag, Divider, Popconfirm, Tooltip, Badge, Alert,
  Row, Col, Statistic, Input
} from 'antd';
import {
  DeleteOutlined, ShoppingCartOutlined, CalculatorOutlined,
  ClearOutlined, DollarOutlined, CreditCardOutlined,
  CheckOutlined, ExclamationCircleOutlined,
  EditOutlined, CheckOutlined as CheckIcon, CloseOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Cart = ({ 
  cart, 
  onUpdateItem, 
  onRemoveItem, 
  onClearCart, 
  onCheckout, 
  onUpdateItemPrice, // NEW: Price editing function
  loading, 
  totals = {},
  shop 
}) => {
  const [editingPriceItem, setEditingPriceItem] = useState(null);
  const [tempPrice, setTempPrice] = useState(0);

  // Safe defaults for totals
  const safeTotals = {
    subtotal: totals?.subtotal || 0,
    totalItems: totals?.totalItems || 0,
    profit: totals?.profit || 0,
    profitMargin: totals?.profitMargin || 0,
    grandTotal: totals?.grandTotal || totals?.subtotal || 0
  };

  const formatCurrency = (amount) => {
    return `KES ${parseFloat(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Check for low stock items
  const hasLowStockItems = cart.some(item => item.stock < 10);
  const outOfStockItems = cart.filter(item => item.stock === 0);

  // Price editing handlers
  const handleStartEditPrice = (item) => {
    setEditingPriceItem(item.productId);
    setTempPrice(item.price);
  };

  const handleSavePrice = (productId) => {
    if (onUpdateItemPrice && tempPrice > 0) {
      onUpdateItemPrice(productId, parseFloat(tempPrice));
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

  return (
    <Card
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
        </Space>
      }
      extra={
        cart.length > 0 && (
          <Popconfirm
            title="Clear Cart"
            description="Are you sure you want to clear all items?"
            onConfirm={onClearCart}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Button 
              icon={<ClearOutlined />} 
              danger 
              size="small"
              disabled={loading}
            >
              Clear All
            </Button>
          </Popconfirm>
        )
      }
      style={{ height: 'fit-content' }}
      bodyStyle={{ padding: cart.length === 0 ? '24px' : '16px' }}
    >
      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <ShoppingCartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary" style={{ fontSize: '16px' }}>Your cart is empty</Text>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">Add products from the list to get started</Text>
          </div>
        </div>
      ) : (
        <>
          {/* Stock Warnings */}
          {outOfStockItems.length > 0 && (
            <Alert
              message="Out of Stock Items"
              description={`${outOfStockItems.length} item(s) in your cart are out of stock. Please remove them to proceed.`}
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}
          
          {hasLowStockItems && outOfStockItems.length === 0 && (
            <Alert
              message="Low Stock Warning"
              description="Some items in your cart are running low on stock."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Cart Items */}
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
            <List
              dataSource={cart}
              renderItem={(item) => {
                const priceDifference = getPriceDifference(item);
                const isPriceEdited = priceDifference !== 0;
                
                return (
                  <List.Item
                    actions={[
                      <Tooltip title="Edit price" key="edit">
                        <Button
                          icon={<EditOutlined />}
                          size="small"
                          type="text"
                          onClick={() => handleStartEditPrice(item)}
                          disabled={loading || item.stock === 0}
                        />
                      </Tooltip>,
                      <Tooltip title="Remove item" key="remove">
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          type="text"
                          onClick={() => onRemoveItem(item.productId)}
                          disabled={loading}
                        />
                      </Tooltip>
                    ]}
                    style={{
                      opacity: item.stock === 0 ? 0.6 : 1,
                      backgroundColor: item.stock === 0 ? '#fff2f0' : 'transparent'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        item.stock === 0 ? (
                          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                        ) : item.stock < 5 ? (
                          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                        ) : null
                      }
                      title={
                        <Space>
                          <Text 
                            strong 
                            ellipsis={{ tooltip: item.name }}
                            style={{ 
                              color: item.stock === 0 ? '#ff4d4f' : 'inherit',
                              maxWidth: '200px'
                            }}
                          >
                            {item.name}
                          </Text>
                          {item.stock === 0 && (
                            <Tag color="red" style={{ fontSize: '10px', margin: 0 }}>
                              Out of Stock
                            </Tag>
                          )}
                          {item.stock > 0 && item.stock < 5 && (
                            <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>
                              Low Stock
                            </Tag>
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
                                  step={1}
                                  precision={2}
                                  size="small"
                                  style={{ width: '120px' }}
                                  formatter={value => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  parser={value => value.replace(/KES\s?|(,*)/g, '')}
                                  autoFocus
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
                              <Tooltip title="Click edit button to change price">
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
                                      {priceDifference > 0 ? '+' : ''}{formatCurrency(priceDifference)}
                                    </Tag>
                                  )}
                                </Space>
                              </Tooltip>
                            )}
                            <Text strong style={{ fontSize: '14px' }}>
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
                                onChange={(value) => onUpdateItem(item.productId, value)}
                                style={{ width: '70px' }}
                                disabled={loading || item.stock === 0}
                              />
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                × {item.quantity}
                              </Text>
                            </Space>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Stock: {item.stock}
                            </Text>
                          </div>
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>

          <Divider />

          {/* Totals Summary */}
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Items"
                  value={safeTotals.totalItems}
                  valueStyle={{ fontSize: '18px' }}
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
            
            {/* Profit Information */}
            <div style={{ 
              padding: '8px 12px', 
              backgroundColor: '#f6ffed', 
              borderRadius: '6px',
              border: '1px solid #b7eb8f'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Estimated Profit:</Text>
                <Text strong type="success">
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
              padding: '12px 16px',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              border: '2px solid #1890ff'
            }}>
              <Text strong style={{ fontSize: '16px' }}>Grand Total:</Text>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                {formatCurrency(safeTotals.grandTotal)}
              </Title>
            </div>
          </Space>

          {/* Checkout Button */}
          <div style={{ marginTop: '20px' }}>
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={() => onCheckout()}
              icon={<CheckOutlined />}
              disabled={cart.length === 0 || outOfStockItems.length > 0 || loading}
              style={{ 
                width: '100%', 
                height: '50px', 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'PROCESSING...' : `CHECKOUT - ${formatCurrency(safeTotals.grandTotal)}`}
            </Button>
          </div>

          {/* Additional Information */}
          <div style={{ marginTop: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {shop && (
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Shop: <Text strong>{shop.name}</Text>
                    {shop.location && ` • ${shop.location}`}
                  </Text>
                </div>
              )}
              
              {/* Payment Methods Info */}
              <div style={{ textAlign: 'center' }}>
                <Space size="small">
                  <DollarOutlined style={{ color: '#52c41a' }} />
                  <CreditCardOutlined style={{ color: '#1890ff' }} />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Accepts Cash & Digital Payments
                  </Text>
                </Space>
              </div>

              {/* Price Editing Info */}
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  <EditOutlined style={{ marginRight: 4 }} />
                  Click edit icon to adjust item prices
                </Text>
              </div>
            </Space>
          </div>
        </>
      )}
    </Card>
  );
};

export default Cart;
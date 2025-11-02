// src/pages/Cashier/Receipt.jsx - UPDATED
import React from 'react';
import { Typography, Divider, Row, Col, List, Tag, Space, Alert } from 'antd';
import { 
  ShopOutlined, UserOutlined, CalendarOutlined,
  BarcodeOutlined, DollarOutlined, BankOutlined,
  CreditCardOutlined, PhoneOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Receipt = ({ transaction, shop, companyInfo }) => {
  if (!transaction) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `KES ${parseFloat(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // NEW: Get payment method display info
  const getPaymentMethodInfo = (method) => {
    const methodInfo = {
      cash: { label: 'CASH', color: 'green', icon: <DollarOutlined /> },
      mpesa: { label: 'MPESA', color: 'blue', icon: <BankOutlined /> },
      bank: { label: 'BANK', color: 'orange', icon: <BankOutlined /> },
      cash_mpesa: { label: 'CASH + MPESA', color: 'purple', icon: <><DollarOutlined /> + <BankOutlined /></> },
      credit: { label: 'CREDIT', color: 'red', icon: <CreditCardOutlined /> }
    };
    
    return methodInfo[method] || { label: method?.toUpperCase() || 'CASH', color: 'default', icon: <DollarOutlined /> };
  };

  // NEW: Calculate profit for display
  const calculateItemProfit = (item) => {
    const cost = item.costPrice || 0;
    const price = item.price || 0;
    const profit = price - cost;
    const margin = cost > 0 ? ((profit / cost) * 100) : 0;
    return { profit, margin };
  };

  const paymentMethodInfo = getPaymentMethodInfo(transaction.paymentMethod);

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #000',
      borderRadius: '8px',
      background: '#fff',
      maxWidth: '400px',
      margin: '0 auto',
      fontFamily: "'Courier New', monospace"
    }} className="receipt">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <Title level={3} style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
          <ShopOutlined /> {companyInfo?.name || 'STANZO SHOP'}
        </Title>
        <Text strong style={{ fontSize: '14px' }}>
          {shop?.name || 'Selected Shop'}
        </Text>
        <br />
        <Text style={{ fontSize: '12px' }}>
          {companyInfo?.address || 'Mikinduri, Kenya'}
        </Text>
        <br />
        <Text style={{ fontSize: '12px' }}>
          Tel: {companyInfo?.phone || '+254 746919850'}
        </Text>
        <br />
        <Text style={{ fontSize: '12px' }}>
          {companyInfo?.email || 'stanzokinyua5967@gmail.com'}
        </Text>
        {companyInfo?.slogan && (
          <>
            <br />
            <Text style={{ fontSize: '10px', fontStyle: 'italic' }}>
              {companyInfo.slogan}
            </Text>
          </>
        )}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: '#000' }} />

      {/* Transaction Info */}
      <Space direction="vertical" size={2} style={{ width: '100%', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Receipt No:</Text>
          <Text>{transaction.receiptNumber || transaction.transactionNumber}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Date:</Text>
          <Text>{formatDate(transaction.saleDate || transaction.createdAt)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Cashier:</Text>
          <Text>{transaction.cashierName || 'Cashier'}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Customer:</Text>
          <Text>{transaction.customerName || 'Walk-in Customer'}</Text>
        </div>
        {transaction.customerPhone && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>Phone:</Text>
            <Text>{transaction.customerPhone}</Text>
          </div>
        )}
      </Space>

      <Divider style={{ margin: '12px 0', borderColor: '#000' }} />

      {/* Items with Enhanced Information */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: transaction.paymentMethod === 'credit' ? '2fr 1fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr 1fr',
          fontWeight: 'bold',
          marginBottom: '8px',
          borderBottom: '1px dashed #000',
          paddingBottom: '4px',
          fontSize: '9px'
        }}>
          <Text>Item</Text>
          <Text style={{ textAlign: 'center' }}>Qty</Text>
          <Text style={{ textAlign: 'right' }}>Price</Text>
          <Text style={{ textAlign: 'right' }}>Cost</Text>
          {transaction.paymentMethod === 'credit' && (
            <Text style={{ textAlign: 'right' }}>Profit</Text>
          )}
          <Text style={{ textAlign: 'right' }}>Total</Text>
        </div>

        {transaction.items?.map((item, index) => {
          const itemProfit = calculateItemProfit(item);
          return (
            <div 
              key={index}
              style={{ 
                display: 'grid', 
                gridTemplateColumns: transaction.paymentMethod === 'credit' ? '2fr 1fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr 1fr',
                marginBottom: '4px',
                fontSize: '9px',
                paddingBottom: '2px',
                borderBottom: '1px dotted #ddd'
              }}
            >
              <Text style={{ wordBreak: 'break-word' }}>{item.productName}</Text>
              <Text style={{ textAlign: 'center' }}>{item.quantity}</Text>
              <Text style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</Text>
              <Text style={{ textAlign: 'right' }}>{formatCurrency(item.costPrice)}</Text>
              {transaction.paymentMethod === 'credit' && (
                <Text style={{ 
                  textAlign: 'right', 
                  color: itemProfit.profit > 0 ? '#52c41a' : '#ff4d4f',
                  fontSize: '8px'
                }}>
                  {formatCurrency(itemProfit.profit)}
                  <br />
                  <span style={{ fontSize: '7px' }}>
                    ({itemProfit.margin.toFixed(1)}%)
                  </span>
                </Text>
              )}
              <Text style={{ textAlign: 'right' }}>{formatCurrency(item.price * item.quantity)}</Text>
            </div>
          );
        })}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: '#000' }} />

      {/* NEW: Payment Details based on Payment Method */}
      {transaction.paymentMethod === 'cash_mpesa' && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '10px',
            marginBottom: '8px'
          }}>
            <div style={{ textAlign: 'center', border: '1px solid #d9d9d9', padding: '4px', borderRadius: '4px' }}>
              <Text strong>Cash</Text>
              <br />
              <Text>{formatCurrency(transaction.cashAmount)}</Text>
            </div>
            <div style={{ textAlign: 'center', border: '1px solid #d9d9d9', padding: '4px', borderRadius: '4px' }}>
              <Text strong>Mpesa</Text>
              <br />
              <Text>{formatCurrency(transaction.mpesaAmount)}</Text>
            </div>
          </div>
        </div>
      )}

      {transaction.paymentMethod === 'credit' && (
        <div style={{ marginBottom: '12px' }}>
          <Alert
            message="CREDIT SALE"
            description={
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Amount Paid:</Text>
                  <Text strong type="success">{formatCurrency(transaction.amountPaid)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Balance Due:</Text>
                  <Text strong type="danger">{formatCurrency(transaction.balanceDue)}</Text>
                </div>
                {transaction.dueDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Due Date:</Text>
                    <Text strong>{new Date(transaction.dueDate).toLocaleDateString('en-KE')}</Text>
                  </div>
                )}
              </Space>
            }
            type="warning"
            showIcon
            style={{ fontSize: '10px', padding: '8px' }}
          />
        </div>
      )}

      {/* Totals - Enhanced with Profit Information */}
      <Space direction="vertical" size={2} style={{ width: '100%', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Subtotal:</Text>
          <Text>{formatCurrency(transaction.totalAmount)}</Text>
        </div>
        
        {/* Show profit for credit sales */}
        {transaction.paymentMethod === 'credit' && transaction.totalProfit && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>Profit:</Text>
            <Text type="success">{formatCurrency(transaction.totalProfit)}</Text>
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderTop: '1px dashed #000', 
          paddingTop: '4px',
          fontSize: '12px'
        }}>
          <Text strong>TOTAL:</Text>
          <Text strong>{formatCurrency(transaction.totalAmount)}</Text>
        </div>
      </Space>

      {/* Payment Info - Enhanced */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>Payment Method:</Text>
          <Tag 
            color={paymentMethodInfo.color} 
            icon={paymentMethodInfo.icon}
            style={{ fontSize: '10px', padding: '2px 6px' }}
          >
            {paymentMethodInfo.label}
          </Tag>
        </div>
        
        {/* Additional payment details */}
        {transaction.paymentMethod === 'cash_mpesa' && (
          <div style={{ fontSize: '9px', textAlign: 'center', marginTop: '4px' }}>
            <Text type="secondary">
              Split Payment: Cash {formatCurrency(transaction.cashAmount)} + Mpesa {formatCurrency(transaction.mpesaAmount)}
            </Text>
          </div>
        )}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: '#000' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center' }}>
        <Text style={{ fontSize: '10px', fontStyle: 'italic' }}>
          Thank you for shopping with us!
        </Text>
        <br />
        <Text style={{ fontSize: '9px' }}>
          Quality Products, Best Prices
        </Text>
        <br />
        <Text style={{ fontSize: '9px' }}>
          Customer Service: {companyInfo?.phone || '+254 746919850'}
        </Text>
        {transaction.paymentMethod === 'credit' && (
          <>
            <br />
            <Text style={{ fontSize: '8px', color: '#ff4d4f' }}>
              ⚠️ Please settle balance by due date
            </Text>
          </>
        )}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: '#000' }} />

      {/* Technical Details */}
      <div style={{ textAlign: 'center' }}>
        <Text style={{ fontSize: '8px' }}>
          Transaction ID: {transaction.transactionNumber}
        </Text>
        <br />
        <Text style={{ fontSize: '8px' }}>
          Shop: {shop?.name || 'Unknown Shop'}
        </Text>
        <br />
        <Text style={{ fontSize: '8px' }}>
          Printed: {new Date().toLocaleString('en-KE')}
        </Text>
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .receipt, .receipt * {
              visibility: visible;
            }
            .receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              padding: 10px !important;
              margin: 0 !important;
              font-size: 10px !important;
            }
            .ant-modal-footer,
            .ant-modal-header,
            .ant-modal-close {
              display: none !important;
            }
            .receipt .ant-tag {
              border: 1px solid #000 !important;
              background: white !important;
              color: black !important;
            }
            .receipt .ant-alert {
              border: 1px solid #000 !important;
              background: #fffbe6 !important;
            }
          }
          
          @media print and (max-width: 80mm) {
            .receipt {
              transform: scale(0.8);
              transform-origin: top left;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Receipt;
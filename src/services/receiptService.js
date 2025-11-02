// src/services/receiptService.js
export const generateReceiptData = (transaction, shop, companyInfo) => {
    return {
      company: {
        name: companyInfo?.name || 'STANZO SHOP',
        address: companyInfo?.address || 'Mikinduri, Kenya',
        phone: companyInfo?.phone || '+254 746919850',
        email: companyInfo?.email || 'stanzokinyua5967@gmail.com',
        logo: companyInfo?.logo
      },
      transaction: {
        id: transaction._id,
        receiptNumber: transaction.transactionNumber,
        date: new Date(transaction.saleDate).toLocaleString('en-KE'),
        cashier: transaction.cashierName,
        customer: transaction.customerName,
        paymentMethod: transaction.paymentMethod,
        items: transaction.items?.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: transaction.totalAmount,
        tax: 0,
        total: transaction.totalAmount
      },
      shop: {
        name: shop?.name,
        location: shop?.location
      }
    };
  };
  
  export const printReceipt = (receiptElement) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 20px;
              font-size: 14px;
            }
            .receipt { 
              max-width: 400px; 
              margin: 0 auto;
              border: 1px solid #000;
              padding: 15px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { 
              border-top: 1px dashed #000; 
              margin: 10px 0; 
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          ${receiptElement.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };
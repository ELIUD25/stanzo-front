const Receipt = ({ items, customer, onComplete, onReset }) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const currentDate = new Date().toLocaleString();

  return (
    <div className="border p-4 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Receipt</h3>
      <div className="text-sm mb-4">{currentDate}</div>
      
      {customer && <div className="mb-2">Customer: {customer}</div>}
      
      <div className="border-t pt-2 mb-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between mb-1">
            <span>{item.quantity}x {item.name}</span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      <div className="border-t pt-2 font-bold flex justify-between">
        <span>Total:</span>
        <span>${total.toFixed(2)}</span>
      </div>
      
      {onComplete && (
        <button 
          onClick={onReset}
          className="mt-4 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          New Sale
        </button>
      )}
    </div>
  );
};

export default Receipt;
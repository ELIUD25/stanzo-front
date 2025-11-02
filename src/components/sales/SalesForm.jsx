const SalesForm = ({ cart, customer, onCustomerChange, onQuantityChange, onSubmit }) => {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="border p-4 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Current Order</h3>
      
      <div className="mb-4">
        <label className="block mb-1">Customer Name</label>
        <input
          type="text"
          value={customer}
          onChange={(e) => onCustomerChange(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Optional"
        />
      </div>
      
      {cart.length > 0 ? (
        <>
          <div className="space-y-2 mb-4">
            {cart.map((item, index) => (
              <div key={item._id} className="flex justify-between items-center">
                <div className="flex-1">{item.name}</div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onQuantityChange(item._id, parseInt(e.target.value))}
                    className="w-16 p-1 border rounded text-center"
                  />
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-2 mb-4 font-bold flex justify-between">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          
          <button
            onClick={onSubmit}
            className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
          >
            Complete Sale
          </button>
        </>
      ) : (
        <p className="text-gray-500">No items in cart</p>
      )}
    </div>
  );
};

export default SalesForm;
const InventoryTable = ({ items, onStockUpdate }) => {
  const handleStockChange = (id, value) => {
    const newStock = parseInt(value);
    if (!isNaN(newStock)) {
      onStockUpdate(id, newStock);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Category</th>
            <th className="py-2 px-4 border-b">Price</th>
            <th className="py-2 px-4 border-b">Stock</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td className="py-2 px-4 border-b">{item.name}</td>
              <td className="py-2 px-4 border-b">{item.category}</td>
              <td className="py-2 px-4 border-b">${item.price.toFixed(2)}</td>
              <td className="py-2 px-4 border-b">
                <input
                  type="number"
                  min="0"
                  value={item.stock}
                  onChange={(e) => handleStockChange(item._id, e.target.value)}
                  className="w-20 p-1 border rounded"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
const SalesTable = ({ sales }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Date</th>
            <th className="py-2 px-4 border-b">Customer</th>
            <th className="py-2 px-4 border-b">Items</th>
            <th className="py-2 px-4 border-b">Total</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale._id}>
              <td className="py-2 px-4 border-b">{new Date(sale.date).toLocaleString()}</td>
              <td className="py-2 px-4 border-b">{sale.customer || 'N/A'}</td>
              <td className="py-2 px-4 border-b">
                {sale.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
              </td>
              <td className="py-2 px-4 border-b">${sale.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesTable;
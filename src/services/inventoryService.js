import axios from 'axios';

const API_URL = '/api/inventory';

const getInventory = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

const updateStock = async (id, newStock) => {
  const response = await axios.patch(`${API_URL}/${id}`, { stock: newStock });
  return response.data;
};

export default {
  getInventory,
  updateStock
};
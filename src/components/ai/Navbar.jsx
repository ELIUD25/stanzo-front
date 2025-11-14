import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="bg-white shadow">
      <div className="flex justify-between items-center p-4">
        <h1 className="text-xl font-bold">Shop Management System</h1>
        {user && (
          <div className="flex items-center space-x-4">
            <span>Welcome, {user.name}</span>
            <button 
              onClick={logout}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  const adminLinks = [
    { to: '/admin/drinks', label: 'Drink Management' },
    { to: '/admin/inventory', label: 'Inventory' },
    { to: '/admin/reports', label: 'Sales Reports' },
    { to: '/admin/cashiers', label: 'Cashier Management' }
  ];

  const cashierLinks = [
    { to: '/cashier/pos', label: 'Point of Sale' },
    { to: '/cashier/history', label: 'Sales History' }
  ];

  const links = user?.role === 'admin' ? adminLinks : cashierLinks;

  return (
    <aside className="w-64 bg-gray-800 text-white">
      <nav className="p-4">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) => 
                  `block p-2 rounded hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
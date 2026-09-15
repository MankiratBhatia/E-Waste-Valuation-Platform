import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Intake from './pages/Intake';
import BatchTracker from './pages/BatchTracker';
import Suppliers from './pages/Suppliers';
import Feedback from './pages/Feedback';
import Certificate from './pages/Certificate';
import './index.css';

const PAGES = {
  dashboard:   Dashboard,
  intake:      Intake,
  batches:     BatchTracker,
  suppliers:   Suppliers,
  feedback:    Feedback,
  certificate: Certificate,
};

export default function App() {
  const [page, setPage] = useState('dashboard');
  const Page = PAGES[page] || Dashboard;

  return (
    <div className="app-shell">
      <Sidebar active={page} onNav={setPage} />
      <main className="main-content">
        <Page onNav={setPage} />
      </main>
    </div>
  );
}

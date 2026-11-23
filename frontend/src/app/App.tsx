import React from 'react';
import {WalletProvider,WalletPanel} from './WalletProvider';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReleaseBanner } from '../components/ReleaseBanner';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { HomePage } from '../pages/HomePage';
import { NewBookPage } from '../pages/NewBookPage';
import { BooksCatalogPage } from '../pages/BooksCatalogPage';
import { BookWorkspacePage } from '../pages/BookWorkspacePage';
import { ExamplesPage } from '../pages/ExamplesPage';
import { TransactionPage } from '../pages/TransactionPage';

function LiveWalletControls() {
  const {pathname, search} = useLocation();
  const isLive = pathname.startsWith('/books') && new URLSearchParams(search).get('mode') !== 'offline';
  return isLive ? <WalletPanel /> : null;
}

export const App: React.FC = () => (
  <HashRouter><WalletProvider>
    <div className="app-shell">
      <ReleaseBanner />
      <Navbar /><LiveWalletControls />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/books/new" element={<NewBookPage />} />
          <Route path="/books" element={<BooksCatalogPage />} />
          <Route path="/books/:owner/:tag" element={<BookWorkspacePage />} />
          <Route path="/examples" element={<ExamplesPage />} />
          <Route path="/transactions/:hash" element={<TransactionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  </WalletProvider></HashRouter>
);

export default App;

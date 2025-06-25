// FILE: frontend-react/src/pages/MediaSearchPage.jsx
import React, { useState } from 'react';
import * as api from '../api.js';
import SearchResultItem from '../components/SearchResultItem.jsx';
import './MediaSearchPage.css';

function MediaSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('idle'); // idle, loading, success, error
  const [error, setError] = useState('');

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;

    setSearchStatus('loading');
    setError('');
    try {
      const searchResults = await api.searchMedia(query);
      setResults(searchResults);
      setSearchStatus('success');
    } catch (err) {
      setError(err.message);
      setSearchStatus('error');
    }
  };

  return (
    <div className="media-search-container">
      <h2>Media Search</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for videos, articles, and more..."
          className="search-input"
        />
        <button type="submit" className="search-button" disabled={searchStatus === 'loading'}>
          {searchStatus === 'loading' ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="results-container">
        {searchStatus === 'error' && <p className="error-message">Error: {error}</p>}
        {searchStatus === 'success' && results.length === 0 && <p>No results found.</p>}
        {results.map(result => (
          <SearchResultItem key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}

export default MediaSearchPage;
// FILE: frontend-react/src/components/SearchResultItem.jsx
import React from 'react';
import './SearchResultItem.css';

function SearchResultItem({ result }) {
  return (
    <a href={result.url} target="_blank" rel="noopener noreferrer" className="result-item-link">
      <div className="result-item">
        <img src={result.thumbnail_url} alt={result.title} className="result-thumbnail" />
        <div className="result-details">
          <div className="result-title">{result.title}</div>
          <div className="result-author">by {result.author}</div>
          <div className="result-type">{result.media_type}</div>
        </div>
      </div>
    </a>
  );
}

export default SearchResultItem;
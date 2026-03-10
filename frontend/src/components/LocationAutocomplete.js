import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './LocationAutocomplete.css';

const LocationAutocomplete = ({ onLocationSelect, placeholder, label, initialValue }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialValue || null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef(null);
  const wrapperRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search`,
          {
            params: {
              format: 'json',
              q: query,
              limit: 5,
              addressdetails: 1,
              countrycodes: 'in' // Restrict to India, change as needed
            },
            headers: {
              'User-Agent': 'RideShareDApp/1.0' // Required by Nominatim API
            }
          }
        );

        setSuggestions(response.data);
        setShowDropdown(true);
      } catch (error) {
        console.error('Location search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleSelectLocation = (suggestion) => {
    const location = {
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      address: suggestion.display_name,
      city: suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || '',
      state: suggestion.address?.state || '',
      country: suggestion.address?.country || ''
    };

    setSelectedLocation(location);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onLocationSelect(location);
  };

  const handleRemoveLocation = () => {
    setSelectedLocation(null);
    onLocationSelect(null);
  };

  return (
    <div className="location-autocomplete" ref={wrapperRef}>
      {label && <label className="location-label">{label}</label>}
      
      {selectedLocation ? (
        <div className="location-chip">
          <span className="location-icon">{`\u{1F4CD}`}</span>
          <div className="location-details">
            <div className="location-address">{selectedLocation.address}</div>
            <div className="location-coordinates">
              {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
            </div>
          </div>
          <button 
            type="button"
            className="remove-btn" 
            onClick={handleRemoveLocation}
            aria-label="Remove location"
          >
            {`\u00D7`}
          </button>
        </div>
      ) : (
        <div className="search-container">
          <input
            type="text"
            className="location-input"
            placeholder={placeholder || "Search for a location..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          />
          {loading && <span className="loading-spinner">{`\u23F3`}</span>}
        </div>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.place_id}-${index}`}
              className="suggestion-item"
              onClick={() => handleSelectLocation(suggestion)}
            >
              <span className="suggestion-icon">{`\u{1F4CD}`}</span>
              <div className="suggestion-details">
                <div className="suggestion-name">{suggestion.display_name}</div>
                <div className="suggestion-coordinates">
                  {parseFloat(suggestion.lat).toFixed(4)}, {parseFloat(suggestion.lon).toFixed(4)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 3 && suggestions.length === 0 && !loading && (
        <div className="suggestions-dropdown">
          <div className="no-results">No locations found</div>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;

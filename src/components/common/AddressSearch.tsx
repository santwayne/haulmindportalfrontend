import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [longitude, latitude]
    type: string;
  };
  type: string;
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    district?: string;
    county?: string;
    [key: string]: any;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

interface AddressResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    street?: string;
    street_name?: string;

    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    city_district?: string;

    state?: string;
    state_district?: string;
    province?: string;
    region?: string;

    postcode?: string;
    postal_code?: string;

    country?: string;
    country_code?: string;
  };
}


interface AddressSearchProps {
  placeholder?: string;
  value?: string;
  onAddressSelect: (address: {
    fullAddress: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: string;
    longitude: string;
  }) => void;
  onChange?: (value: string) => void;
  className?: string;
  label?: string;
  debounceMs?: number;
}

const AddressSearch: React.FC<AddressSearchProps> = ({
  placeholder = "Search For An Address...",
  value,
  onAddressSelect,
  onChange,
  className = "",
  label = "Search Address",
  debounceMs = 500
}) => {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update searchQuery when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setSearchQuery(value);
    }
  }, [value]);

  // Search addresses using Google Places Autocomplete (via backend proxy) or Photon API (fallback)
  const searchAddresses = async (query: string) => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    try {
      // Try Google Places Text Search API first (better for full addresses like "12 Aster Dr Unit 103 A, Rosser, MB...")
      console.log('🔍 [AddressSearch] Starting address search for:', query.substring(0, 50));
      const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:3000/api/v1';

      // Try Text Search API first (better for complete addresses)
      const textSearchUrl = `${baseUrl}/places/textsearch?query=${encodeURIComponent(query)}&type=address`;

      console.log('🌐 [AddressSearch] Attempting Google Places Text Search API first (better for full addresses)...');
      console.log('🌐 [AddressSearch] Backend URL:', baseUrl);
      console.log('🌐 [AddressSearch] API Key: Will be retrieved from backend (process.env.GOOGLE_MAPS_API_KEY)');
      console.log('🌐 [AddressSearch] Search query:', query);

      try {
        const textSearchResponse = await fetch(textSearchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        let textSearchData;
        try {
          textSearchData = await textSearchResponse.json();
        } catch (parseError) {
          console.warn('⚠️ [AddressSearch] Failed to parse Text Search response, trying Autocomplete...');
          throw new Error('Invalid response from Text Search API');
        }

        // Check if Text Search was successful
        if (textSearchResponse.ok && textSearchData.success && textSearchData.data?.status === 'OK' && textSearchData.data?.predictions && textSearchData.data.predictions.length > 0) {
          console.log('✅ [AddressSearch] Google Places Text Search API successful! Found', textSearchData.data.predictions.length, 'predictions');
          console.log('📍 [AddressSearch] Using: Google Places Text Search API');

          // Process Text Search results (they're already in the right format)
          const validResults: AddressResult[] = [];

          // Fetch place details for each prediction
          const placeDetailsPromises = textSearchData.data.predictions.slice(0, 8).map(async (prediction: any) => {
            try {
              const detailsUrl = `${baseUrl}/places/details?place_id=${encodeURIComponent(prediction.place_id)}&fields=formatted_address,geometry,address_components,place_id`;

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);

              const detailsResponse = await fetch(detailsUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'application/json'
                }
              });
              clearTimeout(timeoutId);

              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json();
                if (detailsData.success && detailsData.data?.status === 'OK' && detailsData.data?.result) {
                  const result = detailsData.data.result;
                  const addressComponents = result.address_components || [];

                  const getComponent = (type: string) => {
                    const component = addressComponents.find((comp: any) => comp.types.includes(type));
                    return component?.long_name || '';
                  };

                  const getShortComponent = (type: string) => {
                    const component = addressComponents.find((comp: any) => comp.types.includes(type));
                    return component?.short_name || '';
                  };

                  const streetNumber = getComponent('street_number');
                  const route = getComponent('route');
                  const city = getComponent('locality') || getComponent('administrative_area_level_2') || getComponent('sublocality');
                  const state = getComponent('administrative_area_level_1');
                  const postalCode = getComponent('postal_code');
                  const country = getComponent('country');
                  const countryCode = getShortComponent('country');

                  return {
                    place_id: result.place_id,
                    display_name: result.formatted_address || prediction.description,
                    lat: result.geometry?.location?.lat?.toString() || '',
                    lon: result.geometry?.location?.lng?.toString() || '',
                    address: {
                      house_number: streetNumber,
                      road: route,
                      street: route,
                      city: city,
                      state: state,
                      postcode: postalCode,
                      postal_code: postalCode,
                      country: country,
                      country_code: countryCode
                    }
                  };
                }
              }
            } catch (error: any) {
              if (error.name !== 'AbortError') {
                console.warn('Error fetching place details:', error);
              }
              return null;
            }
            return null;
          });

          const placeDetailsResults = await Promise.allSettled(placeDetailsPromises);
          for (const result of placeDetailsResults) {
            if (result.status === 'fulfilled' && result.value !== null) {
              validResults.push(result.value);
            }
          }

          if (validResults.length > 0) {
            console.log('✅ [AddressSearch] Text Search API: Successfully processed', validResults.length, 'address results');
            setResults(validResults);
            setShowResults(true);
            setSelectedIndex(-1);
            setIsSearching(false);
            return;
          }
        } else if (textSearchData.success && textSearchData.data?.status === 'ZERO_RESULTS') {
          console.warn('⚠️ [AddressSearch] Text Search API returned ZERO_RESULTS, trying Autocomplete API...');
        } else {
          console.warn('⚠️ [AddressSearch] Text Search API error, trying Autocomplete API...');
        }
      } catch (textSearchError) {
        console.warn('⚠️ [AddressSearch] Text Search API failed, trying Autocomplete API:', textSearchError);
      }

      // Fallback to Autocomplete API
      const autocompleteUrl = `${baseUrl}/places/autocomplete?input=${encodeURIComponent(query)}&components=country:ca|country:us&types=address`;

      console.log('🔄 [AddressSearch] Trying Google Places Autocomplete API as fallback...');
      try {
        const placesResponse = await fetch(autocompleteUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        let placesData;
        try {
          placesData = await placesResponse.json();
        } catch (parseError) {
          // If JSON parsing fails, fall through to Photon
          console.warn('Failed to parse Google Places response, falling back to Photon');
          throw new Error('Invalid response from Google Places API');
        }

        // Check if request was successful and has valid predictions
        if (placesResponse.ok && placesData.success) {
          if (placesData.data?.status === 'ZERO_RESULTS') {
            console.warn('⚠️ [AddressSearch] Google Places API returned ZERO_RESULTS for query:', query);
            console.warn('⚠️ [AddressSearch] This might be due to query format. Falling back to Photon API...');
          } else if (placesData.data?.status === 'OK' && placesData.data?.predictions && placesData.data.predictions.length > 0) {
            console.log('✅ [AddressSearch] Google Places API successful! Found', placesData.data.predictions.length, 'predictions');
            console.log('📍 [AddressSearch] Using: Google Places API');
            // Fetch place details for top predictions (limit to 8 for performance)
            const topPredictions = placesData.data.predictions.slice(0, 8);
            const placeDetailsPromises = topPredictions.map(async (prediction: any) => {
              try {
                const detailsUrl = `${baseUrl}/places/details?place_id=${encodeURIComponent(prediction.place_id)}&fields=formatted_address,geometry,address_components,place_id`;

                // Add timeout to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const detailsResponse = await fetch(detailsUrl, {
                  signal: controller.signal,
                  headers: {
                    'Accept': 'application/json'
                  }
                });
                clearTimeout(timeoutId);

                if (detailsResponse.ok) {
                  const detailsData = await detailsResponse.json();
                  if (detailsData.success && detailsData.data?.status === 'OK' && detailsData.data?.result) {
                    const result = detailsData.data.result;
                    const addressComponents = result.address_components || [];

                    // Extract address components
                    const getComponent = (type: string) => {
                      const component = addressComponents.find((comp: any) => comp.types.includes(type));
                      return component?.long_name || '';
                    };

                    const getShortComponent = (type: string) => {
                      const component = addressComponents.find((comp: any) => comp.types.includes(type));
                      return component?.short_name || '';
                    };

                    const streetNumber = getComponent('street_number');
                    const route = getComponent('route');
                    const city = getComponent('locality') || getComponent('administrative_area_level_2') || getComponent('sublocality');
                    const state = getComponent('administrative_area_level_1');
                    const postalCode = getComponent('postal_code');
                    const country = getComponent('country');
                    const countryCode = getShortComponent('country');

                    return {
                      place_id: result.place_id,
                      display_name: result.formatted_address || prediction.description,
                      lat: result.geometry?.location?.lat?.toString() || '',
                      lon: result.geometry?.location?.lng?.toString() || '',
                      address: {
                        house_number: streetNumber,
                        road: route,
                        street: route,
                        city: city,
                        state: state,
                        postcode: postalCode,
                        postal_code: postalCode,
                        country: country,
                        country_code: countryCode
                      }
                    };
                  }
                }
              } catch (error: any) {
                // Silently handle errors (timeout, network, etc.)
                if (error.name !== 'AbortError') {
                  console.warn('Error fetching place details:', error);
                }
                return null;
              }
              return null;
            });

            // Use allSettled to handle partial failures gracefully
            const placeDetailsResults = await Promise.allSettled(placeDetailsPromises);
            const validResults: AddressResult[] = [];

            for (const result of placeDetailsResults) {
              if (result.status === 'fulfilled' && result.value !== null) {
                validResults.push(result.value);
              }
            }

            if (validResults.length > 0) {
              console.log('✅ [AddressSearch] Google Places API: Successfully processed', validResults.length, 'address results');
              setResults(validResults);
              setShowResults(true);
              setSelectedIndex(-1);
              setIsSearching(false);
              return;
            } else {
              // No valid results from Google Places - fall through to Photon
              console.warn('⚠️ [AddressSearch] Google Places API returned no valid results, falling back to Photon API');
            }
          } else {
            // ZERO_RESULTS or other status - fall through to Photon
            console.warn('⚠️ [AddressSearch] Google Places API status:', placesData.data?.status, '- Falling back to Photon API');
          }
        } else {
          // Backend returned an error or no results - fall through to Photon
          if (placesData?.fallback_available || placesResponse.status === 503) {
            console.warn('⚠️ [AddressSearch] Google Places API unavailable (billing/authentication issue), falling back to Photon API');
          } else if (placesData?.data?.status) {
            console.warn('⚠️ [AddressSearch] Google Places API error:', placesData.data.status, placesData.data?.error_message, '- Falling back to Photon API');
          } else {
            console.warn('⚠️ [AddressSearch] Google Places API backend error:', placesData?.message || 'Unknown error', '- Falling back to Photon API');
          }
        }
      } catch (googleError) {
        console.warn('⚠️ [AddressSearch] Google Places API via backend failed:', googleError, '- Falling back to Photon API');
        // Fall through to Photon API
      }

      // Fallback to Photon API (Komoot) if Google fails or no API key
      console.log('🔄 [AddressSearch] Using Photon API (Komoot) as fallback...');
      console.log('📍 [AddressSearch] Using: Photon API (Free, Open Source - No API Key Required)');
      console.log('📍 [AddressSearch] Photon API URL: https://photon.komoot.io/api/');
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) {
        console.error('❌ [AddressSearch] Photon API error:', response.status);
        if (response.status === 429) {
          setErrorMessage('Too many requests. Please wait before searching again.');
        } else {
          setErrorMessage(`Search failed. Please try again.`);
        }
        setResults([]);
        setShowResults(false);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PhotonResponse = await response.json();

      console.log('✅ [AddressSearch] Photon API successful! Found', data.features?.length || 0, 'results');

      // Convert Photon format to our AddressResult format
      const convertedResults: AddressResult[] = data.features.map((feature, index) => {
        const props = feature.properties;
        const [lon, lat] = feature.geometry.coordinates;

        // Build display name from available properties
        const nameParts = [
          props.housenumber,
          props.street,
          props.name,
          props.city,
          props.state,
          props.postcode,
          props.country
        ].filter(Boolean);
        const displayName = nameParts.join(', ') || props.name || query;

        // Create a unique ID from coordinates and index
        const uniqueId = `${lat.toFixed(6)}_${lon.toFixed(6)}_${index}`;

        return {
          place_id: parseInt(uniqueId.replace(/[._-]/g, '')) || index,
          display_name: displayName,
          lat: lat.toString(),
          lon: lon.toString(),
          address: {
            house_number: props.housenumber || '',
            road: props.street || '',
            city: props.city || props.district || props.county || '',
            state: props.state || '',
            postcode: props.postcode || '',
            country: props.country || '',
            country_code: props.countrycode || ''
          }
        };
      });

      console.log('✅ [AddressSearch] Photon API: Successfully converted', convertedResults.length, 'address results');
      setResults(convertedResults);
      setShowResults(true);
      setSelectedIndex(-1);

    } catch (error: any) {
      console.error('❌ [AddressSearch] Error searching addresses:', error);

      // Only set error message if not already set
      if (!errorMessage) {
        if (error.message && error.message.includes('Rate limit')) {
          setErrorMessage('Rate limit exceeded. Please wait a moment before searching again.');
        } else if (!error.message.includes('HTTP error')) {
          setErrorMessage('Failed to search addresses. Please try again.');
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchAddresses(searchQuery);
      }, debounceMs);
    } else {
      setResults([]);
      setShowResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debounceMs]);

  // Handle address selection
  const handleAddressSelect = (result: AddressResult) => {
    const address = result.address || {};

    // Extract address components with better fallbacks
    const houseNumber = address.house_number || '';
    const road = address.road || address.street || address.street_name || '';
    const streetAddress = [houseNumber, road].filter(Boolean).join(' ').trim() || result.display_name.split(',')[0];

    // Try multiple fields for city
    const city = address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.city_district ||
      '';

    // Try multiple fields for state/province
    const state = address.state ||
      address.province ||
      address.region ||
      address.state_district ||
      '';

    const postalCode = address.postcode || address.postal_code || '';

    // Get country name or code
    const country = address.country ||
      (address.country_code ? address.country_code.toUpperCase() : '') ||
      '';

    // Call the callback with structured address data
    onAddressSelect({
      fullAddress: result.display_name,
      address: streetAddress,
      city: city,
      state: state,
      postalCode: postalCode,
      country: country,
      latitude: result.lat,
      longitude: result.lon
    });

    // Set the selected address in the input field
    setSearchQuery(result.display_name);
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleAddressSelect(results[selectedIndex]);
        } else if (results.length > 0) {
          handleAddressSelect(results[0]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>

      {/* Label */}
      {label && (
        <label className="block text-xs font-medium text-secondary mb-1">
          {label}
        </label>
      )}

      <div className="relative">

        {/* INPUT */}
        <div className="relative">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />

          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onChange?.(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="
            w-full pl-10 pr-10 py-2 text-sm
            bg-main text-primary
            border border-theme
            rounded-lg
            focus:outline-none
            focus:ring-2 focus:ring-[var(--accent-blue)]
          "
          />

          {/* CLEAR BUTTON */}
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setResults([]);
                setShowResults(false);
                onChange?.('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-accent transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* LOADER */}
          {isSearching && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            </div>
          )}
        </div>

        {/* RESULTS */}
        {showResults && results.length > 0 && (
          <div
            ref={resultsRef}
            className="
            absolute z-50 w-full mt-1
            bg-card border border-theme
            rounded-lg shadow-3xl
            max-h-64 overflow-y-auto
          "
          >
            {results.map((result, index) => (
              <button
                key={`${result.lat}_${result.lon}_${index}`}
                type="button"
                onClick={() => handleAddressSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                w-full text-left px-4 py-3 transition
                border-b border-theme last:border-b-0
                ${selectedIndex === index
                    ? "active-accent"
                    : "hover-accent"}
              `}
              >
                <div className="flex items-start gap-2">

                  <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {result.display_name.split(',')[0]}
                    </p>
                    <p className="text-xs text-secondary truncate">
                      {result.display_name}
                    </p>
                  </div>

                </div>
              </button>
            ))}
          </div>
        )}

        {/* ERROR */}
        {errorMessage && (
          <div className="
          absolute z-50 w-full mt-1
          bg-[rgba(245,158,11,0.1)]
          border border-[var(--accent-orange)]
          rounded-lg shadow-3xl p-3
        ">
            <p className="text-sm text-[var(--accent-orange)] text-center">
              {errorMessage}
            </p>
            <button
              onClick={() => setErrorMessage(null)}
              className="absolute right-2 top-2 text-[var(--accent-orange)] hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* NO RESULTS */}
        {showResults && !isSearching && !errorMessage && results.length === 0 && searchQuery.trim().length >= 3 && (
          <div className="
          absolute z-50 w-full mt-1
          bg-card border border-theme
          rounded-lg shadow-3xl p-4
        ">
            <p className="text-sm text-secondary text-center">
              No addresses found. Try a different search term.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AddressSearch;
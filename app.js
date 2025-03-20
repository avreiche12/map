import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';

const PropertyMapGenerator = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [primaryAddress, setPrimaryAddress] = useState('');
  const [compAddresses, setCompAddresses] = useState(['', '', '', '', '', '']);
  const [mapTitle, setMapTitle] = useState('Property Comparison Map');
  const [primaryColor, setPrimaryColor] = useState('#FF5733');
  const [compColor, setCompColor] = useState('#3366FF');
  const [showLabels, setShowLabels] = useState(true);
  const [mapStyle, setMapStyle] = useState('light');
  
  // Initialize the map when component mounts
  useEffect(() => {
    // Create script elements for leaflet CSS and JS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(linkElement);
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.async = true;
    
    script.onload = () => {
      if (mapRef.current && !map) {
        // Initialize map
        const newMap = L.map(mapRef.current).setView([37.7749, -122.4194], 12);
        
        // Add tile layer based on selected style
        const tileLayer = mapStyle === 'light' 
          ? L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            })
          : L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            });
          
        tileLayer.addTo(newMap);
        setMap(newMap);
      }
    };
    
    document.body.appendChild(script);
    
    // Cleanup function
    return () => {
      if (map) {
        map.remove();
      }
      document.head.removeChild(linkElement);
      document.body.removeChild(script);
    };
  }, []);
  
  // Update tile layer when map style changes
  useEffect(() => {
    if (map) {
      // Remove existing tile layers
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });
      
      // Add new tile layer based on selected style
      const tileLayer = mapStyle === 'light' 
        ? L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          })
        : L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          });
        
      tileLayer.addTo(map);
    }
  }, [map, mapStyle]);
  
  // Function to geocode an address using Nominatim
  const geocodeAddress = async (address) => {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`);
      const data = await response.json();
      
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };
  
  // Function to add markers to the map
  const updateMarkers = async () => {
    if (!map) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Clear existing markers
      markers.forEach(marker => map.removeLayer(marker));
      setMarkers([]);
      
      const newMarkers = [];
      const bounds = L.latLngBounds();
      
      // Process primary address
      if (primaryAddress.trim()) {
        const primaryResult = await geocodeAddress(primaryAddress);
        
        if (primaryResult) {
          const primaryIcon = L.divIcon({
            html: `<div style="background-color: ${primaryColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">P</div>`,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          
          const marker = L.marker([primaryResult.lat, primaryResult.lng], { icon: primaryIcon })
            .addTo(map);
          
          if (showLabels) {
            marker.bindTooltip('Primary', { permanent: true, direction: 'bottom', offset: [0, 10] });
          }
          
          newMarkers.push(marker);
          bounds.extend([primaryResult.lat, primaryResult.lng]);
        }
      }
      
      // Process comparable addresses
      const validCompAddresses = compAddresses.filter(addr => addr.trim() !== '');
      
      for (let i = 0; i < validCompAddresses.length; i++) {
        const address = validCompAddresses[i];
        const result = await geocodeAddress(address);
        
        if (result) {
          const compIcon = L.divIcon({
            html: `<div style="background-color: ${compColor}; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; color: white; font-size: 10px;">C${i+1}</div>`,
            className: '',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          
          const marker = L.marker([result.lat, result.lng], { icon: compIcon })
            .addTo(map);
          
          if (showLabels) {
            marker.bindTooltip(`Comp ${i+1}`, { permanent: true, direction: 'bottom', offset: [0, 8] });
          }
          
          newMarkers.push(marker);
          bounds.extend([result.lat, result.lng]);
        }
      }
      
      setMarkers(newMarkers);
      
      // Fit map to bounds if we have markers
      if (newMarkers.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (err) {
      setError('Error generating map. Please check your addresses and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Debounced version of updateMarkers to prevent too many API calls
  const debouncedUpdateMarkers = useRef(_.debounce(updateMarkers, 1000)).current;
  
  // Update markers when addresses change
  useEffect(() => {
    if (map) {
      debouncedUpdateMarkers();
    }
  }, [map, primaryAddress, compAddresses, primaryColor, compColor, showLabels]);
  
  const handleAddCompAddress = () => {
    if (compAddresses.length < 12) {
      setCompAddresses([...compAddresses, '']);
    }
  };
  
  const handleRemoveCompAddress = (index) => {
    const newAddresses = [...compAddresses];
    newAddresses.splice(index, 1);
    setCompAddresses(newAddresses);
  };
  
  const handleCompAddressChange = (index, value) => {
    const newAddresses = [...compAddresses];
    newAddresses[index] = value;
    setCompAddresses(newAddresses);
  };
  
  const exportMap = () => {
    if (!map) return;
    
    // Create a basic legend element
    const legendControl = L.control({ position: 'bottomleft' });
    legendControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'legend');
      div.style.backgroundColor = 'white';
      div.style.padding = '10px';
      div.style.borderRadius = '5px';
      div.style.border = '1px solid #ccc';
      div.style.marginBottom = '30px';
      
      div.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${mapTitle}</div>
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <div style="background-color: ${primaryColor}; width: 12px; height: 12px; border-radius: 50%; margin-right: 5px;"></div>
          <div>Primary Location</div>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="background-color: ${compColor}; width: 12px; height: 12px; border-radius: 50%; margin-right: 5px;"></div>
          <div>Comparable Properties</div>
        </div>
      `;
      
      return div;
    };
    
    // Add the legend to the map
    legendControl.addTo(map);
    
    // Add the title to the map
    const titleControl = L.control({ position: 'topleft' });
    titleControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'title');
      div.style.backgroundColor = 'white';
      div.style.padding = '5px 10px';
      div.style.borderRadius = '5px';
      div.style.border = '1px solid #ccc';
      div.style.fontSize = '16px';
      div.style.fontWeight = 'bold';
      div.innerHTML = mapTitle;
      return div;
    };
    
    titleControl.addTo(map);
    
    // Use leaflet-image for export (in a real implementation)
    setTimeout(() => {
      // In a real implementation, we would use leaflet-image or html2canvas
      // to capture the map as an image
      alert('In a full implementation, this would save the map as an image file. You would be able to download a PNG or PDF of this map.');
      
      // Remove the legend and title after export
      map.removeControl(legendControl);
      map.removeControl(titleControl);
    }, 500);
  };
  
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Input section */}
        <div className="md:col-span-1">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Map Configuration</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Map Title</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                value={mapTitle}
                onChange={(e) => setMapTitle(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Bulk Address Input</label>
              <div className="mb-2">
                <textarea
                  className="w-full p-2 border border-gray-300 rounded"
                  rows="6"
                  placeholder="Paste all addresses here - first address will be primary, rest will be comparables"
                  onChange={(e) => {
                    const addresses = e.target.value.split('\n')
                      .map(addr => addr.trim())
                      .filter(addr => addr.length > 0);
                    
                    if (addresses.length > 0) {
                      setPrimaryAddress(addresses[0]);
                      setCompAddresses(addresses.slice(1, 13)); // Limit to 12 comps
                    } else {
                      setPrimaryAddress('');
                      setCompAddresses(['']);
                    }
                  }}
                ></textarea>
              </div>
              <div className="text-xs text-gray-600 mb-4">
                Paste one address per line, or separate with line breaks. First address will be primary.
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-2">
                <label className="block text-sm font-medium mb-1">Primary Address</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={primaryAddress}
                  onChange={(e) => setPrimaryAddress(e.target.value)}
                  placeholder="Enter main property address"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">Comparable Properties</label>
                <button 
                  onClick={handleAddCompAddress}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={compAddresses.length >= 12}
                >
                  + Add
                </button>
              </div>
              
              {compAddresses.map((address, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    className="flex-grow p-2 border border-gray-300 rounded-l"
                    value={address}
                    onChange={(e) => handleCompAddressChange(index, e.target.value)}
                    placeholder={`Comp ${index + 1}`}
                  />
                  <button
                    onClick={() => handleRemoveCompAddress(index)}
                    className="px-2 bg-gray-200 text-gray-700 rounded-r hover:bg-gray-300"
                  >
                    ×
                  </button>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-1">
                {compAddresses.length}/12 comparable properties
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Primary Marker</label>
                <input
                  type="color"
                  className="w-full p-1 border border-gray-300 rounded h-8"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comp Marker</label>
                <input
                  type="color"
                  className="w-full p-1 border border-gray-300 rounded h-8"
                  value={compColor}
                  onChange={(e) => setCompColor(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Map Style</label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Show Labels</span>
              </label>
            </div>
            
            <button
              onClick={exportMap}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Export Map'}
            </button>
            
            {error && (
              <div className="mt-4 p-2 bg-red-100 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
            
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
              <p>Powered by OpenStreetMap and Nominatim</p>
              <p className="mt-1">Usage notes:</p>
              <ul className="list-disc pl-4 mt-1">
                <li>Enter full addresses for best results</li>
                <li>Allow a moment for geocoding to complete</li>
                <li>Set a reasonable delay between API requests (~1 second)</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Map preview section */}
        <div className="md:col-span-2">
          <div className="bg-white p-4 rounded shadow h-full">
            <h2 className="text-lg font-semibold mb-4">Map Preview</h2>
            <div className="border border-gray-300 rounded overflow-hidden" style={{ height: "500px" }}>
              <div ref={mapRef} style={{ width: "100%", height: "100%" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyMapGenerator;

// PropertyMapGenerator Component
const PropertyMapGenerator = () => {
  const mapRef = React.useRef(null);
  const [map, setMap] = React.useState(null);
  const [markers, setMarkers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Property data
  const [properties, setProperties] = React.useState([
    { id: 'primary', name: 'Primary Property', address: '', type: 'primary' }
  ]);
  
  // UI settings
  const [mapTitle, setMapTitle] = React.useState('Property Comparison Map');
  const [primaryColor, setPrimaryColor] = React.useState('#FF5733');
  const [compColor, setCompColor] = React.useState('#3366FF');
  const [mapStyle, setMapStyle] = React.useState('minimal');
  const [colorPalette, setColorPalette] = React.useState('color');
  const [showLegend, setShowLegend] = React.useState(true);
  
  // Map style options
  const mapStyles = {
    minimal: {
      name: 'Minimal',
      url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    dark: {
      name: 'Dark',
      url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    grayscale: {
      name: 'Grayscale',
      url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.png',
      attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    blueprint: {
      name: 'Blueprint',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  };
  
  // Initialize the map when component mounts
  React.useEffect(() => {
    if (mapRef.current && !map) {
      // Initialize map
      const newMap = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false, // We'll add our own more discretely
        scrollWheelZoom: true
      }).setView([37.7749, -122.4194], 12);
      
      // Add a minimal attribution control in the bottom-right
      L.control.attribution({
        position: 'bottomright',
        prefix: ''
      }).addTo(newMap);
      
      // Add the selected tile layer
      const style = mapStyles[mapStyle];
      L.tileLayer(style.url, {
        attribution: style.attribution,
        maxZoom: 19
      }).addTo(newMap);
      
      setMap(newMap);
    }
    
    // Cleanup function
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);
  
  // Update tile layer when map style changes
  React.useEffect(() => {
    if (map) {
      // Remove existing tile layers
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });
      
      // Add the selected tile layer
      const style = mapStyles[mapStyle];
      L.tileLayer(style.url, {
        attribution: style.attribution,
        maxZoom: 19
      }).addTo(map);
    }
  }, [map, mapStyle]);
  
  // Function to geocode an address using Nominatim
  const geocodeAddress = async (address) => {
    try {
      const encodedAddress = encodeURIComponent(address);
      // Add a delay between requests to comply with Nominatim usage policy
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      
      // Process primary property first
      const primaryProperty = properties.find(p => p.type === 'primary');
      
      if (primaryProperty && primaryProperty.address.trim()) {
        const result = await geocodeAddress(primaryProperty.address);
        
        if (result) {
          const markerHtml = `<div style="background-color: ${primaryColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">P</div>`;
          
          const primaryIcon = L.divIcon({
            html: markerHtml,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          
          const marker = L.marker([result.lat, result.lng], { 
            icon: primaryIcon,
            property: primaryProperty
          }).addTo(map);
          
          newMarkers.push(marker);
          bounds.extend([result.lat, result.lng]);
        }
      }
      
      // Process comparable properties
      const compProperties = properties.filter(p => p.type === 'comparable' && p.address.trim());
      
      for (let i = 0; i < compProperties.length; i++) {
        const property = compProperties[i];
        const result = await geocodeAddress(property.address);
        
        if (result) {
          const markerHtml = `<div style="background-color: ${compColor}; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; color: white; font-size: 12px; font-weight: bold;">${i + 1}</div>`;
          
          const compIcon = L.divIcon({
            html: markerHtml,
            className: '',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });
          
          const marker = L.marker([result.lat, result.lng], { 
            icon: compIcon,
            property: property
          }).addTo(map);
          
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
  
  // Debounced version of updateMarkers
  const debouncedUpdateMarkers = React.useCallback(_.debounce(() => {
    updateMarkers();
  }, 1000), [properties, primaryColor, compColor, map]);
  
  // Update markers when properties change
  React.useEffect(() => {
    if (map) {
      debouncedUpdateMarkers();
    }
  }, [map, properties, primaryColor, compColor]);
  
  // Handle adding a new comparable property
  const handleAddProperty = () => {
    const compCount = properties.filter(p => p.type === 'comparable').length;
    if (compCount < 12) {
      const newProperty = {
        id: `comp-${Date.now()}`,
        name: `Comparable ${compCount + 1}`,
        address: '',
        type: 'comparable'
      };
      
      setProperties([...properties, newProperty]);
    }
  };
  
  // Handle removing a property
  const handleRemoveProperty = (id) => {
    const newProperties = properties.filter(p => p.id !== id);
    setProperties(newProperties);
  };
  
  // Handle property changes
  const handlePropertyChange = (id, field, value) => {
    const updatedProperties = properties.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    });
    
    setProperties(updatedProperties);
  };
  
  // Parse bulk input text
  const handleBulkAddressInput = (text) => {
    // Split input by lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) return;
    
    const newProperties = [];
    
    // Process each line
    lines.forEach((line, index) => {
      // Check if line contains a tab character or multiple spaces
      const parts = line.split(/\t|(?:\s{2,})/);
      
      let name, address;
      
      if (parts.length >= 2) {
        // Format: "Name [tab] Address"
        name = parts[0].trim();
        address = parts.slice(1).join(' ').trim();
      } else {
        // Just an address, no name
        address = line.trim();
        name = index === 0 ? 'Primary Property' : `Comparable ${index}`;
      }
      
      const type = index === 0 ? 'primary' : 'comparable';
      
      newProperties.push({
        id: type === 'primary' ? 'primary' : `comp-${Date.now()}-${index}`,
        name,
        address,
        type
      });
    });
    
    // Update properties state
    setProperties(newProperties);
  };
  
  // Export map as PNG
  const exportMap = () => {
    if (!map) return;
    
    // Create a legend element if it doesn't exist
    let legendControl = document.querySelector('.map-legend-control');
    if (!legendControl) {
      legendControl = L.control({ position: 'bottomright' });
      legendControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend-control legend');
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.border = '1px solid #ccc';
        div.style.marginBottom = '10px';
        div.style.maxWidth = '250px';
        div.style.maxHeight = '400px';
        div.style.overflowY = 'auto';
        div.style.fontSize = '12px';
        
        const primaryProperty = properties.find(p => p.type === 'primary');
        const compProperties = properties.filter(p => p.type === 'comparable' && p.address.trim());
        
        let html = `<div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">${mapTitle}</div>`;
        
        if (primaryProperty) {
          html += `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <div style="background-color: ${primaryColor}; width: 16px; height: 16px; border-radius: 50%; margin-right: 8px; flex-shrink: 0;"></div>
              <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${primaryProperty.name}</div>
            </div>
          `;
        }
        
        compProperties.forEach((property, i) => {
          html += `
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="background-color: ${compColor}; width: 16px; height: 16px; border-radius: 50%; margin-right: 8px; flex-shrink: 0; display: flex; justify-content: center; align-items: center; color: white; font-size: 10px; font-weight: bold;">${i + 1}</div>
              <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${property.name}</div>
            </div>
          `;
        });
        
        div.innerHTML = html;
        return div;
      };
      
      legendControl.addTo(map);
    }
    
    // Add title to the map
    let titleControl = document.querySelector('.map-title-control');
    if (!titleControl) {
      titleControl = L.control({ position: 'topleft' });
      titleControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-title-control');
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
    }

    // Wait for controls to render
    setTimeout(() => {
      // Use html2canvas to capture the map
      html2canvas(mapRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      }).then(canvas => {
        // Convert canvas to PNG
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create a link to download the image
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${mapTitle.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Remove controls after export
        map.removeControl(legendControl);
        map.removeControl(titleControl);
      }).catch(err => {
        console.error('Error exporting map:', err);
        alert('There was an error exporting the map. Please try again.');
      });
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
                  placeholder="Paste all addresses here, one per line. Format: 'Name [tab] Address'"
                  onChange={(e) => handleBulkAddressInput(e.target.value)}
                ></textarea>
              </div>
              <div className="text-xs text-gray-600 mb-4">
                Format examples:<br/>
                "Primary [tab] 123 Main St, City, State"<br/>
                "Comparable 1 [tab] 456 Oak Ave, City, State"
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium">Properties</label>
                <button 
                  onClick={handleAddProperty}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={properties.filter(p => p.type === 'comparable').length >= 12}
                >
                  + Add Comparable
                </button>
              </div>
              
              {/* Properties list with editable names and addresses */}
              {properties.map((property) => (
                <div key={property.id} className="mt-3 p-2 border border-gray-200 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      className="flex-grow p-1 border border-gray-300 rounded"
                      value={property.name}
                      onChange={(e) => handlePropertyChange(property.id, 'name', e.target.value)}
                      placeholder="Property Name"
                    />
                    {property.type !== 'primary' && (
                      <button
                        onClick={() => handleRemoveProperty(property.id)}
                        className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="w-full p-1 border border-gray-300 rounded"
                    value={property.address}
                    onChange={(e) => handlePropertyChange(property.id, 'address', e.target.value)}
                    placeholder="Address"
                  />
                </div>
              ))}
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
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Map Style</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded"
                  value={mapStyle}
                  onChange={(e) => setMapStyle(e.target.value)}
                >
                  <option value="minimal">Minimal</option>
                  <option value="dark">Dark</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="blueprint">Blueprint</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Legend</label>
                <div className="flex items-center h-10">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showLegend}
                      onChange={(e) => setShowLegend(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Show Legend</span>
                  </label>
                </div>
              </div>
            </div>
            
            <button
              onClick={exportMap}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Export Map (PNG)'}
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
                <li>Use the legend to identify properties</li>
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
            
            {/* Property Legend (displayed on desktop devices next to map) */}
            {showLegend && (
              <div className="mt-4 p-3 border border-gray-200 rounded overflow-y-auto max-h-48 hidden md:block">
                <div className="font-semibold mb-2">Property Legend</div>
                
                {/* Primary property */}
                {properties.filter(p => p.type === 'primary').map(property => (
                  <div key={property.id} className="flex items-center mb-2">
                    <div 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2" 
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span className="text-white text-xs font-bold">P</span>
                    </div>
                    <div className="flex-grow truncate text-sm">{property.name}</div>
                  </div>
                ))}
                
                {/* Comparable properties */}
                {properties.filter(p => p.type === 'comparable').map((property, i) => (
                  <div key={property.id} className="flex items-center mb-1">
                    <div 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2" 
                      style={{ backgroundColor: compColor }}
                    >
                      <span className="text-white text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-grow truncate text-sm">{property.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Render the component
ReactDOM.render(<PropertyMapGenerator />, document.getElementById('root'));

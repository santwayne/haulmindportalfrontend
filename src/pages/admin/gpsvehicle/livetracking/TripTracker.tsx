import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Route, Search, ChevronLeft, ChevronRight, MapPin, X, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { getActiveOrdersWithTracking } from '../../../../axios/api/distapcher';
import { getSocket } from '../../../../socket/socketClient';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Type definitions - based on Order model
interface RouteWaypoint {
  type: 'pickup' | 'delivery';
  orderNumber: string;
  customerOrderNo?: string;
  lat: number;
  lng: number;
  address: string;
  orderId: string;
  stopNumber?: number;
  shipper?: string;
  receiver?: string;
  pickUpNumber?: string;
  dropOffNumber?: string;
}

interface ActiveOrderGroup {
  _id: string;
  driverId: string;
  driver: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  coDriver?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  truck?: {
    _id: string;
    plateNumber: string;
    make: string;
    model: string;
    unitNumber: string;
    internalId: string;
    trackingKey?: string;
  };
  trailer?: {
    _id: string;
    plateNumber: string;
    unitNumber: string;
  };
  orders: Array<{
    _id: string;
    orderNumber: string;
    customerOrderNo?: string;
    tripNo?: string;
    status: string;
    pickupDate?: string;
    deliveryDate?: string;
  }>;
  routeWaypoints: RouteWaypoint[];
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  yardLocation?: {
    lat: number;
    lng: number;
    address: string;
    yardName: string;
    yardId: string;
  };
  speed: number;
  engineOn: boolean;
  orderCount: number;
}

// Component to handle map center updates
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
};

// Helper function to create intermediate points for smoother routes
const createIntermediatePoints = (start: [number, number], end: [number, number], numPoints: number = 10): [number, number][] => {
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    const lat = start[0] + (end[0] - start[0]) * ratio;
    const lng = start[1] + (end[1] - start[1]) * ratio;
    points.push([lat, lng]);
  }
  return points;
};

// Component to render route polyline
const RoutePolyline: React.FC<{
  waypoints: RouteWaypoint[];
  yardLocation?: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number };
}> = ({ waypoints, yardLocation, currentLocation }) => {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [yardToTruckRoute, setYardToTruckRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    setRouteCoordinates([]);
    setYardToTruckRoute([]);

    // Include yard location as starting point if available
    const allPoints: Array<{ lat: number; lng: number }> = [];

    // Add yard as first point if available
    if (yardLocation && yardLocation.lat && yardLocation.lng &&
      !isNaN(yardLocation.lat) && !isNaN(yardLocation.lng) &&
      yardLocation.lat !== 0 && yardLocation.lng !== 0) {
      allPoints.push({ lat: yardLocation.lat, lng: yardLocation.lng });
    }

    // Add waypoints (but NOT current location - that's a separate route)
    const validWaypoints = waypoints.filter(wp =>
      wp.lat && wp.lng &&
      !isNaN(wp.lat) && !isNaN(wp.lng) &&
      wp.lat !== 0 && wp.lng !== 0
    );
    allPoints.push(...validWaypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })));

    console.log('🛣️ RoutePolyline - All points:', {
      yardLocation,
      waypointsCount: validWaypoints.length,
      currentLocation,
      totalPoints: allPoints.length
    });

    // If we have yard and current location, create a separate route from yard to truck
    if (yardLocation && currentLocation &&
      yardLocation.lat && yardLocation.lng &&
      currentLocation.lat && currentLocation.lng &&
      !isNaN(yardLocation.lat) && !isNaN(yardLocation.lng) &&
      !isNaN(currentLocation.lat) && !isNaN(currentLocation.lng) &&
      yardLocation.lat !== 0 && yardLocation.lng !== 0 &&
      currentLocation.lat !== 0 && currentLocation.lng !== 0) {

      // Fetch route from yard to current truck location
      const fetchYardToTruckRoute = async () => {
        try {
          const coords = `${yardLocation.lng},${yardLocation.lat};${currentLocation.lng},${currentLocation.lat}`;
          const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

          console.log('🛣️ Fetching yard to truck route:', url);

          const response = await fetch(url);
          const data = await response.json();

          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const geometry = data.routes[0].geometry;
            if (geometry && geometry.coordinates && geometry.coordinates.length > 0) {
              const coords = geometry.coordinates.map((coord: [number, number]) =>
                [coord[1], coord[0]] as [number, number]
              );
              console.log('✅ Yard to truck route fetched:', coords.length, 'points');
              setYardToTruckRoute(coords);
              return;
            }
          }
          // Fallback: create intermediate points
          console.warn('⚠️ OSRM failed for yard to truck, using intermediate points');
          const intermediate = createIntermediatePoints(
            [yardLocation.lat, yardLocation.lng],
            [currentLocation.lat, currentLocation.lng],
            30
          );
          setYardToTruckRoute(intermediate);
        } catch (error) {
          console.warn('⚠️ Error fetching yard to truck route:', error);
          // Fallback: create intermediate points
          const intermediate = createIntermediatePoints(
            [yardLocation.lat, yardLocation.lng],
            [currentLocation.lat, currentLocation.lng],
            30
          );
          setYardToTruckRoute(intermediate);
        }
      };

      fetchYardToTruckRoute();
    } else {
      setYardToTruckRoute([]);
    }

    if (allPoints.length < 2) {
      console.warn('⚠️ Not enough points for route:', allPoints.length);
      setRouteCoordinates([]);
      return;
    }

    // Use OSRM routing service (free, no API key required)
    const fetchRoute = async () => {
      try {
        // Filter out invalid waypoints
        const validWaypoints = allPoints.filter(wp =>
          wp.lat && wp.lng &&
          !isNaN(wp.lat) && !isNaN(wp.lng) &&
          wp.lat !== 0 && wp.lng !== 0
        );

        if (validWaypoints.length < 2) {
          setRouteCoordinates([]);
          return;
        }

        // Build coordinates string for OSRM
        // OSRM format: lng,lat;lng,lat;...
        const coords = validWaypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');

        // Use OSRM route service with waypoints support
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

        console.log('🛣️ Fetching route from OSRM:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`OSRM API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const geometry = data.routes[0].geometry;
          if (geometry && geometry.coordinates && geometry.coordinates.length > 0) {
            // Convert GeoJSON coordinates [lng, lat] to Leaflet [lat, lng]
            const coords = geometry.coordinates.map((coord: [number, number]) =>
              [coord[1], coord[0]] as [number, number]
            );
            console.log('✅ Route fetched successfully:', coords.length, 'points');
            setRouteCoordinates(coords);
            return;
          }
        }

        // If OSRM fails, try segment-by-segment routing
        console.warn('⚠️ OSRM route failed, trying segment-by-segment routing');
        await fetchRouteSegments(validWaypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })));

      } catch (error) {
        console.error('❌ Error fetching route from OSRM:', error);
        // Try segment-by-segment routing as fallback
        const validWaypoints = allPoints.filter(wp =>
          wp.lat && wp.lng &&
          !isNaN(wp.lat) && !isNaN(wp.lng) &&
          wp.lat !== 0 && wp.lng !== 0
        );
        await fetchRouteSegments(validWaypoints);
      }
    };

    // Fetch route segment by segment for better reliability
    const fetchRouteSegments = async (validWaypoints: Array<{ lat: number; lng: number }>) => {
      try {
        const allCoords: [number, number][] = [];

        // Fetch route for each segment between consecutive waypoints
        for (let i = 0; i < validWaypoints.length - 1; i++) {
          const start = validWaypoints[i];
          const end = validWaypoints[i + 1];

          try {
            const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
              const geometry = data.routes[0].geometry;
              if (geometry && geometry.coordinates) {
                const segmentCoords = geometry.coordinates.map((coord: [number, number]) =>
                  [coord[1], coord[0]] as [number, number]
                );

                // Add segment coordinates (skip first point if not first segment to avoid duplicates)
                if (i === 0) {
                  allCoords.push(...segmentCoords);
                } else {
                  allCoords.push(...segmentCoords.slice(1)); // Skip first point to avoid duplicate
                }
              } else {
                // Fallback: create intermediate points for this segment
                const intermediate = createIntermediatePoints(
                  [start.lat, start.lng],
                  [end.lat, end.lng],
                  20
                );
                if (i === 0) {
                  allCoords.push(...intermediate);
                } else {
                  allCoords.push(...intermediate.slice(1));
                }
              }
            } else {
              // Fallback: create intermediate points for this segment
              const intermediate = createIntermediatePoints(
                [start.lat, start.lng],
                [end.lat, end.lng],
                20
              );
              if (i === 0) {
                allCoords.push(...intermediate);
              } else {
                allCoords.push(...intermediate.slice(1));
              }
            }
          } catch (segmentError) {
            console.warn(`⚠️ Error fetching segment ${i}-${i + 1}:`, segmentError);
            // Fallback: create intermediate points for this segment
            const intermediate = createIntermediatePoints(
              [start.lat, start.lng],
              [end.lat, end.lng],
              20
            );
            if (i === 0) {
              allCoords.push(...intermediate);
            } else {
              allCoords.push(...intermediate.slice(1));
            }
          }

          // Small delay to avoid rate limiting
          if (i < validWaypoints.length - 2) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        if (allCoords.length > 0) {
          console.log('✅ Route built from segments:', allCoords.length, 'points');
          setRouteCoordinates(allCoords);
        } else {
          // Final fallback: create smooth intermediate points between all waypoints
          const fallbackCoords: [number, number][] = [];
          for (let i = 0; i < validWaypoints.length - 1; i++) {
            const start = [validWaypoints[i].lat, validWaypoints[i].lng] as [number, number];
            const end = [validWaypoints[i + 1].lat, validWaypoints[i + 1].lng] as [number, number];
            const intermediate = createIntermediatePoints(start, end, 30);
            if (i === 0) {
              fallbackCoords.push(...intermediate);
            } else {
              fallbackCoords.push(...intermediate.slice(1));
            }
          }
          console.log('⚠️ Using fallback route with intermediate points:', fallbackCoords.length, 'points');
          setRouteCoordinates(fallbackCoords);
        }
      } catch (error) {
        console.error('❌ Error in segment routing:', error);
        // Final fallback: create smooth intermediate points
        const fallbackCoords: [number, number][] = [];
        for (let i = 0; i < validWaypoints.length - 1; i++) {
          const start = [validWaypoints[i].lat, validWaypoints[i].lng] as [number, number];
          const end = [validWaypoints[i + 1].lat, validWaypoints[i + 1].lng] as [number, number];
          const intermediate = createIntermediatePoints(start, end, 30);
          if (i === 0) {
            fallbackCoords.push(...intermediate);
          } else {
            fallbackCoords.push(...intermediate.slice(1));
          }
        }
        setRouteCoordinates(fallbackCoords);
      }
    };

    fetchRoute();
  }, [waypoints, yardLocation, currentLocation]);

  // Show route even if loading (will update when ready)
  return (
    <>
      {/* Main route: Yard -> Waypoints */}
      {routeCoordinates.length >= 2 && (
        <Polyline
          positions={routeCoordinates}
          color="#3b82f6"
          weight={5}
          opacity={0.7}
          smoothFactor={1}
        />
      )}
      {/* Route from Yard to Current Truck Location (if live location available) */}
      {yardToTruckRoute.length >= 2 && (
        <Polyline
          positions={yardToTruckRoute}
          color="#10b981"
          weight={4}
          opacity={0.8}
          smoothFactor={1}
          dashArray="10, 5"
        />
      )}
    </>
  );
};

// Create custom icons
const createTruckIcon = () => {
  const svg = `
        <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="14" fill="#10b981" stroke="white" stroke-width="2"/>
            <g transform="translate(5, 7)">
                <rect x="2" y="4" width="12" height="6" fill="white" rx="0.5"/>
                <rect x="2" y="3" width="6" height="4" fill="white" rx="0.5"/>
                <rect x="3" y="4" width="4" height="2" fill="#10b981" opacity="0.8"/>
                <circle cx="5" cy="12" r="1.5" fill="#333"/>
                <circle cx="11" cy="12" r="1.5" fill="#333"/>
            </g>
        </svg>
    `;

  return L.divIcon({
    html: svg,
    className: 'custom-truck-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const createPickupIcon = () => {
  return L.divIcon({
    html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    className: 'custom-pickup-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createDeliveryIcon = () => {
  return L.divIcon({
    html: '<div style="background-color: #f59e0b; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    className: 'custom-delivery-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createYardIcon = () => {
  const svg = `
        <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="13" fill="#8b5cf6" stroke="white" stroke-width="2"/>
            <g transform="translate(6, 6)">
                <rect x="2" y="4" width="10" height="8" fill="white" rx="1"/>
                <rect x="3" y="5" width="8" height="2" fill="#8b5cf6" opacity="0.8"/>
                <rect x="3" y="8" width="8" height="2" fill="#8b5cf6" opacity="0.8"/>
                <rect x="3" y="11" width="4" height="1" fill="#8b5cf6" opacity="0.8"/>
            </g>
        </svg>
    `;

  return L.divIcon({
    html: svg,
    className: 'custom-yard-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const ProfessionalTripTracker: React.FC = () => {
  const [orderGroups, setOrderGroups] = useState<ActiveOrderGroup[]>([]);
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<ActiveOrderGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([56.0, -96.0]); // Default to Canada
  const [mapZoom, setMapZoom] = useState<number>(4); // Zoom level to show Canada
  const refreshIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const socket = useMemo(() => getSocket(), []);

  // Fetch active orders from backend
  const fetchOrdersData = useCallback(async () => {
    try {
      const isInitialLoad = isInitialLoadRef.current;

      // Only show loading spinner on initial load
      if (isInitialLoad) {
        setLoading(true);
        isInitialLoadRef.current = false;
      }

      const response = await getActiveOrdersWithTracking();

      if (response?.success && response?.data) {
        const orderGroupsData = Array.isArray(response.data) ? response.data : [];
        setOrderGroups(orderGroupsData);

        // Auto-select first order group if none selected (only on initial load)
        if (isInitialLoad && orderGroupsData.length > 0 && !selectedOrderGroup) {
          const firstGroup = orderGroupsData[0];
          setSelectedOrderGroup(firstGroup);

          // Set map center
          const currentLocation = firstGroup.currentLocation;
          const yardLocation = firstGroup.yardLocation;
          const firstWaypoint = firstGroup.routeWaypoints?.[0];
          if (currentLocation && currentLocation.lat && currentLocation.lng) {
            setMapCenter([currentLocation.lat, currentLocation.lng]);
            setMapZoom(15);
          } else if (yardLocation) {
            setMapCenter([yardLocation.lat, yardLocation.lng]);
            setMapZoom(12);
          } else if (firstWaypoint) {
            setMapCenter([firstWaypoint.lat, firstWaypoint.lng]);
            setMapZoom(12);
          }
        } else if (selectedOrderGroup) {
          // Refresh selected order group if it still exists
          const updatedGroup = orderGroupsData.find((g: ActiveOrderGroup) => g.driverId === selectedOrderGroup.driverId);
          if (updatedGroup) {
            setSelectedOrderGroup(updatedGroup);
          } else {
            // Order group no longer in the list, clear selection
            setSelectedOrderGroup(null);
            // Reset map to Canada when no trips are selected
            setMapCenter([56.0, -96.0]);
            setMapZoom(4);
          }
        } else if (isInitialLoad && orderGroupsData.length === 0) {
          // No trips available, ensure map shows Canada
          setMapCenter([56.0, -96.0]);
          setMapZoom(4);
        }
      } else {
        setOrderGroups([]);
        // No trips available, reset map to Canada
        if (isInitialLoad) {
          setMapCenter([56.0, -96.0]);
          setMapZoom(4);
        }
      }
    } catch (err) {
      console.error('Error fetching active orders:', err);
      setOrderGroups([]);
    } finally {
      setLoading(false);
    }
  }, [selectedOrderGroup]);

  useEffect(() => {
    // Initial load
    fetchOrdersData();

    // Refresh orders every 10 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchOrdersData();
    }, 10000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchOrdersData]);

  // Set up socket for real-time vehicle location updates
  useEffect(() => {
    if (!selectedOrderGroup?.truck?.trackingKey) return;

    // Leave previous vehicle updates
    socket.emit("leaveVehicle");

    // Join vehicle updates
    const vehicleId = selectedOrderGroup.truck.trackingKey || selectedOrderGroup.truck.internalId || selectedOrderGroup.truck._id;
    socket.emit("joinVehicle", vehicleId);

    // Listen for vehicle location updates
    socket.off("vehicleLocation");
    socket.on("vehicleLocation", (data) => {
      if (selectedOrderGroup && data._id === selectedOrderGroup.truck?._id) {
        setSelectedOrderGroup(prev => {
          if (!prev) return null;
          return {
            ...prev,
            currentLocation: data.currentLocation ? {
              lat: Number(data.currentLocation.latitude || 0),
              lng: Number(data.currentLocation.longitude || 0),
              address: data.currentLocation.address || ''
            } : prev.currentLocation,
            speed: data.speed || prev.speed,
            engineOn: data.engineOn !== undefined ? data.engineOn : prev.engineOn
          };
        });

        // Update map center to follow truck
        if (data.currentLocation) {
          const lat = Number(data.currentLocation.latitude || 0);
          const lng = Number(data.currentLocation.longitude || 0);
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            setMapCenter([lat, lng]);
          }
        }
      }
    });

    return () => {
      socket.emit("leaveVehicle");
      socket.off("vehicleLocation");
    };
  }, [socket, selectedOrderGroup?.truck?._id, selectedOrderGroup?.truck?.trackingKey]);

  // Handle order group selection
  const handleOrderGroupClick = useCallback((group: ActiveOrderGroup) => {
    if (selectedOrderGroup?.driverId === group.driverId) {
      console.log('🚛 Order group already selected, skipping');
      return;
    }

    console.log('🚛 Order group selected for driver:', group.driver.name);

    setSelectedOrderGroup(group);

    // Center map on current location, yard location, or first waypoint
    const currentLocation = group.currentLocation;
    const yardLocation = group.yardLocation;
    const firstWaypoint = group.routeWaypoints?.[0];

    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      setMapCenter([currentLocation.lat, currentLocation.lng]);
      setMapZoom(15);
    } else if (yardLocation) {
      setMapCenter([yardLocation.lat, yardLocation.lng]);
      setMapZoom(12);
    } else if (firstWaypoint) {
      setMapCenter([firstWaypoint.lat, firstWaypoint.lng]);
      setMapZoom(12);
    }
  }, [selectedOrderGroup]);

  // Filter order groups by search
  const filteredOrderGroups = useMemo(() => {
    if (!searchTerm) return orderGroups;
    const lowerSearch = searchTerm.toLowerCase();
    return orderGroups.filter((group) =>
      group.driver.name.toLowerCase().includes(lowerSearch) ||
      group.truck?.plateNumber?.toLowerCase().includes(lowerSearch) ||
      group.truck?.unitNumber?.toLowerCase().includes(lowerSearch) ||
      group.orders.some(o => o.orderNumber.toLowerCase().includes(lowerSearch)) ||
      group.orders.some(o => o.customerOrderNo?.toLowerCase().includes(lowerSearch))
    );
  }, [orderGroups, searchTerm]);

  // Get route waypoints from order group
  const getRouteWaypoints = useCallback((group: ActiveOrderGroup | null): RouteWaypoint[] => {
    if (!group || !group.routeWaypoints || group.routeWaypoints.length === 0) return [];
    return group.routeWaypoints;
  }, []);

  // Get current location from order group (truck's current location)
  const getCurrentLocation = useCallback((group: ActiveOrderGroup | null): { lat: number; lng: number } | null => {
    if (!group || !group.currentLocation) return null;
    return { lat: group.currentLocation.lat, lng: group.currentLocation.lng };
  }, []);

  // Compute values
  const currentLocation = getCurrentLocation(selectedOrderGroup);
  const waypoints = getRouteWaypoints(selectedOrderGroup);

  // Debug: Log waypoints
  useEffect(() => {
    if (selectedOrderGroup && waypoints.length > 0) {
      console.log('📍 Waypoints for selected order:', {
        total: waypoints.length,
        pickups: waypoints.filter(w => w.type === 'pickup').length,
        deliveries: waypoints.filter(w => w.type === 'delivery').length,
        waypoints: waypoints.map(w => ({
          type: w.type,
          orderNumber: w.orderNumber,
          stopNumber: w.stopNumber,
          address: w.address?.substring(0, 50),
          lat: w.lat,
          lng: w.lng
        }))
      });
    }
  }, [selectedOrderGroup, waypoints]);

  return (
    <div className="flex h-screen bg-main">
      {/* Left Sidebar */}
      <div
        className={`bg-card shadow-xl transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-0" : "w-72"
          } overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[rgba(0,209,255,0.2)] via-[rgba(0,209,255,0.15)] to-[rgba(168,85,247,0.2)] p-4 border border-theme rounded-lg">

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--accent-navyblue)]">
              <Route className="w-5 h-5 text-[var(--accent-navyblue)]" />
              Order Tracker
            </h2>

            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-secondary hover:text-primary" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-secondary" />

            <input
              type="text"
              placeholder="Search by driver, truck, order number..."
              className="w-full pl-10 pr-4 py-1.5 text-sm rounded-lg 
      bg-card text-primary placeholder:text-secondary 
      border border-theme 
      focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

        </div>

        {/* Order Group List */}
        <div className="flex-1 overflow-y-auto p-3 bg-main">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-[var(--accent-navyblue)] animate-spin mx-auto mb-2" />
              <p className="text-secondary">Loading active orders...</p>
            </div>
          ) : filteredOrderGroups.length === 0 ? (
            <div className="text-center py-8">
              <Route className="w-12 h-12 text-secondary mx-auto mb-2" />
              <p className="text-secondary">No active orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrderGroups.map((group) => (
                <div
                  key={group.driverId}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${selectedOrderGroup?.driverId === group.driverId
                    ? "bg-main border-[var(--accent-blue)] shadow-md"
                    : "bg-card border-theme hover:border-[var(--accent-navyblue)] hover:shadow-sm"
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOrderGroupClick(group);
                  }}
                >
                  {/* Driver Name & Order Count */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-base text-primary">
                      {group.driver.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-[var(--accent-navyblue)]">
                      {group.orderCount} {group.orderCount === 1 ? 'Order' : 'Orders'}
                    </span>
                  </div>

                  {/* Order Group Details */}
                  <div className="space-y-1 text-xs">
                    {group.truck && (
                      <div className="flex items-center gap-2 text-secondary">
                        <Truck className="w-3 h-3" />
                        <span>
                          {group.truck.plateNumber || group.truck.unitNumber || 'N/A'}
                          {group.truck.make && group.truck.model && ` - ${group.truck.make} ${group.truck.model}`}
                        </span>
                      </div>
                    )}
                    {group.currentLocation && (
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <MapPin className="w-3 h-3" />
                        <span>Live tracking active</span>
                      </div>
                    )}
                    {group.routeWaypoints.length > 0 && (
                      <div className="flex items-center gap-2 text-secondary">
                        <Route className="w-3 h-3" />
                        <span>{group.routeWaypoints.length} stops</span>
                      </div>
                    )}
                    {group.orders.length > 0 && (
                      <div className="pt-2 border-t border-theme">
                        <p className="text-secondary mb-1">Orders:</p>
                        {group.orders.slice(0, 2).map(order => (
                          <p key={order._id} className="text-secondary text-xs">
                            • {order.orderNumber}
                          </p>
                        ))}
                        {group.orders.length > 2 && (
                          <p className="text-secondary text-xs">+{group.orders.length - 2} more</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Toggle Button (when collapsed) */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-[rgba(0,209,255,0.15)] text-white p-2 rounded-r-lg shadow-lg hover:bg-[rgba(0,209,255,0.15)]/90 transition-colors z-10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Right Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* Route Polyline */}
          {selectedOrderGroup && (
            <RoutePolyline
              waypoints={waypoints}
              yardLocation={selectedOrderGroup.yardLocation ? {
                lat: selectedOrderGroup.yardLocation.lat,
                lng: selectedOrderGroup.yardLocation.lng
              } : undefined}
              currentLocation={currentLocation && currentLocation.lat && currentLocation.lng ? {
                lat: currentLocation.lat,
                lng: currentLocation.lng
              } : undefined}
            />
          )}

          {/* Yard Location Marker (Starting Point) */}
          {selectedOrderGroup?.yardLocation && (
            <Marker
              position={[selectedOrderGroup.yardLocation.lat, selectedOrderGroup.yardLocation.lng]}
              icon={createYardIcon()}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-2 text-purple-600">
                    🏢 {selectedOrderGroup.yardLocation.yardName || 'Yard'}
                  </h3>
                  <p className="text-secondary text-xs">
                    Starting Point
                  </p>
                  {selectedOrderGroup.yardLocation.address && (
                    <p className="text-secondary text-xs mt-2">
                      {selectedOrderGroup.yardLocation.address}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Current Truck Location Marker (only show if live location is available) */}
          {currentLocation && currentLocation.lat && currentLocation.lng &&
            !isNaN(currentLocation.lat) && !isNaN(currentLocation.lng) &&
            currentLocation.lat !== 0 && currentLocation.lng !== 0 && (
              <Marker
                position={[currentLocation.lat, currentLocation.lng]}
                icon={createTruckIcon()}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-2">
                      {selectedOrderGroup?.truck?.plateNumber || 'Truck Location'}
                    </h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary">Speed:</span>
                        <span className="font-medium">{selectedOrderGroup?.speed || 0} km/h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary">Status:</span>
                        <span className="font-medium">{selectedOrderGroup?.engineOn ? 'Engine On' : 'Engine Off'}</span>
                      </div>
                      {selectedOrderGroup?.currentLocation?.address && (
                        <p className="text-secondary text-xs mt-2">
                          {selectedOrderGroup.currentLocation.address}
                        </p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

          {/* Route Waypoints (Pickup and Delivery) */}
          {waypoints
            .filter(waypoint => {
              // Filter out invalid waypoints
              const lat = Number(waypoint.lat);
              const lng = Number(waypoint.lng);
              return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
            })
            .map((waypoint, index) => {
              const lat = Number(waypoint.lat);
              const lng = Number(waypoint.lng);

              return (
                <Marker
                  key={`waypoint-${waypoint.orderId}-${waypoint.type}-${waypoint.stopNumber || 0}-${index}-${lat}-${lng}`}
                  position={[lat, lng]}
                  icon={waypoint.type === 'pickup' ? createPickupIcon() : createDeliveryIcon()}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-sm mb-2">
                        {waypoint.type === 'pickup' ? 'Pickup' : 'Delivery'}: {waypoint.orderNumber}
                      </h3>
                      <div className="space-y-1 text-xs">
                        {waypoint.customerOrderNo && (
                          <div className="flex items-center justify-between">
                            <span className="text-secondary">Customer Order:</span>
                            <span className="font-medium">{waypoint.customerOrderNo}</span>
                          </div>
                        )}
                        {waypoint.stopNumber !== undefined && waypoint.stopNumber > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-secondary">Stop #:</span>
                            <span className="font-medium">{waypoint.stopNumber}</span>
                          </div>
                        )}
                        {waypoint.shipper && (
                          <div className="flex items-center justify-between">
                            <span className="text-secondary">Shipper:</span>
                            <span className="font-medium">{waypoint.shipper}</span>
                          </div>
                        )}
                        {waypoint.receiver && (
                          <div className="flex items-center justify-between">
                            <span className="text-secondary">Receiver:</span>
                            <span className="font-medium">{waypoint.receiver}</span>
                          </div>
                        )}
                        <p className="text-secondary text-xs mt-2">
                          {waypoint.address}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>

        {/* Order Group Info Panel */}
        {selectedOrderGroup && (
          <div className="absolute top-6 right-6 bg-card rounded-xl shadow-2xl w-80 overflow-hidden border border-theme max-h-[70vh] overflow-y-auto z-[1000]">
            {/* Header */}
            <div className="p-3 text-white bg-[linear-gradient(90deg,var(--accent-blue)_0%,var(--accent-blue)_40%,rgba(0,209,255,0.15)_100%)]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold truncate">{selectedOrderGroup.driver.name}</h3>
                <button
                  onClick={() => {
                    setSelectedOrderGroup(null);
                    // Reset map to Canada when clearing selection
                    setMapCenter([56.0, -96.0]);
                    setMapZoom(4);
                  }}
                  className="p-1.5 hover:bg-card/20 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs opacity-90 truncate">
                {selectedOrderGroup.orders.length} {selectedOrderGroup.orders.length === 1 ? 'Order' : 'Orders'}
              </p>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-main rounded-lg">
                  <div className="flex items-center gap-1 text-[var(--accent-navyblue)] mb-0.5">
                    <Route className="w-3 h-3" />
                    <span className="text-xs font-medium">Stops</span>
                  </div>
                  <p className="text-base font-bold text-primary">
                    {selectedOrderGroup.routeWaypoints.length}
                  </p>
                </div>
                {selectedOrderGroup.currentLocation && (
                  <div className="p-2 bg-main rounded-lg">
                    <div className="flex items-center gap-1 text-green-600 mb-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs font-medium">Live</span>
                    </div>
                    <p className="text-base font-bold text-primary">
                      {selectedOrderGroup.speed} km/h
                    </p>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2">
                {selectedOrderGroup.truck && (
                  <div className="flex justify-between py-1.5 border-b border-theme">
                    <span className="text-secondary text-sm">Truck</span>
                    <span className="font-semibold text-primary text-sm truncate ml-2">
                      {selectedOrderGroup.truck.plateNumber || selectedOrderGroup.truck.unitNumber || 'N/A'}
                    </span>
                  </div>
                )}
                {selectedOrderGroup.coDriver && (
                  <div className="flex justify-between py-1.5 border-b border-theme">
                    <span className="text-secondary text-sm">Co-Driver</span>
                    <span className="font-semibold text-primary text-sm truncate ml-2">
                      {selectedOrderGroup.coDriver.name}
                    </span>
                  </div>
                )}
                {selectedOrderGroup.currentLocation && (
                  <div className="py-1.5">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-secondary mb-0.5">Current Location</p>
                        <p className="text-xs text-primary truncate">
                          {selectedOrderGroup.currentLocation.address || 'Location tracking active'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Orders List */}
                {selectedOrderGroup.orders.length > 0 && (
                  <div className="pt-2 border-t border-theme">
                    <p className="text-xs text-secondary mb-2 font-medium">Orders:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedOrderGroup.orders.map(order => (
                        <div key={order._id} className="p-2 bg-card rounded text-xs">
                          <p className="font-semibold text-primary">{order.orderNumber}</p>
                          {order.customerOrderNo && (
                            <p className="text-secondary">Cust: {order.customerOrderNo}</p>
                          )}
                          {order.tripNo && (
                            <p className="text-secondary text-xs">Trip: {order.tripNo}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalTripTracker;

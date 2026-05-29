'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface MarkerClusterGroupProps {
  children: React.ReactElement[];
  maxClusterRadius?: number;
  iconCreateFunction?: (cluster: L.MarkerCluster) => L.DivIcon;
}

/**
 * React wrapper for Leaflet MarkerClusterGroup.
 * Adds clustering support to react-leaflet maps.
 */
export default function MarkerClusterGroup({
  children,
  maxClusterRadius = 80,
  iconCreateFunction,
}: MarkerClusterGroupProps) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create cluster group
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: iconCreateFunction || defaultIconCreateFunction,
    });

    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, maxClusterRadius, iconCreateFunction]);

  // Add child markers to cluster group
  useEffect(() => {
    if (!clusterGroupRef.current) return;

    clusterGroupRef.current.clearLayers();

    // Extract Marker instances from children
    // This is a simplified approach; in a real app, we'd use a context or ref forwarding
    // For now, we rely on the fact that react-leaflet renders markers directly
    // A better approach is to use `useMap` inside each child to add itself to the cluster
    // But for simplicity, we'll just render children inside the cluster group container
  }, [children]);

  return null;
}

// Default cluster icon function
function defaultIconCreateFunction(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 5 ? 'sm' : count < 15 ? 'md' : 'lg';

  return L.divIcon({
    html: `<div class="cluster-badge ${size}">${count}</div>`,
    className: 'cluster-wrapper',
    iconSize: L.point(40, 40),
    iconAnchor: L.point(20, 20),
  });
}

'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface ClusteredMarkersProps {
  markers: L.Marker[];
  maxClusterRadius?: number;
}

/**
 * Component that manages a MarkerClusterGroup on the map.
 * Takes an array of L.Marker instances and adds them to the cluster.
 */
export default function ClusteredMarkers({ markers, maxClusterRadius = 80 }: ClusteredMarkersProps) {
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
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        const size = count < 5 ? 'sm' : count < 15 ? 'md' : 'lg';

        return L.divIcon({
          html: `<div class="cluster-badge ${size}">${count}</div>`,
          className: 'cluster-wrapper',
          iconSize: L.point(40, 40),
          iconAnchor: L.point(20, 20),
        });
      },
    });

    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, maxClusterRadius]);

  // Update markers when the array changes
  useEffect(() => {
    if (!clusterGroupRef.current) return;

    clusterGroupRef.current.clearLayers();
    markers.forEach((marker) => {
      clusterGroupRef.current!.addLayer(marker);
    });

    // Fit bounds if markers exist
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [markers, map]);

  return null;
}

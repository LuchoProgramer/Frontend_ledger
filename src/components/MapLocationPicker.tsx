"use client";

import React, { useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface MapLocationPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationChange: (lat: number, lng: number) => void;
    apiKey: string;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
    initialLat = -0.1806532, // Quito, Ecuador por defecto
    initialLng = -78.4678382,
    onLocationChange,
    apiKey
}) => {
    const [markerPosition, setMarkerPosition] = useState({
        lat: initialLat,
        lng: initialLng
    });

    const mapContainerStyle = {
        width: '100%',
        height: '400px',
        borderRadius: '8px'
    };

    const center = {
        lat: initialLat,
        lng: initialLng
    };

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = Number(e.latLng.lat().toFixed(7));
            const lng = Number(e.latLng.lng().toFixed(7));
            console.log('[MapLocationPicker] Click - Raw:', { lat: e.latLng.lat(), lng: e.latLng.lng() });
            console.log('[MapLocationPicker] Click - Rounded:', { lat, lng });
            setMarkerPosition({ lat, lng });
            onLocationChange(lat, lng);
        }
    }, [onLocationChange]);

    const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = Number(e.latLng.lat().toFixed(7));
            const lng = Number(e.latLng.lng().toFixed(7));
            console.log('[MapLocationPicker] Drag - Raw:', { lat: e.latLng.lat(), lng: e.latLng.lng() });
            console.log('[MapLocationPicker] Drag - Rounded:', { lat, lng });
            setMarkerPosition({ lat, lng });
            onLocationChange(lat, lng);
        }
    }, [onLocationChange]);

    if (!apiKey) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                    ⚠️ Google Maps API Key no configurada. Por favor, contacta al administrador.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                    📍 <strong>Instrucciones:</strong> Haz clic en el mapa o arrastra el marcador rojo para seleccionar la ubicación exacta de tu sucursal.
                </p>
            </div>

            <LoadScript googleMapsApiKey={apiKey}>
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={center}
                    zoom={15}
                    onClick={onMapClick}
                >
                    <Marker
                        position={markerPosition}
                        draggable={true}
                        onDragEnd={onMarkerDragEnd}
                    />
                </GoogleMap>
            </LoadScript>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded border">
                    <span className="text-gray-600">Latitud:</span>
                    <span className="ml-2 font-mono font-semibold">{markerPosition.lat.toFixed(7)}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                    <span className="text-gray-600">Longitud:</span>
                    <span className="ml-2 font-mono font-semibold">{markerPosition.lng.toFixed(7)}</span>
                </div>
            </div>
        </div>
    );
};

export default MapLocationPicker;

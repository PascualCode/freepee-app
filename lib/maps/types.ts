export interface MapMarkerData {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
}

export interface MapViewProps {
  markers: MapMarkerData[];
  onMarkerPress?: (id: string) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

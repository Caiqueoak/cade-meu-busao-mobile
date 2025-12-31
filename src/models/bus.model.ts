export interface BusLocation {
  prefix: number;
  isAccessible: boolean;
  updatedAt: string;
  latitude: number;
  longitude: number;
}

export interface BusRoute {
  routeCode: string;
  lineId: number;
  direction: number;
  mainTerminal: string;
  secondaryTerminal: string;
  vehicleCount: number;
  buses: BusLocation[];
}

export interface NearestBus {
  distance: number; // km
  position: BusLocation;
  route: BusRoute;
  etaMinutes: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

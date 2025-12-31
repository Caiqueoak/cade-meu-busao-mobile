import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { api } from "./api";
import { BusRoute, NearestBus, UserLocation } from "./src/models/bus.model";
import { calculateDistance } from "./src/utils/distance.util";

const AVERAGE_BUS_SPEED = 22;
const POLLING_INTERVAL = 60000; // 1 minute

export default function App() {
  const [line, setLine] = useState("");
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [nearest, setNearest] = useState<NearestBus[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => polling && clearInterval(polling);
  }, [polling]);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const location = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  }

  async function fetchBuses(isManual = false) {
    setMessage('')
    if (!userLocation) {
      await requestLocation();
      return;
    }

    try {
      if (isManual) setLoading(true);

      const r = await api.get<BusRoute[]>(`/bus/${line}`);

      if (r.data.length > 0) {
        setRoutes(r.data);
        computeNearest(r.data);
      } else {
        setMessage('It was not possible to find buses for this line.')
      }
    } finally {
      if (isManual) setLoading(false);
    }
  }

  function computeNearest(data: BusRoute[]) {
    const all: NearestBus[] = [];

    data.forEach(route => {
      route.buses.forEach(bus => {
        const distance = calculateDistance(
          userLocation!.latitude,
          userLocation!.longitude,
          bus.latitude,
          bus.longitude
        );

        all.push({
          distance,
          position: bus,
          route,
          etaMinutes: Math.round((distance / AVERAGE_BUS_SPEED) * 60)
        });
      });
    });

    setNearest(all.sort((a, b) => a.distance - b.distance).slice(0, 3));
  }

  async function onSearch() {
    await fetchBuses(true);

    polling && clearInterval(polling);

    const interval = setInterval(fetchBuses, POLLING_INTERVAL);
    setPolling(interval);
  }

  return (
    <View style={{ padding: 20, marginTop: 80 }}>
      <Text style={{ fontSize: 24 }}>Bus Tracker</Text>

      <TextInput
        placeholder="Bus line"
        value={line}
        onChangeText={setLine}
        style={{ marginVertical: 12, padding: 10, backgroundColor: "#eee" }}
      />

      <TouchableOpacity
        onPress={onSearch}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#aaa" : "#2563eb",
          padding: 14,
          borderRadius: 8,
          alignItems: "center"
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Search</Text>}
      </TouchableOpacity>

      {message.length > 0 && nearest.length == 0 && !loading && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: "#999", textAlign: "center" }}>
            {message}
          </Text>
        </View>
      )}

      {nearest.map((bus, index) => (
        <View key={index} style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: "bold" }}>#{index + 1} Nearest bus</Text>
          <Text>Line: {bus.route.routeCode}</Text>
          <Text>Distance: {bus.distance.toFixed(2)} km</Text>
          <Text>ETA: {bus.etaMinutes} minutes</Text>
        </View>
      ))}
    </View>
  );
}

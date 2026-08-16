export type SOSLocation = {
  latitude: number;
  longitude: number;
};

export async function triggerSOS(location?: SOSLocation) {
  return { success: true, location };
}

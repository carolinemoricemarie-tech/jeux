// A rear view must stay on the horse's axis. Smoothing world X/Z independently
// makes a turning horse appear to slide sideways or run towards the camera.
export function rearChaseCamera(state, height = 0) {
  const sin = Math.sin(state.heading), cos = Math.cos(state.heading);
  return {
    position: { x: state.x + sin * 7.8, y: 3.6 + height * .18, z: state.z + cos * 7.8 },
    target: { x: state.x - sin * 6, y: 1.3 + height * .25, z: state.z - cos * 6 }
  };
}

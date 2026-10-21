# Perceptron Pipeline Documentation

An interactive, graph-first reference for following Perceptron data from physical and simulated sources through ROS 2 nodes to motion commands and operator views.

**Live site:** [priyanshu-choudhary.github.io/perceptron-pipeline-docs](https://priyanshu-choudhary.github.io/perceptron-pipeline-docs/)

**ROS source:** [Perceptron_Ros2_Jetson_local · feature/carla-sim-perception](https://github.com/Priyanshu-choudhary/Perceptron_Ros2_Jetson_local/tree/feature/carla-sim-perception)

## Pipeline paths

The graph distinguishes two paths that use different inputs:

- **Hardware navigation:** the Jetson bridge publishes the physical LiDAR scan on `/scan` for SLAM, AMCL, and Nav2. The hardware bridge also publishes odometry and IMU topics used by localization.
- **CARLA perception:** `carla_bridge` publishes `/carla/lidar/points`, camera data, and simulation ground truth. The perception launches process the point cloud; fusion uses `/carla/ground_truth/boxes_2d` as its reference detections by default, with the detector topic configurable.

Select a stage to open its recorded inputs, node or module names, outputs, message types, publisher, rate, receiver, processing steps, and cross-stage links. If the documentation has no publisher mapping for an item, the graph labels it instead of guessing. Source links point to the ROS branch above. The motor-controller firmware is external to that ROS repository and is marked accordingly.

## Interactive views

The site includes interactive LiDAR, Kalman, prediction, and costmap visualizations for selected stages. These are illustrative models, not live robot telemetry.

## Local preview

Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

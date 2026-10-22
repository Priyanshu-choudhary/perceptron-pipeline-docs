# Perceptron Pipeline Documentation

An interactive, graph-first reference for following Perceptron data from physical and simulated sources through ROS 2 nodes to motion commands and operator views.

**Live site:** [priyanshu-choudhary.github.io/perceptron-pipeline-docs](https://priyanshu-choudhary.github.io/perceptron-pipeline-docs/)

**ROS source:** [Perceptron_Ros2_Jetson_local · feature/carla-sim-perception](https://github.com/Priyanshu-choudhary/Perceptron_Ros2_Jetson_local/tree/feature/carla-sim-perception)

**Autonomy Presentation:** [Perceptron Autonomy Presentation](https://priyanshu-choudhary.github.io/perceptron-autonomy-presentation/)

## Pipeline paths

The graph distinguishes two complementary paths:

- **Hardware navigation:** the Jetson bridge publishes the physical LiDAR scan on `/scan` for SLAM, AMCL, and Nav2. The hardware bridge (`stm32_bridge_node`) also publishes odometry and IMU topics used by local EKF localization and executes 100 Hz motor commands.
- **CARLA perception & navigation:** 
  - `carla_bridge` runs synchronously at 20 Hz, publishing `/carla/lidar/points` (16-beam pitched down 15° on a virtual rover rig 2.044 m ahead of the rear axle), RGB/semantic camera streams, simulated IMU/odometry/GNSS, and ground truth.
  - **3D LiDAR Preprocessing:** `lidar_preprocessor_node` separates ground from non-ground via dual RANSAC plane fitting and 2D height grid (`cloud_processing.py`), clustering obstacle points into 3D candidates.
  - **Camera-LiDAR 2D-3D Fusion:** `object_fusion_node` projects clustered points into camera frustums and associates classes via Hungarian matching.
  - **Multi-Object Tracking:** `object_tracker_node` maintains constant-velocity Kalman filters in `odom` frame with Mahalanobis gating ($\chi^2 \le 9.21$).
  - **Trajectory Prediction:** `trajectory_predictor_node` predicts future 2D poses and covariance ellipses across 0.5s, 1.0s, and 2.0s horizons (CV & CTRV models).
  - **Rolling Costmap & Dynamic Risk:** `costmap_node` combines 3D voxel height slicing, inscribed inflation, and dynamic spatio-temporal risk ribbons into `/costmap/nav`.
  - **Vision Road Layer:** `road_segmentation_node` projects camera semantic pixels via flat-ground ray intersection onto `/perception/road_costmap` (road 0, lane line 30, off-road 254 lethal), incorporated as a StaticLayer into Nav2 costmaps.
  - **Nav2 Autonomous Driving & MPPI Motion Control:** `gps_goal_node` routes along lane graph polylines starting 2-15m ahead to avoid kerb-locked U-turns; Smac Hybrid-A* computes kinematically feasible Dubins paths; **MPPI Controller** (`nav2_mppi_controller::MPPIController`) evaluates 800 stochastic Ackermann rollouts across 8 critics up to 5.0 m/s; `predictive_speed_limit_node` yields to crossing agents; and `nav2_collision_monitor` enforces fail-safe emergency braking.
  - **Vehicle Actuation:** `carla_bridge --control ros` with `vehicle_control.py` translates `/cmd_vel` into Ackermann steering and speed PI regulation.
  - **Benchmarking Suite:** `scenario_suite.py` executes repeatable scenario tests (`crossing`, `city`, `nav_open`, `nav_cars`, `nav_people`, `nav_mixed`, `dropout`) with regression thresholds and objective collision reporting via `/carla/ego/collision`.

Select a stage to inspect its recorded inputs, node or module names, outputs, message types, publisher, rate, receiver, processing steps, and cross-stage links. Source links point directly to the ROS branch above.

## Interactive views

The site includes interactive, continuous 60 FPS Canvas math and kinematic animations for all 12 pipeline stages, including:
- EKF covariance convergence
- RANSAC ground plane fitting
- Pinhole camera frustum reprojection
- Multi-target Kalman tracking & Mahalanobis gating
- CTRV non-linear trajectory prediction horizons
- Dynamic spatio-temporal risk ribbons & vision road costmaps
- Nav2 MPPI 800-rollout stochastic trajectory fan & predictive yielding

## Local preview

Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

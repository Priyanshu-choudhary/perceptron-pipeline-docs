# Perceptron Autonomous Navigation & Perception Data Pipeline Documentation

An interactive, graph-first documentation site for following Project Perceptron data from sensors through ROS 2 processing stages to planning, actuators, and telemetry. The landing page presents a horizontal stage graph; selecting a stage opens its recorded inputs, nodes, processing steps, output topics, message types, rates, targets, and stage handoffs.

🌐 **Live Documentation Website:**  
**[https://priyanshu-choudhary.github.io/perceptron-pipeline-docs/](https://priyanshu-choudhary.github.io/perceptron-pipeline-docs/)**

🔗 **Codebase Repository (Target Branch):**  
**[Perceptron_Ros2_Jetson_local @ feature/carla-sim-perception](https://github.com/Priyanshu-choudhary/Perceptron_Ros2_Jetson_local/tree/feature/carla-sim-perception)**

---

## 📑 12-Stage Pipeline Overview

| Stage | Name | Role & Core Algorithms | Key ROS 2 Topics |
| :---: | :--- | :--- | :--- |
| **01** | [Sensors & Sources](stages/stage-01-sensors.html) | Physical transducers & CARLA synthetic sensors | `/points`, `/imu/data_raw`, `/camera/image_raw` |
| **02** | [Hardware & Sim Bridges](stages/stage-02-bridges.html) | ZeroMQ sliding-window clock discipline & STM32 TinyFrames | `/odom` (twist), `/imu/data`, `/battery/state` |
| **03** | [Local Odometry Fusion](stages/stage-03-ekf.html) | Continuous EKF fusing wheel twist + gyro rate | TF `odom -> base_footprint`, `/odometry/filtered` |
| **04** | [Global Map Localization](stages/stage-04-slam.html) | SLAM Toolbox & AMCL seeded by ArUco solvePnP | TF `map -> odom`, `/map`, `/initialpose` |
| **05** | [3D LiDAR Preprocessing](stages/stage-05-lidar-prep.html) | RANSAC ground plane, elevation grid, 2D KD-tree clustering | `/perception/points_ground`, `/perception/points_obstacles`, `/perception/scan` |
| **06** | [Camera-LiDAR Sensor Fusion](stages/stage-06-fusion.html) | Camera pinhole projection & Hungarian affinity IoU matching | `/perception/objects`, `/perception/objects_image` |
| **07** | [Multi-Object Tracking](stages/stage-07-tracker.html) | Discrete CV Kalman filter, $\chi^2 \le 9.21$ gating, state machine | `/perception/tracked_objects`, `/perception/track_markers` |
| **08** | [Trajectory Prediction](stages/stage-08-prediction.html) | Multi-horizon (0.5s, 1.0s, 2.0s) CV & CTRV kinematic ribbons | `/perception/predicted_objects`, `/perception/prediction_markers` |
| **09** | [3D-Aware Dynamic Costmap](stages/stage-09-costmap.html) | 3-layer costmap: 5cm height voxels, inflation, and dynamic risk ribbons | `/costmap/combined`, `/costmap/dynamic_risk`, `/costmap/voxels` |
| **10** | [Nav2 Planning & Motion](stages/stage-10-nav2.html) | RotationShimController + DWB/MPPI, 2.5D traversability | `/plan`, `/cmd_vel` |
| **11** | [Actuator Output](stages/stage-11-actuators.html) | 0xA5 0x01 serial TinyFrames, STM32 PID velocity regulation | Physical motor PWM & skid-steer drive |
| **12** | [Telemetry & Overlays](stages/stage-12-telemetry.html) | Augmented path camera reprojection, Jetson H.265 GPU encoding | UDP :5000 RTP/H.265 stream, RViz / Foxglove |

---

## Interactive views

- The horizontal overview lists the connections recorded between stages and previews each stage's first documented output.
- Each expanded stage shows a left-to-right input → node → output flow, followed by its ordered substeps and connected topic handoffs.
- Interactive LiDAR, Kalman, prediction, and costmap views remain available for selected stages.
- Source links point to the `feature/carla-sim-perception` branch. The topic and node lists are the documentation's recorded interfaces; follow the source links to confirm implementation details.

---

## Local preview

Open `index.html` directly in any modern browser:
```bash
# Optional local web server
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

---
*Created for Project Perceptron by Priyanshu Choudhary*

/**
 * Perceptron Autonomous Navigation & Perception Data Pipeline
 * Single Source of Truth Topic Graph, Node Schemas & Architectural Documentation
 * Branch: feature/carla-sim-perception
 */

export const PIPELINE_STAGES = [
  {
    id: "stage-01",
    num: 1,
    slug: "stage-01-sensors",
    title: "Sensors & Sources",
    badge: "Hardware & Sim Input",
    color: "#00e5ff",
    bgGlow: "rgba(0, 229, 255, 0.15)",
    summary: "Physical rover transducers and CARLA UE4 Town10 synthetic equivalents capturing environmental geometry, inertial dynamics, wheel ticks, and imagery.",
    subSteps: [
      {
        step: "1.1",
        title: "3D LiDAR Spatial Scanning",
        desc: "Velodyne VLP-16 (16-beam, 30 kHz point rate, 10 Hz rotation, 100 m range, 15° downward pitch) or RPLiDAR D500 2D scanner emitting range/azimuth rays.",
        frame: "lidar3d_link",
        rate: "10 Hz"
      },
      {
        step: "1.2",
        title: "Inertial Measurement (IMU)",
        desc: "Pixhack 2.8.4 internal MPU-6000 6-axis gyroscope and accelerometer capturing body rates (rad/s) and specific forces (+9.81 m/s² z at rest).",
        frame: "imu_link",
        rate: "50-100 Hz"
      },
      {
        step: "1.3",
        title: "Wheel Quadrature Encoders",
        desc: "High-resolution quadrature optical encoders on 4 high-torque geared DC motor shafts measuring rotational pulses per millisecond.",
        frame: "base_link",
        rate: "20-50 Hz"
      },
      {
        step: "1.4",
        title: "Global Navigation Satellite (GNSS)",
        desc: "U-blox NEO-M8N GPS module measuring WGS84 Geodetic latitude, longitude, and ellipsoidal altitude with covariance estimates.",
        frame: "gps_link",
        rate: "5 Hz"
      },
      {
        step: "1.5",
        title: "Monocular Vision Stream",
        desc: "Sony IMX219 / Wide-Angle camera capturing 1280x720 RGB frames with calibrated intrinsic matrix K and distortion coefficients D.",
        frame: "camera_optical_link",
        rate: "15-30 Hz"
      }
    ],
    nodes: [
      {
        name: "Physical Hardware Rig",
        type: "Physical Transducer",
        role: "Physical robot instrumentation mounted on vibration-isolated mast.",
        file: "src/perceptron_robot_description/urdf/perceptron_robot.xacro"
      },
      {
        name: "CARLA Simulated Sensors",
        type: "Simulation Actor",
        role: "CARLA 0.9.15 Unreal Engine 4 sensor actors with synthetic noise injectors (WheelOdometry, ImuOrientation, Gnss).",
        file: "src/perceptron_carla/perceptron_carla/sim_sensors.py"
      }
    ],
    inputs: [
      { name: "Photons & Laser Pulses", type: "Environmental Physics", source: "Real World / CARLA Raytracing" },
      { name: "Wheel Rotation", type: "Kinematics", source: "Motor Shafts" }
    ],
    outputs: [
      { topic: "/points (or /carla/lidar/points)", type: "sensor_msgs/msg/PointCloud2", rate: "10 Hz", target: "LiDAR Preprocessor" },
      { topic: "/imu/data_raw", type: "sensor_msgs/msg/Imu", rate: "50 Hz", target: "Gyro Conditioner & EKF" },
      { topic: "/gps/fix", type: "sensor_msgs/msg/NavSatFix", rate: "5 Hz", target: "NavSat Transform" },
      { topic: "/camera/image_raw", type: "sensor_msgs/msg/Image (1280x720 BGR8)", rate: "15-30 Hz", target: "Jetson Pipeline / 2D Detector" }
    ],
    codeSnippet: `# sim_sensors.py: Realistic IMU attitude random walk + gyro bias
class ImuOrientation:
    def __init__(self, rng, dt, yaw_bias=math.radians(2.0), 
                 yaw_walk_std=math.radians(0.05), yaw_noise_std=math.radians(0.5)):
        self.yaw_offset = yaw_bias
        self.walk_step = yaw_walk_std * math.sqrt(dt)
        self.yaw_std = yaw_noise_std
        
    def measure(self, roll, pitch, yaw):
        self.yaw_offset += self.rng.normal(0.0, self.walk_step)
        return (roll + self.rng.normal(0.0, 0.005),
                pitch + self.rng.normal(0.0, 0.005),
                wrap_angle(yaw + self.yaw_offset + self.rng.normal(0.0, self.yaw_std)))`
  },
  {
    id: "stage-02",
    num: 2,
    slug: "stage-02-bridges",
    title: "Hardware & Sim Bridges",
    badge: "Transport & Abstraction",
    color: "#3b82f6",
    bgGlow: "rgba(59, 130, 246, 0.15)",
    summary: "Decouples ROS 2 graph from transport layers (UART serial, ZeroMQ over LAN, and CARLA RPC socket) with independent sliding-window clock discipline.",
    subSteps: [
      {
        step: "2.1",
        title: "ZeroMQ Sliding-Window Clock Discipline",
        desc: "jetson_bridge_node calculates minimum (t_recv - t_send) over a 3.0s window to eliminate Wi-Fi jitter without running NTP.",
        frame: "host_clock",
        rate: "Continuous"
      },
      {
        step: "2.2",
        title: "TinyFrames Serial Protocol Decoding",
        desc: "stm32_bridge_node deserializes 0xA5 0x55 telemetry packets (bus voltage, motor currents, encoder ticks) at 115200 baud.",
        frame: "base_link",
        rate: "50 Hz"
      },
      {
        step: "2.3",
        title: "CARLA Synchronous Simulation Bridge",
        desc: "carla_bridge locks UE4 simulation tick, reads synchronized LiDAR, camera, and IMU data, and broadcasts static/dynamic TF frames.",
        frame: "carla_world -> base_footprint",
        rate: "20 Hz Sim"
      }
    ],
    nodes: [
      {
        name: "jetson_bridge_node",
        type: "ROS 2 Lifecycle Node",
        role: "Subscribes to ZeroMQ REP/SUB sockets on Jetson Nano over LAN, publishes /scan and raw telemetry.",
        file: "src/perceptron_hardware/perceptron_hardware/jetson_bridge_node.py"
      },
      {
        name: "stm32_bridge_node",
        type: "Serial Driver Node",
        role: "Communicates with STM32F405 ECU; converts encoder deltas into twist-only /odom and issues motor commands.",
        file: "src/perceptron_hardware/perceptron_hardware/stm32_bridge_node.py"
      },
      {
        name: "carla_bridge",
        type: "Simulation Orchestrator",
        role: "Translates left-handed CARLA coordinates to right-handed REP 103 ROS conventions and injects sensor noise.",
        file: "src/perceptron_carla/perceptron_carla/carla_bridge.py"
      }
    ],
    inputs: [
      { name: "ZeroMQ Port :5555", type: "TCP Socket", source: "Jetson Nano" },
      { name: "UART /dev/ttyUSB1", type: "115200 Baud Serial", source: "STM32 ECU" },
      { name: "CARLA RPC Port 2000", type: "TCP RPC Socket", source: "CARLA Server" }
    ],
    outputs: [
      { topic: "/odom", type: "nav_msgs/msg/Odometry (twist only, cov=1e6 on pose)", rate: "30 Hz", target: "EKF Local" },
      { topic: "/imu/data", type: "sensor_msgs/msg/Imu", rate: "50 Hz", target: "EKF Local" },
      { topic: "/battery/state", type: "sensor_msgs/msg/BatteryState", rate: "1 Hz", target: "Diagnostics" }
    ],
    codeSnippet: `# stm32_bridge_node.py: Odometry twist-only covariance convention
# Pose degree-of-freedom variance set to 1e6 so robot_localization treats pose as unmeasured
POSE_COV_DIAG = (1e6, 1e6, 1e6, 1e6, 1e6, 1e6)
TWIST_COV_DIAG = (0.01, 1e6, 1e6, 1e6, 1e6, 0.05)

msg.pose.covariance = _diag6(POSE_COV_DIAG)
msg.twist.covariance = _diag6(TWIST_COV_DIAG)`
  },
  {
    id: "stage-03",
    num: 3,
    slug: "stage-03-ekf",
    title: "Local Odometry Fusion (EKF)",
    badge: "State Estimation",
    color: "#10b981",
    bgGlow: "rgba(16, 185, 129, 0.15)",
    summary: "High-frequency Continuous Extended Kalman Filter fusing wheel encoder linear velocity with IMU yaw rate to produce smooth, drift-resistant odom -> base_footprint transform.",
    subSteps: [
      {
        step: "3.1",
        title: "Gyro Conditioning & Bias Nulling",
        desc: "gyro_conditioner measures zero-motion bias during initial standstill and dynamically rejects thermal gyro drift spikes.",
        frame: "imu_link",
        rate: "100 Hz"
      },
      {
        step: "3.2",
        title: "EKF State Prediction & Measurement Update",
        desc: "15-state EKF [x, y, z, roll, pitch, yaw, vx, vy, vz, vroll, vpitch, vyaw, ax, ay, az] integrates process model and fuses twist observation.",
        frame: "odom -> base_footprint",
        rate: "30 Hz"
      },
      {
        step: "3.3",
        title: "Covariance Explosion Watchdog",
        desc: "ekf_watchdog_node continuously audits P matrix trace; triggers emergency stop if covariance exceeds safety thresholds or TF publication halts.",
        frame: "odom",
        rate: "10 Hz"
      }
    ],
    nodes: [
      {
        name: "ekf_filter_node_local",
        type: "robot_localization Node",
        role: "Maintains smooth continuous local coordinate system; sole owner of odom -> base_footprint transform.",
        file: "src/perceptron_navigation/config/ekf_local.yaml"
      },
      {
        name: "gyro_conditioner",
        type: "Filtering Node",
        role: "Clamps rotational noise and stabilizes IMU orientation before EKF ingestion.",
        file: "src/perceptron_hardware/perceptron_hardware/gyro_conditioner.py"
      },
      {
        name: "ekf_watchdog_node",
        type: "Safety Guard Node",
        role: "Monitors localization health and flags divergence to navigation behaviors.",
        file: "src/perceptron_hardware/perceptron_hardware/ekf_watchdog_node.py"
      }
    ],
    inputs: [
      { topic: "/odom", type: "nav_msgs/msg/Odometry (wheel vx)", source: "stm32_bridge_node" },
      { topic: "/imu/data", type: "sensor_msgs/msg/Imu (wz, ax)", source: "pixhack_bridge_node / carla_bridge" }
    ],
    outputs: [
      { topic: "/odometry/filtered", type: "nav_msgs/msg/Odometry", rate: "30 Hz", target: "Costmap, Tracker, Nav2" },
      { topic: "TF: odom -> base_footprint", type: "geometry_msgs/msg/TransformStamped", rate: "30 Hz", target: "TF Tree" }
    ],
    codeSnippet: `# ekf_local.yaml configuration:
# Only vx (linear) from wheel encoders is fused; yaw is driven strictly by gyro
odom0: /odom
odom0_config: [false, false, false,
               false, false, false,
               true,  false, false,
               false, false, false,
               false, false, false]
imu0: /imu/data
imu0_config:  [false, false, false,
               false, false, false,
               false, false, false,
               false, false, true,
               true,  false, false]`
  },
  {
    id: "stage-04",
    num: 4,
    slug: "stage-04-slam",
    title: "Global Map Localization",
    badge: "World Referencing",
    color: "#6366f1",
    bgGlow: "rgba(99, 102, 241, 0.15)",
    summary: "Resolves global pose against an environment map. Exactly one node owns the map -> odom transform: slam_toolbox during mapping, or AMCL seeded by ArUco markers during localization.",
    subSteps: [
      {
        step: "4.1",
        title: "ArUco PnP Global Pose Seeding",
        desc: "aruco_localizer_node detects wall-mounted ArUco fiduciary boards via OpenCV solvePnP, computes T_map_base, and publishes /initialpose when robot is stationary.",
        frame: "map",
        rate: "On Detection"
      },
      {
        step: "4.2",
        title: "Particle Filter Update (AMCL)",
        desc: "KLD-sampling Adaptive Monte Carlo Localization evaluates 240 laser beams against static likelihood field, publishing map -> odom correction.",
        frame: "map -> odom",
        rate: "10-20 Hz"
      },
      {
        step: "4.3",
        title: "Pose Graph SLAM (Alternative)",
        desc: "async_slam_toolbox_node runs scan-matcher frontend and Ceres nonlinear optimizer backend to build rolling occupancy grid /map.",
        frame: "map -> odom",
        rate: "5 Hz"
      }
    ],
    nodes: [
      {
        name: "amcl",
        type: "nav2_amcl Node",
        role: "Estimates global 2D pose against pre-built map; updates particle weights only after translation > 0.1m or rotation > 0.1rad.",
        file: "src/perceptron_navigation/config/nav2_params.yaml"
      },
      {
        name: "aruco_localizer_node",
        type: "Vision Localizer Node",
        role: "Solves cold-start problem by generating high-confidence initial pose from environmental fiducials.",
        file: "src/perceptron_navigation/perceptron_navigation/aruco_localizer_node.py"
      },
      {
        name: "async_slam_toolbox_node",
        type: "SLAM Mapping Node",
        role: "Performs lifelong SLAM and loop-closure optimization in uncharted regions.",
        file: "src/perceptron_navigation/config/slam_toolbox.yaml"
      }
    ],
    inputs: [
      { topic: "/perception/scan (or /scan)", type: "sensor_msgs/msg/LaserScan", source: "LiDAR Preprocessor" },
      { topic: "TF: odom -> base_footprint", type: "geometry_msgs/msg/TransformStamped", source: "EKF Local" }
    ],
    outputs: [
      { topic: "TF: map -> odom", type: "geometry_msgs/msg/TransformStamped", rate: "10 Hz", target: "TF Tree" },
      { topic: "/map", type: "nav_msgs/msg/OccupancyGrid", rate: "Latched", target: "Nav2 Global Planner" },
      { topic: "/particle_cloud", type: "nav_msgs/msg/ParticleCloud", rate: "10 Hz", target: "RViz" }
    ],
    codeSnippet: `# aruco_localizer_node.py: Seeding AMCL safely without competing for TF ownership
# AMCL owns map -> odom. This node only provides /initialpose then gets out of the way.
pose_msg = PoseWithCovarianceStamped()
pose_msg.header.stamp = self.get_clock().now().to_msg()
pose_msg.header.frame_id = "map"
pose_msg.pose.pose = t_map_base
pose_msg.pose.covariance[0] = 0.05   # x variance: 5 cm
pose_msg.pose.covariance[7] = 0.05   # y variance: 5 cm
pose_msg.pose.covariance[35] = 0.02  # yaw variance: ~8 deg
self.initial_pose_pub.publish(pose_msg)`
  },
  {
    id: "stage-05",
    num: 5,
    slug: "stage-05-lidar-prep",
    title: "3D LiDAR Preprocessing",
    badge: "Geometry & Filtering",
    color: "#8b5cf6",
    bgGlow: "rgba(139, 92, 246, 0.15)",
    summary: "Filters raw PointCloud2 in base_footprint, separates road surface via RANSAC plane + local elevation grid, clusters obstacle points into bounding boxes, and projects 2D LaserScan.",
    subSteps: [
      {
        step: "5.1",
        title: "Range & Ego Self-Box Culling",
        desc: "Discards points < 0.5m (sensor housing) and > 50.0m; crops robot chassis box [-0.45, 2.0, -0.9, 0.9, -0.3, 1.55] in base_footprint.",
        frame: "base_footprint",
        rate: "10 Hz"
      },
      {
        step: "5.2",
        title: "Dual RANSAC Plane + Height Grid Ground Removal",
        desc: "RANSAC fits road plane (tilt near 0°, z near 0). Points within cell_height of lowest grid point are ground; prevents curbs becoming walls.",
        frame: "base_footprint",
        rate: "10 Hz"
      },
      {
        step: "5.3",
        title: "2D Projected Obstacle Clustering",
        desc: "Projects non-ground obstacle points into 2D (x, y) to collapse vertical LiDAR rings, then clusters via KD-tree graph components.",
        frame: "base_footprint",
        rate: "10 Hz"
      },
      {
        step: "5.4",
        title: "Radial LaserScan Flattening",
        desc: "Finds minimum range per bearing bin across vertical field of view to create synthetic 2D LaserScan for AMCL and 2D costmaps.",
        frame: "base_footprint",
        rate: "10 Hz"
      }
    ],
    nodes: [
      {
        name: "lidar_preprocessor_node",
        type: "Perception Core Node",
        role: "Performs real-time spatial decomposition of 3D point clouds in base_footprint frame.",
        file: "src/perceptron_perception/perceptron_perception/lidar_preprocessor_node.py"
      },
      {
        name: "cloud_processing.py",
        type: "Pure Math Library",
        role: "Contains standalone NumPy/SciPy KD-tree, RANSAC, and sparse connected component algorithms.",
        file: "src/perceptron_perception/perceptron_perception/cloud_processing.py"
      }
    ],
    inputs: [
      { topic: "/points (or /carla/lidar/points)", type: "sensor_msgs/msg/PointCloud2", source: "Sensors / CARLA" },
      { topic: "TF: lidar3d_link -> base_footprint", type: "Transform", source: "Robot State Publisher" }
    ],
    outputs: [
      { topic: "/perception/points_ground", type: "sensor_msgs/msg/PointCloud2", rate: "10 Hz", target: "Costmap Node" },
      { topic: "/perception/points_obstacles", type: "sensor_msgs/msg/PointCloud2 (x,y,z,cluster)", rate: "10 Hz", target: "Object Fusion & Costmap" },
      { topic: "/perception/clusters", type: "vision_msgs/msg/Detection3DArray", rate: "10 Hz", target: "Evaluation" },
      { topic: "/perception/scan", type: "sensor_msgs/msg/LaserScan", rate: "10 Hz", target: "AMCL / Nav2" }
    ],
    codeSnippet: `# cloud_processing.py: Why Ground uses Plane + Height Grid
# A single RANSAC plane finds the road, but a raised sidewalk sits 10-20 cm above it
# and would come out as one enormous obstacle.
# Point is ground if:
# 1) Within plane_threshold of fitted plane, OR
# 2) Within cell_height of lowest point in its cell AND lowest point is within cell_plane_tol
def ground_mask(xyz, plane, cell_size=0.5, cell_height=0.08, plane_thresh=0.06):
    d_plane = np.abs(np.dot(xyz, plane[:3]) + plane[3])
    # ... cell spatial hash lookup ...
    return is_ground`
  },
  {
    id: "stage-06",
    num: 6,
    slug: "stage-06-fusion",
    title: "Camera-LiDAR Sensor Fusion",
    badge: "Multi-Modal Association",
    color: "#ec4899",
    bgGlow: "rgba(236, 72, 153, 0.15)",
    summary: "Fuses 2D camera bounding boxes (YOLO/reference detector) with 3D LiDAR obstacle points via camera projection and Hungarian affinity matching.",
    subSteps: [
      {
        step: "6.1",
        title: "LiDAR-to-Camera Optical Projection",
        desc: "Transforms 3D obstacle clusters from base_footprint to camera_optical_link, applying pinhole projection K and distortion D.",
        frame: "camera_optical_link",
        rate: "10 Hz"
      },
      {
        step: "6.2",
        title: "Two-Stage Frustum Culling",
        desc: "Discards points behind camera (Z <= 0.1m) and outside normalized optical radius (r > max_radius) to prevent projection wraparound.",
        frame: "camera_optical_link",
        rate: "10 Hz"
      },
      {
        step: "6.3",
        title: "IoU & Depth Affinity Association",
        desc: "Computes IoU between projected 3D points and 2D bounding boxes; applies Hungarian matching to associate classes with 3D clusters.",
        frame: "base_footprint",
        rate: "10 Hz"
      },
      {
        step: "6.4",
        title: "3D Bounding Extent & Range Synthesis",
        desc: "Calculates precise Euclidean distance to nearest point surface and bounds 3D centroid with associated covariance matrix.",
        frame: "base_footprint",
        rate: "10 Hz"
      }
    ],
    nodes: [
      {
        name: "object_fusion_node",
        type: "Perception Fusion Node",
        role: "Subscribes to 2D detections and 3D obstacles; publishes fused 3D detections with class labels and true metric depth.",
        file: "src/perceptron_perception/perceptron_perception/object_fusion_node.py"
      },
      {
        name: "camera_projection.py",
        type: "Projection Geometry",
        role: "Performs calibrated OpenCV projectPoints and frustum transformations.",
        file: "src/perceptron_navigation/perceptron_navigation/camera_projection.py"
      }
    ],
    inputs: [
      { topic: "/perception/detections_2d (or /carla/ground_truth/boxes_2d)", type: "vision_msgs/msg/Detection2DArray", source: "Vision Detector" },
      { topic: "/perception/points_obstacles", type: "sensor_msgs/msg/PointCloud2", source: "LiDAR Preprocessor" },
      { topic: "/camera/camera_info", type: "sensor_msgs/msg/CameraInfo", source: "Camera Driver" }
    ],
    outputs: [
      { topic: "/perception/objects", type: "vision_msgs/msg/Detection3DArray (in base_footprint)", rate: "10 Hz", target: "Object Tracker" },
      { topic: "/perception/objects_json", type: "std_msgs/msg/String", rate: "10 Hz", target: "Logging / Telemetry" },
      { topic: "/perception/objects_image", type: "sensor_msgs/msg/Image (rendered 2D/3D boxes)", rate: "10 Hz", target: "Web Dashboard" }
    ],
    codeSnippet: `# object_fusion.py: Affinity metric combining 2D box containment and depth consistency
def compute_affinity(box_2d, projected_points_uv, cluster_depths):
    # Points must project inside the 2D bounding box
    inside = (projected_points_uv[:,0] >= box_2d.x0) & (projected_points_uv[:,0] <= box_2d.x1) & \\
             (projected_points_uv[:,1] >= box_2d.y0) & (projected_points_uv[:,1] <= box_2d.y1)
    if np.sum(inside) < min_points:
        return 0.0
    # Affinity scores based on point density and surface closeness
    return score`
  },
  {
    id: "stage-07",
    num: 7,
    slug: "stage-07-tracker",
    title: "Multi-Object Tracking",
    badge: "State & Identity Filtering",
    color: "#f59e0b",
    bgGlow: "rgba(245, 158, 11, 0.15)",
    summary: "Tracks fused 3D objects over time in odom frame using constant-velocity Kalman filters, Hungarian assignment with Mahalanobis gating, and track lifecycle state machines.",
    subSteps: [
      {
        step: "7.1",
        title: "Ego-Motion Compensation (TF Buffer)",
        desc: "Transforms object centroids from base_footprint to odom at detection timestamp using non-blocking asynchronous queue to prevent TF stalls.",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "7.2",
        title: "Mahalanobis Distance Gating",
        desc: "Evaluates innovation covariance S = H P H^T + R; gates candidate detections using Chi-squared threshold (chi2 = 9.21 for 99% confidence).",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "7.3",
        title: "Hungarian Optimal Assignment",
        desc: "Constructs cost matrix from Mahalanobis distances and executes SciPy linear_sum_assignment to match detections to active tracks.",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "7.4",
        title: "Track Lifecycle State Machine",
        desc: "Transitions tracks: TENTATIVE (hits < 3) -> CONFIRMED (active updates) -> COASTING (misses <= 10) -> DELETED.",
        frame: "odom",
        rate: "10 Hz"
      }
    ],
    nodes: [
      {
        name: "object_tracker_node",
        type: "Tracking Core Node",
        role: "Maintains multi-target Kalman filters in odom frame; assigns persistent track IDs and computes true metric velocity.",
        file: "src/perceptron_perception/perceptron_perception/object_tracker_node.py"
      },
      {
        name: "tracker.py",
        type: "Kalman Filter Class",
        role: "Implements discrete constant-velocity Kalman filter with [x, y, vx, vy] state vector.",
        file: "src/perceptron_perception/perceptron_perception/tracker.py"
      }
    ],
    inputs: [
      { topic: "/perception/objects", type: "vision_msgs/msg/Detection3DArray", source: "Object Fusion Node" },
      { topic: "TF: odom -> base_footprint", type: "Transform", source: "EKF Local" }
    ],
    outputs: [
      { topic: "/perception/tracked_objects", type: "perceptron_msgs/msg/TrackedObjectArray (in odom)", rate: "10 Hz", target: "Trajectory Predictor" },
      { topic: "/perception/track_markers", type: "visualization_msgs/msg/MarkerArray", rate: "10 Hz", target: "RViz" }
    ],
    codeSnippet: `# TrackedObject.msg state definitions:
uint8 TENTATIVE=0   # seen, not yet confirmed: do not plan around it yet
uint8 CONFIRMED=1   # updated by a detection this frame
uint8 COASTING=2    # confirmed, not seen this frame: position is a prediction

# tracker.py: Mahalanobis gating
diff = z - H @ x_pred
S = H @ P_pred @ H.T + R
chi2 = diff.T @ np.linalg.inv(S) @ diff
if chi2 <= 9.21: # 99% gate for 2 degrees of freedom
    accept_match()`
  },
  {
    id: "stage-08",
    num: 8,
    slug: "stage-08-prediction",
    title: "Trajectory Prediction",
    badge: "Spatio-Temporal Horizon",
    color: "#ef4444",
    bgGlow: "rgba(239, 68, 68, 0.15)",
    summary: "Projects confirmed dynamic objects forward across multiple horizons (0.5s, 1.0s, 2.0s) using Constant Velocity (CV) and Constant Turn Rate (CTRV) models with expanding error ellipses.",
    subSteps: [
      {
        step: "8.1",
        title: "Dynamic Moving Speed Gating",
        desc: "Classifies tracks as dynamic only when speed exceeds 2-sigma velocity uncertainty (speed > 2 * sqrt(var_v)), preventing jittering static poles from predicting paths.",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "8.2",
        title: "Motion Model Selection (CV vs CTRV)",
        desc: "Applies Constant Velocity (CV) for linear movement, and Constant Turn Rate Velocity (CTRV) for vehicle tracks with measured yaw rate |w| > 0.1 rad/s.",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "8.3",
        title: "Covariance Error Ellipse Inflation",
        desc: "Propagates covariance forward in time: Sigma(t) = F(t) * P * F(t)^T + Q(t), showing expanding spatial uncertainty at future horizons.",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "8.4",
        title: "Dense Waypoint Ribbon Generation",
        desc: "Interpolates path waypoints at dt = 0.1s from t=0 to t=2.0s for downstream voxel costmap rasterization.",
        frame: "odom",
        rate: "10 Hz"
      }
    ],
    nodes: [
      {
        name: "trajectory_predictor_node",
        type: "Prediction Node",
        role: "Evaluates kinematic motion models and publishes PredictedObjectArray containing future horizon poses and path ribbons.",
        file: "src/perceptron_perception/perceptron_perception/trajectory_predictor_node.py"
      },
      {
        name: "prediction.py",
        type: "Kinematic Math Library",
        role: "Calculates closed-form CTRV integrals and Taylor expansions for near-zero yaw rates.",
        file: "src/perceptron_perception/perceptron_perception/prediction.py"
      }
    ],
    inputs: [
      { topic: "/perception/tracked_objects", type: "perceptron_msgs/msg/TrackedObjectArray", source: "Object Tracker" }
    ],
    outputs: [
      { topic: "/perception/predicted_objects", type: "perceptron_msgs/msg/PredictedObjectArray", rate: "10 Hz", target: "Dynamic Costmap" },
      { topic: "/perception/prediction_markers", type: "visualization_msgs/msg/MarkerArray", rate: "10 Hz", target: "RViz" }
    ],
    codeSnippet: `# prediction.py: CTRV closed-form forward projection
def predict_ctrv(x, y, yaw, v, w, dt):
    if abs(w) < 1e-4: # fallback to CV for zero yaw rate
        return x + v * math.cos(yaw) * dt, y + v * math.sin(yaw) * dt, yaw
    theta = yaw + w * dt
    x_new = x + (v / w) * (math.sin(theta) - math.sin(yaw))
    y_new = y + (v / w) * (-math.cos(theta) + math.cos(yaw))
    return x_new, y_new, theta`
  },
  {
    id: "stage-09",
    num: 9,
    slug: "stage-09-costmap",
    title: "3D-Aware Dynamic Costmap",
    badge: "Spatial Risk Modeling",
    color: "#14b8a6",
    bgGlow: "rgba(20, 184, 166, 0.15)",
    summary: "Synthesizes a rolling 3-layer 2D/3D costmap in odom frame: Layer 1 Voxel Height Obstacles, Layer 2 Inscribed Inflation, and Layer 3 Dynamic Spatio-Temporal Risk Ribbons.",
    subSteps: [
      {
        step: "9.1",
        title: "Layer 1: 3D Voxel Height Obstacle Slicing",
        desc: "Discretizes obstacle points into 5cm height voxels above ground; projects occupied voxels between 0.1m and 1.6m onto 2D occupancy grid.",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "9.2",
        title: "Layer 2: Inscribed & Exponential Cost Inflation",
        desc: "Buffers lethal obstacles with inscribed rover radius (r=0.33m / 0.75m), decaying outwards via exponential cost scaling: cost = 100 * exp(-s * (dist - r_inscribed)).",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "9.3",
        title: "Layer 3: Spatio-Temporal Dynamic Risk Ribbons",
        desc: "Rasterizes predicted vehicle/pedestrian paths with Gaussian lateral clearance, weighted inversely by time-to-encounter (decaying from 100 at 0s to 30 at 2s).",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "9.4",
        title: "Layer 4: Cell Fusion & Maximum Pooling",
        desc: "Combines Layer 2 and Layer 3 via max-pooling: combined_cost(x, y) = max(inflated_cost(x, y), dynamic_risk_cost(x, y)).",
        frame: "odom",
        rate: "10 Hz"
      }
    ],
    nodes: [
      {
        name: "costmap_node",
        type: "Costmap Generator",
        role: "Maintains rolling costmaps centered on ego vehicle; incorporates moving obstacle predictions directly into Nav2 cost.",
        file: "src/perceptron_perception/perceptron_perception/costmap_node.py"
      },
      {
        name: "costmap.py",
        type: "Rasterization Engine",
        role: "Accelerated NumPy array voxel projection, Euclidean distance transform, and ribbon stamping.",
        file: "src/perceptron_perception/perceptron_perception/costmap.py"
      }
    ],
    inputs: [
      { topic: "/perception/points_obstacles", type: "sensor_msgs/msg/PointCloud2", source: "LiDAR Preprocessor" },
      { topic: "/perception/predicted_objects", type: "perceptron_msgs/msg/PredictedObjectArray", source: "Trajectory Predictor" },
      { topic: "/odometry/filtered", type: "nav_msgs/msg/Odometry", source: "EKF Local" }
    ],
    outputs: [
      { topic: "/costmap/combined", type: "nav_msgs/msg/OccupancyGrid (0-100 cost)", rate: "10 Hz", target: "Nav2 Local Costmap" },
      { topic: "/costmap/dynamic_risk", type: "nav_msgs/msg/OccupancyGrid", rate: "10 Hz", target: "RViz & Debug" },
      { topic: "/costmap/voxels", type: "sensor_msgs/msg/PointCloud2", rate: "10 Hz", target: "3D RViz Visualization" }
    ],
    codeSnippet: `# costmap.py: Dynamic Risk Ribbon Stamping
# Predicted paths are stamped as lethal ribbons along the path, with risk falling
# with time-to-encounter so immediate collisions are lethal while 2s paths allow navigation
risk_weight = np.clip(1.0 - (t_encounter / max_horizon), 0.3, 1.0)
cost_cell = int(90 * risk_weight * np.exp(-0.5 * (d_lateral / sigma)**2))
combined_grid = np.maximum(inflated_grid, dynamic_risk_grid)`
  },
  {
    id: "stage-10",
    num: 10,
    slug: "stage-10-nav2",
    title: "Nav2 Planning & Motion Control",
    badge: "Autonomous Navigation",
    color: "#3b82f6",
    bgGlow: "rgba(59, 130, 246, 0.15)",
    summary: "High-level path planning and trajectory execution. Nav2 Server manages global path generation (Theta*, Smac) and local control (RotationShim + DWB or MPPI) with traversability awareness.",
    subSteps: [
      {
        step: "10.1",
        title: "2.5D Elevation Traversability Classification",
        desc: "traversability_node analyzes terrain step heights, slopes, and negative obstacles (craters) to emit lethal point clouds for costmap ingestion.",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "10.2",
        title: "Global Collision-Free Path Planning",
        desc: "planner_server calculates optimal geometric path across global costmap using Theta* or SmacPlanner2D with Euclidean heuristic.",
        frame: "map",
        rate: "1 Hz / Goal Trigger"
      },
      {
        step: "10.3",
        title: "Rotation Shim Angular Alignment",
        desc: "When path deviation angle > 45° (0.785 rad), RotationShimController forces zero linear speed and commands in-place skid rotation first.",
        frame: "base_link",
        rate: "20 Hz"
      },
      {
        step: "10.4",
        title: "Model Predictive Path Following (MPPI / DWB)",
        desc: "Evaluates thousands of sampled trajectories over 32 time steps (dt=0.05s) minimizing cost penalties for obstacle proximity, goal distance, and smooth speed.",
        frame: "base_link",
        rate: "20 Hz"
      }
    ],
    nodes: [
      {
        name: "planner_server",
        type: "Nav2 Action Server",
        role: "Computes global /plan from ego pose to goal waypoint.",
        file: "src/perceptron_navigation/config/nav2_params.yaml"
      },
      {
        name: "controller_server",
        type: "Nav2 Action Server",
        role: "Generates real-time velocity commands /cmd_vel using RotationShimController wrapping DWB or MPPI.",
        file: "src/perceptron_navigation/config/nav2_params.yaml"
      },
      {
        name: "traversability_node",
        type: "Terrain Analysis Node",
        role: "Identifies craters (negative obstacles) and rocks (positive obstacles) in lunar/outdoor terrain.",
        file: "src/perceptron_navigation/perceptron_navigation/traversability_node.py"
      }
    ],
    inputs: [
      { topic: "/costmap/combined", type: "nav_msgs/msg/OccupancyGrid", source: "Dynamic Costmap" },
      { topic: "/goal_pose", type: "geometry_msgs/msg/PoseStamped", source: "Operator / Mission Node" },
      { topic: "/odometry/filtered", type: "nav_msgs/msg/Odometry", source: "EKF Local" }
    ],
    outputs: [
      { topic: "/plan", type: "nav_msgs/msg/Path (global coordinates)", rate: "1 Hz", target: "Controller & Camera Overlay" },
      { topic: "/cmd_vel", type: "geometry_msgs/msg/Twist (vx, wz)", rate: "20 Hz", target: "STM32 Motor Bridge" }
    ],
    codeSnippet: `# nav2_params.yaml: Controller RotationShim setup for 4-wheel skid-steer
controller_server:
  ros__parameters:
    controller_plugins: ["FollowPath"]
    FollowPath:
      plugin: "nav2_rotation_shim_controller::RotationShimController"
      primary_controller: "dwb_core::DWBLocalPlanner"
      angular_dist_threshold: 0.785   # 45 deg: beyond this, spin on the spot first
      forward_sampling_distance: 0.5
      rotate_to_heading_angular_vel: 0.6`
  },
  {
    id: "stage-11",
    num: 11,
    slug: "stage-11-actuators",
    title: "Actuator Output & Hardware",
    badge: "Physical Execution",
    color: "#22c55e",
    bgGlow: "rgba(34, 197, 94, 0.15)",
    summary: "Translates high-level Twist commands into physical motor torques. stm32_bridge_node packs serial TinyFrames; onboard STM32 executes closed-loop PID velocity control across 4 skid-steer wheels.",
    subSteps: [
      {
        step: "11.1",
        title: "Command Velocity Framing",
        desc: "stm32_bridge_node converts vx (m/s) and wz (rad/s) into 0xA5 0x01 TinyFrames payload with XOR checksum.",
        frame: "base_link",
        rate: "20 Hz"
      },
      {
        step: "11.2",
        title: "Communication Watchdog Timer",
        desc: "ECU hardware watchdog shuts off H-bridge PWM drives if no valid /cmd_vel frame is received within 300 ms.",
        frame: "STM32 Firmware",
        rate: "Hardware Loop"
      },
      {
        step: "11.3",
        title: "Differential Kinematics & Skid Scrubbing",
        desc: "Calculates individual left and right track speeds: v_left = vx - (wz * track_width / 2); v_right = vx + (wz * track_width / 2).",
        frame: "Chassis",
        rate: "100 Hz"
      },
      {
        step: "11.4",
        title: "Closed-Loop Motor PID Current Regulation",
        desc: "STM32 microcontroller executes 100 Hz PID loop against encoder feedback, driving high-current MOSFET H-bridges.",
        frame: "Motor Driver",
        rate: "100 Hz"
      }
    ],
    nodes: [
      {
        name: "stm32_bridge_node",
        type: "Hardware Actuator Bridge",
        role: "Transmits serial motion commands and enforces safety speed limits.",
        file: "src/perceptron_hardware/perceptron_hardware/stm32_bridge_node.py"
      },
      {
        name: "STM32F405 Motor Driver Firmware",
        type: "Embedded C Firmware",
        role: "Runs closed-loop current/velocity PID regulation and ADC battery monitoring.",
        file: "STM32_Serial_motorDriver/Core/Src/main.c"
      }
    ],
    inputs: [
      { topic: "/cmd_vel", type: "geometry_msgs/msg/Twist", source: "Nav2 Controller" }
    ],
    outputs: [
      { topic: "UART TX 0xA5 0x01", type: "Serial Bytes", rate: "20 Hz", target: "STM32 ECU" },
      { topic: "Motor PWM & Direction", type: "MOSFET Drive", rate: "20 kHz PWM", target: "4x High Torque DC Motors" },
      { topic: "/battery/state", type: "sensor_msgs/msg/BatteryState", rate: "1 Hz", target: "Diagnostics" }
    ],
    codeSnippet: `# stm32_bridge_node.py: Serial Command Framing
def send_cmd_vel(self, vx: float, wz: float):
    # Pack linear and angular speed into binary payload
    payload = struct.pack('<ff', float(vx), float(wz))
    checksum = calc_xor_checksum(payload)
    frame = bytes([PROTO_SOF_NEW, FRAME_CMD_VEL, len(payload)]) + payload + bytes([checksum, PROTO_EOF_NEW])
    self.serial_port.write(frame)`
  },
  {
    id: "stage-12",
    num: 12,
    slug: "stage-12-telemetry",
    title: "Telemetry & Operator Overlays",
    badge: "Human-in-the-Loop",
    color: "#a855f7",
    bgGlow: "rgba(168, 85, 247, 0.15)",
    summary: "Real-time augmented telemetry for remote operators. Projects planned paths onto camera frames via GPU encoding, publishes interactive RViz marker arrays, and streams live Foxglove dashboards.",
    subSteps: [
      {
        step: "12.1",
        title: "Planned Path Camera Reprojection",
        desc: "path_overlay_node transforms /plan from map to camera_optical_link, projectPoints into pixel coordinates, and ships lightweight geometry over ZeroMQ.",
        frame: "camera_optical_link",
        rate: "15 Hz"
      },
      {
        step: "12.2",
        title: "Jetson GPU Hardware H.265 Streaming",
        desc: "jetson_path_overlay.py receives projected path polygons, draws augmented green ribbon directly on live frame, and hardware-encodes to H.265 via nvv4l2h265enc.",
        frame: "Jetson GPU",
        rate: "30 FPS"
      },
      {
        step: "12.3",
        title: "3D RViz & Foxglove Studio Dashboard",
        desc: "Aggregates point clouds, bounding boxes, predicted trajectories, and costmaps into web-accessible dashboard.",
        frame: "map / odom",
        rate: "Continuous"
      }
    ],
    nodes: [
      {
        name: "path_overlay_node",
        type: "Augmented Reality Node",
        role: "Projects Nav2 plans into camera pixel space and transmits to Jetson overlay server via ZeroMQ :5558.",
        file: "src/perceptron_navigation/perceptron_navigation/path_overlay_node.py"
      },
      {
        name: "jetson_path_overlay.py",
        type: "GStreamer Jetson Server",
        role: "Draws ribbons on V4L2 frames and streams low-latency RTP/UDP video to operator console.",
        file: "jetson/jetson_path_overlay.py"
      },
      {
        name: "lidar_camera_overlay_node",
        type: "Sensor Alignment Node",
        role: "Renders depth-colored LiDAR points onto camera image to verify sensor extrinsics.",
        file: "src/perceptron_perception/perceptron_perception/lidar_camera_overlay_node.py"
      }
    ],
    inputs: [
      { topic: "/plan", type: "nav_msgs/msg/Path", source: "Nav2 Planner" },
      { topic: "/camera/image_raw", type: "sensor_msgs/msg/Image", source: "Camera Driver / CARLA" },
      { topic: "/perception/track_markers", type: "visualization_msgs/msg/MarkerArray", source: "Object Tracker" }
    ],
    outputs: [
      { topic: "UDP Port 5000 RTP/H.265", type: "Augmented Video Stream", rate: "30 FPS", target: "Operator GCS" },
      { topic: "/perception/lidar_overlay", type: "sensor_msgs/msg/Image", rate: "10 Hz", target: "Web Console" }
    ],
    codeSnippet: `# path_overlay_node.py: Projecting planned ribbon into camera pixels
# Decimated path is ~250 integer pixel pairs (1.2 kB). Pushed via ZMQ to Jetson
# keeping robot logic and camera video hardware strictly decoupled.
poly_points = cp.project_path_ribbon(path_msg, tf_camera, K, D, ribbon_width=0.4)
zmq_socket.send_multipart([b"overlay", msgpack.packb(poly_points)])`
  }
];

export const PIPELINE_TOPIC_CONNECTIONS = [
  { fromStage: 1, toStage: 2, topic: "Raw Sensors -> Bridges", type: "Hardware Transducers" },
  { fromStage: 2, toStage: 3, topic: "/odom (twist) & /imu/data", type: "nav_msgs/Odometry, sensor_msgs/Imu" },
  { fromStage: 3, toStage: 4, topic: "TF: odom -> base_footprint", type: "TF Transform" },
  { fromStage: 1, toStage: 5, topic: "/points", type: "sensor_msgs/PointCloud2" },
  { fromStage: 5, toStage: 6, topic: "/perception/points_obstacles", type: "sensor_msgs/PointCloud2" },
  { fromStage: 6, toStage: 7, topic: "/perception/objects", type: "vision_msgs/Detection3DArray" },
  { fromStage: 7, toStage: 8, topic: "/perception/tracked_objects", type: "perceptron_msgs/TrackedObjectArray" },
  { fromStage: 8, toStage: 9, topic: "/perception/predicted_objects", type: "perceptron_msgs/PredictedObjectArray" },
  { fromStage: 5, toStage: 9, topic: "/perception/points_obstacles (voxels)", type: "sensor_msgs/PointCloud2" },
  { fromStage: 9, toStage: 10, topic: "/costmap/combined", type: "nav_msgs/OccupancyGrid" },
  { fromStage: 4, toStage: 10, topic: "/map (global occupancy)", type: "nav_msgs/OccupancyGrid" },
  { fromStage: 10, toStage: 11, topic: "/cmd_vel", type: "geometry_msgs/Twist" },
  { fromStage: 10, toStage: 12, topic: "/plan", type: "nav_msgs/Path" },
  { fromStage: 7, toStage: 12, topic: "/perception/track_markers", type: "visualization_msgs/MarkerArray" }
];

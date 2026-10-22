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
    summary: "Physical sensors feed the Jetson bridge; CARLA provides a separate synchronized sensor and ground-truth stream for the perception stack. The two paths use different topic names and are shown separately below.",
    subSteps: [
      {
        step: "1.1",
        title: "LiDAR scan / point cloud",
        desc: "The physical LDROBOT STL-19P path is transported as /scan. CARLA publishes a simulated point cloud on /carla/lidar/points for the perception preprocessing launch.",
        frame: "laser_frame / lidar3d_link",
        rate: "10 Hz"
      },
      {
        step: "1.2",
        title: "Inertial measurement",
        desc: "Hardware bridge nodes publish raw IMU data; CARLA publishes simulated IMU data. The EKF configuration selects angular velocity for local odometry.",
        frame: "imu_link",
        rate: "50-100 Hz"
      },
      {
        step: "1.3",
        title: "Wheel odometry",
        desc: "The STM32 reports wheel-derived velocity. The CARLA bridge publishes a matching simulated odometry message for simulation runs.",
        frame: "base_link",
        rate: "20-50 Hz"
      },
      {
        step: "1.4",
        title: "GNSS (optional path)",
        desc: "The Pixhawk bridge publishes /gps/fix; the CARLA bridge publishes a simulated fix when the GPS path is enabled.",
        frame: "gps_link",
        rate: "5 Hz"
      },
      {
        step: "1.5",
        title: "Camera stream",
        desc: "CARLA publishes camera images and intrinsics for simulation perception. On the physical robot, the host camera bridge is activated for docking.",
        frame: "camera_optical_link",
        rate: "15-30 Hz"
      }
    ],
    nodes: [
      {
        name: "Physical sensors + motor controller",
        type: "Hardware source",
        role: "LDROBOT STL-19P LiDAR, wheel encoders, IMU, and battery sensors produce source data before ROS transport.",
        file: "src/perceptron_robot_description/urdf/perceptron_robot.xacro"
      },
      {
        name: "CARLA sensor actors",
        type: "Simulation source",
        role: "CARLA sensor sources and simulated wheel / IMU / GNSS readings; carla_bridge publishes their ROS messages in Stage 02.",
        file: "src/perceptron_carla/perceptron_carla/sim_sensors.py"
      }
    ],
    inputs: [
      { name: "LiDAR returns", type: "sensor_msgs/msg/LaserScan or PointCloud2", source: "Physical LiDAR / CARLA sensor" },
      { name: "Wheel / IMU measurements", type: "Odometry and IMU", source: "STM32 / Pixhawk bridges or CARLA" }
    ],
    outputs: [
      { topic: "LD19 LiDAR serial stream", type: "LDROBOT LD19 protocol", rate: "10 Hz scan", publisher: "STL-19P LiDAR", target: "Jetson host bridge" },
      { topic: "STM32 0x55 / 0x56 telemetry frames", type: "TinyFrame · wheel odometry / IMU / battery", rate: "About 100 Hz sensor frames", publisher: "STM32 motor controller", target: "Jetson host bridge or stm32_bridge_node" },
      { topic: "CARLA synchronous sensor tick", type: "LiDAR · camera · IMU · GNSS · ground truth", rate: "Simulation tick", publisher: "CARLA sensor actors", target: "carla_bridge" }
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
        role: "Reads STM32 telemetry into /odom, /imu/data_raw, and battery measurement topics; subscribes to /cmd_vel for serial motor commands.",
        file: "src/perceptron_hardware/perceptron_hardware/stm32_bridge_node.py"
      },
      {
        name: "pixhack_bridge_node",
        type: "Sensor Bridge Node",
        role: "Publishes /imu/data and /gps/fix from Pixhawk telemetry when this optional hardware path is launched.",
        file: "src/perceptron_hardware/perceptron_hardware/pixhack_bridge_node.py"
      },
      {
        name: "carla_bridge",
        type: "Simulation Orchestrator",
        role: "Translates left-handed CARLA coordinates to right-handed REP 103 ROS conventions and injects sensor noise.",
        file: "src/perceptron_carla/perceptron_carla/carla_bridge.py"
      },
      {
        name: "battery_node",
        type: "Battery monitor node",
        role: "Combines measured voltage and current into BatteryState and low / critical battery signals.",
        file: "src/perceptron_hardware/perceptron_hardware/battery_node.py"
      }
    ],
    inputs: [
      { name: "ZeroMQ Port :5555", type: "TCP Socket", source: "Jetson Nano" },
      { name: "UART /dev/ttyUSB0 (configurable)", type: "115200 Baud Serial", source: "STM32 ECU" },
      { name: "CARLA RPC Port 2000", type: "TCP RPC Socket", source: "CARLA Server" }
    ],
    outputs: [
      { topic: "/scan", type: "sensor_msgs/msg/LaserScan", rate: "10 Hz", publisher: "jetson_bridge_node", target: "slam_toolbox / AMCL / Nav2 (hardware)" },
      { topic: "/odom", type: "nav_msgs/msg/Odometry", rate: "Up to sensor rate", publisher: "jetson_bridge_node or stm32_bridge_node", target: "ekf_filter_node" },
      { topic: "/imu/data_raw", type: "sensor_msgs/msg/Imu", rate: "Up to sensor rate", publisher: "jetson_bridge_node or stm32_bridge_node", target: "ekf_filter_node" },
      { topic: "/imu/data", type: "sensor_msgs/msg/Imu", rate: "Configured rate", publisher: "pixhack_bridge_node / carla_bridge", target: "Optional localization path" },
      { topic: "/battery/measured_voltage and /battery/measured_current", type: "std_msgs/msg/Float32", rate: "From bridge telemetry", publisher: "jetson_bridge_node or stm32_bridge_node", target: "battery_node" },
      { topic: "/battery/state", type: "sensor_msgs/msg/BatteryState", rate: "battery_node timer", publisher: "battery_node", target: "dock_guard / mission / operator tools" },
      { topic: "/gps/fix", type: "sensor_msgs/msg/NavSatFix", rate: "Configured rate", publisher: "pixhack_bridge_node or carla_bridge", target: "GPS localization path (when enabled)" },
      { topic: "/carla/lidar/points + /carla/camera/image_raw", type: "PointCloud2 + Image", rate: "CARLA tick", publisher: "carla_bridge", target: "perceptron_perception nodes" },
      { topic: "/carla/ground_truth/boxes_2d", type: "vision_msgs/msg/Detection2DArray", rate: "CARLA tick", publisher: "carla_bridge", target: "object_fusion_node (reference detector input)" }
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
        name: "ekf_filter_node",
        type: "robot_localization Node",
        role: "Maintains smooth continuous local coordinate system; sole owner of odom -> base_footprint transform.",
        file: "src/perceptron_robot_bringup/config/ekf.yaml"
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
      { topic: "/odom", type: "nav_msgs/msg/Odometry (wheel-derived velocity)", source: "jetson_bridge_node or stm32_bridge_node" },
      { topic: "/imu/data_raw", type: "sensor_msgs/msg/Imu (configured angular velocity)", source: "jetson_bridge_node or stm32_bridge_node" }
    ],
    outputs: [
      { topic: "/odometry/filtered", type: "nav_msgs/msg/Odometry", rate: "25 Hz in the documented EKF config", publisher: "ekf_filter_node", target: "Odometry consumers" },
      { topic: "TF: odom -> base_footprint", type: "geometry_msgs/msg/TransformStamped", rate: "EKF rate", publisher: "ekf_filter_node", target: "TF consumers (AMCL / Nav2 / perception)" }
    ],
    codeSnippet: `# robot_localization EKF configuration:
# Hardware and simulation launches select the odometry topic; the physical bridge path uses /odom.
odom0: /odom
odom0_config: [false, false, false,
               false, false, false,
               true,  false, false,
               false, false, false,
               false, false, false]
imu0: /imu/data_raw
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
      { topic: "/scan", type: "sensor_msgs/msg/LaserScan", source: "jetson_bridge_node (hardware); CARLA perception uses point-cloud input" },
      { topic: "TF: odom -> base_footprint", type: "geometry_msgs/msg/TransformStamped", source: "EKF Local" }
    ],
    outputs: [
      { topic: "TF: map -> odom", type: "geometry_msgs/msg/TransformStamped", rate: "Mode-dependent", publisher: "amcl or slam_toolbox (one active owner)", target: "TF consumers" },
      { topic: "/map", type: "nav_msgs/msg/OccupancyGrid", rate: "Map update / latched map", publisher: "map_server or slam_toolbox", target: "Nav2 global costmap / planner" },
      { topic: "/amcl_pose", type: "geometry_msgs/msg/PoseWithCovarianceStamped", rate: "AMCL update", publisher: "amcl", target: "dock_guard / pose consumers" },
      { topic: "/initialpose", type: "geometry_msgs/msg/PoseWithCovarianceStamped", rate: "On pose seed", publisher: "aruco_localizer_node or operator", target: "amcl" }
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
    summary: "CARLA's 3D point-cloud path enters lidar_preprocessor_node, which separates ground and obstacles, labels clusters, and emits perception products. The physical hardware navigation path publishes /scan separately.",
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
      { topic: "/carla/lidar/points", type: "sensor_msgs/msg/PointCloud2", source: "carla_bridge via config/carla.yaml" },
      { topic: "TF: lidar3d_link -> base_footprint", type: "Transform", source: "Robot State Publisher" }
    ],
    outputs: [
      { topic: "/perception/points_ground", type: "sensor_msgs/msg/PointCloud2", rate: "Cloud input rate", publisher: "lidar_preprocessor_node", target: "costmap_node" },
      { topic: "/perception/points_obstacles", type: "sensor_msgs/msg/PointCloud2 (x, y, z, cluster)", rate: "Cloud input rate", publisher: "lidar_preprocessor_node", target: "object_fusion_node and costmap_node" },
      { topic: "/perception/clusters", type: "vision_msgs/msg/Detection3DArray", rate: "Cloud input rate", publisher: "lidar_preprocessor_node", target: "Evaluation / visualization" },
      { topic: "/perception/scan", type: "sensor_msgs/msg/LaserScan", rate: "Cloud input rate", publisher: "lidar_preprocessor_node", target: "Perception visualization / optional consumers" },
      { topic: "/perception/cluster_markers", type: "visualization_msgs/msg/MarkerArray", rate: "Cloud input rate", publisher: "lidar_preprocessor_node", target: "RViz" },
      { topic: "/perception/lidar_preprocess_stats", type: "std_msgs/msg/Float32MultiArray", rate: "Cloud input rate", publisher: "lidar_preprocessor_node", target: "cloud_eval_node" }
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
    summary: "Associates 2D detections with clustered LiDAR points using camera projection and affinity matching. The CARLA launch uses ground-truth 2D boxes as its reference detector input; the topic is configurable for another detector.",
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
      { topic: "/carla/ground_truth/boxes_2d (CARLA default; configurable detector topic)", type: "vision_msgs/msg/Detection2DArray", source: "carla_bridge / configured 2D detector" },
      { topic: "/perception/points_obstacles", type: "sensor_msgs/msg/PointCloud2", source: "lidar_preprocessor_node" },
      { topic: "/carla/camera/camera_info", type: "sensor_msgs/msg/CameraInfo", source: "carla_bridge (CARLA config)" }
    ],
    outputs: [
      { topic: "/perception/objects", type: "vision_msgs/msg/Detection3DArray (base_footprint)", rate: "Input pair rate", publisher: "object_fusion_node", target: "object_tracker_node" },
      { topic: "/perception/objects_json", type: "std_msgs/msg/String", rate: "Input pair rate", publisher: "object_fusion_node", target: "fusion evaluation / tooling" },
      { topic: "/perception/object_points", type: "sensor_msgs/msg/PointCloud2", rate: "Input pair rate", publisher: "object_fusion_node", target: "fusion evaluation / visualization" },
      { topic: "/perception/object_markers", type: "visualization_msgs/msg/MarkerArray", rate: "Input pair rate", publisher: "object_fusion_node", target: "RViz" },
      { topic: "/perception/objects_image", type: "sensor_msgs/msg/Image", rate: "Input pair rate", publisher: "object_fusion_node", target: "Image viewer when subscribed" }
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
      { topic: "/perception/tracked_objects", type: "perceptron_msgs/msg/TrackedObjectArray (odom)", rate: "Detection callback rate", publisher: "object_tracker_node", target: "trajectory_predictor_node" },
      { topic: "/perception/track_markers", type: "visualization_msgs/msg/MarkerArray", rate: "Detection callback rate", publisher: "object_tracker_node", target: "RViz / telemetry" }
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
      { topic: "/perception/predicted_objects", type: "perceptron_msgs/msg/PredictedObjectArray", rate: "Track callback rate", publisher: "trajectory_predictor_node", target: "costmap_node" },
      { topic: "/perception/prediction_markers", type: "visualization_msgs/msg/MarkerArray", rate: "Track callback rate", publisher: "trajectory_predictor_node", target: "RViz" }
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
      { topic: "/perception/points_obstacles", type: "sensor_msgs/msg/PointCloud2", source: "lidar_preprocessor_node" },
      { topic: "/perception/points_ground", type: "sensor_msgs/msg/PointCloud2", source: "lidar_preprocessor_node" },
      { topic: "/perception/predicted_objects", type: "perceptron_msgs/msg/PredictedObjectArray", source: "Trajectory Predictor" },
      { topic: "/odom", type: "nav_msgs/msg/Odometry", source: "Hardware bridge / CARLA bridge" }
    ],
    outputs: [
      { topic: "/costmap/obstacles", type: "nav_msgs/msg/OccupancyGrid", rate: "Sensor / track input rate", publisher: "costmap_node", target: "RViz / evaluation" },
      { topic: "/costmap/inflated", type: "nav_msgs/msg/OccupancyGrid", rate: "Sensor / track input rate", publisher: "costmap_node", target: "RViz / evaluation" },
      { topic: "/costmap/dynamic_risk", type: "nav_msgs/msg/OccupancyGrid", rate: "Sensor / track input rate", publisher: "costmap_node", target: "RViz / evaluation" },
      { topic: "/costmap/combined", type: "nav_msgs/msg/OccupancyGrid (0-100 cost)", rate: "Sensor / track input rate", publisher: "costmap_node", target: "CARLA perception evaluation / visualization" },
      { topic: "/costmap/nav", type: "nav_msgs/msg/OccupancyGrid", rate: "10 Hz", publisher: "costmap_node", target: "Nav2 local & global costmaps (uninflated lethal + dynamic risk, allows Nav2 footprint inflation)" },
      { topic: "/costmap/voxels", type: "sensor_msgs/msg/PointCloud2", rate: "Sensor / track input rate", publisher: "costmap_node", target: "3D RViz visualization" },
      { topic: "/costmap/stats", type: "std_msgs/msg/Float32MultiArray", rate: "Reported / periodic", publisher: "costmap_node", target: "costmap_eval_node" }
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
    title: "Nav2 Autonomous Navigation & GPS Route Planning",
    badge: "Global & Local Autonomy",
    color: "#3b82f6",
    bgGlow: "rgba(59, 130, 246, 0.15)",
    summary: "Full autonomous navigation pipeline to GPS goals. Features gps_goal_node for datum conversion and lane graph routing, Nav2 Smac Hybrid-A* (Dubins car model with 3m turning radius), Regulated Pure Pursuit, nav2_collision_monitor safety zones, and predictive_speed_limit_node for corridor-crossing yielding.",
    subSteps: [
      {
        step: "10.1",
        title: "GPS-to-Map Datum & Lane-Graph Route Routing",
        desc: "gps_goal_node projects GPS lat/lon to map via origin datum (19.1334° N, 72.9133° E). Finds shortest route across /carla/map/road_graph lane polylines (with lane change edges, +5m cost) and emits 30m sub-goals to NavigateToPose.",
        frame: "map",
        rate: "On Goal / 30m Sub-goals"
      },
      {
        step: "10.2",
        title: "Nav2 SmacPlannerHybrid (Dubins Car Kinematics)",
        desc: "Computes kinematically feasible car trajectories with minimum turning radius r = 3.0m on rolling 120m global costmap fed by /costmap/nav. Treats unknown cells as free (0 cost) to eliminate plan timeouts (0.01s vs 0.94s).",
        frame: "map",
        rate: "2 Hz Replanning"
      },
      {
        step: "10.3",
        title: "Predictive Corridor Yielding (predictive_speed_limit_node)",
        desc: "Checks Stage 7/8 predicted trajectories against the ego corridor. If an object crosses ahead, publishes dynamic speed caps on /speed_limit ensuring the car stops 1.5m short; extends paths until objects clear corridor.",
        frame: "odom",
        rate: "10 Hz"
      },
      {
        step: "10.4",
        title: "Regulated Pure Pursuit & Nav2 Collision Monitor",
        desc: "Tracks path carrot (1.5-6.0m horizon, 1.2s lookahead) at 2.5 m/s cruise. collision_monitor filters /cmd_vel_nav: halts car on LiDAR points within 1.3m stop polygon, and slows to 40% in 5.0m slow polygon.",
        frame: "base_footprint",
        rate: "20 Hz"
      }
    ],
    nodes: [
      {
        name: "gps_goal_node",
        type: "GPS & Road Graph Router",
        role: "Converts GPS coordinates via datum, routes along /carla/map/road_graph, and feeds 30m NavigateToPose sub-goals.",
        file: "src/perceptron_navigation/perceptron_navigation/gps_goal_node.py"
      },
      {
        name: "predictive_speed_limit_node",
        type: "Corridor Yielding Node",
        role: "Monitors predicted object paths against Nav2 plan corridor and publishes /speed_limit to prevent collisions.",
        file: "src/perceptron_navigation/perceptron_navigation/predictive_speed_limit_node.py"
      },
      {
        name: "planner_server (Smac Hybrid-A*)",
        type: "Nav2 Action Server",
        role: "Plans Dubins paths with 3m turning radius on 120m rolling costmap fed by /costmap/nav.",
        file: "src/perceptron_carla/config/nav2_carla.yaml"
      },
      {
        name: "controller_server (Pure Pursuit)",
        type: "Nav2 Action Server",
        role: "Regulated Pure Pursuit controller tracking carrot at 2.5 m/s, yielding via /speed_limit; outputs to /cmd_vel_nav.",
        file: "src/perceptron_carla/config/nav2_carla.yaml"
      },
      {
        name: "collision_monitor",
        type: "Safety Watchdog Node",
        role: "Filters /cmd_vel_nav to /cmd_vel using direct LiDAR point checks in front of the vehicle nose (1.3m stop, 5.0m slow).",
        file: "src/perceptron_carla/config/nav2_carla.yaml"
      }
    ],
    inputs: [
      { topic: "/gps_goal", type: "sensor_msgs/msg/NavSatFix", source: "gps_goal CLI / mission manager" },
      { topic: "/clicked_point", type: "geometry_msgs/msg/PointStamped", source: "RViz Publish Point click-to-go" },
      { topic: "/carla/map/road_graph", type: "std_msgs/msg/String (JSON)", source: "carla_bridge lane polylines" },
      { topic: "/costmap/nav", type: "nav_msgs/msg/OccupancyGrid", source: "costmap_node (lethal + dynamic risk)" },
      { topic: "/perception/predicted_objects", type: "perceptron_msgs/msg/PredictedObjectArray", source: "trajectory_predictor_node" }
    ],
    outputs: [
      { topic: "/cmd_vel", type: "geometry_msgs/msg/Twist (vx, wz)", rate: "20 Hz", publisher: "collision_monitor (from /cmd_vel_nav)", target: "carla_bridge --control ros / stm32_bridge_node" },
      { topic: "/plan", type: "nav_msgs/msg/Path", rate: "2 Hz", publisher: "planner_server", target: "controller_server, predictive_speed_limit_node, AR overlay" },
      { topic: "/speed_limit", type: "nav2_msgs/msg/SpeedLimit", rate: "10 Hz", publisher: "predictive_speed_limit_node", target: "controller_server" },
      { topic: "/gps_goal/route", type: "nav_msgs/msg/Path", rate: "On goal", publisher: "gps_goal_node", target: "RViz road route display" },
      { topic: "/gps_goal/status", type: "std_msgs/msg/String (JSON)", rate: "10 Hz", publisher: "gps_goal_node", target: "Mission telemetry & CLI" }
    ],
    codeSnippet: `# predictive_speed_limit_node.py: Corridor yielding calculation
# Never reach a spot before a crossing person has cleared it, stop 1.5m short
def limit_for_crossing(path_ego, obj_predicted_path, gap=1.5, decel=2.0):
    t_obj_clear, s_corridor = compute_intersection(path_ego, obj_predicted_path)
    if t_obj_clear is not None:
        v_max = (s_corridor - gap) / t_obj_clear
        return min(v_max, math.sqrt(2 * decel * max(0.0, s_corridor - gap)))
    return 4.0 # unconstrained cruise`
  },
  {
    id: "stage-11",
    num: 11,
    slug: "stage-11-actuators",
    title: "Actuator Output & Vehicle Control",
    badge: "Vehicle Kinematics & Execution",
    color: "#22c55e",
    bgGlow: "rgba(34, 197, 94, 0.15)",
    summary: "Translates velocity commands (/cmd_vel) into physical vehicle execution across dual backends: CARLA autonomous vehicle control (carla_bridge --control ros with vehicle_control.py: curvature-to-Ackermann steering, speed PI loop, safety watchdog, and collision referee) and physical rover hardware (stm32_bridge_node: TinyFrames serial, 100 Hz PID).",
    subSteps: [
      {
        step: "11.1",
        title: "Ackermann Curvature Steering (vehicle_control.py)",
        desc: "Converts Twist (vx, wz) into Ackermann front-wheel angle: curvature kappa = wz / vx, steering delta = atan(L * kappa) with wheelbase L=1.525m. Maps to CARLA steer [-1, 1] clamped to max 35° (2.18m min turning radius).",
        frame: "base_footprint",
        rate: "20 Hz (sim tick)"
      },
      {
        step: "11.2",
        title: "Speed PI Regulation & Standstill Gear Interlock",
        desc: "A PI controller (Kp=0.35, Ki=0.25) regulates throttle/brake against measured forward speed. Gear transitions (forward/reverse) enforce a complete vehicle standstill before switching to protect powertrain.",
        frame: "Vehicle Chassis",
        rate: "20 Hz"
      },
      {
        step: "11.3",
        title: "Safety Watchdog & E-Stop Interlock",
        desc: "Commands full braking if /cmd_vel is older than 0.5s (watchdog timeout) or if /carla/estop is received. Slew limiter caps steering rate to 1.5 units/s and enforces max speed <= 4.0 m/s.",
        frame: "Watchdog Loop",
        rate: "Continuous (20 Hz)"
      },
      {
        step: "11.4",
        title: "Collision Sensor Telemetry & Hardware STM32 Mode",
        desc: "In CARLA, /carla/ego/collision records any physical actor contact impulses as a referee for benchmark scenarios. On physical rover hardware, stm32_bridge_node sends 0xA5 0x01 TinyFrames to 4-wheel skid-steer H-bridges.",
        frame: "carla_world / Hardware ECU",
        rate: "Event / 100 Hz"
      }
    ],
    nodes: [
      {
        name: "carla_bridge (--control ros)",
        type: "Simulation Control Bridge",
        role: "Subscribes to /cmd_vel and /carla/estop; drives CARLA vehicle using vehicle_control.py and publishes collision telemetry.",
        file: "src/perceptron_carla/perceptron_carla/carla_bridge.py"
      },
      {
        name: "vehicle_control.py (TwistController)",
        type: "Vehicle Controller Module",
        role: "Calculates Ackermann steering angle from curvature, regulates speed PI loop, and enforces watchdog timeouts.",
        file: "src/perceptron_carla/perceptron_carla/vehicle_control.py"
      },
      {
        name: "stm32_bridge_node",
        type: "Hardware Actuator Bridge",
        role: "Transmits serial TinyFrames to physical rover STM32 microcontroller for 4-wheel differential skid-steer driving.",
        file: "src/perceptron_hardware/perceptron_hardware/stm32_bridge_node.py"
      }
    ],
    inputs: [
      { topic: "/cmd_vel", type: "geometry_msgs/msg/Twist", source: "Nav2 collision_monitor" },
      { topic: "/carla/estop", type: "std_msgs/msg/Bool", source: "Safety supervisory node / operator" }
    ],
    outputs: [
      { topic: "carla.VehicleControl", type: "CARLA RPC (throttle, steer, brake, reverse)", rate: "20 Hz", publisher: "carla_bridge", target: "CARLA Ego Vehicle Actor" },
      { topic: "/carla/ego/collision", type: "std_msgs/msg/String (JSON)", rate: "On collision event", publisher: "carla_bridge", target: "scenario_suite referee" },
      { topic: "UART TX 0xA5 0x01", type: "Serial TinyFrame", rate: "20 Hz", publisher: "stm32_bridge_node", target: "Physical STM32 motor driver" }
    ],
    codeSnippet: `# vehicle_control.py: Curvature to Ackermann steering & Speed PI
# Curvature k = w / v floored at v_min_steer
d = math.atan(self.L * w_cmd / v_ref) if w_cmd else 0.0
d = max(-self.max_steer, min(self.max_steer, d))
target_steer = -d / self.max_wheel_steer

# PI Speed control loop
err = target_speed - speed
self.integral = max(-1.0, min(1.0, self.integral + err * dt))
throttle = self.ff0 + self.ff1 * target_speed + self.kp * err + self.ki * self.integral`
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
      { topic: "/local_plan", type: "nav_msgs/msg/Path", source: "Nav2 controller (when enabled)" },
      { topic: "/perception/track_markers", type: "visualization_msgs/msg/MarkerArray", source: "object_tracker_node (telemetry / visualization path)" },
      { topic: "/camera/image_raw and /points", type: "sensor_msgs messages", source: "Camera and LiDAR drivers (lidar overlay path)" }
    ],
    outputs: [
      { topic: "ZeroMQ :5558 → RTP/UDP :5000", type: "Projected path geometry → H.265 video stream", rate: "Path updates / camera rate", publisher: "path_overlay_node → jetson_path_overlay.py (host process)", target: "Operator video client" },
      { topic: "/perception/lidar_overlay", type: "sensor_msgs/msg/Image", rate: "Paired image/cloud rate", publisher: "lidar_camera_overlay_node", target: "Image viewer / calibration" }
    ],
    codeSnippet: `# path_overlay_node.py: Projecting planned ribbon into camera pixels
# Decimated path is ~250 integer pixel pairs (1.2 kB). Pushed via ZMQ to Jetson
# keeping robot logic and camera video hardware strictly decoupled.
poly_points = cp.project_path_ribbon(path_msg, tf_camera, K, D, ribbon_width=0.4)
zmq_socket.send_multipart([b"overlay", msgpack.packb(poly_points)])`
  }
];

export const PIPELINE_TOPIC_CONNECTIONS = [
  { fromStage: 1, toStage: 2, topic: "LD19 LiDAR serial stream", type: "LDROBOT LD19 protocol / serial", fromNode: "Physical sensors + motor controller", toNode: "jetson_bridge_node", fromOutputIndex: 0, toInputIndex: 1 },
  { fromStage: 1, toStage: 2, topic: "STM32 0x55 / 0x56 telemetry frames", type: "TinyFrame / UART serial", fromNode: "Physical sensors + motor controller", toNode: "stm32_bridge_node", fromOutputIndex: 1, toInputIndex: 1 },
  { fromStage: 1, toStage: 2, topic: "CARLA synchronous sensor tick", type: "CARLA RPC", fromNode: "CARLA sensor actors", toNode: "carla_bridge", fromOutputIndex: 2, toInputIndex: 2 },
  { fromStage: 2, toStage: 3, topic: "/odom & /imu/data_raw", type: "nav_msgs/msg/Odometry, sensor_msgs/msg/Imu", fromNode: "jetson_bridge_node / stm32_bridge_node", toNode: "ekf_filter_node" },
  { fromStage: 3, toStage: 4, topic: "TF: odom -> base_footprint", type: "TF Transform", fromNode: "ekf_filter_node", toNode: "amcl / async_slam_toolbox_node" },
  { fromStage: 2, toStage: 5, topic: "/carla/lidar/points (CARLA perception path)", type: "sensor_msgs/msg/PointCloud2", fromNode: "carla_bridge", toNode: "lidar_preprocessor_node" },
  { fromStage: 2, toStage: 6, topic: "/carla/ground_truth/boxes_2d (CARLA reference detections)", type: "vision_msgs/msg/Detection2DArray", fromNode: "carla_bridge", toNode: "object_fusion_node" },
  { fromStage: 5, toStage: 6, topic: "/perception/points_obstacles", type: "sensor_msgs/PointCloud2", fromNode: "lidar_preprocessor_node", toNode: "object_fusion_node" },
  { fromStage: 6, toStage: 7, topic: "/perception/objects", type: "vision_msgs/Detection3DArray", fromNode: "object_fusion_node", toNode: "object_tracker_node" },
  { fromStage: 7, toStage: 8, topic: "/perception/tracked_objects", type: "perceptron_msgs/TrackedObjectArray", fromNode: "object_tracker_node", toNode: "trajectory_predictor_node" },
  { fromStage: 8, toStage: 9, topic: "/perception/predicted_objects", type: "perceptron_msgs/PredictedObjectArray", fromNode: "trajectory_predictor_node", toNode: "costmap_node" },
  { fromStage: 5, toStage: 9, topic: "/perception/points_obstacles and /perception/points_ground", type: "sensor_msgs/msg/PointCloud2", fromNode: "lidar_preprocessor_node", toNode: "costmap_node" },
  { fromStage: 2, toStage: 9, topic: "/odom", type: "nav_msgs/msg/Odometry", fromNode: "jetson_bridge_node / carla_bridge", toNode: "costmap_node" },
  { fromStage: 9, toStage: 10, topic: "/costmap/nav", type: "nav_msgs/msg/OccupancyGrid", fromNode: "costmap_node", toNode: "planner_server / controller_server costmaps" },
  { fromStage: 8, toStage: 10, topic: "/perception/predicted_objects", type: "perceptron_msgs/msg/PredictedObjectArray", fromNode: "trajectory_predictor_node", toNode: "predictive_speed_limit_node" },
  { fromStage: 2, toStage: 10, topic: "/carla/map/road_graph", type: "std_msgs/msg/String", fromNode: "carla_bridge", toNode: "gps_goal_node" },
  { fromStage: 4, toStage: 10, topic: "/map (global occupancy)", type: "nav_msgs/OccupancyGrid", fromNode: "async_slam_toolbox_node / map_server", toNode: "planner_server" },
  { fromStage: 2, toStage: 10, topic: "/scan (hardware navigation path)", type: "sensor_msgs/msg/LaserScan", fromNode: "jetson_bridge_node", toNode: "controller_server" },
  { fromStage: 10, toStage: 11, topic: "/cmd_vel", type: "geometry_msgs/Twist", fromNode: "collision_monitor / controller_server", toNode: "carla_bridge --control ros / stm32_bridge_node" },
  { fromStage: 11, toStage: 10, topic: "/carla/ego/collision", type: "std_msgs/msg/String", fromNode: "carla_bridge", toNode: "scenario referee / evaluation" },
  { fromStage: 10, toStage: 12, topic: "/plan", type: "nav_msgs/Path", fromNode: "planner_server", toNode: "path_overlay_node" },
  { fromStage: 7, toStage: 12, topic: "/perception/track_markers", type: "visualization_msgs/MarkerArray", fromNode: "object_tracker_node", toNode: "RViz / telemetry consumer" }
];

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  CameraControls,
  Environment,
  Lightformer,
  ContactShadows,
} from "@react-three/drei";
import gsap from "gsap";
import {
  Cpu,
  Zap,
  HardDrive,
  Fan,
  Layers,
  BatteryCharging,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  Camera,
  Check,
  RotateCw,
  Compass,
  Maximize2,
  Minimize2,
  Sliders,
} from "lucide-react";
import { useStore } from "./state";
import { ThemeToggle } from "./components";
import "./builder.css";

// =========================================================================
// TYPES & CATALOG DEFINITION
// =========================================================================

export interface PartItem {
  id: string;
  category:
    "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu";
  name: string;
  brand: string;
  sku: string;
  price: number;
  tdp: number;
  socket?: "AM5" | "LGA1700";
  formFactor?: string;
  wattage?: number;
  specs: Record<string, string>;
}

export type SelectedParts = Record<
  "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu",
  PartItem | null
>;

export const HARDWARE_CATALOG: PartItem[] = [
  // CPUs
  {
    id: "3e821709-c2fa-59d1-b570-d0d55483e428",
    category: "cpu",
    name: "AMD Ryzen 9 9950X3D",
    brand: "AMD",
    sku: "100-100001279WOF",
    price: 26500,
    tdp: 170,
    socket: "AM5",
    specs: { Cores: "16C / 32T", Boost: "5.7 GHz", Cache: "144MB 3D V-Cache" },
  },
  {
    id: "f4dd78b2-5927-5eac-8d97-09a6ab59587f",
    category: "cpu",
    name: "Intel Core i9-14900KS",
    brand: "Intel",
    sku: "BX8071514900KS",
    price: 27900,
    tdp: 253,
    socket: "LGA1700",
    specs: { Cores: "24C / 32T", Boost: "6.2 GHz", Cache: "36MB SmartCache" },
  },
  {
    id: "fc437841-8134-599c-9385-995430a3e181",
    category: "cpu",
    name: "AMD Ryzen 7 7800X3D",
    brand: "AMD",
    sku: "100-100000910WOF",
    price: 16900,
    tdp: 120,
    socket: "AM5",
    specs: { Cores: "8C / 16T", Boost: "5.0 GHz", Cache: "104MB 3D V-Cache" },
  },
  {
    id: "45f05cf7-74af-5b96-b9be-9ee292b9d843",
    category: "cpu",
    name: "Intel Core i7-14700K",
    brand: "Intel",
    sku: "BX8071514700K",
    price: 15900,
    tdp: 253,
    socket: "LGA1700",
    specs: { Cores: "20C / 28T", Boost: "5.6 GHz", Cache: "33MB SmartCache" },
  },

  // Motherboards
  {
    id: "2d6cfb3c-ea4d-561b-96f1-4ac8c09586c2",
    category: "motherboard",
    name: "ASUS ROG Crosshair X670E Hero",
    brand: "ASUS",
    sku: "ROG-X670E-HERO",
    price: 23900,
    tdp: 60,
    socket: "AM5",
    formFactor: "ATX",
    specs: { Chipset: "AMD X670E", PCIe: "Gen 5.0 x16", Memory: "DDR5-6400+" },
  },
  {
    id: "4ff78ff6-06b6-5c01-b51f-3200654c04b4",
    category: "motherboard",
    name: "ASUS ROG Maximus Z790 Dark Hero",
    brand: "ASUS",
    sku: "ROG-Z790-DARK",
    price: 25500,
    tdp: 65,
    socket: "LGA1700",
    formFactor: "ATX",
    specs: { Chipset: "Intel Z790", PCIe: "Gen 5.0 x16", Memory: "DDR5-8000+" },
  },
  {
    id: "452f24db-df5c-587c-a3b1-0eaefa41f7fb",
    category: "motherboard",
    name: "MSI MAG B650 Tomahawk WiFi",
    brand: "MSI",
    sku: "MAG-B650-TOMAHAWK",
    price: 8490,
    tdp: 50,
    socket: "AM5",
    formFactor: "ATX",
    specs: { Chipset: "AMD B650", PCIe: "Gen 4.0 x16", Memory: "DDR5-6000" },
  },
  {
    id: "db114746-9db1-5869-80f1-862340af5c9e",
    category: "motherboard",
    name: "Gigabyte Z790 AORUS Elite AX",
    brand: "Gigabyte",
    sku: "GIGA-Z790-ELITE",
    price: 9900,
    tdp: 55,
    socket: "LGA1700",
    formFactor: "ATX",
    specs: { Chipset: "Intel Z790", PCIe: "Gen 5.0 x16", Memory: "DDR5-7600" },
  },

  // GPUs
  {
    id: "b511b224-430a-5bdd-ada6-ee7ec6076f96",
    category: "gpu",
    name: "ASUS ROG Strix GeForce RTX 4090 OC",
    brand: "ASUS",
    sku: "ROG-STRIX-RTX4090-O24G",
    price: 74900,
    tdp: 450,
    specs: {
      VRAM: "24GB GDDR6X",
      Architecture: "Ada Lovelace",
      Slots: "3.5 Slot",
    },
  },
  {
    id: "230b8f75-8ddb-5fe7-b106-64539226c183",
    category: "gpu",
    name: "Sapphire Nitro+ Radeon RX 7900 XTX",
    brand: "Sapphire",
    sku: "11322-01-20G",
    price: 41900,
    tdp: 355,
    specs: {
      VRAM: "24GB GDDR6",
      Architecture: "RDNA 3",
      Cooling: "Tri-X Fans",
    },
  },
  {
    id: "b1b532c7-c517-54f1-b2a5-d9f4c0a4779d",
    category: "gpu",
    name: "ASUS ProArt GeForce RTX 4080 SUPER",
    brand: "ASUS",
    sku: "PROART-RTX4080S-O16G",
    price: 43500,
    tdp: 320,
    specs: {
      VRAM: "16GB GDDR6X",
      Architecture: "Ada Lovelace",
      Slots: "2.5 Slot",
    },
  },
  {
    id: "ae6b38f2-74ff-529d-ba90-d1893ad07d80",
    category: "gpu",
    name: "Sapphire Pulse Radeon RX 7800 XT",
    brand: "Sapphire",
    sku: "11330-02-20G",
    price: 19900,
    tdp: 263,
    specs: { VRAM: "16GB GDDR6", Architecture: "RDNA 3", Cooling: "Dual-X" },
  },

  // Coolers
  {
    id: "8383a7e7-9512-528a-addb-62e929701fa7",
    category: "cooler",
    name: "ASUS ROG Ryujin III 360 ARGB",
    brand: "ASUS",
    sku: "ROG-RYUJIN-III-360",
    price: 13900,
    tdp: 15,
    specs: {
      Type: "360mm Liquid AIO",
      Pump: "Asetek 8th Gen",
      Screen: '3.5" LCD Panel',
      Fans: "3x 120mm Magnetic Daisy-Chain",
    },
  },
  {
    id: "f025f984-fd5f-5143-a651-9a84a98c7196",
    category: "cooler",
    name: "NZXT Kraken Elite 360 RGB",
    brand: "NZXT",
    sku: "RL-KR36E-B1",
    price: 10900,
    tdp: 12,
    specs: {
      Type: "360mm Liquid AIO",
      Pump: "Custom High-Flow",
      Screen: '2.36" Wide-Angle LCD',
      Fans: "3x F120 RGB Core",
    },
  },
  {
    id: "b1004ae0-2863-5a43-9c6c-95c340d85ecd",
    category: "cooler",
    name: "Noctua NH-D15 chromax.black",
    brand: "Noctua",
    sku: "NH-D15-CH-BK",
    price: 4590,
    tdp: 5,
    specs: {
      Type: "Dual-Tower Air Cooler",
      Heatpipes: "6x Copper",
      Fans: "2x NF-A15 140mm",
      Height: "165mm",
    },
  },

  // RAM
  {
    id: "0655a597-cb15-5eec-af24-039b3b86c07d",
    category: "ram",
    name: "G.Skill Trident Z5 RGB 64GB DDR5-6400",
    brand: "G.Skill",
    sku: "F5-6400J3239G32GX2-TZ5RK",
    price: 8990,
    tdp: 15,
    specs: {
      Capacity: "64GB (2x32GB)",
      Speed: "DDR5-6400 CL32",
      Voltage: "1.40V",
      Profile: "Intel XMP 3.0 / EXPO",
    },
  },
  {
    id: "d6038a6c-40e9-5685-9b0a-dc9848e43a4e",
    category: "ram",
    name: "Corsair Dominator Titanium 64GB DDR5-6600",
    brand: "Corsair",
    sku: "CMP64GX5M2B6600C32",
    price: 11500,
    tdp: 16,
    specs: {
      Capacity: "64GB (2x32GB)",
      Speed: "DDR5-6600 CL32",
      Cooling: "Patented DHX",
      Lighting: "11-zone Capellix",
    },
  },
  {
    id: "17bce453-13a6-58fe-a241-06c881e35e80",
    category: "ram",
    name: "Kingston Fury Beast RGB 32GB DDR5-6000",
    brand: "Kingston",
    sku: "KF560C36BBEAK2-32",
    price: 4990,
    tdp: 12,
    specs: {
      Capacity: "32GB (2x16GB)",
      Speed: "DDR5-6000 CL36",
      Voltage: "1.35V",
      Profile: "AMD EXPO / XMP",
    },
  },

  // Storage
  {
    id: "bbecf3ae-4800-57cd-86d6-616b41739c57",
    category: "storage",
    name: "Samsung 990 PRO 2TB PCIe 4.0 NVMe",
    brand: "Samsung",
    sku: "MZ-V9P2T0BW",
    price: 6990,
    tdp: 8,
    specs: {
      Read: "7,450 MB/s",
      Write: "6,900 MB/s",
      Form: "M.2 2280",
      Controller: "Samsung Pascal",
    },
  },
  {
    id: "71429aeb-47a2-5cec-9e18-11bdabb7f633",
    category: "storage",
    name: "WD_BLACK SN850X 2TB NVMe SSD",
    brand: "WD_BLACK",
    sku: "WDS200T2X0E",
    price: 6490,
    tdp: 8,
    specs: {
      Read: "7,300 MB/s",
      Write: "6,600 MB/s",
      Form: "M.2 2280",
      Tech: "Game Mode 2.0",
    },
  },

  // Power Supplies
  {
    id: "0dae6b52-197c-5d0c-990b-4c832d9edfa0",
    category: "psu",
    name: "Seasonic PRIME TX-1000 1000W Titanium",
    brand: "Seasonic",
    sku: "PRIME-TX-1000",
    price: 12900,
    tdp: 0,
    wattage: 1000,
    specs: {
      Efficiency: "80 PLUS Titanium",
      Modularity: "Fully Modular",
      Fan: "135mm FDB Fan",
      Warranty: "12 Years",
    },
  },
  {
    id: "054804f4-9c19-5636-8483-46817c9d0e16",
    category: "psu",
    name: "be quiet! Dark Power Pro 13 1300W",
    brand: "be quiet!",
    sku: "BN331",
    price: 15900,
    tdp: 0,
    wattage: 1300,
    specs: {
      Efficiency: "80 PLUS Titanium",
      Modularity: "Fully Modular",
      ATX: "ATX 3.0 PCIe 5.0",
      Fan: "Frameless Silent Wings",
    },
  },
  {
    id: "e697fbc3-6d37-51cb-88c2-9caf19bc7021",
    category: "psu",
    name: "Corsair RM850x 850W Gold Modular",
    brand: "Corsair",
    sku: "CP-9020200-NA",
    price: 5290,
    tdp: 0,
    wattage: 850,
    specs: {
      Efficiency: "80 PLUS Gold",
      Modularity: "Fully Modular",
      Fan: "135mm Magnetic Levitation",
      Mode: "Zero RPM Mode",
    },
  },
];

// =========================================================================
// 3D PROCEDURAL PBR HARDWARE MESH COMPONENTS
// =========================================================================

interface RealisticFanProps {
  radius: number;
  depth: number;
  bladeCount?: number;
  hasRgbRing?: boolean;
  rgbColor?: string;
  spinDirection?: number;
  hubRadiusRatio?: number;
  bladePitch?: number;
  isDark: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

function RealisticFan({
  radius,
  depth,
  bladeCount = 9,
  hasRgbRing = false,
  rgbColor = "#00f090",
  spinDirection = 1,
  hubRadiusRatio = 0.36,
  bladePitch = 0.38,
  isDark,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: RealisticFanProps) {
  const rotorRef = useRef<THREE.Group>(null);
  const hubRadius = radius * hubRadiusRatio;

  // Frame materials (brushed dark metal)
  const frameColor = isDark ? "#141c21" : "#334155";
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: frameColor,
        metalness: 0.85,
        roughness: 0.2,
      }),
    [frameColor],
  );

  // Stator vanes and motor base
  const statorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#0c1216" : "#1e293b",
        metalness: 0.5,
        roughness: 0.5,
      }),
    [isDark],
  );

  // Rotor Aerodynamic Blades geometry
  const bladeGeom = useMemo(() => {
    const span = radius * 0.94 - hubRadius;
    const width = ((2 * Math.PI * radius) / bladeCount) * 0.65;
    const geom = new THREE.BoxGeometry(width, span, 0.012);
    geom.translate(0, span / 2, 0);
    return geom;
  }, [radius, hubRadius, bladeCount]);

  const bladeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: hasRgbRing ? "#f8fafc" : isDark ? "#24323a" : "#334155",
        metalness: hasRgbRing ? 0.1 : 0.45,
        roughness: hasRgbRing ? 0.2 : 0.3,
        transparent: hasRgbRing,
        opacity: hasRgbRing ? 0.88 : 1.0,
        emissive: hasRgbRing ? rgbColor : "#000000",
        emissiveIntensity: hasRgbRing ? (isDark ? 0.75 : 0.45) : 0,
      }),
    [isDark, hasRgbRing, rgbColor],
  );

  // Concentric turbine fan rotation
  useFrame((_, delta) => {
    if (rotorRef.current) {
      rotorRef.current.rotation.z += delta * 18.0 * spinDirection;
    }
  });

  const cornerOffset = radius * 0.78;

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Static Outer Cowl / Shroud */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={frameMat} castShadow>
        <cylinderGeometry args={[radius, radius, depth, 32, 1, true]} />
      </mesh>

      {/* Front and Back Chamfer Bezel Lips */}
      <mesh position={[0, 0, depth / 2]} material={frameMat}>
        <torusGeometry args={[radius, 0.018, 10, 32]} />
      </mesh>
      <mesh position={[0, 0, -depth / 2]} material={frameMat}>
        <torusGeometry args={[radius, 0.018, 10, 32]} />
      </mesh>

      {/* Corner Mounting Tabs with Rubber Anti-Vibration Pads */}
      {[
        [-cornerOffset, cornerOffset],
        [cornerOffset, cornerOffset],
        [-cornerOffset, -cornerOffset],
        [cornerOffset, -cornerOffset],
      ].map(([cx, cy], i) => (
        <group key={i} position={[cx, cy, 0]}>
          <mesh material={frameMat}>
            <boxGeometry args={[0.12, 0.12, depth * 0.8]} />
          </mesh>
          <mesh position={[0, 0, depth * 0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.015, 8]} />
            <meshStandardMaterial color="#0b0f12" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Addressable RGB Halo Ring */}
      {hasRgbRing && (
        <mesh position={[0, 0, depth / 2 + 0.005]}>
          <torusGeometry args={[radius * 0.94, 0.026, 12, 32]} />
          <meshStandardMaterial
            color={rgbColor}
            emissive={rgbColor}
            emissiveIntensity={isDark ? 1.45 : 0.9}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Rear Stator Guide Vanes */}
      {[0, 1, 2, 3].map((s) => {
        const angle = (s * Math.PI) / 2 + Math.PI / 4;
        const vaneLen = radius - hubRadius;
        return (
          <mesh
            key={s}
            position={[
              Math.cos(angle) * (hubRadius + vaneLen / 2),
              Math.sin(angle) * (hubRadius + vaneLen / 2),
              -depth * 0.32,
            ]}
            rotation={[0, 0, angle + Math.PI / 2]}
            material={statorMat}
          >
            <boxGeometry args={[0.025, vaneLen, depth * 0.35]} />
          </mesh>
        );
      })}

      {/* Stator motor housing */}
      <mesh
        position={[0, 0, -depth * 0.32]}
        rotation={[Math.PI / 2, 0, 0]}
        material={statorMat}
      >
        <cylinderGeometry
          args={[hubRadius * 0.94, hubRadius * 0.94, depth * 0.35, 24]}
        />
      </mesh>

      {/* 2. Rotating Rotor Assembly */}
      <group ref={rotorRef}>
        {/* Hub Cylinder */}
        <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry
            args={[hubRadius * 0.96, hubRadius, depth * 0.55, 28]}
          />
          <meshStandardMaterial
            color={isDark ? "#182228" : "#1e293b"}
            metalness={0.75}
            roughness={0.25}
          />
        </mesh>

        {/* Circular Brand Medallion (OCT-CNC / Reference Style) */}
        <mesh
          position={[0, 0, depth * 0.28 + 0.01]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry
            args={[hubRadius * 0.55, hubRadius * 0.58, 0.018, 28]}
          />
          <meshStandardMaterial
            color="#080c0e"
            metalness={0.92}
            roughness={0.15}
          />
        </mesh>
        {/* Center Metallic Icon */}
        <mesh
          position={[0, 0, depth * 0.28 + 0.022]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry
            args={[hubRadius * 0.28, hubRadius * 0.28, 0.006, 16]}
          />
          <meshStandardMaterial
            color="#f8fafc"
            metalness={0.85}
            roughness={0.2}
            emissive="#ffffff"
            emissiveIntensity={isDark ? 0.4 : 0.2}
          />
        </mesh>

        {/* Aerodynamic Sickle Blades */}
        {Array.from({ length: bladeCount }).map((_, b) => {
          const bladeAngle = (b * 2 * Math.PI) / bladeCount;
          return (
            <group key={b} rotation={[0, 0, bladeAngle]}>
              <mesh
                geometry={bladeGeom}
                material={bladeMat}
                position={[0, hubRadius, 0.02]}
                rotation={[bladePitch * spinDirection, 0.08 * spinDirection, 0]}
                castShadow
              />
            </group>
          );
        })}
      </group>
    </group>
  );
}

// =========================================================================
// CAD EXPLODED VIEW LEADER LINES & DYNAMIC COOLANT TUBING
// =========================================================================

function TrajectoryGuide({
  start,
  end,
  progress,
  isDark,
}: {
  start: [number, number, number];
  end: [number, number, number];
  progress: number;
  isDark: boolean;
}) {
  if (progress <= 0.03) return null;
  const p1 = new THREE.Vector3(...start);
  const p2 = new THREE.Vector3(...end);
  const dist = p1.distanceTo(p2);
  if (dist < 0.05) return null;

  const mid = p1.clone().add(p2).multiplyScalar(0.5);
  const dir = p2.clone().sub(p1).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
  const opacity = Math.min(1, progress * 1.6) * (isDark ? 0.75 : 0.55);
  const color = isDark ? "#00f090" : "#0284c7";

  return (
    <group position={[mid.x, mid.y, mid.z]} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[0.007, 0.007, dist, 6]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, -dist / 2, 0]}>
        <sphereGeometry args={[0.024, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, dist / 2, 0]}>
        <sphereGeometry args={[0.024, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

function CoolantTubes({
  pumpPos,
  radPos,
  isDark,
}: {
  pumpPos: [number, number, number];
  radPos: [number, number, number];
  isDark: boolean;
}) {
  const curve1 = useMemo(() => {
    const start = new THREE.Vector3(
      pumpPos[0] + 0.35,
      pumpPos[1] + 0.08,
      pumpPos[2] + 0.04,
    );
    const end = new THREE.Vector3(radPos[0] + 0.85, radPos[1] - 0.2, radPos[2]);
    // Forward arc into open chamber to clear RAM and motherboard
    const mid1 = new THREE.Vector3(start.x + 0.35, start.y + 0.75, start.z + 0.22);
    const mid2 = new THREE.Vector3(end.x - 0.25, end.y - 0.6, end.z + 0.18);
    return new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
  }, [pumpPos[0], pumpPos[1], pumpPos[2], radPos[0], radPos[1], radPos[2]]);

  const curve2 = useMemo(() => {
    const start = new THREE.Vector3(
      pumpPos[0] + 0.35,
      pumpPos[1] - 0.08,
      pumpPos[2] - 0.04,
    );
    const end = new THREE.Vector3(radPos[0] + 1.05, radPos[1] - 0.2, radPos[2]);
    // Forward arc into open chamber to clear RAM and motherboard
    const mid1 = new THREE.Vector3(start.x + 0.45, start.y + 0.55, start.z + 0.18);
    const mid2 = new THREE.Vector3(end.x - 0.3, end.y - 0.7, end.z + 0.14);
    return new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
  }, [pumpPos[0], pumpPos[1], pumpPos[2], radPos[0], radPos[1], radPos[2]]);

  const tubeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#0d1317" : "#1e293b",
        roughness: 0.6,
        metalness: 0.3,
      }),
    [isDark],
  );

  const collarMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#2a3942" : "#64748b",
        roughness: 0.2,
        metalness: 0.9,
      }),
    [isDark],
  );

  return (
    <group>
      <mesh
        geometry={new THREE.TubeGeometry(curve1, 36, 0.054, 12, false)}
        material={tubeMat}
        castShadow
      />
      <mesh
        geometry={new THREE.TubeGeometry(curve2, 36, 0.054, 12, false)}
        material={tubeMat}
        castShadow
      />
      <mesh
        position={[pumpPos[0] + 0.35, pumpPos[1] + 0.08, pumpPos[2] + 0.04]}
        rotation={[0, 0, Math.PI / 2]}
        material={collarMat}
      >
        <cylinderGeometry args={[0.075, 0.075, 0.07, 16]} />
      </mesh>
      <mesh
        position={[pumpPos[0] + 0.35, pumpPos[1] - 0.08, pumpPos[2] - 0.04]}
        rotation={[0, 0, Math.PI / 2]}
        material={collarMat}
      >
        <cylinderGeometry args={[0.075, 0.075, 0.07, 16]} />
      </mesh>
      <mesh
        position={[radPos[0] + 0.85, radPos[1] - 0.2, radPos[2]]}
        material={collarMat}
      >
        <cylinderGeometry args={[0.075, 0.075, 0.07, 16]} />
      </mesh>
      <mesh
        position={[radPos[0] + 1.05, radPos[1] - 0.2, radPos[2]]}
        material={collarMat}
      >
        <cylinderGeometry args={[0.075, 0.075, 0.07, 16]} />
      </mesh>
    </group>
  );
}

function ExplodedLeaderLines({
  explodedProgress,
  isDark,
}: {
  explodedProgress: number;
  isDark: boolean;
}) {
  if (explodedProgress <= 0.02) return null;

  return (
    <group>
      {/* CPU Socket to CPU */}
      <TrajectoryGuide
        start={[-0.45, 1.2, 0.16]}
        end={[
          -0.45,
          1.2 + explodedProgress * 0.9,
          0.16 + explodedProgress * 1.5,
        ]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* CPU to AIO Pump Block */}
      <TrajectoryGuide
        start={[
          -0.45,
          1.2 + explodedProgress * 0.9,
          0.16 + explodedProgress * 1.5,
        ]}
        end={[-0.45, 1.2 + explodedProgress * 1.8, 0.435 + explodedProgress * 2.6]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* Top Chassis Radiator Mount to Radiator */}
      <TrajectoryGuide
        start={[-0.25, 3.25, 0.4]}
        end={[-0.25, 3.25 + explodedProgress * 1.6, 0.4 + explodedProgress * 0.5]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* Vertical GPU Riser Base to GPU */}
      <TrajectoryGuide
        start={[-0.725, -0.88, 0.70]}
        end={[
          -0.725 + explodedProgress * 0.1,
          -0.32 - explodedProgress * 0.35 - 0.56,
          0.70 + explodedProgress * 2.2,
        ]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* DIMM Slot 2 to RAM 1 */}
      <TrajectoryGuide
        start={[0.16, 1.2, 0.16]}
        end={[
          0.16 + explodedProgress * 0.15,
          1.2 + explodedProgress * 1.5,
          0.22 + explodedProgress * 1.2,
        ]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* DIMM Slot 4 to RAM 2 */}
      <TrajectoryGuide
        start={[0.42, 1.2, 0.16]}
        end={[
          0.42 + explodedProgress * 0.3,
          1.2 + explodedProgress * 1.8,
          0.22 + explodedProgress * 1.4,
        ]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* M.2 Slot to Storage */}
      <TrajectoryGuide
        start={[-0.45, 0.18, 0.14]}
        end={[
          -0.45 + explodedProgress * 0.2,
          0.18 + explodedProgress * 0.8,
          0.18 + explodedProgress * 1.2,
        ]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* PSU Bay to PSU */}
      <TrajectoryGuide
        start={[-0.85, -1.85, 0.4]}
        end={[
          -0.85 - explodedProgress * 1.2,
          -1.85,
          0.4 + explodedProgress * 1.0,
        ]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* Chassis Glass Standoffs to Glass Side Panel */}
      <TrajectoryGuide
        start={[0, 0.55, 2.45]}
        end={[0, 0.55, 2.45 + explodedProgress * 2.8]}
        progress={explodedProgress}
        isDark={isDark}
      />
      {/* Front Chassis Mount to Front Glass Panel */}
      <TrajectoryGuide
        start={[2.05, 0.55, 0]}
        end={[2.05 + explodedProgress * 1.5, 0.55, 0]}
        progress={explodedProgress}
        isDark={isDark}
      />
    </group>
  );
}

// =========================================================================
// REALISTIC PC CASE CHASSIS (AUTHENTIC ATX MID-TOWER ENCLOSURE)
// =========================================================================

function OpenChassis({
  isDark,
  explodedProgress,
}: {
  isDark: boolean;
  explodedProgress: number;
}) {
  const steelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#182126" : "#cbd5e1",
        metalness: 0.85,
        roughness: 0.25,
      }),
    [isDark],
  );

  const trayMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#0e1418" : "#e2e8f0",
        metalness: 0.4,
        roughness: 0.8,
      }),
    [isDark],
  );

  const brassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d4af37",
        metalness: 0.9,
        roughness: 0.2,
      }),
    [],
  );

  const rubberMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#06090a" : "#334155",
        roughness: 0.9,
      }),
    [isDark],
  );

  const meshFilterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#121b20" : "#94a3b8",
        metalness: 0.6,
        roughness: 0.5,
        wireframe: true,
      }),
    [isDark],
  );

  const standoffs = [
    [-1.55, 2.15],
    [0.65, 2.15],
    [-1.55, 0.55],
    [0.65, 0.55],
    [-1.55, -1.05],
    [0.65, -1.05],
  ];

  const frontPanelX = 2.05 + explodedProgress * 1.5;

  return (
    <group position={[0, 0, 0]}>
      {/* Top Roof Chassis Perimeter Frame with Radiator Exhaust Aperture */}
      <group position={[0, 3.48, 0]}>
        <mesh material={steelMat} castShadow>
          <boxGeometry args={[4.35, 0.16, 4.75]} />
        </mesh>
        {/* Top Radiator Ventilation Recess */}
        <mesh position={[0, 0.02, 0.4]}>
          <boxGeometry args={[3.7, 0.18, 1.3]} />
          <meshBasicMaterial color={isDark ? "#060a0c" : "#94a3b8"} />
        </mesh>
      </group>

      {/* Pillarless Chassis Vertical Corner Columns (Front-Left Corner has NO POST for seamless glass-on-glass join) */}
      {[
        [-2.15, 0.55, -2.35],
        [2.15, 0.55, -2.35],
        [-2.15, 0.55, 2.35],
      ].map(([x, y, z], idx) => (
        <mesh key={idx} position={[x, y, z]} material={steelMat} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 5.8, 16]} />
        </mesh>
      ))}

      {/* Motherboard Tray Plate with CPU Cooler Backplate Cutout */}
      <mesh
        position={[0, 0.55, -0.1]}
        material={trayMat}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[4.0, 4.8, 0.08]} />
      </mesh>

      {/* CPU Cooler Access Cutout in Tray (Exposing rear bracket access) */}
      <mesh position={[-0.45, 1.2, -0.09]}>
        <boxGeometry args={[1.3, 1.3, 0.12]} />
        <meshStandardMaterial
          color={isDark ? "#080c0e" : "#cbd5e1"}
          roughness={0.9}
        />
      </mesh>

      {/* Rubber Cable Pass-Through Grommets (Neatly flanking the motherboard) */}
      <mesh position={[0.88, 0.55, -0.07]} material={rubberMat}>
        <boxGeometry args={[0.16, 2.6, 0.09]} />
      </mesh>
      <mesh position={[-0.45, -1.35, -0.07]} material={rubberMat}>
        <boxGeometry args={[1.8, 0.2, 0.09]} />
      </mesh>
      <mesh position={[-0.45, 2.5, -0.07]} material={rubberMat}>
        <boxGeometry args={[1.6, 0.18, 0.09]} />
      </mesh>

      {/* Brass Standoff Pegs */}
      {standoffs.map(([x, y], idx) => (
        <mesh
          key={idx}
          position={[x, y, 0.02]}
          rotation={[Math.PI / 2, 0, 0]}
          material={brassMat}
        >
          <cylinderGeometry args={[0.045, 0.045, 0.16, 8]} />
        </mesh>
      ))}

      {/* PSU Basement Shroud with Side Showcase Window */}
      <group position={[0, -1.35, 0.4]}>
        {/* Top Shroud Deck */}
        <mesh material={trayMat} receiveShadow castShadow>
          <boxGeometry args={[4.0, 0.05, 1.9]} />
        </mesh>
        {/* Vertical Shroud Side Wall */}
        <mesh position={[0, -0.5, 0.95]} material={trayMat} castShadow>
          <boxGeometry args={[4.0, 1.0, 0.05]} />
        </mesh>
        {/* PSU Logo Showcase Window Cutout with Detailed Power Supply Nameplate */}
        <group position={[-0.85, -0.5, 0.97]}>
          <mesh>
            <boxGeometry args={[1.4, 0.55, 0.06]} />
            <meshBasicMaterial color={isDark ? "#060a0c" : "#94a3b8"} />
          </mesh>
          {/* Visible PSU Brand Plaque with Titanium Badge & Green Power LED */}
          <mesh position={[0, 0, 0.035]}>
            <boxGeometry args={[1.25, 0.4, 0.02]} />
            <meshStandardMaterial
              color={isDark ? "#10161a" : "#cbd5e1"}
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[-0.4, 0.08, 0.05]}>
            <boxGeometry args={[0.3, 0.06, 0.015]} />
            <meshStandardMaterial
              color="#00f090"
              emissive="#00f090"
              emissiveIntensity={isDark ? 0.9 : 0.5}
            />
          </mesh>
          <mesh position={[0.15, 0.08, 0.05]}>
            <boxGeometry args={[0.65, 0.05, 0.01]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0.48, -0.06, 0.05]}>
            <cylinderGeometry args={[0.02, 0.02, 0.01, 8]} />
            <meshBasicMaterial color="#00f090" />
          </mesh>
        </group>
      </group>

      {/* Rear PCIe Slot Expansion Covers & Thumbscrews */}
      <group position={[-2.05, -0.6, 0.35]}>
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
          <group key={idx} position={[0, -idx * 0.18, 0]}>
            <mesh material={steelMat} castShadow>
              <boxGeometry args={[0.1, 0.12, 1.1]} />
            </mesh>
            <mesh position={[0.06, 0, -0.52]} material={steelMat}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 12]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Dedicated Internal Side-Intake Fan Column (Flush with tray, ZERO overlap with motherboard or GPU) */}
      <group position={[1.45, 0.55, 0.06]}>
        {/* Recessed Structural Steel Fan Mounting Bracket */}
        <mesh position={[0, 0, -0.09]} material={trayMat} castShadow>
          <boxGeometry args={[1.05, 4.3, 0.06]} />
        </mesh>
        {/* 3x 120mm Addressable RGB Intake Fans with Pure Green Illumination (Cleanly separated) */}
        {[1.25, 0.0, -1.25].map((fy, idx) => (
          <group key={`side-fan-${idx}`} position={[0, fy, 0]}>
            <RealisticFan
              radius={0.42}
              depth={0.10}
              bladeCount={9}
              hasRgbRing={true}
              rgbColor="#00f090"
              spinDirection={1}
              bladePitch={0.38}
              isDark={isDark}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
            />
            {/* Precision Corner Hex Screws on Mounting Tabs */}
            {[
              [-0.34, 0.34],
              [0.34, 0.34],
              [-0.34, -0.34],
              [0.34, -0.34],
            ].map(([sx, sy], sidx) => (
              <mesh key={`screw-${sidx}`} position={[sx, sy, 0.055]}>
                <cylinderGeometry args={[0.016, 0.016, 0.015, 6]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Front Tempered Glass Panel Assembly (Moves out forward in exploded view) */}
      <group position={[frontPanelX, 0.55, 0.0]}>
        {/* Crystal Clear Front Tempered Glass Pane */}
        <mesh receiveShadow>
          <boxGeometry args={[0.035, 5.7, 4.7]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.24}
            roughness={0.04}
            metalness={0.15}
            ior={1.52}
            color={isDark ? "#94a3b8" : "#f1f5f9"}
            envMapIntensity={1.5}
          />
        </mesh>

        {/* Silkscreen Ceramic Frit Borders (Top & Bottom only) */}
        {[
          [0.019, 2.76, 0, 0.04, 0.16, 4.7],
          [0.019, -2.76, 0, 0.04, 0.16, 4.7],
        ].map(([px, py, pz, sx, sy, sz], idx) => (
          <mesh key={idx} position={[px, py, pz]}>
            <boxGeometry args={[sx, sy, sz]} />
            <meshBasicMaterial color="#080c0e" />
          </mesh>
        ))}

        {/* Front Glass Corner Brand Badge (OCT-CNC / CircuitSupply - matching reference photo) */}
        <group position={[0.022, -2.55, 1.95]}>
          <mesh>
            <planeGeometry args={[0.34, 0.14]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive="#ffffff"
              emissiveIntensity={isDark ? 0.45 : 0.2}
              roughness={0.2}
            />
          </mesh>
        </group>

        {/* Front I/O Cluster on Top Right Edge */}
        <group position={[0, 2.65, 0.5]}>
          {/* Power Button with Halo LED */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
            <meshStandardMaterial
              color="#00f090"
              emissive="#00f090"
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Dual USB 3.0 Type-A (Electric Blue) */}
          <mesh position={[0, 0, -0.22]}>
            <boxGeometry args={[0.04, 0.045, 0.1]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>
          <mesh position={[0, 0, -0.4]}>
            <boxGeometry args={[0.04, 0.045, 0.1]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>
          {/* USB-C 3.2 Gen 2x2 Port */}
          <mesh position={[0, 0, -0.55]}>
            <boxGeometry args={[0.04, 0.035, 0.08]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} />
          </mesh>
          {/* 3.5mm Combo Audio Jack */}
          <mesh position={[0, 0, -0.7]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.05, 12]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Beveled Bottom Skirt / Pedestal Frame */}
      <mesh position={[0, -2.4, 0.0]} material={trayMat} castShadow>
        <boxGeometry args={[4.45, 0.22, 4.8]} />
      </mesh>

      {/* Front Skirt Minimalist Brand Medallion (OCT-CNC / Reference Style) */}
      <group position={[1.8, -2.32, 2.41]}>
        <mesh>
          <boxGeometry args={[0.34, 0.12, 0.02]} />
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.2}
            metalness={0.8}
            emissive="#ffffff"
            emissiveIntensity={isDark ? 0.35 : 0.15}
          />
        </mesh>
      </group>

      {/* 4x Architectural Angled Geometric Pedestal Feet (Matching Reference Photo) */}
      {[
        [-1.95, -2.48, -1.9],
        [1.95, -2.48, -1.9],
        [-1.95, -2.48, 2.1],
        [1.95, -2.48, 2.1],
      ].map(([fx, fy, fz], idx) => (
        <group key={idx} position={[fx, fy, fz]}>
          {/* Angled Bracket Body */}
          <mesh material={steelMat} castShadow>
            <boxGeometry args={[0.34, 0.16, 0.44]} />
          </mesh>
          {/* Chamfered Accent Trim */}
          <mesh position={[0, -0.04, 0]} material={steelMat}>
            <boxGeometry args={[0.38, 0.08, 0.48]} />
          </mesh>
          {/* High-Grip Rubber Sole Pad */}
          <mesh position={[0, -0.1, 0]} material={rubberMat}>
            <boxGeometry args={[0.32, 0.04, 0.42]} />
          </mesh>
        </group>
      ))}

      {/* Tempered Glass Side Guard Panel with Silk-Screen Ceramic Frit Border */}
      <group position={[0, 0.55, 2.45 + explodedProgress * 2.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[4.3, 5.7, 0.035]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.25}
            roughness={0.04}
            metalness={0.12}
            ior={1.52}
            color={isDark ? "#94a3b8" : "#f1f5f9"}
            envMapIntensity={1.4}
          />
        </mesh>

        {/* Frit Border (Top, Bottom, and Rear Mounting Edge only) */}
        {[
          [0, 2.76, 4.3, 0.16],
          [0, -2.76, 4.3, 0.16],
          [-2.08, 0, 0.16, 5.7],
        ].map(([bx, by, bw, bh], idx) => (
          <mesh key={idx} position={[bx, by, 0.019]}>
            <planeGeometry args={[bw, bh]} />
            <meshBasicMaterial color="#080c0e" />
          </mesh>
        ))}

        {/* Polished Glass Fastener Screws on Rear Mounting Edge */}
        {[
          [-1.95, 2.65],
          [-1.95, -2.65],
        ].map(([gx, gy], i) => (
          <mesh
            key={i}
            position={[gx, gy, 0.025]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.065, 0.065, 0.045, 16]} />
            <meshStandardMaterial
              metalness={0.92}
              roughness={0.15}
              color="#cbd5e1"
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// =========================================================================
// REALISTIC MOTHERBOARD (ATX WITH HEAVY VRM FIN ARRAYS, M.2 ARMOR & ILM SOCKET)
// =========================================================================

function MotherboardComponent({
  part,
  isDark,
  explodedProgress,
}: {
  part?: PartItem | null;
  isDark: boolean;
  explodedProgress: number;
}) {
  const pcbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#090e11" : "#1e293b",
        metalness: 0.15,
        roughness: 0.85,
      }),
    [isDark],
  );

  const vrmMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#1b252b" : "#334155",
        metalness: 0.88,
        roughness: 0.22,
      }),
    [isDark],
  );

  const copperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c87d46",
        metalness: 0.95,
        roughness: 0.2,
      }),
    [],
  );

  const steelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#94a3b8",
        metalness: 0.92,
        roughness: 0.15,
      }),
    [],
  );

  const capMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        metalness: 0.9,
        roughness: 0.2,
      }),
    [],
  );

  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd700",
        metalness: 0.95,
        roughness: 0.15,
      }),
    [],
  );

  return (
    <group position={[-0.45, 0.55, 0]}>
      {/* 8-Layer ATX PCB Board */}
      <mesh position={[0, 0, 0.08]} material={pcbMat} castShadow receiveShadow>
        <boxGeometry args={[2.5, 3.4, 0.06]} />
      </mesh>

      {/* Isolated Audio Circuit Path (Green Illuminated Trace Line) */}
      <mesh position={[-1.05, -0.6, 0.11]}>
        <boxGeometry args={[0.03, 1.8, 0.005]} />
        <meshBasicMaterial color="#00f090" />
      </mesh>

      {/* Top Multi-Fin VRM Heatsink Stack */}
      <group position={[-0.05, 1.45, 0.26]}>
        <mesh material={vrmMat} castShadow>
          <boxGeometry args={[1.5, 0.42, 0.36]} />
        </mesh>
        {/* CNC Milled Thermal Grooves */}
        {[-0.55, -0.28, 0, 0.28, 0.55].map((gx, idx) => (
          <mesh key={idx} position={[gx, 0, 0.19]}>
            <boxGeometry args={[0.04, 0.4, 0.03]} />
            <meshStandardMaterial color="#090d0f" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Left VRM Armor Block & Rear I/O Shield Cover */}
      <group position={[-0.92, 0.65, 0.28]}>
        <mesh material={vrmMat} castShadow>
          <boxGeometry args={[0.45, 1.5, 0.38]} />
        </mesh>
        {/* Integrated RGB Acrylic Accent Strip (Vibrant Cyber Green) */}
        <mesh position={[0.2, 0, 0.16]}>
          <boxGeometry args={[0.04, 1.3, 0.06]} />
          <meshStandardMaterial
            color="#00f090"
            emissive="#00f090"
            emissiveIntensity={isDark ? 1.4 : 0.8}
          />
        </mesh>
      </group>

      {/* VRM Digital Alloy Power Chokes (Ferrite Inductor Cubes) */}
      {[-0.75, -0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45].map((cx, idx) => (
        <mesh key={`top-choke-${idx}`} position={[cx, 1.18, 0.14]}>
          <boxGeometry args={[0.11, 0.11, 0.1]} />
          <meshStandardMaterial color="#1b252b" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {[0.15, 0.32, 0.49, 0.66, 0.83, 1.0].map((cy, idx) => (
        <mesh key={`side-choke-${idx}`} position={[-0.65, cy, 0.14]}>
          <boxGeometry args={[0.11, 0.11, 0.1]} />
          <meshStandardMaterial color="#1b252b" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Nickel-Plated Copper Heatpipe Connecting VRM Blocks */}
      <mesh
        position={[-0.72, 1.32, 0.38]}
        rotation={[0, 0, Math.PI / 4]}
        material={copperMat}
      >
        <cylinderGeometry args={[0.035, 0.035, 0.55, 16]} />
      </mesh>

      {/* Solid Polymer Capacitor Array (Power Stage Filtering) */}
      {[-0.7, -0.52, -0.35, -0.18, 0, 0.18, 0.35].map((cx, idx) => (
        <group key={idx} position={[cx, 1.05, 0.14]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={capMat}>
            <cylinderGeometry args={[0.035, 0.035, 0.1, 12]} />
          </mesh>
          <mesh position={[0, 0.04, 0.015]}>
            <boxGeometry args={[0.025, 0.015, 0.025]} />
            <meshBasicMaterial color="#00f090" />
          </mesh>
        </group>
      ))}

      {/* Rear I/O Armor Shield with Realistic Connector Ports */}
      <group position={[-1.15, 0.55, 0.32]}>
        <mesh material={vrmMat} castShadow>
          <boxGeometry args={[0.26, 2.3, 0.5]} />
        </mesh>
        {/* WiFi 6E Dual Gold SMA Antenna Posts */}
        <mesh
          position={[-0.1, 0.85, 0.12]}
          rotation={[0, 0, Math.PI / 2]}
          material={goldMat}
        >
          <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
        </mesh>
        <mesh
          position={[-0.1, 0.72, 0.12]}
          rotation={[0, 0, Math.PI / 2]}
          material={goldMat}
        >
          <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
        </mesh>
        {/* 2.5G LAN & USB Ports */}
        <mesh position={[-0.1, 0.35, 0.1]}>
          <boxGeometry args={[0.06, 0.18, 0.2]} />
          <meshStandardMaterial color="#070b0d" />
        </mesh>
        <mesh position={[-0.1, -0.1, 0.1]}>
          <boxGeometry args={[0.06, 0.16, 0.2]} />
          <meshStandardMaterial color="#00f090" />
        </mesh>
        {/* Gold-Plated Audio Jacks */}
        {[-0.6, -0.72, -0.84].map((ay, idx) => (
          <mesh
            key={idx}
            position={[-0.1, ay, 0.1]}
            rotation={[0, 0, Math.PI / 2]}
            material={goldMat}
          >
            <cylinderGeometry args={[0.028, 0.028, 0.06, 12]} />
          </mesh>
        ))}
      </group>

      {/* Dual 8-Pin EPS CPU Power Connectors at Top Left */}
      <group position={[-0.85, 1.62, 0.2]}>
        <mesh>
          <boxGeometry args={[0.38, 0.14, 0.18]} />
          <meshStandardMaterial color="#080c0e" roughness={0.7} />
        </mesh>
      </group>

      {/* 2-Digit 7-Segment Debug LED Diagnostic Display (A0 / Ready - Cyber Green) */}
      <group position={[1.05, 1.55, 0.16]}>
        <mesh>
          <boxGeometry args={[0.18, 0.12, 0.04]} />
          <meshStandardMaterial color="#06090a" />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[0.14, 0.08]} />
          <meshStandardMaterial
            color="#00f090"
            emissive="#00f090"
            emissiveIntensity={isDark ? 1.6 : 1.1}
          />
        </mesh>
      </group>

      {/* Tactile On-Board Micro-Buttons */}
      {[1.15, 1.32].map((by, bidx) => (
        <group key={`btn-${bidx}`} position={[1.05, by, 0.14]}>
          <mesh>
            <boxGeometry args={[0.08, 0.08, 0.04]} />
            <meshStandardMaterial color="#1a242b" />
          </mesh>
          <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 10]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* CPU Socket ILM (Independent Loading Mechanism) */}
      <group position={[0, 0.65, 0.13]}>
        {/* Outer Metal Retention Frame */}
        <mesh material={steelMat}>
          <boxGeometry args={[0.88, 0.88, 0.07]} />
        </mesh>
        {/* Gold Pin Contact Array */}
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[0.72, 0.72, 0.02]} />
          <meshStandardMaterial color="#ffd700" metalness={0.95} />
        </mesh>
        {/* Chrome Retention Arm (Swings open in exploded view) */}
        <mesh
          position={[0.42, 0, 0.06]}
          rotation={[0, 0, explodedProgress * 0.45]}
          material={steelMat}
        >
          <cylinderGeometry args={[0.02, 0.02, 0.86, 10]} />
        </mesh>
      </group>

      {/* Primary PCIe 5.0 x16 SafeSlot (Steel Reinforced Shielding) */}
      <group position={[0, -0.8, 0.17]}>
        <mesh material={steelMat}>
          <boxGeometry args={[2.0, 0.11, 0.16]} />
        </mesh>
        {/* Slot Aperture & Contact Pins */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[1.85, 0.04, 0.08]} />
          <meshStandardMaterial color="#06090a" />
        </mesh>
        {/* Translucent Retention Latch */}
        <mesh position={[0.95, 0, 0.04]}>
          <boxGeometry args={[0.1, 0.12, 0.14]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.8}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* ASUS Q-Release PCIe Slot Button */}
      <group position={[0.85, -0.45, 0.16]}>
        <mesh>
          <boxGeometry args={[0.12, 0.08, 0.06]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Secondary PCIe x16 Slot */}
      <mesh position={[0, -1.4, 0.14]} material={steelMat}>
        <boxGeometry args={[2.0, 0.09, 0.13]} />
      </mesh>

      {/* 2x M.2 Aluminum Thermal Armor Heatsink Plates */}
      <group position={[0, -0.4, 0.16]}>
        <mesh material={vrmMat} castShadow>
          <boxGeometry args={[1.3, 0.28, 0.08]} />
        </mesh>
        <mesh position={[-0.58, 0, 0.045]} material={steelMat}>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
        </mesh>
        {/* Precision Laser-Etched Texturing */}
        <mesh position={[0.15, 0, 0.042]}>
          <boxGeometry args={[0.75, 0.18, 0.005]} />
          <meshStandardMaterial color="#0b1114" roughness={0.6} />
        </mesh>
      </group>
      <group position={[0, -1.1, 0.16]}>
        <mesh material={vrmMat} castShadow>
          <boxGeometry args={[1.3, 0.26, 0.08]} />
        </mesh>
      </group>

      {/* Geometric Chipset Heatsink with Pure Cyber Green Falcon Emblem */}
      <group position={[0.7, -0.95, 0.19]}>
        <mesh material={vrmMat} castShadow>
          <boxGeometry args={[0.82, 0.82, 0.22]} />
        </mesh>
        {/* Recessed Heatsink Armor Facet */}
        <mesh position={[0, 0, 0.115]}>
          <boxGeometry args={[0.68, 0.68, 0.02]} />
          <meshStandardMaterial
            color="#080c0e"
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>
        {/* Glowing Pure Green Falcon Wings Crest */}
        <group position={[0, 0, 0.13]}>
          <mesh position={[-0.1, 0.1, 0]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.3, 0.06, 0.015]} />
            <meshStandardMaterial
              color="#00f090"
              emissive="#00f090"
              emissiveIntensity={isDark ? 2.0 : 1.3}
            />
          </mesh>
          <mesh position={[0.08, 0.15, 0]} rotation={[0, 0, -0.42]}>
            <boxGeometry args={[0.36, 0.06, 0.015]} />
            <meshStandardMaterial
              color="#00f090"
              emissive="#00f090"
              emissiveIntensity={isDark ? 2.0 : 1.3}
            />
          </mesh>
          <mesh position={[0.02, -0.07, 0]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.26, 0.06, 0.015]} />
            <meshStandardMaterial
              color="#00ff88"
              emissive="#00f090"
              emissiveIntensity={isDark ? 2.0 : 1.3}
            />
          </mesh>
        </group>
      </group>

      {/* 4x DDR5 DIMM Slots with Dual Retention Clips */}
      {[0, 1, 2, 3].map((i) => {
        const isPrimary = i === 1 || i === 3;
        return (
          <group key={i} position={[0.48 + i * 0.13, 0.65, 0.15]}>
            <mesh>
              <boxGeometry args={[0.065, 1.5, 0.12]} />
              <meshStandardMaterial
                color={
                  isPrimary
                    ? isDark
                      ? "#121b20"
                      : "#334155"
                    : isDark
                      ? "#090d0f"
                      : "#1e293b"
                }
                roughness={0.5}
              />
            </mesh>
            {/* Top and Bottom Ejection Latches */}
            <mesh position={[0, 0.73, 0.03]} material={steelMat}>
              <boxGeometry args={[0.07, 0.07, 0.09]} />
            </mesh>
            <mesh position={[0, -0.73, 0.03]} material={steelMat}>
              <boxGeometry args={[0.07, 0.07, 0.09]} />
            </mesh>
          </group>
        );
      })}

      {/* Stacked Right Edge SATA 6Gbps Ports */}
      <group position={[1.18, -0.5, 0.15]}>
        <mesh>
          <boxGeometry args={[0.1, 0.45, 0.16]} />
          <meshStandardMaterial color="#080c0e" roughness={0.7} />
        </mesh>
      </group>

      {/* 24-Pin ATX Main Power Connector Header (Flush on board edge, ZERO protruding cylinders) */}
      <group position={[1.15, 0.8, 0.18]}>
        <mesh>
          <boxGeometry args={[0.16, 0.85, 0.18]} />
          <meshStandardMaterial color="#080c0e" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// =========================================================================
// REALISTIC CPU (NICKEL COPPER IHS WITH AM5 OCTOPUS CUTOUTS & GOLD SUBSTRATE)
// =========================================================================

function CpuComponent({
  part,
  isDark,
  explodedProgress,
}: {
  part?: PartItem | null;
  isDark?: boolean;
  explodedProgress: number;
}) {
  const posX = -0.45;
  const posY = 1.2 + explodedProgress * 0.9;
  const posZ = 0.16 + explodedProgress * 1.5;

  const ihsMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        metalness: 0.94,
        roughness: 0.18,
      }),
    [],
  );

  const substrateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#16281e",
        metalness: 0.3,
        roughness: 0.7,
      }),
    [],
  );

  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd700",
        metalness: 0.95,
        roughness: 0.15,
      }),
    [],
  );

  return (
    <group position={[posX, posY, posZ]}>
      {/* High-Density Substrate PCB Wafer */}
      <mesh material={substrateMat} castShadow>
        <boxGeometry args={[0.76, 0.76, 0.04]} />
      </mesh>

      {/* Gold Pin 1 Triangle Alignment Key */}
      <mesh position={[-0.32, -0.32, 0.022]} material={goldMat}>
        <boxGeometry args={[0.06, 0.06, 0.005]} />
      </mesh>

      {/* Nickel-Plated Copper IHS with AM5 Wing Contours */}
      <group position={[0, 0, 0.045]}>
        {/* Main Central Contact Lid */}
        <mesh material={ihsMat} castShadow>
          <boxGeometry args={[0.62, 0.62, 0.07]} />
        </mesh>
        {/* Contoured Wing Protrusions */}
        {[-0.24, 0.24].map((wx, idx) => (
          <mesh key={idx} position={[wx, 0, -0.01]} material={ihsMat}>
            <boxGeometry args={[0.2, 0.72, 0.05]} />
          </mesh>
        ))}
        {[-0.24, 0.24].map((wy, idx) => (
          <mesh key={idx} position={[0, wy, -0.01]} material={ihsMat}>
            <boxGeometry args={[0.72, 0.2, 0.05]} />
          </mesh>
        ))}
        {/* Laser Engraving Brand Decal */}
        <mesh position={[0, 0.06, 0.036]}>
          <boxGeometry args={[0.42, 0.14, 0.002]} />
          <meshStandardMaterial
            color="#475569"
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
      </group>

      {/* Underside Gold Contact Array */}
      <mesh position={[0, 0, -0.022]} material={goldMat}>
        <boxGeometry args={[0.66, 0.66, 0.005]} />
      </mesh>
    </group>
  );
}

// =========================================================================
// REALISTIC AIO LIQUID COOLER (CIRCULAR LCD PUMP & 360MM FIN-MATRIX RADIATOR)
// =========================================================================

function CoolerComponent({
  part,
  isDark,
  explodedProgress,
}: {
  part?: PartItem | null;
  isDark: boolean;
  explodedProgress: number;
}) {
  const isAirCooler =
    part?.id === "cooler-nh-d15" ||
    Boolean(part?.specs?.Type?.toLowerCase().includes("air"));

  const radY = 3.25 + explodedProgress * 1.6;
  const radZ = 0.4 + explodedProgress * 0.5;
  const pumpY = 1.2 + explodedProgress * 1.8;
  const pumpZ = 0.435 + explodedProgress * 2.6;

  const pumpHousingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#11181c" : "#e2e8f0",
        metalness: isDark ? 0.85 : 0.6,
        roughness: 0.22,
      }),
    [isDark],
  );

  const copperPlateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d97706",
        metalness: 0.95,
        roughness: 0.15,
      }),
    [],
  );

  const radMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#131b20" : "#cbd5e1",
        metalness: isDark ? 0.85 : 0.55,
        roughness: 0.25,
      }),
    [isDark],
  );

  const finMatrixMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#0c1317" : "#94a3b8",
        roughness: 0.85,
        metalness: 0.4,
      }),
    [isDark],
  );

  const airFinMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#141c22" : "#334155",
        roughness: 0.35,
        metalness: 0.85,
      }),
    [isDark],
  );

  if (isAirCooler) {
    return (
      <group position={[-0.45, pumpY, pumpZ]}>
        {/* Solid Nickel-Plated Copper Cold Plate Base */}
        <mesh position={[0, 0, -0.19]} material={copperPlateMat}>
          <boxGeometry args={[0.68, 0.68, 0.04]} />
        </mesh>

        {/* 6x Sintered Copper Heatpipes Weaving Up */}
        {[-0.22, -0.12, 0, 0.12, 0.22].map((hx, idx) => (
          <mesh key={idx} position={[hx, 0, 0.05]} material={copperPlateMat}>
            <cylinderGeometry args={[0.024, 0.024, 0.85, 12]} />
          </mesh>
        ))}

        {/* Black Anodized Dual Fin Stack Tower (Matching Reference Image) */}
        <mesh position={[0, 0.1, 0.15]} material={airFinMat} castShadow>
          <boxGeometry args={[0.95, 1.25, 0.75]} />
        </mesh>

        {/* Massive 140mm Central Pure Green RGB Fan */}
        <group position={[0, 0.1, 0.58]}>
          <RealisticFan
            radius={0.52}
            depth={0.12}
            bladeCount={9}
            hasRgbRing={true}
            rgbColor="#00f090"
            spinDirection={1}
            bladePitch={0.4}
            isDark={isDark}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
          />
        </group>
      </group>
    );
  }

  return (
    <group>
      {/* 1. Dynamic Braided Coolant Tubes connecting Pump and Radiator */}
      <CoolantTubes
        pumpPos={[-0.45, pumpY, pumpZ]}
        radPos={[-0.25, radY, radZ]}
        isDark={isDark}
      />

      {/* 2. Pump Block Assembly directly suspended on trajectory */}
      <group position={[-0.45, pumpY, pumpZ]}>
        {/* CNC Milled Aluminum Cylindrical Housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={pumpHousingMat} castShadow>
          <cylinderGeometry args={[0.44, 0.44, 0.38, 32]} />
        </mesh>

        {/* Micro-Skived Solid Copper Cold Plate on Bottom */}
        <mesh position={[0, 0, -0.19]} material={copperPlateMat}>
          <boxGeometry args={[0.62, 0.62, 0.03]} />
        </mesh>

        {/* IPS Circular LCD Display Bezel */}
        <mesh position={[0, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.02, 32]} />
          <meshStandardMaterial color="#06090a" roughness={0.1} />
        </mesh>

        {/* LCD Real-Time Digital Temperature Readout Ring */}
        <mesh position={[0, 0, 0.205]}>
          <torusGeometry args={[0.32, 0.026, 16, 32]} />
          <meshStandardMaterial
            color="#00f090"
            emissive="#00f090"
            emissiveIntensity={isDark ? 1.0 : 0.65}
            roughness={0.1}
          />
        </mesh>

        {/* Center Digital Telemetry Core */}
        <mesh position={[0, 0, 0.202]}>
          <circleGeometry args={[0.26, 24]} />
          <meshBasicMaterial color="#0a1412" />
        </mesh>
      </group>

      {/* 3. 360mm Radiator Core with High-Density Fin Matrix */}
      <group position={[-0.25, radY, radZ]}>
        {/* Radiator Frame Box */}
        <mesh material={radMat} castShadow>
          <boxGeometry args={[3.2, 0.38, 1.2]} />
        </mesh>

        {/* Dense Cooling Fin Matrix Core */}
        <mesh position={[0, 0, 0]} material={finMatrixMat}>
          <boxGeometry args={[2.9, 0.34, 1.15]} />
        </mesh>

        {/* Inlet/Outlet End Tank Chambers */}
        <mesh position={[1.5, 0, 0]} material={radMat}>
          <boxGeometry args={[0.2, 0.38, 1.2]} />
        </mesh>
        <mesh position={[-1.5, 0, 0]} material={radMat}>
          <boxGeometry args={[0.2, 0.38, 1.2]} />
        </mesh>

        {/* 3x Radiator Fans with Pure Green Addressable RGB Lighting */}
        {[-0.9, 0, 0.9].map((fx, idx) => (
          <RealisticFan
            key={idx}
            radius={0.42}
            depth={0.11}
            bladeCount={9}
            hasRgbRing={true}
            rgbColor="#00f090"
            spinDirection={1}
            bladePitch={0.4}
            isDark={isDark}
            position={[fx, -0.23, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        ))}
      </group>
    </group>
  );
}

// =========================================================================
// REALISTIC GPU (COMPACT DIE-CAST EXOSKELETON, ZERO OVERLAP WITH FANS)
// =========================================================================

function GpuComponent({
  part,
  isDark,
  explodedProgress,
}: {
  part?: PartItem | null;
  isDark: boolean;
  explodedProgress: number;
}) {
  const posX = -0.725 + explodedProgress * 0.1;
  const posY = -0.32 - explodedProgress * 0.35;
  const posZ = 0.70 + explodedProgress * 2.2;

  const shroudMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#141c21" : "#e2e8f0",
        metalness: 0.88,
        roughness: 0.22,
      }),
    [isDark],
  );

  const finStackMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#283740" : "#94a3b8",
        metalness: 0.75,
        roughness: 0.35,
      }),
    [isDark],
  );

  const copperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c87d46",
        metalness: 0.95,
        roughness: 0.2,
      }),
    [],
  );

  const backplateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#0e1418" : "#cbd5e1",
        metalness: 0.92,
        roughness: 0.18,
      }),
    [isDark],
  );

  const bracketMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#94a3b8",
        metalness: 0.95,
        roughness: 0.12,
      }),
    [],
  );

  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd700",
        metalness: 0.95,
        roughness: 0.15,
      }),
    [],
  );

  return (
    <group position={[posX, posY, posZ]}>
      {/* 1. Main Die-Cast Aluminum Exoskeleton Shroud (Length 2.65, zero overlap with side fans) */}
      <mesh material={shroudMat} castShadow>
        <boxGeometry args={[2.65, 1.15, 0.54]} />
      </mesh>

      {/* 2. Exposed Internal Aluminum Fin Stack */}
      <mesh position={[0, -0.05, 0]} material={finStackMat}>
        <boxGeometry args={[2.52, 0.95, 0.46]} />
      </mesh>

      {/* 3. 4x Copper Heatpipes weaving through heatsink core */}
      {[-0.18, -0.06, 0.06, 0.18].map((hy, idx) => (
        <mesh
          key={idx}
          position={[0, hy, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={copperMat}
        >
          <cylinderGeometry args={[0.026, 0.026, 2.55, 12]} />
        </mesh>
      ))}

      {/* 4. Full-Length Brushed Titanium Backplate with Flow-Through Vent */}
      <group position={[0, 0, -0.29]}>
        <mesh material={backplateMat} castShadow>
          <boxGeometry args={[2.63, 1.11, 0.04]} />
        </mesh>
        {/* Flow-Through Cooling Aperture */}
        <mesh position={[0.75, 0, 0.025]}>
          <boxGeometry args={[0.7, 0.75, 0.02]} />
          <meshBasicMaterial color="#090d0f" />
        </mesh>
      </group>

      {/* 5. Edge Illuminated Pure Cyber Green Flush Diffuser */}
      <group position={[-0.2, 0.56, 0.2]}>
        {/* Recessed Housing Plate */}
        <mesh>
          <boxGeometry args={[1.4, 0.04, 0.08]} />
          <meshStandardMaterial color="#080c0e" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Flush Cyber Green Diffuser Lightbar */}
        <mesh position={[0, 0.021, 0]}>
          <boxGeometry args={[1.3, 0.005, 0.06]} />
          <meshStandardMaterial
            color="#00f090"
            emissive="#00f090"
            emissiveIntensity={isDark ? 1.6 : 0.9}
            roughness={0.15}
          />
        </mesh>
      </group>

      {/* 6. Recessed 16-Pin 12V-2x6 Power Connector (Flush on top edge, zero protruding blocks) */}
      <group position={[0.7, 0.56, 0]}>
        <mesh>
          <boxGeometry args={[0.28, 0.04, 0.14]} />
          <meshStandardMaterial color="#06090a" roughness={0.8} />
        </mesh>
      </group>

      {/* 7. Stainless Steel Dual-Slot PCIe Mounting Bracket (Attaches to rear chassis at -2.05) */}
      <group position={[-1.325, 0, 0.08]}>
        <mesh material={bracketMat} castShadow>
          <boxGeometry args={[0.08, 1.3, 0.44]} />
        </mesh>
        {/* DisplayPort & HDMI Port Cutouts */}
        {[-0.28, -0.09, 0.09, 0.28].map((py, idx) => (
          <mesh key={idx} position={[-0.05, py, 0]}>
            <boxGeometry args={[0.02, 0.08, 0.14]} />
            <meshStandardMaterial color="#060a0c" />
          </mesh>
        ))}
      </group>

      {/* 8. Vertical GPU Riser Mounting Base Stand on PSU Shroud Deck */}
      <group position={[-0.15, -0.68, -0.2]}>
        <mesh material={bracketMat}>
          <boxGeometry args={[1.5, 0.09, 0.16]} />
        </mesh>
        {/* PCIe SafeSlot on Riser Bracket */}
        <mesh position={[0, 0.035, 0]}>
          <boxGeometry args={[1.35, 0.035, 0.08]} />
          <meshStandardMaterial color="#0a0f12" />
        </mesh>
        {/* Fasteners */}
        {[-0.65, 0.65].map((tx, tidx) => (
          <mesh key={`ts-${tidx}`} position={[tx, 0.05, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.03, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* 9. Gold-Plated PCIe Contact Fingers */}
      <mesh position={[-0.25, -0.62, -0.2]} material={goldMat}>
        <boxGeometry args={[1.4, 0.12, 0.02]} />
      </mesh>

      {/* 10. Triple Axial-Tech Fans */}
      {[-0.75, 0.0, 0.75].map((fx, idx) => {
        const isCenter = idx === 1;
        return (
          <RealisticFan
            key={idx}
            radius={0.36}
            depth={0.07}
            bladeCount={11}
            hasRgbRing={false}
            spinDirection={isCenter ? -1 : 1}
            hubRadiusRatio={0.38}
            bladePitch={0.36}
            isDark={isDark}
            position={[fx, 0, 0.28]}
            rotation={[0, 0, 0]}
          />
        );
      })}
    </group>
  );
}

// =========================================================================
// REALISTIC RAM (DUAL DDR5 WITH FACETED HEATSPREADERS & FROSTED RGB LIGHTBAR)
// =========================================================================

function RamComponent({
  part,
  isDark,
  explodedProgress,
}: {
  part?: PartItem | null;
  isDark: boolean;
  explodedProgress: number;
}) {
  const heatspreaderMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#1c262c" : "#e2e8f0",
        metalness: 0.88,
        roughness: 0.2,
      }),
    [isDark],
  );

  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd700",
        metalness: 0.95,
        roughness: 0.15,
      }),
    [],
  );

  return (
    <group>
      {[
        { baseX: 0.16, xOffset: 0.15, yOffset: 1.5, zOffset: 1.2 },
        { baseX: 0.42, xOffset: 0.3, yOffset: 1.8, zOffset: 1.4 },
      ].map((cfg, idx) => {
        const x = cfg.baseX + explodedProgress * cfg.xOffset;
        const y = 1.2 + explodedProgress * cfg.yOffset;
        const z = 0.22 + explodedProgress * cfg.zOffset;

        return (
          <group key={idx} position={[x, y, z]}>
            {/* Forged Aluminum Dual-Tone Heatspreader */}
            <mesh material={heatspreaderMat} castShadow>
              <boxGeometry args={[0.045, 1.42, 0.46]} />
            </mesh>

            {/* Geometric Diamond Facet Ridge */}
            <mesh position={[0.025, 0, 0]} material={heatspreaderMat}>
              <boxGeometry args={[0.015, 1.2, 0.25]} />
            </mesh>

            {/* Top Frosted Crystalline RGB Lightbar */}
            <mesh position={[0, 0, 0.25]}>
              <boxGeometry args={[0.05, 1.4, 0.08]} />
              <meshStandardMaterial
                color="#00f090"
                emissive="#00f090"
                emissiveIntensity={isDark ? 0.95 : 0.65}
                roughness={0.15}
              />
            </mesh>

            {/* Gold Contact Pins with DDR5 Offset Notch */}
            <mesh position={[0, 0, -0.24]} material={goldMat}>
              <boxGeometry args={[0.02, 1.34, 0.05]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// =========================================================================
// REALISTIC M.2 NVME STORAGE (PCB, CONTROLLER, NAND & THERMAL BADGE)
// =========================================================================

function StorageComponent({
  part,
  isDark,
  explodedProgress,
}: {
  part?: PartItem | null;
  isDark?: boolean;
  explodedProgress: number;
}) {
  const posX = -0.45 + explodedProgress * 0.2;
  const posY = 0.18 + explodedProgress * 0.8;
  const posZ = 0.18 + explodedProgress * 1.2;

  return (
    <group position={[posX, posY, posZ]}>
      {/* 2280 Matte Black PCB */}
      <mesh castShadow>
        <boxGeometry args={[0.26, 0.92, 0.04]} />
        <meshStandardMaterial color="#0c1214" roughness={0.7} />
      </mesh>

      {/* Extruded Aluminum Finned Heatsink Armor */}
      <mesh position={[0, 0, 0.04]} castShadow>
        <boxGeometry args={[0.25, 0.84, 0.06]} />
        <meshStandardMaterial
          color="#223038"
          metalness={0.88}
          roughness={0.2}
        />
      </mesh>

      {/* PCIe Gen4/Gen5 Controller Chip */}
      <mesh position={[0, 0.25, 0.08]}>
        <boxGeometry args={[0.16, 0.16, 0.03]} />
        <meshStandardMaterial
          color="#dde5ea"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Gold-Plated M-Key Edge Connector */}
      <mesh position={[0, -0.44, 0]}>
        <boxGeometry args={[0.22, 0.06, 0.02]} />
        <meshStandardMaterial color="#ffd700" metalness={0.95} />
      </mesh>
    </group>
  );
}

// =========================================================================
// REALISTIC MODULAR POWER SUPPLY (TEXTURED ENCLOSURE, FAN GRILLE & CABLES)
// =========================================================================

function PsuComponent({
  part,
  isDark,
  explodedProgress,
}: {
  part?: PartItem | null;
  isDark: boolean;
  explodedProgress: number;
}) {
  const posX = -0.85 - explodedProgress * 1.2;
  const posY = -1.85;
  const posZ = 0.4 + explodedProgress * 1.0;

  const steelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#12181c" : "#cbd5e1",
        metalness: isDark ? 0.82 : 0.55,
        roughness: 0.35,
      }),
    [isDark],
  );

  const cableMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isDark ? "#090d0f" : "#334155",
        roughness: 0.85,
      }),
    [isDark],
  );

  return (
    <group position={[posX, posY, posZ]}>
      {/* Heavy Powder-Coated Steel Chassis */}
      <mesh material={steelMat} castShadow>
        <boxGeometry args={[1.8, 1.05, 1.6]} />
      </mesh>

      {/* 135mm Silent Intake Fan Grille Ring */}
      <mesh position={[0, 0, 0.81]}>
        <torusGeometry args={[0.48, 0.03, 16, 32]} />
        <meshStandardMaterial
          color="#00f090"
          emissive="#00f090"
          emissiveIntensity={isDark ? 0.6 : 0.3}
        />
      </mesh>

      {/* Center Polished Emblem */}
      <mesh position={[0, 0, 0.81]}>
        <cylinderGeometry args={[0.16, 0.16, 0.02, 24]} />
        <meshStandardMaterial
          color={isDark ? "#223038" : "#94a3b8"}
          metalness={0.92}
        />
      </mesh>

      {/* Rear AC Power Inlet Receptacle & Rocker Switch */}
      <group position={[-0.91, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.02, 0.35, 0.55]} />
          <meshStandardMaterial color="#070a0c" />
        </mesh>
        <mesh position={[-0.02, 0.1, 0]}>
          <boxGeometry args={[0.04, 0.12, 0.14]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>

      {/* Modular Connector Panel Interface */}
      <group position={[0.91, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.03, 0.75, 1.3]} />
          <meshStandardMaterial color="#090d0f" roughness={0.8} />
        </mesh>
        {/* Sleeved Cable Harness Bundles routing into Chassis Grommets */}
        {[
          [0.2, 0.15, -0.3],
          [0.35, 0.05, 0.1],
          [0.25, -0.15, 0.4],
        ].map(([cx, cy, cz], idx) => (
          <mesh
            key={idx}
            position={[cx, cy, cz]}
            rotation={[0, 0, Math.PI / 2]}
            material={cableMat}
          >
            <cylinderGeometry args={[0.065, 0.065, 0.6, 12]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// =========================================================================
// 3D CLICKABLE FOCUS HOTSPOT BEACONS (100% WEBGL NATIVE)
// =========================================================================

interface HotspotBeaconProps {
  position: [number, number, number];
  category:
    "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu";
  label: string;
  isActive: boolean;
  isDark: boolean;
  onSelect: (
    cat: "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu",
  ) => void;
}

function HotspotBeacon({
  position,
  category,
  isActive,
  isDark,
  onSelect,
}: HotspotBeaconProps) {
  const [hovered, setHovered] = useState(false);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.getElapsedTime() * 3.0;
      const s = 1.0 + Math.sin(t) * 0.12;
      ringRef.current.scale.set(s, s, s);
    }
  });

  const color = isActive
    ? "#00f090"
    : hovered
      ? "#00ff88"
      : isDark
        ? "#10b981"
        : "#059669";

  return (
    <group position={position}>
      {/* Outer Animated Beacon Ring */}
      <mesh
        ref={ringRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(category);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          setHovered(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          setHovered(false);
        }}
      >
        <ringGeometry args={[0.08, 0.11, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered || isActive ? 0.95 : 0.75}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Core Glowing Node */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(category);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          setHovered(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          setHovered(false);
        }}
      >
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

interface HotspotsProps {
  onSelectCategory: (
    cat: "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu",
  ) => void;
  activeCategory: string;
  isDark: boolean;
  explodedProgress: number;
}

function Hotspots({
  onSelectCategory,
  activeCategory,
  isDark,
  explodedProgress,
}: HotspotsProps) {
  const hotspotsData: Array<{
    category:
      "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu";
    label: string;
    position: [number, number, number];
  }> = [
    {
      category: "cpu",
      label: "CPU",
      position: [
        -0.45,
        1.2 + explodedProgress * 0.9,
        0.16 + explodedProgress * 1.5 + 0.28,
      ],
    },
    {
      category: "motherboard",
      label: "Board",
      position: [-0.9, 1.3, 0.45],
    },
    {
      category: "gpu",
      label: "GPU",
      position: [
        -0.725 + explodedProgress * 0.1,
        -0.32 - explodedProgress * 0.35,
        0.70 + explodedProgress * 2.2 + 0.35,
      ],
    },
    {
      category: "cooler",
      label: "Cooler",
      position: [
        -0.25,
        3.25 + explodedProgress * 1.6 + 0.35,
        0.4 + explodedProgress * 0.5 + 0.3,
      ],
    },
    {
      category: "ram",
      label: "RAM",
      position: [
        0.29 + explodedProgress * 0.22,
        1.2 + explodedProgress * 1.65,
        0.22 + explodedProgress * 1.3 + 0.3,
      ],
    },
    {
      category: "storage",
      label: "Storage",
      position: [
        -0.45 + explodedProgress * 0.2,
        0.18 + explodedProgress * 0.8,
        0.18 + explodedProgress * 1.2 + 0.25,
      ],
    },
    {
      category: "psu",
      label: "PSU",
      position: [
        -0.85 - explodedProgress * 1.2,
        -1.85,
        0.4 + explodedProgress * 1.0 + 0.45,
      ],
    },
  ];

  return (
    <group>
      {hotspotsData.map(({ category, label, position }) => (
        <HotspotBeacon
          key={category}
          category={category}
          label={label}
          position={position}
          isActive={activeCategory === category}
          isDark={isDark}
          onSelect={onSelectCategory}
        />
      ))}
    </group>
  );
}

// =========================================================================
// 3D SCENE STAGE (CANVAS WRAPPER)
// =========================================================================

interface SceneStageProps {
  isDark: boolean;
  selectedParts: SelectedParts;
  cameraControlsRef: React.RefObject<CameraControls | null>;
  explodedProgress: number;
  autoRotate: boolean;
  activeCategory: string;
  onSelectCategory: (
    cat: "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu",
  ) => void;
}

function SceneStage({
  isDark,
  selectedParts,
  cameraControlsRef,
  explodedProgress,
  autoRotate,
  activeCategory,
  onSelectCategory,
}: SceneStageProps) {
  // Smooth turntable auto-rotate
  useFrame((_, delta) => {
    if (autoRotate && cameraControlsRef.current) {
      cameraControlsRef.current.rotate(delta * 0.35, 0, false);
    }
  });

  return (
    <>
      {/* Studio Atmosphere Color */}
      <color attach="background" args={[isDark ? "#06090b" : "#f1f4f8"]} />
      <fog attach="fog" args={[isDark ? "#06090b" : "#f1f4f8", 9, 28]} />

      {/* 1. Three-Point Studio Lighting Rig */}
      <ambientLight
        color={isDark ? "#18242b" : "#ffffff"}
        intensity={isDark ? 0.8 : 1.2}
      />
      {/* Key Light: High directional soft light */}
      <directionalLight
        position={[6, 9, 6]}
        intensity={isDark ? 3.5 : 3.0}
        color={isDark ? "#f5f8ff" : "#ffffff"}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0001}
      />
      {/* Rim Light: Clean emerald / mint backlight for sharp hardware silhouette */}
      <directionalLight
        position={[-6, 4, -5]}
        intensity={isDark ? 2.5 : 1.8}
        color={isDark ? "#00f090" : "#10b981"}
      />
      {/* Fill Light: Soft green accent fill */}
      <pointLight
        position={[1.5, -0.2, 3]}
        intensity={isDark ? 2.0 : 1.5}
        color={isDark ? "#00f090" : "#f8fafc"}
        distance={10}
      />

      {/* 2. HDR Environment Map with Procedural Studio Lightformers (Zero remote fetch latency) */}
      <Environment resolution={128}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer
            form="rect"
            intensity={3}
            position={[0, 6, -8]}
            scale={[12, 6, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={2}
            position={[-6, 3, 0]}
            scale={[10, 3, 1]}
            rotation-y={Math.PI / 2}
            color={isDark ? "#00f090" : "#10b981"}
          />
          <Lightformer
            form="rect"
            intensity={1.5}
            position={[6, 3, 0]}
            scale={[10, 3, 1]}
            rotation-y={-Math.PI / 2}
          />
        </group>
      </Environment>

      {/* 3. Subtle Ground Contact Shadows (Rendered once with frames=1 to avoid multi-pass render stall) */}
      <ContactShadows
        position={[0, -2.48, 0]}
        opacity={isDark ? 0.65 : 0.35}
        scale={22}
        blur={2.0}
        far={5}
        frames={1}
      />

      {/* Studio Floor Grid */}
      <gridHelper
        args={[
          20,
          40,
          isDark ? 0x1f2e37 : 0xcbd5e1,
          isDark ? 0x0f171d : 0xe2e8f0,
        ]}
        position={[0, -2.49, 0]}
      />

      {/* 4. Open-Air Hardware Assembly Meshes */}
      <OpenChassis isDark={isDark} explodedProgress={explodedProgress} />

      {selectedParts.motherboard && (
        <MotherboardComponent
          part={selectedParts.motherboard}
          isDark={isDark}
          explodedProgress={explodedProgress}
        />
      )}

      {selectedParts.cpu && (
        <CpuComponent
          part={selectedParts.cpu}
          isDark={isDark}
          explodedProgress={explodedProgress}
        />
      )}

      {selectedParts.cooler && (
        <CoolerComponent
          part={selectedParts.cooler}
          isDark={isDark}
          explodedProgress={explodedProgress}
        />
      )}

      {selectedParts.gpu && (
        <GpuComponent
          part={selectedParts.gpu}
          isDark={isDark}
          explodedProgress={explodedProgress}
        />
      )}

      {selectedParts.ram && (
        <RamComponent
          part={selectedParts.ram}
          isDark={isDark}
          explodedProgress={explodedProgress}
        />
      )}

      {selectedParts.storage && (
        <StorageComponent
          part={selectedParts.storage}
          isDark={isDark}
          explodedProgress={explodedProgress}
        />
      )}

      {selectedParts.psu && (
        <PsuComponent
          part={selectedParts.psu}
          isDark={isDark}
          explodedProgress={explodedProgress}
        />
      )}

      {/* CAD Leader Lines for Exploded View */}
      <ExplodedLeaderLines
        explodedProgress={explodedProgress}
        isDark={isDark}
      />

      {/* 5. Clickable 3D Focus Hotspots */}
      <Hotspots
        onSelectCategory={onSelectCategory}
        activeCategory={activeCategory}
        isDark={isDark}
        explodedProgress={explodedProgress}
      />

      {/* 6. Drei CameraControls for Smooth Fly-to and Pan/Zoom */}
      <CameraControls
        ref={cameraControlsRef}
        makeDefault
        minDistance={2.2}
        maxDistance={15}
        dampingFactor={0.05}
      />
    </>
  );
}

// =========================================================================
// MAIN PAGE COMPONENT
// =========================================================================

export function PCBuilderPage() {
  const { add, notify, cart, theme } = useStore();
  const isDark = theme === "dark";

  // Drei CameraControls ref
  const cameraControlsRef = useRef<CameraControls | null>(null);

  // Builder Parts State
  const [selectedParts, setSelectedParts] = useState<SelectedParts>({
    cpu: HARDWARE_CATALOG[0],
    motherboard: HARDWARE_CATALOG[4],
    gpu: HARDWARE_CATALOG[8],
    cooler: HARDWARE_CATALOG[12],
    ram: HARDWARE_CATALOG[15],
    storage: HARDWARE_CATALOG[18],
    psu: HARDWARE_CATALOG[20],
  });

  const [activeTab, setActiveTab] = useState<
    "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu"
  >("cpu");

  const [cameraPreset, setCameraPreset] = useState<string>("full");
  const [autoRotate, setAutoRotate] = useState(false);
  const [addedAll, setAddedAll] = useState(false);

  // Staggered Exploded Isometric Layout State
  const [isExploded, setIsExploded] = useState(false);
  const [explodedVal, setExplodedVal] = useState(0);
  const explodedProgressRef = useRef({ val: 0 });

  // Magnetic button ref
  const magneticButtonRef = useRef<HTMLButtonElement>(null);

  // Computed totals & telemetry
  const partsArray = Object.values(selectedParts).filter(Boolean) as PartItem[];
  const totalPrice = partsArray.reduce((acc, p) => acc + p.price, 0);
  const totalTDP = partsArray.reduce((acc, p) => acc + p.tdp, 0);
  const selectedPSU = selectedParts.psu;
  const psuWattage = selectedPSU?.wattage || 850;
  const powerHeadroom = psuWattage - totalTDP;
  const powerWarning = powerHeadroom < 0;

  // Socket validation
  const socketMismatch =
    selectedParts.cpu &&
    selectedParts.motherboard &&
    selectedParts.cpu.socket !== selectedParts.motherboard.socket;

  // =========================================================================
  // CAMERA PRESETS DISPATCHER (DREI CAMERACONTROLS FLY-TO)
  // =========================================================================
  const switchCameraPreset = (
    preset: "full" | "motherboard" | "gpu" | "cooler" | "ram" | "exploded",
  ) => {
    setCameraPreset(preset);
    const controls = cameraControlsRef.current;
    if (!controls) return;

    if (preset === "full") {
      controls.setLookAt(5.8, 3.6, 7.2, 0, 0.55, 0, true);
    } else if (preset === "motherboard") {
      controls.setLookAt(0.8, 1.6, 4.0, -0.45, 0.95, 0.2, true);
    } else if (preset === "gpu") {
      controls.setLookAt(2.2, 0.2, 4.8, -0.725, -0.32, 0.70, true);
    } else if (preset === "cooler") {
      controls.setLookAt(0.3, 4.8, 4.4, -0.25, 2.4, 0.3, true);
    } else if (preset === "ram") {
      controls.setLookAt(1.6, 2.2, 3.4, 0.29, 1.35, 0.4, true);
    } else if (preset === "exploded") {
      controls.setLookAt(7.8, 4.8, 8.8, 0, 0.7, 0.4, true);
    }
  };

  // Toggle Staggered Exploded Isometric Showcase
  const toggleExploded = () => {
    const nextTarget = isExploded ? 0 : 1;
    setIsExploded(!isExploded);

    gsap.to(explodedProgressRef.current, {
      val: nextTarget,
      duration: 0.85,
      ease: "power2.out",
      onUpdate: () => setExplodedVal(explodedProgressRef.current.val),
    });

    if (!isExploded) {
      switchCameraPreset("exploded");
    } else {
      switchCameraPreset("full");
    }
  };

  // Handle slider scrub for exploded clearance
  const handleExplosionSlider = (val: number) => {
    explodedProgressRef.current.val = val;
    setExplodedVal(val);
    if (val > 0.05 && !isExploded) {
      setIsExploded(true);
    } else if (val <= 0.05 && isExploded) {
      setIsExploded(false);
    }
  };

  // Focus Category from 3D Hotspot click
  const handleHotspotSelect = (
    cat: "cpu" | "motherboard" | "gpu" | "cooler" | "ram" | "storage" | "psu",
  ) => {
    setActiveTab(cat);
    const controls = cameraControlsRef.current;
    if (!controls) return;

    if (cat === "cpu") {
      controls.setLookAt(0.2, 1.8, 3.0, -0.45, 1.25, 0.3, true);
    } else if (cat === "gpu") {
      controls.setLookAt(2.2, 0.2, 4.8, -0.725, -0.32, 0.70, true);
    } else if (cat === "motherboard") {
      controls.setLookAt(0.8, 1.6, 4.0, -0.45, 0.95, 0.2, true);
    } else if (cat === "cooler") {
      controls.setLookAt(0.3, 4.8, 4.4, -0.25, 2.4, 0.3, true);
    } else if (cat === "ram") {
      controls.setLookAt(1.6, 2.2, 3.4, 0.29, 1.35, 0.4, true);
    } else if (cat === "storage") {
      controls.setLookAt(0.6, 0.8, 2.8, -0.45, 0.35, 0.2, true);
    } else if (cat === "psu") {
      controls.setLookAt(-2.6, -1.2, 3.4, -0.85, -1.85, 0.5, true);
    }
  };

  // Turntable Toggle
  const toggleAutoRotate = () => {
    setAutoRotate(!autoRotate);
  };

  // =========================================================================
  // MAGNETIC BUTTON PHYSICS WITH GSAP
  // =========================================================================
  useEffect(() => {
    const btn = magneticButtonRef.current;
    if (!btn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);

      if (dist < 100) {
        const pull = 0.35;
        const deltaX = (e.clientX - btnCenterX) * pull;
        const deltaY = (e.clientY - btnCenterY) * pull;
        gsap.to(btn, {
          x: deltaX,
          y: deltaY,
          duration: 0.25,
          ease: "power2.out",
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.65,
        ease: "elastic.out(1.1, 0.4)",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    btn.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      btn.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Add Entire Assembly to Global Store Cart Context
  const handleAddBuildToCart = () => {
    partsArray.forEach((part) => {
      add({
        id: part.id,
        sku: part.sku,
        slug: part.id,
        name: part.name,
        brand: part.brand,
        category: part.category,
        price: part.price.toFixed(2),
        currency: "THB",
        quantity: 1,
        active: true,
        specifications: part.specs,
        description: `${part.name} added via 3D PC Studio Builder.`,
        images: [],
      });
    });

    setAddedAll(true);
    notify(`${partsArray.length} components added to your cart.`);
    setTimeout(() => setAddedAll(false), 2500);
  };

  // =========================================================================
  // RENDER INTERACTIVE STUDIO
  // =========================================================================
  return (
    <div
      className={`min-h-screen flex flex-col overflow-hidden font-['Inter_Variable',sans-serif] transition-colors duration-300 ${
        isDark ? "bg-[#000000] text-[#f2f7f4]" : "bg-[#f8fafc] text-[#0f172a]"
      }`}
    >
      {/* Studio Top Navigation Bar */}
      <div
        className={`builder-top-bar border-b px-6 py-2.5 flex items-center justify-between z-30 transition-colors ${
          isDark
            ? "border-[#1c2930] bg-[#080c0e]/95 backdrop-blur-md"
            : "border-[#e2e8f0] bg-[#ffffff]/95 backdrop-blur-md shadow-sm"
        }`}
      >
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className={`text-xs font-mono tracking-widest transition-colors ${
              isDark
                ? "text-[#8da499] hover:text-[#ffffff]"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            ← Store Catalog
          </Link>
          <span
            className={`w-px h-3 ${isDark ? "bg-[#1c2930]" : "bg-[#e2e8f0]"}`}
          />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00f090] animate-pulse" />
            <span
              className={`text-xs font-mono uppercase tracking-wider font-semibold ${
                isDark ? "text-[#00f090]" : "text-[#059669]"
              }`}
            >
              3D PC ASSEMBLY STUDIO
            </span>
          </div>
        </div>

        {/* Global Build Telemetry Snapshot */}
        <div className="hidden md:flex items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className={isDark ? "text-[#5a7269]" : "text-[#94a3b8]"}>
              PARTS:
            </span>
            <span className="font-semibold">{partsArray.length} / 7</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={isDark ? "text-[#5a7269]" : "text-[#94a3b8]"}>
              ESTIMATED TDP:
            </span>
            <span
              className={`font-semibold ${
                powerWarning
                  ? "text-[#ff5500]"
                  : isDark
                    ? "text-[#00f090]"
                    : "text-[#059669]"
              }`}
            >
              {totalTDP}W / {psuWattage}W
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={isDark ? "text-[#5a7269]" : "text-[#94a3b8]"}>
              TOTAL:
            </span>
            <span className="text-sm font-bold">
              THB {totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right Action Island: Theme Toggle & Cart Link */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle Button */}
          <ThemeToggle />

          <Link
            to="/cart"
            className={`cart-link px-4 py-1.5 rounded-full border text-xs font-mono transition-all flex items-center gap-2 ${
              isDark
                ? "border-[#1c2930] text-[#ffffff] hover:border-[#00f090]"
                : "border-[#e2e8f0] text-[#0f172a] hover:border-[#059669] bg-[#ffffff]"
            }`}
          >
            <ShoppingBag
              size={14}
              className={isDark ? "text-[#00f090]" : "text-[#059669]"}
            />
            <span>Cart</span>
            <b
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isDark
                  ? "bg-[#131d22] text-[#00f090]"
                  : "bg-[#e2e8f0] text-[#059669]"
              }`}
            >
              {cart.reduce((sum, p) => sum + p.quantity, 0)}
            </b>
          </Link>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* ============================================================== */}
        {/* LEFT / MAIN STAGE (65% width): Interactive 3D Assembly Stage   */}
        {/* ============================================================== */}
        <div
          className={`w-full lg:w-[65%] h-[55vh] lg:h-[calc(100vh-53px)] relative flex items-center justify-center transition-colors ${
            isDark ? "bg-[#06090b]" : "bg-[#f1f4f8]"
          }`}
        >
          {/* React Three Fiber Canvas */}
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [5.8, 3.8, 7.2], fov: 38 }}
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: isDark ? 1.25 : 1.1,
            }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <SceneStage
              isDark={isDark}
              selectedParts={selectedParts}
              cameraControlsRef={cameraControlsRef}
              explodedProgress={explodedVal}
              autoRotate={autoRotate}
              activeCategory={activeTab}
              onSelectCategory={handleHotspotSelect}
            />
          </Canvas>

          {/* Camera Presets & Exploded View Floating Pill Toolbar */}
          <div
            className={`absolute top-5 left-5 z-20 flex flex-wrap items-center gap-1.5 border backdrop-blur-md p-1.5 rounded-full shadow-2xl transition-colors ${
              isDark
                ? "bg-[#090d0f]/85 border-[#1c2930]"
                : "bg-[#ffffff]/90 border-[#e2e8f0] shadow-lg"
            }`}
          >
            <span
              className={`text-[10px] font-mono px-2.5 flex items-center gap-1 ${
                isDark ? "text-[#5a7269]" : "text-[#94a3b8]"
              }`}
            >
              <Camera
                size={12}
                className={isDark ? "text-[#00f090]" : "text-[#059669]"}
              />
              <span className="hidden sm:inline">PRESET</span>
            </span>

            <button
              onClick={() => switchCameraPreset("full")}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                cameraPreset === "full"
                  ? isDark
                    ? "bg-[#00f090] text-[#000000] font-semibold"
                    : "bg-[#059669] text-[#ffffff] font-semibold"
                  : isDark
                    ? "text-[#8da499] hover:text-[#ffffff]"
                    : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Full Rig
            </button>
            <button
              onClick={() => switchCameraPreset("motherboard")}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                cameraPreset === "motherboard"
                  ? isDark
                    ? "bg-[#00f090] text-[#000000] font-semibold"
                    : "bg-[#059669] text-[#ffffff] font-semibold"
                  : isDark
                    ? "text-[#8da499] hover:text-[#ffffff]"
                    : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Motherboard
            </button>
            <button
              onClick={() => switchCameraPreset("gpu")}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                cameraPreset === "gpu"
                  ? isDark
                    ? "bg-[#00f090] text-[#000000] font-semibold"
                    : "bg-[#059669] text-[#ffffff] font-semibold"
                  : isDark
                    ? "text-[#8da499] hover:text-[#ffffff]"
                    : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              GPU Bay
            </button>
            <button
              onClick={() => switchCameraPreset("cooler")}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                cameraPreset === "cooler"
                  ? isDark
                    ? "bg-[#00f090] text-[#000000] font-semibold"
                    : "bg-[#059669] text-[#ffffff] font-semibold"
                  : isDark
                    ? "text-[#8da499] hover:text-[#ffffff]"
                    : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Cooler Bay
            </button>
            <button
              onClick={() => switchCameraPreset("ram")}
              className={`hidden sm:inline-block px-3 py-1 rounded-full text-xs font-mono transition-all ${
                cameraPreset === "ram"
                  ? isDark
                    ? "bg-[#00f090] text-[#000000] font-semibold"
                    : "bg-[#059669] text-[#ffffff] font-semibold"
                  : isDark
                    ? "text-[#8da499] hover:text-[#ffffff]"
                    : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              RAM & Socket
            </button>

            <span
              className={`w-px h-3 ${isDark ? "bg-[#1c2930]" : "bg-[#e2e8f0]"}`}
            />

            {/* Staggered Exploded Isometric Toggle */}
            <button
              onClick={toggleExploded}
              title={isExploded ? "Assemble Rig" : "Explode Isometric Layout"}
              className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 transition-all ${
                isExploded
                  ? isDark
                    ? "bg-[#00e1ff] text-[#000000] font-semibold"
                    : "bg-[#0284c7] text-[#ffffff] font-semibold"
                  : isDark
                    ? "text-[#8da499] hover:text-[#ffffff]"
                    : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              {isExploded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isExploded ? "Assembled" : "Exploded View"}</span>
            </button>

            <span
              className={`w-px h-3 ${isDark ? "bg-[#1c2930]" : "bg-[#e2e8f0]"}`}
            />

            {/* Turntable Auto Rotate Toggle */}
            <button
              onClick={toggleAutoRotate}
              title="Toggle Auto Rotation Turntable"
              className={`p-1.5 rounded-full transition-all ${
                autoRotate
                  ? isDark
                    ? "bg-[#00f090] text-[#000000]"
                    : "bg-[#059669] text-[#ffffff]"
                  : isDark
                    ? "text-[#8da499] hover:text-[#ffffff]"
                    : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <RotateCw
                size={13}
                className={autoRotate ? "animate-spin" : ""}
              />
            </button>
          </div>

          {/* Floating Telemetry & Compatibility HUD */}
          <div className="absolute bottom-5 left-5 right-5 lg:right-auto z-20 flex flex-wrap items-center gap-2.5">
            {/* Socket Status Pill */}
            <div
              className={`px-3.5 py-1.5 rounded-full border backdrop-blur-md text-xs font-mono flex items-center gap-2 shadow-xl transition-colors ${
                socketMismatch
                  ? "border-[#ff5500] bg-[#ff5500]/10 text-[#ff5500]"
                  : isDark
                    ? "border-[#1c2930] bg-[#090d0f]/90 text-[#00f090]"
                    : "border-[#e2e8f0] bg-[#ffffff]/90 text-[#059669]"
              }`}
            >
              {socketMismatch ? (
                <>
                  <AlertTriangle size={13} />
                  <span>
                    Socket Mismatch: {selectedParts.cpu?.socket} ≠{" "}
                    {selectedParts.motherboard?.socket}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>
                    Socket Validated: {selectedParts.cpu?.socket || "AM5"}
                  </span>
                </>
              )}
            </div>

            {/* Power Headroom Pill */}
            <div
              className={`px-3.5 py-1.5 rounded-full border backdrop-blur-md text-xs font-mono flex items-center gap-2 shadow-xl transition-colors ${
                powerWarning
                  ? "border-[#ff5500] bg-[#ff5500]/10 text-[#ff5500]"
                  : isDark
                    ? "border-[#1c2930] bg-[#090d0f]/90 text-[#f2f7f4]"
                    : "border-[#e2e8f0] bg-[#ffffff]/90 text-[#0f172a]"
              }`}
            >
              <BatteryCharging
                size={13}
                className={
                  powerWarning
                    ? "text-[#ff5500]"
                    : isDark
                      ? "text-[#00e1ff]"
                      : "text-[#0284c7]"
                }
              />
              <span>
                {powerWarning
                  ? `Over TDP Budget by ${Math.abs(powerHeadroom)}W!`
                  : `TDP Headroom: +${powerHeadroom}W`}
              </span>
            </div>

            {/* Exploded Clearance Slider */}
            <div
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md text-xs font-mono ${
                isDark
                  ? "border-[#1c2930] bg-[#090d0f]/90 text-[#8da499]"
                  : "border-[#e2e8f0] bg-[#ffffff]/90 text-[#64748b]"
              }`}
            >
              <Sliders size={12} />
              <span className="text-[10px]">Clearance:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedVal}
                onChange={(e) =>
                  handleExplosionSlider(parseFloat(e.target.value))
                }
                className="w-20 accent-[#00f090] cursor-pointer"
                title="Scrub Isometric Clearance"
              />
              <span className="text-[10px] w-7">
                {Math.round(explodedVal * 100)}%
              </span>
            </div>

            {/* Orbit Hint */}
            <div
              className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono ${
                isDark
                  ? "border-[#1c2930]/80 bg-[#090d0f]/60 text-[#5a7269]"
                  : "border-[#e2e8f0] bg-[#ffffff]/60 text-[#94a3b8]"
              }`}
            >
              <Compass size={12} />
              <span>Drag to orbit · Click nodes to isolate</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT / PARTS CONFIGURATOR (35% width): Tabbed Drawer           */}
        {/* ============================================================== */}
        <div
          className={`w-full lg:w-[35%] h-[45vh] lg:h-[calc(100vh-53px)] border-l flex flex-col z-20 shadow-2xl transition-colors ${
            isDark
              ? "bg-[#080c0e] border-[#1c2930]"
              : "bg-[#ffffff] border-[#e2e8f0]"
          }`}
        >
          {/* Category Tabs Strip */}
          <div
            className={`border-b px-4 py-2 overflow-x-auto flex gap-1 scrollbar-none transition-colors ${
              isDark
                ? "border-[#1c2930] bg-[#0a0f12]"
                : "border-[#e2e8f0] bg-[#f8fafc]"
            }`}
          >
            {[
              { id: "cpu", label: "CPU", icon: Cpu },
              { id: "motherboard", label: "Board", icon: Layers },
              { id: "gpu", label: "GPU", icon: Zap },
              { id: "cooler", label: "Cooler", icon: Fan },
              { id: "ram", label: "RAM", icon: Sparkles },
              { id: "storage", label: "Storage", icon: HardDrive },
              { id: "psu", label: "PSU", icon: BatteryCharging },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(
                      tab.id as
                        | "cpu"
                        | "motherboard"
                        | "gpu"
                        | "cooler"
                        | "ram"
                        | "storage"
                        | "psu",
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isSelected
                      ? isDark
                        ? "bg-[#00f090] text-[#000000] font-semibold shadow-[0_0_12px_rgba(0,240,144,0.3)]"
                        : "bg-[#059669] text-[#ffffff] font-semibold shadow-sm"
                      : isDark
                        ? "text-[#8da499] hover:bg-[#131d22] hover:text-[#ffffff]"
                        : "text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
                  }`}
                >
                  <TabIcon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Parts List Scroll View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {HARDWARE_CATALOG.filter((p) => p.category === activeTab).map(
              (part) => {
                const isEquipped = selectedParts[part.category]?.id === part.id;
                return (
                  <div
                    key={part.id}
                    onClick={() => {
                      setSelectedParts((prev) => ({
                        ...prev,
                        [part.category]: part,
                      }));
                      handleHotspotSelect(part.category);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isEquipped
                        ? isDark
                          ? "border-[#00f090] bg-[#00f090]/10 shadow-[0_0_15px_rgba(0,240,144,0.1)]"
                          : "border-[#059669] bg-[#ecfdf5] shadow-sm"
                        : isDark
                          ? "border-[#1c2930] bg-[#0d1418]/60 hover:border-[#2f424b] hover:bg-[#131d22]"
                          : "border-[#e2e8f0] bg-[#ffffff] hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`text-[10px] font-mono tracking-widest uppercase ${
                            isDark ? "text-[#5a7269]" : "text-[#94a3b8]"
                          }`}
                        >
                          {part.brand} · SKU: {part.sku}
                        </span>
                        <h4
                          className={`text-sm font-semibold leading-tight mt-0.5 ${
                            isEquipped
                              ? isDark
                                ? "text-[#00f090]"
                                : "text-[#059669]"
                              : isDark
                                ? "text-[#ffffff]"
                                : "text-[#0f172a]"
                          }`}
                        >
                          {part.name}
                        </h4>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-xs font-mono font-bold">
                          THB {part.price.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Hardware Specifications Badges */}
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      {Object.entries(part.specs).map(([k, v]) => (
                        <span
                          key={k}
                          className={`px-2 py-0.5 rounded border ${
                            isDark
                              ? "bg-[#131d22] border-white/5 text-[#8da499]"
                              : "bg-[#f1f5f9] border-[#e2e8f0] text-[#475569]"
                          }`}
                        >
                          {v}
                        </span>
                      ))}
                      {part.tdp > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            isDark
                              ? "bg-[#131d22] border-white/5 text-[#00e1ff]"
                              : "bg-[#e0f2fe] border-[#bae6fd] text-[#0284c7]"
                          }`}
                        >
                          {part.tdp}W TDP
                        </span>
                      )}
                      {part.socket && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            isDark
                              ? "bg-[#131d22] border-white/5 text-[#00f090]"
                              : "bg-[#dcfce7] border-[#bbf7d0] text-[#15803d]"
                          }`}
                        >
                          {part.socket}
                        </span>
                      )}
                    </div>

                    {/* Action Row */}
                    <div
                      className={`flex items-center justify-between pt-2 border-t mt-1 ${
                        isDark ? "border-[#1c2930]/60" : "border-[#e2e8f0]"
                      }`}
                    >
                      <span
                        className={`text-[11px] font-mono ${
                          isDark ? "text-[#5a7269]" : "text-[#94a3b8]"
                        }`}
                      >
                        {isEquipped
                          ? "● Mounted on Chassis"
                          : "Click to mount in 3D"}
                      </span>
                      <button
                        className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all ${
                          isEquipped
                            ? isDark
                              ? "bg-[#00f090] text-[#000000]"
                              : "bg-[#059669] text-[#ffffff]"
                            : isDark
                              ? "bg-[#18242b] text-[#f2f7f4] hover:bg-[#203038]"
                              : "bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]"
                        }`}
                      >
                        {isEquipped ? "Mounted" : "Equip"}
                      </button>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          {/* Bottom Drawer Summary & Magnetic Primary CTA */}
          <div
            className={`p-4 border-t flex flex-col gap-3 transition-colors ${
              isDark
                ? "border-[#1c2930] bg-[#0a0f12]"
                : "border-[#e2e8f0] bg-[#f8fafc]"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={isDark ? "text-[#8da499]" : "text-[#64748b]"}>
                CONFIGURED RIG COST:
              </span>
              <span className="text-base font-mono font-bold">
                THB {totalPrice.toLocaleString()}
              </span>
            </div>

            <button
              ref={magneticButtonRef}
              onClick={handleAddBuildToCart}
              className={`button-primary-pill w-full py-3.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-2xl active:scale-95 ${
                addedAll
                  ? isDark
                    ? "bg-[#00f090] text-[#000000]"
                    : "bg-[#059669] text-[#ffffff]"
                  : isDark
                    ? "bg-[#ffffff] text-[#000000] hover:bg-[#d4d4d8]"
                    : "bg-[#0f172a] text-[#ffffff] hover:bg-[#1e293b]"
              }`}
            >
              {addedAll ? (
                <>
                  <Check size={16} /> Complete Rig Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag size={16} /> Add Complete Build to Cart (
                  {partsArray.length} items)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default PCBuilderPage;

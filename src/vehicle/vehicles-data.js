/**
 * Comprehensive Vehicle Profiles & Specifications
 * Covers 18 playable vehicles across 4 distinct automotive categories
 */
export const VEHICLE_CATEGORIES = {
  electric: { id: 'electric', name: 'Electric' },
  cars: { id: 'cars', name: 'Cars & SUVs' },
  commercial: { id: 'commercial', name: 'Commercial & Vans' },
  twowheeler: { id: 'twowheeler', name: 'Two-Wheelers' }
};

export const COLOR_PALETTES = [
  { id: 'pearl_white', name: 'Pearl White', hex: 0xf5f7fa },
  { id: 'solid_black', name: 'Solid Black', hex: 0x141518 },
  { id: 'midnight_silver', name: 'Midnight Silver', hex: 0x484c54 },
  { id: 'deep_blue', name: 'Deep Metallic Blue', hex: 0x1e3a8a },
  { id: 'ultra_red', name: 'Ultra Red', hex: 0xc92a2a },
  { id: 'cyber_steel', name: 'Cyber Steel', hex: 0x868e96 },
  { id: 'british_green', name: 'British Racing Green', hex: 0x1b4332 },
  { id: 'sunset_orange', name: 'Sunset Amber', hex: 0xd9480f },
  { id: 'electric_cyan', name: 'Electric Cyan', hex: 0x0ca678 }
];

export const WHEEL_STYLES = [
  { id: 'aero', name: 'Sport Aero' },
  { id: 'multispoke', name: 'Turbine Multi-Spoke' },
  { id: 'rugged', name: 'Rugged Knobby Off-Road' }
];

export const VEHICLES = {
  // =========================================================================
  // ELECTRIC CARS
  // =========================================================================
  model_3: {
    id: 'model_3',
    category: 'electric',
    name: 'Aero 3 Performance',
    tagline: 'Modern electric sports sedan with instant torque',
    vehicleType: 'car',
    dimensions: { length: 4.69, width: 1.85, height: 1.44 },
    specs: { topSpeed: 250, accel0to100: 3.1, power: 450, weight: 1840, handling: 9.2 },
    physics: {
      mass: 1840,
      wheelbase: 2.88,
      trackWidth: 1.62,
      heightCG: 0.42,
      enginePower: 330000,
      maxDriveForce: 8400,
      maxBrakeForce: 12500,
      maxForwardSpeed: 69.5, // 250 km/h
      maxReverseSpeed: -14.0,
      cornerStiffFront: 76000,
      cornerStiffRear: 82000,
      tireFrictionRoad: 1.18,
      airDragCoeff: 0.23,
      wheelRadius: 0.35
    },
    defaultColor: 0xf5f7fa
  },
  model_s: {
    id: 'model_s',
    category: 'electric',
    name: 'Aero S Plaid',
    tagline: 'Luxury electric liftback with hypercar acceleration',
    vehicleType: 'car',
    dimensions: { length: 4.97, width: 1.96, height: 1.44 },
    specs: { topSpeed: 300, accel0to100: 2.0, power: 1020, weight: 2160, handling: 9.0 },
    physics: {
      mass: 2160,
      wheelbase: 2.96,
      trackWidth: 1.68,
      heightCG: 0.40,
      enginePower: 580000,
      maxDriveForce: 12500,
      maxBrakeForce: 15500,
      maxForwardSpeed: 83.3, // 300 km/h
      maxReverseSpeed: -16.0,
      cornerStiffFront: 88000,
      cornerStiffRear: 92000,
      tireFrictionRoad: 1.22,
      airDragCoeff: 0.208,
      wheelRadius: 0.36
    },
    defaultColor: 0xc92a2a
  },
  model_x: {
    id: 'model_x',
    category: 'electric',
    name: 'Aero X Crossover',
    tagline: 'Full-size electric falcon SUV with panoramic canopy',
    vehicleType: 'car',
    dimensions: { length: 5.03, width: 2.00, height: 1.68 },
    specs: { topSpeed: 240, accel0to100: 3.8, power: 670, weight: 2450, handling: 8.4 },
    physics: {
      mass: 2450,
      wheelbase: 2.96,
      trackWidth: 1.72,
      heightCG: 0.50,
      enginePower: 420000,
      maxDriveForce: 9800,
      maxBrakeForce: 14000,
      maxForwardSpeed: 66.6,
      maxReverseSpeed: -13.0,
      cornerStiffFront: 78000,
      cornerStiffRear: 82000,
      tireFrictionRoad: 1.15,
      airDragCoeff: 0.24,
      wheelRadius: 0.38
    },
    defaultColor: 0x1e3a8a
  },
  model_y: {
    id: 'model_y',
    category: 'electric',
    name: 'Aero Y Compact SUV',
    tagline: 'Versatile electric crossover with elevated seating',
    vehicleType: 'car',
    dimensions: { length: 4.75, width: 1.92, height: 1.62 },
    specs: { topSpeed: 220, accel0to100: 4.8, power: 384, weight: 1980, handling: 8.6 },
    physics: {
      mass: 1980,
      wheelbase: 2.89,
      trackWidth: 1.64,
      heightCG: 0.48,
      enginePower: 280000,
      maxDriveForce: 7800,
      maxBrakeForce: 11800,
      maxForwardSpeed: 61.1,
      maxReverseSpeed: -12.5,
      cornerStiffFront: 74000,
      cornerStiffRear: 78000,
      tireFrictionRoad: 1.16,
      airDragCoeff: 0.23,
      wheelRadius: 0.36
    },
    defaultColor: 0x484c54
  },
  cybertruck: {
    id: 'cybertruck',
    category: 'electric',
    name: 'Cyber Exoskeleton',
    tagline: 'Futuristic angular stainless-steel electric pickup',
    vehicleType: 'car',
    dimensions: { length: 5.68, width: 2.20, height: 1.79 },
    specs: { topSpeed: 210, accel0to100: 2.9, power: 845, weight: 3100, handling: 8.0 },
    physics: {
      mass: 3100,
      wheelbase: 3.63,
      trackWidth: 1.84,
      heightCG: 0.58,
      enginePower: 620000,
      maxDriveForce: 14500,
      maxBrakeForce: 18000,
      maxForwardSpeed: 58.3,
      maxReverseSpeed: -12.0,
      cornerStiffFront: 92000,
      cornerStiffRear: 98000,
      tireFrictionRoad: 1.20,
      airDragCoeff: 0.34,
      wheelRadius: 0.44
    },
    defaultColor: 0x868e96
  },
  electric_hypercar: {
    id: 'electric_hypercar',
    category: 'electric',
    name: 'Apex EV Hypercar',
    tagline: 'Ultra low-drag electric roadster designed for extreme speed',
    vehicleType: 'car',
    dimensions: { length: 4.48, width: 1.98, height: 1.22 },
    specs: { topSpeed: 380, accel0to100: 1.8, power: 1400, weight: 1680, handling: 9.8 },
    physics: {
      mass: 1680,
      wheelbase: 2.70,
      trackWidth: 1.72,
      heightCG: 0.34,
      enginePower: 820000,
      maxDriveForce: 16000,
      maxBrakeForce: 18500,
      maxForwardSpeed: 105.5,
      maxReverseSpeed: -18.0,
      cornerStiffFront: 98000,
      cornerStiffRear: 105000,
      tireFrictionRoad: 1.28,
      airDragCoeff: 0.19,
      wheelRadius: 0.34
    },
    defaultColor: 0xd9480f
  },

  // =========================================================================
  // OTHER CARS & SUVS
  // =========================================================================
  sports_car: {
    id: 'sports_car',
    category: 'cars',
    name: 'Vortex GT Sport',
    tagline: 'Twin-turbo rear-wheel-drive performance coupe',
    vehicleType: 'car',
    dimensions: { length: 4.52, width: 1.90, height: 1.30 },
    specs: { topSpeed: 285, accel0to100: 3.6, power: 510, weight: 1520, handling: 9.4 },
    physics: {
      mass: 1520,
      wheelbase: 2.65,
      trackWidth: 1.62,
      heightCG: 0.38,
      enginePower: 380000,
      maxDriveForce: 8800,
      maxBrakeForce: 13200,
      maxForwardSpeed: 79.1,
      maxReverseSpeed: -14.0,
      cornerStiffFront: 84000,
      cornerStiffRear: 88000,
      tireFrictionRoad: 1.20,
      airDragCoeff: 0.29,
      wheelRadius: 0.35
    },
    defaultColor: 0xc92a2a
  },
  luxury_sedan: {
    id: 'luxury_sedan',
    category: 'cars',
    name: 'Sovereign V8 Executive',
    tagline: 'High-speed continental cruiser with air-ride comfort',
    vehicleType: 'car',
    dimensions: { length: 5.12, width: 1.92, height: 1.48 },
    specs: { topSpeed: 250, accel0to100: 4.5, power: 460, weight: 2050, handling: 8.7 },
    physics: {
      mass: 2050,
      wheelbase: 3.10,
      trackWidth: 1.66,
      heightCG: 0.46,
      enginePower: 340000,
      maxDriveForce: 7600,
      maxBrakeForce: 12000,
      maxForwardSpeed: 69.4,
      maxReverseSpeed: -13.0,
      cornerStiffFront: 72000,
      cornerStiffRear: 76000,
      tireFrictionRoad: 1.14,
      airDragCoeff: 0.27,
      wheelRadius: 0.36
    },
    defaultColor: 0x141518
  },
  suv_4x4: {
    id: 'suv_4x4',
    category: 'cars',
    name: 'Patrol 4x4 Mountain SUV',
    tagline: 'Heavy-duty 4WD vehicle built for steep alpine gradients',
    vehicleType: 'car',
    dimensions: { length: 4.95, width: 1.98, height: 1.88 },
    specs: { topSpeed: 195, accel0to100: 6.8, power: 340, weight: 2380, handling: 7.6 },
    physics: {
      mass: 2380,
      wheelbase: 2.92,
      trackWidth: 1.70,
      heightCG: 0.62,
      enginePower: 260000,
      maxDriveForce: 8800,
      maxBrakeForce: 11000,
      maxForwardSpeed: 54.1,
      maxReverseSpeed: -11.0,
      cornerStiffFront: 62000,
      cornerStiffRear: 66000,
      tireFrictionRoad: 1.08,
      airDragCoeff: 0.38,
      wheelRadius: 0.42
    },
    defaultColor: 0x1b4332
  },
  classic_muscle: {
    id: 'classic_muscle',
    category: 'cars',
    name: '1970 Interceptor Coupe',
    tagline: 'Classic American big-block V8 with roaring mechanical rumble',
    vehicleType: 'car',
    dimensions: { length: 4.98, width: 1.94, height: 1.36 },
    specs: { topSpeed: 220, accel0to100: 5.2, power: 425, weight: 1680, handling: 7.8 },
    physics: {
      mass: 1680,
      wheelbase: 2.82,
      trackWidth: 1.62,
      heightCG: 0.45,
      enginePower: 310000,
      maxDriveForce: 8200,
      maxBrakeForce: 9500,
      maxForwardSpeed: 61.1,
      maxReverseSpeed: -12.0,
      cornerStiffFront: 65000,
      cornerStiffRear: 68000,
      tireFrictionRoad: 1.10,
      airDragCoeff: 0.38,
      wheelRadius: 0.36
    },
    defaultColor: 0xd9480f
  },
  city_car: {
    id: 'city_car',
    category: 'cars',
    name: 'Breeze Urban Compact',
    tagline: 'Ultra-nimble city hatchback with short turning radius',
    vehicleType: 'car',
    dimensions: { length: 3.65, width: 1.65, height: 1.48 },
    specs: { topSpeed: 165, accel0to100: 8.5, power: 120, weight: 1080, handling: 8.9 },
    physics: {
      mass: 1080,
      wheelbase: 2.35,
      trackWidth: 1.44,
      heightCG: 0.46,
      enginePower: 95000,
      maxDriveForce: 4200,
      maxBrakeForce: 7800,
      maxForwardSpeed: 45.8,
      maxReverseSpeed: -10.0,
      cornerStiffFront: 54000,
      cornerStiffRear: 56000,
      tireFrictionRoad: 1.12,
      airDragCoeff: 0.31,
      wheelRadius: 0.31
    },
    defaultColor: 0x0ca678
  },

  // =========================================================================
  // COMMERCIAL & PUBLIC VEHICLES
  // =========================================================================
  city_bus: {
    id: 'city_bus',
    category: 'commercial',
    name: 'Metro Transit Bus',
    tagline: 'Full-length 12-meter city passenger bus with high inertia',
    vehicleType: 'bus',
    dimensions: { length: 11.8, width: 2.50, height: 3.10 },
    specs: { topSpeed: 95, accel0to100: 16.5, power: 320, weight: 11500, handling: 6.2 },
    physics: {
      mass: 11500,
      wheelbase: 6.20,
      trackWidth: 2.15,
      heightCG: 0.95,
      enginePower: 240000,
      maxDriveForce: 16500,
      maxBrakeForce: 28000,
      maxForwardSpeed: 26.4, // 95 km/h
      maxReverseSpeed: -8.0,
      cornerStiffFront: 140000,
      cornerStiffRear: 160000,
      tireFrictionRoad: 1.05,
      airDragCoeff: 0.65,
      wheelRadius: 0.52
    },
    defaultColor: 0x1e3a8a
  },
  delivery_van: {
    id: 'delivery_van',
    category: 'commercial',
    name: 'Express Cargo Van',
    tagline: 'High-roof logistics van with firm workhorse suspension',
    vehicleType: 'truck',
    dimensions: { length: 5.92, width: 2.05, height: 2.55 },
    specs: { topSpeed: 155, accel0to100: 10.2, power: 190, weight: 2650, handling: 7.2 },
    physics: {
      mass: 2650,
      wheelbase: 3.65,
      trackWidth: 1.75,
      heightCG: 0.72,
      enginePower: 145000,
      maxDriveForce: 6800,
      maxBrakeForce: 12500,
      maxForwardSpeed: 43.0,
      maxReverseSpeed: -10.5,
      cornerStiffFront: 68000,
      cornerStiffRear: 72000,
      tireFrictionRoad: 1.08,
      airDragCoeff: 0.44,
      wheelRadius: 0.38
    },
    defaultColor: 0xf5f7fa
  },
  semi_truck: {
    id: 'semi_truck',
    category: 'commercial',
    name: 'Titan Heavy Hauler',
    tagline: 'Massive highway tractor with immense torque and stopping distance',
    vehicleType: 'truck',
    dimensions: { length: 7.85, width: 2.50, height: 3.45 },
    specs: { topSpeed: 110, accel0to100: 14.0, power: 580, weight: 8900, handling: 6.5 },
    physics: {
      mass: 8900,
      wheelbase: 4.80,
      trackWidth: 2.10,
      heightCG: 0.88,
      enginePower: 450000,
      maxDriveForce: 22000,
      maxBrakeForce: 32000,
      maxForwardSpeed: 30.5, // 110 km/h
      maxReverseSpeed: -8.5,
      cornerStiffFront: 135000,
      cornerStiffRear: 155000,
      tireFrictionRoad: 1.05,
      airDragCoeff: 0.62,
      wheelRadius: 0.54
    },
    defaultColor: 0xc92a2a
  },

  // =========================================================================
  // TWO-WHEELERS (MOTORCYCLES & SCOOTERS)
  // =========================================================================
  sports_bike: {
    id: 'sports_bike',
    category: 'twowheeler',
    name: 'Hayabusa R1000 Sportbike',
    tagline: 'Inline-4 supersport motorcycle with aggressive cornering lean',
    vehicleType: 'bike',
    dimensions: { length: 2.08, width: 0.75, height: 1.15 },
    specs: { topSpeed: 295, accel0to100: 2.8, power: 200, weight: 205, handling: 9.7 },
    physics: {
      mass: 205,
      wheelbase: 1.44,
      trackWidth: 0.45,
      heightCG: 0.52,
      enginePower: 150000,
      maxDriveForce: 4500,
      maxBrakeForce: 6200,
      maxForwardSpeed: 81.9, // 295 km/h
      maxReverseSpeed: -4.0,
      cornerStiffFront: 38000,
      cornerStiffRear: 42000,
      tireFrictionRoad: 1.25,
      airDragCoeff: 0.35,
      wheelRadius: 0.31
    },
    defaultColor: 0x1e3a8a
  },
  classic_bike: {
    id: 'classic_bike',
    category: 'twowheeler',
    name: 'Thunderbolt 750 Roadster',
    tagline: 'Classic twin-cylinder roadster with relaxed cruiser geometry',
    vehicleType: 'bike',
    dimensions: { length: 2.18, width: 0.82, height: 1.12 },
    specs: { topSpeed: 185, accel0to100: 4.8, power: 75, weight: 235, handling: 8.8 },
    physics: {
      mass: 235,
      wheelbase: 1.52,
      trackWidth: 0.48,
      heightCG: 0.48,
      enginePower: 58000,
      maxDriveForce: 3200,
      maxBrakeForce: 5200,
      maxForwardSpeed: 51.4,
      maxReverseSpeed: -4.0,
      cornerStiffFront: 34000,
      cornerStiffRear: 36000,
      tireFrictionRoad: 1.16,
      airDragCoeff: 0.42,
      wheelRadius: 0.33
    },
    defaultColor: 0x141518
  },
  city_scooter: {
    id: 'city_scooter',
    category: 'twowheeler',
    name: 'Primavera 150 Scooter',
    tagline: 'Step-through Italian commuter scooter for leisurely scenic riding',
    vehicleType: 'scooter',
    dimensions: { length: 1.86, width: 0.72, height: 1.15 },
    specs: { topSpeed: 105, accel0to100: 11.5, power: 15, weight: 125, handling: 9.1 },
    physics: {
      mass: 125,
      wheelbase: 1.34,
      trackWidth: 0.42,
      heightCG: 0.44,
      enginePower: 12000,
      maxDriveForce: 1600,
      maxBrakeForce: 3200,
      maxForwardSpeed: 29.2, // 105 km/h
      maxReverseSpeed: -3.5,
      cornerStiffFront: 26000,
      cornerStiffRear: 28000,
      tireFrictionRoad: 1.14,
      airDragCoeff: 0.46,
      wheelRadius: 0.24
    },
    defaultColor: 0x0ca678
  }
};

// data.js
export const PASSES = [
  {
    id: 'nathu-la',
    name: 'Nathu La',
    state: 'Sikkim',
    elevation: '4,310 m',
    significance: 'Ancient Silk Road branch connecting Sikkim with Tibet.',
    coords: { x: 0.595, y: 0.235 },
    region: 'sikkim'
  },
  {
    id: 'jelep-la',
    name: 'Jelep La',
    state: 'Sikkim',
    elevation: '4,267 m',
    significance: 'Historical route connecting Sikkim to Lhasa.',
    coords: { x: 0.625, y: 0.265 },
    region: 'sikkim'
  },
  {
    id: 'sela-pass',
    name: 'Sela Pass',
    state: 'Arunachal Pradesh',
    elevation: '4,170 m',
    significance: 'Critical year-round link connecting Tawang to Tezpur.',
    coords: { x: 0.655, y: 0.345 },
    region: 'arunachal'
  },
  {
    id: 'bomdi-la',
    name: 'Bomdi La',
    state: 'Arunachal Pradesh',
    elevation: '2,600 m',
    significance: 'Connects the western borders of Arunachal Pradesh with Lhasa.',
    coords: { x: 0.605, y: 0.395 },
    region: 'arunachal'
  },
  {
    id: 'bum-la',
    name: 'Bum La',
    state: 'Arunachal Pradesh',
    elevation: '4,600 m',
    significance: 'Historic pass serving as a major entry point into the region.',
    coords: { x: 0.770, y: 0.305 },
    region: 'arunachal'
  },
  {
    id: 'diphu-pass',
    name: 'Diphu Pass',
    state: 'Arunachal Pradesh',
    elevation: '4,326 m',
    significance: 'The strategic tri-junction border of India, China, and Myanmar.',
    coords: { x: 0.840, y: 0.395 },
    region: 'arunachal'
  },
  {
    id: 'tuzu-pass',
    name: 'Tuzu Pass',
    state: 'Manipur',
    elevation: 'N/A',
    significance: 'Primary land connection between Manipur and Myanmar.',
    coords: { x: 0.770, y: 0.625 },
    region: 'manipur'
  }
];

export const REGIONS = [
  {
    id: 'sikkim',
    name: 'Sikkim',
    path: 'M 0.560 0.180 L 0.660 0.175 L 0.690 0.230 L 0.660 0.275 L 0.595 0.275 L 0.555 0.235 Z',
    label: { x: 0.620, y: 0.230 }
  },
  {
    id: 'arunachal',
    name: 'Arunachal Pradesh',
    path: 'M 0.560 0.275 L 0.870 0.260 L 0.920 0.310 L 0.900 0.395 L 0.800 0.430 L 0.700 0.420 L 0.620 0.395 L 0.560 0.345 Z',
    label: { x: 0.730, y: 0.345 }
  },
  {
    id: 'assam',
    name: 'Assam',
    path: 'M 0.400 0.480 L 0.560 0.450 L 0.700 0.460 L 0.780 0.500 L 0.780 0.580 L 0.700 0.640 L 0.560 0.660 L 0.420 0.630 L 0.350 0.560 L 0.360 0.500 Z',
    label: { x: 0.560, y: 0.560 }
  },
  {
    id: 'nagaland',
    name: 'Nagaland',
    path: 'M 0.780 0.500 L 0.840 0.510 L 0.860 0.570 L 0.830 0.610 L 0.770 0.595 L 0.755 0.540 Z',
    label: { x: 0.805, y: 0.555 }
  },
  {
    id: 'manipur',
    name: 'Manipur',
    path: 'M 0.770 0.595 L 0.830 0.610 L 0.840 0.685 L 0.810 0.735 L 0.760 0.730 L 0.735 0.670 L 0.740 0.620 Z',
    label: { x: 0.785, y: 0.675 }
  },
  {
    id: 'mizoram',
    name: 'Mizoram',
    path: 'M 0.700 0.730 L 0.760 0.730 L 0.770 0.815 L 0.730 0.870 L 0.680 0.850 L 0.670 0.780 Z',
    label: { x: 0.720, y: 0.800 }
  },
  {
    id: 'tripura',
    name: 'Tripura',
    path: 'M 0.600 0.690 L 0.670 0.700 L 0.680 0.760 L 0.640 0.810 L 0.590 0.800 L 0.575 0.740 Z',
    label: { x: 0.625, y: 0.750 }
  },
  {
    id: 'meghalaya',
    name: 'Meghalaya',
    path: 'M 0.460 0.660 L 0.545 0.650 L 0.560 0.695 L 0.530 0.730 L 0.470 0.720 L 0.445 0.685 Z',
    label: { x: 0.500, y: 0.690 }
  }
];
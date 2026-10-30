import type { Postal } from '../game/types';

// positions are in the 1932 px space of public/map/erlc-map.webp and were read by eye,
// so treat them as approximate until the road and postal editor exists
const raw: [number, number, number, string?][] = [
  [200, 425, 1555], [201, 543, 1567], [202, 670, 1536], [203, 445, 1498, 'Vacation Court'], [204, 540, 1498, 'Liberty Way'],
  [205, 665, 1469, 'Oceanside Drive'], [206, 515, 1450], [207, 567, 1450, 'Southern Avenue'], [208, 612, 1450, 'Southern Avenue'],
  [209, 457, 1405, 'Freedom Avenue'], [210, 539, 1405, 'Freedom Avenue'], [211, 612, 1405, 'Freedom Avenue'], [212, 676, 1405, 'Freedom Avenue'],
  [213, 457, 1343], [214, 514, 1343, 'Durham Road'], [215, 567, 1343], [216, 612, 1343, 'Grand Avenue'], [217, 667, 1343],
  [218, 760, 1321, 'Riverside Drive'], [219, 565, 1300], [220, 612, 1300, 'Grand Avenue'], [221, 456, 1282, 'Fairfax Road'],
  [222, 516, 1300], [223, 568, 1250, 'Main Street'], [224, 612, 1250, 'Main Street'], [225, 688, 1250, 'Orchard Boulevard'],
  [226, 775, 1250, 'Riverside Drive'], [227, 403, 1231, 'Fairfax Road'], [228, 459, 1223], [229, 509, 1242, 'Justice Circle'],
  [230, 588, 1201, 'Commerce Way'], [231, 668, 1201, 'Commerce Way'],
  [300, 889, 1450], [301, 966, 1464, 'Madison Court'], [302, 1123, 1450], [303, 1275, 1419], [304, 949, 1400, 'Madison Court'],
  [305, 1001, 1400, 'Madison Court'], [306, 950, 1330, 'Cross Street'], [307, 1009, 1350, 'Cline Street'], [308, 1208, 1350, 'Freedom Avenue'],
  [309, 1009, 1314, 'Industrial Road'], [310, 1059, 1314, 'Industrial Road'], [311, 1110, 1300, 'Sams Lane'], [312, 1151, 1319, 'Virginia Avenue'],
  [313, 1200, 1314, 'Mill Street'], [314, 1288, 1312, 'Illinois Street'], [315, 965, 1263, 'Lost Lane'], [316, 1032, 1263, 'Industrial Road'],
  [317, 1097, 1263, 'Freight Street'], [319, 1210, 1260, 'Independence Parkway'], [320, 1275, 1260, 'Virginia Avenue'], [321, 975, 1192, 'Rockport Road'],
  [322, 1098, 1197, 'Bulletin Avenue'], [323, 1151, 1206, 'New York Lane'], [324, 1205, 1206, 'New York Lane'], [325, 1275, 1195, 'Virginia Avenue'],
  [326, 1101, 1142, 'Shawns Lane'], [327, 1184, 1137, 'Bulletin Avenue'],
  [400, 422, 1138, 'Valley Drive'], [401, 751, 1158, 'Fairfax Road'], [402, 347, 1062, 'Valley Drive'], [403, 580, 1110, 'Academy Place'],
  [404, 664, 1110, 'Fairfax Road'], [405, 463, 1050, 'Emerson Road'], [406, 546, 1050, 'Carolina Drive'], [407, 617, 1050, 'Academy Place'],
  [408, 453, 968, 'Valley Drive'], [409, 546, 988, 'Pineview Circle'], [410, 618, 988, 'Pineview Circle'], [411, 680, 988, 'Pineview Circle'],
  [500, 863, 985, 'Rockport Road'], [501, 1072, 1054], [502, 1245, 1033, 'Correction Street'], [503, 1193, 951, 'Colonial Drive'], [504, 1252, 798, 'Highway 55'],
  [600, 424, 893, 'Valley Drive'], [601, 663, 834, 'Pinecrest Drive'], [602, 364, 745, 'Valley Drive'], [603, 565, 683, 'Highway 2'],
  [604, 484, 624], [605, 425, 565, 'Fairview Road'], [606, 318, 498], [607, 387, 498],
  [700, 1037, 805, 'Rockport Road'], [701, 983, 745, 'Gibson Lane'], [702, 1059, 745, 'Vine Street'], [703, 1124, 731, 'Vine Street'],
  [704, 1018, 648, 'Colonial Drive'], [705, 1178, 642],
  [800, 393, 421], [801, 464, 439], [802, 526, 406, 'Fairview Trail'], [803, 362, 334], [804, 427, 362, 'Second Street'],
  [805, 520, 358, 'Fairview Road'], [806, 447, 318, 'Third Street'], [807, 546, 315, 'Fourth Street'], [808, 483, 271, 'Edgewood Boulevard'], [809, 574, 262],
  [900, 649, 565], [901, 835, 642, 'Riverside Drive'], [902, 805, 552, 'Aviator Lane'], [903, 717, 480, 'Aviator Lane'], [904, 660, 375],
  [905, 800, 393], [906, 700, 221, 'Oak Valley Drive'], [907, 720, 127, 'Oak Valley Drive'], [908, 822, 122, 'Spring Lake Way'], [909, 916, 143, 'Oak Valley Drive'],
  [1000, 966, 414, 'Spring Creek Road'], [1001, 1135, 488], [1002, 1288, 501, 'Maple Street'], [1003, 1232, 452, 'Lakeview Court'],
  [1004, 1283, 452, 'Lakeview Court'], [1005, 1158, 395], [1006, 1232, 404, 'Polk Street'], [1007, 1283, 404, 'Polk Street'],
  [1008, 1232, 354, 'Polk Street'], [1009, 1283, 354, 'Polk Street'], [1010, 1257, 265], [1011, 1158, 209, 'Oak Valley Drive'],
  [1100, 1442, 583, 'Walnut Way'], [1101, 1518, 563, 'Walnut Way'], [1102, 1441, 517, 'Maple Street'], [1103, 1494, 503, 'Maple Street'],
  [1104, 1555, 517, 'Cedar Circle'], [1105, 1441, 442, 'Cedar Circle'], [1106, 1494, 442, 'Terrace Drive'], [1107, 1531, 437, 'Terrace Drive'],
  [1108, 1524, 365, 'Oak Valley Drive'], [1109, 1418, 338, 'Oak Valley Drive'],
  [1200, 1431, 1310, 'Trail #2'], [1201, 1500, 1311, 'Trail #3'], [1202, 1630, 1262], [1203, 1381, 1179], [1204, 1648, 1184],
  [1205, 1450, 1081, 'High Rock Road'], [1206, 1525, 1017, 'High Rock Road'], [1207, 1634, 1017], [1208, 1320, 934],
  [1209, 1512, 830, 'High Rock Road'], [1210, 1356, 783, 'Oak Valley Drive'], [1211, 1376, 682], [1212, 1475, 747], [1213, 1579, 724],
];

export const postals: Postal[] = raw.map(([id, x, y, street]) => ({ id, x, y, street }));

export const postalById = new Map(postals.map((p) => [p.id, p]));

export function postalLabel(id: number): string {
  const p = postalById.get(id);
  if (!p) return `Postal ${id}`;
  return p.street ? `${id} ${p.street}` : `Postal ${id}`;
}

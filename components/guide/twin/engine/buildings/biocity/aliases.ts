/**
 * Material aliases for BioCity's merged buckets (geom.ts Buckets.alias): near-identical surfaces
 * share one material and one draw call per layer; phones merge more (DESIGN §5: ≤ 150 draw calls
 * ultra, ≤ 80 low per building). Facade-shader geometry only ever joins facade-shader keys, solid
 * geometry solid keys, and aliases never chain (one step each). Pure data — unit-tested.
 */

/**
 * Near-identical solid surfaces share one material (and one draw call per layer); phones merge a few
 * more (DESIGN §5: ≤ 150 draw calls ultra, ≤ 80 low per building).
 */
export const ALIAS: Record<string, string> = {
  blackPanel: "blackSteel",
  signPanel: "blackSteel",
  planter: "blackSteel",
  coping: "whiteSteel",
  flagpole: "whiteSteel",
  downlight: "lightWarm",
  standBlack: "darkIn",
  steelIn: "darkIn",
  stairTread: "darkIn",
  columnBlack: "darkIn",
  whiteTop: "plaster",
  whiteIn: "plaster",
  liftCar: "stainless",
};
export const ALIAS_LOW: Record<string, string> = {
  ...ALIAS,
  // Facade styles that look alike at phone size (facade geometry only joins facade geometry).
  field: "crown",
  tower: "crown",
  slotGlass: "crown",
  whiteGrid: "ribbonWhite",
  atriumPlain: "atrium",
  shopfrontIn: "officeFront",
  kmarket: "shopfront",
  groundOffice: "shopfront",
  // Solids (one step each: aliases do not chain).
  soffitExt: "blackSteel",
  tileWall: "blackSteel",
  ductBlack: "blackSteel",
  doorMat: "blackSteel",
  silver: "whiteSteel",
  plantGrey: "whiteSteel",
  plinth: "granite",
  wallCap: "plaster",
  stainless: "plaster",
  liftCar: "plaster",
  concreteIn: "plaster",
  curtain: "darkIn",
  moss: "timber",
  panelLight: "lightWarm",
  lightStrip: "lightWarm",
  liftLight: "lightWarm",
  lineLight: "lightWarm",
  glassIn: "glassLow",
  glassDoor: "glassLow",
  glassClear: "glassLow",
  glassVault: "glassLow",
};

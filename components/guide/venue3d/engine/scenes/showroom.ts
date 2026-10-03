import * as THREE from "three";
import { SHOWROOM_ORDER } from "@/lib/hackathon-2026";
import { makeMaterials } from "../furniture";
import type { BuiltScene, Quality } from "../types";
import { polar, type CameraView } from "../util";
import { buildShowroomRoom, COUNTER_BEARINGS, SHOWROOM } from "./showroomRoom";

export function buildShowroomScene(quality: Quality): BuiltScene {
  const mats = makeMaterials();
  const root = new THREE.Group();
  const room = buildShowroomRoom(mats, quality);
  root.add(room.group);

  root.add(new THREE.HemisphereLight(0x7c6cd8, 0x0c0c12, 1.3));
  const fill = new THREE.DirectionalLight(0xa9a6ff, 0.18);
  fill.position.set(3, 7, 12);
  root.add(fill);

  const focus: Record<string, CameraView> = {};
  for (const id of SHOWROOM_ORDER) {
    const b = COUNTER_BEARINGS[id];
    const [px, pz] = polar(b, 3.3);
    const [tx, tz] = polar(b, 7.7);
    focus[id] = { position: [px, 1.7, pz], target: [tx, 1.55, tz], hfov: 70, labels: true };
  }
  const [lcx, lcz] = SHOWROOM.LOUNGE_CENTER;
  const lounge: CameraView = {
    position: [lcx - 1.1, 3.9, lcz + 5.4],
    target: [lcx + 0.3, 0.35, lcz - 0.6],
    hfov: 84,
    labels: true,
  };
  focus.lounge = lounge;

  const views: Record<string, CameraView> = {
    entrance: { position: [0.5, 1.7, 7.4], target: [-7.16, 1.5, 0.97], hfov: 100, labels: false },
    overview: { position: [9.5, 23, 14], target: [-0.6, 0, -0.4], hfov: 64, labels: true },
    lounge,
  };
  views.default = views.entrance;

  return {
    root,
    views,
    focus,
    pickables: room.pickables,
    labels: room.labels,
    controls: { minDistance: 1.2, maxDistance: 42, maxPolarAngle: 1.5 },
    background: 0x040308,
    fogDensity: 0.012,
    exposure: 1.1,
    bloom: { strength: 0.45, radius: 0.3, threshold: 0.62 },
    ready: room.ready,
    tick: (camera) => {
      room.ceiling.visible = camera.position.y < SHOWROOM.H - 0.2;
    },
  };
}

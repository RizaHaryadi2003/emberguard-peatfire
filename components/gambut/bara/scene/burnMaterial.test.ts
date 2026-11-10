import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyBurn, createBurnUniforms, injectBurn } from "./burnMaterial";

const { vertexShader, fragmentShader } = THREE.ShaderLib.standard;

describe("sisipan tahapan terbakar", () => {
  it("menemukan semua titik sisip pada peneduh three.js yang terpasang", () => {
    const hasil = injectBurn(vertexShader, fragmentShader, "foliage");
    expect(hasil.vertexShader).toContain("vBurnH = clamp");
    expect(hasil.fragmentShader).toContain("uniform float uBurn;");
    expect(hasil.fragmentShader).toContain("float burnS");
    expect(hasil.fragmentShader).toContain("totalEmissiveRadiance += vec3");
  });

  it("menghitung pijar sesudah nilainya dibuat", () => {
    const { fragmentShader: f } = injectBurn(vertexShader, fragmentShader, "bark");
    expect(f.indexOf("float burnEdge")).toBeGreaterThan(-1);
    expect(f.indexOf("float burnEdge")).toBeLessThan(f.indexOf("totalEmissiveRadiance += vec3"));
  });

  it("hanya daun yang habis, batang tetap berdiri", () => {
    expect(injectBurn(vertexShader, fragmentShader, "foliage").fragmentShader).toContain("discard");
    const batang = injectBurn(vertexShader, fragmentShader, "bark").fragmentShader;
    expect(batang).not.toContain("if (burnS > 0.62) discard");
  });

  it("memasang uniform milik tumbuhan itu ke peneduhnya", () => {
    const material = new THREE.MeshStandardMaterial();
    const uniforms = createBurnUniforms(1.5, 2);
    applyBurn(material, uniforms, "bark");
    const shader = { uniforms: {}, vertexShader, fragmentShader } as unknown as Parameters<typeof material.onBeforeCompile>[0];
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.uniforms.uBurn).toBe(uniforms.uBurn);
    expect(material.customProgramCacheKey()).toBe("bara-burn-bark");
  });
});

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Calendar, FileText, Sparkles, CheckCircle2 } from 'lucide-react';

interface NoticeTransform3DProps {
  className?: string;
}

export const NoticeTransform3D: React.FC<NoticeTransform3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    // Check WebGL availability
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch (e) {
        return false;
      }
    };

    if (!checkWebGL() || !mountRef.current) {
      setHasWebGL(false);
      return () => {
        mediaQuery.removeEventListener('change', handleMotionChange);
      };
    }

    const container = mountRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 340;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      container.appendChild(renderer.domElement);
    } catch (e) {
      setHasWebGL(false);
      return () => {
        mediaQuery.removeEventListener('change', handleMotionChange);
      };
    }

    // 3. Lighting (Restrained, elegant studio setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf0f6ff, 1.8);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x3b82f6, 1.0);
    fillLight.position.set(-4, -2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x0284c7, 2, 10);
    rimLight.position.set(0, 3, -2);
    scene.add(rimLight);

    // 4. Transform Group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // --- Mesh 1: The College Notice (Physical Circular) ---
    // Curved paper plane
    const paperGeo = new THREE.PlaneGeometry(1.6, 2.1, 8, 8);
    // Add subtle curl to the paper geometry
    const pos = paperGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Gentle curve along corners
      pos.setZ(i, Math.sin(x * 1.5) * 0.08 + Math.cos(y * 1.2) * 0.04);
    }
    paperGeo.computeVertexNormals();

    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const paperMesh = new THREE.Mesh(paperGeo, paperMat);
    paperMesh.position.set(-1.1, 0, 0);
    paperMesh.rotation.set(0.15, 0.45, -0.08);
    mainGroup.add(paperMesh);

    // Add embossed text lines on paper
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const headerLineMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a });

    const headerBar = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.08), headerLineMat);
    headerBar.position.set(-1.1, 0.7, 0.02);
    headerBar.rotation.copy(paperMesh.rotation);
    mainGroup.add(headerBar);

    for (let i = 0; i < 5; i++) {
      const lineMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9 + (i % 2 === 0 ? 0.2 : 0), 0.035), lineMat);
      lineMesh.position.set(-1.1, 0.45 - i * 0.16, 0.02);
      lineMesh.rotation.copy(paperMesh.rotation);
      mainGroup.add(lineMesh);
    }

    // --- Mesh 2: Digital Event Blocks (Organized Calendar Transformation) ---
    const blockGroup = new THREE.Group();
    blockGroup.position.set(1.1, 0, 0);
    mainGroup.add(blockGroup);

    // Block 1: Exam Event (Navy & Blue)
    const block1Geo = new THREE.BoxGeometry(1.4, 0.42, 0.12);
    const block1Mat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // navy
      roughness: 0.3,
      metalness: 0.2,
    });
    const block1 = new THREE.Mesh(block1Geo, block1Mat);
    block1.position.set(0, 0.65, 0.15);
    blockGroup.add(block1);

    // Block 2: Lecture Event (Royal Blue)
    const block2Geo = new THREE.BoxGeometry(1.4, 0.42, 0.12);
    const block2Mat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // blue
      roughness: 0.3,
      metalness: 0.25,
    });
    const block2 = new THREE.Mesh(block2Geo, block2Mat);
    block2.position.set(0.15, 0.05, 0.3);
    blockGroup.add(block2);

    // Block 3: Confirmed Deadline (Emerald)
    const block3Geo = new THREE.BoxGeometry(1.4, 0.38, 0.12);
    const block3Mat = new THREE.MeshStandardMaterial({
      color: 0x059669, // emerald
      roughness: 0.35,
      metalness: 0.2,
    });
    const block3 = new THREE.Mesh(block3Geo, block3Mat);
    block3.position.set(-0.1, -0.55, 0.2);
    blockGroup.add(block3);

    // --- Mesh 3: Kinetic Transformation Flow Ribbon ---
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-0.3, 0.2, 0.05),
      new THREE.Vector3(0.1, 0.6, 0.4),
      new THREE.Vector3(0.4, -0.2, 0.3),
      new THREE.Vector3(0.8, 0.3, 0.2)
    );
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.025, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const flowTube = new THREE.Mesh(tubeGeo, tubeMat);
    mainGroup.add(flowTube);

    // 5. Interactive Parallax & Animation Loop
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 0.45;
      mouseY = y * 0.35;
    };

    container.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      if (!isReducedMotion) {
        // Subtle floating movement
        paperMesh.position.y = Math.sin(elapsedTime * 1.2) * 0.06;
        block1.position.y = 0.65 + Math.sin(elapsedTime * 1.5 + 0.5) * 0.04;
        block2.position.y = 0.05 + Math.cos(elapsedTime * 1.4) * 0.04;
        block3.position.y = -0.55 + Math.sin(elapsedTime * 1.6 + 1.2) * 0.04;

        // Smooth follow target rotation
        targetRotationY += (mouseX - targetRotationY) * 0.08;
        targetRotationX += (mouseY - targetRotationX) * 0.08;

        mainGroup.rotation.y = targetRotationY + Math.sin(elapsedTime * 0.6) * 0.05;
        mainGroup.rotation.x = targetRotationX + Math.cos(elapsedTime * 0.5) * 0.03;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Responsive resize observer
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth && newHeight) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      container.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);

      // Dispose 3D resources cleanly
      paperGeo.dispose();
      paperMat.dispose();
      block1Geo.dispose();
      block1Mat.dispose();
      block2Geo.dispose();
      block2Mat.dispose();
      block3Geo.dispose();
      block3Mat.dispose();
      tubeGeo.dispose();
      tubeMat.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isReducedMotion]);

  // CSS/SVG Fallback for environments without WebGL
  if (!hasWebGL) {
    return (
      <div className={`relative flex items-center justify-center p-6 bg-slate-900 rounded-2xl border border-slate-800 ${className}`}>
        <div className="flex items-center space-x-6">
          <div className="w-28 h-36 bg-slate-100 rounded-lg shadow-md p-3 flex flex-col justify-between border border-slate-300">
            <div className="w-12 h-2 bg-navy-900 rounded"></div>
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-300 rounded"></div>
              <div className="w-4/5 h-1.5 bg-slate-300 rounded"></div>
              <div className="w-3/5 h-1.5 bg-slate-300 rounded"></div>
            </div>
            <div className="text-[9px] font-mono font-bold text-slate-500">NOTICE</div>
          </div>

          <div className="text-brand-400 font-bold text-xl">&rarr;</div>

          <div className="space-y-2">
            <div className="w-36 bg-navy-900 text-white p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
              <span>Priority Event</span>
            </div>
            <div className="w-36 bg-blue-600 text-white p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-200" />
              <span>Session / Talk</span>
            </div>
            <div className="w-36 bg-emerald-600 text-white p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Action Deadline</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-[320px] sm:h-[380px] lg:h-[420px] flex items-center justify-center ${className}`}>
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Interactive Badge */}
      <div className="absolute bottom-3 left-4 right-4 sm:left-auto sm:right-4 flex items-center justify-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-[11px] text-slate-600 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Interactive 3D Transformation: Notice &rarr; Confirmed Schedule</span>
      </div>
    </div>
  );
};

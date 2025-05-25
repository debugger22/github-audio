import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import styled from 'styled-components';
import { GitHubEvent } from '../hooks/useWebSocket';

const Container3D = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background: #000;
`;

interface EventSphere {
  id: string;
  mesh: THREE.Mesh;
  createdAt: number;
  event: GitHubEvent;
  velocity: THREE.Vector3;
  startTime: number;
}

interface Visualization3DProps {
  // No props needed since we're using ref-based drawing
}

export interface Visualization3DRef {
  drawEvent: (event: GitHubEvent) => void;
}

const Visualization3D = forwardRef<Visualization3DRef, Visualization3DProps>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const spheresRef = useRef<EventSphere[]>([]);
  const animationIdRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);
  const cameraControlsRef = useRef({
    phi: 0,
    theta: 0,
    radius: 50,
    targetPhi: 0,
    targetTheta: 0,
    targetRadius: 50
  });

  // Function to get event-specific color and settings
  const getEventSettings = useCallback((event: GitHubEvent) => {
    let color = '#BDC3C7';
    let size = Math.max(Math.sqrt(event.actor.display_login.length) * 0.8, 0.5);
    
    switch (event.type) {
      case 'PushEvent':
        color = '#4E71FF';
        break;
      case 'PullRequestEvent':
        color = '#C6FF00';
        size *= 1.5;
        break;
      case 'IssuesEvent':
        color = '#DFEFCA';
        break;
      case 'IssueCommentEvent':
        color = '#CCDDD3';
        break;
      case 'CreateEvent':
        color = '#FF6B6B';
        break;
      case 'DeleteEvent':
        color = '#FF4757';
        break;
      case 'ForkEvent':
        color = '#5F27CD';
        break;
      case 'WatchEvent':
        color = '#00D2D3';
        break;
      case 'ReleaseEvent':
        color = '#FF9FF3';
        size *= 1.3;
        break;
      default:
        color = '#BDC3C7';
    }
    
    return { color, size };
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 50);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create the central sun - realistic fireball
    const sunGeometry = new THREE.SphereGeometry(4, 64, 64);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF4500, // Deep orange-red core
      emissive: 0xFF6600,
      emissiveIntensity: 1.2,
      roughness: 0.8,
      metalness: 0.1
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(0, 0, 0);
    scene.add(sun);

    // Inner fire layer
    const innerFireGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const innerFireMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFF00, // Bright yellow inner fire
      emissive: 0xFFAA00,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.8,
      roughness: 0.9
    });
    const innerFire = new THREE.Mesh(innerFireGeometry, innerFireMaterial);
    innerFire.position.set(0, 0, 0);
    scene.add(innerFire);

    // Outer fire corona
    const coronaGeometry = new THREE.SphereGeometry(5.5, 32, 32);
    const coronaMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF8C00, // Dark orange corona
      emissive: 0xFF4500,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.4,
      roughness: 1.0,
      side: THREE.DoubleSide
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    corona.position.set(0, 0, 0);
    scene.add(corona);

    // Plasma flares (outer wispy layer)
    const flareGeometry = new THREE.SphereGeometry(6.5, 16, 16);
    const flareMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF6600,
      emissive: 0xFF3300,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.2,
      roughness: 1.0,
      side: THREE.DoubleSide
    });
    const flares = new THREE.Mesh(flareGeometry, flareMaterial);
    flares.position.set(0, 0, 0);
    scene.add(flares);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1, 0);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 0);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Central sun light with fire colors
    const sunLight = new THREE.PointLight(0xFF6600, 3, 0);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Create realistic starfield like the solar system project
    const createStarfield = () => {
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 10000;
      
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      const originalColors = new Float32Array(starCount * 3); // Store original colors
      const sizes = new Float32Array(starCount);
      const originalSizes = new Float32Array(starCount); // Store original sizes for twinkling
      const twinkleFrequencies = new Float32Array(starCount); // Individual twinkling speeds
      const twinklePhases = new Float32Array(starCount); // Phase offsets for variety
      const twinkleIntensities = new Float32Array(starCount); // How much each star twinkles
      
      // Create star colors and positions
      for (let i = 0; i < starCount; i++) {
        // Random spherical distribution
        const radius = 400 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
        
        // Varied star colors (white, blue-white, yellow-white, red)
        const starType = Math.random();
        let r, g, b;
        if (starType < 0.7) {
          // White stars (most common)
          r = g = b = 1;
        } else if (starType < 0.85) {
          // Blue-white stars
          r = 0.8; g = 0.9; b = 1;
        } else if (starType < 0.95) {
          // Yellow-white stars
          r = 1; g = 1; b = 0.8;
        } else {
          // Red stars
          r = 1; g = 0.7; b = 0.6;
        }
        
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
        
        // Store original colors
        originalColors[i * 3] = r;
        originalColors[i * 3 + 1] = g;
        originalColors[i * 3 + 2] = b;
        
        // Varied star sizes with realistic distribution
        const brightness = Math.random();
        let starSize;
        if (brightness < 0.8) {
          starSize = 0.5 + Math.random() * 1; // Small stars
        } else if (brightness < 0.95) {
          starSize = 1.5 + Math.random() * 2; // Medium stars
        } else {
          starSize = 3 + Math.random() * 3; // Bright stars
        }
        
        sizes[i] = starSize;
        originalSizes[i] = starSize; // Store original size
        
        // Twinkling properties for more realistic effect
        twinkleFrequencies[i] = 0.5 + Math.random() * 2; // Varied twinkling speeds (0.5-2.5)
        twinklePhases[i] = Math.random() * Math.PI * 2; // Random phase offset
        
        // Larger stars twinkle more noticeably
        if (starSize > 3) {
          twinkleIntensities[i] = 0.4 + Math.random() * 0.4; // Bright stars twinkle more (0.4-0.8)
        } else if (starSize > 1.5) {
          twinkleIntensities[i] = 0.2 + Math.random() * 0.3; // Medium stars (0.2-0.5)
        } else {
          twinkleIntensities[i] = 0.1 + Math.random() * 0.2; // Small stars twinkle less (0.1-0.3)
        }
      }
      
      starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      // Create star material with proper blending
      const starMaterial = new THREE.PointsMaterial({
        size: 2,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const starField = new THREE.Points(starGeometry, starMaterial);
      starField.userData = { 
        originalSizes,
        originalColors,
        twinkleFrequencies,
        twinklePhases,
        twinkleIntensities
      }; // Store twinkling data
      return starField;
    };
    
    const stars = createStarfield();
    scene.add(stars);

    // Mouse controls
    const handleMouseDown = (event: MouseEvent) => {
      isMouseDownRef.current = true;
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDownRef.current) return;

      const deltaX = event.clientX - mouseRef.current.x;
      const deltaY = event.clientY - mouseRef.current.y;

      cameraControlsRef.current.targetTheta -= deltaX * 0.01;
      cameraControlsRef.current.targetPhi += deltaY * 0.01;
      cameraControlsRef.current.targetPhi = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraControlsRef.current.targetPhi));

      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraControlsRef.current.targetRadius += event.deltaY * 0.1;
      cameraControlsRef.current.targetRadius = Math.max(10, Math.min(200, cameraControlsRef.current.targetRadius));
    };

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const sphereMeshes = spheresRef.current.map(sphere => sphere.mesh);
      const intersects = raycaster.intersectObjects(sphereMeshes);

      if (intersects.length > 0) {
        const clickedSphere = spheresRef.current.find(sphere => sphere.mesh === intersects[0].object);
        if (clickedSphere && clickedSphere.event.event_url) {
          window.open(clickedSphere.event.event_url, '_blank');
        }
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel);
    renderer.domElement.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      const now = Date.now();

      // Update camera controls
      const controls = cameraControlsRef.current;
      controls.theta += (controls.targetTheta - controls.theta) * 0.1;
      controls.phi += (controls.targetPhi - controls.phi) * 0.1;
      controls.radius += (controls.targetRadius - controls.radius) * 0.1;

      camera.position.x = controls.radius * Math.sin(controls.theta) * Math.cos(controls.phi);
      camera.position.y = controls.radius * Math.sin(controls.phi);
      camera.position.z = controls.radius * Math.cos(controls.theta) * Math.cos(controls.phi);
      camera.lookAt(0, 0, 0);

      // Animate sun with realistic fire effects
      sun.rotation.y += 0.005;
      sun.rotation.x += 0.002;
      
      // Animate fire layers with different speeds for realistic effect
      innerFire.rotation.y -= 0.008;
      innerFire.rotation.z += 0.003;
      
      corona.rotation.y += 0.004;
      corona.rotation.x -= 0.002;
      
      flares.rotation.y -= 0.006;
      flares.rotation.z += 0.004;
      
      // Dynamic fire intensity pulsing
      const fireIntensity = 1 + Math.sin(now * 0.003) * 0.3;
      const coronaIntensity = 1 + Math.sin(now * 0.004 + 1) * 0.2;
      const flareIntensity = 1 + Math.sin(now * 0.002 + 2) * 0.4;
      
      innerFire.material.emissiveIntensity = 1.5 * fireIntensity;
      corona.material.emissiveIntensity = 0.8 * coronaIntensity;
      flares.material.emissiveIntensity = 0.5 * flareIntensity;

      // Update spheres with gravitational pull
      spheresRef.current = spheresRef.current.filter(sphere => {
        const elapsed = now - sphere.startTime;
        const maxLife = 20000;
        const progress = elapsed / maxLife;

        if (progress >= 1) {
          scene.remove(sphere.mesh);
          sphere.mesh.geometry.dispose();
          (sphere.mesh.material as THREE.Material).dispose();
          return false;
        }

        // Calculate gravitational pull towards the sun (center)
        const sunPosition = new THREE.Vector3(0, 0, 0);
        const spherePosition = sphere.mesh.position.clone();
        const directionToSun = sunPosition.sub(spherePosition).normalize();
        
        // Increase pull strength over time (ease-in effect)
        const pullStrength = progress * progress * 0.3; // Quadratic ease-in
        const pullForce = directionToSun.multiplyScalar(pullStrength);
        
        // Apply both original velocity and gravitational pull
        const dampedVelocity = sphere.velocity.clone().multiplyScalar(1 - progress * 0.8);
        sphere.mesh.position.add(dampedVelocity.add(pullForce));

        // Rotation
        sphere.mesh.rotation.x += 0.01;
        sphere.mesh.rotation.y += 0.01;

        // Scale down as it approaches the sun
        const scaleProgress = Math.max(0.1, 1 - progress * 0.7);
        sphere.mesh.scale.setScalar(scaleProgress);

        // Maintain opacity until very close to the sun
        const opacityProgress = Math.max(0, 1 - Math.pow(progress, 3));
        (sphere.mesh.material as THREE.MeshStandardMaterial).opacity = 0.8 * opacityProgress;

        return true;
      });

      // Animate stars with enhanced twinkling and rotation
      stars.rotation.y += 0.0002;
      stars.rotation.x += 0.0001;
      
      // Enhanced star twinkling effect
      const starSizes = stars.geometry.attributes.size.array;
      const starColors = stars.geometry.attributes.color.array;
      const { originalSizes, originalColors, twinkleFrequencies, twinklePhases, twinkleIntensities } = stars.userData;
      const time = now * 0.001;
      
      for (let i = 0; i < starSizes.length; i++) {
        const baseSize = originalSizes[i];
        const frequency = twinkleFrequencies[i];
        const phase = twinklePhases[i];
        const intensity = twinkleIntensities[i];
        
        // Multi-layered twinkling with different wave patterns
        const primaryTwinkle = Math.sin(time * frequency + phase);
        const secondaryTwinkle = Math.sin(time * frequency * 1.7 + phase * 0.3) * 0.5;
        const tertiaryTwinkle = Math.sin(time * frequency * 0.3 + phase * 1.8) * 0.3;
        
        // Combine waves for complex twinkling pattern
        const combinedTwinkle = (primaryTwinkle + secondaryTwinkle + tertiaryTwinkle) / 1.8;
        
        // Apply size variation
        const sizeMultiplier = 1 + combinedTwinkle * intensity;
        starSizes[i] = baseSize * Math.max(0.3, sizeMultiplier);
        
        // Add subtle color intensity variation for brighter stars
        if (baseSize > 2) {
          const colorIntensity = 1 + combinedTwinkle * intensity * 0.3;
          const colorIndex = i * 3;
          
          // Get original color values
          const originalR = originalColors[colorIndex];
          const originalG = originalColors[colorIndex + 1];
          const originalB = originalColors[colorIndex + 2];
          
          // Apply intensity variation while preserving color ratios
          starColors[colorIndex] = Math.min(1, originalR * colorIntensity);
          starColors[colorIndex + 1] = Math.min(1, originalG * colorIntensity);
          starColors[colorIndex + 2] = Math.min(1, originalB * colorIntensity);
        }
      }
      
      stars.geometry.attributes.size.needsUpdate = true;
      stars.geometry.attributes.color.needsUpdate = true;

      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Function to draw a single event as a 3D sphere
  const drawEvent = useCallback((event: GitHubEvent) => {
    if (!sceneRef.current) return;

    const { color, size } = getEventSettings(event);
    
    // Generate seeded random position
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    
    const seed = hashCode(event.event_url || event.id);
    const seededRandom1 = (seed % 10000) / 10000;
    const seededRandom2 = ((seed * 9301 + 49297) % 233280) / 233280;
    const seededRandom3 = ((seed * 1103515245 + 12345) % 2147483647) / 2147483647;
    
    // Create sphere geometry and material
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Position in 3D space
    mesh.position.set(
      (seededRandom1 - 0.5) * 80,
      (seededRandom2 - 0.5) * 60,
      (seededRandom3 - 0.5) * 40
    );

    // Random velocity for gentle movement
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.008,
      (Math.random() - 0.5) * 0.005
    );

    sceneRef.current.add(mesh);

    const newSphere: EventSphere = {
      id: event.event_url || `${event.id}-${Date.now()}`,
      mesh,
      createdAt: Date.now(),
      event,
      velocity,
      startTime: Date.now()
    };
    
    spheresRef.current.push(newSphere);
    
    // Clean up old spheres (keep last 100)
    if (spheresRef.current.length > 100) {
      const oldSpheres = spheresRef.current.splice(0, spheresRef.current.length - 100);
      oldSpheres.forEach(sphere => {
        if (sceneRef.current) {
          sceneRef.current.remove(sphere.mesh);
          sphere.mesh.geometry.dispose();
          (sphere.mesh.material as THREE.Material).dispose();
        }
      });
    }
  }, [getEventSettings]);

  // Expose drawEvent function to parent component
  useImperativeHandle(ref, () => ({
    drawEvent
  }), [drawEvent]);

  return <Container3D ref={containerRef} />;
});

Visualization3D.displayName = 'Visualization3D';

export default Visualization3D; 
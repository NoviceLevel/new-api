/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

// Adapted from React Bits "Grid Distortion" (MIT), TypeScript port.
// https://reactbits.dev/backgrounds/grid-distortion
// Deviations from upstream: pointer tracking moves to `window` so the canvas
// can stay pointer-events-none, and the fragment shader gets a cover-fit
// uniform so the WebGL layer frames the image exactly like the object-cover
// <img> it fades in over.

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { cn } from '@/lib/utils'

interface GridDistortionProps {
  imageSrc: string
  /** Optional alternate image below the `sm` breakpoint (639px). */
  mobileImageSrc?: string
  grid?: number
  mouse?: number
  strength?: number
  relaxation?: number
  /** Delay (ms) before fading the canvas in over the static <img>. */
  revealDelayMs?: number
  className?: string
}

const vertexShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const fragmentShader = `
uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
uniform vec4 resolution;
uniform vec2 uCoverScale;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * uCoverScale + 0.5;
  vec4 offset = texture2D(uDataTexture, vUv);
  gl_FragColor = texture2D(uTexture, uv - 0.02 * offset.rg);
}`

export function GridDistortion({
  imageSrc,
  mobileImageSrc,
  grid = 15,
  mouse = 0.1,
  strength = 0.15,
  relaxation = 0.9,
  revealDelayMs = 3200,
  className,
}: GridDistortionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000)
    camera.position.z = 2

    const uniforms = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector4() },
      uTexture: { value: null as THREE.Texture | null },
      uDataTexture: { value: null as THREE.DataTexture | null },
      uCoverScale: { value: new THREE.Vector2(1, 1) },
    }

    let imageAspect = 1

    const updateCoverScale = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const containerAspect = rect.width / rect.height
      if (containerAspect > imageAspect) {
        uniforms.uCoverScale.value.set(1, imageAspect / containerAspect)
      } else {
        uniforms.uCoverScale.value.set(containerAspect / imageAspect, 1)
      }
    }

    const textureLoader = new THREE.TextureLoader()
    const isMobile = window.matchMedia('(max-width: 639px)').matches
    const src = isMobile && mobileImageSrc ? mobileImageSrc : imageSrc
    textureLoader.load(src, (texture) => {
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.wrapS = THREE.ClampToEdgeWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      imageAspect =
        (texture.image as HTMLImageElement).width /
        (texture.image as HTMLImageElement).height
      uniforms.uTexture.value = texture
      updateCoverScale()
    })

    const size = grid
    const data = new Float32Array(4 * size * size)
    for (let i = 0; i < size * size; i++) {
      data[i * 4] = Math.random() * 255 - 125
      data[i * 4 + 1] = Math.random() * 255 - 125
    }

    const dataTexture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    dataTexture.needsUpdate = true
    uniforms.uDataTexture.value = dataTexture

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })

    const geometry = new THREE.PlaneGeometry(1, 1, size - 1, size - 1)
    const plane = new THREE.Mesh(geometry, material)
    scene.add(plane)

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      if (width === 0 || height === 0) return

      const containerAspect = width / height
      renderer.setSize(width, height)
      plane.scale.set(containerAspect, 1, 1)

      const frustumHeight = 1
      const frustumWidth = frustumHeight * containerAspect
      camera.left = -frustumWidth / 2
      camera.right = frustumWidth / 2
      camera.top = frustumHeight / 2
      camera.bottom = -frustumHeight / 2
      camera.updateProjectionMatrix()

      uniforms.resolution.value.set(width, height, 1, 1)
      updateCoverScale()
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)
    handleResize()

    const mouseState = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 }

    const handleMouseMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1 - (e.clientY - rect.top) / rect.height
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        // Same reset the upstream mouseleave handler performs.
        Object.assign(mouseState, { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 })
        return
      }
      mouseState.vX = x - mouseState.prevX
      mouseState.vY = y - mouseState.prevY
      Object.assign(mouseState, { x, y, prevX: x, prevY: y })
    }
    window.addEventListener('pointermove', handleMouseMove, { passive: true })

    let animationId = 0
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      uniforms.time.value += 0.05

      const gridData = dataTexture.image.data as Float32Array
      for (let i = 0; i < size * size; i++) {
        gridData[i * 4] *= relaxation
        gridData[i * 4 + 1] *= relaxation
      }

      const gridMouseX = size * mouseState.x
      const gridMouseY = size * mouseState.y
      const maxDist = size * mouse

      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const distSq = (gridMouseX - i) ** 2 + (gridMouseY - j) ** 2
          if (distSq < maxDist * maxDist) {
            const index = 4 * (i + size * j)
            const power = Math.min(maxDist / Math.sqrt(distSq), 10)
            gridData[index] += strength * 100 * mouseState.vX * power
            gridData[index + 1] -= strength * 100 * mouseState.vY * power
          }
        }
      }

      dataTexture.needsUpdate = true
      renderer.render(scene, camera)
    }
    animate()

    const revealTimer = window.setTimeout(() => setReady(true), revealDelayMs)

    return () => {
      cancelAnimationFrame(animationId)
      window.clearTimeout(revealTimer)
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', handleMouseMove)

      renderer.dispose()
      geometry.dispose()
      material.dispose()
      dataTexture.dispose()
      uniforms.uTexture.value?.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [grid, mouse, strength, relaxation, imageSrc, mobileImageSrc, revealDelayMs])

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 transition-opacity duration-1000',
        ready ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  )
}

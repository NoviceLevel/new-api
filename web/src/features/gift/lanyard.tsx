/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
// Adapted from React Bits "Lanyard" (MIT), TypeScript port.
// https://reactbits.dev/components/lanyard
// Deviations from upstream: the stage fills its parent instead of the viewport,
// the badge artwork is handed in as an already-painted canvas (no image decode,
// so re-painting after a check-in never suspends and resets the rope), and the
// drag gesture reports a pull threshold so the page can use it to check in.

// react-three-fiber maps three.js constructor and setter names onto JSX props,
// so the DOM property allowlist does not apply here; `useRef(null!)` is its
// documented pattern for refs the renderer fills in on mount.
// oxlint-disable react/no-unknown-property
// oxlint-disable typescript/no-non-null-assertion

import {
  useGLTF,
  useTexture,
  Environment,
  Lightformer,
} from '@react-three/drei'
import {
  Canvas,
  extend,
  useFrame,
  type ThreeElement,
  type ThreeEvent,
} from '@react-three/fiber'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
  type RigidBodyProps,
} from '@react-three/rapier'
import {
  MeshLineGeometry,
  MeshLineMaterial,
  type MeshLineMaterialParameters,
} from 'meshline'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import cardModel from './assets/card.glb'
import lanyardTexture from './assets/lanyard.png'

extend({ MeshLineGeometry, MeshLineMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>
  }
}

/**
 * The badge's front face is UV-mapped to the left half of the texture atlas
 * baked into `card.glb`; the back face takes the right half.
 */
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 }

/**
 * How far the badge has to be dragged down, in normalized device units, before
 * releasing it counts as a pull. Roughly 16% of the stage height.
 */
const PULL_THRESHOLD = 0.32

export type LanyardPullState = 'idle' | 'dragging' | 'armed'

interface LanyardProps {
  /** Badge artwork, painted by `drawCardFace`. */
  frontFace?: HTMLCanvasElement | null
  /** Keeps the badge draggable but stops it from arming a pull. */
  pullDisabled?: boolean
  onPullStateChange?: (state: LanyardPullState) => void
  /** Fires once per gesture, when an armed badge is released. */
  onPull?: () => void
}

export default function Lanyard(props: LanyardProps) {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 0, isMobile ? 20 : 15], fov: 20 }}
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{ alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
    >
      <ambientLight intensity={Math.PI} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -40, 0]} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band
            isMobile={isMobile}
            frontFace={props.frontFace}
            pullDisabled={props.pullDisabled}
            onPullStateChange={props.onPullStateChange}
            onPull={props.onPull}
          />
        </Physics>
      </Suspense>
      <Environment blur={0.75}>
        <Lightformer
          intensity={2}
          color='white'
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color='white'
          position={[-1, -1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color='white'
          position={[1, 1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={10}
          color='white'
          position={[-10, 0, 14]}
          rotation={[0, Math.PI / 2, Math.PI / 3]}
          scale={[100, 10, 1]}
        />
      </Environment>
    </Canvas>
  )
}

interface BandProps extends LanyardProps {
  isMobile: boolean
}

type LanyardRigidBody = RapierRigidBody & { lerped?: THREE.Vector3 }

type CardGltf = {
  nodes: Record<'card' | 'clip' | 'clamp', THREE.Mesh>
  materials: Record<'base' | 'metal', THREE.MeshStandardMaterial>
}

const MAX_SPEED = 50
const MIN_SPEED = 0

function Band(props: BandProps) {
  const band = useRef<
    THREE.Mesh<
      InstanceType<typeof MeshLineGeometry>,
      InstanceType<typeof MeshLineMaterial>
    >
  >(null!)
  const fixed = useRef<RapierRigidBody>(null!)
  const j1 = useRef<LanyardRigidBody>(null!)
  const j2 = useRef<LanyardRigidBody>(null!)
  const j3 = useRef<RapierRigidBody>(null!)
  const card = useRef<RapierRigidBody>(null!)

  const vec = useMemo(() => new THREE.Vector3(), [])
  const ang = useMemo(() => new THREE.Vector3(), [])
  const rot = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])

  const segmentProps: RigidBodyProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  }

  const { nodes, materials } = useGLTF(cardModel) as unknown as CardGltf
  const strapTexture = useTexture(lanyardTexture)
  strapTexture.wrapS = strapTexture.wrapT = THREE.RepeatWrapping

  // `MeshLineMaterial` needs its resolution at construction time, so it goes
  // through `args` rather than as a prop.
  const strapMaterialArgs = useMemo(
    (): [MeshLineMaterialParameters] => [
      { resolution: new THREE.Vector2(1000, props.isMobile ? 2000 : 1000) },
    ],
    [props.isMobile]
  )

  // Composite the painted face into the left half of the baked atlas so the
  // badge edges and its back face keep their original artwork.
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map
    if (!props.frontFace || !baseMap) return baseMap
    const baseImage = baseMap.image as
      | (CanvasImageSource & { width: number; height: number })
      | undefined
    if (!baseImage) return baseMap

    const width = baseImage.width
    const height = baseImage.height
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return baseMap
    context.drawImage(baseImage, 0, 0, width, height)

    const rectX = FRONT_UV_RECT.x * width
    const rectY = FRONT_UV_RECT.y * height
    const rectWidth = FRONT_UV_RECT.w * width
    const rectHeight = FRONT_UV_RECT.h * height
    const face = props.frontFace
    // Cover fit, so a face drawn at a different aspect ratio never stretches.
    const scale = Math.max(rectWidth / face.width, rectHeight / face.height)
    const drawWidth = face.width * scale
    const drawHeight = face.height * scale
    context.save()
    context.beginPath()
    context.rect(rectX, rectY, rectWidth, rectHeight)
    context.clip()
    context.drawImage(
      face,
      rectX + (rectWidth - drawWidth) / 2,
      rectY + (rectHeight - drawHeight) / 2,
      drawWidth,
      drawHeight
    )
    context.restore()

    const composite = new THREE.CanvasTexture(canvas)
    composite.colorSpace = THREE.SRGBColorSpace
    composite.flipY = baseMap.flipY
    composite.anisotropy = 16
    composite.needsUpdate = true
    return composite
  }, [props.frontFace, materials.base.map])

  useEffect(() => {
    return () => {
      if (cardMap !== materials.base.map) cardMap?.dispose()
    }
  }, [cardMap, materials.base.map])

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(),
          new THREE.Vector3(),
          new THREE.Vector3(),
          new THREE.Vector3(),
        ],
        false,
        'chordal'
      )
  )
  const [dragged, drag] = useState<false | THREE.Vector3>(false)
  const [hovered, hover] = useState(false)

  const pullOriginRef = useRef<number | null>(null)
  const armedRef = useRef(false)

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0],
  ])

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = dragged ? 'grabbing' : 'grab'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered, dragged])

  const getLerped = (body: LanyardRigidBody) => {
    if (!body.lerped) {
      body.lerped = new THREE.Vector3().copy(body.translation())
    }
    return body.lerped
  }

  useFrame((state, delta) => {
    if (dragged && typeof dragged !== 'boolean') {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      for (const ref of [card, j1, j2, j3, fixed]) ref.current?.wakeUp()
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      })

      if (pullOriginRef.current === null) {
        pullOriginRef.current = state.pointer.y
      }
      const armed =
        !props.pullDisabled &&
        pullOriginRef.current - state.pointer.y > PULL_THRESHOLD
      if (armed !== armedRef.current) {
        armedRef.current = armed
        props.onPullStateChange?.(armed ? 'armed' : 'dragging')
      }
    }

    if (!fixed.current) return
    for (const ref of [j1, j2]) {
      const lerped = getLerped(ref.current)
      const clampedDistance = Math.max(
        0.1,
        Math.min(1, lerped.distanceTo(ref.current.translation()))
      )
      lerped.lerp(
        ref.current.translation(),
        delta * (MIN_SPEED + clampedDistance * (MAX_SPEED - MIN_SPEED))
      )
    }
    curve.points[0].copy(j3.current.translation())
    curve.points[1].copy(getLerped(j2.current))
    curve.points[2].copy(getLerped(j1.current))
    curve.points[3].copy(fixed.current.translation())
    band.current.geometry.setPoints(curve.getPoints(props.isMobile ? 16 : 32))
    ang.copy(card.current.angvel())
    rot.copy(card.current.rotation())
    card.current.setAngvel(
      { x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z },
      true
    )
  })

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    ;(event.target as Element).releasePointerCapture(event.pointerId)
    drag(false)
    const pulled = armedRef.current
    pullOriginRef.current = null
    armedRef.current = false
    props.onPullStateChange?.('idle')
    if (pulled) props.onPull?.()
  }

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type='fixed' />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={endDrag}
            onPointerDown={(event: ThreeEvent<PointerEvent>) => {
              ;(event.target as Element).setPointerCapture(event.pointerId)
              pullOriginRef.current = null
              armedRef.current = false
              props.onPullStateChange?.('dragging')
              drag(
                new THREE.Vector3()
                  .copy(event.point)
                  .sub(vec.copy(card.current.translation()))
              )
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={props.isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
            />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          args={strapMaterialArgs}
          color='white'
          depthTest={false}
          useMap={1}
          map={strapTexture}
          repeat={[-4, 1]}
          lineWidth={1}
        />
      </mesh>
    </>
  )
}

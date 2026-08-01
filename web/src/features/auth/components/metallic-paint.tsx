/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 vP;
void main(){vP=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vP;
out vec4 oC;
uniform sampler2D u_tex;
uniform float u_time,u_ratio,u_imgRatio,u_seed,u_scale,u_refract,u_blur,u_liquid;
uniform float u_bright,u_contrast,u_angle,u_fresnel,u_sharp,u_wave,u_noise,u_chroma;
uniform float u_distort,u_contour;
uniform vec2 u_texel;
uniform vec3 u_lightColor,u_darkColor,u_tint;

vec3 sC,sM;

vec3 pW(vec3 v){
  vec3 i=floor(v),f=fract(v),s=sign(fract(v*.5)-.5),h=fract(sM*i+i.yzx),c=f*(f-1.);
  return s*c*((h*16.-4.)*c-1.);
}

vec3 aF(vec3 b,vec3 c){return pW(b+c.zxy-pW(b.zxy+c.yzx)+pW(b.yzx+c.xyz));}
vec3 lM(vec3 s,vec3 p){return(p+aF(s,p))*.5;}

vec2 fA(){
  vec2 c=vP-.5;
  c.x*=u_ratio>u_imgRatio?u_ratio/u_imgRatio:1.;
  c.y*=u_ratio>u_imgRatio?1.:u_imgRatio/u_ratio;
  return vec2(c.x+.5,.5-c.y);
}

vec2 rot(vec2 p,float r){float c=cos(r),s=sin(r);return vec2(p.x*c+p.y*s,p.y*c-p.x*s);}

float bM(vec2 c,float t){
  vec2 l=smoothstep(vec2(0.),vec2(t),c),u=smoothstep(vec2(0.),vec2(t),1.-c);
  return l.x*l.y*u.x*u.y;
}

float mG(float hi,float lo,float t,float sh,float cv){
  sh*=(2.-u_sharp);
  float ci=smoothstep(.15,.85,cv),r=lo;
  float e1=.08/u_scale;
  r=mix(r,hi,smoothstep(0.,sh*1.5,t));
  r=mix(r,lo,smoothstep(e1-sh,e1+sh,t));
  float e2=e1+.05/u_scale*(1.-ci*.35);
  r=mix(r,hi,smoothstep(e2-sh,e2+sh,t));
  float e3=e2+.025/u_scale*(1.-ci*.45);
  r=mix(r,lo,smoothstep(e3-sh,e3+sh,t));
  float e4=e1+.1/u_scale;
  r=mix(r,hi,smoothstep(e4-sh,e4+sh,t));
  float rm=1.-e4,gT=clamp((t-e4)/rm,0.,1.);
  r=mix(r,mix(hi,lo,smoothstep(0.,1.,gT)),smoothstep(e4-sh*.5,e4+sh*.5,t));
  return r;
}

void main(){
  sC=fract(vec3(.7548,.5698,.4154)*(u_seed+17.31))+.5;
  sM=fract(sC.zxy-sC.yzx*1.618);
  vec2 sc=vec2(vP.x*u_ratio,1.-vP.y);
  float angleRad=u_angle*3.14159/180.;
  sc=rot(sc-.5,angleRad)+.5;
  sc=clamp(sc,0.,1.);
  float sl=sc.x-sc.y,an=u_time*.001;
  vec2 iC=fA();
  vec4 texSample=texture(u_tex,iC);
  float dp=texSample.r;
  float shapeMask=texSample.a;
  vec2 outlineStep=u_texel*3.4;
  vec2 outlineDiagonal=outlineStep*.70710678;
  float expandedMask=shapeMask;
  expandedMask=max(expandedMask,texture(u_tex,iC+vec2(outlineStep.x,0.)).a);
  expandedMask=max(expandedMask,texture(u_tex,iC-vec2(outlineStep.x,0.)).a);
  expandedMask=max(expandedMask,texture(u_tex,iC+vec2(0.,outlineStep.y)).a);
  expandedMask=max(expandedMask,texture(u_tex,iC-vec2(0.,outlineStep.y)).a);
  expandedMask=max(expandedMask,texture(u_tex,iC+outlineDiagonal).a);
  expandedMask=max(expandedMask,texture(u_tex,iC-outlineDiagonal).a);
  expandedMask=max(expandedMask,texture(u_tex,iC+vec2(outlineDiagonal.x,-outlineDiagonal.y)).a);
  expandedMask=max(expandedMask,texture(u_tex,iC+vec2(-outlineDiagonal.x,outlineDiagonal.y)).a);
  float outlineMask=smoothstep(.06,.92,expandedMask)*(1.-smoothstep(.02,.9,shapeMask));
  outlineMask*=bM(iC,.01);
  vec3 hi=u_lightColor*u_bright;
  vec3 lo=u_darkColor*(2.-u_bright);
  lo.b+=smoothstep(.6,1.4,sc.x+sc.y)*.08;
  vec2 fC=sc-.5;
  float rd=length(fC+vec2(0.,sl*.15));
  vec2 ag=rot(fC,(.22-sl*.18)*3.14159);
  float cv=1.-pow(rd*1.65,1.15);
  cv*=pow(sc.y,.35);
  float vs=shapeMask;
  vs*=bM(iC,.01);
  float fr=pow(1.-cv,u_fresnel)*.3;
  vs=min(vs+fr*vs,1.);
  float mT=an*.0625;
  vec3 wO=vec3(-1.05,1.35,1.55);
  vec3 wA=aF(vec3(31.,73.,56.),mT+wO)*.22*u_wave;
  vec3 wB=aF(vec3(24.,64.,42.),mT-wO.yzx)*.22*u_wave;
  vec2 nC=sc*45.*u_noise;
  nC+=aF(sC.zxy,an*.17*sC.yzx-sc.yxy*.35).xy*18.*u_wave;
  vec3 tC=vec3(.00041,.00053,.00076)*mT+wB*nC.x+wA*nC.y;
  tC=lM(sC,tC);
  tC=lM(sC+1.618,tC);
  float tb=sin(tC.x*3.14159)*.5+.5;
  tb=tb*2.-1.;
  float noiseVal=pW(vec3(sc*8.+an,an*.5)).x;
  float edgeFactor=smoothstep(0.,.5,dp)*smoothstep(1.,.5,dp);
  float lD=dp+(1.-dp)*u_liquid*tb;
  lD+=noiseVal*u_distort*.15*edgeFactor;
  float rB=clamp(1.-cv,0.,1.);
  float fl=ag.x+sl;
  fl+=noiseVal*sl*u_distort*edgeFactor;
  fl*=mix(1.,1.-dp*.5,u_contour);
  fl-=dp*u_contour*.8;
  float eI=smoothstep(0.,1.,lD)*smoothstep(1.,0.,lD);
  fl-=tb*sl*1.8*eI;
  float cA=cv*clamp(pow(sc.y,.12),.25,1.);
  fl*=.12+(1.05-lD)*cA;
  fl*=smoothstep(1.,.65,lD);
  float vA1=smoothstep(.08,.18,sc.y)*smoothstep(.38,.18,sc.y);
  float vA2=smoothstep(.08,.18,1.-sc.y)*smoothstep(.38,.18,1.-sc.y);
  fl+=vA1*.16+vA2*.025;
  fl*=.45+pow(sc.y,2.)*.55;
  fl*=u_scale;
  fl-=an;
  float rO=rB+cv*tb*.025;
  float vM1=smoothstep(-.12,.18,sc.y)*smoothstep(.48,.08,sc.y);
  float cM1=smoothstep(.35,.55,cv)*smoothstep(.95,.35,cv);
  rO+=vM1*cM1*4.5;
  rO-=sl;
  float bO=rB*1.25;
  float vM2=smoothstep(-.02,.35,sc.y)*smoothstep(.75,.08,sc.y);
  float cM2=smoothstep(.35,.55,cv)*smoothstep(.75,.35,cv);
  bO+=vM2*cM2*.9;
  bO-=lD*.18;
  rO*=u_refract*u_chroma;
  bO*=u_refract*u_chroma;
  float sf=u_blur;
  float rP=fract(fl+rO);
  float rC=mG(hi.r,lo.r,rP,sf+.018+u_refract*cv*.025,cv);
  float gP=fract(fl);
  float gC=mG(hi.g,lo.g,gP,sf+.008/max(.01,1.-sl),cv);
  float bP=fract(fl-bO);
  float bC=mG(hi.b,lo.b,bP,sf+.008,cv);
  vec3 col=vec3(rC,gC,bC);
  col=(col-.5)*u_contrast+.5;
  col=clamp(col,0.,1.);
  col=mix(col,1.-min(vec3(1.),(1.-col)/max(u_tint,vec3(.001))),length(u_tint-1.)*.5);
  col=clamp(col,0.,1.);
  oC=vec4(col*vs,max(vs,outlineMask));
}`

type MetallicPaintProps = {
  imageSrc?: string
  icon?: ReactNode
  label?: string
  className?: string
}

type UniformMap = Record<string, WebGLUniformLocation | null>

function parseHexColor(value: string): [number, number, number] {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value)
  if (!match) return [1, 1, 1]
  return [
    Number.parseInt(match[1], 16) / 255,
    Number.parseInt(match[2], 16) / 255,
    Number.parseInt(match[3], 16) / 255,
  ]
}

function prepareLogoTexture(image: HTMLImageElement): ImageData {
  let width = image.naturalWidth || image.width
  let height = image.naturalHeight || image.height
  const longestSide = Math.max(width, height)
  if (longestSide > 512 || longestSide < 320) {
    const ratio = longestSide > 512 ? 512 / longestSide : 320 / longestSide
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Unable to prepare the Krulu logo texture')

  const inset = Math.max(4, Math.round(0.015 * Math.min(width, height)))
  context.drawImage(image, inset, inset, width - inset * 2, height - inset * 2)
  const source = context.getImageData(0, 0, width, height).data
  const pixelCount = width * height
  const alpha = new Float32Array(pixelCount)
  const mask = new Uint8Array(pixelCount)
  const edge = new Uint8Array(pixelCount)

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4
    const transparent =
      (source[offset] > 250 &&
        source[offset + 1] > 250 &&
        source[offset + 2] > 250 &&
        source[offset + 3] === 255) ||
      source[offset + 3] < 5
    alpha[index] = transparent ? 0 : source[offset + 3] / 255
    mask[index] = Number(alpha[index] > 0.1)
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      if (!mask[index]) continue
      if (
        x === 0 ||
        x === width - 1 ||
        y === 0 ||
        y === height - 1 ||
        !mask[index - 1] ||
        !mask[index + 1] ||
        !mask[index - width] ||
        !mask[index + width]
      ) {
        edge[index] = 1
      }
    }
  }

  const distance = new Float32Array(pixelCount)
  for (let pass = 0; pass < 96; pass += 1) {
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x
        if (!mask[index] || edge[index]) continue
        const neighborAverage =
          ((mask[index + 1] ? distance[index + 1] : 0) +
            (mask[index - 1] ? distance[index - 1] : 0) +
            (mask[index + width] ? distance[index + width] : 0) +
            (mask[index - width] ? distance[index - width] : 0)) /
          4
        distance[index] =
          1.85 * (0.01 + neighborAverage) - 0.85 * distance[index]
      }
    }
  }

  let maximumDistance = 0
  for (const value of distance) {
    maximumDistance = Math.max(maximumDistance, value)
  }
  maximumDistance ||= 1

  const texture = context.createImageData(width, height)
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4
    const normalizedDistance = distance[index] / maximumDistance
    const shade = Math.round(
      255 * (1 - normalizedDistance * normalizedDistance)
    )
    texture.data[offset] = shade
    texture.data[offset + 1] = shade
    texture.data[offset + 2] = shade
    texture.data[offset + 3] = Math.round(255 * alpha[index])
  }
  return texture
}

export function MetallicPaint({
  imageSrc,
  icon,
  label = 'Metallic icon',
  className = '',
}: MetallicPaintProps) {
  const iconRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext>(null)
  const programRef = useRef<WebGLProgram>(null)
  const bufferRef = useRef<WebGLBuffer>(null)
  const textureRef = useRef<WebGLTexture>(null)
  const uniformsRef = useRef<UniformMap>({})
  const frameRef = useRef<number>(null)
  const animationTimeRef = useRef(0)
  const lastFrameRef = useRef(0)
  const firstFrameRef = useRef(false)
  const [initialized, setInitialized] = useState(false)
  const [iconSrc, setIconSrc] = useState<string>()
  const [textureReady, setTextureReady] = useState(false)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!icon) {
      setIconSrc(undefined)
      return
    }

    const svg = iconRef.current?.querySelector('svg')
    if (!svg) return

    const source = svg.cloneNode(true) as SVGSVGElement
    source.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    source.setAttribute('width', '512')
    source.setAttribute('height', '512')
    source.setAttribute('color', '#111111')
    setIconSrc(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source.outerHTML)}`
    )
  }, [icon])

  const initializeGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
    })
    if (!gl) return false

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
      gl.deleteShader(shader)
      return null
    }

    const vertexShader = compileShader(VERTEX_SHADER, gl.VERTEX_SHADER)
    const fragmentShader = compileShader(FRAGMENT_SHADER, gl.FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return false

    const program = gl.createProgram()
    if (!program) return false
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      return false
    }

    const uniforms: UniformMap = {}
    const uniformCount = gl.getProgramParameter(
      program,
      gl.ACTIVE_UNIFORMS
    ) as number
    for (let index = 0; index < uniformCount; index += 1) {
      const uniform = gl.getActiveUniform(program, index)
      if (uniform) {
        uniforms[uniform.name] = gl.getUniformLocation(program, uniform.name)
      }
    }

    const buffer = gl.createBuffer()
    if (!buffer) {
      gl.deleteProgram(program)
      return false
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )
    gl.useProgram(program)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    glRef.current = gl
    programRef.current = program
    bufferRef.current = buffer
    uniformsRef.current = uniforms
    return true
  }, [])

  useEffect(() => {
    if (!initializeGL()) return
    const canvas = canvasRef.current
    const gl = glRef.current
    if (!canvas || !gl) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(rect.width * pixelRatio))
      const height = Math.max(1, Math.round(rect.height * pixelRatio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
      gl.uniform1f(uniformsRef.current.u_ratio, width / height)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    setInitialized(true)
    return () => {
      observer.disconnect()
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (textureRef.current) gl.deleteTexture(textureRef.current)
      if (bufferRef.current) gl.deleteBuffer(bufferRef.current)
      if (programRef.current) gl.deleteProgram(programRef.current)
    }
  }, [initializeGL])

  useEffect(() => {
    const textureSource = iconSrc || imageSrc
    if (!initialized || !textureSource) return
    let cancelled = false
    setTextureReady(false)
    setRendered(false)
    firstFrameRef.current = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.addEventListener('load', () => {
      if (cancelled) return
      try {
        const gl = glRef.current
        if (!gl) return
        const textureData = prepareLogoTexture(image)
        if (textureRef.current) gl.deleteTexture(textureRef.current)
        const texture = gl.createTexture()
        if (!texture) return
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          textureData.width,
          textureData.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          textureData.data
        )
        const uniforms = uniformsRef.current
        gl.uniform1i(uniforms.u_tex, 0)
        gl.uniform1f(
          uniforms.u_imgRatio,
          textureData.width / textureData.height
        )
        gl.uniform2f(
          uniforms.u_texel,
          1 / textureData.width,
          1 / textureData.height
        )
        textureRef.current = texture
        setTextureReady(true)
      } catch {
        setTextureReady(false)
      }
    })
    image.src = textureSource
    return () => {
      cancelled = true
    }
  }, [iconSrc, imageSrc, initialized])

  useEffect(() => {
    const gl = glRef.current
    if (!gl || !initialized) return
    const uniforms = uniformsRef.current
    gl.uniform1f(uniforms.u_seed, 42)
    gl.uniform1f(uniforms.u_scale, 4.6)
    gl.uniform1f(uniforms.u_refract, 0.018)
    gl.uniform1f(uniforms.u_blur, 0.014)
    gl.uniform1f(uniforms.u_liquid, 0.78)
    gl.uniform1f(uniforms.u_bright, 1.8)
    gl.uniform1f(uniforms.u_contrast, 0.72)
    gl.uniform1f(uniforms.u_angle, -8)
    gl.uniform1f(uniforms.u_fresnel, 1.1)
    gl.uniform1f(uniforms.u_sharp, 1.15)
    gl.uniform1f(uniforms.u_wave, 0.9)
    gl.uniform1f(uniforms.u_noise, 0.46)
    gl.uniform1f(uniforms.u_chroma, 1.15)
    gl.uniform1f(uniforms.u_distort, 0.75)
    gl.uniform1f(uniforms.u_contour, 0.24)
    gl.uniform3f(uniforms.u_lightColor, ...parseHexColor('#ffffff'))
    gl.uniform3f(uniforms.u_darkColor, ...parseHexColor('#080808'))
    gl.uniform3f(uniforms.u_tint, ...parseHexColor('#d8d8d8'))
  }, [initialized])

  useEffect(() => {
    const gl = glRef.current
    if (!gl || !initialized || !textureReady) return
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const draw = (timestamp: number) => {
      const elapsed = Math.min(timestamp - lastFrameRef.current, 64)
      lastFrameRef.current = timestamp
      if (!reducedMotion) animationTimeRef.current += elapsed * 0.24
      gl.uniform1f(uniformsRef.current.u_time, animationTimeRef.current)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (!firstFrameRef.current) {
        firstFrameRef.current = true
        setRendered(true)
      }
      if (!reducedMotion) frameRef.current = requestAnimationFrame(draw)
    }
    lastFrameRef.current = performance.now()
    frameRef.current = requestAnimationFrame(draw)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [initialized, textureReady])

  return (
    <div
      className={`metallic-paint ${className}`.trim()}
      data-ready={rendered}
      role='img'
      aria-label={label}
    >
      {icon ? (
        <div
          ref={iconRef}
          className='metallic-paint__fallback metallic-paint__fallback-icon'
          aria-hidden='true'
        >
          {icon}
        </div>
      ) : (
        <img
          src={imageSrc}
          alt=''
          className='metallic-paint__fallback'
          aria-hidden='true'
        />
      )}
      <canvas
        ref={canvasRef}
        className='metallic-paint__canvas'
        aria-hidden='true'
      />
    </div>
  )
}

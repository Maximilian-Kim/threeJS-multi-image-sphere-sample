import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls' // three/examples/jsm/controls/OrbitControls

// 좌표계 가이드 라인 제거 [axesHelper]
// 파일 변경시 브라우저 새로고침 필요

/**
 * scene - 카메라 및 월드 위치 지정
 *  world - 행성계
 *   container - 행성 컨테이너 | 행성계 좌표계와 월드 좌표계 분리
 *    sphere - 행성
 */

//**** 주의 ****//
// 아래 값들은 서로 연관되어 있으므로 수정시 주의
//
// -- 행성 숫자
// PLANET_COUNT
// initPolygonPoints() 의 보정값
// CAMERA_DEFAULT_POSITION
//
// -- 행성계 위치 / 크기 관련 값
// PLANET_RADIUS | PLANET_BETWEEN
// CAMERA_DEFAULT_POSITION
// sphere_zero_pos_x | sphere_zero_pos_z | SPHERE_ZERO_POS_BASE

/* ------------------- */

let beforeX // mouse down x position
let beforeY // mouse down x position

let alignAuto = true // sphere align snapping animation

const spheres = [] // sphere 3d object

const sphere_container = [] // sphere container | divide sphere coordinate system from world coordinate system

const sphere_texture_array = [
  './image/ball/1.jpeg',
  './image/ball/2.jpeg',
  './image/ball/3.jpeg',
  './image/ball/4.jpeg',
  './image/ball/5.jpeg',
  './image/ball/6.jpeg',
  './image/ball/7.jpeg',
  './image/ball/8.jpeg',
  './image/ball/9.jpeg',
  './image/ball/10.jpeg',
  './image/ball/11.jpeg',
]

const scene = new THREE.Scene()
const world = new THREE.Object3D()

let camera, controls
let renderer
let near_plant = 0

const overlay_sphere = []
const overlay_container = new THREE.Object3D()

let haloEffect

const fadeAniMaterials = []

const textureLoader = new THREE.TextureLoader()

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

const PLANET_COUNT = 11
const PLANET_RADIUS = 512
const PLANET_BETWEEN = 5000

const overlay_padding = PLANET_RADIUS * 0.1
const overlay_image_count = 24

const ORIGIN_POINT = new THREE.Vector3() // 원점 좌표 (0, 0, 0)
const CAMERA_DEFAULT_POSITION = new THREE.Vector3(5000, 0, 7000)

const Y_AXIS_ERROR = 3 // snap animation y axis permit error

const MATERIAL_FADE_ANI_OFFSET = 0.05 // material fade animation offset | requestAnimationFrame per value | 0 ~ 1

// 원점과 카메라 사이에 행성의 원점으로 부터의 대략적인 거리
// 원점------행성---카메라
const sphere_zero_pos_x = 3000
const sphere_zero_pos_z = 4800
const SPHERE_ZERO_POS_BASE = Math.sqrt(sphere_zero_pos_x * sphere_zero_pos_x + sphere_zero_pos_z * sphere_zero_pos_z)
/* ------------------- */

//* -------- init -------- *//
function init() {
  camera = initCamera()
  renderer = initRenderer()
  controls = initControls(renderer)

  initLight()

  // const axesHelper = new THREE.AxesHelper(1000)
  // scene.add(axesHelper)

  world.position.set(2000, 1000, 0) // 행성계를 중심에서 우상단으로 이동
  world.rotateZ(-45 * (Math.PI / 180)) // 행성계 기울이기
  scene.add(world)

  const planet_position = initPolygonPoints(PLANET_COUNT, PLANET_BETWEEN) // 행성들의 위치 좌표 계산
  initSphere(planet_position) // 행성 생성

  // 짝,홀 서로 반대 방향으로 회전
  initOverlaySphere(0) // 행성 위에 덮어씌울 원형 텍스쳐 생성 | 짝수 줄
  initOverlaySphere(1) // 행성 위에 덮어씌울 원형 텍스쳐 생성 | 홀수 줄

  initHalo() // 행성계 빛나는 효과

  // 브라우저 이벤트
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('mousedown', onMouseDown, false)
  window.addEventListener('mousemove', onMouseOverRaycaster, false)
}

function initCamera() {
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 150000)
  camera.position.copy(CAMERA_DEFAULT_POSITION)
  return camera
}

function initRenderer() {
  const render = new THREE.WebGLRenderer({ antialias: true })
  const view = document.getElementById('main')
  render.setSize(view.clientWidth, view.clientHeight)
  view.appendChild(render.domElement)
  return render
}

function initControls(renderer) {
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.minDistance = 8000
  controls.maxDistance = 17500
  controls.noPan = true
  controls.screenSpacePanning = false
  controls.zoomSpeed = 0.5

  // 상하 회전 제한
  const polar = Math.PI / 2
  controls.minPolarAngle = polar
  controls.maxPolarAngle = polar

  // 좌우 회전 제한
  controls.enableRotate = false

  controls.addEventListener('change', render)

  return controls
}

function initLight() {
  const light = new THREE.DirectionalLight(0xffffff)
  light.position.set(1, 1, 1)
  scene.add(light)

  const ambientLight = new THREE.AmbientLight(0x222222)
  scene.add(ambientLight)
}

function initPolygonPoints(n = 5, radius = 10) {
  const points = []
  for (let i = 0; i < n; i++) {
    // x 축을 기준으로 시계방향으로 360도를 n등분 한 각도
    // n=11, Math.PI / 2.45 : 카메라 방향으로 좌표 시작점 보정
    // 해당 보정이 없을시 3번 행성이 카메라 근처에 있음
    // 360 / 11 = 32.72727272727273 => 32.7 * 3 = 98.1
    // n 이 변경되면 Math.PI / 2.45 값도 변경해야함
    const theta = (i / n) * Math.PI * 2 + Math.PI / 2.45
    points.push(new THREE.Vector2(Math.cos(theta) * radius, Math.sin(theta) * radius))
  }

  return points
}

function initSphere(planet_position) {
  const awaiter = planet_position.map(async (pos, i) => {
    const texture = await textureLoader.loadAsync(sphere_texture_array[i])

    const container = new THREE.Object3D()
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET_RADIUS, 64, 32),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1 }),
    )

    // const axesHelper = new THREE.AxesHelper(1000)
    // sphere.add(axesHelper)

    sphere.position.set(0, 0, 0)
    spheres.push(sphere)

    container.add(sphere)

    sphere_container.push(container)

    container.position.set(pos.x, 0, pos.y)
    container.updateMatrix()
    container.matrixAutoUpdate = false

    world.add(container)
  })

  // 행성들이 모두 생성되면 첫번째 행성이 카메라에 보이도록 위치 조정
  Promise.all(awaiter).then(() => {
    alignSnap(0)
  })
}

function initOverlaySphere(layer) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  // 행성 위에 덮어씌울 직사각형 텍스쳐 생성
  // 가로는 세로의 두배
  // 가로 이미지 개수 = 24 / 3 = 8
  // 세로 이미지 층수 = 24 / 4 = 6 (짝수, 홀수 두개씩) => 1,6층은 비우도록 함
  const width = (overlay_image_count / 3) * PLANET_RADIUS // 24 / 3 = 8
  const height = (overlay_image_count / 4) * PLANET_RADIUS // 24 / 4 = 6

  canvas.width = width
  canvas.height = height

  // 투명 배경
  context.fillStyle = '#ffffff00'
  context.fillRect(0, 0, width, height)

  const texture = new THREE.Texture(canvas)

  for (let i = 0; i < overlay_image_count / 3; i++) {
    for (let j = layer; j < overlay_image_count / 6; j += layer === undefined ? 1 : 2) {
      const img = new Image()
      img.src = `https://picsum.photos/seed/${Math.random()}/${PLANET_RADIUS}`
      img.crossOrigin = 'anonymous'
      img.onload = function () {
        const x = i * PLANET_RADIUS + overlay_padding
        const y = (j + 1) * PLANET_RADIUS + overlay_padding // 1층을 비우기 위해 +1

        context.drawImage(img, x, y, PLANET_RADIUS - overlay_padding, PLANET_RADIUS - overlay_padding)
        context.save()

        texture.needsUpdate = true
      }
    }
  }

  const geometry = new THREE.SphereGeometry(PLANET_RADIUS * 0.99, 64, 32) // 0.99 : 텍스처가 중첩되어 꺠지는 현상 방지 위해 작게 생성
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    alphaTest: 1,
  })
  const sphere = new THREE.Mesh(geometry, material)

  sphere.position.set(0, 0, 0)
  overlay_sphere.push(sphere)
  overlay_container.add(sphere)
}

function initHalo() {
  const texture = new THREE.TextureLoader().load('/image/halo.png')

  texture.rotation = -Math.PI
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)

  haloEffect = new THREE.Mesh(
    new THREE.TorusGeometry(PLANET_RADIUS * 1.1, PLANET_RADIUS * 0.075, 4, 100),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
  )

  haloEffect.position.set(sphere_zero_pos_x, 0, sphere_zero_pos_z)
  haloEffect.lookAt(camera.position)
}
//* -------- init -------- *//

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)

  render()
}

function alignSnap(setIndex) {
  if (spheres.length === 0) return

  let dist
  near_plant = 0

  if (setIndex !== undefined) {
    near_plant = setIndex
  } else {
    for (let i = 0; i < PLANET_COUNT; i++) {
      if (!dist) {
        dist = camera.position.distanceTo(spheres[i].getWorldPosition(ORIGIN_POINT))
        near_plant = i
      } else {
        const d = camera.position.distanceTo(spheres[i].getWorldPosition(ORIGIN_POINT))
        if (d < dist) {
          dist = d
          near_plant = i
        }
      }
    }
  }

  alignAuto = true
  alignSnapAni(spheres[near_plant])
}

//* -------- ani -------- *//
function alignSnapAni(obj) {
  const y = obj.getWorldPosition(ORIGIN_POINT).y
  const theta = Math.abs(y / SPHERE_ZERO_POS_BASE)
  const rotateAngle = Math.max(theta * 0.05, 0.0005)

  if (Math.abs(y) < Y_AXIS_ERROR || !alignAuto) {
    alignAuto = false
    return
  } else {
    requestAnimationFrame(() => alignSnapAni(obj))

    if (y > Y_AXIS_ERROR) {
      world.rotateY(rotateAngle)
    } else if (y < -Y_AXIS_ERROR) {
      world.rotateY(-rotateAngle)
    }
  }
}

function materialFadeOutAni(material) {
  if (!fadeAniMaterials.includes(material) || material.opacity <= 0) return
  requestAnimationFrame(() => materialFadeOutAni(material))
  material.opacity -= MATERIAL_FADE_ANI_OFFSET
  if (material.opacity <= 0) material.opacity = 0
}

function materialFadeInAni(material) {
  if (material.opacity >= 1) return
  requestAnimationFrame(() => materialFadeInAni(material))
  material.opacity += MATERIAL_FADE_ANI_OFFSET
  if (material.opacity >= 1) material.opacity = 1
}

// main Animation Loop
function animate() {
  requestAnimationFrame(animate)

  // 행성 자전
  sphere_container.forEach((p) => {
    const pos = p.position
    const c = camera.position
    p.lookAt(c.x, pos.y, c.z)
    p.updateMatrix()
    p.children.forEach((c) => {
      c.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.01)
    })
  })

  // overlay sphere 자전
  overlay_sphere[0].rotateY(0.01)
  overlay_sphere[1].rotateY(-0.01)

  //---- mouse over event ----//
  raycaster.setFromCamera(mouse, camera)

  // 행성 투명도 - Webgl Sphere
  const intersectSphere = raycaster.intersectObjects(spheres, false)
  if (intersectSphere.length > 0) {
    const sphere = intersectSphere[0].object

    const material = sphere.material
    if (!fadeAniMaterials.includes(material)) {
      fadeAniMaterials.push(material)
      materialFadeOutAni(material)

      // 행성 투명도 - Overlay Sphere
      const worldPos = sphere.getWorldPosition(ORIGIN_POINT)

      overlay_sphere.forEach((s) => {
        s.position.x = worldPos.x
        s.position.y = worldPos.y
        s.position.z = worldPos.z
        s.updateWorldMatrix(true, true)
        scene.add(s)
      })

      scene.add(haloEffect)
    }
  } else {
    while (fadeAniMaterials.length > 0) {
      const material = fadeAniMaterials.pop()
      materialFadeInAni(material)
    }
  }

  const intersectOverlay = raycaster.intersectObjects(overlay_sphere, false)
  if (intersectOverlay.length == 0) {
    overlay_sphere.forEach((s) => {
      scene.remove(s)
    })
    scene.remove(haloEffect)
  }

  //---- mouse over event ----//

  controls.update()
  render()
}
//* -------- ani -------- *//

function render() {
  renderer.render(scene, camera)
}

//* -------- 마우스 이벤트 -------- *//
function onMouseDown(event) {
  event.preventDefault()

  // dettach mouse over event
  document.removeEventListener('mousemove', onMouseOverRaycaster, false)

  // attach mouse move event
  document.addEventListener('mousemove', onMouseMoveRotateStart, false)
  document.addEventListener('mouseup', onMouseMoveRotateEnd, false)
  document.addEventListener('mouseout', onMouseMoveRotateEnd, false)
  document.addEventListener('mouseleave', onMouseMoveRotateEnd, false)

  alignAuto = false
}

// mouse position save for raycaster
function onMouseOverRaycaster(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
}

// mouse move rotate
function onMouseMoveRotateStart(event) {
  if (!beforeX) beforeX = event.clientX
  if (!beforeY) beforeY = event.clientY

  const diff = event.clientX - beforeX + event.clientY - beforeY

  beforeX = event.clientX
  beforeY = event.clientY

  world.rotateY(diff * 0.05 * (Math.PI / 180))
  world.updateMatrix()
}

function onMouseMoveRotateEnd(event) {
  // mouseup, mouseout, mouseleave

  // dettach mouse move event
  document.removeEventListener('mousemove', onMouseMoveRotateStart, false)
  document.removeEventListener('mouseup', onMouseMoveRotateEnd, false)
  document.removeEventListener('mouseout', onMouseMoveRotateEnd, false)
  document.removeEventListener('mouseleave', onMouseMoveRotateEnd, false)

  // attach mouse over event
  document.addEventListener('mousemove', onMouseOverRaycaster, false)

  beforeX = undefined
  beforeY = undefined

  alignSnap()
}
//* -------- 마우스 이벤트 -------- *//

export { init, animate, controls }

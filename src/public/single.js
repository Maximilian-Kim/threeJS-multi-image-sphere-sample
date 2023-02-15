import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'

const scene = new THREE.Scene()

let camera, control, renderer
const spheres = []

const radius = 1024

function init() {
  camera = initCamera()
  renderer = initRenderer_webgl()
  control = initControls()

  const container = new THREE.Object3D()
  const sphere1 = initSphere(0)
  const sphere2 = initSphere(1)
  container.add(sphere1)
  container.add(sphere2)
  scene.add(container)

  initHalo()
}

function initCamera() {
  let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100000)
  camera.position.set(0, 0, 7000)
  return camera
}

function initRenderer_webgl() {
  let renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor(0x000000)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  document.getElementById('main').appendChild(renderer.domElement)
  return renderer
}

function initControls() {
  let controls = new OrbitControls(camera, renderer.domElement)
  controls.minDistance = 500
  controls.maxDistance = 20000
  controls.noPan = true
  controls.dynamicDampingFactor = 0.1
  controls.addEventListener('change', render)
  controls.autoRotate = true
  controls.autoRotateSpeed = 2.5
  return controls
}

function initSphere(layer) {
  const canvasImg = document.createElement('canvas')
  const contextImg = canvasImg.getContext('2d')

  const d = radius
  const indent = d * 0.05 // 이미지 간격 | 두번 적용 (가로, 세로) => 0.05 * 2 = 0.1 (10%)

  // const imageCount = 24
  const widthCount = 8
  const heightCount = 6

  const width = widthCount * d // 가로 이미지 수
  const height = heightCount * d // 세로 이미지 수

  canvasImg.width = width
  canvasImg.height = height

  // 배경 투명 채우기
  contextImg.fillStyle = '#ffffff00'
  contextImg.fillRect(0, 0, width, height)

  const textureImg = new THREE.Texture(canvasImg)

  for (let i = 0; i < 8; i++) {
    // heightCount - 2 : 첫줄, 마지막줄은 빈칸
    // j += 2 : 2줄씩 건너뛰기
    for (let j = layer; j < heightCount - 2; j += 2) {
      const img = new Image()
      img.src = `https://picsum.photos/seed/${Math.random()}/${d}`
      img.crossOrigin = 'anonymous'

      // 이미지 로드 될 때마다 텍스쳐 업데이트
      img.onload = function () {
        const x = i * d + indent
        const y = (j + 1) * d + indent // 첫번째 줄은 빈칸

        contextImg.drawImage(img, x, y, d - indent, d - indent)
        contextImg.save()

        textureImg.needsUpdate = true
      }
    }
  }

  const geometry = new THREE.SphereGeometry(radius, 64, 32)
  const material = new THREE.MeshBasicMaterial({
    map: textureImg,
    transparent: true,
    side: THREE.DoubleSide,
    alphaTest: 1,
  })

  const sphere = new THREE.Mesh(geometry, material)
  sphere.position.set(0, 0, 0)
  spheres.push(sphere)

  return sphere
}

function initHalo() {
  const texture = new THREE.TextureLoader().load('/image/halo.png')

  texture.rotation = -Math.PI
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.1, radius * 0.075, 4, 100),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    }),
  )

  scene.add(halo)
}

function render() {
  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)

  spheres.forEach((sphere, index) => {
    sphere.rotation.y += 0.005 * (index % 2 ? 1 : -1)
  })

  render()
}

export { init, animate, control }

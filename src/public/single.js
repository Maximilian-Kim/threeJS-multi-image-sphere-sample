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
  const padding = d * 0.1
  const imageCount = 24

  const width = (imageCount / 3) * d
  const height = (imageCount / 4) * d

  canvasImg.width = width
  canvasImg.height = height

  contextImg.fillStyle = '#ffffff00'
  contextImg.fillRect(0, 0, width, height)

  const textureImg = new THREE.Texture(canvasImg)

  for (let i = 0; i < imageCount / 3; i++) {
    for (let j = layer; j < imageCount / 6; j += 2) {
      const img = new Image()
      img.src = `https://picsum.photos/seed/${Math.random()}/${d}`
      img.crossOrigin = 'anonymous'
      img.onload = function () {
        const x = i * d + padding
        const y = (j + 1) * d + padding

        contextImg.drawImage(img, x, y, d - padding, d - padding)
        contextImg.save()

        textureImg.needsUpdate = true
      }
    }
  }

  const geometry = new THREE.SphereGeometry(1024, 64, 32)
  const material = new THREE.MeshBasicMaterial({
    map: textureImg,
    transparent: true,
    side: THREE.DoubleSide,
    alphaTest: 1,
  })
  const sphere = new THREE.Mesh(geometry, material)
  sphere.position.set(0, 0, 0)
  spheres.push(sphere)
  // scene.add(sphere)
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

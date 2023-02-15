# threeJS-multi-image-sphere-sample

여러 이미지를 html.canvas에 그리고(draw)  
texture로 사용하는 예제

그래픽/인터렉션 최적화 필요

```javascript
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
```

import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import json from 'koa-json'
import koaLogger from 'koa-logger'
import koaMount from 'koa-mount'
import koaStatic from 'koa-static'
import cors from '@koa/cors'
import { Server } from 'http'
import os from 'os'

//===============================================//
// Koa App
//===============================================//

const validOrigins = ['*']

function verifyOrigin(ctx) {
  const origin = ctx.headers.origin
  if (!originIsValid(origin)) return false
  return origin
}

function originIsValid(origin) {
  return validOrigins.indexOf(origin) !== -1
}

const app: Koa = new Koa()
app.use(cors({ origin: verifyOrigin, credentials: true }))
app.use(bodyParser())
app.use(json())

// 로컬에서만 로그 출력
if (os.hostname().indexOf('local') > -1) {
  app.use(koaLogger())
}

// 에러 핸들링
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500
    const errStr: string = err.message.toString()
    const msg: string =
      errStr.indexOf('InternalServerError:') > -1 ? errStr.replace('InternalServerError: ', '') : errStr

    ctx.body = {
      result: 0,
      msg: msg,
    }
  }
})

//===============================================//
// Router
//===============================================//

const router: Router = new Router()
router.get('/favicon.ico', async (ctx) => (ctx.body = ''))

const front = new Koa()

front.use(koaStatic(__dirname + '/public'))
app.use(koaMount('/', front))

app.use(router.routes()).use(router.allowedMethods())

//===============================================//
// Server Start
//===============================================//

const port = 3000
const server: Server = app.listen(port, () => {
  console.log(
    `\n> API Service server is listening to port ${port}
    
    [http://localhost:${port}/single.html]
      - single sphere

    [http://localhost:${port}/multi.html]
      - multi sphere`,
  )
})

server.setTimeout(0)

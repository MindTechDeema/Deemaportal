import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import React from 'react'
import { renderToString } from 'react-dom/server'
import * as router from 'react-router-dom'

// Render the real route tree with page stubs, without Auth, network or a DOM.
test('approval email route is public and cannot redirect to the login guard',()=>{
 const source=readFileSync(new URL('../src/routes/AppRoutes.tsx',import.meta.url),'utf8')
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText
 const exports={}
 const require=name=>{
 if(name==='react')return React
 if(name==='react-router-dom')return {...router,BrowserRouter:({children})=>React.createElement(router.MemoryRouter,{initialEntries:['/signup/approve#token='+ 'a'.repeat(64)]},children)}
 if(name.endsWith('/ProtectedRoute'))return {__esModule:true,default:()=>{throw new Error('Approval must not require login')}}
 return {__esModule:true,default:()=>React.createElement('div',null,name.endsWith('/CompanyApprovalPage')?'PUBLIC_APPROVAL_PAGE':'OTHER_PAGE')}
 }
 new Function('exports','require','React',js)(exports,require,React)
 const html=renderToString(React.createElement(exports.default))
 assert.ok(html.includes('PUBLIC_APPROVAL_PAGE'));assert.ok(!html.includes('OTHER_PAGE'))
 const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'))
 assert.ok(vercel.rewrites.some(rule=>rule.source==='/(.*)'&&rule.destination==='/index.html'))
})
